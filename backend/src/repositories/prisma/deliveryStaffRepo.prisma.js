/**
 * DeliveryStaff Repository - Prisma Implementation
 * Manages multi-staff assignments for deliveries with roles (driver, teamLeader, support).
 */
const { prisma } = require('../../db/prisma');

const USER_SELECT = { id: true, name: true, avatar: true, email: true };

async function getByDeliveryId(deliveryId) {
  return prisma.deliveryStaff.findMany({
    where: { deliveryId },
    include: { user: { select: USER_SELECT } },
    orderBy: { assignedAt: 'asc' },
  });
}

async function getByUserId(userId) {
  return prisma.deliveryStaff.findMany({
    where: { userId },
    include: {
      delivery: {
        include: { business: { select: { id: true, name: true, logoUrl: true } } },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });
}

async function getByBusinessIdAndUserId(businessId, userId) {
  return prisma.deliveryStaff.findMany({
    where: {
      userId,
      delivery: { businessId },
    },
    include: { delivery: true },
    orderBy: { assignedAt: 'desc' },
  });
}

async function assign(data) {
  return prisma.deliveryStaff.create({
    data: {
      deliveryId: data.deliveryId,
      userId: data.userId,
      role: data.role || 'driver',
      assignedBy: data.assignedBy || null,
    },
    include: { user: { select: USER_SELECT } },
  });
}

async function unassign(deliveryId, userId) {
  return prisma.deliveryStaff.delete({
    where: { deliveryId_userId: { deliveryId, userId } },
  });
}

async function updateRole(deliveryId, userId, role) {
  return prisma.deliveryStaff.update({
    where: { deliveryId_userId: { deliveryId, userId } },
    data: { role },
    include: { user: { select: USER_SELECT } },
  });
}

async function getAssignment(deliveryId, userId) {
  return prisma.deliveryStaff.findUnique({
    where: { deliveryId_userId: { deliveryId, userId } },
    include: { user: { select: USER_SELECT } },
  });
}

module.exports = {
  getByDeliveryId,
  getByUserId,
  getByBusinessIdAndUserId,
  assign,
  unassign,
  updateRole,
  getAssignment,
};
