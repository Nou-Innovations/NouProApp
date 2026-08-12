/**
 * Product Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list(limit = 500) {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * SECURITY / CORRECTNESS (ABUSE-7): the public catalogue query, filtered in the DATABASE.
 *
 * `list()` takes the newest 500 rows and the caller then filters in JS. That is a silent
 * correctness bug as soon as the table passes 500: `?companyId=X` searches only within the
 * newest 500 products globally, so a company whose products are older returns nothing and
 * the suggestions carousel goes blank. Raising the cap only moves the cliff; the filters
 * have to run in the query.
 *
 * `isListed` is the authoritative column (mapped to `is_listed`). `isDisplayable` is
 * accepted as a legacy alias because older rows were written with only that set.
 */
async function listPublic({ businessId, brand, category, limit = 100 } = {}) {
  const where = {
    OR: [{ isListed: true }, { isDisplayable: true }],
    ...(businessId ? { businessId } : {}),
    ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
    ...(brand ? { brand: { equals: brand, mode: 'insensitive' } } : {}),
  };
  return prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 100, 100),
  });
}

async function getById(id) {
  return prisma.product.findUnique({
    where: { id }
  });
}

async function getByBusinessId(businessId) {
  return prisma.product.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' }
  });
}

/** The business's "carried" copy of another business's product, if any. */
async function getCarriedCopy(businessId, sourceProductId) {
  return prisma.product.findFirst({
    where: { businessId, sourceProductId }
  });
}

async function create(data) {
  return prisma.product.create({
    data: {
      ...data,
      variants: data.variants || null
    }
  });
}

async function update(id, patch) {
  return prisma.product.update({
    where: { id },
    data: patch
  });
}

async function remove(id) {
  try {
    await prisma.product.delete({
      where: { id }
    });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  list,
  listPublic,
  getById,
  getByBusinessId,
  getCarriedCopy,
  create,
  update,
  delete: remove
};

