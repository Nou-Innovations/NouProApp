import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { post, del } from '@/shared/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/shared/config/api';
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

export type PushPermissionStatus = 'granted' | 'denied' | 'unsupported';
/** `undetermined` = the OS has never asked, so we still have our one shot. */
export type PushPermissionState = PushPermissionStatus | 'undetermined';

export interface PushRegistrationResult {
  status: PushPermissionStatus;
  token: string | null;
}

/**
 * What the OS currently thinks, which is the only reliable "have we asked yet" signal.
 *
 * Deliberately not a local flag: a stored flag would be missing for every install that
 * already granted permission before this shipped, and would silently stop their token
 * from being refreshed.
 */
export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (!Device.isDevice) return 'unsupported';
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'undetermined' && canAskAgain) return 'undetermined';
    return 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Request notification permissions and get the Expo push token.
 *
 * Returns a discriminated status rather than a bare token. It used to collapse three
 * very different outcomes into `null` — "user said no", "no hardware (simulator)", and
 * "something threw" — so Settings told simulator users to go and enable notifications in
 * device settings, where there is nothing to enable (N-10).
 */
export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn('[Push] Must use physical device for push notifications');
    return { status: 'unsupported', token: null };
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
    return { status: 'denied', token: null };
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
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '862199f7-e9f9-4a46-9b37-a90773d8a72f',
    });
    return { status: 'granted', token: tokenData.data };
  } catch (err) {
    // Permission was granted but Expo couldn't mint a token (network, project config).
    // Report it as granted-without-token rather than as a denial.
    console.warn('[Push] Could not get Expo token:', err);
    return { status: 'granted', token: null };
  }
}

/**
 * Ask for push permission at a moment it obviously matters — sending a join request,
 * placing an order, sending a first message — but only if we've never asked.
 *
 * The prompt used to fire the instant you first signed in, before the app had shown any
 * reason to say yes. iOS only ever allows one prompt per install, so asking cold spends
 * the single chance you get (N-10). Fire-and-forget: never block the action.
 *
 * No-ops unless the OS has genuinely never asked, so this is safe to call on every
 * order, message and join request.
 */
export async function maybePromptForPush(): Promise<void> {
  try {
    if ((await getPushPermissionState()) !== 'undetermined') return;
    const result = await registerForPushNotifications();
    if (result.token) {
      await registerTokenWithBackend(result.token);
    }
  } catch {
    /* never let a permission prompt break the action that triggered it */
  }
}

/**
 * Register the push token with the backend.
 *
 * `accessToken` is for the signup wizard, where the account exists but nobody has
 * logged in yet, so the store holds no token for the interceptor to attach. Same
 * shape as `unregisterPushTokenOnLogout` below.
 */
export async function registerTokenWithBackend(
  token: string,
  accessToken?: string | null,
): Promise<void> {
  try {
    if (accessToken) {
      const response = await fetch(`${API_CONFIG.baseUrl}/push-tokens/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token, platform: Platform.OS }),
      });
      if (!response.ok) {
        console.warn('[Push] Register rejected:', response.status);
        return;
      }
    } else {
      await post('/push-tokens/register', {
        token,
        platform: Platform.OS,
      });
    }
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
      await del('/push-tokens/unregister', { token });
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (err) {
    console.error('[Push] Failed to unregister token:', err);
  }
}

/**
 * Best-effort push-token unregister used during logout, so a logged-out
 * device stops receiving the old account's notifications.
 *
 * Takes the access token explicitly: logout() clears the store synchronously,
 * so by the time this request fires the normal `del` helper would send an
 * unauthenticated request (and trigger the 401/refresh interceptor).
 * Fire-and-forget — must never block or delay logout.
 */
export async function unregisterPushTokenOnLogout(accessToken: string | null): Promise<void> {
  try {
    const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!pushToken) return;
    if (!accessToken) {
      // Nothing we can do server-side without a token; keep the key so a later
      // sign-in can retry rather than orphaning the row.
      return;
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/push-tokens/unregister`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token: pushToken }),
    });

    // Only drop the local key once the server actually deactivated the row.
    //
    // This used to clear in a `finally` with no status check, so an offline logout —
    // the common case — left the row isActive:true for the OLD account while the local
    // key vanished. The previous user's notifications then kept arriving on this device
    // with no way left to clean up, and it does not self-heal: PushToken is unique on
    // (userId, token), so the next account simply creates a second row (N-7).
    if (response.ok) {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    } else {
      console.warn('[Push] Unregister rejected, keeping token for retry:', response.status);
    }
  } catch (err) {
    // Offline or server unreachable: keep the token so the next successful
    // registration/unregistration can clean it up.
    console.warn('[Push] Failed to unregister token on logout:', err);
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
