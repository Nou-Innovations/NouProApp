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
  await prisma.delivery.delete({
    where: { id }
  });
  return true;
}

async function getByOrderId(orderId) {
  return prisma.delivery.findFirst({
    where: { orderId }
  });
}

async function getByAssignedStaffId(staffId) {
  return prisma.delivery.findMany({
    where: { assignedStaffId: staffId },
    orderBy: { createdAt: 'desc' }
  });
}

async function getByBusinessIdAndStaffId(businessId, staffId) {
  return prisma.delivery.findMany({
    where: { businessId, assignedStaffId: staffId },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = { 
  list, 
  getById, 
  getByBusinessId, 
  getByLocationId, 
  getByOrderId,
  getByAssignedStaffId,
  getByBusinessIdAndStaffId,
  create, 
  update, 
  delete: remove 
};

