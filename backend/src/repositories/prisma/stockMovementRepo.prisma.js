/**
 * StockMovement Repository - Prisma Implementation
 *
 * Append-only ledger of stock bucket changes. The unique
 * (refType, refId, phase, productId) index is the idempotency guard —
 * callers create movements inside the same transaction as the Stock update.
 */
const { prisma } = require('../../db/prisma');
const { v4: uuidv4 } = require('uuid');

async function getByBusinessId(businessId, { limit = 200 } = {}) {
  return prisma.stockMovement.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getByRef(refType, refId) {
  return prisma.stockMovement.findMany({
    where: { refType, refId },
    orderBy: { createdAt: 'asc' },
  });
}

async function getForProductLocation(locationId, productId) {
  return prisma.stockMovement.findMany({
    where: { locationId, productId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Create a movement (typically inside a caller's $transaction via `tx`).
 * Pass `tx` to participate in an existing transaction; falls back to prisma.
 */
async function create(data, tx = prisma) {
  return tx.stockMovement.create({ data: { id: data.id || uuidv4(), ...data } });
}

module.exports = {
  getByBusinessId,
  getByRef,
  getForProductLocation,
  create,
};
