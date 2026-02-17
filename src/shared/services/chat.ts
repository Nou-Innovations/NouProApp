/**
 * Chat Service
 * 
 * Handles real-time messaging via Socket.IO.
 * 
 * ARCHITECTURE: This service is DECOUPLED from auth state.
 * - Callers must provide identity explicitly (userId, token, senderId)
 * - This enables testing, multi-session, and impersonation scenarios
 * - Data operations use useInboxStore for message/chat state (feature-scoped)
 * 
 * LAYERING: This is infrastructure-level socket management.
 * - joinChat/leaveChat only emit socket events
 * - UI state (active chat) is managed by the feature layer (hooks/screens)
 * 
 * TYPE CONVERSION:
 * - Socket wire format uses simpler message structure
 * - This service converts to/from inbox types (Chat, Message) when updating store
 */
import { io, Socket } from 'socket.io-client';
import { useInboxStore } from '@/features/inbox/inbox.store';
import type { Message, Chat, PreviewMessageType } from '@/shared/types/inbox';
import { API_CONFIG } from '@/shared/config/api';

// Socket URL from environment or derive from API URL
const getSocketUrl = (): string => {
  const envSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (envSocketUrl) {
    return envSocketUrl;
  }
  
  // Derive from API URL by replacing /api with empty string
  // e.g., http://192.168.1.100:3000/api -> http://192.168.1.100:3000
  const apiUrl = API_CONFIG.baseUrl;
  return apiUrl.replace(/\/api\/?$/, '');
};

/** Connection options for ChatService */
export interface ChatConnectionOptions {
  userId: string;
  token?: string;
}

/** Message payload for sending messages via socket */
/**
 * Wire format for incoming messages from socket.
 * After P0-3, the backend emits the full mapMessageToApi shape,
 * so this interface mirrors those fields.
 */
interface SocketIncomingMessage {
  id: string;
  chatId: string;
  type: string;
  timestamp: string;
  status?: string;
  isOutgoing?: boolean;
  isRead?: boolean;
  // Sender — full object from mapMessageToApi, or flat fields as fallback
  sender?: { id: string; name: string; avatar?: string; role?: string };
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  senderRole?: string;
  // Text
  text?: string;
  content?: string;
  // Image
  imageUrl?: string;
  // PDF
  fileUrl?: string;
  fileName?: string;
  // Location
  latitude?: number;
  longitude?: number;
  address?: string;
  locationName?: string;
  // Voice
  audioUrl?: string;
  durationSeconds?: number;
  // Profile
  profileId?: string;
  profileName?: string;
  profileAvatar?: string;
  profileType?: string;
  // Invoice / Estimate
  invoiceId?: string;
  estimateId?: string;
  // Event
  event?: string;
  // Order event
  isSystem?: boolean;
  payload?: any;
  // Reply context
  replyingTo?: { senderName: string; messageSnippet: string; messageId: string };
  // Forwarded from context
  forwardedFrom?: { chatId: string; senderName: string };
  // Mentions
  mentions?: string[];
  // Edit timestamp
  editedAt?: string;
  // Attachment (legacy)
  attachmentUrl?: string;
}

/** Wire format for chat updates from socket */
interface SocketChatUpdate {
  id: string;
  unreadCount?: number;
  lastMessage?: {
    id: string;
    content: string;
    type: string;
    senderId: string;
    senderName: string;
    timestamp: string;
  } | null;
}

class ChatService {
  private socket: Socket | null = null;

  // Track active chat rooms so we can re-join on reconnect
  private activeRooms: Set<string> = new Set();

  // Current authenticated user ID (set during connect)
  private userId: string | null = null;

  // Use useInboxStore for message/chat data operations (feature-scoped)
  private inboxStore = useInboxStore;

  // Typing event listeners (external subscribers from hooks)
  private typingListeners: Set<(data: { chatId: string; userId: string; userName: string }) => void> = new Set();
  private typingStopListeners: Set<(data: { chatId: string; userId: string }) => void> = new Set();

  /**
   * Connect to chat server
   * @param options - Connection options including userId and optional token
   */
  connect(options: ChatConnectionOptions) {
    // Guard against double-connect: disconnect existing socket first
    // Save active rooms before disconnect so we can re-join on the new socket
    const roomsToRestore = new Set(this.activeRooms);
    if (this.socket) {
      this.disconnect();
    }
    this.activeRooms = roomsToRestore;

    const { userId, token } = options;
    this.userId = userId;
    const socketUrl = getSocketUrl();
    
    if (__DEV__) {
      console.log(`[ChatService] Connecting to socket: ${socketUrl}`);
    }
    
    this.socket = io(socketUrl, {
      auth: {
        userId,
        token,
      },
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    this.setupListeners();
  }

  /**
   * Convert socket wire message to inbox Message type.
   * The backend now emits the full mapMessageToApi shape, so we pass through
   * all type-specific fields directly.
   */
  private convertToInboxMessage(socketMsg: SocketIncomingMessage): Message {
    const baseMessage = {
      id: socketMsg.id,
      chatId: socketMsg.chatId,
      isOutgoing: false, // Incoming socket messages are from other participants
      sender: {
        id: socketMsg.sender?.id || socketMsg.senderId || 'unknown',
        name: socketMsg.sender?.name || socketMsg.senderName || 'Unknown',
        avatar: socketMsg.sender?.avatar || socketMsg.senderAvatar || '',
        role: socketMsg.sender?.role || socketMsg.senderRole || 'personal',
      },
      timestamp: socketMsg.timestamp,
      status: (socketMsg.status || 'delivered') as 'sent' | 'delivered' | 'seen' | 'failed' | 'sending',
    };

    // Pass through all fields from the socket payload.
    // The discriminated union is satisfied by type + type-specific fields.
    return {
      ...baseMessage,
      type: socketMsg.type || 'text',
      // Text
      ...(socketMsg.text != null && { text: socketMsg.text }),
      ...(socketMsg.content != null && !socketMsg.text && { text: socketMsg.content }),
      // Image
      ...(socketMsg.imageUrl && { imageUrl: socketMsg.imageUrl }),
      // PDF
      ...(socketMsg.fileUrl && { fileUrl: socketMsg.fileUrl }),
      ...(socketMsg.fileName && { fileName: socketMsg.fileName }),
      // Location
      ...(socketMsg.latitude != null && { latitude: socketMsg.latitude }),
      ...(socketMsg.longitude != null && { longitude: socketMsg.longitude }),
      ...(socketMsg.address && { address: socketMsg.address }),
      ...(socketMsg.locationName && { locationName: socketMsg.locationName }),
      // Voice
      ...(socketMsg.audioUrl && { audioUrl: socketMsg.audioUrl }),
      ...(socketMsg.durationSeconds != null && { durationSeconds: socketMsg.durationSeconds }),
      // Profile
      ...(socketMsg.profileId && { profileId: socketMsg.profileId }),
      ...(socketMsg.profileName && { profileName: socketMsg.profileName }),
      ...(socketMsg.profileAvatar && { profileAvatar: socketMsg.profileAvatar }),
      ...(socketMsg.profileType && { profileType: socketMsg.profileType }),
      // Invoice / Estimate
      ...(socketMsg.invoiceId && { invoiceId: socketMsg.invoiceId }),
      ...(socketMsg.estimateId && { estimateId: socketMsg.estimateId }),
      // Event
      ...(socketMsg.event && { event: socketMsg.event }),
      // Order event
      ...(socketMsg.isSystem != null && { isSystem: socketMsg.isSystem }),
      ...(socketMsg.payload && { payload: socketMsg.payload }),
      // Reply context
      ...(socketMsg.replyingTo && { replyingTo: socketMsg.replyingTo }),
      // Forwarded from
      ...(socketMsg.forwardedFrom && { forwardedFrom: socketMsg.forwardedFrom }),
      // Mentions
      ...(socketMsg.mentions && { mentions: socketMsg.mentions }),
      // Edit timestamp
      ...(socketMsg.editedAt && { editedAt: socketMsg.editedAt }),
    } as Message;
  }

  private setupListeners() {
    if (!this.socket) return;

    // Prevent duplicate listeners if connect() is called multiple times
    this.socket.removeAllListeners();

    // Handle incoming messages
    this.socket.on('message', (socketMsg: SocketIncomingMessage) => {
      const store = this.inboxStore.getState();
      const message = this.convertToInboxMessage(socketMsg);
      store.addMessage(socketMsg.chatId, message);
      
      if (__DEV__) {
        console.log('[ChatService] Message received:', socketMsg.chatId);
      }
    });

    // Handle chat updates (unread count, last message, etc.)
    this.socket.on('chat_update', (update: SocketChatUpdate) => {
      const store = this.inboxStore.getState();
      const updates: Partial<Chat> = {};

      if (update.unreadCount != null) {
        updates.unreadCount = update.unreadCount;
      }

      if (update.lastMessage) {
        updates.lastMessage = {
          id: update.lastMessage.id,
          content: update.lastMessage.content,
          type: (update.lastMessage.type || 'text') as PreviewMessageType,
          senderId: update.lastMessage.senderId,
          senderName: update.lastMessage.senderName,
          timestamp: update.lastMessage.timestamp,
          isRead: false,
          isOutgoing: update.lastMessage.senderId === this.userId,
          status: 'delivered',
        };
        updates.updatedAt = update.lastMessage.timestamp;
      } else if (update.lastMessage === null) {
        // All messages deleted -- clear the stale lastMessage in the store
        updates.lastMessage = null;
      }

      store.updateChat(update.id, updates);

      if (__DEV__) {
        console.log('[ChatService] Chat updated:', update.id);
      }
    });

    // Handle new chat created by another participant
    this.socket.on('chat_created', (chat: any) => {
      const store = this.inboxStore.getState();
      const mapped: Chat = {
        id: chat.id,
        companyId: chat.companyId || null,
        locationId: chat.locationId || null,
        type: chat.type || 'direct',
        name: chat.name || 'New Chat',
        participants: chat.participants || [],
        lastMessage: chat.lastMessage || null,
        unreadCount: chat.unreadCount || 0,
        avatar: chat.avatar || '',
        createdAt: chat.createdAt || new Date().toISOString(),
        updatedAt: chat.updatedAt || new Date().toISOString(),
      };
      store.addChat(mapped);
      if (__DEV__) {
        console.log('[ChatService] Chat created:', chat.id);
      }
    });

    // Handle message deleted by another participant
    this.socket.on('message_deleted', (payload: { chatId: string; messageId: string }) => {
      const store = this.inboxStore.getState();
      store.removeMessage(payload.chatId, payload.messageId);
      if (__DEV__) {
        console.log('[ChatService] Message deleted:', payload.messageId, 'in chat:', payload.chatId);
      }
    });

    // Handle typing indicators from other participants
    this.socket.on('typing', (data: { chatId: string; userId: string; userName: string }) => {
      this.typingListeners.forEach(fn => fn(data));
    });

    this.socket.on('typing_stop', (data: { chatId: string; userId: string }) => {
      this.typingStopListeners.forEach(fn => fn(data));
    });

    // Handle message edited by another participant
    this.socket.on('message_edited', (payload: { chatId: string; messageId: string; content: string; editedAt: string }) => {
      const store = this.inboxStore.getState();
      store.updateMessage(payload.chatId, payload.messageId, {
        text: payload.content,
        editedAt: payload.editedAt,
      } as any);
      if (__DEV__) {
        console.log('[ChatService] Message edited:', payload.messageId, 'in chat:', payload.chatId);
      }
    });

    // Handle read receipt -- update message statuses and/or unread count
    this.socket.on('chat_read', (payload: { chatId: string; userId: string }) => {
      const store = this.inboxStore.getState();

      // If the current user is the one who marked as read, update the chat's unreadCount
      if (payload.userId === this.userId) {
        store.markChatAsRead(payload.chatId);
      }

      // Update outgoing message statuses to 'seen' (another participant read our messages)
      const chatMessages = store.messages[payload.chatId] ?? [];
      let hasChanges = false;
      const updated = chatMessages.map(msg => {
        if (msg.isOutgoing && msg.status !== 'seen') {
          hasChanges = true;
          return { ...msg, status: 'seen' as const };
        }
        return msg;
      });
      if (hasChanges) {
        store.setMessages(payload.chatId, updated);
      }
      if (__DEV__) {
        console.log('[ChatService] Chat read by:', payload.userId, 'in chat:', payload.chatId);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[ChatService] Socket connection error:', error);
    });
    
    this.socket.on('connect', () => {
      if (__DEV__) {
        console.log('[ChatService] Socket connected');
      }
      // Re-join all active chat rooms after reconnection
      if (this.activeRooms.size > 0) {
        this.activeRooms.forEach((chatId) => {
          this.socket?.emit('join_chat', chatId);
          if (__DEV__) {
            console.log('[ChatService] Re-joined room after reconnect:', chatId);
          }
        });
      }
    });
    
    this.socket.on('disconnect', (reason) => {
      if (__DEV__) {
        console.log('[ChatService] Socket disconnected:', reason);
      }
    });
  }

  /**
   * Join a chat room on the socket server
   * 
   * ARCHITECTURE: This only emits the join event.
   * UI state (active chat) is managed by the feature layer (hooks/screens).
   * 
   * @param chatId - Chat to join
   */
  joinChat(chatId: string) {
    this.activeRooms.add(chatId);
    if (!this.socket) return;
    this.socket.emit('join_chat', chatId);
  }

  /**
   * Leave a chat room on the socket server
   * 
   * ARCHITECTURE: This only emits the leave event.
   * UI state (active chat) is managed by the feature layer (hooks/screens).
   * 
   * @param chatId - Chat to leave
   */
  leaveChat(chatId: string) {
    this.activeRooms.delete(chatId);
    if (!this.socket) return;
    this.socket.emit('leave_chat', chatId);
  }

  // Legacy aliases for backward compatibility
  joinChannel = this.joinChat;
  leaveChannel = this.leaveChat;

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.activeRooms.clear();
  }
  
  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ========== Typing Indicators ==========

  emitTypingStart(chatId: string) {
    if (!this.socket) return;
    this.socket.emit('typing_start', { chatId });
  }

  emitTypingStop(chatId: string) {
    if (!this.socket) return;
    this.socket.emit('typing_stop', { chatId });
  }

  onTyping(fn: (data: { chatId: string; userId: string; userName: string }) => void) {
    this.typingListeners.add(fn);
  }

  offTyping(fn: (data: { chatId: string; userId: string; userName: string }) => void) {
    this.typingListeners.delete(fn);
  }

  onTypingStop(fn: (data: { chatId: string; userId: string }) => void) {
    this.typingStopListeners.add(fn);
  }

  offTypingStop(fn: (data: { chatId: string; userId: string }) => void) {
    this.typingStopListeners.delete(fn);
  }

  /**
   * Update auth credentials and reconnect
   * Call this after login/token refresh to ensure socket has fresh credentials
   *
   * @param options - New connection options with fresh userId/token
   */
  updateAuth(options: ChatConnectionOptions): void {
    if (!this.socket) {
      // Not connected, just store for next connect
      if (__DEV__) {
        console.log('[ChatService] updateAuth called but socket not connected');
      }
      return;
    }
    
    const { userId, token } = options;
    this.userId = userId;
    this.socket.auth = { userId, token };
    
    // Reconnect with new credentials
    this.socket.disconnect().connect();
    
    if (__DEV__) {
      console.log('[ChatService] Auth updated, reconnecting...');
    }
  }
}

export const chatService = new ChatService();
