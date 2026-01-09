/**
 * Location Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list() {
  return prisma.location.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

async function getById(id) {
  return prisma.location.findUnique({
    where: { id }
  });
}

async function getByBusinessId(businessId) {
  // DB uses businessId
  return prisma.location.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' }
  });
}

async function create(businessId, data) {
  return prisma.location.create({
    data: {
      id: data.id,
      businessId,
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      latitude: data.latitude,
      longitude: data.longitude,
      operatingMode: data.operatingMode,
      isPublic: data.isPublic,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    }
  });
}

async function update(id, patch) {
  return prisma.location.update({
    where: { id },
    data: patch
  });
}

async function remove(id) {
  try {
    await prisma.location.delete({
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
  create, 
  update, 
  delete: remove 
};
