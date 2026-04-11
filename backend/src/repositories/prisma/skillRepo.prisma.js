const { prisma } = require('../../db/prisma');

async function search(query, limit = 20) {
  if (!query || !query.trim()) return [];
  return prisma.skill.findMany({
    where: {
      name: { contains: query.trim(), mode: 'insensitive' },
    },
    orderBy: { name: 'asc' },
    take: limit,
  });
}

async function getByName(name) {
  return prisma.skill.findFirst({
    where: { name: { equals: name.toLowerCase().trim(), mode: 'insensitive' } },
  });
}

async function create(data) {
  return prisma.skill.create({ data });
}

async function getUserSkills(userId) {
  return prisma.userSkill.findMany({
    where: { userId },
    include: { skill: true },
    orderBy: { displayOrder: 'asc' },
  });
}

async function addUserSkill(data) {
  return prisma.userSkill.create({
    data,
    include: { skill: true },
  });
}

async function removeUserSkill(userId, skillId) {
  try {
    await prisma.userSkill.delete({
      where: { userId_skillId: { userId, skillId } },
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function reorderUserSkills(userId, skillIds) {
  const updates = skillIds.map((skillId, index) =>
    prisma.userSkill.updateMany({
      where: { userId, skillId },
      data: { displayOrder: index },
    })
  );
  return prisma.$transaction(updates);
}

async function countUserSkills(userId) {
  return prisma.userSkill.count({ where: { userId } });
}

module.exports = {
  search,
  getByName,
  create,
  getUserSkills,
  addUserSkill,
  removeUserSkill,
  reorderUserSkills,
  countUserSkills,
};
