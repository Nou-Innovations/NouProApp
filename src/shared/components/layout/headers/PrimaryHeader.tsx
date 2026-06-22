import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import AnimatedMenuIcon from '@/shared/components/ui/AnimatedMenuIcon';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type HeaderAction = {
  icon: string;
  onPress: () => void;
  accessibilityLabel?: string;
  badge?: number; // Optional badge count for notification icons
  iconColor?: string;
};

/**
 * PrimaryHeader
 * Canonical header for primary "navigating" tab screens only
 * (Business: Inbox / Notifications / Analytics / Explore — Personal: Home / Inbox / Activities).
 * Every other screen uses SecondaryHeader; chat uses ChatHeader.
 * - Center-aligned title (32/600)
 * - Optional subtitle (13/500), centered under the title
 * - Optional leading icon button (hamburger menu / back)
 * - Right actions (icon buttons with optional badges)
 * - Optional onTitlePress for dropdown functionality
 */
export interface PrimaryHeaderProps {
  title: string;
  subtitle?: string;
  onTitlePress?: () => void; // Makes title tappable with chevron
  leftAction?: HeaderAction; // Optional leading icon button (e.g. hamburger menu)
  actions?: HeaderAction[];
  transparent?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export default function PrimaryHeader({
  title,
  subtitle,
  onTitlePress,
  leftAction,
  actions = [],
  transparent = false,
  style,
  titleStyle,
  subtitleStyle,
}: PrimaryHeaderProps) {
  const { theme } = useTheme();
  const bg = transparent ? 'transparent' : theme.colors.background;

  const titleContent = (
    <>
      <View style={styles.titleRow}>
        <Text
          style={[styles.title, { color: theme.colors.text }, titleStyle]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {onTitlePress ? (
          <View style={styles.chevronContainer}>
            <Icon name="chevron-down" size={24} color={theme.colors.iconColor} strokeWidth={2} />
          </View>
        ) : null}
      </View>
      {subtitle ? (
        <Text
          style={[styles.subtitle, { color: theme.colors.textLight }, subtitleStyle]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }, style]}>
      {/* Left zone (in normal flow, pinned left via space-between) */}
      <View style={styles.side}>
        {leftAction ? (
          <TouchableOpacity
            onPress={leftAction.onPress}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={leftAction.accessibilityLabel}
          >
            {leftAction.icon === 'menu' || leftAction.icon === 'menu-outline' ? (
              <AnimatedMenuIcon size={30} color={leftAction.iconColor ?? theme.colors.text} />
            ) : (
              <Icon
                name={leftAction.icon}
                size={leftAction.icon.includes('chevron') ? 30 : 26}
                color={leftAction.iconColor ?? theme.colors.text}
                strokeWidth={2}
              />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Centered title — absolute overlay so it stays in the true center of the
          header regardless of how much content sits in the left/right zones.
          pointerEvents="box-none" lets taps fall through to the side buttons. */}
      <View style={styles.center} pointerEvents="box-none">
        {onTitlePress ? (
          <TouchableOpacity
            style={styles.titleTouchable}
            onPress={onTitlePress}
            activeOpacity={0.7}
          >
            {titleContent}
          </TouchableOpacity>
        ) : (
          <View style={styles.titleTouchable}>{titleContent}</View>
        )}
      </View>

      {/* Right zone (rendered above the centered title so the buttons stay tappable) */}
      <View style={[styles.side, styles.rightSide]}>
        {actions.map((a, idx) => (
          <TouchableOpacity
            key={`${a.icon}-${idx}`}
            onPress={a.onPress}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={a.accessibilityLabel}
          >
            <Icon
              name={a.icon}
              size={24}
              color={a.iconColor ?? theme.colors.iconColor}
              strokeWidth={2}
            />
            {a.badge && a.badge > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
                <Text style={[styles.badgeText, { color: theme.colors.textInverse }]}>
                  {a.badge > 9 ? '9+' : a.badge}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSide: {
    justifyContent: 'flex-end',
  },
  // Centered title overlay. Symmetric horizontal padding keeps the title visually
  // centered while reserving room for the side icon buttons.
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 72,
  },
  titleTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 38,
    textAlign: 'center',
  },
  chevronContainer: {
    height: 38,
    justifyContent: 'center',
    marginLeft: 4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D6453E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
