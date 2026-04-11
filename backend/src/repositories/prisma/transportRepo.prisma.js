/**
 * Transport Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list(limit = 500) {
  return prisma.transport.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getById(id) {
  return prisma.transport.findUnique({
    where: { id }
  });
}

async function getByBusinessId(businessId) {
  return prisma.transport.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' }
  });
}

async function create(data) {
  return prisma.transport.create({ data });
}

async function update(id, patch) {
  return prisma.transport.update({
    where: { id },
    data: patch
  });
}

async function remove(id) {
  try {
    await prisma.transport.delete({
      where: { id }
    });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { list, getById, getByBusinessId, create, update, delete: remove };
