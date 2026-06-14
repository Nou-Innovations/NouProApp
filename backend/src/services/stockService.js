/**
 * Stock Service — SINGLE SOURCE OF TRUTH for inventory mutations.
 *
 * Multi-stage inventory across three buckets:
 *   onHand    — physically in the location
 *   reserved  — held for an accepted order / approved transfer (a claim on onHand)
 *   inTransit — dispatched, not yet received
 *   available = onHand - reserved   (computed, never stored)
 *
 * Every mutation runs in one $transaction and appends a StockMovement ledger
 * row per (product, bucket). Idempotency is guaranteed by checking the ledger
 * for the operation's (refType, refId, phase) before applying — so a replayed
 * PATCH / sync re-fire is a no-op.
 *
 * NOTE (Phase 2): this module is built but NOT yet wired into the existing
 * stock write sites. Phase 4 reroutes orderStatus/PO-receipt/transfer/manual
 * through it. Until then behavior is unchanged.
 */

const { prisma } = require('../db/prisma');
const { v4: uuidv4 } = require('uuid');

const BUCKET = { ON_HAND: 'onHand', RESERVED: 'reserved', IN_TRANSIT: 'inTransit' };
const BUCKET_COLUMN = { onHand: 'qtyOnHand', reserved: 'qtyReserved', inTransit: 'qtyInTransit' };
const DEFAULT_REORDER_LEVEL = 10;

const itemQty = (it) => Number(it.quantity ?? it.receivedQty ?? it.quantityReceived ?? it.quantityDelivered ?? it.quantityOrdered ?? 0) || 0;

/** Has this exact operation already been applied? (manual ops w/o a ref are never deduped) */
async function alreadyApplied(tx, refType, refId, phase) {
  if (!refType || !refId || !phase) return false;
  const existing = await tx.stockMovement.findFirst({ where: { refType, refId, phase } });
  return !!existing;
}

/**
 * Apply one or more signed bucket deltas for a single product at a location,
 * inside an existing transaction. Clamps each bucket at 0. Writes one ledger
 * row per bucket.
 */
async function applyProductMovement(tx, { businessId, locationId, productId, movements, reason, refType, refId, phase, createdBy }) {
  let stock = await tx.stock.findUnique({ where: { locationId_productId: { locationId, productId } } });
  const data = {};
  const working = {
    qtyOnHand: stock?.qtyOnHand || 0,
    qtyReserved: stock?.qtyReserved || 0,
    qtyInTransit: stock?.qtyInTransit || 0,
  };

  for (const m of movements) {
    const col = BUCKET_COLUMN[m.bucket];
    if (!col) continue;
    const next = Math.max(0, working[col] + m.delta);
    working[col] = next;
    data[col] = next;
    await tx.stockMovement.create({
      data: {
        id: `sm-${uuidv4()}`,
        businessId,
        locationId,
        productId,
        bucket: m.bucket,
        delta: m.delta,
        reason,
        refType: refType || null,
        refId: refId || null,
        phase: phase || null,
        createdBy: createdBy || null,
      },
    });
  }

  if (stock) {
    await tx.stock.update({ where: { id: stock.id }, data });
  } else {
    await tx.stock.create({
      data: { id: `stk-${uuidv4()}`, businessId, locationId, productId, qtyOnHand: 0, qtyReserved: 0, qtyInTransit: 0, ...data },
    });
  }

  return working;
}

/** Generic runner: guard idempotency, then apply each item's bucket moves in one txn. */
async function runOperation({ businessId, locationId, items, reason, refType, refId, phase, createdBy }, bucketMovesForItem) {
  if (!locationId || !Array.isArray(items) || items.length === 0) return { applied: false, reason: 'noop' };
  return prisma.$transaction(async (tx) => {
    if (await alreadyApplied(tx, refType, refId, phase)) return { applied: false, reason: 'already_applied' };
    for (const it of items) {
      const qty = itemQty(it);
      if (!it.productId || qty <= 0) continue;
      const movements = bucketMovesForItem(qty);
      await applyProductMovement(tx, { businessId, locationId, productId: it.productId, movements, reason, refType, refId, phase, createdBy });
    }
    return { applied: true };
  });
}

// ── Order flow ───────────────────────────────────────────────────────────
// reserve/release use phase=null (NOT ledger-guarded) so an order can cycle
// accept→cancel→accept. The order status machine guarantees one call per
// transition, so there's no double-apply risk.
const reserve = (args) =>
  runOperation({ ...args, reason: 'order_reserve', phase: null, refType: args.refType || 'order' },
    (q) => [{ bucket: BUCKET.RESERVED, delta: +q }]);

const release = (args) =>
  runOperation({ ...args, reason: 'order_release', phase: null, refType: args.refType || 'order' },
    (q) => [{ bucket: BUCKET.RESERVED, delta: -q }]);

/**
 * Fulfill an order that completes WITHOUT a delivery handling the physical move
 * (reserved -> gone, onHand -> gone). Guarded (terminal, once per order).
 */
const fulfillDirect = (args) =>
  runOperation({ ...args, reason: 'order_fulfill', phase: 'fulfill', refType: 'order' },
    (q) => [{ bucket: BUCKET.RESERVED, delta: -q }, { bucket: BUCKET.ON_HAND, delta: -q }]);

// ── Outgoing delivery flow ───────────────────────────────────────────────
const dispatch = (args) =>
  runOperation({ ...args, reason: 'delivery_dispatch', phase: 'dispatch', refType: args.refType || 'delivery' },
    (q) => [{ bucket: BUCKET.RESERVED, delta: -q }, { bucket: BUCKET.ON_HAND, delta: -q }, { bucket: BUCKET.IN_TRANSIT, delta: +q }]);

// Legacy-order dispatch: a pre-reservation-model order already decremented onHand
// at accept-time, so only track in-transit (don't decrement onHand again).
const dispatchVisibility = (args) =>
  runOperation({ ...args, reason: 'delivery_dispatch', phase: 'dispatch', refType: args.refType || 'delivery' },
    (q) => [{ bucket: BUCKET.IN_TRANSIT, delta: +q }]);

const deliver = (args) =>
  runOperation({ ...args, reason: 'delivery_deliver', phase: 'deliver', refType: args.refType || 'delivery' },
    (q) => [{ bucket: BUCKET.IN_TRANSIT, delta: -q }]);

// ── Transfer flow (source location) ──────────────────────────────────────
const transferReserve = (args) =>
  runOperation({ ...args, reason: 'transfer_reserve', phase: 'transfer_reserve', refType: 'transfer' },
    (q) => [{ bucket: BUCKET.RESERVED, delta: +q }]);

const transferDispatch = (args) =>
  runOperation({ ...args, reason: 'transfer_dispatch', phase: 'transfer_dispatch', refType: 'transfer' },
    (q) => [{ bucket: BUCKET.RESERVED, delta: -q }, { bucket: BUCKET.ON_HAND, delta: -q }, { bucket: BUCKET.IN_TRANSIT, delta: +q }]);

/** Source clears in-transit for shipped qty; destination receives good qty (separate calls below). */
const transferClearInTransit = (args) =>
  runOperation({ ...args, reason: 'transfer_dispatch', phase: 'transfer_clear', refType: 'transfer' },
    (q) => [{ bucket: BUCKET.IN_TRANSIT, delta: -q }]);

// ── Receiving (destination location) ─────────────────────────────────────
const receiveGoods = (args) =>
  runOperation({ ...args, reason: args.reason || 'goods_receipt', phase: args.phase || 'receive', refType: args.refType || 'po' },
    (q) => [{ bucket: BUCKET.ON_HAND, delta: +q }]);

const restock = (args) =>
  runOperation({ ...args, reason: 'return_restock', phase: 'restock', refType: 'return' },
    (q) => [{ bucket: BUCKET.ON_HAND, delta: +q }]);

// ── Manual adjustment (no idempotency — each edit is distinct) ────────────
async function manualAdjust({ businessId, locationId, productId, delta, createdBy }) {
  return prisma.$transaction(async (tx) =>
    applyProductMovement(tx, {
      businessId, locationId, productId,
      movements: [{ bucket: BUCKET.ON_HAND, delta }],
      reason: 'manual_adjust', refType: 'manual', refId: `${Date.now()}`, phase: null, createdBy,
    })
  );
}

/** Set an absolute on-hand value (manual stock edit). Returns the full Stock row. */
async function setOnHand({ businessId, locationId, productId, qtyOnHand, createdBy }) {
  await prisma.$transaction(async (tx) => {
    const stock = await tx.stock.findUnique({ where: { locationId_productId: { locationId, productId } } });
    const current = stock?.qtyOnHand || 0;
    const delta = qtyOnHand - current;
    return applyProductMovement(tx, {
      businessId, locationId, productId,
      movements: [{ bucket: BUCKET.ON_HAND, delta }],
      reason: 'manual_adjust', refType: 'manual', refId: `set-${Date.now()}`, phase: null, createdBy,
    });
  });
  return prisma.stock.findUnique({ where: { locationId_productId: { locationId, productId } } });
}

// ── Reads ────────────────────────────────────────────────────────────────
function availableOf(stock) {
  if (!stock) return 0;
  return (stock.qtyOnHand || 0) - (stock.qtyReserved || 0);
}

async function getAvailable(locationId, productId) {
  const stock = await prisma.stock.findUnique({ where: { locationId_productId: { locationId, productId } } });
  return availableOf(stock);
}

/**
 * Rebuild Stock buckets for a business from the StockMovement ledger.
 * (Admin repair tool — only meaningful once all writes go through this service.)
 */
async function recomputeForBusiness(businessId) {
  const movements = await prisma.stockMovement.findMany({ where: { businessId } });
  const acc = {}; // key: locationId|productId -> {qtyOnHand, qtyReserved, qtyInTransit}
  for (const m of movements) {
    const key = `${m.locationId}|${m.productId}`;
    acc[key] = acc[key] || { qtyOnHand: 0, qtyReserved: 0, qtyInTransit: 0 };
    const col = BUCKET_COLUMN[m.bucket];
    if (col) acc[key][col] += m.delta;
  }
  const results = [];
  for (const [key, buckets] of Object.entries(acc)) {
    const [locationId, productId] = key.split('|');
    const clamped = {
      qtyOnHand: Math.max(0, buckets.qtyOnHand),
      qtyReserved: Math.max(0, buckets.qtyReserved),
      qtyInTransit: Math.max(0, buckets.qtyInTransit),
    };
    await prisma.stock.upsert({
      where: { locationId_productId: { locationId, productId } },
      create: { id: `stk-${uuidv4()}`, businessId, locationId, productId, ...clamped },
      update: clamped,
    });
    results.push({ locationId, productId, ...clamped });
  }
  return results;
}

module.exports = {
  BUCKET,
  DEFAULT_REORDER_LEVEL,
  availableOf,
  getAvailable,
  reserve,
  release,
  fulfillDirect,
  dispatch,
  dispatchVisibility,
  deliver,
  transferReserve,
  transferDispatch,
  transferClearInTransit,
  receiveGoods,
  restock,
  manualAdjust,
  setOnHand,
  recomputeForBusiness,
};
