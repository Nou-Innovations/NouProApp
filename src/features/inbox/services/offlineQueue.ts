/**
 * Offline Message Queue
 *
 * AsyncStorage-backed queue for messages sent while offline.
 * Messages are queued with full payload and flushed when connectivity returns.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { sendMessage, sendUserMessage } from '../inbox.service';
import type { SendMessagePayload } from '@/shared/types/inbox';

const QUEUE_KEY = '@offline_message_queue';

interface QueuedMessage {
  id: string;
  chatId: string;
  payload: SendMessagePayload;
  companyId?: string;
  userId?: string;
  isPersonalMode: boolean;
  queuedAt: string;
}

class OfflineQueue {
  private isFlushing = false;
  private unsubscribeNetInfo: (() => void) | null = null;

  /**
   * Initialize the queue - listen for network recovery to auto-flush
   */
  init() {
    this.unsubscribeNetInfo = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && state.isInternetReachable) {
        await this.flush();
      }
    });
  }

  /**
   * Clean up listeners
   */
  destroy() {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
  }

  /**
   * Add a message to the offline queue
   */
  async enqueue(message: QueuedMessage): Promise<void> {
    const queue = await this.getQueue();
    queue.push(message);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    if (__DEV__) {
      console.log('[OfflineQueue] Enqueued message:', message.id);
    }
  }

  /**
   * Get all queued messages
   */
  async getQueue(): Promise<QueuedMessage[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get queued messages for a specific chat
   */
  async getQueued(chatId: string): Promise<QueuedMessage[]> {
    const queue = await this.getQueue();
    return queue.filter(m => m.chatId === chatId);
  }

  /**
   * Flush all queued messages - send them to the API
   * Returns the number of successfully sent messages
   */
  async flush(): Promise<number> {
    if (this.isFlushing) return 0;
    this.isFlushing = true;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isFlushing = false;
        return 0;
      }

      if (__DEV__) {
        console.log(`[OfflineQueue] Flushing ${queue.length} queued messages`);
      }

      const remaining: QueuedMessage[] = [];
      let sentCount = 0;

      for (const msg of queue) {
        try {
          if (msg.isPersonalMode && msg.userId) {
            await sendUserMessage(msg.userId, msg.chatId, msg.payload);
          } else if (msg.companyId) {
            await sendMessage(msg.companyId, msg.chatId, msg.payload);
          } else {
            // Can't determine context, keep in queue
            remaining.push(msg);
            continue;
          }
          sentCount++;
        } catch (err) {
          console.warn('[OfflineQueue] Failed to send queued message:', msg.id, err);
          remaining.push(msg);
        }
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      if (__DEV__) {
        console.log(`[OfflineQueue] Sent ${sentCount}, remaining: ${remaining.length}`);
      }
      return sentCount;
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Clear all queued messages
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
}

export const offlineQueue = new OfflineQueue();
