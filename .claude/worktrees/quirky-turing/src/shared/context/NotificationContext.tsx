import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
      isItemViewed 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}










