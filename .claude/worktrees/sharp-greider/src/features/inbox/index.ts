/**
 * Inbox Feature Module
 * 
 * Exports for screens, components, hooks, and services.
 */

// Screens
export * from './screens';

// Components
export * from './components';

// Hooks
export { useInbox } from './hooks/useInbox';
export { useChatMessages } from './hooks/useChatMessages';

// Store (feature-scoped chat/inbox state - single source of truth)
export { useInboxStore, selectChatById, selectMessagesForChat, selectUnreadChatsCount, selectTotalUnreadCount } from './inbox.store';
export type { InboxState, InboxActions } from './inbox.store';

// Service
export { default as inboxService, getChats, getMessages, sendMessage, markChatAsRead } from './inbox.service';

// Types are exported from @/shared/types/inbox

