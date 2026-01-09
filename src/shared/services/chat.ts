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
import type { Message, Chat } from '@/shared/types/inbox';
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
export interface SocketSendMessagePayload {
  chatId: string;
  content: string;
  senderId: string;
  type?: 'text' | 'image' | 'voice' | 'pdf' | 'invoice' | 'location' | 'contact';
  attachmentUrl?: string;
}

/** Wire format for outgoing messages */
interface SocketOutgoingMessage {
  chatId: string;
  content: string;
  senderId: string;
  type: string;
  attachmentUrl?: string;
}

/** Wire format for incoming messages from socket */
interface SocketIncomingMessage {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  type: string;
  timestamp: string;
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
  };
}

class ChatService {
  private socket: Socket | null = null;
  
  // Use useInboxStore for message/chat data operations (feature-scoped)
  private inboxStore = useInboxStore;

  /**
   * Connect to chat server
   * @param options - Connection options including userId and optional token
   */
  connect(options: ChatConnectionOptions) {
    const { userId, token } = options;
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
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupListeners();
  }

  /**
   * Convert socket wire message to inbox Message type
   */
  private convertToInboxMessage(socketMsg: SocketIncomingMessage): Message {
    // Map socket type to inbox message type
    const typeMap: Record<string, Message['type']> = {
      'text': 'text',
      'image': 'image',
      'voice': 'voice',
      'pdf': 'pdf',
      'invoice': 'invoice',
      'location': 'location',
      'contact': 'contact',
      'order': 'order',
      'event': 'event',
      'deleted': 'deleted',
    };
    
    const messageType = typeMap[socketMsg.type] || 'text';
    
    // Build base message
    const baseMessage = {
      id: socketMsg.id,
      chatId: socketMsg.chatId,
      isOutgoing: false, // Incoming messages are not outgoing
      sender: {
        id: socketMsg.senderId,
        name: socketMsg.senderName,
        avatar: socketMsg.senderAvatar || '',
        role: socketMsg.senderRole || 'personal',
      },
      timestamp: socketMsg.timestamp,
      status: 'delivered' as const,
    };
    
    // Return typed message based on type
    if (messageType === 'text') {
      return { ...baseMessage, type: 'text', text: socketMsg.content } as Message;
    }
    
    // For other types, return as text with content
    // The UI can handle different types based on the type field
    return { ...baseMessage, type: messageType, text: socketMsg.content } as Message;
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
      store.updateChat(update.id, {
        unreadCount: update.unreadCount,
        // Note: lastMessage conversion would go here if needed
      });
      
      if (__DEV__) {
        console.log('[ChatService] Chat updated:', update.id);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[ChatService] Socket connection error:', error);
    });
    
    this.socket.on('connect', () => {
      if (__DEV__) {
        console.log('[ChatService] Socket connected');
      }
    });
    
    this.socket.on('disconnect', (reason) => {
      if (__DEV__) {
        console.log('[ChatService] Socket disconnected:', reason);
      }
    });
  }

  /**
   * Send a message to a chat
   * 
   * ARCHITECTURE: senderId is passed explicitly by caller, not derived from auth state.
   * This decouples the chat service from authentication concerns.
   * 
   * @param payload - Message payload with explicit senderId
   * @returns boolean - true if message was queued, false if not connected
   */
  sendMessage(payload: SocketSendMessagePayload): boolean {
    const { chatId, content, senderId, type = 'text', attachmentUrl } = payload;
    
    if (!this.socket) {
      console.warn('[ChatService] Cannot send message: socket not connected');
      return false;
    }

    if (!senderId) {
      console.warn('[ChatService] Cannot send message: senderId is required');
      return false;
    }

    const socketPayload: SocketOutgoingMessage = {
      chatId,
      content,
      senderId,
      type,
      attachmentUrl,
    };

    this.socket.emit('send_message', socketPayload);
    return true;
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
  }
  
  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
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
    this.socket.auth = { userId, token };
    
    // Reconnect with new credentials
    this.socket.disconnect().connect();
    
    if (__DEV__) {
      console.log('[ChatService] Auth updated, reconnecting...');
    }
  }
}

export const chatService = new ChatService();
