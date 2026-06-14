/**
 * Delivery Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');
const { v4: uuidv4 } = require('uuid');

const STAFF_INCLUDE = {
  staffAssignments: {
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { assignedAt: 'asc' },
  },
};

async function list(limit = 500) {
  return prisma.delivery.findMany({
    orderBy: { createdAt: 'desc' },
    include: STAFF_INCLUDE,
    take: limit,
  });
}

async function getById(id) {
  return prisma.delivery.findUnique({
    where: { id },
    include: STAFF_INCLUDE,
  });
}

async function getByBusinessId(businessId) {
  return prisma.delivery.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    include: STAFF_INCLUDE,
  });
}

async function getByLocationId(locationId) {
  return prisma.delivery.findMany({
    where: { locationId },
    orderBy: { createdAt: 'desc' },
    include: STAFF_INCLUDE,
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
    },
    include: STAFF_INCLUDE,
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
    data: updateData,
    include: STAFF_INCLUDE,
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
    where: { orderId },
    include: STAFF_INCLUDE,
  });
}

/**
 * Atomically update delivery status fields and append a history record,
 * in a single transaction. Returns the updated delivery (with staff).
 */
async function changeStatusWithHistory(id, statusFields, historyRecord) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id },
      data: statusFields,
      include: STAFF_INCLUDE,
    });

    await tx.deliveryStatusHistory.create({ data: historyRecord });

    return updated;
  });
}

/**
 * Append a single status-history row (used by non-PATCH transition paths,
 * e.g. assignment auto-advance). Best-effort; safe to call standalone.
 */
async function addStatusHistory(record) {
  return prisma.deliveryStatusHistory.create({ data: record });
}

/**
 * Status-change audit trail for a delivery (newest first).
 */
async function getStatusHistory(deliveryId) {
  return prisma.deliveryStatusHistory.findMany({
    where: { deliveryId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Move stock between two locations for a completed transfer.
 *
 * Transactional + idempotent: the `stockAppliedAt` guard is checked AND set
 * inside the same transaction, so a repeated DELIVERED PATCH (or a sync
 * re-fire) never double-applies. Source quantity is clamped at 0 (a transfer
 * is never blocked by stock bookkeeping; insufficient stock is logged).
 *
 * @param {string} deliveryId
 * @param {Object} opts
 * @param {string} opts.businessId
 * @param {string} opts.fromLocationId
 * @param {string} opts.toLocationId
 * @param {Array}  opts.items  delivery items ([{ productId, quantity|quantityOrdered }])
 * @returns {Promise<{applied:boolean, reason?:string}>}
 */
async function applyTransferStock(deliveryId, { businessId, fromLocationId, toLocationId, items }) {
  return prisma.$transaction(async (tx) => {
    // Idempotency: only proceed if not already applied.
    const current = await tx.delivery.findUnique({
      where: { id: deliveryId },
      select: { stockAppliedAt: true },
    });
    if (!current) return { applied: false, reason: 'not_found' };
    if (current.stockAppliedAt) return { applied: false, reason: 'already_applied' };

    for (const raw of items || []) {
      const productId = raw && raw.productId;
      const qty = Number(raw && (raw.quantity != null ? raw.quantity : raw.quantityOrdered)) || 0;
      if (!productId || qty <= 0) continue;

      // Decrement source (clamp at 0 — never go negative).
      const src = await tx.stock.findUnique({
        where: { locationId_productId: { locationId: fromLocationId, productId } },
      });
      const srcQty = Math.max(0, (src?.qtyOnHand || 0) - qty);
      if (src && src.qtyOnHand < qty) {
        console.warn(
          `[applyTransferStock] insufficient stock for product ${productId} at ${fromLocationId} ` +
          `(have ${src.qtyOnHand}, moving ${qty}) — clamped to 0`
        );
      }
      await tx.stock.upsert({
        where: { locationId_productId: { locationId: fromLocationId, productId } },
        create: { id: `stk-${uuidv4()}`, businessId, locationId: fromLocationId, productId, qtyOnHand: srcQty },
        update: { qtyOnHand: srcQty },
      });

      // Increment destination.
      const dst = await tx.stock.findUnique({
        where: { locationId_productId: { locationId: toLocationId, productId } },
      });
      const dstQty = (dst?.qtyOnHand || 0) + qty;
      await tx.stock.upsert({
        where: { locationId_productId: { locationId: toLocationId, productId } },
        create: { id: `stk-${uuidv4()}`, businessId, locationId: toLocationId, productId, qtyOnHand: dstQty },
        update: { qtyOnHand: dstQty },
      });
    }

    // Stamp the guard inside the same transaction → atomic + idempotent.
    await tx.delivery.update({
      where: { id: deliveryId },
      data: { stockAppliedAt: new Date() },
    });

    return { applied: true };
  });
}

async function getByAssignedStaffId(staffId) {
  return prisma.delivery.findMany({
    where: {
      OR: [
        { assignedStaffId: staffId },
        { staffAssignments: { some: { userId: staffId } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      business: {
        select: { id: true, name: true, logoUrl: true },
      },
      ...STAFF_INCLUDE,
    },
  });
}

async function getByBusinessIdAndStaffId(businessId, staffId) {
  return prisma.delivery.findMany({
    where: {
      businessId,
      OR: [
        { assignedStaffId: staffId },
        { staffAssignments: { some: { userId: staffId } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: STAFF_INCLUDE,
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
  delete: remove,
  changeStatusWithHistory,
  addStatusHistory,
  getStatusHistory,
  applyTransferStock,
};
