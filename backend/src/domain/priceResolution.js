/**
 * Customer-specific price resolution (Price Lists).
 *
 * This is the SERVER-SIDE PRICE AUTHORITY for the price-lists feature. Every
 * place that needs a buyer's effective price (catalog browse, order create,
 * invoice create, public storefront) resolves it here so entitled discounts
 * can't be forged by the client.
 *
 * Resolution precedence for a product's unit price:
 *   per-product fixed override  >  list-wide discountPercent  >  base price
 *
 * Backward compatible by design: when no list resolves, the price is the plain
 * base price (`product.price` / `product.pricePerCarton`) — identical to the
 * behaviour before this feature existed.
 *
 * Exposed as a factory (mirrors src/domain/pricePrivacy.js):
 *   const { resolvePriceListForBuyer, applyPriceList, resolveUnitPrice, attachYourPrice }
 *     = require('./src/domain/priceResolution')(repos, prisma);
 *
 * @param {object} repos   - repository registry (uses repos.businessRepo, repos.priceListRepo)
 * @param {object} prisma  - prisma client (unused directly; kept for parity with pricePrivacy)
 */
const { deriveCapabilities } = require('./capabilities');

module.exports = (repos /*, prisma */) => {
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  // ── Discounts (seller promotions + coupon codes) ──
  // Applied AFTER price-list resolution. Automatic discounts (code == null) always
  // apply to matching products; coupon discounts apply only when the matching code
  // is supplied. minOrderAmount is stored/displayed but not enforced per-line in v1.

  async function getActiveDiscounts(sellerBusinessId) {
    if (!sellerBusinessId || !repos.discountRepo) return [];
    try { return await repos.discountRepo.getActiveForBusiness(sellerBusinessId); }
    catch { return []; }
  }

  function discountMatchesProduct(d, product) {
    if (!product) return false;
    if (d.scope === 'ALL') return true;
    if (d.scope === 'PRODUCTS') return Array.isArray(d.productIds) && d.productIds.includes(product.id);
    if (d.scope === 'CATEGORY') return product.category != null && Array.isArray(d.categories) && d.categories.includes(product.category);
    return false;
  }

  function discountedUnit(d, unitPrice) {
    if (d.type === 'FIXED') return Math.max(0, round2(unitPrice - Number(d.value)));
    const pct = Math.min(Math.max(Number(d.value), 0), 100);
    return round2(unitPrice * (1 - pct / 100));
  }

  /**
   * Pick the single best (lowest-price) eligible discount for a product at a given
   * unit price. Coupon discounts require opts.code to match; automatic ones don't.
   * @returns {{ discount, unitPrice }|null}
   */
  function bestDiscount(product, unitPrice, discounts, opts = {}) {
    const code = opts.code ? String(opts.code).trim().toUpperCase() : null;
    let best = null;
    for (const d of discounts || []) {
      if (d.code) {
        if (!code || String(d.code).toUpperCase() !== code) continue;
        if (d.maxUses != null && d.usedCount >= d.maxUses) continue;
      }
      if (!discountMatchesProduct(d, product)) continue;
      const priced = discountedUnit(d, unitPrice);
      if (priced < unitPrice && (best === null || priced < best.unitPrice)) {
        best = { discount: d, unitPrice: priced };
      }
    }
    return best;
  }

  /**
   * Resolve the PriceList (with items) that applies to a buyer for a seller, or null.
   * Precedence: valid manual selection > buyer auto-assignment > seller default list > null.
   * Gated on the seller's CURRENT capability — a downgraded seller reverts to base pricing.
   */
  async function resolvePriceListForBuyer(sellerBusinessId, buyerBusinessId, opts = {}) {
    if (!sellerBusinessId) return null;
    const { manualPriceListId } = opts;

    let seller = null;
    try { seller = await repos.businessRepo.getById(sellerBusinessId); } catch { /* ignore */ }
    if (!seller || !deriveCapabilities(seller).canUseBusinessSpecificPricing) return null;

    // 1. Manual selection (seller picked a list on a manual/guest order or invoice).
    if (manualPriceListId) {
      const list = await repos.priceListRepo.getById(manualPriceListId);
      if (list && list.businessId === sellerBusinessId && list.isActive) return list;
      // invalid/foreign id → fall through to auto-resolution
    }

    // 2. Auto-assignment for this buyer business.
    if (buyerBusinessId) {
      const assignment = await repos.priceListRepo.getAssignmentForBuyer(sellerBusinessId, buyerBusinessId);
      if (assignment) {
        const list = await repos.priceListRepo.getById(assignment.priceListId);
        if (list && list.isActive) return list;
      }
    }

    // 3. Seller's default list (e.g. public storefront / guest fallback).
    const def = await repos.priceListRepo.getDefaultForSeller(sellerBusinessId);
    if (def) return def;

    return null;
  }

  /**
   * Pure: compute a product's unit price under a (already-resolved) list.
   * @param {object|null} priceList  - list WITH `items` loaded (or null = base price)
   * @param {object} product         - product with price / pricePerCarton
   * @param {number} qty             - quantity (reserved; per-unit pricing today)
   * @param {object} opts            - { unit: 'carton' | 'unit' }
   * @returns {{ unitPrice: number, source: 'item_fixed'|'list_discount'|'base' }}
   */
  function applyPriceList(priceList, product, qty, opts = {}) {
    const carton = opts && opts.unit === 'carton';
    const rawBase = carton ? product && product.pricePerCarton : product && product.price;
    const base = (rawBase === null || rawBase === undefined) ? null : Number(rawBase);
    const baseResult = { unitPrice: base == null ? 0 : round2(base), source: 'base' };

    if (!priceList) return baseResult;

    // Currency guard: a currency-scoped list only applies to matching products.
    if (priceList.currency && product && product.currency && priceList.currency !== product.currency) {
      return baseResult;
    }

    // 1. Per-product fixed override wins.
    const items = priceList.items || [];
    const item = items.find((i) => i.productId === (product && product.id));
    if (item) {
      const override = carton ? item.fixedPricePerCarton : item.fixedPrice;
      if (override !== null && override !== undefined) {
        return { unitPrice: round2(Number(override)), source: 'item_fixed' };
      }
    }

    // 2. List-wide discount on the base price.
    if (base != null && typeof priceList.discountPercent === 'number' && priceList.discountPercent > 0) {
      const pct = Math.min(Math.max(priceList.discountPercent, 0), 100);
      return { unitPrice: round2(base * (1 - pct / 100)), source: 'list_discount' };
    }

    // 3. Base price.
    return baseResult;
  }

  /** Convenience: resolve the list then price one product. */
  async function resolveUnitPrice(sellerBusinessId, buyerBusinessId, product, qty, opts = {}) {
    const list = await resolvePriceListForBuyer(sellerBusinessId, buyerBusinessId, opts);
    return applyPriceList(list, product, qty, opts);
  }

  /**
   * Recompute order/invoice line items server-side under a resolved price list.
   * Returns { items, totalAmount, changed }.
   *
   * Rules (backward compatible):
   *  - A line referencing a real product owned by the seller is repriced to the
   *    authoritative value when (a) a price list applies, or (b) opts.forceBase is
   *    set and the product has a base price. Otherwise the client price is kept.
   *  - Free-text lines (no productId) and cross-seller/unknown products always keep
   *    the client-provided unit price (never fabricated).
   *
   * @param {object|null} priceList       - resolved list (with items) or null
   * @param {Array} items                 - raw client line items
   * @param {string} sellerBusinessId     - the selling business (product owner)
   * @param {object} opts                 - { forceBase: boolean }
   */
  async function repriceLineItems(priceList, items, sellerBusinessId, opts = {}) {
    const forceBase = !!opts.forceBase;
    const applyDisc = !!opts.applyDiscounts;
    const discounts = applyDisc ? await getActiveDiscounts(sellerBusinessId) : [];
    const appliedDiscountIds = new Set();
    const out = [];
    let total = 0;
    let changed = false;

    for (const raw of items || []) {
      const productId = raw.productId || raw.product_id || null;
      const quantity = Number(raw.quantity) || 0;
      const unit = raw.unit || 'unit';
      const clientUnitRaw = raw.unitPrice != null ? raw.unitPrice
        : raw.unit_price != null ? raw.unit_price
        : raw.price;
      let unitPrice = typeof clientUnitRaw === 'number' ? clientUnitRaw : 0;
      let priceSource = 'client';
      let priceListId = null;
      let product = null;

      if (productId) {
        try { product = await repos.productRepo.getById(productId); } catch { /* ignore */ }
        if (product && product.businessId === sellerBusinessId) {
          const base = unit === 'carton' ? product.pricePerCarton : product.price;
          const hasBase = base !== null && base !== undefined;
          if (priceList || (forceBase && hasBase)) {
            const resolved = applyPriceList(priceList, product, quantity, { unit });
            if (resolved.unitPrice !== unitPrice) changed = true;
            unitPrice = resolved.unitPrice;
            priceSource = resolved.source;
            priceListId = priceList ? priceList.id : null;
          }
        }
      }

      // Promotions/coupons: best eligible discount on top of the resolved unit price.
      const line = { ...raw, productId: productId || undefined, quantity, unit, unitPrice, subtotal: 0, priceSource, priceListId };
      if (applyDisc && discounts.length && product && product.businessId === sellerBusinessId) {
        const picked = bestDiscount(product, unitPrice, discounts, { code: opts.discountCode });
        if (picked) {
          line.originalUnitPrice = unitPrice;
          unitPrice = picked.unitPrice;
          line.unitPrice = unitPrice;
          line.priceSource = 'discount';
          line.discountId = picked.discount.id;
          line.discountName = picked.discount.name;
          changed = true;
          appliedDiscountIds.add(picked.discount.id);
        }
      }

      const subtotal = Math.round(unitPrice * quantity * 100) / 100;
      line.subtotal = subtotal;
      total += subtotal;
      out.push(line);
    }

    return { items: out, totalAmount: Math.round(total * 100) / 100, changed, appliedDiscountIds: [...appliedDiscountIds] };
  }

  /**
   * Batch: attach `yourPrice` / `basePrice` / `priceListId` / `priceSource` to catalog
   * products for a viewing buyer, WITHOUT overwriting the existing `price` field. Returns
   * the array unchanged when no list applies (non-breaking) or for price-hidden products.
   */
  async function attachYourPrice(products, sellerBusinessId, buyerBusinessId, opts = {}) {
    if (!Array.isArray(products) || products.length === 0) return products;
    const list = await resolvePriceListForBuyer(sellerBusinessId, buyerBusinessId, opts);
    // Automatic promotions surface in the catalog; coupon codes only apply at checkout.
    const autoDiscounts = (await getActiveDiscounts(sellerBusinessId)).filter((d) => !d.code);
    if (!list && autoDiscounts.length === 0) return products;
    return products.map((p) => {
      if (!p || p.priceHidden) return p;

      // 1. Price-list effective unit price (unchanged behaviour).
      let listPrice = p.price;
      let listSource = 'base';
      if (list) {
        const r = applyPriceList(list, p, 1);
        if (r.source !== 'base') { listPrice = r.unitPrice; listSource = r.source; }
      }

      // 2. Best automatic promotion on top of the list price.
      const picked = autoDiscounts.length && listPrice != null
        ? bestDiscount(p, listPrice, autoDiscounts, {}) : null;

      if (listSource === 'base' && !picked) return p; // nothing applies → untouched

      const out = { ...p };
      if (listSource !== 'base') {
        out.basePrice = p.price ?? null;
        out.yourPrice = listPrice;
        out.priceListId = list.id;
        out.priceSource = listSource;
      }
      if (picked) {
        // Markdown the existing PriceBlock understands: price = discounted (bold),
        // originalPrice = pre-promo price (list price if any, else base) = struck-through.
        out.originalPrice = listPrice;
        out.price = picked.unitPrice;
        out.discountId = picked.discount.id;
        out.priceSource = 'discount';
      }
      return out;
    });
  }

  return { resolvePriceListForBuyer, applyPriceList, resolveUnitPrice, repriceLineItems, attachYourPrice, getActiveDiscounts, bestDiscount };
};
