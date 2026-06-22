/**
 * HeroHeader
 * Canonical header for screens with a full-bleed hero / cover image
 * (product detail, business profiles). Floats absolutely over the image:
 * - Always-visible round translucent controls (back / save / share / settings) with white icons
 * - Optional solid title bar that fades in as the user scrolls past the image
 *   (pass `scrollY`; without it the bar never appears — plain floating controls)
 * - Optional top gradient scrim so white icons stay legible over bright images
 * Owns its own safe-area top inset (unlike the per-screen headers it replaces).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import type { HeaderAction } from './PrimaryHeader';

export interface HeroHeaderProps {
  title: string;
  leftAction?: HeaderAction; // typically back (omit on tab roots)
  rightActions?: HeaderAction[]; // save / share / settings (0..3)
  /** Drives the solid-bar fade. Omit → the bar never shows (plain floating controls). */
  scrollY?: SharedValue<number>;
  /** Used to derive fadeStart/fadeEnd (0.45 → 0.78 of height) when they aren't passed. */
  heroHeight?: number;
  fadeStart?: number;
  fadeEnd?: number;
  /** Top dark→transparent gradient for icon legibility over imagery. Default true. */
  showScrim?: boolean;
  /** Icon tint for the floating controls. Default white (required over imagery). */
  controlIconColor?: string;
}

const BAR_CONTENT = 52;

export default function HeroHeader({
  title,
  leftAction,
  rightActions = [],
  scrollY,
  heroHeight,
  fadeStart,
  fadeEnd,
  showScrim = true,
  controlIconColor = '#FFFFFF',
}: HeroHeaderProps) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = insets.top;

  const start = fadeStart ?? (heroHeight ? heroHeight * 0.45 : 0);
  const end = fadeEnd ?? (heroHeight ? heroHeight * 0.78 : 1);

  // useAnimatedStyle must run unconditionally; guard the worklet body so an
  // omitted scrollY simply keeps the solid bar hidden (opacity 0).
  const barStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 0 };
    return {
      opacity: interpolate(scrollY.value, [start, end], [0, 1], Extrapolation.CLAMP),
    };
  }, [scrollY, start, end]);

  const renderButton = (action: HeaderAction, key: string) => (
    <TouchableOpacity
      key={key}
      style={[styles.button, action.disabled ? styles.buttonDisabled : null]}
      onPress={action.onPress}
      disabled={action.disabled}
      activeOpacity={0.8}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={action.accessibilityLabel}
      accessibilityRole="button"
    >
      <Icon name={action.icon} size={20} color={action.iconColor ?? controlIconColor} />
      {action.badge != null && action.badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: appTheme.colors.accent }]}>
          <Text style={styles.badgeText}>{action.badge > 9 ? '9+' : action.badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Top scrim — keeps the white controls legible over bright images */}
      {showScrim ? (
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.scrim, { height: topInset + 64 }]}
          pointerEvents="none"
        />
      ) : null}

      {/* Solid bar + title (fades in on scroll when scrollY is provided) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bar,
          {
            height: topInset + BAR_CONTENT,
            paddingTop: topInset,
            backgroundColor: appTheme.colors.cardBackground,
            borderBottomColor: appTheme.colors.borderColor,
          },
          barStyle,
        ]}
      >
        <Text style={[styles.title, { color: appTheme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>

      {/* Always-visible controls */}
      <View style={[styles.controls, { paddingTop: topInset + 6 }]} pointerEvents="box-none">
        <View style={styles.side}>{leftAction ? renderButton(leftAction, 'left') : null}</View>
        <View style={styles.right}>
          {rightActions.map((a, idx) => renderButton(a, `${a.icon}-${idx}`))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 64,
  },
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  side: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
