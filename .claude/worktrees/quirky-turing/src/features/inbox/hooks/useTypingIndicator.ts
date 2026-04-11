/**
 * useTypingIndicator Hook
 *
 * Manages typing indicator state for a chat.
 * - Emits typing_start/typing_stop events via ChatService on keystroke
 * - Listens for remote typing events and tracks who's typing
 * - Auto-clears remote typists after 5s timeout
 * - Debounced emit: only sends typing_start once per 3s cooldown
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService } from '@/shared/services/chat';

interface TypingUser {
  userId: string;
  userName: string;
}

interface UseTypingIndicatorReturn {
  /** List of users currently typing in this chat */
  typingUsers: string[];
  /** Call this on every keystroke in the input field */
  handleTyping: () => void;
  /** Call this when the user stops typing (blur, send) */
  stopTyping: () => void;
}

export function useTypingIndicator(chatId: string): UseTypingIndicatorReturn {
  const [typingMap, setTypingMap] = useState<Map<string, TypingUser>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastEmitRef = useRef<number>(0);
  const isTypingRef = useRef(false);

  // Listen for remote typing events
  useEffect(() => {
    const handleRemoteTyping = (data: { chatId: string; userId: string; userName: string }) => {
      if (data.chatId !== chatId) return;

      setTypingMap(prev => {
        const next = new Map(prev);
        next.set(data.userId, { userId: data.userId, userName: data.userName });
        return next;
      });

      // Clear existing timeout for this user
      const existing = timeoutsRef.current.get(data.userId);
      if (existing) clearTimeout(existing);

      // Auto-clear after 5 seconds
      const timeout = setTimeout(() => {
        setTypingMap(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
        timeoutsRef.current.delete(data.userId);
      }, 5000);

      timeoutsRef.current.set(data.userId, timeout);
    };

    const handleRemoteTypingStop = (data: { chatId: string; userId: string }) => {
      if (data.chatId !== chatId) return;

      setTypingMap(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });

      const existing = timeoutsRef.current.get(data.userId);
      if (existing) {
        clearTimeout(existing);
        timeoutsRef.current.delete(data.userId);
      }
    };

    chatService.onTyping(handleRemoteTyping);
    chatService.onTypingStop(handleRemoteTypingStop);

    return () => {
      chatService.offTyping(handleRemoteTyping);
      chatService.offTypingStop(handleRemoteTypingStop);
      // Clear all timeouts
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, [chatId]);

  const handleTyping = useCallback(() => {
    const now = Date.now();
    // Debounce: only emit once per 3 seconds
    if (now - lastEmitRef.current < 3000) return;

    lastEmitRef.current = now;
    isTypingRef.current = true;
    chatService.emitTypingStart(chatId);
  }, [chatId]);

  const stopTyping = useCallback(() => {
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    lastEmitRef.current = 0;
    chatService.emitTypingStop(chatId);
  }, [chatId]);

  const typingUsers = Array.from(typingMap.values()).map(u => u.userName);

  return { typingUsers, handleTyping, stopTyping };
}
