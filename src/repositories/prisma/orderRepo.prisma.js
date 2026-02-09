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

/**
 * Atomically update order status and create a history record in one transaction.
 */
async function changeStatusWithHistory(orderId, { status, statusChangedAt, statusChangedBy, statusReason, lastActivityAt }, historyRecord) {
  return prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        statusChangedAt,
        statusChangedBy,
        statusReason,
        lastActivityAt,
      },
    });

    await tx.orderStatusHistory.create({
      data: historyRecord,
    });

    return updatedOrder;
  });
}

/**
 * Get status history for an order, newest first.
 */
async function getStatusHistory(orderId) {
  return prisma.orderStatusHistory.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
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
  delete: remove,
  changeStatusWithHistory,
  getStatusHistory,
};

