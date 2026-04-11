/**
 * Invoice Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list(limit = 500) {
  return prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getById(id) {
  return prisma.invoice.findUnique({
    where: { id }
  });
}

async function getByBusinessId(businessId) {
  return prisma.invoice.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' }
  });
}

async function getByLocationId(locationId) {
  return prisma.invoice.findMany({
    where: { issuedByLocationId: locationId },
    orderBy: { createdAt: 'desc' }
  });
}

async function create(data) {
  return prisma.invoice.create({
    data: {
      ...data,
      items: data.items || []
    }
  });
}

async function update(id, patch) {
  return prisma.invoice.update({
    where: { id },
    data: patch
  });
}

async function remove(id) {
  try {
    await prisma.invoice.delete({
      where: { id }
    });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { 
  list, 
  getById, 
  getByBusinessId, 
  getByLocationId, 
  create, 
  update, 
  delete: remove 
};

