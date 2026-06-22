/**
 * Inbox/Chat Types
 * 
 * Types for the chat/messaging API and components.
 * These match the backend response shapes.
 */

// ============================================================================
// Chat/Channel Types
// ============================================================================

export type ChatType = 'client' | 'supplier' | 'internal' | 'direct' | 'group';

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
  companyId: string | null;
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
  forwardedFrom?: { chatId: string; senderName: string };
}

export interface TextMessage extends BaseMessage {
  type: 'text';
  text: string;
  editedAt?: string;
  mentions?: string[];
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
  width?: number;
  height?: number;
  replyingTo?: ReplyContext;
}

export interface VoiceMessage extends BaseMessage {
  type: 'voice';
  audioUrl?: string;
  durationSeconds?: number;
  replyingTo?: ReplyContext;
}

export interface PdfMessage extends BaseMessage {
  type: 'pdf';
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  replyingTo?: ReplyContext;
}

/** Lightweight line item carried on invoice/estimate chat cards (subset of InvoiceItem). */
export interface ChatLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Rich detail block shown on invoice/estimate bubbles. All optional so old messages
 * (which only carry the id) still render via a minimal fallback card.
 */
export interface InvoiceCardDetails {
  number?: string;
  currency?: string;
  itemCount?: number;
  items?: ChatLineItem[];
  subtotal?: number;
  total?: number;
  status?: string;
}

export interface InvoiceMessage extends BaseMessage {
  type: 'invoice';
  invoiceId: string;
  details?: InvoiceCardDetails;
  replyingTo?: ReplyContext;
}

export interface EstimateMessage extends BaseMessage {
  type: 'estimate';
  estimateId: string;
  details?: InvoiceCardDetails;
  replyingTo?: ReplyContext;
}

export interface EventMessage extends BaseMessage {
  type: 'event';
  event: string;
}

export interface DeletedMessage extends BaseMessage {
  type: 'deleted';
}

// ============================================================================
// Order Event Message Types (New Order Event Bubble)
// ============================================================================

export type OrderEventStatus = 
  | 'NEW' 
  | 'ONGOING' 
  | 'PENDING' 
  | 'DONE' 
  | 'IN_REVIEW' 
  | 'CANCELED'
  | 'ACCEPTED'
  | 'REJECTED';

export interface OrderEventBusiness {
  id: string;
  name: string;
  logo?: string;
  location?: string;
}

export interface OrderEventItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
}

export interface OrderEventDelivery {
  type: 'pickup' | 'delivery';
  expectedDate?: string;
  address?: string;
}

export interface OrderEventPayload {
  orderId: string;
  orderRef: string;
  buyer: OrderEventBusiness;
  seller: OrderEventBusiness;
  status: OrderEventStatus;
  paymentStatus: string; // UPPERCASE PaymentStatus enum values (UNPAID, PAID, PENDING_CONFIRMATION, etc.)
  itemsPreview: OrderEventItem[];
  totalItemsCount: number;
  subtotal: number;
  vatAmount: number;
  vatPercent: number;
  deliveryFee: number;
  totalAmount: number;
  currency: string;
  delivery: OrderEventDelivery;
  createdAt: string;
  schemaVersion: string;
}

export interface OrderEventMessage extends BaseMessage {
  type: 'order_event';
  isSystem: boolean;
  payload: OrderEventPayload;
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

export interface ProfileMessage extends BaseMessage {
  type: 'profile';
  profileId: string;
  profileName: string;
  profileAvatar?: string;
  profileType: 'user' | 'business';
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
  | ContactMessage
  | OrderEventMessage
  | ProfileMessage;

// ============================================================================
// API Response Types
// ============================================================================

export interface ChatsResponse {
  success: boolean;
  data: Chat[];
  nextCursor: string | null;
  message: string;
}

export interface MessagesResponse {
  success: boolean;
  data: Message[];
  nextCursor: string | null;
  message: string;
}

export interface SendMessagePayload {
  type: 'text' | 'pdf' | 'image' | 'voice' | 'location' | 'contact' | 'profile';
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

