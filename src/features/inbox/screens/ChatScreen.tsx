import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, TextInput, KeyboardAvoidingView, Platform, StyleSheet, Share, Keyboard, Linking, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Icon } from '@/shared/utils/icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { ChatHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import AppButton from '@/shared/components/ui/AppButton';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import ImageViewerModal from '@/shared/components/ui/ImageViewerModal';
import { ListItemCard } from '@/shared/components/ui/ListItemCard';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import {
  sendMessage,
  sendUserMessage,
  deleteMessage,
  deleteUserMessage,
  uploadAttachment,
  leaveChat,
  leaveUserChat,
  removeChatParticipant,
  removeUserChatParticipant,
  editMessageApi,
  editUserMessageApi,
  forwardMessage,
  forwardUserMessage,
} from '../inbox.service';
import { MessageBubble } from '../components/MessageBubble';
import ChatSearchBar from '../components/ChatSearchBar';
import TypingIndicator from '../components/TypingIndicator';
import VoiceRecorder from '../components/VoiceRecorder';
import ForwardChatPicker from '../components/ForwardChatPicker';
import MentionSuggestions from '../components/MentionSuggestions';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useMentions } from '../hooks/useMentions';
import { useInboxStore } from '../inbox.store';
import { formatDateSeparator, getDateKey } from '../inbox.format';
import { useChatMessages } from '../hooks/useChatMessages';
import { offlineQueue } from '../services/offlineQueue';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import type { Message, OrderMessage, OrderEventMessage, TextMessage, EventMessage, DeletedMessage, PdfMessage, LocationMessage, VoiceMessage, ProfileMessage, ContactMessage } from '@/shared/types/inbox';
import { getTeamMembers, type TeamMember } from '@/features/team/team.service';
import { confirmOrder, declineOrder } from '@/shared/services/orders';
import { useDeliveriesStore } from '@/features/deliveries/deliveries.store';
import { convertEstimateToInvoice } from '@/features/invoices/invoices.service';

// Order status colors from design.json (supports both legacy and UPPERCASE)
const ORDER_STATUS_COLORS: Record<string, string> = {
  'pending': '#F2A900',
  'accepted': '#2A75E6',
  'completed': '#2ACF01',
  'cancelled': '#A8A29E',
  'Done': '#2ACF01',
  'New': '#7A1F12',
  'Ongoing': '#2A75E6',
  'Pending': '#F2A900',
  'Cancel': '#F0705F',
  // UPPERCASE enum values
  'NEW': '#7A1F12',
  'ACCEPTED': '#2A75E6',
  'ONGOING': '#2A75E6',
  'PENDING': '#F2A900',
  'IN_REVIEW': '#8B5CF6',
  'DONE': '#2ACF01',
  'CANCELED': '#A8A29E',
  'REJECTED': '#F0705F',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  'Paid': '#2ACF01',
  'Unpaid': '#FF2400',
  'Payment Pending Confirmation': '#F2A900',
  // UPPERCASE enum values
  'PAID': '#2ACF01',
  'UNPAID': '#FF2400',
  'PENDING_CONFIRMATION': '#F2A900',
  'PARTIALLY_PAID': '#F2A900',
  'OVERDUE': '#D6453E',
};

// MessageBubble component is now imported from ../components/MessageBubble
// The embedded MessageBubble component has been removed to eliminate code duplication

// REMOVED: Local MessageBubbleProps interface (now using the one from MessageBubble component)
// REMOVED: Embedded MessageBubble function (lines 152-642 in original file)

// The ChatScreen now uses the standalone MessageBubble component

// Update the route params type to include the unread count for this specific chat
type ChatScreenRouteParams = {
  Chat: {
    id: string;
    name: string;
    avatar?: string;
    isGroup: boolean;
    partnerId: string;
    partnerType: 'user' | 'business' | 'group';
    highlightMessage?: boolean;
    searchQuery?: string;
    scrollToMessage?: boolean;
    unreadCount?: number; // Add this to track this chat's specific unread count
  };
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ChatScreenRouteParams, 'Chat'>>();
  const { theme: appTheme, isDarkMode } = useTheme();
  const { markItemAsViewed, inboxUnreadCount, setInboxUnreadCount } = useNotifications();
  
  const { id, name, avatar, isGroup, partnerId, partnerType, highlightMessage, searchQuery, scrollToMessage, unreadCount = 0 } = route.params;
  
  // Get active business and current user from store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUser = useProfileStore((state) => state.currentUser);
  
  // Get the current user ID for determining outgoing messages
  const currentUserId = currentUser?.id || 'current-user';
  
  // Determine if we're in personal mode (no active business)
  const isPersonalMode = !activeBusiness;

  // ========== Chat Messages Hook (fetch, pagination, socket, normalization) ==========
  const {
    messages,
    setMessages,
    loadingMessages,
    loadingMore,
    hasMore,
    loadMore: loadMoreMessages,
    addOptimisticMessage,
    updateMessage,
  } = useChatMessages(id);

  const [inputText, setInputText] = useState('');

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false); // Track if we've already marked this chat as read
  const [showParticipantsSheet, setShowParticipantsSheet] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<{ id: string; name: string; avatar: string; role: string; isCurrentUser?: boolean } | null>(null);
  const [showParticipantOptionsSheet, setShowParticipantOptionsSheet] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  // Contact-sharing picker state
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<TeamMember[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [searchMatchIds, setSearchMatchIds] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  // Typing indicator
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(id);
  // Voice recorder (recording entry point disabled for now — playback of existing
  // voice messages still works; see attachmentOptions below).
  const { state: voiceState, duration: voiceDuration, recordingUri, stopRecording, cancelRecording } = useVoiceRecorder();
  // Network status for offline support
  const { isConnected } = useNetworkStatus();
  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  // Image viewer state
  const [imageViewerData, setImageViewerData] = useState<{ url: string; sender: string; timestamp: string; messageId: string } | null>(null);
  // Forward state
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  // Reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  // Shared message options bottom sheet (lifted from MessageBubble for performance)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  // Track dev-mode timers to clean up on unmount
  const devTimerIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Track scroll-failure retry timer
  const scrollFailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on unmount
  React.useEffect(() => {
    return () => {
      devTimerIds.current.forEach(clearTimeout);
      if (scrollFailTimerRef.current) clearTimeout(scrollFailTimerRef.current);
    };
  }, []);
  
  // Extract unique participants from messages for group chats
  // Also detect group chats by having multiple unique senders
  const participants = React.useMemo(() => {
    // Keyed by user id (not name) so the current user — whose own messages carry their
    // real name, not "You" — is never double-counted. Double-counting both triggered a
    // duplicate React key and miscounted a 1-on-1 as a group (participants.length > 2).
    const participantMap = new Map<string, { id: string; name: string; avatar: string; role: string; isCurrentUser?: boolean }>();

    // Add current user first
    participantMap.set(currentUserId, {
      id: currentUserId,
      name: currentUser?.name || 'You',
      avatar: currentUser?.avatar_url || '',
      role: 'user',
      isCurrentUser: true,
    });

    messages.forEach(msg => {
      if (msg.type !== 'event' && msg.sender && msg.sender.name !== 'System') {
        const senderId = msg.sender.id || msg.sender.name;
        if (senderId === currentUserId) return; // already added as the current user
        if (!participantMap.has(senderId)) {
          participantMap.set(senderId, {
            id: senderId,
            name: msg.sender.name,
            avatar: msg.sender.avatar || '',
            role: msg.sender.role || 'user',
            isCurrentUser: false,
          });
        }
      }
    });

    return Array.from(participantMap.values());
  }, [messages, currentUserId, currentUser]);
  
  // Detect if this is a group chat (3+ participants including "You", or explicitly marked as group)
  // participants.length > 2 means You + 2+ others = group chat
  const isGroupChat = isGroup || partnerType === 'group' || participants.length > 2;

  // Mentions (for group chats)
  const mentionParticipants = React.useMemo(() =>
    participants.filter(p => !p.isCurrentUser).map(p => ({ id: p.id, name: p.name, avatar: p.avatar, role: p.role })),
    [participants]
  );
  const { showSuggestions: showMentionSuggestions, suggestions: mentionSuggestionsList, onTextChange: onMentionTextChange, onSelectMention, getMentionedUserIds } = useMentions(mentionParticipants);

  // Mark this specific chat as viewed when screen is focused and reduce unread count
  useFocusEffect(
    React.useCallback(() => {
      // Only mark as read once per session to avoid multiple reductions
      if (!hasMarkedAsRead) {
        // Mark the chat as viewed (removes light blue background)
        markItemAsViewed(id);
        
        // Reduce the inbox unread count by 1 if this chat had unread messages
        // (since we're counting chats with unread messages, not total messages)
        if (unreadCount > 0) {
          setInboxUnreadCount(Math.max(0, inboxUnreadCount - 1));
        }
        
        setHasMarkedAsRead(true);
      }
    }, [id, markItemAsViewed, inboxUnreadCount, setInboxUnreadCount, unreadCount, hasMarkedAsRead])
  );

  // Ref to track if we've already scrolled to the matched message
  const hasScrolledToMessage = useRef(false);

  // Helper function to find message that contains the search query
  const findMessageWithQuery = (query: string | undefined) => {
    if (!query) return -1;
    return messages.findIndex(message => 
      message.type === 'text' && 
      message.text?.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Effect to scroll to the matched message when component mounts
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    if (scrollToMessage && searchQuery && !hasScrolledToMessage.current) {
      const messageIndex = findMessageWithQuery(searchQuery);
      
      if (messageIndex !== -1 && flatListRef.current) {
        // Wait for the list to render
        timerId = setTimeout(() => {
          flatListRef.current?.scrollToIndex({ 
            index: messageIndex, 
            animated: true,
            viewPosition: 0.5 // Center the item
          });
          hasScrolledToMessage.current = true;
        }, 500);
      }
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [messages, scrollToMessage, searchQuery]);

  // Check if we should show date separator before this message
  // Since FlatList is inverted, we compare with the next item in array (which appears above in the UI)
  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === messages.length - 1) {
      // Last message in array (first/oldest in UI) - always show date
      return true;
    }
    
    const currentDate = getDateKey(messages[index].timestamp);
    const nextDate = getDateKey(messages[index + 1].timestamp);
    
    // Show separator if dates are different
    return currentDate !== nextDate;
  };

  // Date Separator Component
  const DateSeparator = ({ date }: { date: string }) => (
    <View style={styles.dateSeparatorContainer}>
      <View style={[styles.dateSeparatorBubble, { backgroundColor: appTheme.colors.borderColor }]}>
        <Text style={[styles.dateSeparatorText, { color: appTheme.colors.textMuted }]}>{date}</Text>
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const showDateSeparator = shouldShowDateSeparator(index);
    const dateLabel = showDateSeparator ? formatDateSeparator(item.timestamp) : '';
    
    // Message grouping logic (for inverted list where index 0 = newest = bottom of screen)
    const prevMessage = index > 0 ? messages[index - 1] : null; // Lower index = newer = visually BELOW
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null; // Higher index = older = visually ABOVE
    
    // Check if same sender as adjacent messages (excluding events)
    const isSameSenderAsPrev = !!(prevMessage && prevMessage.sender?.id && prevMessage.sender.id === item.sender?.id && prevMessage.type !== 'event' && item.type !== 'event');
    const isSameSenderAsNext = !!(nextMessage && nextMessage.sender?.id && nextMessage.sender.id === item.sender?.id && nextMessage.type !== 'event' && item.type !== 'event');
    
    // isGrouped for 4px gap: only apply when SAME sender as message BELOW (prevMessage in inverted list)
    // This controls the bottom margin of this message
    const isGrouped = isSameSenderAsPrev;
    const isFirstInGroup = !isSameSenderAsNext; // No same sender ABOVE = top of group visually (show avatar here)
    const isLastInGroup = !isSameSenderAsPrev; // No same sender BELOW = bottom of group visually
    
    // Show sender name only in group chats with more than 2 users (participants > 1 means 3+ people including "You")
    const showSenderName = !item.isOutgoing && item.type !== 'event' && isGroupChat;
    
    return (
      <View>
        {/* Date separator renders BEFORE the message so it appears ABOVE in the inverted list */}
        {showDateSeparator && dateLabel && (
          <DateSeparator date={dateLabel} />
        )}
        <MessageBubble
          message={item}
          onOrderAction={handleOrderAction}
          onOrderPress={handleOrderPress}
          onOpenDocument={handleOpenDocument}
          onDeleteMessage={handleDeleteMessage}
          onReplyMessage={handleReplyMessage}
          onInvoicePress={handleInvoicePress}
          onEstimatePress={handleEstimatePress}
          onEstimateConfirm={handleEstimateConfirm}
          onOrderEventAction={handleOrderEventAction}
          onConfirmOrder={handleConfirmOrder}
          onDeclineOrder={handleDeclineOrder}
          onProfilePress={handleProfilePress}
          onImagePress={handleImagePress}
          onLongPress={handleMessageLongPress}
          isGrouped={isGrouped}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
          showSenderName={showSenderName}
          isGroupChat={isGroupChat}
        />
      </View>
    );
  };

  // Handle errors in scrollToIndex
  const onScrollToIndexFailed = (info: { index: number; averageItemLength: number }) => {
    // Wait a bit and try again with different approach
    if (scrollFailTimerRef.current) clearTimeout(scrollFailTimerRef.current);
    scrollFailTimerRef.current = setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ 
          offset: info.averageItemLength * info.index,
          animated: true
        });
      }
    }, 100);
  };

  // Handle tapping an order card in chat
  const handleOrderPress = (orderId: string) => {
    // Look up order in local messages to get delivery info
    const orderMessage = messages.find(
      (m): m is OrderEventMessage => m.type === 'order_event' && m.payload?.orderId === orderId
    );

    const payload = orderMessage?.payload;
    const deliveryId = payload?.delivery?.id;

    if (deliveryId) {
      // Navigate to delivery detail screen
      (navigation as any).navigate('DeliveryDetail', { deliveryId });
    } else {
      // Fallback: show order info when no delivery is linked yet
      const status = payload?.status || 'Unknown';
      const total = payload?.totalAmount;
      const shortId = orderId.length > 6 ? orderId.slice(-6) : orderId;
      AppAlert.alert(
        `Order #${shortId}`,
        `Status: ${status}${total ? `\nTotal: Rs ${Number(total).toLocaleString()}` : ''}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Handle confirming a B2B order (seller accepts and delivery is auto-created)
  const handleConfirmOrder = async (orderId: string) => {
    if (!activeBusiness?.id) return;
    try {
      const result = await confirmOrder(activeBusiness.id, orderId);
      
      // Add delivery to store so it appears immediately in the deliveries list
      if (result.delivery) {
        useDeliveriesStore.getState().addDelivery(result.delivery);
      }

      // Inform user whether delivery was also created
      if (result.delivery) {
        AppAlert.alert('Order Confirmed', `Order #${orderId} accepted and delivery created.`);
      } else {
        AppAlert.alert(
          'Order Confirmed (Partial)',
          `Order #${orderId} accepted, but delivery could not be auto-created. Please create a delivery manually.`
        );
      }
      
      // Update the message in chat to reflect new status
      setMessages(prevMessages => prevMessages.map(msg => {
        if (msg.type === 'order_event' && msg.payload?.orderId === orderId) {
          return {
            ...msg,
            payload: { ...msg.payload, status: 'ACCEPTED' },
          } as OrderEventMessage;
        }
        if (msg.type === 'order' && msg.orderId === orderId) {
          return { ...msg, orderStatus: 'ACCEPTED' } as OrderMessage;
        }
        return msg;
      }));
    } catch (err: any) {
      AppAlert.alert('Error', err?.message || 'Failed to confirm order');
    }
  };

  // Handle declining a B2B order
  const handleDeclineOrder = async (orderId: string) => {
    if (!activeBusiness?.id) return;
    AppAlert.alert(
      'Decline Order',
      `Are you sure you want to decline order #${orderId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineOrder(activeBusiness.id, orderId, 'Declined by seller');
              AppAlert.alert('Order Declined', `Order #${orderId} has been rejected.`);
              setMessages(prevMessages => prevMessages.map(msg => {
                if (msg.type === 'order_event' && msg.payload?.orderId === orderId) {
                  return {
                    ...msg,
                    payload: { ...msg.payload, status: 'REJECTED' },
                  } as OrderEventMessage;
                }
                if (msg.type === 'order' && msg.orderId === orderId) {
                  return { ...msg, orderStatus: 'REJECTED' } as OrderMessage;
                }
                return msg;
              }));
            } catch (err: any) {
              AppAlert.alert('Error', err?.message || 'Failed to decline order');
            }
          },
        },
      ]
    );
  };

  const updateOrderMessage = (id: string, updates: Partial<OrderMessage>) => {
    setMessages(prevMessages => prevMessages.map(msg => {
      if (msg.id === id && msg.type === 'order') {
        return { ...msg, ...updates } as Message;
      }
      return msg;
    }));
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    stopTyping();

    // If in edit mode, save the edit instead of sending a new message
    if (editingMessageId) {
      try {
        if (isPersonalMode && currentUser?.id) {
          await editUserMessageApi(currentUser.id, id, editingMessageId, inputText.trim());
        } else if (activeBusiness?.id) {
          await editMessageApi(activeBusiness.id, id, editingMessageId, inputText.trim());
        }
        // Update local state AND the store immediately so the edit shows right away
        // (and so the store stays consistent before the message_edited socket echo
        // arrives). The echo later reconciles the authoritative server editedAt.
        updateMessage(editingMessageId, {
          text: inputText.trim(),
          editedAt: new Date().toISOString(),
        } as Partial<Message>);
      } catch (err: any) {
        AppAlert.alert('Error', err?.message || 'Failed to edit message');
      }
      setEditingMessageId(null);
      setInputText('');
      Keyboard.dismiss();
      return;
    }

    // Capture reply info and mentions before clearing
    const replyToId = replyingTo?.id;
    const replyContext = replyingTo ? {
      senderName: replyingTo.sender?.name || 'Unknown',
      messageSnippet: getReplyPreviewText(replyingTo),
      messageId: replyingTo.id,
    } : undefined;
    const mentionedIds = isGroupChat ? getMentionedUserIds(inputText) : [];
    
    // Optimistic update - add message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: TextMessage = {
      id: tempId,
      chatId: id,
      type: 'text',
      text: inputText,
      isOutgoing: true,
      sender: { 
        id: currentUserId, 
        name: currentUser?.name || 'You', 
        avatar: currentUser?.avatar_url || '', 
        role: isPersonalMode ? 'user' : 'business' 
      },
      timestamp: new Date().toISOString(),
      status: 'sending',
      ...(replyContext && { replyingTo: replyContext }),
    };

    setMessages(prevMessages => [optimisticMessage, ...prevMessages]);
    const messageText = inputText;
    setInputText('');
    setReplyingTo(null); // Clear reply state
    Keyboard.dismiss();
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }

    // If offline, enqueue instead of sending
    if (!isConnected) {
      offlineQueue.enqueue({
        id: tempId,
        chatId: id,
        payload: { type: 'text', content: messageText, replyToId },
        companyId: activeBusiness?.id,
        userId: currentUser?.id,
        isPersonalMode,
        queuedAt: new Date().toISOString(),
      });
      return;
    }

    // Send to API
    const canSendToApi = isPersonalMode ? !!currentUser?.id : !!activeBusiness?.id;

    if (canSendToApi) {
      try {
        let sentMessage: Message;
        
        if (isPersonalMode && currentUser?.id) {
          // Personal mode: use user API
          sentMessage = await sendUserMessage(currentUser.id, id, {
            type: 'text',
            content: messageText,
            replyToId,
            ...(mentionedIds.length > 0 && { metadata: { mentions: mentionedIds } }),
          });
        } else if (activeBusiness?.id) {
          // Business mode: use company API
          sentMessage = await sendMessage(activeBusiness.id, id, {
            type: 'text',
            content: messageText,
            replyToId,
            ...(mentionedIds.length > 0 && { metadata: { mentions: mentionedIds } }),
          });
        } else {
          throw new Error('No valid context for sending message');
        }
        
        // Replace optimistic message with real one, ensuring isOutgoing is preserved
        const finalMessage = { ...sentMessage, isOutgoing: true } as Message;
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? finalMessage : msg
          )
        );
        // Note: don't add to store here -- the socket subscription in
        // useChatMessages will pick up the server-echoed message, avoiding duplicates.
      } catch (error) {
        console.error('Failed to send message:', error);
        // Update status to failed
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? { ...msg, status: 'failed' } as Message : msg
          )
        );
        AppAlert.alert('Error', 'Failed to send message. Please try again.');
      }
    } else if (__DEV__) {
      // No active context - simulate delivery for mock/dev mode only
      devTimerIds.current.push(setTimeout(() => {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? { ...msg, status: 'delivered' } as Message : msg
          )
        );
      }, 1000));

      devTimerIds.current.push(setTimeout(() => {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? { ...msg, status: 'seen' } as Message : msg
          )
        );
      }, 2000));
    }
  };

  // Voice message: stop recording and send
  const handleSendVoice = async () => {
    await stopRecording();
    // After stopping, recordingUri will be updated in next render
    // We handle the actual upload in an effect
  };

  // Effect: when voice recording is stopped and URI is available, upload and send
  useEffect(() => {
    if (voiceState !== 'stopped' || !recordingUri) return;

    const sendVoice = async () => {
      try {
        // Upload the audio file
        const audioUrl = await uploadAttachment(recordingUri, 'voice-message.m4a');

        // Create optimistic message
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: VoiceMessage = {
          id: tempId,
          chatId: id,
          type: 'voice',
          audioUrl,
          durationSeconds: voiceDuration,
          isOutgoing: true,
          sender: {
            id: currentUserId,
            name: currentUser?.name || 'You',
            avatar: currentUser?.avatar_url || '',
            role: isPersonalMode ? 'user' : 'business',
          },
          timestamp: new Date().toISOString(),
          status: 'sending',
        };

        setMessages(prev => [optimisticMessage, ...prev]);

        // Send via API
        let sentMessage: Message;
        if (isPersonalMode && currentUser?.id) {
          sentMessage = await sendUserMessage(currentUser.id, id, {
            type: 'voice',
            content: 'Voice message',
            attachmentUrl: audioUrl,
            metadata: { durationSeconds: voiceDuration, audioUrl },
          });
        } else if (activeBusiness?.id) {
          sentMessage = await sendMessage(activeBusiness.id, id, {
            type: 'voice',
            content: 'Voice message',
            attachmentUrl: audioUrl,
            metadata: { durationSeconds: voiceDuration, audioUrl },
          });
        } else {
          throw new Error('No valid context');
        }

        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...sentMessage, isOutgoing: true } as Message : m)
        );
      } catch (err: any) {
        console.error('[Voice] Failed to send voice message:', err);
        AppAlert.alert('Error', 'Failed to send voice message');
      }
      // Reset recorder state
      cancelRecording();
    };

    sendVoice();
  }, [voiceState, recordingUri]);

  // Image press handler for full-screen viewer
  const handleImagePress = (imageUrl: string, senderName: string, timestamp: string, messageId: string) => {
    setImageViewerData({ url: imageUrl, sender: senderName, timestamp, messageId });
  };

  // Profile press handler for profile messages
  const handleProfilePress = (profileId: string, profileType: 'user' | 'business') => {
    if (profileType === 'business') {
      (navigation as any).navigate('ViewBusinessProfile', { businessId: profileId });
    } else {
      (navigation as any).navigate('ViewUserProfile', { userId: profileId });
    }
  };

  const addEventMessage = (orderId: string, importExportLabel: string) => {
    const eventMessage: EventMessage = {
      id: String(Date.now() + 1),
      chatId: id, // Use the chat ID from route params
      type: 'event',
      event: `Order #${orderId} status updated (${importExportLabel})`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isOutgoing: false,
      sender: {
        id: 'system',
        name: 'System',
        avatar: '',
        role: 'system'
      }
    };
    setMessages(prevMessages => [eventMessage, ...prevMessages]);
  };
  
  const handleOrderAction = async (type: string, message: Message) => {
    // Type guard to ensure message is an OrderMessage
    if (message.type !== 'order') return;
    const msg = message as OrderMessage;
    const businessId = activeBusiness?.id;
    if (!businessId) return;
    
    try {
      if (type === 'delivery') {
        const status = msg.orderStatus?.toUpperCase?.() || '';
        if (status === 'ONGOING' || status === 'NEW' || status === 'ACCEPTED') {
          // Update delivery status to InTransit
          await import('@/shared/services/orders').then(m =>
            m.updateOrderDeliveryStatus(businessId, msg.orderId, 'InTransit')
          );
          updateOrderMessage(msg.id, { orderStatus: 'InTransit' });
        } else if (status === 'INTRANSIT' || status === 'DELIVERY PENDING CONFIRMATION') {
          await import('@/shared/services/orders').then(m =>
            m.updateOrderDeliveryStatus(businessId, msg.orderId, 'Delivered')
          );
          updateOrderMessage(msg.id, { orderStatus: 'DONE' });
          const importExportLabel = msg.isOutgoing ? 'Export' : 'Import';
          addEventMessage(msg.orderId, importExportLabel);
        }
      } else if (type === 'payment') {
        const payStatus = msg.paymentStatus?.toUpperCase?.() || '';
        if (payStatus === 'UNPAID') {
          await import('@/shared/services/orders').then(m =>
            m.updateOrderPaymentStatus(businessId, msg.orderId, 'PENDING_CONFIRMATION')
          );
          updateOrderMessage(msg.id, { paymentStatus: 'PENDING_CONFIRMATION' });
        } else if (payStatus === 'PENDING_CONFIRMATION' || payStatus === 'PAYMENT PENDING CONFIRMATION') {
          await import('@/shared/services/orders').then(m =>
            m.updateOrderPaymentStatus(businessId, msg.orderId, 'PAID')
          );
          updateOrderMessage(msg.id, { paymentStatus: 'PAID' });
        }
      } else if (type === 'invoice') {
        AppAlert.alert('Invoice', 'Show invoice/receipt for order ' + msg.orderId);
      }
    } catch (err: any) {
      console.error('Order action failed:', err);
      AppAlert.alert('Error', err?.message || 'Failed to update order');
    }
  };

  // Chat search handlers
  const handleChatSearch = useCallback((query: string) => {
    setChatSearchQuery(query);
    if (!query.trim()) {
      setSearchMatchIds([]);
      setCurrentSearchIndex(0);
      return;
    }
    const lower = query.toLowerCase();
    const matches = messages.filter(m => {
      if (m.type === 'text') return (m as TextMessage).text?.toLowerCase().includes(lower);
      if (m.type === 'location') return (m as LocationMessage).locationName?.toLowerCase().includes(lower) || (m as LocationMessage).address?.toLowerCase().includes(lower);
      if (m.type === 'pdf') return (m as PdfMessage).fileName?.toLowerCase().includes(lower);
      return false;
    }).map(m => m.id);
    setSearchMatchIds(matches);
    setCurrentSearchIndex(0);
    // Scroll to first match
    if (matches.length > 0) {
      const idx = messages.findIndex(m => m.id === matches[0]);
      if (idx >= 0 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      }
    }
  }, [messages]);

  const handleSearchNavigate = useCallback((direction: 'prev' | 'next') => {
    if (searchMatchIds.length === 0) return;
    const newIndex = direction === 'next'
      ? (currentSearchIndex + 1) % searchMatchIds.length
      : (currentSearchIndex - 1 + searchMatchIds.length) % searchMatchIds.length;
    setCurrentSearchIndex(newIndex);
    const matchId = searchMatchIds[newIndex];
    const idx = messages.findIndex(m => m.id === matchId);
    if (idx >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    }
  }, [searchMatchIds, currentSearchIndex, messages]);

  const handleViewProfile = () => {
    // Check for group first (detected by multiple participants or explicit flag)
    if (isGroupChat) {
      // For groups, show participants sheet
      setShowParticipantsSheet(true);
    } else if (partnerType === 'business') {
      (navigation as any).navigate('ViewBusinessProfile', { businessId: partnerId });
    } else if (partnerType === 'user') {
      (navigation as any).navigate('ViewUserProfile', { userId: partnerId });
    }
  };
  
  const handleParticipantPress = (participant: { id: string; name: string; avatar: string; role: string }) => {
    setShowParticipantsSheet(false);
    // Navigate to user or business profile based on role
    if (participant.role === 'business' || participant.role === 'admin') {
      (navigation as any).navigate('ViewBusinessProfile', { businessId: participant.id });
    } else {
      (navigation as any).navigate('ViewUserProfile', { userId: participant.id, userName: participant.name });
    }
  };

  const handleOpenDocument = async (fileName: string, fileUrl?: string) => {
    if (!fileUrl) {
      AppAlert.alert('Error', 'No file URL available for this document');
      return;
    }

    AppAlert.alert(
      fileName,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open / Share',
          onPress: async () => {
            try {
              const downloadPath = FileSystem.cacheDirectory + fileName;
              const { uri } = await FileSystem.downloadAsync(fileUrl, downloadPath);
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
              } else {
                AppAlert.alert('Downloaded', `${fileName} saved to ${uri}`);
              }
            } catch (error) {
              console.error('Download error:', error);
              AppAlert.alert('Error', 'Failed to download document');
            }
          },
        },
      ]
    );
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Find the original message for potential rollback
    const originalMessage = messages.find(msg => msg.id === messageId);
    if (!originalMessage) return;
    
    // Optimistic update - immediately show as deleted
    setMessages(currentMessages => 
      currentMessages.map(msg => {
        if (msg.id === messageId) {
          const deletedMessage: DeletedMessage = {
            id: msg.id,
            chatId: msg.chatId,
            type: 'deleted',
            isOutgoing: msg.isOutgoing,
            sender: msg.sender,
            timestamp: msg.timestamp,
            status: msg.status
          };
          return deletedMessage;
        }
        return msg;
      })
    );
    
    // Call API to delete
    const canDeleteFromApi = isPersonalMode ? !!currentUser?.id : !!activeBusiness?.id;
    
    if (canDeleteFromApi) {
      try {
        if (isPersonalMode && currentUser?.id) {
          await deleteUserMessage(currentUser.id, id, messageId);
        } else if (activeBusiness?.id) {
          await deleteMessage(activeBusiness.id, id, messageId);
        }
        // Success - message already shown as deleted
      } catch (error) {
        console.error('Failed to delete message:', error);
        // Rollback on error
        setMessages(currentMessages =>
          currentMessages.map(msg =>
            msg.id === messageId ? originalMessage : msg
          )
        );
        AppAlert.alert('Error', 'Failed to delete message. Please try again.');
      }
    }
    // If no API context, the optimistic update stays (mock mode)
  };

  const handleReplyMessage = (messageId: string) => {
    // Find the message to reply to
    const messageToReply = messages.find(msg => msg.id === messageId);
    if (messageToReply) {
      setReplyingTo(messageToReply);
      // Focus the input field
      inputRef.current?.focus();
    }
  };
  
  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Shared message long press handler (opens bottom sheet at ChatScreen level)
  const handleMessageLongPress = useCallback((messageId: string) => {
    setSelectedMessageId(messageId);
  }, []);

  // Build message options dynamically based on the selected message
  const messageOptionsItems: AppBottomSheetItem[] = (() => {
    const items: AppBottomSheetItem[] = [
      { id: 'copy', title: 'Copy Text' },
      { id: 'reply', title: 'Reply' },
      { id: 'forward', title: 'Forward' },
    ];
    if (selectedMessageId) {
      const msg = messages.find(m => m.id === selectedMessageId);
      if (msg && msg.isOutgoing && msg.type === 'text') {
        // Check if within 24 hours
        const age = Date.now() - new Date(msg.timestamp).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          items.push({ id: 'edit', title: 'Edit Message' });
        }
      }
    }
    items.push({ id: 'delete', title: 'Delete Message', variant: 'destructive' });
    return items;
  })();

  const handleMessageOptionSelect = useCallback((item: AppBottomSheetItem) => {
    if (!selectedMessageId) return;
    if (item.id === 'copy') {
      const message = messages.find(m => m.id === selectedMessageId);
      if (message) {
        let textToCopy = '';
        if (message.type === 'text') textToCopy = (message as TextMessage).text || '';
        else if (message.type === 'location') textToCopy = (message as LocationMessage).address || (message as LocationMessage).locationName || '';
        else if (message.type === 'pdf') textToCopy = (message as PdfMessage).fileName || '';
        if (textToCopy) {
          Clipboard.setStringAsync(textToCopy);
        }
      }
    } else if (item.id === 'reply') {
      handleReplyMessage(selectedMessageId);
    } else if (item.id === 'forward') {
      setForwardingMessageId(selectedMessageId);
    } else if (item.id === 'edit') {
      const message = messages.find(m => m.id === selectedMessageId);
      if (message && message.type === 'text') {
        setEditingMessageId(selectedMessageId);
        setInputText((message as TextMessage).text || '');
        setReplyingTo(null);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else if (item.id === 'delete') {
      handleDeleteMessage(selectedMessageId);
    }
    setSelectedMessageId(null);
  }, [selectedMessageId, messages, handleReplyMessage, handleDeleteMessage]);
  
  // Get reply preview text
  const getReplyPreviewText = (msg: Message): string => {
    switch (msg.type) {
      case 'text':
        return msg.text || '';
      case 'image':
        return '📷 Photo';
      case 'pdf':
        return `📄 ${msg.fileName || 'Document'}`;
      case 'location':
        return `📍 ${msg.locationName || 'Location'}`;
      case 'voice':
        return '🎤 Voice note';
      default:
        return 'Message';
    }
  };

  const handleInvoicePress = (invoiceId: string) => {
    (navigation as any).navigate('InvoiceDetails', { invoiceId });
  };

  const handleEstimatePress = (estimateId: string) => {
    (navigation as any).navigate('InvoiceDetails', { invoiceId: estimateId });
  };

  const handleEstimateConfirm = async (estimateId: string) => {
    AppAlert.alert(
      'Confirm Estimate',
      'Convert this estimate to an invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const invoice = await convertEstimateToInvoice(estimateId);
              AppAlert.alert('Success', 'Estimate has been converted to invoice', [
                { text: 'View Invoice', onPress: () => (navigation as any).navigate('InvoiceDetails', { invoiceId: invoice.id || estimateId }) },
                { text: 'OK' },
              ]);
            } catch (err: any) {
              AppAlert.alert('Error', err?.message || 'Failed to convert estimate');
            }
          },
        },
      ]
    );
  };

  const handleOrderEventAction = async (actionId: string, orderId: string) => {
    const businessId = activeBusiness?.id;
    if (!businessId) return;

    try {
      if (actionId === 'confirm_delivery') {
        await import('@/shared/services/orders').then(m =>
          m.updateOrderDeliveryStatus(businessId, orderId, 'Delivered')
        );
        // Update local message state to reflect the delivery confirmation
        setMessages(prev => prev.map(msg => {
          if (msg.type === 'order_event' && msg.payload?.orderId === orderId) {
            return { ...msg, payload: { ...msg.payload, status: 'Delivered' } } as OrderEventMessage;
          }
          if (msg.type === 'order' && (msg as OrderMessage).orderId === orderId) {
            return { ...msg, orderStatus: 'DONE' } as OrderMessage;
          }
          return msg;
        }));
        AppAlert.alert('Delivery Confirmed', 'Delivery has been marked as complete.');
      } else if (actionId === 'confirm_payment') {
        await import('@/shared/services/orders').then(m =>
          m.updateOrderPaymentStatus(businessId, orderId, 'PAID')
        );
        // Update local message state to reflect the payment confirmation
        setMessages(prev => prev.map(msg => {
          if (msg.type === 'order_event' && msg.payload?.orderId === orderId) {
            return { ...msg, payload: { ...msg.payload, paymentStatus: 'PAID' } } as OrderEventMessage;
          }
          if (msg.type === 'order' && (msg as OrderMessage).orderId === orderId) {
            return { ...msg, paymentStatus: 'PAID' } as OrderMessage;
          }
          return msg;
        }));
        AppAlert.alert('Payment Confirmed', 'Payment has been marked as received.');
      } else {
        AppAlert.alert('Action', `Action "${actionId}" for order ${orderId}`);
      }
    } catch (err) {
      AppAlert.alert('Error', 'Failed to perform action. Please try again.');
    }
  };

  // State for attachments
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [isPickingDocument, setIsPickingDocument] = useState(false);
  
  // Handle document picking and sending
  const handlePickDocument = async () => {
    try {
      setIsPickingDocument(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      
      const document = result.assets[0];
      const fileName = document.name || 'Document';
      const fileUri = document.uri;
      const fileSize = document.size || 0;
      
      // Create optimistic PDF message with local URI
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        chatId: id,
        type: 'pdf',
        fileName,
        fileUrl: fileUri, // Show local URI while uploading
        fileSize,
        isOutgoing: true,
        sender: {
          id: currentUserId,
          name: currentUser?.name || 'You',
          avatar: currentUser?.avatar_url || '',
          role: isPersonalMode ? 'user' : 'business',
        },
        timestamp: new Date().toISOString(),
        status: 'sending',
      } as Message;
      
      setMessages(prevMessages => [optimisticMessage, ...prevMessages]);
      
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
      
      // Send to API
      const canSendToApi = isPersonalMode ? !!currentUser?.id : !!activeBusiness?.id;
      
      if (canSendToApi) {
        try {
          // Upload file first to get public URL
          let attachmentUrl: string;
          try {
            attachmentUrl = await uploadAttachment(fileUri, fileName);
          } catch (uploadError) {
            console.error('Upload failed:', uploadError);
            // Mark message as failed instead of sending broken local URI
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } as Message : m));
            AppAlert.alert('Upload Error', 'Failed to upload file. Please try again.');
            return;
          }
          
          let sentMessage: Message;
          
          if (isPersonalMode && currentUser?.id) {
            sentMessage = await sendUserMessage(currentUser.id, id, {
              type: 'pdf',
              content: fileName,
              attachmentUrl,
              metadata: { fileSize },
            });
          } else if (activeBusiness?.id) {
            sentMessage = await sendMessage(activeBusiness.id, id, {
              type: 'pdf',
              content: fileName,
              attachmentUrl,
              metadata: { fileSize },
            });
          } else {
            throw new Error('No valid context for sending message');
          }
          
          // Replace optimistic message with real one
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === tempId ? { ...sentMessage, isOutgoing: true } : msg
            )
          );
        } catch (error) {
          console.error('Failed to send document:', error);
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === tempId ? { ...msg, status: 'failed' } as Message : msg
            )
          );
          AppAlert.alert('Error', 'Failed to send document. Please try again.');
        }
      } else if (__DEV__) {
        // Mock mode - simulate delivery (dev only)
        devTimerIds.current.push(setTimeout(() => {
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === tempId ? { ...msg, status: 'delivered' } as Message : msg
            )
          );
        }, 1000));
      }
    } catch (error) {
      console.error('Document picking error:', error);
      AppAlert.alert('Error', 'Failed to pick document. Please try again.');
    } finally {
      setIsPickingDocument(false);
    }
  };
  
  // Handle media picking (photos/videos)
  const handlePickMedia = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        AppAlert.alert(
          'Permission Required',
          'Please allow access to your photos to share images.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      
      const asset = result.assets[0];
      const imageUri = asset.uri;
      const width = asset.width || 300;
      const height = asset.height || 300;
      
      // Get file name from URI
      const fileName = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      
      // Create optimistic image message with local URI
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        chatId: id,
        type: 'image',
        imageUrl: imageUri, // Show local URI while uploading
        width,
        height,
        isOutgoing: true,
        sender: {
          id: currentUserId,
          name: currentUser?.name || 'You',
          avatar: currentUser?.avatar_url || '',
          role: isPersonalMode ? 'user' : 'business',
        },
        timestamp: new Date().toISOString(),
        status: 'sending',
      } as Message;
      
      setMessages(prevMessages => [optimisticMessage, ...prevMessages]);
      
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
      
      // Send to API
      const canSendToApi = isPersonalMode ? !!currentUser?.id : !!activeBusiness?.id;
      
      if (canSendToApi) {
        try {
          // Upload image first to get public URL
          let attachmentUrl: string;
          try {
            attachmentUrl = await uploadAttachment(imageUri, fileName);
          } catch (uploadError) {
            console.error('Upload failed:', uploadError);
            // Mark message as failed instead of sending broken local URI
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } as Message : m));
            AppAlert.alert('Upload Error', 'Failed to upload image. Please try again.');
            return;
          }
          
          let sentMessage: Message;
          
          if (isPersonalMode && currentUser?.id) {
            sentMessage = await sendUserMessage(currentUser.id, id, {
              type: 'image',
              content: 'Photo',
              attachmentUrl,
              metadata: { width, height },
            });
          } else if (activeBusiness?.id) {
            sentMessage = await sendMessage(activeBusiness.id, id, {
              type: 'image',
              content: 'Photo',
              attachmentUrl,
              metadata: { width, height },
            });
          } else {
            throw new Error('No valid context for sending message');
          }
          
          // Replace optimistic message with real one
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === tempId ? { ...sentMessage, isOutgoing: true } : msg
            )
          );
        } catch (error) {
          console.error('Failed to send image:', error);
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === tempId ? { ...msg, status: 'failed' } as Message : msg
            )
          );
          AppAlert.alert('Error', 'Failed to send image. Please try again.');
        }
      } else if (__DEV__) {
        // Mock mode - simulate delivery (dev only)
        devTimerIds.current.push(setTimeout(() => {
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === tempId ? { ...msg, status: 'delivered' } as Message : msg
            )
          );
        }, 1000));
      }
    } catch (error) {
      console.error('Media picking error:', error);
      AppAlert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  // Handle location sharing
  const handleShareLocation = async () => {
    try {
      setIsSharingLocation(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        AppAlert.alert(
          'Permission Required',
          'Location permission is required to share your location. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude, longitude } = location.coords;
      
      // Try to get address (reverse geocoding)
      let address = '';
      let locationName = '';
      try {
        const [geocodeResult] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocodeResult) {
          const parts = [];
          if (geocodeResult.street) parts.push(geocodeResult.street);
          if (geocodeResult.city) parts.push(geocodeResult.city);
          if (geocodeResult.region) parts.push(geocodeResult.region);
          address = parts.join(', ');
          locationName = geocodeResult.name || geocodeResult.street || 'Current Location';
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
        address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        locationName = 'Current Location';
      }
      
      // Create optimistic location message
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        chatId: id,
        type: 'location',
        latitude,
        longitude,
        address,
        locationName,
        isOutgoing: true,
        sender: {
          id: currentUserId,
          name: currentUser?.name || 'You',
          avatar: currentUser?.avatar_url || '',
          role: isPersonalMode ? 'user' : 'business',
        },
        timestamp: new Date().toISOString(),
        status: 'sending',
      } as Message;
      
      setMessages(prevMessages => [optimisticMessage, ...prevMessages]);
      
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
      
      // Send to API
      const canSendToApi = isPersonalMode ? !!currentUser?.id : !!activeBusiness?.id;
      
      if (canSendToApi) {
        try {
          let sentMessage: Message;
          
          if (isPersonalMode && currentUser?.id) {
            sentMessage = await sendUserMessage(currentUser.id, id, {
              type: 'location',
              content: locationName,
              metadata: { latitude, longitude, address, locationName },
            });
          } else if (activeBusiness?.id) {
            sentMessage = await sendMessage(activeBusiness.id, id, {
              type: 'location',
              content: locationName,
              metadata: { latitude, longitude, address, locationName },
            });
          } else {
            throw new Error('No valid context for sending message');
          }
          
          // Replace optimistic message with real one
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === tempId ? { ...sentMessage, isOutgoing: true } : msg
            )
          );
        } catch (error) {
          console.error('Failed to send location:', error);
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === tempId ? { ...msg, status: 'failed' } as Message : msg
            )
          );
          AppAlert.alert('Error', 'Failed to share location. Please try again.');
        }
      } else if (__DEV__) {
        // Mock mode - simulate delivery (dev only)
        devTimerIds.current.push(setTimeout(() => {
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.id === tempId ? { ...msg, status: 'delivered' } as Message : msg
            )
          );
        }, 1000));
      }
    } catch (error) {
      console.error('Location sharing error:', error);
      AppAlert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setIsSharingLocation(false);
    }
  };

  // Share current user's profile as a message
  const handleShareProfile = async () => {
    if (!currentUser?.id) return;

    const profileId = currentUser.id;
    const profileName = currentUser.name || 'Unknown';
    const profileAvatar = currentUser.avatar_url || '';
    const profileType = 'user';

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ProfileMessage = {
      id: tempId,
      chatId: id,
      type: 'profile',
      profileId,
      profileName,
      profileAvatar,
      profileType,
      isOutgoing: true,
      sender: {
        id: currentUserId,
        name: currentUser?.name || 'You',
        avatar: currentUser?.avatar_url || '',
        role: isPersonalMode ? 'user' : 'business',
      },
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prev => [optimisticMessage, ...prev]);

    try {
      let sentMessage: Message;
      const payload = {
        type: 'profile' as const,
        content: profileName,
        metadata: { profileId, profileName, profileAvatar, profileType },
      };
      if (isPersonalMode && currentUser?.id) {
        sentMessage = await sendUserMessage(currentUser.id, id, payload);
      } else if (activeBusiness?.id) {
        sentMessage = await sendMessage(activeBusiness.id, id, payload);
      } else {
        throw new Error('No valid context');
      }
      setMessages(prev =>
        prev.map(m => m.id === tempId ? { ...sentMessage, isOutgoing: true } as Message : m)
      );
    } catch (err: any) {
      AppAlert.alert('Error', err?.message || 'Failed to share profile');
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } as Message : m));
    }
  };

  // Open the contact picker (sourced from the active business's team members)
  const handleShareContact = async () => {
    if (!activeBusiness?.id) return;
    setShowContactPicker(true);
    setContactsLoading(true);
    try {
      const members = await getTeamMembers(activeBusiness.id, 'accepted');
      setContacts(members);
    } catch (err: any) {
      AppAlert.alert('Error', err?.message || 'Failed to load contacts.');
    } finally {
      setContactsLoading(false);
    }
  };

  // Share the picked contact as a message
  const handleSelectContact = async (member: TeamMember) => {
    setShowContactPicker(false);
    const contactName = member.name;
    const contactPhone = member.phone || '';
    const contactAvatar = member.avatar || '';
    const contactId = member.id;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ContactMessage = {
      id: tempId,
      chatId: id,
      type: 'contact',
      contactName,
      contactPhone,
      contactAvatar,
      contactId,
      isOutgoing: true,
      sender: {
        id: currentUserId,
        name: currentUser?.name || 'You',
        avatar: currentUser?.avatar_url || '',
        role: isPersonalMode ? 'user' : 'business',
      },
      timestamp: new Date().toISOString(),
      status: 'sending',
    } as ContactMessage;

    setMessages(prev => [optimisticMessage, ...prev]);

    try {
      let sentMessage: Message;
      const payload = {
        type: 'contact' as const,
        content: contactName,
        metadata: { contactName, contactPhone, contactAvatar, contactId },
      };
      if (isPersonalMode && currentUser?.id) {
        sentMessage = await sendUserMessage(currentUser.id, id, payload);
      } else if (activeBusiness?.id) {
        sentMessage = await sendMessage(activeBusiness.id, id, payload);
      } else {
        throw new Error('No valid context');
      }
      setMessages(prev =>
        prev.map(m => m.id === tempId ? { ...sentMessage, isOutgoing: true } as Message : m)
      );
    } catch (err: any) {
      AppAlert.alert('Error', err?.message || 'Failed to share contact');
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } as Message : m));
    }
  };

  // Handle forwarding a message to another chat
  const handleForwardToChat = async (targetChatId: string, targetChatName: string) => {
    if (!forwardingMessageId) return;
    try {
      if (isPersonalMode && currentUser?.id) {
        await forwardUserMessage(currentUser.id, id, forwardingMessageId, targetChatId);
      } else if (activeBusiness?.id) {
        await forwardMessage(activeBusiness.id, id, forwardingMessageId, targetChatId);
      }
      AppAlert.alert('Forwarded', `Message forwarded to ${targetChatName}`);
    } catch (err: any) {
      AppAlert.alert('Error', err?.message || 'Failed to forward message');
    }
    setForwardingMessageId(null);
  };

  // Handle mention selection
  const handleMentionSelect = (participant: { id: string; name: string; avatar: string; role: string }) => {
    const newText = onSelectMention(participant, inputText);
    setInputText(newText);
    inputRef.current?.focus();
  };

  // Handle attachment option selection
  const handleAttachmentSelect = (item: { id: string; title: string }) => {
    setShowAttachmentSheet(false);
    switch (item.id) {
      case 'pdf':
        handlePickDocument();
        break;
      case 'media':
        handlePickMedia();
        break;
      case 'location':
        handleShareLocation();
        break;
      case 'profile':
        handleShareProfile();
        break;
      case 'contact':
        handleShareContact();
        break;
    }
  };

  // Attachment options for the bottom sheet
  const attachmentOptions = [
    {
      id: 'pdf',
      title: 'Document',
      avatar: { type: 'icon' as const, icon: 'file-text' },
    },
    {
      id: 'media',
      title: 'Photos & Videos',
      avatar: { type: 'icon' as const, icon: 'image' },
    },
    {
      id: 'location',
      title: 'Location',
      avatar: { type: 'icon' as const, icon: 'map-pin' },
    },
    {
      id: 'profile',
      title: 'Share Profile',
      avatar: { type: 'icon' as const, icon: 'user' },
    },
    // Sharing a contact is sourced from the active business's team, so it's
    // only offered in business-mode chats.
    ...(!isPersonalMode ? [{
      id: 'contact',
      title: 'Share Contact',
      avatar: { type: 'icon' as const, icon: 'users' },
    }] : []),
  ];

  // Function to get input colors based on state (matching AppSearchBar)
  const getInputColors = () => {
    const hasText = inputText && inputText.length > 0;
    const isInactive = !isInputFocused;
    const isActive = isInputFocused && !hasText;
    const isTyping = isInputFocused && hasText;
    
    if (isInactive) {
      return {
        backgroundColor: appTheme.colors.surface,
        textColor: appTheme.colors.textMuted,
        placeholderColor: appTheme.colors.textMuted,
        caretColor: appTheme.colors.textMuted,
      };
    } else if (isActive) {
      return {
        backgroundColor: appTheme.colors.surface,
        textColor: appTheme.colors.textMuted,
        placeholderColor: appTheme.colors.textMuted,
        caretColor: appTheme.colors.primary,
      };
    } else if (isTyping) {
      return {
        backgroundColor: appTheme.colors.surface,
        textColor: appTheme.colors.text,
        placeholderColor: appTheme.colors.textMuted,
        caretColor: appTheme.colors.primary,
      };
    }
    
    // Fallback
    return {
      backgroundColor: appTheme.colors.surface,
      textColor: appTheme.colors.textMuted,
      placeholderColor: appTheme.colors.textMuted,
      caretColor: appTheme.colors.textMuted,
    };
  };

  const inputColors = getInputColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top', 'bottom']}>
      <ChatHeader
        title={name || 'Chat'}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[
          { icon: 'search', onPress: () => setShowSearch(prev => !prev) },
          { icon: isGroupChat ? 'users' : (partnerType === 'business' ? 'building-2' : 'user'), onPress: handleViewProfile },
        ]}
        onTitlePress={handleViewProfile}
      />
      <ChatSearchBar
        visible={showSearch}
        onSearch={handleChatSearch}
        onClose={() => { setShowSearch(false); setChatSearchQuery(''); setSearchMatchIds([]); }}
        matchCount={searchMatchIds.length}
        currentMatchIndex={currentSearchIndex}
        onPrevious={() => handleSearchNavigate('prev')}
        onNext={() => handleSearchNavigate('next')}
      />
      {!isConnected && (
        <View style={[styles.offlineBanner, { backgroundColor: appTheme.colors.error || '#D6453E' }]}>
          <Icon name="wifi-off" size={14} color="#fff" />
          <Text style={styles.offlineBannerText}>No connection - messages will be sent when back online</Text>
        </View>
      )}
      <KeyboardAvoidingView
        style={[{ flex: 1 }, { backgroundColor: appTheme.colors.surface }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loadingMessages && messages.length === 0 ? (
          <View style={{ flex: 1, backgroundColor: appTheme.colors.surface, paddingHorizontal: 12, justifyContent: 'flex-end', paddingBottom: 12 }}>
            {/* Chat skeleton - mimics message bubbles */}
            {[
              { align: 'flex-start' as const, width: '55%' as const, height: 44 },
              { align: 'flex-end' as const, width: '65%' as const, height: 56 },
              { align: 'flex-start' as const, width: '45%' as const, height: 36 },
              { align: 'flex-end' as const, width: '50%' as const, height: 44 },
              { align: 'flex-start' as const, width: '70%' as const, height: 64 },
              { align: 'flex-end' as const, width: '40%' as const, height: 36 },
              { align: 'flex-start' as const, width: '60%' as const, height: 44 },
            ].map((bubble, i) => (
              <View key={i} style={{ alignSelf: bubble.align, marginBottom: 10 }}>
                <Skeleton width={bubble.width} height={bubble.height} borderRadius={12} />
              </View>
            ))}
          </View>
        ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { backgroundColor: appTheme.colors.surface }, messages.length === 0 && { flex: 1 }]}
          inverted
          onScrollToIndexFailed={onScrollToIndexFailed}
          style={{ backgroundColor: appTheme.colors.surface }}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.3}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={7}
          initialNumToRender={15}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={appTheme.colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loadingMessages ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, transform: [{ scaleY: -1 }] }}>
                <Icon name="message-circle" size={48} color={appTheme.colors.textSecondary} />
                <Text style={{ color: appTheme.colors.textSecondary, marginTop: 12, fontSize: 16, fontWeight: '500' }}>
                  No messages yet
                </Text>
                <Text style={{ color: appTheme.colors.textSecondary, marginTop: 4, fontSize: 14, opacity: 0.7 }}>
                  Send a message to start the conversation
                </Text>
              </View>
            ) : null
          }
        />
        )}

        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Edit Mode Banner */}
        {editingMessageId && (
          <View style={[styles.replyPreviewContainer, { backgroundColor: appTheme.colors.background, borderTopColor: appTheme.colors.borderColor }]}>
            <View style={[styles.replyPreviewBar, { backgroundColor: appTheme.colors.warning || '#F2A900' }]} />
            <View style={styles.replyPreviewContent}>
              <Text style={[styles.replyPreviewSender, { color: appTheme.colors.warning || '#F2A900' }]} numberOfLines={1}>
                Editing message
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setEditingMessageId(null); setInputText(''); }} style={styles.replyPreviewClose}>
              <Icon name="x" size={20} color={appTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Reply Preview */}
        {replyingTo && !editingMessageId && (
          <View style={[styles.replyPreviewContainer, { backgroundColor: appTheme.colors.background, borderTopColor: appTheme.colors.borderColor }]}>
            <View style={[styles.replyPreviewBar, { backgroundColor: appTheme.colors.primary }]} />
            <View style={styles.replyPreviewContent}>
              <Text style={[styles.replyPreviewSender, { color: appTheme.colors.primary }]} numberOfLines={1}>
                {replyingTo.isOutgoing ? 'You' : replyingTo.sender?.name || 'Unknown'}
              </Text>
              <Text style={[styles.replyPreviewText, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
                {getReplyPreviewText(replyingTo)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancelReply} style={styles.replyPreviewClose}>
              <Icon name="x" size={20} color={appTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Mention Suggestions (for group chats) */}
        {isGroupChat && showMentionSuggestions && (
          <MentionSuggestions
            suggestions={mentionSuggestionsList}
            onSelect={handleMentionSelect}
          />
        )}

        {voiceState === 'recording' ? (
          <VoiceRecorder
            duration={voiceDuration}
            onCancel={cancelRecording}
            onSend={handleSendVoice}
          />
        ) : (
        <View style={[styles.inputContainer, { borderTopColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.background }]}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: inputColors.backgroundColor,
                color: inputColors.textColor,
                textAlignVertical: 'center',
              }
            ]}
            placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
            placeholderTextColor={inputColors.placeholderColor}
            selectionColor={inputColors.caretColor}
            value={inputText}
            onChangeText={(text) => { setInputText(text); handleTyping(); if (isGroupChat) onMentionTextChange(text, text.length); }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => { setIsInputFocused(false); stopTyping(); }}
            multiline
          />
          {/* Show + button when not focused and no text (unless editing), otherwise show send/save button */}
          {!editingMessageId && !isInputFocused && inputText.trim().length === 0 ? (
            <TouchableOpacity
              onPress={() => setShowAttachmentSheet(true)}
              style={[
                styles.sendButton,
                {
                  backgroundColor: appTheme.colors.textMuted,
                }
              ]}
            >
              <Icon name="plus" size={24} color={appTheme.colors.textInverse} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSend}
              disabled={inputText.trim().length === 0}
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim().length > 0
                    ? (editingMessageId ? (appTheme.colors.warning || '#F2A900') : appTheme.colors.primary)
                    : appTheme.colors.textMuted,
                  opacity: inputText.trim().length > 0 ? 1 : 0.5,
                }
              ]}
            >
              <Icon name={editingMessageId ? "check" : "send"} size={20} color={appTheme.colors.textInverse} />
            </TouchableOpacity>
          )}
        </View>
        )}
      </KeyboardAvoidingView>

      {/* Participants Bottom Sheet for Group Chats */}
      <AppBottomSheet
        visible={showParticipantsSheet}
        onClose={() => setShowParticipantsSheet(false)}
        title="Group Members"
      >
        <View>
          {participants.map((participant, index) => (
            <ListItemCard
              key={participant.id || index}
              avatar={{
                type: participant.avatar ? 'image' : 'initials',
                imageUri: participant.avatar || undefined,
                userName: participant.name,
                userId: participant.id,
              }}
              title={participant.name}
              subtitle={participant.role && participant.role !== 'user' && participant.role !== 'staff' 
                ? participant.role.charAt(0).toUpperCase() + participant.role.slice(1) 
                : undefined}
              showOptionsButton
              onOptionsPress={() => {
                setSelectedParticipant(participant);
                setShowParticipantOptionsSheet(true);
              }}
              showDivider={index < participants.length - 1}
              onPress={() => !participant.isCurrentUser && handleParticipantPress(participant)}
            />
          ))}
        </View>
      </AppBottomSheet>
      
      {/* Participant Options Bottom Sheet */}
      <AppBottomSheet
        visible={showParticipantOptionsSheet}
        onClose={() => {
          setShowParticipantOptionsSheet(false);
          setSelectedParticipant(null);
        }}
        title={selectedParticipant?.name || 'Options'}
        items={selectedParticipant?.isCurrentUser 
          ? [
              {
                id: 'leave-group',
                title: 'Leave group',
                avatar: { type: 'icon', icon: 'log-out' },
                variant: 'destructive',
              },
            ]
          : [
              {
                id: 'view-profile',
                title: 'View profile',
                avatar: { type: 'icon', icon: 'user' },
              },
              {
                id: 'remove-from-group',
                title: 'Remove from group',
                avatar: { type: 'icon', icon: 'user-minus' },
                variant: 'destructive',
              },
            ]
        }
        onSelectItem={(item) => {
          if (item.id === 'leave-group') {
            setShowParticipantOptionsSheet(false);
            setShowParticipantsSheet(false);
            AppAlert.alert(
              'Leave Group',
              'Are you sure you want to leave this group?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Leave',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (activeBusiness?.id) {
                        await leaveChat(activeBusiness.id, id);
                      } else if (currentUser?.id) {
                        await leaveUserChat(currentUser.id, id);
                      }
                      // Remove chat from local store
                      useInboxStore.getState().updateChat(id, { participants: [] });
                      navigation.goBack();
                    } catch (err: any) {
                      AppAlert.alert('Error', err?.message || 'Failed to leave group');
                    }
                  }
                },
              ]
            );
          } else if (item.id === 'view-profile') {
            setShowParticipantOptionsSheet(false);
            if (selectedParticipant) {
              handleParticipantPress(selectedParticipant);
            }
          } else if (item.id === 'remove-from-group') {
            setShowParticipantOptionsSheet(false);
            AppAlert.alert(
              'Remove Member',
              `Are you sure you want to remove ${selectedParticipant?.name} from this group?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Remove',
                  style: 'destructive',
                  onPress: async () => {
                    if (!selectedParticipant) return;
                    try {
                      if (activeBusiness?.id) {
                        await removeChatParticipant(activeBusiness.id, id, selectedParticipant.id);
                      } else if (currentUser?.id) {
                        await removeUserChatParticipant(currentUser.id, id, selectedParticipant.id);
                      }
                      // The socket event will update the chat's participant list
                      // Close the participants sheet to reflect the change
                      setShowParticipantsSheet(false);
                      setSelectedParticipant(null);
                    } catch (err: any) {
                      AppAlert.alert('Error', err?.message || 'Failed to remove member');
                      setSelectedParticipant(null);
                    }
                  }
                },
              ]
            );
          }
        }}
      />
      
      {/* Message Options Bottom Sheet (shared, lifted from MessageBubble) */}
      <AppBottomSheet
        visible={!!selectedMessageId}
        onClose={() => setSelectedMessageId(null)}
        title="Message Options"
        items={messageOptionsItems}
        onSelectItem={handleMessageOptionSelect}
      />

      {/* Attachment Options Bottom Sheet */}
      <AppBottomSheet
        visible={showAttachmentSheet}
        onClose={() => setShowAttachmentSheet(false)}
        title="Add Attachment"
        items={attachmentOptions}
        onSelectItem={handleAttachmentSelect}
      />

      {/* Contact Picker (share a team member as a contact) */}
      <AppBottomSheet
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        title="Share Contact"
        fullHeight
      >
        {contactsLoading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={appTheme.colors.primary} />
          </View>
        ) : contacts.length === 0 ? (
          <Text style={{ textAlign: 'center', paddingVertical: 24, color: appTheme.colors.textSecondary }}>
            No contacts to share yet.
          </Text>
        ) : (
          contacts.map((member, idx) => (
            <ListItemCard
              key={member.id}
              avatar={
                member.avatar
                  ? { type: 'image', imageUri: member.avatar }
                  : { type: 'initials', userName: member.name, userId: member.id }
              }
              title={member.name}
              subtitle={member.phone || member.email}
              onPress={() => handleSelectContact(member)}
              showDivider={idx < contacts.length - 1}
            />
          ))
        )}
      </AppBottomSheet>

      {/* Forward Chat Picker */}
      <ForwardChatPicker
        visible={!!forwardingMessageId}
        onClose={() => setForwardingMessageId(null)}
        onSelect={handleForwardToChat}
      />

      {/* Full-screen Image Viewer */}
      <ImageViewerModal
        isVisible={!!imageViewerData}
        imageUrl={imageViewerData?.url || null}
        senderName={imageViewerData?.sender || null}
        timestamp={imageViewerData?.timestamp || null}
        messageId={imageViewerData?.messageId || null}
        onClose={() => setImageViewerData(null)}
        onReply={(msgId) => { setImageViewerData(null); handleReplyMessage(msgId); }}
        onShare={(url) => { Share.share({ url }); }}
        onForward={(msgId) => { setImageViewerData(null); setForwardingMessageId(msgId); }}
        onDelete={(msgId) => { setImageViewerData(null); handleDeleteMessage(msgId); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  bubble: {
    borderRadius: 12,
    padding: 8,
    marginBottom: 2,
    overflow: 'visible',
  },
  bubbleIncoming: {
    marginLeft: 0,
  },
  bubbleOutgoing: {
    marginRight: 0,
  },
  bubbleContainerIncoming: {
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  bubbleContainerOutgoing: {
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  textIncoming: {
    fontSize: 16,
    lineHeight: 22,
  },
  textOutgoing: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    marginRight: 2,
  },
  image: { 
    width: '100%',
    aspectRatio: 1,
  },
  // Special Message Bubble (Order, Invoice)
  specialMessageBubble: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 200,
  },
  specialMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  specialMessageIcon: {
    marginRight: 8,
  },
  specialMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  specialMessageSubtext: {
    fontSize: 14,
    marginBottom: 4,
  },
  
  // Order specific styles
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderDetailsContainer: {
    marginBottom: 4,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  orderDetailLabel: {
    fontSize: 14,
  },
  orderDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderDetailValueBold: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderActionsContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  orderActionBtnSpacing: {
    marginTop: 6,
  },
  // Event/System messages - distinct from Date Separators
  eventBubble: {
    alignSelf: 'center',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginVertical: 4,
  },
  eventText: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '400',
    textAlign: 'center',
  },
  // Date Separator (WhatsApp style day headers)
  dateSeparatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  dateSeparatorBubble: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dateSeparatorText: {
    fontSize: 14,
    fontFamily: 'InterCustom-medium',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 21,
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  sendButton: {
    borderRadius: 21,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  importLabel: {
    fontWeight: 'bold',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  exportLabel: {
    fontWeight: 'bold',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  statusPaid: {
    fontWeight: 'bold',
  },
  statusUnpaid: {
    fontWeight: 'bold',
  },
  statusDone: {
    fontWeight: 'bold',
  },
  statusNew: {
    fontWeight: 'bold',
  },
  statusOngoing: {
    fontWeight: 'bold',
  },
  statusPending: {
    fontWeight: 'bold',
  },
  statusCancel: {
    fontWeight: 'bold',
  },
  statusDefault: {
    fontWeight: 'bold',
  },
  listContent: {
    paddingVertical: 10,
    paddingBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  replyPreviewBar: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginRight: 10,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewSender: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 14,
  },
  replyPreviewClose: {
    padding: 4,
    marginLeft: 8,
  },
  imageBubbleContainer: {
    maxWidth: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  imageTimestampOutgoing: {
  },
  imageOverlayOutgoing: {
  },
  replyContextContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    paddingLeft: 8,
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
  },
  replyContextContainerIncoming: {
    borderLeftWidth: 4,
  },
  replyContextContainerOutgoing: {
    borderLeftWidth: 4,
  },
  replyContextIndicator: {
    width: 4,
    marginRight: 8,
  },
  replyContextTextContainer: {
    flex: 1,
  },
  replyContextSender: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 2,
  },
  replyContextSnippet: {
    fontSize: 13,
  },
  deletedBubble: {
    flexDirection: 'column',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 2,
    maxWidth: '75%',
  },
  deletedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inlineIcon: {
    marginRight: 8,
  },
  container: {
    flex: 1,
  },
  bubbleWithReply: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: 0,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 14, // Match the icon size
  },
  messageStatusIcon: {
    marginLeft: 1,
  },
  imageTimestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  imageTimestamp: {
    fontSize: 11,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
}); 