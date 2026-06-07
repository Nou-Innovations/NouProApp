const logger = require('../utils/logger');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send push notifications to specific users.
 * Respects user notification preferences by category.
 *
 * @param {object} params
 * @param {string[]} params.userIds - User IDs to notify
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {string} params.category - Category for preference check (messages, deliveries, invoices, orders, team, system)
 * @param {object} [params.data] - Extra data payload
 * @param {object} repos - Repository container
 */
async function sendToUsers({ userIds, title, body, category, data }, repos) {
  if (!userIds || userIds.length === 0) return;

  try {
    // Check preferences for each user
    const tokensToSend = [];

    for (const userId of userIds) {
      // Check if user has this category enabled
      const prefs = await repos.notificationPreferenceRepo.getByUserId(userId);
      if (prefs && category && prefs[category] === false) {
        continue; // User has disabled this category
      }

      const userTokens = await repos.pushTokenRepo.getActiveByUserId(userId);
      for (const t of userTokens) {
        if (Expo.isExpoPushToken(t.token)) {
          tokensToSend.push(t.token);
        }
      }
    }

    if (tokensToSend.length === 0) return;

    // Build messages
    const messages = tokensToSend.map((pushToken) => ({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    // Send in chunks (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        logger.error('[PushService] Error sending chunk:', err);
      }
    }
  } catch (err) {
    logger.error('[PushService] Error in sendToUsers:', err);
  }
}

module.exports = {
  sendToUsers,
};
