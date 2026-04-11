/**
 * Delivery Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

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
  delete: remove
};
