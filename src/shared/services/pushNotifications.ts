import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { post, del } from '@/shared/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/shared/theme';

const PUSH_TOKEN_KEY = 'noupro_push_token';

// Configure notification handler (how notifications appear when app is in foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and get the Expo push token.
 * Returns the token string or null if permissions denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn('[Push] Must use physical device for push notifications');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: theme.colors.success,
    });
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '862199f7-e9f9-4a46-9b37-a90773d8a72f',
  });

  return tokenData.data;
}

/**
 * Register the push token with the backend.
 */
export async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await post('/push-tokens/register', {
      token,
      platform: Platform.OS,
    });
    // Save locally for logout cleanup
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch (err) {
    console.error('[Push] Failed to register token with backend:', err);
  }
}

/**
 * Unregister the push token from the backend.
 */
export async function unregisterTokenFromBackend(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await del('/push-tokens/unregister');
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (err) {
    console.error('[Push] Failed to unregister token:', err);
  }
}

/**
 * Add a listener for notification taps (when user taps a notification).
 * Returns a subscription that should be cleaned up.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Add a listener for incoming notifications (when app is in foreground).
 * Returns a subscription that should be cleaned up.
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(handler);
}
