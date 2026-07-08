/**
 * Discount Repository - Prisma Implementation
 *
 * Seller-run promotions. `code` null = automatic (auto-applies to matching products
 * in its date window); `code` set = coupon entered at checkout. Applied server-side
 * by priceResolution AFTER the price-list step.
 */
const { prisma } = require('../../db/prisma');

async function getByBusinessId(businessId) {
  return prisma.discount.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } });
}

// Active + currently within its [startDate, endDate] window (null bounds = open-ended).
async function getActiveForBusiness(businessId, now = new Date()) {
  return prisma.discount.findMany({
    where: {
      businessId,
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
  });
}

async function getById(id) {
  return prisma.discount.findUnique({ where: { id } });
}

async function findByCode(businessId, code) {
  if (!code) return null;
  return prisma.discount.findFirst({ where: { businessId, code } });
}

async function create(data) {
  return prisma.discount.create({ data });
}

async function update(id, patch) {
  return prisma.discount.update({ where: { id }, data: patch });
}

async function remove(id) {
  try {
    await prisma.discount.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

async function incrementUsage(id) {
  try {
    return await prisma.discount.update({ where: { id }, data: { usedCount: { increment: 1 } } });
  } catch (e) {
    return null;
  }
}

module.exports = {
  getByBusinessId,
  getActiveForBusiness,
  getById,
  findByCode,
  create,
  update,
  delete: remove,
  incrementUsage,
};
