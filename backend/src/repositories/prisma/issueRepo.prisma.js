/**
 * Issue Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');
const { v4: uuidv4 } = require('uuid');

async function getByBusinessId(businessId, { status } = {}) {
  return prisma.issue.findMany({
    where: { businessId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id) {
  return prisma.issue.findUnique({ where: { id } });
}

async function getByEntity(entityType, entityId) {
  return prisma.issue.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
  });
}

async function create(data) {
  return prisma.issue.create({ data: { id: data.id || uuidv4(), ...data } });
}

async function update(id, patch) {
  return prisma.issue.update({ where: { id }, data: patch });
}

async function remove(id) {
  await prisma.issue.delete({ where: { id } });
  return true;
}

async function countOpen(businessId) {
  return prisma.issue.count({ where: { businessId, status: { not: 'resolved' } } });
}

module.exports = {
  getByBusinessId,
  getById,
  getByEntity,
  create,
  update,
  delete: remove,
  countOpen,
};
