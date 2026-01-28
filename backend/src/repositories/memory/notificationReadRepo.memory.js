/**
 * NotificationRead Repository - Memory Implementation
 * Uses store reference to maintain single source of truth.
 */
const store = require('../../data/memoryStore');

/**
 * Get all read notifications for a user
 */
async function getByUserId(userId) {
  const results = [];
  for (const [key, value] of Object.entries(store.notificationReads)) {
    if (value.userId === userId) {
      results.push({
        id: key,
        userId: value.userId,
        notificationKey: value.notificationKey,
        readAt: value.readAt
      });
    }
  }
  return results;
}

/**
 * Check if a specific notification is read
 */
async function isRead(userId, notificationKey) {
  const key = `${userId}_${notificationKey}`;
  return !!store.notificationReads[key];
}

/**
 * Mark a notification as read (upsert)
 */
async function upsert({ userId, notificationKey, readAt }) {
  const key = `${userId}_${notificationKey}`;
  const record = {
    userId,
    notificationKey,
    readAt: readAt || new Date().toISOString()
  };
  store.notificationReads[key] = record;
  return { id: key, ...record };
}

/**
 * Get a specific read record
 */
async function get(userId, notificationKey) {
  const key = `${userId}_${notificationKey}`;
  const record = store.notificationReads[key];
  if (!record) return null;
  return { id: key, ...record };
}

/**
 * Delete a read record (mark as unread)
 */
async function remove(userId, notificationKey) {
  const key = `${userId}_${notificationKey}`;
  if (!store.notificationReads[key]) return false;
  delete store.notificationReads[key];
  return true;
}

/**
 * Get multiple read states at once
 */
async function getReadStates(userId, notificationKeys) {
  const result = {};
  for (const notificationKey of notificationKeys) {
    const key = `${userId}_${notificationKey}`;
    result[notificationKey] = !!store.notificationReads[key];
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
