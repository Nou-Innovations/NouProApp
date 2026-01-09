import React, { useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { Text, BodyBold, Caption } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { userAvatarService } from '@/shared/services/userAvatarService';
import Avatar from '@/shared/components/ui/Avatar';

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

  // Determine spacing between name and message
  const getNameMessageSpacing = () => {
    // For special message types (non-text), always use theme spacing
    if (type !== 'text') {
      return theme.spacing.sm;
    }
    
    // For text messages, estimate if it will be 2 lines
    // Approximate: if message is longer than ~60 characters, it will likely wrap to 2 lines
    const estimatedTwoLines = message.length > 60;
    
    return estimatedTwoLines ? 0 : theme.spacing.sm;
  };

  const nameMessageSpacing = getNameMessageSpacing();

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

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.borderColor 
        },
        hasUnreadMessages ? { backgroundColor: appTheme.colors.highlightedRow } : null
      ]} 
      onPress={onPress}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          userId={userId}
          userName={name}
          imageUri={avatar}
          size={theme.avatarSizes.md}
          style={styles.avatar}
        />
      </View>

      <View style={styles.contentContainer}>
        <View style={[styles.headerRow, { marginBottom: nameMessageSpacing }]}>
          <BodyBold style={{ color: appTheme.colors.text }} numberOfLines={1}>{name}</BodyBold>
          <Caption style={[styles.time, { color: appTheme.colors.textSecondary }]}>{time}</Caption>
        </View>

        <View style={styles.messageRow}>
          {type !== 'text' && (
            <View style={styles.statusIconContainer}>
              {getStatusIcon()}
            </View>
          )}
          <Text style={[styles.message, { color: appTheme.colors.textSecondary, fontSize: 14, lineHeight: 20 }]} numberOfLines={2}>
            {type === 'delivery' ? getDeliveryStatusText() : message}
          </Text>
          <View style={styles.statusContainer}>
            {getStatusIndicator()}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: theme.spacing.sm + 4,
    paddingBottom: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.sm + 4,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: theme.avatarSizes.lg,
    height: theme.avatarSizes.lg,
    borderRadius: theme.borderRadius.md,
  },
  avatarPlaceholder: {
    width: theme.avatarSizes.md,
    height: theme.avatarSizes.md,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
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
    marginRight: theme.spacing.sm,
  },
  statusContainer: {
    minWidth: theme.iconSizes.xl,
    alignItems: 'flex-end',
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