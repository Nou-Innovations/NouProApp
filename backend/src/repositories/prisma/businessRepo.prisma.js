/**
 * Business Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list() {
  return prisma.business.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

async function getById(id) {
  return prisma.business.findUnique({
    where: { id }
  });
}

async function create(data) {
  return prisma.business.create({
    data: {
      ...data,
      settings: data.settings || {}
    }
  });
}

async function update(id, patch) {
  // Don't allow changing subscriptionTier via this method
  const { subscriptionTier, ...allowedPatch } = patch;
  
  return prisma.business.update({
    where: { id },
    data: allowedPatch
  });
}

async function remove(id) {
  try {
    await prisma.business.delete({
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
  create, 
  update, 
  delete: remove 
};

