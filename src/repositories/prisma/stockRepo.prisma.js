/**
 * Stock Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list(limit = 500) {
  return prisma.stock.findMany({
    take: limit,
  });
}

async function getById(id) {
  return prisma.stock.findUnique({
    where: { id }
  });
}

async function getByBusinessId(businessId) {
  return prisma.stock.findMany({
    where: { businessId }
  });
}

async function getByLocationId(locationId) {
  return prisma.stock.findMany({
    where: { locationId }
  });
}

async function getByLocationAndProduct(locationId, productId) {
  return prisma.stock.findUnique({
    where: {
      locationId_productId: { locationId, productId }
    }
  });
}

async function create(data) {
  return prisma.stock.create({
    data
  });
}

async function update(id, patch) {
  return prisma.stock.update({
    where: { id },
    data: patch
  });
}

async function upsert(locationId, productId, qtyOnHand, businessId) {
  return prisma.stock.upsert({
    where: {
      locationId_productId: { locationId, productId }
    },
    create: {
      id: `stk-${Date.now()}`,
      businessId,
      locationId,
      productId,
      qtyOnHand
    },
    update: {
      qtyOnHand
    }
  });
}

async function getByProductId(productId) {
  return prisma.stock.findMany({
    where: { productId }
  });
}

async function remove(id) {
  try {
    await prisma.stock.delete({
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
  getByLocationId, 
  getByLocationAndProduct,
  getByProductId,
  create, 
  update, 
  upsert,
  delete: remove 
};

