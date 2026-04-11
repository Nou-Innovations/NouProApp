/**
 * EmptyState - Reusable empty state component
 * 
 * A production-ready empty state system with optional Lottie animations.
 * Supports both full-screen and compact (section-level) modes.
 * Respects reduced motion accessibility settings.
 * 
 * Design: Professional, premium, calm - aligned with B2B SaaS (Notion, Stripe, Linear)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  AccessibilityInfo,
  Platform,
  Pressable,
  ViewStyle,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Text, ButtonText } from './Typography';
import { LottieSettings } from '@/shared/motion';

export interface EmptyStateProps {
  /** Title text (4-6 words max, confident tone) */
  title: string;
  
  /** Subtitle text (one sentence, calm and explanatory) */
  subtitle?: string;
  
  /** Lottie animation JSON require() reference */
  lottieSource?: any;
  
  /** Custom icon component (used when no Lottie or motion is reduced) */
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
  
  /** Icon name from lucide-react-native (alternative to Icon component) */
  iconName?: string;
  
  /** CTA button label */
  ctaLabel?: string;
  
  /** CTA button press handler */
  onCtaPress?: () => void;
  
  /** Compact mode for section-level empty states */
  compact?: boolean;
  
  /** Maximum width of the content container */
  maxWidth?: number;
  
  /** Optional testID for testing */
  testID?: string;
  
  /** Optional custom container style */
  style?: ViewStyle;
}

/**
 * Get reduced motion preference
 */
async function getReducedMotion(): Promise<boolean> {
  try {
    const reduce = await AccessibilityInfo.isReduceMotionEnabled();
    return !!reduce;
  } catch {
    return false;
  }
}

export function EmptyState({
  title,
  subtitle,
  lottieSource,
  Icon: CustomIcon,
  iconName,
  ctaLabel,
  onCtaPress,
  compact = false,
  maxWidth = 520,
  testID,
  style,
}: EmptyStateProps) {
  const { theme: appTheme } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    getReducedMotion().then((v) => mounted && setReduceMotion(v));

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (v: boolean) => setReduceMotion(!!v)
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  const showLottie = !!lottieSource && !reduceMotion;
  const showCustomIcon = !showLottie && !!CustomIcon;
  const showIconName = !showLottie && !showCustomIcon && !!iconName;
  const canPress = !!ctaLabel && !!onCtaPress;

  // Icon size based on compact mode
  const iconSize = compact ? 28 : 34;
  const iconColor = appTheme.colors.textMuted;

  return (
    <View
      testID={testID}
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        style,
      ]}
    >
      <View style={[styles.card, { maxWidth }]}>
        {/* Media: Lottie or Icon */}
        {(showLottie || showCustomIcon || showIconName) && (
          <View style={[styles.media, compact && styles.mediaCompact]}>
            {showLottie ? (
              <LottieView
                source={lottieSource}
                autoPlay
                loop
                speed={LottieSettings.defaultSpeed}
                resizeMode="contain"
                style={[styles.lottie, compact && styles.lottieCompact]}
              />
            ) : showCustomIcon && CustomIcon ? (
              <CustomIcon size={iconSize} color={iconColor} />
            ) : showIconName ? (
              <Icon name={iconName as any} size={iconSize} color={iconColor} />
            ) : null}
          </View>
        )}

        {/* Title */}
        <Text
          style={[
            styles.title,
            compact && styles.titleCompact,
            { color: appTheme.colors.text },
          ]}
        >
          {title}
        </Text>

        {/* Subtitle */}
        {!!subtitle && (
          <Text
            style={[
              styles.subtitle,
              compact && styles.subtitleCompact,
              { color: appTheme.colors.textSecondary },
            ]}
          >
            {subtitle}
          </Text>
        )}

        {/* CTA Button */}
        {canPress && (
          <Pressable
            onPress={onCtaPress}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: appTheme.colors.primary },
              pressed && styles.buttonPressed,
              compact && styles.buttonCompact,
            ]}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            <ButtonText style={{ color: appTheme.colors.textInverse }}>
              {ctaLabel}
            </ButtonText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  wrapCompact: {
    flex: undefined,
    paddingVertical: theme.spacing.md,
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  media: {
    height: 150,
    width: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm + 6, // 14px
  },
  mediaCompact: {
    height: 110,
    width: 110,
    marginBottom: theme.spacing.sm + 2, // 10px
  },
  lottie: {
    height: 150,
    width: 150,
  },
  lottieCompact: {
    height: 110,
    width: 110,
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: theme.fonts.primary.bold,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    maxWidth: 420,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    marginTop: theme.spacing.sm + 6, // 14px
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2, // 10px
    borderRadius: theme.borderRadius.lg,
  },
  buttonCompact: {
    marginTop: theme.spacing.sm + 4, // 12px
  },
  buttonPressed: {
    opacity: Platform.select({ ios: 0.85, android: 0.9, default: 0.9 }),
    transform: [{ scale: 0.99 }],
  },
});

export default EmptyState;
