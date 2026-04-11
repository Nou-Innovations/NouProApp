const { prisma } = require('../../db/prisma');

async function getByUserId(userId) {
  return prisma.workExperience.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
  });
}

async function getById(id) {
  return prisma.workExperience.findUnique({
    where: { id },
  });
}

async function create(data) {
  return prisma.workExperience.create({ data });
}

async function update(id, patch) {
  return prisma.workExperience.update({
    where: { id },
    data: patch,
  });
}

async function remove(id) {
  try {
    await prisma.workExperience.delete({ where: { id } });
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
