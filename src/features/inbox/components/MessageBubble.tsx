/**
 * MessageBubble Component
 * 
 * Renders different message types (text, order, pdf, invoice, estimate, etc.)
 * Extracted from ChatScreen.tsx for maintainability.
 * 
 * Message types supported:
 * - text: Regular text messages with link detection
 * - order: Order cards with status and actions
 * - pdf: Document attachment
 * - invoice: Invoice preview
 * - estimate: Estimate preview with confirm action
 * - event: System/event messages (centered)
 * - deleted: Deleted message placeholder
 * - image, voice, location, contact: Placeholder for V2
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { Message, OrderEventMessage, OrderEventStatus } from '@/shared/types/inbox';
import { formatMessageTimestamp } from '../inbox.format';
import { 
  getOrderStatusColor, 
  getPaymentStatusColor,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
} from '../inbox.constants';
import AppButton from '@/shared/components/ui/AppButton';
import AppBottomSheet, { AppBottomSheetItem } from '@/shared/components/ui/AppBottomSheet';
import { OrderEventCard } from './OrderEventCard';

// ============================================================================
// Types
// ============================================================================

export interface MessageBubbleProps {
  message: Message;
  onOrderAction?: (type: string, message: Message) => void;
  onOrderPress?: (orderId: string) => void;
  onOpenDocument?: (fileName: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (messageId: string) => void;
  onInvoicePress?: (invoiceId: string) => void;
  onEstimatePress?: (estimateId: string) => void;
  onEstimateConfirm?: (estimateId: string) => void;
  // Order Event Card handlers
  onOrderEventAction?: (actionId: string, orderId: string) => void;
  // Message grouping
  isGrouped?: boolean; // True if this message is part of a group (same sender adjacent)
  isFirstInGroup?: boolean; // True if this is the first message in a group (chronologically)
  isLastInGroup?: boolean; // True if this is the last message in a group (chronologically)
  showSenderName?: boolean; // True to show sender name above the message (for group chats)
  isGroupChat?: boolean; // True if this is a group chat (shows avatar on left for incoming messages)
}

// ============================================================================
// Sender Name Colors - Consistent colors based on sender name hash
// ============================================================================

const SENDER_COLORS = [
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#FF9800', // Orange
  '#FF5722', // Deep Orange
  '#795548', // Brown
];

function getSenderNameColor(senderName: string): string {
  let hash = 0;
  for (let i = 0; i < senderName.length; i++) {
    hash = senderName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SENDER_COLORS.length;
  return SENDER_COLORS[index];
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
  onReplyMessage,
  onInvoicePress,
  onEstimatePress,
  onEstimateConfirm,
  onOrderEventAction,
  isGrouped = false,
  isFirstInGroup = false,
  isLastInGroup = false,
  showSenderName = false,
  isGroupChat = false,
}: MessageBubbleProps) {
  const isOutgoing = message.isOutgoing;
  const { theme: appTheme, isDarkMode } = useTheme();
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  
  // Only show avatar for the last message in a group in GROUP CHATS ONLY
  const showAvatar = isGroupChat && !isOutgoing && isLastInGroup;
  
  // Get sender name color for group chats
  const senderNameColor = getSenderNameColor(message.sender.name);
  
  // Bottom sheet items for message options
  const messageOptions: AppBottomSheetItem[] = [
    { id: 'reply', title: 'Reply' },
    { id: 'delete', title: 'Delete Message', variant: 'destructive' },
  ];
  
  // ========== Handlers ==========
  
  const handleLongPress = useCallback(() => {
    if (message.type === 'deleted' || message.type === 'event') return;
    setShowOptionsSheet(true);
  }, [message.type]);
  
  const handleOptionSelect = useCallback((item: AppBottomSheetItem) => {
    if (item.id === 'reply') {
      onReplyMessage?.(message.id);
    } else if (item.id === 'delete') {
      onDeleteMessage?.(message.id);
    }
  }, [message.id, onReplyMessage, onDeleteMessage]);
  
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
      : [styles.bubbleIncoming, { backgroundColor: appTheme.colors.cardBackground }],
  ];
  
  const textStyle = isOutgoing 
    ? [styles.textOutgoing, { color: appTheme.colors.textInverse }] 
    : [styles.textIncoming, { color: appTheme.colors.primary }];
  
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
          { color: isOutgoing ? appTheme.colors.textMuted : appTheme.colors.textSecondary }
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
                { color: isOutgoing ? appTheme.colors.textInverse : appTheme.colors.linkColor }
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
      <>
        <View style={[
          styles.row, 
          isGrouped && styles.rowGrouped,
          isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}> 
          {!isOutgoing && isGroupChat && (
            showAvatar && message.sender.avatar ? (
              <Image source={{ uri: message.sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )
          )}
          <View style={bubbleContainerStyle}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              <View style={[bubbleStyle, message.replyingTo && styles.bubbleWithReply]}>
                {showSenderName && !isOutgoing && (
                  <Text style={[styles.senderName, { color: senderNameColor }]}>
                    {message.sender.name}
                  </Text>
                )}
                {renderReplyContext()}
                {renderTextWithLinks(message.text)}
                {renderTimestamp(message.timestamp, message.status)}
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <AppBottomSheet
          visible={showOptionsSheet}
          onClose={() => setShowOptionsSheet(false)}
          title="Message Options"
          items={messageOptions}
          onSelectItem={handleOptionSelect}
        />
      </>
    );
  };
  
  const renderPdfMessage = () => {
    if (message.type !== 'pdf') return null;
    
    return (
      <>
        <View style={[
          styles.row, 
          isGrouped && styles.rowGrouped,
          isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}> 
          {!isOutgoing && isGroupChat && (
            showAvatar && message.sender.avatar ? (
              <Image source={{ uri: message.sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )
          )}
          <View style={bubbleContainerStyle}>
            <TouchableOpacity 
              style={bubbleStyle} 
              onPress={() => onOpenDocument?.(message.fileName)}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              {showSenderName && !isOutgoing && (
                <Text style={[styles.senderName, { color: senderNameColor }]}>
                  {message.sender.name}
                </Text>
              )}
              <View style={styles.iconTextRow}>
                <Icon name="file-text" size={18} color={isOutgoing ? appTheme.colors.textInverse : appTheme.colors.primary} style={styles.inlineIcon}/>
                <Text style={textStyle}>{message.fileName || 'Document.pdf'}</Text>
              </View>
              <Text style={[{ fontSize: 14 }, { color: isOutgoing ? appTheme.colors.textMuted : appTheme.colors.textSecondary }]}>
                Tap to view
              </Text>
              {renderTimestamp(message.timestamp, message.status)}
            </TouchableOpacity>
          </View>
        </View>
        <AppBottomSheet
          visible={showOptionsSheet}
          onClose={() => setShowOptionsSheet(false)}
          title="Message Options"
          items={messageOptions}
          onSelectItem={handleOptionSelect}
        />
      </>
    );
  };
  
  const renderInvoiceMessage = () => {
    if (message.type !== 'invoice') return null;
    
    return (
      <>
        <View style={[
          styles.row, 
          isGrouped && styles.rowGrouped,
          isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}> 
          {!isOutgoing && isGroupChat && (
            showAvatar && message.sender.avatar ? (
              <Image source={{ uri: message.sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )
          )}
          <View style={bubbleContainerStyle}>
            <TouchableOpacity 
              style={[
                styles.specialMessageBubble,
                isOutgoing ? { backgroundColor: appTheme.colors.primary } : { backgroundColor: appTheme.colors.cardBackground },
              ]} 
              onPress={() => onInvoicePress?.(message.invoiceId)}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              {showSenderName && !isOutgoing && (
                <Text style={[styles.senderName, { color: senderNameColor }]}>
                  {message.sender.name}
                </Text>
              )}
              <View style={styles.specialMessageHeader}>
                <Icon 
                  name="receipt-outline" 
                  size={18} 
                  color={isOutgoing ? appTheme.colors.textInverse : appTheme.colors.primary} 
                  style={styles.specialMessageIcon}
                />
                <Text style={[
                  styles.specialMessageTitle,
                  { color: isOutgoing ? appTheme.colors.textInverse : appTheme.colors.text }
                ]} numberOfLines={1}>
                  Invoice #{message.invoiceId}
                </Text>
              </View>
              <Text style={[
                styles.specialMessageSubtext,
                { color: isOutgoing ? appTheme.colors.textMuted : appTheme.colors.textSecondary }
              ]}>
                Tap to view invoice details
              </Text>
              {renderTimestamp(message.timestamp, message.status)}
            </TouchableOpacity>
          </View>
        </View>
        <AppBottomSheet
          visible={showOptionsSheet}
          onClose={() => setShowOptionsSheet(false)}
          title="Message Options"
          items={messageOptions}
          onSelectItem={handleOptionSelect}
        />
      </>
    );
  };
  
  const renderEstimateMessage = () => {
    if (message.type !== 'estimate') return null;
    
    return (
      <>
        <View style={[
          styles.row, 
          isGrouped && styles.rowGrouped,
          isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}> 
          {!isOutgoing && isGroupChat && (
            showAvatar && message.sender.avatar ? (
              <Image source={{ uri: message.sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )
          )}
          <View style={bubbleContainerStyle}>
            <TouchableOpacity 
              style={[
                styles.specialMessageBubble,
                isOutgoing ? { backgroundColor: appTheme.colors.primary } : { backgroundColor: appTheme.colors.cardBackground },
              ]} 
              onPress={() => onEstimatePress?.(message.estimateId)}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              {showSenderName && !isOutgoing && (
                <Text style={[styles.senderName, { color: senderNameColor }]}>
                  {message.sender.name}
                </Text>
              )}
              <View style={styles.specialMessageHeader}>
                <Icon 
                  name="receipt-outline" 
                  size={18} 
                  color={isOutgoing ? appTheme.colors.textInverse : appTheme.colors.primary} 
                  style={styles.specialMessageIcon}
                />
                <Text style={[
                  styles.specialMessageTitle,
                  { color: isOutgoing ? appTheme.colors.textInverse : appTheme.colors.text }
                ]} numberOfLines={1}>
                  Estimate #{message.estimateId}
                </Text>
              </View>
              <Text style={[
                styles.specialMessageSubtext,
                { color: isOutgoing ? appTheme.colors.textMuted : appTheme.colors.textSecondary }
              ]}>
                Tap to view estimate details
              </Text>
              
              {/* Confirm Estimate Button */}
              <AppButton
                title="Confirm Estimate"
                size="small"
                variant={isOutgoing ? 'secondary' : 'primary'}
                onPress={() => onEstimateConfirm?.(message.estimateId)}
                style={{ marginTop: 8 }}
              />
              
              {renderTimestamp(message.timestamp, message.status)}
            </TouchableOpacity>
          </View>
        </View>
        <AppBottomSheet
          visible={showOptionsSheet}
          onClose={() => setShowOptionsSheet(false)}
          title="Message Options"
          items={messageOptions}
          onSelectItem={handleOptionSelect}
        />
      </>
    );
  };
  
  const renderOrderMessage = () => {
    if (message.type !== 'order') return null;
    
    const isImport = message.isOutgoing;
    const importExportLabel = isImport ? 'Import' : 'Export';
    const importExportColor = isImport ? appTheme.colors.statusImport : appTheme.colors.statusExport;
    const showMarkPaymentDone = isImport && message.paymentStatus === 'Unpaid';
    const showConfirmPayment = !isImport && message.paymentStatus === 'Payment Pending Confirmation';
    const showMarkDeliveryDone = !isImport && (message.orderStatus === 'Ongoing' || message.orderStatus === 'New');
    const showConfirmDelivery = isImport && message.orderStatus === 'Delivery Pending Confirmation';
    const showSeeInvoice = message.paymentStatus === 'Paid';
    
    const orderBgColor = isOutgoing ? appTheme.colors.primary : appTheme.colors.cardBackground;
    const orderTextColor = isOutgoing ? appTheme.colors.textInverse : appTheme.colors.text;
    const orderSubTextColor = isOutgoing ? appTheme.colors.textMuted : appTheme.colors.textSecondary;
    
    return (
      <>
        <View style={[
          styles.row, 
          isGrouped && styles.rowGrouped,
          isImport ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}> 
          {!isImport && isGroupChat && (
            showAvatar && message.sender.avatar ? (
              <Image source={{ uri: message.sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )
          )}
          <View style={bubbleContainerStyle}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => onOrderPress?.(message.orderId)}
              onLongPress={handleLongPress}
              delayLongPress={500}
              style={[
                styles.specialMessageBubble,
                { backgroundColor: orderBgColor },
              ]}
            >
              {showSenderName && !isImport && (
                <Text style={[styles.senderName, { color: senderNameColor }]}>
                  {message.sender.name}
                </Text>
              )}
              {/* Header with Icon, Order ID, and Badge */}
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderLeft}>
                  <Icon name="cube-outline" size={18} color={importExportColor} />
                  <Text style={[styles.orderIdText, { color: orderTextColor, marginLeft: 8 }]}>
                    #{message.orderId}
                  </Text>
                </View>
                <View style={[styles.orderTypeBadge, { backgroundColor: importExportColor }]}>
                  <Text style={[styles.orderTypeBadgeText, { color: appTheme.colors.textInverse }]}>{importExportLabel}</Text>
                </View>
              </View>
              
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
                    <AppButton
                      title="Mark Payment Done"
                      size="small"
                      variant={isOutgoing ? 'secondary' : 'primary'}
                      onPress={() => onOrderAction?.('payment', message)}
                      style={styles.orderActionBtnSpacing}
                    />
                  )}
                  {showConfirmPayment && (
                    <AppButton
                      title="Confirm Payment"
                      size="small"
                      variant={isOutgoing ? 'secondary' : 'primary'}
                      onPress={() => onOrderAction?.('payment', message)}
                      style={styles.orderActionBtnSpacing}
                    />
                  )}
                  {showMarkDeliveryDone && (
                    <AppButton
                      title="Mark Delivery Done"
                      size="small"
                      variant={isOutgoing ? 'secondary' : 'primary'}
                      onPress={() => onOrderAction?.('delivery', message)}
                      style={styles.orderActionBtnSpacing}
                    />
                  )}
                  {showConfirmDelivery && (
                    <AppButton
                      title="Confirm Delivery"
                      size="small"
                      variant={isOutgoing ? 'secondary' : 'primary'}
                      onPress={() => onOrderAction?.('delivery', message)}
                      style={styles.orderActionBtnSpacing}
                    />
                  )}
                  {showSeeInvoice && (
                    <AppButton
                      title="See Invoice"
                      size="small"
                      variant={isOutgoing ? 'secondary' : 'primary'}
                      onPress={() => onOrderAction?.('invoice', message)}
                      style={styles.orderActionBtnSpacing}
                    />
                  )}
                </View>
              )}
              
              {renderTimestamp(message.timestamp, message.status)}
            </TouchableOpacity>
          </View>
        </View>
        <AppBottomSheet
          visible={showOptionsSheet}
          onClose={() => setShowOptionsSheet(false)}
          title="Message Options"
          items={messageOptions}
          onSelectItem={handleOptionSelect}
        />
      </>
    );
  };
  
  const renderEventMessage = () => {
    if (message.type !== 'event') return null;
    
    return (
      <View style={[styles.row, { justifyContent: 'center' }]}> 
        <View style={[styles.eventBubble, { backgroundColor: appTheme.colors.surface }]}>
          <Text style={[styles.eventText, { color: appTheme.colors.textMuted }]}>{message.event}</Text>
        </View>
      </View>
    );
  };
  
  const renderDeletedMessage = () => {
    if (message.type !== 'deleted') return null;
    
    return (
      <View style={[
        styles.row, 
        isGrouped && styles.rowGrouped,
        isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
      ]}> 
        {!isOutgoing && isGroupChat && (
          showAvatar && message.sender.avatar ? (
            <Image source={{ uri: message.sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )
        )}
        <View style={[styles.deletedBubble, bubbleContainerStyle, { backgroundColor: appTheme.colors.borderColor }]}>
          <View style={styles.deletedContent}>
            <Icon name="ban-outline" size={14} color={appTheme.colors.textMuted} style={{ marginRight: 5 }}/>
            <Text style={[styles.deletedText, { color: appTheme.colors.textMuted }]}>This message was deleted</Text>
          </View>
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
      <>
        <View style={[
          styles.row, 
          isGrouped && styles.rowGrouped,
          isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}> 
          {!isOutgoing && isGroupChat && (
            showAvatar && message.sender.avatar ? (
              <Image source={{ uri: message.sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )
          )}
          <View style={bubbleContainerStyle}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onLongPress={handleLongPress}
              delayLongPress={500}
              style={[bubbleStyle, { opacity: 0.6 }]}
            >
              <Text style={[textStyle, { fontStyle: 'italic' }]}>
                {labels[message.type] || message.type}
              </Text>
              <Text style={[{ fontSize: 14 }, { color: isOutgoing ? appTheme.colors.textMuted : appTheme.colors.textSecondary }]}>
                Not available in this version
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <AppBottomSheet
          visible={showOptionsSheet}
          onClose={() => setShowOptionsSheet(false)}
          title="Message Options"
          items={messageOptions}
          onSelectItem={handleOptionSelect}
        />
      </>
    );
  };
  
  const renderOrderEventMessage = () => {
    // Handle both 'order_event' and legacy 'order' types
    if (message.type !== 'order_event' && message.type !== 'order') return null;
    
    let orderEventMessage: OrderEventMessage;
    
    if (message.type === 'order') {
      // Convert legacy 'order' type to 'order_event' format
      const legacyOrder = message as any;
      const statusMap: Record<string, OrderEventStatus> = {
        'New': 'NEW',
        'Ongoing': 'ONGOING',
        'Pending': 'PENDING',
        'Done': 'DONE',
        'Cancel': 'CANCELED',
      };
      
      orderEventMessage = {
        id: legacyOrder.id,
        chatId: legacyOrder.chatId || '',
        type: 'order_event',
        isSystem: true,
        isOutgoing: legacyOrder.isOutgoing,
        sender: legacyOrder.sender,
        timestamp: legacyOrder.timestamp,
        status: legacyOrder.status,
        payload: {
          orderId: legacyOrder.orderId,
          orderRef: legacyOrder.orderId,
          buyer: { id: 'buyer', name: 'Buyer', logo: '', location: '' },
          seller: { id: 'seller', name: 'Seller', logo: '', location: '' },
          status: statusMap[legacyOrder.orderStatus] || 'NEW',
          paymentStatus: legacyOrder.paymentStatus || 'Unpaid',
          itemsPreview: [],
          totalItemsCount: legacyOrder.itemCount || 0,
          subtotal: legacyOrder.totalAmount || 0,
          vatAmount: 0,
          vatPercent: 0,
          deliveryFee: 0,
          totalAmount: legacyOrder.totalAmount || 0,
          currency: 'MUR',
          delivery: { type: 'delivery' },
          createdAt: legacyOrder.timestamp,
          schemaVersion: '1.0',
        },
      };
    } else {
      orderEventMessage = message as OrderEventMessage;
    }
    
    return (
      <View style={[
        styles.row, 
        isGrouped && styles.rowGrouped,
        isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
      ]}> 
        {!isOutgoing && isGroupChat && (
          showAvatar && message.sender.avatar ? (
            <Image source={{ uri: message.sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )
        )}
        <OrderEventCard
          message={orderEventMessage}
          onOrderPress={onOrderPress}
        />
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
    case 'estimate':
      return renderEstimateMessage();
    case 'order':
    case 'order_event':
      return renderOrderEventMessage();
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
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  rowGrouped: {
    marginBottom: 4,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: 8,
  },
  bubble: {
    borderRadius: 12,
    padding: 8,
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
  bubbleWithReply: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: 0,
  },
  textIncoming: {
    fontSize: 16,
    lineHeight: 22,
  },
  textOutgoing: {
    fontSize: 16,
    lineHeight: 22,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 0,
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
  pdfSubtext: {
    fontSize: 14,
  },
  // Special message styles
  specialMessageBubble: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 280,
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
  // Order styles
  orderBubble: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 280,
  },
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
    color: '#FFFFFF',
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
  // Event styles
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
  // Deleted styles
  deletedBubble: {
    flexDirection: 'column',
    borderRadius: 8,
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

