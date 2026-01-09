import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

export type HeaderAction = {
  icon: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

export type SecondaryHeaderVariant = 'solid' | 'transparent';

/**
 * SecondaryHeader
 * Canonical secondary-screen header (detail/create/settings).
 * Typography/spacing/icon sizes NEVER change.
 *
 * Allowed variation:
 * - variant: solid | transparent
 * - transparentOverlayOpacity (0..1) when variant=transparent
 * - left/right actions count (0..2 typical)
 * - optional titlePress (dropdown)
 * - optional rightElement for custom content (use sparingly)
 */
export interface SecondaryHeaderProps {
  title: string;
  variant?: SecondaryHeaderVariant;
  transparentOverlayOpacity?: number; // only used for variant=transparent
  leftAction?: HeaderAction;          // typical: back
  rightActions?: HeaderAction[];      // 0..2 icon buttons
  rightElement?: React.ReactNode;     // custom right element (takes precedence over rightActions)
  onTitlePress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export default function SecondaryHeader({
  title,
  variant = 'solid',
  transparentOverlayOpacity = 0.0,
  leftAction,
  rightActions = [],
  rightElement,
  onTitlePress,
  style,
  titleStyle,
}: SecondaryHeaderProps) {
  const { theme } = useTheme();

  const backgroundColor = useMemo(() => {
    if (variant === 'solid') return theme.colors.background;
    // Transparent variant: allow optional overlay tint so title is readable on imagery
    const o = Math.max(0, Math.min(1, transparentOverlayOpacity));
    return o > 0 ? `rgba(0,0,0,${o})` : 'transparent';
  }, [variant, transparentOverlayOpacity, theme.colors.background]);

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
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
        {rightElement ? (
          <View style={styles.rightElementContainer}>{rightElement}</View>
        ) : (
          <>
            {rightActions.slice(0, 2).map((a, idx) => (
              <TouchableOpacity
                key={`${a.icon}-${idx}`}
                onPress={a.onPress}
                style={styles.iconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={a.accessibilityLabel}
              >
                <Icon name={a.icon} size={28} color={theme.colors.iconColor} strokeWidth={2} />
              </TouchableOpacity>
            ))}
            {/* Keep layout stable when fewer buttons */}
            {rightActions.length === 0 ? <View style={styles.iconButton} /> : null}
          </>
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
  rightElementContainer: {
    paddingRight: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 32,
  },
});

