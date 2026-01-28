import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Share,
  Alert,
  Keyboard,
  Linking,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { ChatHeader } from '@/shared/components/layout/headers';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import AppButton from '@/shared/components/ui/AppButton';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import { ListItemCard } from '@/shared/components/ui/ListItemCard';
import { getMessagesForChat } from '@/shared/data/mockChatMessages';
import { getMessages, sendMessage, markChatAsRead } from '../inbox.service';
import { MessageBubble } from '../components/MessageBubble';
import type { Message, OrderMessage, TextMessage, EventMessage, DeletedMessage } from '@/shared/types/inbox';

// Order status colors from design.json
const ORDER_STATUS_COLORS: Record<string, string> = {
  'pending': '#FFB600',
  'accepted': '#0075FF',
  'completed': '#2ACF01',
  'cancelled': '#A4AAB8',
  'Done': '#2ACF01',
  'New': '#6E0000',
  'Ongoing': '#0075FF',
  'Pending': '#FFB600',
  'Cancel': '#FF6B6B',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  'Paid': '#2ACF01',
  'Unpaid': '#FF2400',
  'Payment Pending Confirmation': '#FFB600',
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
  
  // Get active business from store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  // Load messages from API or fallback to mock
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  
  // Fetch messages from API
  useEffect(() => {
    const fetchChatMessages = async () => {
      if (!activeBusiness?.id) {
        // No active business - use mock data
        const mockMessages = getMessagesForChat(id) as Message[];
        setMessages(mockMessages);
        setLoadingMessages(false);
        return;
      }
      
      try {
        setLoadingMessages(true);
        const result = await getMessages({
          companyId: activeBusiness.id,
          chatId: id,
          limit: 50,
        });
        setMessages(result.messages);
        
        // Mark chat as read
        await markChatAsRead(activeBusiness.id, id);
      } catch (error) {
        console.error('Failed to load messages from API, falling back to mock:', error);
        // Fallback to mock data
        const mockMessages = getMessagesForChat(id) as Message[];
        setMessages(mockMessages);
      } finally {
        setLoadingMessages(false);
      }
    };
    
    fetchChatMessages();
  }, [id, activeBusiness?.id]);
  
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false); // Track if we've already marked this chat as read
  const [showParticipantsSheet, setShowParticipantsSheet] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<{ id: string; name: string; avatar: string; role: string; isCurrentUser?: boolean } | null>(null);
  const [showParticipantOptionsSheet, setShowParticipantOptionsSheet] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  
  // Extract unique participants from messages for group chats
  // Also detect group chats by having multiple unique senders
  const participants = React.useMemo(() => {
    const participantMap = new Map<string, { id: string; name: string; avatar: string; role: string; isCurrentUser?: boolean }>();
    
    // Add current user first
    participantMap.set('You', {
      id: 'current-user',
      name: 'You',
      avatar: '',
      role: 'user',
      isCurrentUser: true,
    });
    
    messages.forEach(msg => {
      if (msg.type !== 'event' && msg.sender && msg.sender.name !== 'You' && msg.sender.name !== 'System') {
        if (!participantMap.has(msg.sender.name)) {
          participantMap.set(msg.sender.name, {
            id: msg.sender.id || msg.sender.name,
            name: msg.sender.name,
            avatar: msg.sender.avatar || '',
            role: msg.sender.role || 'user',
            isCurrentUser: false,
          });
        }
      }
    });
    
    return Array.from(participantMap.values());
  }, [messages]);
  
  // Detect if this is a group chat (3+ participants including "You", or explicitly marked as group)
  // participants.length > 2 means You + 2+ others = group chat
  const isGroupChat = isGroup || partnerType === 'group' || participants.length > 2;

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
        console.log(`Marked chat ${id} as viewed and reduced inbox unread chats count by ${unreadCount > 0 ? 1 : 0}`);
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
    if (scrollToMessage && searchQuery && !hasScrolledToMessage.current) {
      const messageIndex = findMessageWithQuery(searchQuery);
      
      if (messageIndex !== -1 && flatListRef.current) {
        // Wait for the list to render
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ 
            index: messageIndex, 
            animated: true,
            viewPosition: 0.5 // Center the item
          });
          hasScrolledToMessage.current = true;
        }, 500);
      }
    }
  }, [messages, scrollToMessage, searchQuery]);

  // Format date for date separators (WhatsApp style)
  const formatDateSeparator = (timestamp: string): string => {
    // If timestamp is just time (HH:MM), assume today
    if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
      return 'Today';
    }
    
    const messageDate = new Date(timestamp);
    if (isNaN(messageDate.getTime())) {
      return '';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const msgDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    if (msgDateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (msgDateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else if (msgDateOnly > oneWeekAgo) {
      // Under 1 week: show day name only
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      // Over 1 week: show day + full date (e.g., "Mon, 23 Jan 2025")
      const dayName = messageDate.toLocaleDateString('en-US', { weekday: 'short' });
      const day = messageDate.getDate();
      const month = messageDate.toLocaleDateString('en-US', { month: 'short' });
      const year = messageDate.getFullYear();
      return `${dayName}, ${day} ${month} ${year}`;
    }
  };

  // Get date string for comparison (YYYY-MM-DD format)
  const getDateKey = (timestamp: string): string => {
    if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
      // Just time, assume today
      const today = new Date();
      return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '';
    }
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

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
    const isSameSenderAsPrev = !!(prevMessage && prevMessage.sender.name === item.sender.name && prevMessage.type !== 'event' && item.type !== 'event');
    const isSameSenderAsNext = !!(nextMessage && nextMessage.sender.name === item.sender.name && nextMessage.type !== 'event' && item.type !== 'event');
    
    // isGrouped for 4px gap: only apply when SAME sender as message BELOW (prevMessage in inverted list)
    // This controls the bottom margin of this message
    const isGrouped = isSameSenderAsPrev;
    const isFirstInGroup = !isSameSenderAsNext; // No same sender ABOVE = top of group visually (show avatar here)
    const isLastInGroup = !isSameSenderAsPrev; // No same sender BELOW = bottom of group visually
    
    // Show sender name only in group chats with more than 2 users (participants > 1 means 3+ people including "You")
    const showSenderName = !item.isOutgoing && item.type !== 'event' && isGroupChat;
    
    return (
      <View>
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
          isGrouped={isGrouped}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
          showSenderName={showSenderName}
          isGroupChat={isGroupChat}
        />
        {/* Date separator appears AFTER the message in inverted list (so it shows ABOVE in UI) */}
        {showDateSeparator && dateLabel && (
          <DateSeparator date={dateLabel} />
        )}
      </View>
    );
  };

  // Handle errors in scrollToIndex
  const onScrollToIndexFailed = (info: { index: number; averageItemLength: number }) => {
    // Wait a bit and try again with different approach
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ 
          offset: info.averageItemLength * info.index,
          animated: true
        });
      }
    }, 100);
  };

  // Navigate to Delivery Details screen (orders map to deliveries)
  const handleOrderPress = (orderId: string) => {
    (navigation as any).navigate('DeliveryDetail', { deliveryId: orderId });
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
    
    // Optimistic update - add message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: TextMessage = {
      id: tempId,
      chatId: id,
      type: 'text',
      text: inputText,
      isOutgoing: true,
      sender: { 
        id: 'current-user', 
        name: 'You', 
        avatar: '', 
        role: 'business' 
      },
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prevMessages => [optimisticMessage, ...prevMessages]);
    const messageText = inputText;
    setInputText('');
    Keyboard.dismiss();
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }

    // Send to API if business is active
    if (activeBusiness?.id) {
      try {
        const sentMessage = await sendMessage(activeBusiness.id, id, {
          type: 'text',
          content: messageText,
        });
        
        // Replace optimistic message with real one
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? sentMessage : msg
          )
        );
      } catch (error) {
        console.error('Failed to send message:', error);
        // Update status to failed
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? { ...msg, status: 'failed' } as Message : msg
          )
        );
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } else {
      // No active business - simulate delivery for mock mode
      setTimeout(() => {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? { ...msg, status: 'delivered' } as Message : msg
          )
        );
      }, 1000);

      setTimeout(() => {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? { ...msg, status: 'seen' } as Message : msg
          )
        );
      }, 2000);
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
  
  const handleOrderAction = (type: string, message: Message) => {
    // Type guard to ensure message is an OrderMessage
    if (message.type !== 'order') return;
    const msg = message as OrderMessage;
    
    console.log('Order action:', type, 'for message:', msg.id, 'Order ID:', msg.orderId);
    if (type === 'delivery') {
      if (msg.orderStatus === 'Ongoing' || msg.orderStatus === 'New') {
        updateOrderMessage(msg.id, { orderStatus: 'Delivery Pending Confirmation' });
      } else if (msg.orderStatus === 'Delivery Pending Confirmation') {
        updateOrderMessage(msg.id, { orderStatus: 'Done' });
        const importExportLabel = msg.isOutgoing ? 'Import' : 'Export';
        addEventMessage(msg.orderId, importExportLabel);
      }
    } else if (type === 'payment') {
      if (msg.paymentStatus === 'Unpaid') {
        updateOrderMessage(msg.id, { paymentStatus: 'Payment Pending Confirmation' });
      } else if (msg.paymentStatus === 'Payment Pending Confirmation') {
        updateOrderMessage(msg.id, { paymentStatus: 'Paid' });
      }
    } else if (type === 'invoice') {
      Alert.alert('Invoice', 'Show invoice/receipt for order ' + msg.orderId);
    }
  };

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

  const handleOpenDocument = async (fileName: string) => {
    // For demo purposes, show document options
    // In production, this would open a document viewer
    Alert.alert(
      fileName,
      'Document Preview',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Download', 
          onPress: () => handleDownloadDocument(fileName)
        },
        { 
          text: 'Share', 
          onPress: async () => {
            try {
              // Share the document
              await Share.share({
                message: `Document: ${fileName}`,
                title: fileName,
              });
            } catch (error) {
              console.error('Share error:', error);
            }
          }
        },
      ]
    );
  };
  
  const handleDownloadDocument = async (fileName: string) => {
    // In a real app, this would download from a server URL
    // For demo, we'll show a success message
    Alert.alert(
      'Download Started',
      `Downloading ${fileName}...`,
      [
        { 
          text: 'OK', 
          onPress: () => {
            // Simulate download completion
            setTimeout(() => {
              Alert.alert('Download Complete', `${fileName} has been saved to your device`);
            }, 1500);
          }
        }
      ]
    );
  };

  const handleDeleteMessage = (messageId: string) => {
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
  };

  const handleReplyMessage = (messageId: string) => {
    // Find the message to reply to
    const messageToReply = messages.find(msg => msg.id === messageId);
    if (messageToReply && messageToReply.type === 'text') {
      // TODO: Implement reply functionality - set reply context in input area
      Alert.alert('Reply', `Replying to: "${messageToReply.text.substring(0, 50)}..."`);
    } else {
      Alert.alert('Reply', 'Replying to this message');
    }
  };

  const handleInvoicePress = (invoiceId: string) => {
    (navigation as any).navigate('InvoiceDetails', { invoiceId });
  };

  const handleEstimatePress = (estimateId: string) => {
    (navigation as any).navigate('InvoiceDetails', { invoiceId: estimateId });
  };

  const handleEstimateConfirm = async (estimateId: string) => {
    Alert.alert(
      'Confirm Estimate',
      'Convert this estimate to an invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // TODO: Implement estimate conversion when invoice service is connected
            Alert.alert('Success', 'Estimate has been converted to invoice');
          },
        },
      ]
    );
  };

  const handleOrderEventAction = (actionId: string, orderId: string) => {
    console.log('Order event action:', actionId, 'for order:', orderId);
    // TODO: Implement order event actions (confirm delivery, confirm payment, etc.)
    Alert.alert('Order Action', `Action "${actionId}" for order ${orderId}`);
  };

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
        rightAction={{ icon: isGroupChat ? 'users' : (partnerType === 'business' ? 'building-2' : 'user'), onPress: handleViewProfile }}
        onTitlePress={handleViewProfile}
      />
      <KeyboardAvoidingView
        style={[{ flex: 1 }, { backgroundColor: appTheme.colors.surface }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { backgroundColor: appTheme.colors.surface }]}
          inverted={true}
          onScrollToIndexFailed={onScrollToIndexFailed}
          style={{ backgroundColor: appTheme.colors.surface }}
        />

        <View style={[styles.inputContainer, { borderTopColor: appTheme.colors.borderColor, backgroundColor: appTheme.colors.background }]}>
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: inputColors.backgroundColor,
                color: inputColors.textColor,
                textAlignVertical: 'center',
              }
            ]}
            placeholder="Type a message..."
            placeholderTextColor={inputColors.placeholderColor}
            selectionColor={inputColors.caretColor}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            multiline
          />
            <TouchableOpacity 
              onPress={handleSend} 
            disabled={inputText.trim().length === 0}
              style={[
                styles.sendButton, 
                { 
                  backgroundColor: inputText.trim().length > 0 
                    ? appTheme.colors.primary 
                  : appTheme.colors.textMuted,
                opacity: inputText.trim().length > 0 ? 1 : 0.5,
                }
              ]}
            >
              <Icon name="send" size={20} color={appTheme.colors.textInverse} />
            </TouchableOpacity>
        </View>
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
            Alert.alert(
              'Leave Group',
              'Are you sure you want to leave this group?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Leave', 
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement leave group logic
                    navigation.goBack();
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
            Alert.alert(
              'Remove Member',
              `Are you sure you want to remove ${selectedParticipant?.name} from this group?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Remove', 
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement remove member logic
                    setSelectedParticipant(null);
                  }
                },
              ]
            );
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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