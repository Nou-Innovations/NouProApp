/**
 * Inbox/Chat Types
 * 
 * Types for the chat/messaging API and components.
 * These match the backend response shapes.
 */

// ============================================================================
// Chat/Channel Types
// ============================================================================

export type ChatType = 'client' | 'supplier' | 'internal';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';

export type DeliveryStatusType = 
  | 'new_order_sent'
  | 'order_ongoing'
  | 'order_done'
  | 'order_under_review'
  | 'order_pending'
  | 'order_cancel'
  | 'new_order_received';

export type PreviewMessageType = 
  | 'text'
  | 'photo'
  | 'video'
  | 'voice_call'
  | 'missed_voice_call'
  | 'video_call'
  | 'missed_video_call'
  | 'invoice'
  | 'estimate'
  | 'pdf'
  | 'delivery'
  | 'location'
  | 'voice_note'
  | 'contact';

/** Chat/Channel in the inbox list */
export interface Chat {
  id: string;
  companyId: string;
  locationId: string | null;
  type: ChatType;
  name: string;
  avatar: string | null;
  participants: string[];
  lastMessage: ChatLastMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Last message preview shown in inbox list */
export interface ChatLastMessage {
  id: string;
  content: string;
  type: PreviewMessageType;
  senderId: string;
  senderName: string;
  timestamp: string;
  isRead: boolean;
  isOutgoing: boolean;
  status: MessageStatus;
  deliveryStatus?: DeliveryStatusType;
}

// ============================================================================
// Message Types (Discriminated Union)
// ============================================================================

export interface Sender {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface BaseMessage {
  id: string;
  chatId: string;
  isOutgoing: boolean;
  sender: Sender;
  timestamp: string;
  status?: MessageStatus;
}

export interface TextMessage extends BaseMessage {
  type: 'text';
  text: string;
  replyingTo?: ReplyContext;
}

export interface OrderMessage extends BaseMessage {
  type: 'order';
  orderId: string;
  itemCount: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  replyingTo?: ReplyContext;
}

export interface ImageMessage extends BaseMessage {
  type: 'image';
  imageUrl: string;
  replyingTo?: ReplyContext;
}

export interface VoiceMessage extends BaseMessage {
  type: 'voice';
  durationSeconds?: number;
  replyingTo?: ReplyContext;
}

export interface PdfMessage extends BaseMessage {
  type: 'pdf';
  fileName: string;
  fileUrl?: string;
  replyingTo?: ReplyContext;
}

export interface InvoiceMessage extends BaseMessage {
  type: 'invoice';
  invoiceId: string;
  replyingTo?: ReplyContext;
}

export interface EstimateMessage extends BaseMessage {
  type: 'estimate';
  estimateId: string;
  replyingTo?: ReplyContext;
}

export interface EventMessage extends BaseMessage {
  type: 'event';
  event: string;
}

export interface DeletedMessage extends BaseMessage {
  type: 'deleted';
}

export interface LocationMessage extends BaseMessage {
  type: 'location';
  locationName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  replyingTo?: ReplyContext;
}

export interface ContactMessage extends BaseMessage {
  type: 'contact';
  contactName: string;
  contactPhone: string;
  replyingTo?: ReplyContext;
}

export interface ReplyContext {
  senderName: string;
  messageSnippet: string;
  messageId: string;
}

/** Union type for all message types */
export type Message = 
  | TextMessage 
  | OrderMessage 
  | ImageMessage 
  | VoiceMessage 
  | PdfMessage 
  | InvoiceMessage 
  | EstimateMessage
  | EventMessage 
  | DeletedMessage
  | LocationMessage
  | ContactMessage;

// ============================================================================
// API Response Types
// ============================================================================

export interface ChatsResponse {
  success: boolean;
  data: Chat[];
  message: string;
}

export interface MessagesResponse {
  success: boolean;
  data: Message[];
  nextCursor: string | null;
  message: string;
}

export interface SendMessagePayload {
  type: 'text' | 'pdf' | 'image' | 'voice' | 'location' | 'contact';
  content: string;
  replyToId?: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageResponse {
  success: boolean;
  data: Message;
  message: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export type ChatFilter = 'all' | 'unread' | 'direct' | 'group';

export interface ChatFilters {
  filter?: ChatFilter;
  search?: string;
  locationId?: string;
}

