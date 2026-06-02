/**
 * Order Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list(limit = 500) {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getById(id) {
  return prisma.order.findUnique({
    where: { id }
  });
}

async function getByBusinessId(businessId, options = {}) {
  const { status, soldByScope, soldByLocationId, fulfillmentLocationId, search, limit, offset } = options;
  const where = { businessId };
  if (status) where.status = status;
  if (soldByScope) where.soldByScope = soldByScope;
  if (soldByLocationId) where.soldByLocationId = soldByLocationId;
  if (fulfillmentLocationId) where.fulfillmentLocationId = fulfillmentLocationId;
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { id: { contains: search } },
    ];
  }
  const query = { where, orderBy: { createdAt: 'desc' } };
  // Only cap/paginate when a limit is provided, so callers that need the full
  // set (e.g. location-scoped access checks) keep their existing behavior.
  if (limit) {
    query.take = Math.min(Number(limit) || 200, 200);
    query.skip = Number(offset) || 0;
  }
  return prisma.order.findMany(query);
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

async function getByBuyerBusinessId(buyerBusinessId, options = {}) {
  const { status, search, limit, offset } = options;
  const where = { buyerBusinessId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { id: { contains: search } },
      { buyerBusinessName: { contains: search, mode: 'insensitive' } },
    ];
  }
  const query = {
    where,
    orderBy: { createdAt: 'desc' },
    // Include the seller business so the buyer's "Outgoing" list can label
    // the order. The seller is order.business (via businessId).
    include: { business: { select: { name: true } } },
  };
  if (limit) {
    query.take = Math.min(Number(limit) || 200, 200);
    query.skip = Number(offset) || 0;
  }
  const orders = await prisma.order.findMany(query);
  // Surface the seller name as a flat field and drop the nested relation
  // to keep the response shape consistent with other order endpoints.
  return orders.map(({ business, ...order }) => ({
    ...order,
    sellerBusinessName: business?.name || null,
  }));
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

