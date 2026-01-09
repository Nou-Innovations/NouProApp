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
import { getMessagesForChat } from '@/shared/data/mockChatMessages';

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

// Add message type definitions
interface Sender {
  name: string;
  avatar: string;
  role: string;
}

interface BaseMessage {
  id: string;
  type: string;
  isOutgoing: boolean;
  sender: {
    name: string;
    avatar: string;
    role: string;
  };
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface ReplyContext {
  senderName: string;
  messageSnippet: string;
  messageId: string;
}

interface TextMessage extends BaseMessage {
  type: 'text';
  text: string;
  replyingTo?: ReplyContext;
}

interface OrderMessage extends BaseMessage {
  type: 'order';
  orderId: string;
  itemCount: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  replyingTo?: ReplyContext;
}

interface ImageMessage extends BaseMessage {
  type: 'image';
  imageUrl: string;
  replyingTo?: ReplyContext;
}

interface VoiceMessage extends BaseMessage {
  type: 'voice';
  replyingTo?: ReplyContext;
}

interface PdfMessage extends BaseMessage {
  type: 'pdf';
  fileName: string;
  replyingTo?: ReplyContext;
}

interface InvoiceMessage extends BaseMessage {
  type: 'invoice';
  invoiceId: string;
  replyingTo?: ReplyContext;
}

interface EventMessage extends BaseMessage {
  type: 'event';
  event: string;
}

interface DeletedMessage extends BaseMessage {
  type: 'deleted';
  text?: undefined;
  imageUrl?: undefined;
  orderId?: undefined;
  fileName?: undefined;
  invoiceId?: undefined;
  replyingTo?: undefined;
}

interface LocationMessage extends BaseMessage {
  type: 'location';
  locationName: string;
  address: string;
  replyingTo?: ReplyContext;
}

interface ContactMessage extends BaseMessage {
  type: 'contact';
  contactName: string;
  contactPhone: string;
  replyingTo?: ReplyContext;
}

type Message = TextMessage | OrderMessage | ImageMessage | VoiceMessage | PdfMessage | InvoiceMessage | EventMessage | DeletedMessage | LocationMessage | ContactMessage;

interface MessageBubbleProps {
  message: Message;
  onOrderAction: (type: string, message: OrderMessage) => void;
  onOrderPress: (orderId: string) => void;
  onOpenDocument: (fileName: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

function MessageBubble({ message, onOrderAction, onOrderPress, onOpenDocument, onDeleteMessage }: MessageBubbleProps) {
  const isOutgoing = message.isOutgoing;
  const { theme: appTheme, isDarkMode } = useTheme();
  
  // Handle long press to show delete option
  const handleLongPress = () => {
    if (message.type === 'deleted' || message.type === 'event') return; // Can't delete already deleted or event messages
    
    Alert.alert(
      'Message Options',
      'What would you like to do with this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Message', 
          style: 'destructive',
          onPress: () => onDeleteMessage(message.id)
        },
      ]
    );
  };
  
  const bubbleStyle = [
    styles.bubble,
    isOutgoing 
      ? [styles.bubbleOutgoing, { backgroundColor: appTheme.colors.primary }] 
      : [styles.bubbleIncoming, { backgroundColor: '#FFFFFF' }],
  ];
  const textStyle = isOutgoing ? styles.textOutgoing : [styles.textIncoming, { color: appTheme.colors.text }];

  // Message bubble timestamp - ONLY shows time (HH:MM), no date
  const formatSmartTimestamp = (timestamp: string): string => {
    // If timestamp is just time (HH:MM), return as-is
    if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
      return timestamp;
    }
    
    // Try to parse as a date
    const messageDate = new Date(timestamp);
    if (isNaN(messageDate.getTime())) {
      return timestamp; // Return as-is if not a valid date
    }
    
    // Return only the time (HH:MM format)
    return messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Helper for status colors using design.json colors
  const getOrderStatusColor = (status: string): string => {
    return ORDER_STATUS_COLORS[status] || appTheme.colors.text;
  };
  
  const getPaymentStatusColor = (status: string): string => {
    return PAYMENT_STATUS_COLORS[status] || '#FF2400';
  };

  // Render Reply Context UI (pass isOutgoing)
  const renderReplyContext = (isOutgoingReply: boolean) => {
    if (message.type !== 'text' || !message.replyingTo) return null;
    
    const senderColor = isOutgoingReply ? appTheme.colors.textInverse : appTheme.colors.text;
    const snippetColor = isOutgoingReply ? appTheme.colors.textInverse : appTheme.colors.textSecondary;
    
    return (
      <View style={[styles.replyContextContainer, isOutgoingReply ? styles.replyContextContainerOutgoing : styles.replyContextContainerIncoming]}>
        <View style={[styles.replyContextIndicator, { backgroundColor: isOutgoingReply ? appTheme.colors.textInverse : appTheme.colors.accent }]} />
        <View style={styles.replyContextTextContainer}>
          <Text style={[styles.replyContextSender, { color: senderColor }]}>{message.replyingTo.senderName}</Text>
          <Text style={[styles.replyContextSnippet, { color: snippetColor }]} numberOfLines={1}>
            {message.replyingTo.messageSnippet}
          </Text>
        </View>
      </View>
    );
  };

  // Determine alignment for the bubble container
  const bubbleContainerStyle = isOutgoing ? styles.bubbleContainerOutgoing : styles.bubbleContainerIncoming;

  // Add new component for message status
  const MessageStatus = ({ status }: { status?: 'sent' | 'delivered' | 'read' }) => {
    if (!status) return null;
    
    let iconName: 'checkmark' | 'checkmark-done' = 'checkmark';
    let iconColor = appTheme.colors.textMuted;
    
    if (status === 'delivered' || status === 'read') {
      iconName = 'checkmark-done';
      // Read status uses accent color (double checkmarks)
      iconColor = status === 'read' ? appTheme.colors.accent : appTheme.colors.textMuted;
    }
    
    return (
      <View style={styles.messageStatusContainer}>
        <Icon 
          name={iconName} 
          size={12} 
          color={iconColor} 
          style={styles.messageStatusIcon}
        />
      </View>
    );
  };

  // Render text with clickable links
  const renderTextWithLinks = (text: string, textStyle: any, isOutgoing: boolean) => {
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    const matches = text.match(urlRegex) || [];
    
    if (matches.length === 0) {
      return <Text style={textStyle}>{text}</Text>;
    }
    
    const elements: React.ReactNode[] = [];
    let matchIndex = 0;
    
    parts.forEach((part, index) => {
      if (part) {
        // Check if this part is a URL
        if (urlRegex.test(part)) {
          urlRegex.lastIndex = 0; // Reset regex
          const url = part.startsWith('http') ? part : `https://${part}`;
          elements.push(
            <Text
              key={`link-${index}`}
              style={[
                textStyle,
                styles.linkText,
                { color: isOutgoing ? '#93C5FD' : '#2563EB' }
              ]}
              onPress={() => handleLinkPress(url)}
            >
              {part}
            </Text>
          );
        } else {
          elements.push(
            <Text key={`text-${index}`} style={textStyle}>
              {part}
            </Text>
          );
        }
      }
    });
    
    return <Text style={textStyle}>{elements}</Text>;
  };

  const handleLinkPress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        Alert.alert(
          'Open Link',
          `Open ${url}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open', onPress: () => Linking.openURL(url) },
            { text: 'Copy', onPress: () => {
              // In a real app, use Clipboard API
              Alert.alert('Copied', 'Link copied to clipboard');
            }},
          ]
        );
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Could not open link');
    }
  };

  // Update the timestamp rendering in renderMessageContent
  const renderTimestamp = (timestamp: string, isOutgoing: boolean, status?: 'sent' | 'delivered' | 'read') => {
    const formattedTime = formatSmartTimestamp(timestamp);
    return (
      <View style={styles.timestampContainer}>
        <Text style={[
          styles.timestamp, 
          { color: isOutgoing ? 'rgba(255,255,255,0.7)' : appTheme.colors.textSecondary }
        ]}>
          {formattedTime}
        </Text>
        {isOutgoing && status && <MessageStatus status={status} />}
      </View>
    );
  };

  // Update the message content rendering to use the new timestamp component
  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
            {!isOutgoing && message.sender.avatar ? <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} /> : null}
            <View style={bubbleContainerStyle}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onLongPress={handleLongPress}
                delayLongPress={500}
              >
                <View style={[
                  bubbleStyle, 
                  message.replyingTo && styles.bubbleWithReply
                ]}>
                  {renderReplyContext(isOutgoing)}
                  {renderTextWithLinks(message.text, textStyle, isOutgoing)}
                  {renderTimestamp(message.timestamp, isOutgoing, message.status)}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'pdf':
        return (
          <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
            {!isOutgoing && message.sender.avatar ? (
              <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} />
            ) : null}
            <View style={bubbleContainerStyle}>
              {renderReplyContext(isOutgoing)}
              <TouchableOpacity 
                style={bubbleStyle} 
                onPress={() => onOpenDocument(message.fileName)}
                onLongPress={handleLongPress}
                delayLongPress={500}
              >
                <View style={styles.iconTextRow}>
                  <Icon name="file-text" size={18} color={isOutgoing ? '#f9fafb' : '#1f2937'} style={styles.inlineIcon}/>
                  <Text style={textStyle}>{message.fileName || 'Invoice.pdf'}</Text>
                </View>
                <Text style={[{ fontSize: 12, opacity: 0.6 }, isOutgoing ? { color: '#f9fafb' } : { color: '#1f2937' }]}>
                  Tap to view
                </Text>
                {renderTimestamp(message.timestamp, isOutgoing, message.status)}
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'invoice':
        return (
          <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
            {!isOutgoing && message.sender.avatar ? <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} /> : null}
            <View style={bubbleContainerStyle}>
              <TouchableOpacity 
                style={[
                  styles.specialMessageBubble,
                  isOutgoing ? { backgroundColor: appTheme.colors.primary } : { backgroundColor: '#FFFFFF' },
                ]} 
                onPress={() => console.log('Open Invoice', message.invoiceId)}
                onLongPress={handleLongPress}
                delayLongPress={500}
              >
                <View style={styles.specialMessageHeader}>
                  <Icon 
                    name="receipt-outline" 
                    size={18} 
                    color={isOutgoing ? '#FFFFFF' : appTheme.colors.primary} 
                    style={styles.specialMessageIcon}
                  />
                  <Text style={[
                    styles.specialMessageTitle,
                    { color: isOutgoing ? '#FFFFFF' : appTheme.colors.text }
                  ]} numberOfLines={1}>
                    Invoice #{message.invoiceId}
                  </Text>
                </View>
                <Text style={[
                  styles.specialMessageSubtext,
                  { color: isOutgoing ? 'rgba(255,255,255,0.7)' : appTheme.colors.textSecondary }
                ]}>
                  Tap to view invoice details
                </Text>
                {renderTimestamp(message.timestamp, isOutgoing, message.status)}
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'order': {
        const isImport = message.isOutgoing;
        const importExportLabel = isImport ? 'Import' : 'Export';
        const showMarkPaymentDone = isImport && message.paymentStatus === 'Unpaid';
        const showConfirmPayment = !isImport && message.paymentStatus === 'Payment Pending Confirmation';
        const showMarkDeliveryDone = !isImport && (message.orderStatus === 'Ongoing' || message.orderStatus === 'New');
        const showConfirmDelivery = isImport && message.orderStatus === 'Delivery Pending Confirmation';
        const showSeeInvoice = message.paymentStatus === 'Paid';
        
        const orderBgColor = isOutgoing ? appTheme.colors.primary : '#FFFFFF';
        const orderTextColor = isOutgoing ? '#FFFFFF' : appTheme.colors.text;
        const orderSubTextColor = isOutgoing ? 'rgba(255,255,255,0.7)' : appTheme.colors.textSecondary;
        const orderBorderColor = getOrderStatusColor(message.orderStatus);
        
        return (
          <View style={[styles.row, isImport ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
            {!isImport && message.sender.avatar ? (
              <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} />
            ) : null}
            <View style={bubbleContainerStyle}>
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => onOrderPress(message.orderId)}
                onLongPress={handleLongPress}
                delayLongPress={500}
                style={[
                  styles.specialMessageBubble,
                  { 
                    backgroundColor: orderBgColor,
                    borderWidth: 0.5,
                    borderColor: orderBorderColor,
                  },
                ]}
              >
                {/* Header - Icon + Import/Export badge */}
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Icon name="cube-outline" size={18} color={isOutgoing ? '#FFFFFF' : appTheme.colors.primary} />
                    <View style={[
                      styles.orderTypeBadge, 
                      { backgroundColor: isImport ? '#2ACF01' : '#FF7A00' }
                    ]}>
                      <Text style={styles.orderTypeBadgeText}>{importExportLabel}</Text>
                  </View>
                    </View>
                </View>
                
                {/* Order ID on second line */}
                <Text style={[styles.orderIdText, { color: orderTextColor }]}>
                  #{message.orderId}
                    </Text>
                
                {/* Order Details */}
                <View style={styles.orderDetailsContainer}>
                  <View style={styles.orderDetailRow}>
                    <Text style={[styles.orderDetailLabel, { color: orderSubTextColor }]}>Items</Text>
                    <Text style={[styles.orderDetailValueBold, { color: orderTextColor }]}>{message.itemCount}</Text>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Text style={[styles.orderDetailLabel, { color: orderSubTextColor }]}>Total</Text>
                    <Text style={[styles.orderDetailValueBold, { color: orderTextColor }]}>
                      ${message.totalAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Text style={[styles.orderDetailLabel, { color: orderSubTextColor }]}>Status</Text>
                    <Text style={[
                      styles.orderDetailValueBold,
                      { color: getOrderStatusColor(message.orderStatus) }
                    ]}>
                      {message.orderStatus}
                    </Text>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Text style={[styles.orderDetailLabel, { color: orderSubTextColor }]}>Payment</Text>
                    <Text style={[
                      styles.orderDetailValueBold,
                      { color: getPaymentStatusColor(message.paymentStatus) }
                    ]}>
                      {message.paymentStatus}
                    </Text>
                  </View>
                </View>
                
                {/* Action Buttons */}
                {(showMarkPaymentDone || showConfirmPayment || showMarkDeliveryDone || showConfirmDelivery || showSeeInvoice) && (
                  <View style={styles.orderActionsContainer}>
                    {showMarkPaymentDone && (
                      <TouchableOpacity 
                        style={[styles.orderActionBtn, isOutgoing && styles.orderActionBtnOutgoing]} 
                        onPress={() => onOrderAction('payment', message as OrderMessage)}
                      >
                        <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                          Mark Payment Done
                        </Text>
                      </TouchableOpacity>
                    )}
                    {showConfirmPayment && (
                      <TouchableOpacity 
                        style={[styles.orderActionBtn, isOutgoing && styles.orderActionBtnOutgoing]} 
                        onPress={() => onOrderAction('payment', message as OrderMessage)}
                      >
                        <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                          Confirm Payment
                        </Text>
                      </TouchableOpacity>
                    )}
                    {showMarkDeliveryDone && (
                      <TouchableOpacity 
                        style={[styles.orderActionBtn, isOutgoing && styles.orderActionBtnOutgoing]} 
                        onPress={() => onOrderAction('delivery', message as OrderMessage)}
                      >
                        <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                          Mark Delivery Done
                        </Text>
                      </TouchableOpacity>
                    )}
                    {showConfirmDelivery && (
                      <TouchableOpacity 
                        style={[styles.orderActionBtn, isOutgoing && styles.orderActionBtnOutgoing]} 
                        onPress={() => onOrderAction('delivery', message as OrderMessage)}
                      >
                        <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                          Confirm Delivery
                        </Text>
                      </TouchableOpacity>
                    )}
                    {showSeeInvoice && (
                      <TouchableOpacity 
                        style={[styles.orderActionBtn, isOutgoing && styles.orderActionBtnOutgoing]} 
                        onPress={() => onOrderAction('invoice', message as OrderMessage)}
                      >
                        <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                          See Invoice
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                    {renderTimestamp(message.timestamp, isOutgoing, message.status)}
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      case 'event':
        // Event/System messages - only show event text, no timestamp
        // Date Separator is handled separately in renderItem
        return (
          <View style={[styles.row, { justifyContent: 'center' }]}> 
            <View style={styles.eventBubble}>
              <Text style={styles.eventText}>{message.event}</Text>
            </View>
          </View>
        );
      // Removed: image, voice, location, contact - not in V1
      case 'image':
      case 'voice':
      case 'location':
      case 'contact':
        // These message types are not supported in V1
        // Render as a placeholder or skip
        return (
          <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
            {!isOutgoing && message.sender.avatar ? <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} /> : null}
            <View style={bubbleContainerStyle}>
              <View style={[bubbleStyle, { opacity: 0.6 }]}>
                <Text style={[textStyle, { fontStyle: 'italic' }]}>
                  {message.type === 'image' ? '🖼️ Image' : 
                   message.type === 'voice' ? '🎤 Voice note' :
                   message.type === 'location' ? '📍 Location' : '👤 Contact'}
                </Text>
                <Text style={[{ fontSize: 12, opacity: 0.6 }, isOutgoing ? { color: '#f9fafb' } : { color: '#1f2937' }]}>
                  Not available in this version
                </Text>
              </View>
            </View>
          </View>
        );
      case 'deleted':
        return (
          <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
            {!isOutgoing && message.sender.avatar ? <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} /> : null}
            <View style={[styles.deletedBubble, bubbleContainerStyle]}>
              <View style={styles.deletedContent}>
                <Icon name="ban-outline" size={14} color="#999" style={{ marginRight: 5 }}/>
                <Text style={styles.deletedText}>This message was deleted</Text>
              </View>
              {renderTimestamp(message.timestamp, isOutgoing, message.status)}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return renderMessageContent();
}

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
  
  // Load chat-specific messages based on the chat ID
  const [messages, setMessages] = useState<Message[]>(() => getMessagesForChat(id) as Message[]);
  const [inputText, setInputText] = useState('');
  
  // Update messages when chat ID changes (for when navigating between different chats)
  useEffect(() => {
    const newMessages = getMessagesForChat(id) as Message[];
    setMessages(newMessages);
  }, [id]);
  
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false); // Track if we've already marked this chat as read

  const flatListRef = useRef<FlatList>(null);

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
      <View style={styles.dateSeparatorBubble}>
        <Text style={styles.dateSeparatorText}>{date}</Text>
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const showDateSeparator = shouldShowDateSeparator(index);
    const dateLabel = showDateSeparator ? formatDateSeparator(item.timestamp) : '';
    
    return (
      <View>
        <MessageBubble
          message={item}
          onOrderAction={handleOrderAction}
          onOrderPress={handleOrderPress}
          onOpenDocument={handleOpenDocument}
          onDeleteMessage={handleDeleteMessage}
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

  // Navigate to Order Details screen
  const handleOrderPress = (orderId: string) => {
    (navigation as any).navigate('OrderDetails', { orderId });
  };

  const updateOrderMessage = (id: string, updates: Partial<OrderMessage>) => {
    setMessages(prevMessages => prevMessages.map(msg => {
      if (msg.id === id && msg.type === 'order') {
        return { ...msg, ...updates } as Message;
      }
      return msg;
    }));
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const newMessage: TextMessage = {
      id: String(Date.now()),
      type: 'text',
      text: inputText,
      isOutgoing: true,
      sender: { name: 'You', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', role: 'business' },
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: 'sent',
    };

    setMessages(prevMessages => [newMessage, ...prevMessages]);
    setInputText('');
    Keyboard.dismiss();
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }

    // Simulate message being delivered and read
    setTimeout(() => {
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'delivered' } as Message : msg
        )
      );
    }, 1000);

    setTimeout(() => {
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'read' } as Message : msg
        )
      );
    }, 2000);
  };

  const addEventMessage = (orderId: string, importExportLabel: string) => {
    const eventMessage: EventMessage = {
      id: String(Date.now() + 1),
      type: 'event',
      event: `Order #${orderId} status updated (${importExportLabel})`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isOutgoing: false,
      sender: {
        name: 'System',
        avatar: '',
        role: 'system'
      }
    };
    setMessages(prevMessages => [eventMessage, ...prevMessages]);
  };
  
  const handleOrderAction = (type: string, msg: OrderMessage) => {
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
    if (partnerType === 'business') {
      (navigation as any).navigate('ViewBusinessProfile', { businessId: partnerId });
    } else if (partnerType === 'user') {
      (navigation as any).navigate('ViewUserProfile', { userId: partnerId });
    } else if (partnerType === 'group') {
      // For groups, show group info
      Alert.alert("Group Info", `Showing info for group: ${name}`);
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
        rightAction={{ icon: partnerType === 'business' ? 'building-2' : 'user', onPress: handleViewProfile }}
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
    backgroundColor: '#eee',
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  bubble: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 2,
    overflow: 'visible',
  },
  bubbleIncoming: {
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
    fontSize: 16,
    lineHeight: 22,
  },
  textOutgoing: {
    color: '#f9fafb',
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 2,
  },
  image: { 
    width: '100%',
    aspectRatio: 1,
  },
  // Special Message Bubble (Order, Invoice)
  specialMessageBubble: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 220,
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
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  specialMessageSubtext: {
    fontSize: 13,
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
  },
  orderTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  orderTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
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
  orderActionBtn: {
    backgroundColor: '#000000',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  orderActionBtnOutgoing: {
    backgroundColor: '#FFFFFF',
  },
  orderActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderActionBtnTextOutgoing: {
    color: '#000000',
  },
  // Event/System messages - distinct from Date Separators
  eventBubble: {
    alignSelf: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginVertical: 4,
  },
  eventText: {
    color: '#6b7280',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Date Separator (WhatsApp style day headers)
  dateSeparatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  dateSeparatorBubble: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dateSeparatorText: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#f3f4f6',
    borderRadius: 21,
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: '#1f2937',
    borderRadius: 21,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  importLabel: {
    backgroundColor: '#22c55e',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  exportLabel: {
    backgroundColor: '#fb923c',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  statusPaid: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  statusUnpaid: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  statusDone: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  statusNew: {
    color: '#0ea5e9',
    fontWeight: 'bold',
  },
  statusOngoing: {
    color: '#f59e42',
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#eab308',
    fontWeight: 'bold',
  },
  statusCancel: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  statusDefault: {
    color: '#6b7280',
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
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
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
    color: '#fff',
  },
  imageOverlayOutgoing: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  replyContextContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    paddingLeft: 8,
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  replyContextContainerIncoming: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: '#d1d5db',
  },
  replyContextContainerOutgoing: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#E2E8F0',
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
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 2,
    maxWidth: '75%',
    opacity: 0.8,
  },
  deletedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedText: {
    color: '#6b7280',
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
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
}); 