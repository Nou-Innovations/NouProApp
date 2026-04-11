/**
 * BusinessFeedCard Component
 * Displays business updates in the feed on HomeScreen
 * Following design.json specifications
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Avatar from '@/shared/components/ui/Avatar';

interface BusinessFeedCardProps {
  id: string;
  businessName: string;
  businessLogo?: string;
  content: string;
  timestamp: string;
  imageUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onBusinessPress?: () => void;
}

export function BusinessFeedCard({
  id,
  businessName,
  businessLogo,
  content,
  timestamp,
  imageUrl,
  likesCount = 0,
  commentsCount = 0,
  isLiked = false,
  onPress,
  onLike,
  onComment,
  onBusinessPress,
}: BusinessFeedCardProps) {
  const { theme: appTheme } = useTheme();

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: appTheme.colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={onBusinessPress} activeOpacity={0.7}>
        <Avatar
          userId={id}
          userName={businessName}
          imageUri={businessLogo}
          size={theme.avatarSizes?.sm || 40}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.businessName, { color: appTheme.colors.text }]}>
            {businessName}
          </Text>
          <Text style={[styles.timestamp, { color: appTheme.colors.textLight }]}>
            {formatTimestamp(timestamp)}
          </Text>
        </View>
        <TouchableOpacity style={styles.moreButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="ellipsis-horizontal" size={20} color={appTheme.colors.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Content */}
      <Text style={[styles.content, { color: appTheme.colors.text }]} numberOfLines={4}>
        {content}
      </Text>

      {/* Image */}
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      )}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: appTheme.colors.borderColor }]}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Icon
            name={isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={isLiked ? appTheme.colors.accent : appTheme.colors.textLight}
          />
          {likesCount > 0 && (
            <Text style={[styles.actionCount, { color: appTheme.colors.textLight }]}>
              {likesCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onComment}>
          <Icon
            name="chatbubble-outline"
            size={20}
            color={appTheme.colors.textLight}
          />
          {commentsCount > 0 && (
            <Text style={[styles.actionCount, { color: appTheme.colors.textLight }]}>
              {commentsCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon
            name="share-outline"
            size={22}
            color={appTheme.colors.textLight}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  headerInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  businessName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
  },
  timestamp: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  moreButton: {
    padding: theme.spacing.xs,
  },
  content: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  image: {
    width: '100%',
    height: 200,
  },
  actions: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  actionCount: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 4,
  },
});

export default BusinessFeedCard;






