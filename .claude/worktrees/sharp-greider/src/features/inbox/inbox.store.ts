/**
 * Inbox Store (Feature-scoped)
 *
 * Single source of truth for chat/inbox state:
 * - chats list (HTTP API + real-time updates)
 * - messages by chat
 * - active chat id (UI selection)
 * - loading/error states for store-level operations
 *
 * Contract:
 * - Store is state + pure state transitions (no network, no socket instantiation)
 * - IO lives in services (e.g., inbox.service.ts for HTTP, chat.ts for Socket)
 * - Hooks become thin orchestrators that read from store and call services
 *
 * This store replaces:
 * - Chat-related state from useAppStore (god store)
 * - Hook-local useState for chats/messages
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Chat, Message } from '@/shared/types/inbox';

export interface InboxState {
  // Chat list (source of truth for inbox UI)
  chats: Chat[];
  
  // Messages by chatId (source of truth for chat screen)
  messages: Record<string, Message[]>;
  
  // Currently selected chat
  activeChatId: string | null;
  
  // Loading/error for store-level fetches
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
}

export interface InboxActions {
  // Chat list actions
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  markChatAsRead: (chatId: string) => void;
  
  // Message actions
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  appendMessages: (chatId: string, messages: Message[]) => void;
  
  // Active chat selection
  setActiveChat: (chatId: string | null) => void;
  
  // Loading/error state
  setLoading: (isLoading: boolean) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset
  resetInbox: () => void;
}

const initialState: InboxState = {
  chats: [],
  messages: {},
  activeChatId: null,
  isLoading: true,
  isRefreshing: false,
  error: null,
};

export const useInboxStore = create<InboxState & InboxActions>()(subscribeWithSelector((set) => ({
  ...initialState,

  // ========== Chat List Actions ==========
  
  setChats: (chats) => set({ chats }),

  addChat: (chat) =>
    set((state) => {
      // Deduplicate: skip if chat already exists
      if (state.chats.some((c) => c.id === chat.id)) return state;
      return { chats: [chat, ...state.chats] };
    }),

  updateChat: (chatId, updates) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, ...updates } : c
      ),
    })),

  markChatAsRead: (chatId) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  // ========== Message Actions ==========
  
  setMessages: (chatId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: messages,
      },
    })),

  addMessage: (chatId, message) =>
    set((state) => {
      const existing = state.messages[chatId] ?? [];
      // Deduplicate: skip if a message with the same ID already exists
      if (existing.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [chatId]: [message, ...existing],
        },
      };
    }),

  removeMessage: (chatId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] ?? []).filter((m) => m.id !== messageId),
      },
    })),

  updateMessage: (chatId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...updates } as Message : m
        ),
      },
    })),

  appendMessages: (chatId, messages) =>
    set((state) => {
      const existing = state.messages[chatId] ?? [];
      const existingIds = new Set(existing.map(m => m.id));
      const newOnly = messages.filter(m => !existingIds.has(m.id));
      return {
        messages: {
          ...state.messages,
          [chatId]: [...existing, ...newOnly],
        },
      };
    }),

  // ========== Active Chat ==========
  
  setActiveChat: (chatId) => set({ activeChatId: chatId }),

  // ========== Loading/Error State ==========
  
  setLoading: (isLoading) => set({ isLoading }),
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  setError: (error) => set({ error }),

  // ========== Reset ==========
  
  resetInbox: () => set(initialState),
})));

// ========== Selectors ==========

/**
 * Get chat by ID
 */
export const selectChatById = (chatId: string) => (state: InboxState) =>
  state.chats.find((c) => c.id === chatId);

/**
 * Get messages for a chat
 */
export const selectMessagesForChat = (chatId: string) => (state: InboxState) =>
  state.messages[chatId] ?? [];

/**
 * Get unread chats count
 */
export const selectUnreadChatsCount = (state: InboxState) =>
  state.chats.filter((c) => c.unreadCount > 0).length;

/**
 * Get total unread messages count
 */
export const selectTotalUnreadCount = (state: InboxState) =>
  state.chats.reduce((sum, c) => sum + c.unreadCount, 0);
