/**
 * Transfer input validation (pure — no DB).
 *
 * Shape-checks a transfer-create payload before any Transfer row is written.
 * Ownership checks (locations/products belong to the business) stay in
 * server.js where the repositories live; this module owns everything that can
 * be validated from the payload alone, so it is unit-testable without a DB.
 *
 * Items accept `quantity` or the legacy `quantityOrdered` (old delivery-shaped
 * payloads rerouted from POST /deliveries) and are returned normalized with a
 * numeric `quantity`.
 */

function fail(code, message) {
  return { ok: false, code, message };
}

function validateTransferShape(body) {
  const b = body || {};
  const from = typeof b.fromLocationId === 'string' ? b.fromLocationId.trim() : '';
  const to = typeof b.toLocationId === 'string' ? b.toLocationId.trim() : '';

  if (!from || !to) {
    return fail('TRANSFER_LOCATIONS_REQUIRED', 'fromLocationId and toLocationId are required');
  }
  if (from === to) {
    return fail('TRANSFER_SAME_LOCATION', 'Source and destination locations must be different');
  }
  if (!Array.isArray(b.items) || b.items.length === 0) {
    return fail('TRANSFER_ITEMS_REQUIRED', 'At least one item is required');
  }

  const items = [];
  for (let i = 0; i < b.items.length; i++) {
    const it = b.items[i] || {};
    const productId = typeof it.productId === 'string' ? it.productId.trim() : '';
    if (!productId) {
      return fail('TRANSFER_ITEM_INVALID', `Item ${i + 1} is missing a valid productId`);
    }
    const qty = Number(it.quantity ?? it.quantityOrdered);
    if (!Number.isFinite(qty) || qty <= 0) {
      return fail('TRANSFER_ITEM_INVALID', `Item ${i + 1} (${productId}) needs a quantity greater than 0`);
    }
    items.push({ ...it, productId, quantity: qty });
  }

  return { ok: true, from, to, items };
}

module.exports = { validateTransferShape };
