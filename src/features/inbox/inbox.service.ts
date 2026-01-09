/**
 * Inbox Service
 * 
 * ARCHITECTURE: Domain service for chat/messaging operations.
 * 
 * Rules:
 * - This file is the ONLY place that knows how to fetch chats/messages
 * - Screens import hooks, hooks import this service
 * - All methods return typed data
 * - No UI logic here
 * 
 * Backend endpoints:
 * - GET  /api/companies/:companyId/chats
 * - GET  /api/companies/:companyId/chats/:chatId/messages
 * - POST /api/companies/:companyId/chats/:chatId/messages
 * - POST /api/companies/:companyId/chats/:chatId/read
 */

import { get, getFullResponse, post } from '@/shared/services/api';
import { 
  Chat, 
  Message, 
  ChatsResponse,
  MessagesResponse,
  SendMessagePayload,
  ChatFilters,
} from '@/shared/types/inbox';

// ============================================================================
// Types
// ============================================================================

export interface GetChatsParams {
  companyId: string;
  locationId?: string;
  type?: string;
  search?: string;
}

export interface GetMessagesParams {
  companyId: string;
  chatId: string;
  limit?: number;
  cursor?: string;
}

export interface MessagesResult {
  messages: Message[];
  nextCursor: string | null;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get all chats for a company
 */
export async function getChats(params: GetChatsParams): Promise<Chat[]> {
  const { companyId, ...filters } = params;
  
  // Build query params
  const queryParams: Record<string, string | undefined> = {};
  if (filters.locationId) queryParams.locationId = filters.locationId;
  if (filters.type) queryParams.type = filters.type;
  if (filters.search) queryParams.search = filters.search;
  
  return get<Chat[]>(`/companies/${companyId}/chats`, queryParams);
}

/**
 * Get messages for a specific chat
 */
export async function getMessages(params: GetMessagesParams): Promise<MessagesResult> {
  const { companyId, chatId, limit = 50, cursor } = params;
  
  const queryParams: Record<string, string | number | undefined> = {};
  if (limit) queryParams.limit = limit;
  if (cursor) queryParams.cursor = cursor;
  
  const response = await getFullResponse<MessagesResponse>(
    `/companies/${companyId}/chats/${chatId}/messages`,
    queryParams
  );
  
  return {
    messages: response.data,
    nextCursor: response.nextCursor,
  };
}

/**
 * Send a message to a chat
 */
export async function sendMessage(
  companyId: string, 
  chatId: string, 
  payload: SendMessagePayload
): Promise<Message> {
  return post<Message>(`/companies/${companyId}/chats/${chatId}/messages`, payload);
}

/**
 * Mark a chat as read
 */
export async function markChatAsRead(companyId: string, chatId: string): Promise<Chat> {
  return post<Chat>(`/companies/${companyId}/chats/${chatId}/read`);
}

// ============================================================================
// Export as namespace
// ============================================================================

const inboxService = {
  getChats,
  getMessages,
  sendMessage,
  markChatAsRead,
};

export default inboxService;

