const { prisma } = require('../../db/prisma');

async function getByUserId(userId) {
  return prisma.certification.findMany({
    where: { userId },
    orderBy: { issueDate: 'desc' },
  });
}

async function getById(id) {
  return prisma.certification.findUnique({
    where: { id },
  });
}

async function create(data) {
  return prisma.certification.create({ data });
}

async function update(id, patch) {
  return prisma.certification.update({
    where: { id },
    data: patch,
  });
}

async function remove(id) {
  try {
    await prisma.certification.delete({ where: { id } });
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
