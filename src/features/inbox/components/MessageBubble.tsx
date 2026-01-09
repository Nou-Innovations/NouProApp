/**
 * MessageBubble Component
 * 
 * Renders different message types (text, order, pdf, invoice, etc.)
 * Extracted from ChatScreen.tsx for maintainability.
 * 
 * Message types supported:
 * - text: Regular text messages with link detection
 * - order: Order cards with status and actions
 * - pdf: Document attachment
 * - invoice: Invoice preview
 * - event: System/event messages (centered)
 * - deleted: Deleted message placeholder
 * - image, voice, location, contact: Placeholder for V2
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { Message } from '@/shared/types/inbox';
import { formatMessageTimestamp } from '../inbox.format';
import { 
  getOrderStatusColor, 
  getPaymentStatusColor,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
} from '../inbox.constants';

// ============================================================================
// Types
// ============================================================================

export interface MessageBubbleProps {
  message: Message;
  onOrderAction?: (type: string, message: Message) => void;
  onOrderPress?: (orderId: string) => void;
  onOpenDocument?: (fileName: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onInvoicePress?: (invoiceId: string) => void;
}

// ============================================================================
// Sub-components
// ============================================================================

interface MessageStatusProps {
  status?: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';
}

function MessageStatus({ status }: MessageStatusProps) {
  const { theme: appTheme } = useTheme();
  
  if (!status) return null;
  
  let iconName: 'checkmark' | 'checkmark-done' | 'time-outline' | 'alert-circle-outline' = 'checkmark';
  let iconColor = appTheme.colors.textMuted;
  
  switch (status) {
    case 'sending':
      iconName = 'time-outline';
      break;
    case 'sent':
      iconName = 'checkmark';
      break;
    case 'delivered':
    case 'seen':
      iconName = 'checkmark-done';
      iconColor = status === 'seen' ? appTheme.colors.accent : appTheme.colors.textMuted;
      break;
    case 'failed':
      iconName = 'alert-circle-outline';
      iconColor = appTheme.colors.error;
      break;
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
}

// ============================================================================
// Main Component
// ============================================================================

export function MessageBubble({ 
  message, 
  onOrderAction, 
  onOrderPress, 
  onOpenDocument, 
  onDeleteMessage,
  onInvoicePress,
}: MessageBubbleProps) {
  const isOutgoing = message.isOutgoing;
  const { theme: appTheme } = useTheme();
  
  // ========== Handlers ==========
  
  const handleLongPress = () => {
    if (message.type === 'deleted' || message.type === 'event') return;
    
    Alert.alert(
      'Message Options',
      'What would you like to do with this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Message', 
          style: 'destructive',
          onPress: () => onDeleteMessage?.(message.id)
        },
      ]
    );
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
            { text: 'Copy', onPress: () => Alert.alert('Copied', 'Link copied to clipboard') },
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
  
  // ========== Styles ==========
  
  const bubbleStyle = [
    styles.bubble,
    isOutgoing 
      ? [styles.bubbleOutgoing, { backgroundColor: appTheme.colors.primary }] 
      : [styles.bubbleIncoming, { backgroundColor: '#FFFFFF' }],
  ];
  
  const textStyle = isOutgoing 
    ? styles.textOutgoing 
    : [styles.textIncoming, { color: appTheme.colors.text }];
  
  const bubbleContainerStyle = isOutgoing 
    ? styles.bubbleContainerOutgoing 
    : styles.bubbleContainerIncoming;
  
  // ========== Render Helpers ==========
  
  const renderTimestamp = (timestamp: string, status?: Message['status']) => {
    const formattedTime = formatMessageTimestamp(timestamp);
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
  
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    const matches = text.match(urlRegex) || [];
    
    if (matches.length === 0) {
      return <Text style={textStyle}>{text}</Text>;
    }
    
    const elements: React.ReactNode[] = [];
    
    parts.forEach((part, index) => {
      if (part) {
        if (urlRegex.test(part)) {
          urlRegex.lastIndex = 0;
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
  
  const renderReplyContext = () => {
    if (message.type !== 'text' || !message.replyingTo) return null;
    
    const senderColor = isOutgoing ? appTheme.colors.textInverse : appTheme.colors.text;
    const snippetColor = isOutgoing ? appTheme.colors.textInverse : appTheme.colors.textSecondary;
    
    return (
      <View style={[
        styles.replyContextContainer, 
        isOutgoing ? styles.replyContextContainerOutgoing : styles.replyContextContainerIncoming
      ]}>
        <View style={[
          styles.replyContextIndicator, 
          { backgroundColor: isOutgoing ? appTheme.colors.textInverse : appTheme.colors.accent }
        ]} />
        <View style={styles.replyContextTextContainer}>
          <Text style={[styles.replyContextSender, { color: senderColor }]}>
            {message.replyingTo.senderName}
          </Text>
          <Text style={[styles.replyContextSnippet, { color: snippetColor }]} numberOfLines={1}>
            {message.replyingTo.messageSnippet}
          </Text>
        </View>
      </View>
    );
  };
  
  // ========== Message Type Renderers ==========
  
  const renderTextMessage = () => {
    if (message.type !== 'text') return null;
    
    return (
      <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
        {!isOutgoing && message.sender.avatar && (
          <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} />
        )}
        <View style={bubbleContainerStyle}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onLongPress={handleLongPress}
            delayLongPress={500}
          >
            <View style={[bubbleStyle, message.replyingTo && styles.bubbleWithReply]}>
              {renderReplyContext()}
              {renderTextWithLinks(message.text)}
              {renderTimestamp(message.timestamp, message.status)}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderPdfMessage = () => {
    if (message.type !== 'pdf') return null;
    
    return (
      <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
        {!isOutgoing && message.sender.avatar && (
          <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} />
        )}
        <View style={bubbleContainerStyle}>
          <TouchableOpacity 
            style={bubbleStyle} 
            onPress={() => onOpenDocument?.(message.fileName)}
            onLongPress={handleLongPress}
            delayLongPress={500}
          >
            <View style={styles.iconTextRow}>
              <Icon name="file-text" size={18} color={isOutgoing ? '#f9fafb' : '#1f2937'} style={styles.inlineIcon}/>
              <Text style={textStyle}>{message.fileName || 'Document.pdf'}</Text>
            </View>
            <Text style={[{ fontSize: 12, opacity: 0.6 }, isOutgoing ? { color: '#f9fafb' } : { color: '#1f2937' }]}>
              Tap to view
            </Text>
            {renderTimestamp(message.timestamp, message.status)}
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderInvoiceMessage = () => {
    if (message.type !== 'invoice') return null;
    
    return (
      <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
        {!isOutgoing && message.sender.avatar && (
          <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} />
        )}
        <View style={bubbleContainerStyle}>
          <TouchableOpacity 
            style={[
              styles.specialMessageBubble,
              isOutgoing ? { backgroundColor: appTheme.colors.primary } : { backgroundColor: '#FFFFFF' },
            ]} 
            onPress={() => onInvoicePress?.(message.invoiceId)}
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
            {renderTimestamp(message.timestamp, message.status)}
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderOrderMessage = () => {
    if (message.type !== 'order') return null;
    
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
        {!isImport && message.sender.avatar && (
          <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} />
        )}
        <View style={bubbleContainerStyle}>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => onOrderPress?.(message.orderId)}
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
            {/* Header */}
            <View style={styles.orderHeader}>
              <View style={styles.orderHeaderLeft}>
                <Icon name="cube-outline" size={18} color={isOutgoing ? '#FFFFFF' : appTheme.colors.primary} />
                <View style={[styles.orderTypeBadge, { backgroundColor: isImport ? '#2ACF01' : '#FF7A00' }]}>
                  <Text style={styles.orderTypeBadgeText}>{importExportLabel}</Text>
                </View>
              </View>
            </View>
            
            {/* Order ID */}
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
                <Text style={[styles.orderDetailValueBold, { color: getOrderStatusColor(message.orderStatus) }]}>
                  {message.orderStatus}
                </Text>
              </View>
              <View style={styles.orderDetailRow}>
                <Text style={[styles.orderDetailLabel, { color: orderSubTextColor }]}>Payment</Text>
                <Text style={[styles.orderDetailValueBold, { color: getPaymentStatusColor(message.paymentStatus) }]}>
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
                    onPress={() => onOrderAction?.('payment', message)}
                  >
                    <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                      Mark Payment Done
                    </Text>
                  </TouchableOpacity>
                )}
                {showConfirmPayment && (
                  <TouchableOpacity 
                    style={[styles.orderActionBtn, isOutgoing && styles.orderActionBtnOutgoing]} 
                    onPress={() => onOrderAction?.('payment', message)}
                  >
                    <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                      Confirm Payment
                    </Text>
                  </TouchableOpacity>
                )}
                {showMarkDeliveryDone && (
                  <TouchableOpacity 
                    style={[styles.orderActionBtn, isOutgoing && styles.orderActionBtnOutgoing]} 
                    onPress={() => onOrderAction?.('delivery', message)}
                  >
                    <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                      Mark Delivery Done
                    </Text>
                  </TouchableOpacity>
                )}
                {showConfirmDelivery && (
                  <TouchableOpacity 
                    style={[styles.orderActionBtn, isOutgoing && styles.orderActionBtnOutgoing]} 
                    onPress={() => onOrderAction?.('delivery', message)}
                  >
                    <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                      Confirm Delivery
                    </Text>
                  </TouchableOpacity>
                )}
                {showSeeInvoice && (
                  <TouchableOpacity 
                    style={[styles.orderActionBtn, isOutgoing && styles.orderActionBtnOutgoing]} 
                    onPress={() => onOrderAction?.('invoice', message)}
                  >
                    <Text style={[styles.orderActionBtnText, isOutgoing && styles.orderActionBtnTextOutgoing]}>
                      See Invoice
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {renderTimestamp(message.timestamp, message.status)}
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderEventMessage = () => {
    if (message.type !== 'event') return null;
    
    return (
      <View style={[styles.row, { justifyContent: 'center' }]}> 
        <View style={styles.eventBubble}>
          <Text style={styles.eventText}>{message.event}</Text>
        </View>
      </View>
    );
  };
  
  const renderDeletedMessage = () => {
    if (message.type !== 'deleted') return null;
    
    return (
      <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
        {!isOutgoing && message.sender.avatar && (
          <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} />
        )}
        <View style={[styles.deletedBubble, bubbleContainerStyle]}>
          <View style={styles.deletedContent}>
            <Icon name="ban-outline" size={14} color="#999" style={{ marginRight: 5 }}/>
            <Text style={styles.deletedText}>This message was deleted</Text>
          </View>
          {renderTimestamp(message.timestamp, message.status)}
        </View>
      </View>
    );
  };
  
  const renderUnsupportedMessage = () => {
    // image, voice, location, contact - Not in V1
    if (!['image', 'voice', 'location', 'contact'].includes(message.type)) return null;
    
    const labels: Record<string, string> = {
      image: '🖼️ Image',
      voice: '🎤 Voice note',
      location: '📍 Location',
      contact: '👤 Contact',
    };
    
    return (
      <View style={[styles.row, isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}> 
        {!isOutgoing && message.sender.avatar && (
          <Image source={{ uri: message.sender.avatar }} style={styles.avatarSmall} />
        )}
        <View style={bubbleContainerStyle}>
          <View style={[bubbleStyle, { opacity: 0.6 }]}>
            <Text style={[textStyle, { fontStyle: 'italic' }]}>
              {labels[message.type] || message.type}
            </Text>
            <Text style={[{ fontSize: 12, opacity: 0.6 }, isOutgoing ? { color: '#f9fafb' } : { color: '#1f2937' }]}>
              Not available in this version
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  // ========== Main Render ==========
  
  switch (message.type) {
    case 'text':
      return renderTextMessage();
    case 'pdf':
      return renderPdfMessage();
    case 'invoice':
      return renderInvoiceMessage();
    case 'order':
      return renderOrderMessage();
    case 'event':
      return renderEventMessage();
    case 'deleted':
      return renderDeletedMessage();
    case 'image':
    case 'voice':
    case 'location':
    case 'contact':
      return renderUnsupportedMessage();
    default:
      return null;
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
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
  bubbleWithReply: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: 0,
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
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 14,
  },
  messageStatusIcon: {
    marginLeft: 1,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inlineIcon: {
    marginRight: 8,
  },
  // Special message styles
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
  // Order styles
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
  // Event styles
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
  // Deleted styles
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
  // Reply context
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
});

export default MessageBubble;

