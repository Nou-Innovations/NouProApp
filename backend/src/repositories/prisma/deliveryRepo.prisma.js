/**
 * Delivery Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list() {
  return prisma.delivery.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

async function getById(id) {
  return prisma.delivery.findUnique({
    where: { id }
  });
}

async function getByBusinessId(businessId) {
  return prisma.delivery.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' }
  });
}

async function getByLocationId(locationId) {
  return prisma.delivery.findMany({
    where: { locationId },
    orderBy: { createdAt: 'desc' }
  });
}

async function create(data) {
  return prisma.delivery.create({
    data: {
      ...data,
      items: data.items || [],
      orderTime: data.orderTime ? new Date(data.orderTime) : null,
      expectedDeliveryDateTime: data.expectedDeliveryDateTime 
        ? new Date(data.expectedDeliveryDateTime) 
        : null
    }
  });
}

async function update(id, patch) {
  const updateData = { ...patch };
  
  // Convert date strings to Date objects if present
  if (patch.orderTime) {
    updateData.orderTime = new Date(patch.orderTime);
  }
  if (patch.expectedDeliveryDateTime) {
    updateData.expectedDeliveryDateTime = new Date(patch.expectedDeliveryDateTime);
  }
  
  return prisma.delivery.update({
    where: { id },
    data: updateData
  });
}

async function remove(id) {
  try {
    await prisma.delivery.delete({
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
  create, 
  update, 
  delete: remove 
};

