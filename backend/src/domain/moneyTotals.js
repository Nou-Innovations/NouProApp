/**
 * Money-total derivation for invoices and procurement documents.
 *
 * Extracted from server.js so it can be unit-tested: these are the functions that decide
 * what a customer is actually charged (an invoice's stored totalAmount is what
 * POST /payments/invoice-checkout bills), so they need tests rather than a code review.
 *
 * Pure — no database, no network. `logger` is injected so the caller's logger is used.
 */

/**
 * SECURITY (INJ-5): derive an invoice's money fields from its own line items.
 *
 * Totals arrived from the client and were persisted as-is. The only recomputation
 * required BOTH an applicable price list AND at least one product line, so a free-text
 * invoice, or any seller with no price list, could state whatever total it liked — and
 * that stored figure is what `POST /payments/invoice-checkout` later charges.
 *
 * Two traps this deliberately handles, both live bugs in the old formula:
 *
 *  1. SHIPPING. The existing reprice computed `subtotal + tax - discount` with no shipping
 *     term, so whenever a price list applied, shipping the client had added was silently
 *     erased. Generalising that formula unchanged would have erased it from every invoice.
 *  2. FIELD DRIFT. The create payload carries `discountAmount`; PATCH carries both
 *     `discount` and `shipping`. Accept either name rather than picking one and silently
 *     zeroing the other.
 *
 * Per the rollout decision this REPORTS divergence rather than rejecting it: the server
 * figure wins, and a mismatch is logged so real-world disagreement can be measured before
 * it becomes a 400.
 */
function computeInvoiceTotals(body, items) {
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const line = Array.isArray(items) ? items : [];

  const subtotal = round2(line.reduce((sum, it) => {
    const qty = Number(it?.quantity ?? it?.quantityOrdered ?? 0);
    const price = Number(it?.unitPrice ?? it?.price ?? 0);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
    return sum + qty * price;
  }, 0));

  // Clamp rather than reject: a negative tax rate or an over-large discount are nonsense,
  // but they are the client's arithmetic, not an attack worth a 400 on a money path.
  const taxRate = Math.min(Math.max(Number(body?.taxRate) || 0, 0), 100);
  const discount = Math.max(Number(body?.discountAmount ?? body?.discount) || 0, 0);
  const shipping = Math.max(Number(body?.shipping) || 0, 0);

  const taxAmount = round2(subtotal * (taxRate / 100));
  const totalAmount = round2(Math.max(subtotal + taxAmount + shipping - discount, 0));
  return { subtotal, taxAmount, totalAmount };
}

/** Log when the client's arithmetic disagrees with ours. Server figure always wins. */
function reportInvoiceTotalMismatch(context, body, computed, logger = console) {
  const claimed = Number(body?.totalAmount);
  if (!Number.isFinite(claimed)) return;
  if (Math.abs(claimed - computed.totalAmount) < 0.01) return;
  logger.warn(
    `[invoiceTotals] ${context}: client claimed ${claimed}, server computed ` +
    `${computed.totalAmount} (subtotal ${computed.subtotal}, tax ${computed.taxAmount}). ` +
    'Using the server figure.'
  );
}

/**
 * SECURITY (INJ-6): derive a procurement total from its own line items.
 *
 * PR/PO totals were `parseFloat(client value)` with no derivation, and `items` is only
 * validated as "non-empty array" — weaker than invoices, which check every line.
 *
 * The field names are NOT consistent across this flow, which is the trap: the PO to
 * delivery conversion reads `unitPrice`/`quantity`, while delivery and transfer totals
 * read `price`/`quantityOrdered`. A reducer that picks one name returns 0 for half the
 * flow, so both are accepted.
 *
 * Returns null when no line carries a usable price — that means "unknown", and is
 * distinct from a genuine 0. The old `totalAmount ? ... : null` conflated the two, so a
 * legitimately zero-value PO stored null.
 */
function computeProcurementTotal(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  let sawPrice = false;
  const total = items.reduce((sum, it) => {
    const qty = Number(it?.quantity ?? it?.quantityOrdered ?? 0);
    const price = Number(it?.unitPrice ?? it?.price);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
    sawPrice = true;
    return sum + qty * price;
  }, 0);
  return sawPrice ? Math.round(total * 100) / 100 : null;
}

/** Prefer the derived figure; fall back to the client's only when nothing can be derived. */
function resolveProcurementTotal(context, clientValue, items, logger = console) {
  const derived = computeProcurementTotal(items);
  const claimed = clientValue === undefined || clientValue === null || clientValue === ''
    ? null
    : Number(clientValue);
  if (derived === null) {
    // Nothing to derive from — keep a finite client value, but never persist NaN.
    return Number.isFinite(claimed) ? claimed : null;
  }
  if (Number.isFinite(claimed) && Math.abs(claimed - derived) >= 0.01) {
    logger.warn(
      `[procurementTotals] ${context}: client claimed ${claimed}, server computed ${derived}. ` +
      'Using the server figure.'
    );
  }
  return derived;
}

module.exports = {
  computeInvoiceTotals,
  reportInvoiceTotalMismatch,
  computeProcurementTotal,
  resolveProcurementTotal,
};
