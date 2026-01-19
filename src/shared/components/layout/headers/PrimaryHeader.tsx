import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Icon } from '@/shared/utils/icons';
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
 * Canonical header for primary "navigating" screens (Deliveries/Products/Invoices/etc).
 * - Left aligned title (24/600)
 * - Optional subtitle (13/500)
 * - Right actions (icon buttons with optional badges)
 * - Optional onTitlePress for dropdown functionality
 */
export interface PrimaryHeaderProps {
  title: string;
  subtitle?: string;
  onTitlePress?: () => void; // Makes title tappable with chevron
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
      {onTitlePress ? (
        <TouchableOpacity
          style={styles.left}
          onPress={onTitlePress}
          activeOpacity={0.7}
        >
          {titleContent}
        </TouchableOpacity>
      ) : (
        <View style={styles.left}>
          {titleContent}
        </View>
      )}

      <View style={styles.right}>
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
    paddingLeft: 20,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 38,
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
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
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

