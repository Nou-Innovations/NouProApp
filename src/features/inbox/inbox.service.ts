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
 * Backend endpoints (Business mode):
 * - GET  /api/companies/:companyId/chats
 * - GET  /api/companies/:companyId/chats/:chatId/messages
 * - POST /api/companies/:companyId/chats/:chatId/messages
 * - POST /api/companies/:companyId/chats/:chatId/read
 * 
 * Backend endpoints (Personal mode):
 * - GET  /api/users/:userId/chats
 * - GET  /api/users/:userId/chats/:chatId/messages
 * - POST /api/users/:userId/chats/:chatId/messages
 * - POST /api/users/:userId/chats/:chatId/read
 */

import { get, getFullResponse, post, del } from '@/shared/services/api';
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

export interface GetUserChatsParams {
  userId: string;
  type?: string;
  search?: string;
}

export interface GetMessagesParams {
  companyId: string;
  chatId: string;
  limit?: number;
  cursor?: string;
}

export interface GetUserMessagesParams {
  userId: string;
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
// User Chat Methods (Personal Mode)
// ============================================================================

/**
 * Get all chats for a user (personal mode)
 */
export async function getUserChats(params: GetUserChatsParams): Promise<Chat[]> {
  const { userId, ...filters } = params;
  
  // Build query params
  const queryParams: Record<string, string | undefined> = {};
  if (filters.type) queryParams.type = filters.type;
  if (filters.search) queryParams.search = filters.search;
  
  return get<Chat[]>(`/users/${userId}/chats`, queryParams);
}

/**
 * Get messages for a specific user chat (personal mode)
 */
export async function getUserMessages(params: GetUserMessagesParams): Promise<MessagesResult> {
  const { userId, chatId, limit = 50, cursor } = params;
  
  const queryParams: Record<string, string | number | undefined> = {};
  if (limit) queryParams.limit = limit;
  if (cursor) queryParams.cursor = cursor;
  
  const response = await getFullResponse<MessagesResponse>(
    `/users/${userId}/chats/${chatId}/messages`,
    queryParams
  );
  
  return {
    messages: response.data,
    nextCursor: response.nextCursor,
  };
}

/**
 * Send a message to a user chat (personal mode)
 */
export async function sendUserMessage(
  userId: string, 
  chatId: string, 
  payload: SendMessagePayload
): Promise<Message> {
  return post<Message>(`/users/${userId}/chats/${chatId}/messages`, payload);
}

/**
 * Mark a user chat as read (personal mode)
 */
export async function markUserChatAsRead(userId: string, chatId: string): Promise<Chat> {
  return post<Chat>(`/users/${userId}/chats/${chatId}/read`);
}

// ============================================================================
// Delete Methods
// ============================================================================

/**
 * Delete a message (business mode)
 */
export async function deleteMessage(
  companyId: string,
  chatId: string,
  messageId: string
): Promise<Message> {
  return del<Message>(`/companies/${companyId}/chats/${chatId}/messages/${messageId}`);
}

/**
 * Delete a message (personal mode)
 */
export async function deleteUserMessage(
  userId: string,
  chatId: string,
  messageId: string
): Promise<Message> {
  return del<Message>(`/users/${userId}/chats/${chatId}/messages/${messageId}`);
}

// ============================================================================
// Export as namespace
// ============================================================================

const inboxService = {
  // Business mode
  getChats,
  getMessages,
  sendMessage,
  markChatAsRead,
  deleteMessage,
  // Personal mode
  getUserChats,
  getUserMessages,
  sendUserMessage,
  deleteUserMessage,
  markUserChatAsRead,
};

export default inboxService;

