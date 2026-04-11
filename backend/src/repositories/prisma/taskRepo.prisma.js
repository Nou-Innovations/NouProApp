const { prisma } = require('../../db/prisma');

async function getByBusinessId(businessId, filters = {}) {
  const where = { businessId };

  if (filters.status) where.status = filters.status;
  if (filters.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;
  if (filters.priority) where.priority = filters.priority;
  if (filters.type) where.type = filters.type;

  return prisma.task.findMany({
    where,
    orderBy: [
      { dueDate: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
  });
}

async function getById(id) {
  return prisma.task.findUnique({
    where: { id },
  });
}

async function getByAssignedUserId(userId) {
  return prisma.task.findMany({
    where: { assignedToUserId: userId },
    include: {
      business: {
        select: { id: true, name: true, logoUrl: true },
      },
    },
    orderBy: [
      { dueDate: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
  });
}

async function create(data) {
  return prisma.task.create({ data });
}

async function update(id, patch) {
  return prisma.task.update({
    where: { id },
    data: patch,
  });
}

async function remove(id) {
  try {
    await prisma.task.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

async function countByBusinessId(businessId, status = null) {
  const where = { businessId };
  if (status) where.status = status;
  return prisma.task.count({ where });
}

module.exports = {
  getByBusinessId,
  getById,
  getByAssignedUserId,
  create,
  update,
  delete: remove,
  countByBusinessId,
};
