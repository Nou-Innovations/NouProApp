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

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { Message, OrderEventMessage, OrderEventStatus, VoiceMessage, ProfileMessage } from '@/shared/types/inbox';
import { formatMessageTimestamp } from '../inbox.format';
import {
  getOrderStatusColor,
  getPaymentStatusColor,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
} from '../inbox.constants';
import AppButton from '@/shared/components/ui/AppButton';
// AppBottomSheet lifted to ChatScreen level for performance
import { OrderEventCard } from './OrderEventCard';
import VoicePlayer from './VoicePlayer';
import ProfileCard from './ProfileCard';

// ============================================================================
// Types
// ============================================================================

export interface MessageBubbleProps {
  message: Message;
  onOrderAction?: (type: string, message: Message) => void;
  onOrderPress?: (orderId: string) => void;
  onOpenDocument?: (fileName: string, fileUrl?: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (messageId: string) => void;
  onInvoicePress?: (invoiceId: string) => void;
  onEstimatePress?: (estimateId: string) => void;
  onEstimateConfirm?: (estimateId: string) => void;
  // Order Event Card handlers
  onOrderEventAction?: (actionId: string, orderId: string) => void;
  onConfirmOrder?: (orderId: string) => void;
  onDeclineOrder?: (orderId: string) => void;
  // Profile message handler
  onProfilePress?: (profileId: string, profileType: 'user' | 'business') => void;
  // Image press handler - opens full-screen viewer
  onImagePress?: (imageUrl: string, senderName: string, timestamp: string, messageId: string) => void;
  // Long press handler -- lifted bottom sheet to ChatScreen level
  onLongPress?: (messageId: string) => void;
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
  if (!senderName) return SENDER_COLORS[0];
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
  onConfirmOrder,
  onDeclineOrder,
  onProfilePress,
  onImagePress,
  onLongPress: onLongPressProp,
  isGrouped = false,
  isFirstInGroup = false,
  isLastInGroup = false,
  showSenderName = false,
  isGroupChat = false,
}: MessageBubbleProps) {
  const isOutgoing = message.isOutgoing;
  const sender = {
    id: message.sender?.id || '',
    name: message.sender?.name || 'Unknown',
    avatar: message.sender?.avatar || '',
    role: message.sender?.role || '',
  };
  const { theme: appTheme, isDarkMode } = useTheme();
  
  // Only show avatar for the last message in a group in GROUP CHATS ONLY
  const showAvatar = isGroupChat && !isOutgoing && isLastInGroup;
  
  // Get sender name color for group chats
  const senderNameColor = getSenderNameColor(sender.name);
  
  // ========== Handlers ==========
  
  const handleLongPress = useCallback(() => {
    if (message.type === 'deleted' || message.type === 'event') return;
    onLongPressProp?.(message.id);
  }, [message.type, message.id, onLongPressProp]);
  
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
  
  const renderForwardedLabel = () => {
    if (!('forwardedFrom' in message) || !message.forwardedFrom) return null;
    return (
      <View style={styles.forwardedContainer}>
        <Icon name="arrow-redo-outline" size={12} color={isOutgoing ? appTheme.colors.textMuted : appTheme.colors.textSecondary} />
        <Text style={[styles.forwardedText, { color: isOutgoing ? appTheme.colors.textMuted : appTheme.colors.textSecondary }]}>
          Forwarded
        </Text>
      </View>
    );
  };

  const renderTimestamp = (timestamp: string, status?: Message['status'], editedAt?: string) => {
    const formattedTime = formatMessageTimestamp(timestamp);
    return (
      <View style={styles.timestampContainer}>
        {editedAt && (
          <Text style={[
            styles.timestamp,
            { color: isOutgoing ? appTheme.colors.textMuted : appTheme.colors.textSecondary, marginRight: 4, fontStyle: 'italic' }
          ]}>
            edited
          </Text>
        )}
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
    // Combined regex for URLs and @mentions
    const combinedRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(@\w[\w\s]*?)(?=\s@|\s*$|[,.!?;:])/gi;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    combinedRegex.lastIndex = 0;
    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        elements.push(
          <Text key={`t-${key++}`} style={textStyle}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }

      const matched = match[0];
      if (matched.startsWith('@')) {
        // @mention
        elements.push(
          <Text
            key={`m-${key++}`}
            style={[textStyle, { color: isOutgoing ? '#B3D9FF' : appTheme.colors.accent, fontWeight: '600' }]}
          >
            {matched}
          </Text>
        );
      } else {
        // URL
        const url = matched.startsWith('http') ? matched : `https://${matched}`;
        elements.push(
          <Text
            key={`l-${key++}`}
            style={[textStyle, styles.linkText, { color: isOutgoing ? appTheme.colors.textInverse : appTheme.colors.linkColor }]}
            onPress={() => handleLinkPress(url)}
          >
            {matched}
          </Text>
        );
      }

      lastIndex = match.index + matched.length;
    }

    // Remaining text after last match
    if (lastIndex < text.length) {
      elements.push(
        <Text key={`t-${key++}`} style={textStyle}>
          {text.substring(lastIndex)}
        </Text>
      );
    }

    if (elements.length === 0) {
      return <Text style={textStyle}>{text}</Text>;
    }

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
            showAvatar && sender.avatar ? (
              <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
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
                    {sender.name}
                  </Text>
                )}
                {renderForwardedLabel()}
                {renderReplyContext()}
                {renderTextWithLinks(message.text)}
                {renderTimestamp(message.timestamp, message.status, message.editedAt)}
              </View>
            </TouchableOpacity>
          </View>
        </View>
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
            showAvatar && sender.avatar ? (
              <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )
          )}
          <View style={bubbleContainerStyle}>
            <TouchableOpacity
              style={bubbleStyle}
              onPress={() => onOpenDocument?.(message.fileName, message.fileUrl)}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              {showSenderName && !isOutgoing && (
                <Text style={[styles.senderName, { color: senderNameColor }]}>
                  {sender.name}
                </Text>
              )}
              {renderForwardedLabel()}
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
            showAvatar && sender.avatar ? (
              <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
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
                  {sender.name}
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
            showAvatar && sender.avatar ? (
              <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
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
                  {sender.name}
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
      </>
    );
  };
  
  // NOTE: renderOrderMessage was removed - it was dead code.
  // Both 'order' and 'order_event' message types are handled by renderOrderEventMessage().
  
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
          showAvatar && sender.avatar ? (
            <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
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
  
  const renderLocationMessage = () => {
    if (message.type !== 'location') return null;
    
    const locationMessage = message as any;
    const { latitude, longitude, address, locationName } = locationMessage;
    
    // Open location in maps app
    const handleOpenMaps = () => {
      const label = locationName || address || 'Shared Location';
      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      });
      
      if (url) {
        Linking.canOpenURL(url).then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            // Fallback to Google Maps web
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
          }
        });
      }
    };
    
    return (
      <>
        <View style={[
          styles.row, 
          isGrouped && styles.rowGrouped,
          isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}>
          {!isOutgoing && isGroupChat && (
            showAvatar && sender.avatar ? (
              <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )
          )}
          <View style={bubbleContainerStyle}>
            {showSenderName && !isOutgoing && (
              <Text style={[styles.senderName, { color: senderNameColor }]} numberOfLines={1}>
                {sender.name}
              </Text>
            )}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleOpenMaps}
              onLongPress={handleLongPress}
              delayLongPress={500}
              style={bubbleStyle}
            >
              {/* Location Icon and Title */}
              <View style={styles.locationHeader}>
                <Icon name="map-pin" size={20} color={isOutgoing ? appTheme.colors.textInverse : appTheme.colors.primary} />
                <Text style={[textStyle, { marginLeft: 8, fontWeight: '600' }]}>
                  {locationName || 'Shared Location'}
                </Text>
              </View>
              
              {/* Address */}
              {address && (
                <Text style={[
                  { fontSize: 14, marginTop: 4 },
                  { color: isOutgoing ? 'rgba(255,255,255,0.8)' : appTheme.colors.textSecondary }
                ]} numberOfLines={2}>
                  {address}
                </Text>
              )}
              
              {/* Map Preview Placeholder - Could be replaced with actual map image */}
              <View style={[
                styles.locationMapPreview,
                { backgroundColor: isOutgoing ? 'rgba(255,255,255,0.1)' : appTheme.colors.surface }
              ]}>
                <Icon name="map" size={32} color={isOutgoing ? 'rgba(255,255,255,0.5)' : appTheme.colors.textMuted} />
                <Text style={[
                  { fontSize: 12, marginTop: 4 },
                  { color: isOutgoing ? 'rgba(255,255,255,0.5)' : appTheme.colors.textMuted }
                ]}>
                  Tap to open in Maps
                </Text>
              </View>
              
              {/* Timestamp */}
              <View style={styles.timestampContainer}>
                <Text style={[styles.timestamp, { color: isOutgoing ? 'rgba(255,255,255,0.7)' : appTheme.colors.textMuted }]}>
                  {formatMessageTimestamp(message.timestamp)}
                </Text>
                {isOutgoing && message.status && <MessageStatus status={message.status} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };
  
  const renderImageMessage = () => {
    if (message.type !== 'image') return null;
    
    const imageMessage = message as any;
    const { imageUrl, width = 300, height = 300 } = imageMessage;
    
    // Calculate display dimensions (max width 250, maintain aspect ratio)
    const maxWidth = 250;
    const aspectRatio = width / height;
    const displayWidth = Math.min(width, maxWidth);
    const displayHeight = displayWidth / aspectRatio;
    
    return (
      <>
        <View style={[
          styles.row, 
          isGrouped && styles.rowGrouped,
          isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}>
          {!isOutgoing && isGroupChat && (
            showAvatar && sender.avatar ? (
              <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )
          )}
          <View style={[bubbleContainerStyle, { maxWidth: displayWidth + 8 }]}>
            {showSenderName && !isOutgoing && (
              <Text style={[styles.senderName, { color: senderNameColor }]} numberOfLines={1}>
                {sender.name}
              </Text>
            )}
            {renderForwardedLabel()}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onImagePress?.(imageUrl, sender.name, message.timestamp, message.id)}
              onLongPress={handleLongPress}
              delayLongPress={500}
              style={[
                styles.imageBubble,
                {
                  backgroundColor: isOutgoing ? appTheme.colors.primary : appTheme.colors.surface,
                  borderColor: appTheme.colors.borderColor,
                }
              ]}
            >
              <Image 
                source={{ uri: imageUrl }} 
                style={[
                  styles.imageContent,
                  { 
                    width: displayWidth,
                    height: displayHeight,
                  }
                ]}
                resizeMode="cover"
              />
              {/* Timestamp overlay on image */}
              <View style={styles.imageTimestampOverlay}>
                <Text style={[styles.imageTimestamp, { color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>
                  {formatMessageTimestamp(message.timestamp)}
                </Text>
                {isOutgoing && message.status && (
                  <View style={styles.messageStatusContainer}>
                    <MessageStatus status={message.status} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };
  
  const renderVoiceMessage = () => {
    if (message.type !== 'voice') return null;
    const voiceMsg = message as VoiceMessage;

    return (
      <>
        <View style={[
          styles.row,
          isGrouped && styles.rowGrouped,
          isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}>
          {!isOutgoing && isGroupChat && (
            showAvatar && sender.avatar ? (
              <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
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
              <View style={bubbleStyle}>
                {showSenderName && !isOutgoing && (
                  <Text style={[styles.senderName, { color: senderNameColor }]}>
                    {sender.name}
                  </Text>
                )}
                {renderForwardedLabel()}
                <VoicePlayer
                  audioUrl={voiceMsg.audioUrl}
                  durationSeconds={voiceMsg.durationSeconds}
                  isOutgoing={isOutgoing}
                />
                {renderTimestamp(message.timestamp, message.status)}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  const renderProfileMessage = () => {
    if (message.type !== 'profile') return null;
    const profileMsg = message as ProfileMessage;

    return (
      <>
        <View style={[
          styles.row,
          isGrouped && styles.rowGrouped,
          isOutgoing ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
        ]}>
          {!isOutgoing && isGroupChat && (
            showAvatar && sender.avatar ? (
              <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
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
              <View style={bubbleStyle}>
                {showSenderName && !isOutgoing && (
                  <Text style={[styles.senderName, { color: senderNameColor }]}>
                    {sender.name}
                  </Text>
                )}
                {renderForwardedLabel()}
                <ProfileCard
                  profileName={profileMsg.profileName}
                  profileAvatar={profileMsg.profileAvatar}
                  profileType={profileMsg.profileType}
                  isOutgoing={isOutgoing}
                  onPress={() => onProfilePress?.(profileMsg.profileId, profileMsg.profileType)}
                />
                {renderTimestamp(message.timestamp, message.status)}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  const renderUnsupportedMessage = () => {
    // contact - Not yet implemented
    if (!['contact'].includes(message.type)) return null;
    
    const labels: Record<string, string> = {
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
            showAvatar && sender.avatar ? (
              <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
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
          paymentStatus: legacyOrder.paymentStatus || 'UNPAID',
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
          showAvatar && sender.avatar ? (
            <Image source={{ uri: sender.avatar }} style={[styles.avatarSmall, { backgroundColor: appTheme.colors.surface }]} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )
        )}
        <OrderEventCard
          message={orderEventMessage}
          onOrderPress={onOrderPress}
          onConfirmOrder={onConfirmOrder}
          onDeclineOrder={onDeclineOrder}
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
    case 'location':
      return renderLocationMessage();
    case 'image':
      return renderImageMessage();
    case 'voice':
      return renderVoiceMessage();
    case 'profile':
      return renderProfileMessage();
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
  // Location message styles
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationMapPreview: {
    marginTop: 8,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  // Image message styles
  imageBubble: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageContent: {
    borderRadius: 12,
  },
  imageTimestampOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  imageTimestamp: {
    fontSize: 11,
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
  forwardedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 3,
  },
  forwardedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default MessageBubble;

