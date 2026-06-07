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
import apiClient from '@/shared/services/api';
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
  limit?: number;
  cursor?: string;
}

export interface GetUserChatsParams {
  userId: string;
  type?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface ChatsResult {
  chats: Chat[];
  nextCursor: string | null;
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

export interface CreateChatParams {
  companyId: string;
  type?: 'client' | 'supplier' | 'internal' | 'direct';
  name: string;
  participants?: string[];
  partnerId?: string;
  partnerType?: 'business' | 'user';
  locationId?: string;
  avatar?: string;
}

export interface CompanyMember {
  id: string;
  businessId: string;
  userId: string;
  role: string;
  status: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
}

export interface ContactSearchResult {
  id: string;
  name: string;
  avatar: string | null;
  email: string | null;
  type: 'user' | 'business';
  is_connected: boolean;
  role: string | null;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get members of a company (for new chat contact list)
 */
export async function getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  return get<CompanyMember[]>(`/companies/${companyId}/members`);
}

/**
 * Search all users and businesses with connection status
 * Returns contacts sorted alphabetically with is_connected flag
 */
export async function searchContacts(userId: string, search?: string): Promise<ContactSearchResult[]> {
  const params: Record<string, string | undefined> = {};
  if (search) params.search = search;
  return get<ContactSearchResult[]>(`/users/${userId}/contacts`, params);
}

/**
 * Create a new chat
 */
export async function createChat(params: CreateChatParams): Promise<Chat> {
  const { companyId, ...body } = params;
  return post<Chat>(`/companies/${companyId}/chats`, body);
}

/**
 * Get chats for a company (supports cursor-based pagination)
 */
export async function getChats(params: GetChatsParams): Promise<ChatsResult> {
  const { companyId, ...filters } = params;
  
  // Build query params
  const queryParams: Record<string, string | number | undefined> = {};
  if (filters.locationId) queryParams.locationId = filters.locationId;
  if (filters.type) queryParams.type = filters.type;
  if (filters.search) queryParams.search = filters.search;
  if (filters.limit) queryParams.limit = filters.limit;
  if (filters.cursor) queryParams.cursor = filters.cursor;
  
  const response = await getFullResponse<ChatsResponse>(
    `/companies/${companyId}/chats`,
    queryParams
  );
  
  return {
    chats: response.data,
    nextCursor: response.nextCursor ?? null,
  };
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
 * Create a new user chat (personal mode)
 */
export async function createUserChat(params: {
  userId: string;
  type?: string;
  name: string;
  participants?: string[];
  avatar?: string;
}): Promise<Chat> {
  const { userId, ...body } = params;
  return post<Chat>(`/users/${userId}/chats`, body);
}

/**
 * Get chats for a user (personal mode, supports cursor-based pagination)
 */
export async function getUserChats(params: GetUserChatsParams): Promise<ChatsResult> {
  const { userId, ...filters } = params;
  
  // Build query params
  const queryParams: Record<string, string | number | undefined> = {};
  if (filters.type) queryParams.type = filters.type;
  if (filters.search) queryParams.search = filters.search;
  if (filters.limit) queryParams.limit = filters.limit;
  if (filters.cursor) queryParams.cursor = filters.cursor;
  
  const response = await getFullResponse<ChatsResponse>(
    `/users/${userId}/chats`,
    queryParams
  );
  
  return {
    chats: response.data,
    nextCursor: response.nextCursor ?? null,
  };
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
// Group Management
// ============================================================================

/**
 * Leave a group chat (business mode)
 */
export async function leaveChat(companyId: string, chatId: string): Promise<void> {
  return post(`/companies/${companyId}/chats/${chatId}/leave`);
}

/**
 * Leave a group chat (personal mode)
 */
export async function leaveUserChat(userId: string, chatId: string): Promise<void> {
  return post(`/users/${userId}/chats/${chatId}/leave`);
}

/**
 * Remove a participant from a group chat (business mode)
 */
export async function removeChatParticipant(companyId: string, chatId: string, userId: string): Promise<void> {
  return post(`/companies/${companyId}/chats/${chatId}/remove-participant`, { userId });
}

/**
 * Remove a participant from a group chat (personal mode)
 */
export async function removeUserChatParticipant(ownUserId: string, chatId: string, userId: string): Promise<void> {
  return post(`/users/${ownUserId}/chats/${chatId}/remove-participant`, { userId });
}

// ============================================================================
// Message Editing
// ============================================================================

/**
 * Edit a message (business mode)
 */
export async function editMessageApi(companyId: string, chatId: string, messageId: string, content: string): Promise<Message> {
  const response = await apiClient.patch(`/companies/${companyId}/chats/${chatId}/messages/${messageId}`, { content });
  return response.data.data;
}

/**
 * Edit a message (personal mode)
 */
export async function editUserMessageApi(userId: string, chatId: string, messageId: string, content: string): Promise<Message> {
  const response = await apiClient.patch(`/users/${userId}/chats/${chatId}/messages/${messageId}`, { content });
  return response.data.data;
}

// ============================================================================
// Message Forwarding
// ============================================================================

/**
 * Forward a message to another chat (business mode)
 */
export async function forwardMessage(companyId: string, chatId: string, messageId: string, targetChatId: string): Promise<Message> {
  return post(`/companies/${companyId}/chats/${chatId}/messages/${messageId}/forward`, { targetChatId });
}

/**
 * Forward a message to another chat (personal mode)
 */
export async function forwardUserMessage(userId: string, chatId: string, messageId: string, targetChatId: string): Promise<Message> {
  return post(`/users/${userId}/chats/${chatId}/messages/${messageId}/forward`, { targetChatId });
}

// ============================================================================
// File Upload
// ============================================================================

/**
 * Get MIME type from file extension
 */
function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Upload an attachment file to the server
 * @param fileUri - Local file URI (file:// or content://)
 * @param fileName - Original file name
 * @returns Public URL of the uploaded file
 */
export async function uploadAttachment(fileUri: string, fileName: string): Promise<string> {
  const formData = new FormData();
  
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: getMimeType(fileName),
  } as any);
  
  const response = await apiClient.post<{ success: boolean; data: { url: string } }>(
    '/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data.data.url;
}

// ============================================================================
// Export as namespace
// ============================================================================

const inboxService = {
  // Business mode
  createChat,
  getChats,
  getMessages,
  sendMessage,
  markChatAsRead,
  deleteMessage,
  getCompanyMembers,
  // Personal mode
  createUserChat,
  getUserChats,
  getUserMessages,
  sendUserMessage,
  deleteUserMessage,
  markUserChatAsRead,
  // Contacts search
  searchContacts,
  // Upload
  uploadAttachment,
};

export default inboxService;

