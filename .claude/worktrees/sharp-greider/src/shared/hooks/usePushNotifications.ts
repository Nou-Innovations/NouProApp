/**
 * usePushNotifications Hook
 *
 * Initializes push notifications on app mount.
 * Handles foreground display and notification tap navigation.
 */

import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  registerForPushNotifications,
  registerDeviceToken,
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from '@/shared/services/notifications';
import { useProfileStore } from '@/shared/store/profileStore';

export function usePushNotifications() {
  const navigation = useNavigation();
  const currentUser = useProfileStore((state) => state.currentUser);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    const setup = async () => {
      const token = await registerForPushNotifications();
      if (token) {
        tokenRef.current = token;
        await registerDeviceToken(currentUser.id, token);
      }
    };

    setup();
  }, [currentUser?.id]);

  // Handle notification taps - navigate to the relevant chat
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.chatId) {
        (navigation as any).navigate('Chat', {
          id: data.chatId,
          name: data.chatName || 'Chat',
          isGroup: data.isGroup || false,
          partnerId: data.chatId,
          partnerType: 'user',
        });
      }
    });

    return () => subscription.remove();
  }, [navigation]);

  // Handle foreground notifications (optional logging)
  useEffect(() => {
    const subscription = addNotificationReceivedListener((notification) => {
      if (__DEV__) {
        console.log('[Push] Foreground notification:', notification.request.content.title);
      }
    });

    return () => subscription.remove();
  }, []);

  return { pushToken: tokenRef.current };
}
