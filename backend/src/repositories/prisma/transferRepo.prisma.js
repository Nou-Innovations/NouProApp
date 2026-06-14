/**
 * Transfer Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');
const { v4: uuidv4 } = require('uuid');

async function getByBusinessId(businessId, { status } = {}) {
  return prisma.transfer.findMany({
    where: { businessId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id) {
  return prisma.transfer.findUnique({
    where: { id },
    include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
  });
}

async function getByLocationId(locationId) {
  return prisma.transfer.findMany({
    where: { OR: [{ fromLocationId: locationId }, { toLocationId: locationId }] },
    orderBy: { createdAt: 'desc' },
  });
}

async function create(data) {
  return prisma.transfer.create({ data: { id: data.id || uuidv4(), ...data } });
}

async function update(id, patch) {
  return prisma.transfer.update({ where: { id }, data: patch });
}

async function remove(id) {
  await prisma.transfer.delete({ where: { id } });
  return true;
}

/** Atomically update status fields + append a history row. */
async function changeStatusWithHistory(id, statusFields, historyRecord) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.transfer.update({ where: { id }, data: statusFields });
    await tx.transferStatusHistory.create({ data: historyRecord });
    return updated;
  });
}

async function getStatusHistory(transferId) {
  return prisma.transferStatusHistory.findMany({
    where: { transferId },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = {
  getByBusinessId,
  getById,
  getByLocationId,
  create,
  update,
  delete: remove,
  changeStatusWithHistory,
  getStatusHistory,
};
