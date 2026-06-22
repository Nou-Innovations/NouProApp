/**
 * Price List Repository - Prisma Implementation
 *
 * Customer-specific pricing for a SELLER business. A PriceList carries an
 * optional list-wide discountPercent plus per-product fixed-price overrides
 * (PriceListItem), and is applied to customer businesses via PriceListAssignment
 * (auto) or manually at order/invoice time.
 */
const { prisma } = require('../../db/prisma');

// ── Price lists ──────────────────────────────────────────────────────────────

async function getByBusinessId(businessId) {
  return prisma.priceList.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true, assignments: true } },
    },
  });
}

async function getById(id) {
  return prisma.priceList.findUnique({
    where: { id },
    include: { items: true, assignments: true },
  });
}

async function create(data) {
  return prisma.priceList.create({ data });
}

async function update(id, patch) {
  return prisma.priceList.update({ where: { id }, data: patch });
}

async function remove(id) {
  try {
    await prisma.priceList.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

/** The seller's active default list (used when no specific assignment applies). */
async function getDefaultForSeller(businessId) {
  return prisma.priceList.findFirst({
    where: { businessId, isActive: true, isDefault: true },
    include: { items: true },
  });
}

// ── Items ────────────────────────────────────────────────────────────────────

/** Upsert a per-product override (one row per (priceListId, productId)). */
async function upsertItem({ id, priceListId, productId, fixedPrice, fixedPricePerCarton }) {
  return prisma.priceListItem.upsert({
    where: { priceListId_productId: { priceListId, productId } },
    create: { id, priceListId, productId, fixedPrice, fixedPricePerCarton },
    update: { fixedPrice, fixedPricePerCarton },
  });
}

async function removeItem(itemId) {
  try {
    await prisma.priceListItem.delete({ where: { id: itemId } });
    return true;
  } catch (e) {
    return false;
  }
}

// ── Assignments ───────────────────────────────────────────────────────────────

/**
 * Attach a customer business to a list. Enforces one-list-per-customer via the
 * unique (sellerBusinessId, buyerBusinessId): re-assigning moves the customer.
 */
async function upsertAssignment({ id, priceListId, sellerBusinessId, buyerBusinessId }) {
  return prisma.priceListAssignment.upsert({
    where: { sellerBusinessId_buyerBusinessId: { sellerBusinessId, buyerBusinessId } },
    create: { id, priceListId, sellerBusinessId, buyerBusinessId },
    update: { priceListId },
  });
}

async function removeAssignment(sellerBusinessId, buyerBusinessId) {
  try {
    await prisma.priceListAssignment.delete({
      where: { sellerBusinessId_buyerBusinessId: { sellerBusinessId, buyerBusinessId } },
    });
    return true;
  } catch (e) {
    return false;
  }
}

/** The list auto-assigned to a given buyer for a given seller (or null). */
async function getAssignmentForBuyer(sellerBusinessId, buyerBusinessId) {
  return prisma.priceListAssignment.findUnique({
    where: { sellerBusinessId_buyerBusinessId: { sellerBusinessId, buyerBusinessId } },
  });
}

module.exports = {
  getByBusinessId,
  getById,
  create,
  update,
  delete: remove,
  getDefaultForSeller,
  upsertItem,
  removeItem,
  upsertAssignment,
  removeAssignment,
  getAssignmentForBuyer,
};
