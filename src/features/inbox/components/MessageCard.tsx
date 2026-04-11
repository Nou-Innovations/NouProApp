import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '@/shared/theme';
import { Text } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { userAvatarService } from '@/shared/services/userAvatarService';
import Avatar from '@/shared/components/ui/Avatar';

export type MessageType = 
  | 'text'
  | 'photo'
  | 'video'
  | 'pdf'
  | 'invoice'
  | 'estimate'
  | 'order'
  | 'transfer';

export type OrderStatus = 
  | 'new_order_sent'
  | 'new_order_received'
  | 'order_ongoing'
  | 'order_done'
  | 'order_under_review'
  | 'order_pending'
  | 'order_cancel';

export type TransferStatus = 
  | 'new_transfer_received'
  | 'transfer_ongoing'
  | 'transfer_done'
  | 'transfer_under_review'
  | 'transfer_pending'
  | 'transfer_cancel';

export type TransferDirection = 'incoming' | 'outgoing';

interface MessageCardProps {
  chatId: string;
  userId?: string;
  avatar: string | null;
  name: string;
  message: string;
  type: MessageType;
  time: string;
  status: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';
  unreadCount?: number;
  orderStatus?: OrderStatus;
  transferStatus?: TransferStatus;
  transferDirection?: TransferDirection;
  isOutgoing?: boolean;
  onPress?: () => void;
}

// ============================================================================
// DESIGN TOKENS (specific to MessageCard)
// ============================================================================
const MESSAGE_CARD = {
  padding: {
    horizontal: 12,
    vertical: 12,
  },
  avatar: {
    size: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  typography: {
    name: {
      fontSize: 16,
      fontFamily: theme.fonts.primary.bold,
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: theme.fonts.primary.medium,
    },
    timestamp: {
      fontSize: 14,
      fontFamily: theme.fonts.primary.medium,
    },
  },
  gap: {
    nameToMessage: 0,
    nameToSpecialMessage: 8,
    rightColumnItems: 4,
  },
  statusIndicator: {
    height: 20,
  },
  divider: {
    height: 1,
    marginHorizontal: 8,
  },
} as const;

function MessageCard({
  chatId,
  userId = chatId,
  avatar,
  name,
  message,
  type,
  time,
  status,
  unreadCount,
  orderStatus,
  transferStatus,
  transferDirection,
  isOutgoing,
  onPress,
}: MessageCardProps) {
  const { theme: appTheme } = useTheme();
  const { isItemViewed } = useNotifications();

  useEffect(() => {
    const initializeService = async () => {
      try {
        await userAvatarService.initialize();
      } catch (error) {
        console.error('Error initializing userAvatarService in MessageCard:', error);
      }
    };

    initializeService();
  }, []);

  // Check if this chat has unread messages and hasn't been viewed
  const hasUnreadMessages = unreadCount && unreadCount > 0 && !isItemViewed(chatId);

  const getStatusIcon = () => {
    const iconColor = appTheme.colors.textSecondary;
    
    switch (type) {
      case 'photo':
        return <Icon name="image-outline" size={20} color={iconColor} />;
      case 'video':
        return <Icon name="videocam-outline" size={20} color={iconColor} />;
      case 'pdf':
        return <Icon name="document-outline" size={20} color={iconColor} />;
      case 'invoice':
        return <Icon name="receipt-text-outline" size={20} color={iconColor} />;
      case 'estimate':
        return <Icon name="clipboard-outline" size={20} color={iconColor} />;
      case 'order':
        return <Icon name="cube-outline" size={20} color={iconColor} />;
      case 'transfer':
        return transferDirection === 'incoming' 
          ? <Icon name="arrow-down" size={20} color={iconColor} />
          : <Icon name="arrow-up" size={20} color={iconColor} />;
      default:
        return null;
    }
  };

  const getOrderStatusText = () => {
    if (!orderStatus) return '';
    
    const statusMap: Record<OrderStatus, string> = {
      new_order_sent: 'New order sent',
      new_order_received: 'New order received',
      order_ongoing: 'Order ongoing',
      order_done: 'Order done',
      order_under_review: 'Order under review',
      order_pending: 'Order pending',
      order_cancel: 'Order cancelled',
    };
    
    return statusMap[orderStatus];
  };

  const getTransferStatusText = () => {
    if (!transferStatus) return '';
    
    const statusMap: Record<TransferStatus, string> = {
      new_transfer_received: 'New Transfer received',
      transfer_ongoing: 'Transfer ongoing',
      transfer_done: 'Transfer done',
      transfer_under_review: 'Transfer under review',
      transfer_pending: 'Transfer pending',
      transfer_cancel: 'Transfer cancel',
    };
    
    return statusMap[transferStatus];
  };

  const getStatusIndicator = () => {
    // Only show unread badge if there are unread messages AND chat hasn't been viewed
    if (hasUnreadMessages) {
      return (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{unreadCount}</Text>
        </View>
      );
    }

    // Only show status indicators for outgoing messages (messages sent by the user)
    if (!isOutgoing) {
      return null;
    }

    const iconColor = appTheme.colors.textSecondary;
    const iconMuted = appTheme.colors.textMuted;
    const redColor = appTheme.colors.accent;
    const errorColor = appTheme.colors.error;

    switch (status) {
      case 'sending':
        return <Icon name="time-outline" size={18} color={iconColor} />;
      case 'sent':
        return <Icon name="checkmark" size={18} color={iconMuted} />;
      case 'delivered':
        return <MaterialCommunityIcons name="check-all" size={18} color={iconColor} />;
      case 'seen':
        return <MaterialCommunityIcons name="check-all" size={18} color={redColor} />;
      case 'failed':
        return <Icon name="alert-circle" size={16} color={errorColor} />;
      default:
        return null;
    }
  };

  // Build message preview with optional type icon
  const getMessagePreview = () => {
    if (type === 'order') return getOrderStatusText();
    if (type === 'transfer') return getTransferStatusText();
    return message;
  };
  const messagePreview = getMessagePreview();
  const statusIcon = type !== 'text' ? getStatusIcon() : null;

  const CardWrapper = onPress ? TouchableOpacity : View;
  const cardProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <>
      <CardWrapper
        style={[
          styles.container,
          { backgroundColor: hasUnreadMessages ? appTheme.colors.highlightedRow : appTheme.colors.cardBackground }
        ]}
        {...cardProps}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Avatar
            userId={userId}
            userName={name}
            imageUri={avatar}
            size={MESSAGE_CARD.avatar.size}
            borderRadius={MESSAGE_CARD.avatar.borderRadius}
          />
        </View>

        {/* Left Content (Name + Message) */}
        <View style={styles.leftContent}>
          <Text
            style={[styles.name, { color: appTheme.colors.text }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <View style={[
            styles.messageRow,
            { marginTop: statusIcon ? MESSAGE_CARD.gap.nameToSpecialMessage : MESSAGE_CARD.gap.nameToMessage }
          ]}>
            {statusIcon && (
              <View style={styles.statusIconContainer}>
                {statusIcon}
              </View>
            )}
            <Text
              style={[styles.message, { color: appTheme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {messagePreview}
            </Text>
          </View>
        </View>

        {/* Right Column (Timestamp + Status) */}
        <View style={styles.rightColumn}>
          <Text style={[styles.timestamp, { color: appTheme.colors.textMuted }]}>
            {time}
          </Text>
          <View style={styles.statusIndicatorContainer}>
            {getStatusIndicator()}
          </View>
        </View>
      </CardWrapper>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: appTheme.colors.surface }]} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: MESSAGE_CARD.padding.horizontal,
    paddingVertical: MESSAGE_CARD.padding.vertical,
  },
  avatarContainer: {
    marginRight: MESSAGE_CARD.avatar.marginRight,
  },
  leftContent: {
    flex: 1,
  },
  name: {
    fontSize: MESSAGE_CARD.typography.name.fontSize,
    fontFamily: MESSAGE_CARD.typography.name.fontFamily,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    marginRight: theme.spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: MESSAGE_CARD.typography.message.fontSize,
    lineHeight: MESSAGE_CARD.typography.message.lineHeight,
    fontFamily: MESSAGE_CARD.typography.message.fontFamily,
  },
  rightColumn: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  timestamp: {
    fontSize: MESSAGE_CARD.typography.timestamp.fontSize,
    fontFamily: MESSAGE_CARD.typography.timestamp.fontFamily,
  },
  statusIndicatorContainer: {
    height: MESSAGE_CARD.statusIndicator.height,
    justifyContent: 'center',
    marginTop: MESSAGE_CARD.gap.rightColumnItems,
  },
  unreadBadge: {
    backgroundColor: theme.colors.badgeBackground,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs + 2,
    flexDirection: 'row',
  },
  unreadCount: {
    color: theme.colors.textInverse,
    fontFamily: theme.fonts.primary.medium,
    fontSize: theme.fontSize.xs,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: theme.lineHeight.xs,
  },
  divider: {
    height: MESSAGE_CARD.divider.height,
    marginHorizontal: MESSAGE_CARD.divider.marginHorizontal,
  },
});

export default React.memo(MessageCard);
