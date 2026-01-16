import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { Text } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { userAvatarService } from '@/shared/services/userAvatarService';
import { ListItemCard } from '@/shared/components/ui';

export type MessageType = 
  | 'text'
  | 'photo'
  | 'video'
  | 'voice_call'
  | 'missed_voice_call'
  | 'video_call'
  | 'missed_video_call'
  | 'in_call'
  | 'in_video_call'
  | 'invoice'
  | 'pdf'
  | 'delivery'
  | 'location'
  | 'voice_note'
  | 'contact';

export type DeliveryStatus = 
  | 'new_order_sent'
  | 'order_ongoing'
  | 'order_done'
  | 'order_under_review'
  | 'order_pending'
  | 'order_cancel'
  | 'new_order_received';

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
  deliveryStatus?: DeliveryStatus;
  isOutgoing?: boolean;
  onPress?: () => void;
}

export default function MessageCard({
  chatId,
  userId = chatId,
  avatar,
  name,
  message,
  type,
  time,
  status,
  unreadCount,
  deliveryStatus,
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
    const errorColor = appTheme.colors.error;
    
    switch (type) {
      case 'photo':
        return <Icon name="image-outline" size={20} color={iconColor} />;
      case 'video':
        return <Icon name="videocam-outline" size={20} color={iconColor} />;
      case 'voice_call':
      case 'missed_voice_call':
      case 'in_call':
        return <Icon name="call-outline" size={20} color={type === 'missed_voice_call' ? errorColor : iconColor} />;
      case 'video_call':
      case 'missed_video_call':
      case 'in_video_call':
        return <Icon name="videocam-outline" size={20} color={type === 'missed_video_call' ? errorColor : iconColor} />;
      case 'invoice':
        return <Icon name="document-text-outline" size={20} color={iconColor} />;
      case 'pdf':
        return <Icon name="document-outline" size={20} color={iconColor} />;
      case 'delivery':
        return <Icon name="cube-outline" size={20} color={iconColor} />;
      case 'location':
        return <Icon name="location-outline" size={20} color={iconColor} />;
      case 'voice_note':
        return <Icon name="mic-outline" size={20} color={iconColor} />;
      case 'contact':
        return <Icon name="person-outline" size={20} color={iconColor} />;
      default:
        return null;
    }
  };

  const getDeliveryStatusText = () => {
    if (!deliveryStatus) return '';
    
    const statusMap: Record<DeliveryStatus, string> = {
      new_order_sent: 'New order sent',
      order_ongoing: 'Order ongoing',
      order_done: 'Order done',
      order_under_review: 'Order under review',
      order_pending: 'Order pending',
      order_cancel: 'Order cancelled',
      new_order_received: 'New order received'
    };
    
    return statusMap[deliveryStatus];
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
    const redColor = appTheme.colors.error; // Red color for read status
    const errorColor = appTheme.colors.error;

    switch (status) {
      case 'sending':
        return <Icon name="time-outline" size={24} color={iconColor} />;
      case 'sent':
        return <Icon name="checkmark" size={24} color={iconColor} />; // 1 tick
      case 'delivered':
        return <Icon name="checkmark-done" size={24} color={iconColor} />; // 2 ticks
      case 'seen':
        return <Icon name="checkmark-done" size={24} color={redColor} />; // Red ticks for read
      case 'failed':
        return <Icon name="alert-circle" size={24} color={errorColor} />;
      default:
        return null;
    }
  };

  // Build message preview with optional type icon
  const messagePreview = type === 'delivery' ? getDeliveryStatusText() : message;
  const statusIcon = type !== 'text' ? getStatusIcon() : null;

  // Build subtitle content with icon prefix if needed
  const subtitleContent = statusIcon ? (
    <View style={styles.messageRow}>
      <View style={styles.statusIconContainer}>
        {statusIcon}
      </View>
      <Text style={[styles.message, { color: appTheme.colors.textSecondary }]} numberOfLines={2}>
        {messagePreview}
      </Text>
    </View>
  ) : messagePreview;

  return (
    <ListItemCard
      avatar={{
        type: avatar ? 'image' : 'initials',
        userId: userId,
        userName: name,
        imageUri: avatar,
      }}
      title={name}
      subtitle={typeof subtitleContent === 'string' ? subtitleContent : undefined}
      rightRow1={{ timestamp: time }}
      rightRow2={getStatusIndicator()}
      bottomElement={typeof subtitleContent !== 'string' ? subtitleContent : undefined}
      onPress={onPress}
      showDivider
      style={hasUnreadMessages ? { backgroundColor: appTheme.colors.highlightedRow } : undefined}
    />
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
  },
  statusIconContainer: {
    marginRight: theme.spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.primary.medium,
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
});
