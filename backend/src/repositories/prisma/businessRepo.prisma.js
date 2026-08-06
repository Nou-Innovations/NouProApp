/**
 * Business Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

/**
 * Where-fragment matching only live (non-archived) companies. Spread into any `where`.
 * Archived companies must disappear from search, discovery and anything actionable —
 * but must still RESOLVE by id so counterparties can render their name on past orders.
 */
const NOT_DELETED = { deletedAt: null };

async function list(limit = 500, { includeDeleted = false } = {}) {
  return prisma.business.findMany({
    where: includeDeleted ? undefined : { ...NOT_DELETED },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Resolve a company by id REGARDLESS of archive state.
 * This is the tombstone resolver — use it when you need the name of a company that may
 * have been archived (order history, chats, invoices). For anything a viewer can act on
 * (connect, order, join, follow, publish), use getActiveById instead.
 */
async function getById(id) {
  return prisma.business.findUnique({
    where: { id }
  });
}

/** Resolve a company only if it is still active. Returns null for an archived company. */
async function getActiveById(id) {
  return prisma.business.findFirst({
    where: { id, ...NOT_DELETED },
  });
}

async function create(data) {
  return prisma.business.create({
    data: {
      ...data,
      settings: data.settings || {}
    }
  });
}

async function update(id, patch) {
  // Don't allow changing subscriptionTier via this method
  const { subscriptionTier, ...allowedPatch } = patch;
  
  return prisma.business.update({
    where: { id },
    data: allowedPatch
  });
}

async function remove(id) {
  try {
    await prisma.business.delete({
      where: { id }
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function updateSubscription(id, data) {
  // Allow updating subscription-related fields
  const { subscriptionTier, billingPeriod, currentPeriodEnd } = data;
  
  return prisma.business.update({
    where: { id },
    data: {
      ...(subscriptionTier && { subscriptionTier }),
      ...(billingPeriod && { billingPeriod }),
      // Use !== undefined so an explicit null clears the paid period on a FREE downgrade
      // (a plain truthy check would silently skip null and leave a stale period end).
      ...(currentPeriodEnd !== undefined && { currentPeriodEnd }),
    },
  });
}

module.exports = {
  list,
  getById,
  getActiveById,
  NOT_DELETED,
  create,
  update,
  delete: remove,
  updateSubscription,
};

