/**
 * NotificationRead Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

/**
 * Get all read notifications for a user
 */
async function getByUserId(userId) {
  return prisma.notificationRead.findMany({
    where: { userId },
    orderBy: { readAt: 'desc' }
  });
}

/**
 * Check if a specific notification is read
 */
async function isRead(userId, notificationKey) {
  const record = await prisma.notificationRead.findUnique({
    where: {
      userId_notificationKey: { userId, notificationKey }
    }
  });
  return !!record;
}

/**
 * Mark a notification as read (upsert)
 */
async function upsert({ userId, notificationKey, readAt }) {
  return prisma.notificationRead.upsert({
    where: {
      userId_notificationKey: { userId, notificationKey }
    },
    update: {
      readAt: readAt || new Date()
    },
    create: {
      userId,
      notificationKey,
      readAt: readAt || new Date()
    }
  });
}

/**
 * Get a specific read record
 */
async function get(userId, notificationKey) {
  return prisma.notificationRead.findUnique({
    where: {
      userId_notificationKey: { userId, notificationKey }
    }
  });
}

/**
 * Delete a read record (mark as unread)
 */
async function remove(userId, notificationKey) {
  try {
    await prisma.notificationRead.delete({
      where: {
        userId_notificationKey: { userId, notificationKey }
      }
    });
    return true;
  } catch (e) {
    // Record not found
    return false;
  }
}

/**
 * Get multiple read states at once
 */
async function getReadStates(userId, notificationKeys) {
  const records = await prisma.notificationRead.findMany({
    where: {
      userId,
      notificationKey: { in: notificationKeys }
    },
    select: { notificationKey: true }
  });
  
  const readSet = new Set(records.map(r => r.notificationKey));
  const result = {};
  for (const notificationKey of notificationKeys) {
    result[notificationKey] = readSet.has(notificationKey);
  }
  return result;
}

module.exports = {
  getByUserId,
  isRead,
  upsert,
  get,
  delete: remove,
  getReadStates
};
