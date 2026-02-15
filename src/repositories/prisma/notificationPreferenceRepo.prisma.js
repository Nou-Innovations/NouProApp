const { prisma } = require('../../db/prisma');

async function getByUserId(userId) {
  return prisma.notificationPreference.findUnique({
    where: { userId },
  });
}

async function upsert(userId, preferences) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: { ...preferences, updatedAt: new Date() },
    create: { userId, ...preferences },
  });
}

module.exports = {
  getByUserId,
  upsert,
};
