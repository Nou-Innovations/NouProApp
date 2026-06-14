/**
 * Return (RMA) Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');
const { v4: uuidv4 } = require('uuid');

async function getByBusinessId(businessId, { status } = {}) {
  return prisma.return.findMany({
    where: { businessId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id) {
  return prisma.return.findUnique({ where: { id } });
}

async function create(data) {
  return prisma.return.create({ data: { id: data.id || uuidv4(), ...data } });
}

async function update(id, patch) {
  return prisma.return.update({ where: { id }, data: patch });
}

async function remove(id) {
  await prisma.return.delete({ where: { id } });
  return true;
}

module.exports = {
  getByBusinessId,
  getById,
  create,
  update,
  delete: remove,
};
