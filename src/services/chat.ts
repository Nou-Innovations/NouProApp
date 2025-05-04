import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { Message, Channel } from '../types/store';

class ChatService {
  private socket: Socket | null = null;
  private store = useStore;

  connect(userId: string) {
    this.socket = io('YOUR_SOCKET_SERVER_URL', {
      auth: {
        userId,
      },
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('message', (message: Message) => {
      const store = this.store.getState();
      store.addMessage(message.channelId, message);
    });

    this.socket.on('channel_update', (channel: Channel) => {
      const store = this.store.getState();
      const channels = store.channels.map((c) =>
        c.id === channel.id ? channel : c
      );
      store.setChannels(channels);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  sendMessage(channelId: string, content: string, type: Message['type'] = 'text', attachmentUrl?: string) {
    if (!this.socket) return;

    const message: Omit<Message, 'id' | 'timestamp'> = {
      content,
      type,
      senderId: this.store.getState().currentUser?.id || '',
      channelId,
      attachmentUrl,
    };

    this.socket.emit('send_message', message);
  }

  joinChannel(channelId: string) {
    if (!this.socket) return;
    this.socket.emit('join_channel', channelId);
    this.store.getState().setActiveChannel(channelId);
  }

  leaveChannel(channelId: string) {
    if (!this.socket) return;
    this.socket.emit('leave_channel', channelId);
    this.store.getState().setActiveChannel(null);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const chatService = new ChatService(); 