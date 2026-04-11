const { prisma } = require('../../db/prisma');

async function upsert(userId, token, platform, deviceId) {
  return prisma.pushToken.upsert({
    where: { userId_token: { userId, token } },
    update: { platform, deviceId, isActive: true, updatedAt: new Date() },
    create: { userId, token, platform, deviceId },
  });
}

async function deactivate(userId, token) {
  try {
    await prisma.pushToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
    return true;
  } catch {
    return false;
  }
}

async function deactivateAll(userId) {
  await prisma.pushToken.updateMany({
    where: { userId },
    data: { isActive: false },
  });
}

async function getActiveByUserId(userId) {
  return prisma.pushToken.findMany({
    where: { userId, isActive: true },
  });
}

async function getActiveByUserIds(userIds) {
  return prisma.pushToken.findMany({
    where: { userId: { in: userIds }, isActive: true },
  });
}

module.exports = {
  upsert,
  deactivate,
  deactivateAll,
  getActiveByUserId,
  getActiveByUserIds,
};
