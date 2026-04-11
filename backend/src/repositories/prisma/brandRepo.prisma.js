/**
 * Brand Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list(limit = 500) {
  return prisma.brand.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getById(id) {
  return prisma.brand.findUnique({
    where: { id }
  });
}

async function getByBusinessId(businessId) {
  return prisma.brand.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
    include: {
      products: true,
      _count: { select: { products: true } }
    }
  });
}

async function create(data) {
  return prisma.brand.create({ data });
}

async function update(id, patch) {
  return prisma.brand.update({
    where: { id },
    data: patch
  });
}

async function remove(id) {
  try {
    await prisma.brand.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  list,
  getById,
  getByBusinessId,
  create,
  update,
  delete: remove
};
