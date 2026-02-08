/**
 * Order Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list() {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

async function getById(id) {
  return prisma.order.findUnique({
    where: { id }
  });
}

async function getByBusinessId(businessId) {
  return prisma.order.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' }
  });
}

async function getByLocationId(locationId) {
  return prisma.order.findMany({
    where: {
      OR: [
        { soldByLocationId: locationId },
        { fulfillmentLocationId: locationId }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function create(data) {
  return prisma.order.create({
    data: {
      ...data,
      items: data.items || []
    }
  });
}

async function update(id, patch) {
  return prisma.order.update({
    where: { id },
    data: patch
  });
}

async function remove(id) {
  try {
    await prisma.order.delete({
      where: { id }
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function getByBuyerBusinessId(buyerBusinessId) {
  return prisma.order.findMany({
    where: { buyerBusinessId },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = { 
  list, 
  getAll: list,
  getById, 
  getByBusinessId, 
  getByLocationId, 
  getByBuyerBusinessId,
  create, 
  update, 
  delete: remove 
};

