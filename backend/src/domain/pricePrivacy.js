/**
 * Product price-privacy logic.
 *
 * Extracted verbatim from server.js (Phase 1 modularization). Hides product
 * prices from viewers who are not connected to the owner business when the
 * owner has `settings.pricePrivacyEnabled`. Own products always show price.
 *
 * NOTE: despite the knowledge-graph clustering this near the chat serializers,
 * this is PRODUCT logic. It depends on `repos` (businessRepo) and `prisma`
 * (businessConnection), so it is exposed as a factory.
 *
 * @param {object} repos   - repository registry (uses repos.businessRepo)
 * @param {object} prisma  - prisma client (uses prisma.businessConnection)
 */
module.exports = (repos, prisma) => {
  // Apply price privacy to a single product.
  async function applyPricePrivacy(product, viewerBusinessId) {
    if (!product) return product;
    const ownerBizId = product.businessId || product.companyId || product.ownerBusinessId;

    // Own products always show price
    if (viewerBusinessId && ownerBizId === viewerBusinessId) return product;

    // Check if owner has price privacy enabled
    let settings = null;
    try {
      const biz = await repos.businessRepo.getById(ownerBizId);
      settings = biz?.settings || null;
    } catch { /* ignore */ }

    if (!settings?.pricePrivacyEnabled) return product;

    // Privacy enabled — check connection
    if (viewerBusinessId) {
      try {
        const conn = await prisma.businessConnection.findFirst({
          where: {
            status: 'accepted',
            OR: [
              { requesterBusinessId: viewerBusinessId, targetBusinessId: ownerBizId },
              { requesterBusinessId: ownerBizId, targetBusinessId: viewerBusinessId },
            ],
          },
        });
        if (conn) return product;
      } catch { /* ignore */ }
    }

    // Not connected or no viewer — hide prices
    return { ...product, price: null, salePrice: null, costPrice: null, pricePerCarton: null, priceHidden: true };
  }

  // Apply price privacy to an array of products (with caching for efficiency).
  async function applyPricePrivacyBatch(products, viewerBusinessId) {
    const businessSettingsCache = new Map();
    const connectionCache = new Map();

    const getSettings = async (bizId) => {
      if (!bizId) return null;
      if (businessSettingsCache.has(bizId)) return businessSettingsCache.get(bizId);
      try {
        const biz = await repos.businessRepo.getById(bizId);
        const s = biz?.settings || null;
        businessSettingsCache.set(bizId, s);
        return s;
      } catch {
        businessSettingsCache.set(bizId, null);
        return null;
      }
    };

    const checkConnection = async (bizA, bizB) => {
      if (!bizA || !bizB || bizA === bizB) return true;
      const key = [bizA, bizB].sort().join(':');
      if (connectionCache.has(key)) return connectionCache.get(key);
      try {
        const conn = await prisma.businessConnection.findFirst({
          where: {
            status: 'accepted',
            OR: [
              { requesterBusinessId: bizA, targetBusinessId: bizB },
              { requesterBusinessId: bizB, targetBusinessId: bizA },
            ],
          },
        });
        const result = !!conn;
        connectionCache.set(key, result);
        return result;
      } catch {
        connectionCache.set(key, false);
        return false;
      }
    };

    return Promise.all(products.map(async (p) => {
      const ownerBizId = p.businessId || p.companyId || p.ownerBusinessId;
      if (viewerBusinessId && ownerBizId === viewerBusinessId) return p;

      const settings = await getSettings(ownerBizId);
      if (!settings?.pricePrivacyEnabled) return p;

      if (viewerBusinessId) {
        const connected = await checkConnection(viewerBusinessId, ownerBizId);
        if (connected) return p;
      }

      return { ...p, price: null, salePrice: null, costPrice: null, pricePerCarton: null, priceHidden: true };
    }));
  }

  return { applyPricePrivacy, applyPricePrivacyBatch };
};
