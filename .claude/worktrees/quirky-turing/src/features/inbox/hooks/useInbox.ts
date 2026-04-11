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
 * - Fetches chat list for current company OR current user → writes to store
 * - Client-side filtering (all/unread/direct/group) - computed from store
 * - Search filtering - computed from store
 * - Pull-to-refresh
 * - Supports both business mode (companyId) and personal mode (userId)
 */

import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { Chat, ChatFilter } from '@/shared/types/inbox';
import {
  getChats,
  getUserChats,
  markChatAsRead as markChatAsReadAPI,
  markUserChatAsRead as markUserChatAsReadAPI,
} from '../inbox.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import { useInboxStore } from '../inbox.store';

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
  /** Whether more pages are loading */
  loadingMore: boolean;
  /** Whether there are more chats to load */
  hasMore: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether in personal mode (no activeBusiness) */
  isPersonalMode: boolean;
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
  /** Load the next page of chats */
  loadMore: () => Promise<void>;
  /** Mark a chat as read */
  markAsRead: (chatId: string) => Promise<void>;
}

export function useInbox(options: UseInboxOptions = {}): UseInboxResult {
  const { autoFetch = true } = options;
  
  // ========== Profile Store (canonical context) ==========
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUser = useProfileStore((state) => state.currentUser);
  const companyId = activeBusiness?.id;
  const userId = currentUser?.id;
  const isPersonalMode = !companyId;
  
  // ========== Inbox Store (single source of truth) ==========
  const chats = useInboxStore((state) => state.chats);
  const loading = useInboxStore((state) => state.isLoading);
  const refreshing = useInboxStore((state) => state.isRefreshing);
  const error = useInboxStore((state) => state.error);
  
  const setChats = useInboxStore((state) => state.setChats);
  const setLoading = useInboxStore((state) => state.setLoading);
  const setRefreshing = useInboxStore((state) => state.setRefreshing);
  const setError = useInboxStore((state) => state.setError);
  const markChatAsReadStore = useInboxStore((state) => state.markChatAsRead);
  
  // ========== Local UI State (filter/search are UI concerns) ==========
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [search, setSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const nextCursorRef = useRef<string | null>(null);
  
  // ========== Fetch chats → write to store ==========
  const fetchChats = useCallback(async (isRefresh = false) => {
    // Guard: need either companyId or userId
    if (!companyId && !userId) {
      setChats([]);
      setLoading(false);
      nextCursorRef.current = null;
      return;
    }
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      if (companyId) {
        // Business mode: fetch company chats
        const { chats: result, nextCursor } = await getChats({ companyId });
        setChats(result);
        nextCursorRef.current = nextCursor;
      } else {
        // Personal mode: fetch user chats
        const { chats: result, nextCursor } = await getUserChats({ userId: userId! });
        setChats(result);
        nextCursorRef.current = nextCursor;
      }
      
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load chats';
      setError(message);
      // Don't clear existing chats on error -- keep stale data visible
      nextCursorRef.current = null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, userId, setChats, setLoading, setRefreshing, setError]);
  
  // ========== Load more chats (pagination) ==========
  const loadMore = useCallback(async () => {
    if (!nextCursorRef.current || loadingMore) return;
    
    setLoadingMore(true);
    try {
      if (companyId) {
        const { chats: moreChats, nextCursor } = await getChats({ companyId, cursor: nextCursorRef.current });
        // Read current chats from store to avoid stale closure
        const currentChats = useInboxStore.getState().chats;
        setChats([...currentChats, ...moreChats]);
        nextCursorRef.current = nextCursor;
      } else if (userId) {
        const { chats: moreChats, nextCursor } = await getUserChats({ userId, cursor: nextCursorRef.current });
        const currentChats = useInboxStore.getState().chats;
        setChats([...currentChats, ...moreChats]);
        nextCursorRef.current = nextCursor;
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[useInbox] Failed to load more chats:', err);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [companyId, userId, loadingMore, setChats]);
  
  // ========== Filtered chats (computed from store) ==========
  const filteredChats = useMemo(() => {
    let result = chats;
    
    // Apply type filter
    if (filter === 'unread') {
      result = result.filter(chat => chat.unreadCount > 0);
    } else if (filter === 'direct') {
      if (isPersonalMode) {
        result = result.filter(chat => chat.type === 'direct' || chat.type === 'client' || chat.type === 'supplier');
      } else {
        result = result.filter(chat => chat.type === 'client' || chat.type === 'supplier');
      }
    } else if (filter === 'group') {
      if (isPersonalMode) {
        result = result.filter(chat => chat.type === 'group' || chat.type === 'internal');
      } else {
        result = result.filter(chat => chat.type === 'internal');
      }
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
  }, [chats, filter, search, isPersonalMode]);
  
  // ========== Unread count (computed from all chats, not filtered) ==========
  const unreadChatsCount = useMemo(() => {
    return chats.filter(chat => chat.unreadCount > 0).length;
  }, [chats]);
  
  // ========== Mark as read → update store + call API ==========
  const markAsRead = useCallback(async (chatId: string) => {
    // Optimistic update in store
    markChatAsReadStore(chatId);
    
    try {
      if (companyId) {
        await markChatAsReadAPI(companyId, chatId);
      } else if (userId) {
        await markUserChatAsReadAPI(userId, chatId);
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[useInbox] Failed to mark chat as read:', err);
      }
      // Note: We don't rollback the optimistic update - UX is better this way
    }
  }, [companyId, userId, markChatAsReadStore]);
  
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
    loadingMore,
    hasMore: !!nextCursorRef.current,
    error,
    isPersonalMode,
    filter,
    search,
    unreadChatsCount,
    setFilter,
    setSearch,
    refresh,
    loadMore,
    markAsRead,
  };
}

export default useInbox;
