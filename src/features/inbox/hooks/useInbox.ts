/**
 * useInbox Hook
 * 
 * ARCHITECTURE: Thin orchestrator that connects InboxScreen to useInboxStore.
 * 
 * Single Source of Truth:
 * - Chats live in useInboxStore (shared with socket updates)
 * - This hook fetches from API and writes to store
 * - UI reads from store via this hook's selectors
 * 
 * Features:
 * - Fetches chat list for current company → writes to store
 * - Client-side filtering (all/unread/direct/group) - computed from store
 * - Search filtering - computed from store
 * - Pull-to-refresh
 * - Fallback to mock data if API fails
 */

import { useEffect, useCallback, useMemo, useState } from 'react';
import { Chat, ChatFilter } from '@/shared/types/inbox';
import { getChats, markChatAsRead as markChatAsReadAPI } from '../inbox.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import { useInboxStore } from '../inbox.store';

// Mock data fallback (matches InboxScreen's original mock structure)
const mockChats: Chat[] = [
  {
    id: '1',
    companyId: 'comp-1',
    locationId: null,
    type: 'client',
    name: '📋 Message Types Showcase',
    avatar: 'https://picsum.photos/seed/showcase/40/40',
    participants: ['user-1', 'demo-1'],
    lastMessage: {
      id: 'msg-1',
      content: 'View all chat bubble types here',
      type: 'text',
      senderId: 'demo-1',
      senderName: 'Demo Contact',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'delivered'
    },
    unreadCount: 10,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    companyId: 'comp-1',
    locationId: null,
    type: 'client',
    name: 'Sarah Johnson',
    avatar: 'https://picsum.photos/seed/sarah/40/40',
    participants: ['user-1', 'sarah-1'],
    lastMessage: {
      id: 'msg-2',
      content: 'Photo',
      type: 'photo',
      senderId: 'sarah-1',
      senderName: 'Sarah Johnson',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'delivered'
    },
    unreadCount: 1,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    companyId: 'comp-1',
    locationId: null,
    type: 'supplier',
    name: 'XYZ Suppliers',
    avatar: 'https://picsum.photos/seed/xyz/40/40',
    participants: ['user-1', 'xyz-1'],
    lastMessage: {
      id: 'msg-3',
      content: 'New_Products_Catalog.pdf',
      type: 'pdf',
      senderId: 'xyz-1',
      senderName: 'XYZ Suppliers',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'seen'
    },
    unreadCount: 1,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  }
];

interface UseInboxOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

interface UseInboxResult {
  /** All chats from store */
  chats: Chat[];
  /** Filtered chats based on current filter */
  filteredChats: Chat[];
  /** Loading state */
  loading: boolean;
  /** Refreshing state (pull-to-refresh) */
  refreshing: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether data came from mock (fallback) */
  isMockData: boolean;
  /** Current filter */
  filter: ChatFilter;
  /** Current search query */
  search: string;
  /** Number of chats with unread messages */
  unreadChatsCount: number;
  /** Set the filter */
  setFilter: (filter: ChatFilter) => void;
  /** Set the search query */
  setSearch: (search: string) => void;
  /** Refresh chats */
  refresh: () => Promise<void>;
  /** Mark a chat as read */
  markAsRead: (chatId: string) => Promise<void>;
}

export function useInbox(options: UseInboxOptions = {}): UseInboxResult {
  const { autoFetch = true } = options;
  
  // ========== Profile Store (canonical company context) ==========
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id;
  
  // ========== Inbox Store (single source of truth) ==========
  const chats = useInboxStore((state) => state.chats);
  const loading = useInboxStore((state) => state.isLoading);
  const refreshing = useInboxStore((state) => state.isRefreshing);
  const error = useInboxStore((state) => state.error);
  const isMockData = useInboxStore((state) => state.isMockData);
  
  const setChats = useInboxStore((state) => state.setChats);
  const setLoading = useInboxStore((state) => state.setLoading);
  const setRefreshing = useInboxStore((state) => state.setRefreshing);
  const setError = useInboxStore((state) => state.setError);
  const setIsMockData = useInboxStore((state) => state.setIsMockData);
  const markChatAsReadStore = useInboxStore((state) => state.markChatAsRead);
  
  // ========== Local UI State (filter/search are UI concerns) ==========
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [search, setSearch] = useState('');
  
  // ========== Fetch chats → write to store ==========
  const fetchChats = useCallback(async (isRefresh = false) => {
    // Guard: no company context yet
    if (!companyId) {
      if (__DEV__) {
        console.log('[useInbox] No companyId, using mock data');
      }
      setChats(mockChats);
      setIsMockData(true);
      setLoading(false);
      return;
    }
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const result = await getChats({ companyId });
      setChats(result);
      setIsMockData(false);
      
      if (__DEV__) {
        console.log(`[useInbox] Loaded ${result.length} chats from API → store`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load chats';
      setError(message);
      
      // Fallback to mock data
      if (__DEV__) {
        console.warn('[useInbox] API failed, using mock data:', message);
      }
      setChats(mockChats);
      setIsMockData(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, setChats, setLoading, setRefreshing, setError, setIsMockData]);
  
  // ========== Filtered chats (computed from store) ==========
  const filteredChats = useMemo(() => {
    let result = chats;
    
    // Apply type filter
    if (filter === 'unread') {
      result = result.filter(chat => chat.unreadCount > 0);
    } else if (filter === 'direct') {
      result = result.filter(chat => chat.type === 'client' || chat.type === 'supplier');
    } else if (filter === 'group') {
      result = result.filter(chat => chat.type === 'internal');
    }
    // 'all' shows everything
    
    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(chat =>
        chat.name.toLowerCase().includes(searchLower) ||
        (chat.lastMessage?.content?.toLowerCase().includes(searchLower))
      );
    }
    
    return result;
  }, [chats, filter, search]);
  
  // ========== Unread count (computed from filtered) ==========
  const unreadChatsCount = useMemo(() => {
    return filteredChats.filter(chat => chat.unreadCount > 0).length;
  }, [filteredChats]);
  
  // ========== Mark as read → update store + call API ==========
  const markAsRead = useCallback(async (chatId: string) => {
    // Optimistic update in store
    markChatAsReadStore(chatId);
    
    if (isMockData) {
      return; // Don't call API for mock data
    }
    
    if (!companyId) {
      return; // No company context
    }
    
    try {
      await markChatAsReadAPI(companyId, chatId);
    } catch (err) {
      if (__DEV__) {
        console.warn('[useInbox] Failed to mark chat as read:', err);
      }
      // Note: We don't rollback the optimistic update - UX is better this way
    }
  }, [companyId, isMockData, markChatAsReadStore]);
  
  // ========== Refresh function ==========
  const refresh = useCallback(() => fetchChats(true), [fetchChats]);
  
  // ========== Auto-fetch on mount ==========
  useEffect(() => {
    if (autoFetch) {
      fetchChats();
    }
  }, [autoFetch, fetchChats]);
  
  return {
    chats,
    filteredChats,
    loading,
    refreshing,
    error,
    isMockData,
    filter,
    search,
    unreadChatsCount,
    setFilter,
    setSearch,
    refresh,
    markAsRead,
  };
}

export default useInbox;
