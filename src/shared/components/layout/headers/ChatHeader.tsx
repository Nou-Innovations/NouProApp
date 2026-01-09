import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type HeaderAction = {
  icon: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

/**
 * ChatHeader
 * Specialized header for chat/conversation screens.
 * Based on SecondaryHeader but without transparency logic.
 * 
 * Features:
 * - Centered title (tappable to view profile)
 * - Left action (typically back button)
 * - Right action (typically profile icon)
 */
export interface ChatHeaderProps {
  title: string;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  onTitlePress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export default function ChatHeader({
  title,
  leftAction,
  rightAction,
  onTitlePress,
  style,
  titleStyle,
}: ChatHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, style]}>
      <View style={styles.side}>
        {leftAction ? (
          <TouchableOpacity
            onPress={leftAction.onPress}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={leftAction.accessibilityLabel}
          >
            {/* Chevron icons need larger size (32px) for visual balance with other icons (28px) */}
            <Icon 
              name={leftAction.icon} 
              size={leftAction.icon.includes('chevron') ? 32 : 28} 
              color={theme.colors.iconColor} 
              strokeWidth={2} 
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      <TouchableOpacity
        onPress={onTitlePress}
        disabled={!onTitlePress}
        activeOpacity={0.8}
        style={styles.titleContainer}
      >
        <Text
          style={[styles.title, { color: theme.colors.text }, titleStyle]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </TouchableOpacity>

      <View style={[styles.side, styles.rightSide]}>
        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={rightAction.accessibilityLabel}
          >
            <Icon name={rightAction.icon} size={28} color={theme.colors.iconColor} strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSide: {
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 32,
  },
});

