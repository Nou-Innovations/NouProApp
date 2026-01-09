/**
 * useChat Hook
 * 
 * ARCHITECTURE: React hook that connects ChatScreen to message data.
 * 
 * Features:
 * - Fetches messages for a specific chat
 * - Send new messages
 * - Mark chat as read on mount
 * - Infinite scroll (load more)
 * - Fallback to mock data if API fails
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, SendMessagePayload } from '@/shared/types/inbox';
import { getMessages, sendMessage, markChatAsRead } from '../inbox.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import { getMessagesForChat } from '@/shared/data/mockChatMessages';

interface UseChatOptions {
  chatId: string;
  /** Mark as read on mount */
  markReadOnMount?: boolean;
}

interface UseChatResult {
  /** List of messages (newest first for inverted FlatList) */
  messages: Message[];
  /** Initial loading state */
  loading: boolean;
  /** Loading more (infinite scroll) state */
  loadingMore: boolean;
  /** Sending message state */
  sending: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether data came from mock (fallback) */
  isMockData: boolean;
  /** Whether there are more messages to load */
  hasMore: boolean;
  /** Send a new message */
  send: (payload: SendMessagePayload) => Promise<Message | null>;
  /** Load more messages (infinite scroll) */
  loadMore: () => Promise<void>;
  /** Add a local message (for optimistic updates) */
  addLocalMessage: (message: Message) => void;
  /** Update a local message */
  updateLocalMessage: (messageId: string, updates: Partial<Message>) => void;
  /** Delete a local message (mark as deleted) */
  deleteLocalMessage: (messageId: string) => void;
}

const PAGE_SIZE = 50;

export function useChat(options: UseChatOptions): UseChatResult {
  const { chatId, markReadOnMount = true } = options;
  
  // Use canonical source: useProfileStore for all identity/context
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUser = useProfileStore((state) => state.currentUser);
  const activeMode = useProfileStore((state) => state.activeMode);
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const companyId = activeBusiness?.id || 'comp-1';
  
  // Derive sender role from actual profile state (not just business vs personal)
  const getSenderRole = useCallback(() => {
    if (activeMode === 'personal') return 'personal';
    // In business mode, use actual role (super_admin, admin, staff)
    return currentUserRole || 'business';
  }, [activeMode, currentUserRole]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);
  
  const hasMarkedRead = useRef(false);
  
  // Initial load
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getMessages({ companyId, chatId, limit: PAGE_SIZE });
      setMessages(result.messages);
      setNextCursor(result.nextCursor);
      setIsMockData(false);
      
      if (__DEV__) {
        console.log(`[useChat] Loaded ${result.messages.length} messages from API`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load messages';
      setError(message);
      
      // Fallback to mock data
      if (__DEV__) {
        console.warn('[useChat] API failed, using mock data:', message);
      }
      
      // Use existing mock system
      const mockMessages = getMessagesForChat(chatId) as Message[];
      setMessages(mockMessages);
      setNextCursor(null);
      setIsMockData(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, chatId]);
  
  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !nextCursor || isMockData) {
      return;
    }
    
    setLoadingMore(true);
    
    try {
      const result = await getMessages({ 
        companyId, 
        chatId, 
        limit: PAGE_SIZE,
        cursor: nextCursor 
      });
      
      setMessages(prev => [...prev, ...result.messages]);
      setNextCursor(result.nextCursor);
      
      if (__DEV__) {
        console.log(`[useChat] Loaded ${result.messages.length} more messages`);
      }
    } catch {
      // Silently fail - don't disrupt UX
      if (__DEV__) {
        console.warn('[useChat] Failed to load more messages');
      }
    } finally {
      setLoadingMore(false);
    }
  }, [companyId, chatId, nextCursor, loadingMore, isMockData]);
  
  // Send message
  const send = useCallback(async (payload: SendMessagePayload): Promise<Message | null> => {
    setSending(true);
    
    // Optimistic update - add message immediately
    // Use real user identity from profileStore (not hardcoded)
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      chatId,
      type: payload.type as 'text',
      text: payload.content,
      isOutgoing: true,
      sender: { 
        id: currentUser?.id || 'user-unknown', 
        name: currentUser?.name || 'You', 
        avatar: currentUser?.avatar_url || '', 
        role: getSenderRole()
      },
      timestamp: new Date().toISOString(),
      status: 'sending',
    } as Message;
    
    setMessages(prev => [optimisticMessage, ...prev]);
    
    if (isMockData) {
      // For mock mode, just update the optimistic message status
      setTimeout(() => {
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, status: 'sent' } as Message : m
        ));
      }, 500);
      setSending(false);
      return optimisticMessage;
    }
    
    try {
      const newMessage = await sendMessage(companyId, chatId, payload);
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempId ? newMessage : m
      ));
      
      return newMessage;
    } catch (err) {
      // Mark optimistic message as failed
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'failed' } as Message : m
      ));
      
      if (__DEV__) {
        console.error('[useChat] Failed to send message:', err);
      }
      return null;
    } finally {
      setSending(false);
    }
  }, [companyId, chatId, isMockData, currentUser, getSenderRole]);
  
  // Add local message (for real-time updates)
  const addLocalMessage = useCallback((message: Message) => {
    setMessages(prev => [message, ...prev]);
  }, []);
  
  // Update local message
  const updateLocalMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, ...updates } as Message : m
    ));
  }, []);
  
  // Delete local message (mark as deleted)
  const deleteLocalMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return {
          id: m.id,
          chatId: m.chatId,
          type: 'deleted',
          isOutgoing: m.isOutgoing,
          sender: m.sender,
          timestamp: m.timestamp,
          status: m.status,
        } as Message;
      }
      return m;
    }));
  }, []);
  
  // Mark as read on mount
  useEffect(() => {
    if (markReadOnMount && !hasMarkedRead.current && !isMockData) {
      hasMarkedRead.current = true;
      markChatAsRead(companyId, chatId).catch(() => {
        // Silently fail
      });
    }
  }, [companyId, chatId, markReadOnMount, isMockData]);
  
  // Load on mount
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);
  
  return {
    messages,
    loading,
    loadingMore,
    sending,
    error,
    isMockData,
    hasMore: nextCursor !== null && !isMockData,
    send,
    loadMore,
    addLocalMessage,
    updateLocalMessage,
    deleteLocalMessage,
  };
}

export default useChat;

