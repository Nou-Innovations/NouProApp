const { prisma } = require('../../db/prisma');

async function getByUserId(userId) {
  return prisma.education.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
  });
}

async function getById(id) {
  return prisma.education.findUnique({
    where: { id },
  });
}

async function create(data) {
  return prisma.education.create({ data });
}

async function update(id, patch) {
  return prisma.education.update({
    where: { id },
    data: patch,
  });
}

async function remove(id) {
  try {
    await prisma.education.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getByUserId,
  getById,
  create,
  update,
  delete: remove,
};
