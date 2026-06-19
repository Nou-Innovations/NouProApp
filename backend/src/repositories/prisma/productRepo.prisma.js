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
  getById,
  getByBusinessId,
  getCarriedCopy,
  create,
  update,
  delete: remove
};

