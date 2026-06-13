/**
 * Push Notifications Service
 *
 * Handles Expo push token registration/unregistration
 * and notification permission management.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '@/shared/config/api';
import { theme } from '@/shared/theme';

// Configure notification handler for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: theme.colors.info,
    });
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: undefined, // Uses app.json expo.extra.eas.projectId
  });

  return tokenData.data;
}

/**
 * Send the device token to the backend for storage
 */
export async function registerDeviceToken(userId: string, token: string): Promise<void> {
  try {
    await apiClient.post(`/api/users/${userId}/device-tokens`, {
      token,
      platform: Platform.OS,
    });
    if (__DEV__) {
      console.log('[Notifications] Device token registered');
    }
  } catch (err) {
    console.warn('[Notifications] Failed to register device token:', err);
  }
}

/**
 * Unregister device token on logout
 */
export async function unregisterDeviceToken(userId: string, token: string): Promise<void> {
  try {
    await apiClient.delete(`/api/users/${userId}/device-tokens/${encodeURIComponent(token)}`);
    if (__DEV__) {
      console.log('[Notifications] Device token unregistered');
    }
  } catch (err) {
    console.warn('[Notifications] Failed to unregister device token:', err);
  }
}

/**
 * Add listener for notification taps (navigate to chat)
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Add listener for foreground notifications
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}
