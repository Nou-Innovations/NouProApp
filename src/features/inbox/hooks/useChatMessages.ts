/**
 * useChatMessages Hook
 *
 * Encapsulates all message-level logic for a single chat conversation:
 * - Initial fetch (with personal/business mode branching)
 * - Cursor-based pagination (load more)
 * - isOutgoing normalization
 * - Store sync (for socket integration)
 * - Mark-as-read on mount
 * - Socket room join/leave
 * - Socket message merge into local state
 *
 * This hook replaces ~100 lines of inline logic in ChatScreen,
 * providing a consistent data flow parallel to useInbox (chat lists).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProfileStore } from '@/shared/store/profileStore';
import { useInboxStore } from '../inbox.store';
import { chatService } from '@/shared/services/chat';
import {
  getMessages,
  getUserMessages,
  markChatAsRead,
  markUserChatAsRead,
} from '../inbox.service';
import type { Message } from '@/shared/types/inbox';

export interface UseChatMessagesResult {
  messages: Message[];
  loadingMessages: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  addOptimisticMessage: (msg: Message) => void;
  replaceMessage: (tempId: string, realMsg: Message) => void;
  removeMessage: (messageId: string) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  /** Direct setter for complex message state transitions (optimistic updates, etc.) */
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useChatMessages(chatId: string): UseChatMessagesResult {
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUser = useProfileStore((state) => state.currentUser);
  const currentUserId = currentUser?.id || 'current-user';
  const isPersonalMode = !activeBusiness;

  // Local state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Store actions
  const storeSetMessages = useInboxStore((state) => state.setMessages);
  const cachedMessages = useInboxStore((state) => state.messages[chatId]);

  // Stable ref for currentUserId to avoid stale closures
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  /**
   * Normalize isOutgoing on messages based on sender.id matching current user.
   * With P2-2 the backend now computes isOutgoing per-viewer, but we keep
   * this client-side normalization as a safety net for socket messages.
   */
  const normalizeMessages = useCallback(
    (msgs: Message[]): Message[] => {
      const uid = currentUserIdRef.current;
      return msgs.map((msg) => ({
        ...msg,
        isOutgoing:
          msg.sender?.id === uid ||
          msg.sender?.name === 'You' ||
          msg.isOutgoing === true,
      }));
    },
    []
  );

  // ========== Initial fetch ==========
  useEffect(() => {
    let cancelled = false;

    const fetchMessages = async () => {
      // Show cached messages instantly
      if (cachedMessages && cachedMessages.length > 0) {
        setMessages(normalizeMessages(cachedMessages));
      }

      setLoadingMessages(true);
      try {
        if (isPersonalMode) {
          if (currentUser?.id) {
            const result = await getUserMessages({
              userId: currentUser.id,
              chatId,
              limit: 50,
            });
            if (cancelled) return;
            const normalized = normalizeMessages(result.messages);
            setMessages(normalized);
            setNextCursor(result.nextCursor);
            storeSetMessages(chatId, normalized);
            // Only mark as read if there are unread messages (avoid unnecessary API calls)
            const chatUnread = useInboxStore.getState().chats.find(c => c.id === chatId)?.unreadCount ?? 0;
            if (chatUnread > 0) {
              await markUserChatAsRead(currentUser.id, chatId);
            }
          } else {
            if (!cancelled) setMessages([]);
          }
        } else if (activeBusiness?.id) {
          const result = await getMessages({
            companyId: activeBusiness.id,
            chatId,
            limit: 50,
          });
          if (cancelled) return;
          const normalized = normalizeMessages(result.messages);
          setMessages(normalized);
          setNextCursor(result.nextCursor);
          storeSetMessages(chatId, normalized);
          // Only mark as read if there are unread messages (avoid unnecessary API calls)
          const chatUnread = useInboxStore.getState().chats.find(c => c.id === chatId)?.unreadCount ?? 0;
          if (chatUnread > 0) {
            await markChatAsRead(activeBusiness.id, chatId);
          }
        } else {
          if (!cancelled) setMessages([]);
        }
      } catch (error) {
        console.error('[useChatMessages] Failed to load messages:', error);
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };

    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [chatId, activeBusiness?.id, currentUser?.id, isPersonalMode]);

  // ========== Infinite scroll: load older messages ==========
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || loadingMessages) return;

    setLoadingMore(true);
    try {
      let result;
      if (isPersonalMode && currentUser?.id) {
        result = await getUserMessages({
          userId: currentUser.id,
          chatId,
          limit: 50,
          cursor: nextCursor,
        });
      } else if (activeBusiness?.id) {
        result = await getMessages({
          companyId: activeBusiness.id,
          chatId,
          limit: 50,
          cursor: nextCursor,
        });
      }

      if (result && result.messages.length > 0) {
        const normalized = normalizeMessages(result.messages);
        setMessages((prev) => [...prev, ...normalized]);
        setNextCursor(result.nextCursor);
        useInboxStore.getState().appendMessages(chatId, normalized);
      } else {
        setNextCursor(null);
      }
    } catch (error) {
      console.error('[useChatMessages] Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, loadingMessages, isPersonalMode, currentUser?.id, activeBusiness?.id, chatId]);

  // ========== Socket.IO: Join/leave chat room ==========
  useEffect(() => {
    chatService.joinChat(chatId);
    return () => {
      chatService.leaveChat(chatId);
    };
  }, [chatId]);

  // ========== Socket.IO: Merge incoming socket messages into local state ==========
  useEffect(() => {
    const unsub = useInboxStore.subscribe(
      (state) => state.messages[chatId],
      (storeMessages) => {
        if (!storeMessages || storeMessages.length === 0) return;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newFromSocket = storeMessages.filter(
            (m) => !existingIds.has(m.id)
          );
          if (newFromSocket.length === 0) return prev;
          const normalized = normalizeMessages(newFromSocket);
          return [...normalized, ...prev];
        });
      }
    );
    return unsub;
  }, [chatId, normalizeMessages]);

  // ========== Imperative helpers for ChatScreen ==========

  const addOptimisticMessage = useCallback(
    (msg: Message) => {
      setMessages((prev) => [msg, ...prev]);
    },
    []
  );

  const replaceMessage = useCallback(
    (tempId: string, realMsg: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...realMsg, isOutgoing: true } : m))
      );
      const store = useInboxStore.getState();
      store.removeMessage(chatId, tempId);  // remove temp entry first
      store.addMessage(chatId, realMsg);     // then add the real one
    },
    [chatId]
  );

  const removeMessage = useCallback(
    (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      useInboxStore.getState().removeMessage(chatId, messageId);
    },
    [chatId]
  );

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? ({ ...m, ...updates } as Message) : m))
      );
      useInboxStore.getState().updateMessage(chatId, messageId, updates);
    },
    [chatId]
  );

  return {
    messages,
    setMessages,
    loadingMessages,
    loadingMore,
    hasMore: nextCursor !== null,
    loadMore,
    addOptimisticMessage,
    replaceMessage,
    removeMessage,
    updateMessage,
  };
}
