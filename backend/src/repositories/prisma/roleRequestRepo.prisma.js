/**
 * RoleRequest Repository - Prisma Implementation
 * Manages staff-to-admin role upgrade requests.
 */
const { prisma } = require('../../db/prisma');

const USER_SELECT = { id: true, name: true, email: true, avatar: true, phone: true };

async function create(data) {
  return prisma.roleRequest.create({
    data,
    include: { user: { select: USER_SELECT } },
  });
}

async function getById(id) {
  return prisma.roleRequest.findUnique({
    where: { id },
    include: { user: { select: USER_SELECT } },
  });
}

async function getByBusinessId(businessId, statusFilter) {
  const where = { businessId };
  if (statusFilter) where.status = statusFilter;
  return prisma.roleRequest.findMany({
    where,
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: 'desc' },
  });
}

async function getByBusinessAndUser(businessId, userId, statusFilter) {
  const where = { businessId, userId };
  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      where.status = { in: statusFilter };
    } else {
      where.status = statusFilter;
    }
  }
  return prisma.roleRequest.findFirst({
    where,
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: 'desc' },
  });
}

async function getByUserId(userId, statusFilter) {
  const where = { userId };
  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      where.status = { in: statusFilter };
    } else {
      where.status = statusFilter;
    }
  }
  return prisma.roleRequest.findMany({
    where,
    include: {
      user: { select: USER_SELECT },
      business: { select: { id: true, name: true, logoUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function update(id, patch) {
  return prisma.roleRequest.update({
    where: { id },
    data: patch,
    include: { user: { select: USER_SELECT } },
  });
}

module.exports = {
  create,
  getById,
  getByBusinessId,
  getByBusinessAndUser,
  getByUserId,
  update,
};
