import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { useProfileStore } from '@/shared/store/profileStore';
import { getNotificationPage } from '@/features/notifications/notifications.service';

// Notification Context Type
export interface NotificationContextType {
  unreadCount: number;
  inboxUnreadCount: number;
  deliveriesUnreadCount: number;
  invoicesUnreadCount: number;
  viewedItems: Set<string>;
  setUnreadCount: (count: number) => void;
  setInboxUnreadCount: (count: number) => void;
  setDeliveriesUnreadCount: (count: number) => void;
  setInvoicesUnreadCount: (count: number) => void;
  markAllAsRead: () => void;
  markInboxAsRead: () => void;
  markDeliveriesAsRead: () => void;
  markInvoicesAsRead: () => void;
  markItemAsViewed: (itemId: string) => void;
  isItemViewed: (itemId: string) => boolean;
  /** Re-fetch the unread count from the server (app launch, foreground push, after reads). */
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  inboxUnreadCount: 0,
  deliveriesUnreadCount: 0,
  invoicesUnreadCount: 0,
  viewedItems: new Set(),
  setUnreadCount: () => {},
  setInboxUnreadCount: () => {},
  setDeliveriesUnreadCount: () => {},
  setInvoicesUnreadCount: () => {},
  markAllAsRead: () => {},
  markInboxAsRead: () => {},
  markDeliveriesAsRead: () => {},
  markInvoicesAsRead: () => {},
  markItemAsViewed: () => {},
  isItemViewed: () => false,
  refreshUnreadCount: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [deliveriesUnreadCount, setDeliveriesUnreadCount] = useState(0);
  const [invoicesUnreadCount, setInvoicesUnreadCount] = useState(0);
  const [viewedItems, setViewedItems] = useState<Set<string>>(new Set());

  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
    Notifications.setBadgeCountAsync(0).catch(() => {});
  }, []);

  const markInboxAsRead = useCallback(() => {
    setInboxUnreadCount(0);
  }, []);

  const markDeliveriesAsRead = useCallback(() => {
    setDeliveriesUnreadCount(0);
  }, []);

  const markInvoicesAsRead = useCallback(() => {
    setInvoicesUnreadCount(0);
  }, []);

  const markItemAsViewed = useCallback((itemId: string) => {
    setViewedItems(prev => new Set([...prev, itemId]));
  }, []);

  const isItemViewed = useCallback((itemId: string) => {
    return viewedItems.has(itemId);
  }, [viewedItems]);

  /**
   * Source the badge from the server rather than from whichever screen happens to be
   * mounted. The Notifications screen is a lazy tab, so before this the badge was
   * always 0 at launch no matter how many invites were waiting.
   */
  const refreshUnreadCount = useCallback(async () => {
    const userId = useProfileStore.getState().currentUser?.id;
    if (!userId) return;
    try {
      // Ask for one row and take the server's count. Counting the returned array would
      // report only the first page once pagination is in use, and asking for the whole
      // feed just to count it is wasteful — the server already knows (N-12).
      const { unreadCount: count } = await getNotificationPage(userId, { limit: 1 });
      setUnreadCount(count);
      Notifications.setBadgeCountAsync(count).catch(() => {});
    } catch {
      // Badge accuracy is not worth surfacing an error for.
    }
  }, []);

  // Fetch once the user is signed in, and whenever they sign in again.
  const isSignedIn = useProfileStore(
    (state) => Boolean(state.accessToken && state.currentUser),
  );
  useEffect(() => {
    if (!isSignedIn) {
      setUnreadCount(0);
      Notifications.setBadgeCountAsync(0).catch(() => {});
      return;
    }
    void refreshUnreadCount();
  }, [isSignedIn, refreshUnreadCount]);

  // A push arriving while the app is open should move the badge immediately.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      void refreshUnreadCount();
    });
    return () => sub.remove();
  }, [refreshUnreadCount]);

  // Memoize setter functions to prevent infinite re-renders
  const setUnreadCountMemo = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  const setInboxUnreadCountMemo = useCallback((count: number) => {
    setInboxUnreadCount(count);
  }, []);

  const setDeliveriesUnreadCountMemo = useCallback((count: number) => {
    setDeliveriesUnreadCount(count);
  }, []);

  const setInvoicesUnreadCountMemo = useCallback((count: number) => {
    setInvoicesUnreadCount(count);
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      setUnreadCount: setUnreadCountMemo, 
      markAllAsRead, 
      inboxUnreadCount, 
      setInboxUnreadCount: setInboxUnreadCountMemo, 
      markInboxAsRead, 
      deliveriesUnreadCount, 
      setDeliveriesUnreadCount: setDeliveriesUnreadCountMemo, 
      markDeliveriesAsRead, 
      invoicesUnreadCount, 
      setInvoicesUnreadCount: setInvoicesUnreadCountMemo, 
      markInvoicesAsRead, 
      viewedItems, 
      markItemAsViewed, 
      isItemViewed,
      refreshUnreadCount 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}










