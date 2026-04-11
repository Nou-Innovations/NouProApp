/**
 * User Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list(limit = 500) {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getById(id) {
  return prisma.user.findUnique({
    where: { id }
  });
}

async function getByEmail(email) {
  return prisma.user.findFirst({
    where: { email }
  });
}

async function getByPhone(phone) {
  return prisma.user.findFirst({
    where: { phone }
  });
}

async function create(data) {
  return prisma.user.create({
    data
  });
}

async function update(id, patch) {
  return prisma.user.update({
    where: { id },
    data: patch
  });
}

async function remove(id) {
  try {
    await prisma.user.delete({
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
  getByEmail, 
  getByPhone,
  create, 
  update, 
  delete: remove 
};

