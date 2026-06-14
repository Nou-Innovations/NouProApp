/**
 * Route Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');
const { v4: uuidv4 } = require('uuid');

async function getByBusinessId(businessId, { status } = {}) {
  return prisma.route.findMany({
    where: { businessId, ...(status ? { status } : {}) },
    orderBy: { date: 'desc' },
  });
}

async function getById(id) {
  return prisma.route.findUnique({ where: { id } });
}

async function getByDriverId(driverId) {
  return prisma.route.findMany({
    where: { driverId },
    orderBy: { date: 'desc' },
  });
}

async function create(data) {
  return prisma.route.create({ data: { id: data.id || uuidv4(), ...data } });
}

async function update(id, patch) {
  return prisma.route.update({ where: { id }, data: patch });
}

async function remove(id) {
  await prisma.route.delete({ where: { id } });
  return true;
}

module.exports = {
  getByBusinessId,
  getById,
  getByDriverId,
  create,
  update,
  delete: remove,
};
