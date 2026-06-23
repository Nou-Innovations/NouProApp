/**
 * LaunchScreen - Animated launch sequence for NouPro
 * 
 * Stages:
 * 1. "NOUPRO" fades in centered
 * 2. Logo scales down to 24px + moves to top 25%; tagline appears; background fades in; gradient slides up
 * 3. (Not signed in) CTA button + sign-in text appears
 * 4. (Signed in) Progress bar appears instead
 * 
 * Colors:
 * - Background: #1A1714 (warm espresso)
 * - Accent: #FF7A00 (NouPro brand orange)
 * - Text: #FFFFFF
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Dimensions,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import theme from '@/shared/theme';

// TEMP: bump this string every time we publish a diagnostic OTA, so we can
// confirm on-device which JS bundle is actually running. Remove when fonts work.
const BUILD_TAG = 'DX1';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// NouPro brand colors
const COLORS = {
  background: '#1A1714',
  accent: '#FF7A00',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.85)',
} as const;

// Logo sizing
const LOGO_INITIAL_SIZE = 48; // Starting font size
const LOGO_FINAL_SIZE = 32;   // Final font size when moved up
const LOGO_SCALE_FACTOR = LOGO_FINAL_SIZE / LOGO_INITIAL_SIZE; // 0.5

// Logo final position: 80px below safe area top
const LOGO_TOP_MARGIN = 100;

// Timing constants (ms)
const TIMING = {
  // Stage 1: Logo appears and holds
  logoScaleUpDelay: 150,
  logoScaleUpDuration: 800,
  logoHoldDuration: 800, // Logo stays visible before stage 2
  
  // Stage 2: Scene transition (calculated: delay + scaleUp + hold)
  get stage2Delay() { return this.logoScaleUpDelay + this.logoScaleUpDuration + this.logoHoldDuration; }, // 1800ms
  
  // Background & gradient
  bgFadeDuration: 1200,
  gradientDelay: 200,
  gradientFadeDuration: 800,
  gradientSlideDuration: 1000,
  
  // Logo movement
  logoMoveDuration: 800,
  
  // Tagline
  taglineDelay: 300,
  taglineFadeDuration: 600,
  
  // Stage 3/4: Actions
  actionsDelay: 800,
  actionsFadeDuration: 600,
  actionsSlideDuration: 700,
  
  // Total animation (for onFinished callback)
  get totalDuration() { return this.stage2Delay + 1500; }, // ~3300ms
} as const;

// Easing curves - professional ease-in-out
const easeInOut = Easing.bezier(0.42, 0, 0.58, 1);
const easeOut = Easing.bezier(0.0, 0, 0.2, 1);
const easeIn = Easing.bezier(0.4, 0, 1, 1);

interface LaunchScreenProps {
  /** Whether user is already signed in */
  isSignedIn: boolean;
  /** Loading progress 0-1 (only used when signed in) */
  progress?: number;
  /** Called when "Join the club" is pressed */
  onJoin?: () => void;
  /** Called when "Sign In" is pressed */
  onSignIn?: () => void;
  /** Called when animation completes */
  onFinished?: () => void;
  /** Background image source (pass require('./path/to/image.jpg')) */
  backgroundImage?: ImageSourcePropType;
}

/**
 * LaunchScreen Component
 */
export default function LaunchScreen({
  isSignedIn,
  progress,
  onJoin,
  onSignIn,
  onFinished,
  backgroundImage,
}: LaunchScreenProps) {
  const insets = useSafeAreaInsets();
  const [animationDone, setAnimationDone] = useState(false);

  // ========== Shared Animation Values ==========
  
  // Background
  const bgOpacity = useSharedValue(0);
  
  // Gradient
  const gradientY = useSharedValue(160);
  const gradientOpacity = useSharedValue(0);
  
  // Logo (starts at scale 0, scales up to 1 (48px), then down to 0.5 (24px))
  const logoScale = useSharedValue(0);
  const logoY = useSharedValue(0);
  
  // Tagline
  const taglineOpacity = useSharedValue(0);
  const taglineScale = useSharedValue(0.9);
  
  // Actions (CTA / Progress)
  const actionsOpacity = useSharedValue(0);
  const actionsY = useSharedValue(40);
  
  // Progress bar animations
  const progressTrackOpacity = useSharedValue(0);
  const progressFillWidth = useSharedValue(0);

  // Animate progress fill smoothly when progress changes
  useEffect(() => {
    if (typeof progress === 'number') {
      const targetValue = Math.max(0, Math.min(1, progress));
      progressFillWidth.value = withTiming(targetValue, {
        duration: 400,
        easing: easeInOut,
      });
    }
  }, [progress]);

  // Mark animation complete (only call onFinished if signed in)
  const markAnimationDone = useCallback(() => {
    setAnimationDone(true);
    // Only auto-navigate to main app if user is signed in
    // If not signed in, they need to tap "Join" or "Sign In"
    if (isSignedIn) {
      onFinished?.();
    }
  }, [onFinished, isSignedIn]);

  // Calculate logo final position: 80px below safe area top
  // Logo starts at center, so we calculate how much to move up
  const logoMoveUp = useMemo(() => {
    const centerY = SCREEN_HEIGHT / 2;
    const targetY = insets.top + LOGO_TOP_MARGIN;
    return -(centerY - targetY);
  }, [insets.top]);

  // ========== Animation Sequence ==========
  
  useEffect(() => {
    // Calculate stage 2 start time
    const stage2Start = TIMING.logoScaleUpDelay + TIMING.logoScaleUpDuration + TIMING.logoHoldDuration;

    // ---- Stage 1: NOUPRO scales up from 0 → 1, holds, then scales down ----
    logoScale.value = withDelay(
      TIMING.logoScaleUpDelay,
      withSequence(
        // Scale up from 0 to 1
        withTiming(1, { 
          duration: TIMING.logoScaleUpDuration, 
          easing: easeInOut 
        }),
        // Hold at 1 for the hold duration
        withTiming(1, { 
          duration: TIMING.logoHoldDuration, 
        }),
        // Scale down to final size
        withTiming(LOGO_SCALE_FACTOR, { 
          duration: TIMING.logoMoveDuration, 
          easing: easeInOut 
        })
      )
    );

    // ---- Stage 2: Scene transition (after logo holds) ----

    // Background fades in smoothly
    bgOpacity.value = withDelay(
      stage2Start,
      withTiming(1, { 
        duration: TIMING.bgFadeDuration, 
        easing: easeInOut 
      })
    );

    // Gradient fades in and slides up
    gradientOpacity.value = withDelay(
      stage2Start + TIMING.gradientDelay,
      withTiming(1, { 
        duration: TIMING.gradientFadeDuration, 
        easing: easeInOut 
      })
    );

    gradientY.value = withDelay(
      stage2Start + TIMING.gradientDelay,
      withTiming(0, { 
        duration: TIMING.gradientSlideDuration, 
        easing: easeInOut 
      })
    );

    // Logo moves up simultaneously with scale down
    logoY.value = withDelay(
      stage2Start,
      withTiming(logoMoveUp, { 
        duration: TIMING.logoMoveDuration, 
        easing: easeInOut 
      })
    );

    // Tagline fades in and scales up (slightly after logo starts moving)
    taglineOpacity.value = withDelay(
      stage2Start + TIMING.taglineDelay,
      withTiming(1, { 
        duration: TIMING.taglineFadeDuration, 
        easing: easeInOut 
      })
    );
    
    taglineScale.value = withDelay(
      stage2Start + TIMING.taglineDelay,
      withTiming(1, { 
        duration: TIMING.taglineFadeDuration, 
        easing: easeInOut 
      })
    );

    // ---- Stage 3/4: Actions appear ----
    actionsOpacity.value = withDelay(
      stage2Start + TIMING.actionsDelay,
      withTiming(1, { 
        duration: TIMING.actionsFadeDuration, 
        easing: easeInOut 
      })
    );

    actionsY.value = withDelay(
      stage2Start + TIMING.actionsDelay,
      withTiming(0, { 
        duration: TIMING.actionsSlideDuration, 
        easing: easeInOut 
      })
    );

    // Mark animation complete
    const totalTime = stage2Start + TIMING.actionsDelay + TIMING.actionsFadeDuration + 200;
    const timer = setTimeout(() => {
      runOnJS(markAnimationDone)();
    }, totalTime);

    return () => clearTimeout(timer);
  }, [logoMoveUp]);

  // Animate progress track fade in when signed in
  useEffect(() => {
    if (isSignedIn) {
      // Fade in the progress track after actions appear
      const stage2Start = TIMING.logoScaleUpDelay + TIMING.logoScaleUpDuration + TIMING.logoHoldDuration;
      const trackFadeDelay = stage2Start + TIMING.actionsDelay + 200;
      
      progressTrackOpacity.value = withDelay(
        trackFadeDelay,
        withTiming(1, {
          duration: 400,
          easing: easeInOut,
        })
      );
      
      // If no external progress, animate internal progress smoothly
      if (typeof progress !== 'number') {
        progressFillWidth.value = withDelay(
          trackFadeDelay + 400,
          withSequence(
            withTiming(0.6, { 
              duration: 1500, 
              easing: easeInOut 
            }),
            withTiming(0.85, { 
              duration: 2000, 
              easing: easeInOut 
            })
          )
        );
      }
    }
  }, [isSignedIn, progress]);

  // ========== Animated Styles ==========

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const logoWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: logoY.value },
      { scale: logoScale.value },
    ],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ scale: taglineScale.value }],
  }));

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacity.value,
    transform: [{ translateY: gradientY.value }],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [{ translateY: actionsY.value }],
  }));

  const progressTrackStyle = useAnimatedStyle(() => ({
    opacity: progressTrackOpacity.value,
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    // Max fill is 90% of track width (100% progress = 90% visual)
    width: `${progressFillWidth.value * 90}%`,
  }));

  // ========== Render ==========

  return (
    <View style={styles.root}>
      {/* TEMP DIAGNOSTIC — remove once fonts render correctly.
          Uses the default system font on purpose so it shows regardless of
          custom-font state. */}
      <View style={[styles.debugBox, { top: insets.top + 8 }]} pointerEvents="none">
        <Text style={styles.debugText}>
          {`BUILD ${BUILD_TAG}  •  EB:${Font.isLoaded('InterCustom-ExtraBold') ? 'Y' : 'N'} `}
          {`B:${Font.isLoaded('InterCustom-Bold') ? 'Y' : 'N'} `}
          {`SB:${Font.isLoaded('InterCustom-SemiBold') ? 'Y' : 'N'} `}
          {`M:${Font.isLoaded('InterCustom-Medium') ? 'Y' : 'N'} `}
          {`R:${Font.isLoaded('InterCustom-Regular') ? 'Y' : 'N'}`}
        </Text>
        <Text style={styles.debugCompare}>AaGg 123 — system font ↑ vs Inter ↓</Text>
        <Text style={[styles.debugCompare, { fontFamily: 'InterCustom-ExtraBold' }]}>AaGg 123 — Inter ExtraBold</Text>
      </View>

      {/* Background Image (fades in at stage 2) */}
      {backgroundImage && (
        <Animated.Image
          source={backgroundImage}
          style={[StyleSheet.absoluteFill, styles.bgImage, bgStyle]}
          resizeMode="cover"
        />
      )}

      {/* Bottom Gradient (slides up) */}
      <Animated.View style={[styles.gradientWrap, gradientStyle]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
          locations={[0, 0.55, 1]}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Center Content Area */}
      <View style={styles.centerArea}>
        {/* Logo - NOUPRO */}
        <Animated.View style={[styles.logoWrap, logoWrapStyle]}>
          <Text style={styles.logoText}>NOUPRO</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineWrap, taglineStyle]}>
          <Text style={styles.tagline}>Take the{'\n'}control</Text>
        </Animated.View>
      </View>

      {/* Bottom Actions */}
      <Animated.View 
        style={[
          styles.bottomArea, 
          actionsStyle,
          { paddingBottom: Math.max(insets.bottom, 24) + 28 }
        ]}
      >
        {!isSignedIn ? (
          // CTA + Sign In
          <>
            <Pressable 
              style={styles.primaryBtn} 
              onPress={onJoin}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            >
              <Text style={styles.primaryBtnText}>Join the club</Text>
            </Pressable>

            <View style={styles.signInRow}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <Pressable onPress={onSignIn} hitSlop={8}>
                <Text style={styles.signInLink}>Sign In</Text>
              </Pressable>
            </View>
          </>
        ) : (
          // Progress Bar - fades in then fills smoothly
          <Animated.View style={[styles.progressTrack, progressTrackStyle]}>
            <Animated.View style={[styles.progressFill, progressFillStyle]} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // TEMP DIAGNOSTIC styles — remove with the debug overlay above.
  debugBox: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderWidth: 1,
    borderColor: '#FF7A00',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  debugText: {
    color: '#FF7A00',
    fontSize: 13,
    textAlign: 'center',
  },
  debugCompare: {
    color: '#FFFFFF',
    fontSize: 22,
    marginTop: 4,
  },
  
  // Background
  bgImage: {
    width: '100%',
    height: '100%',
  },
  
  // Gradient
  gradientWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  gradient: {
    height: 420,
    width: '100%',
  },
  
  // Center content
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  
  // Logo
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: COLORS.text,
    fontSize: LOGO_INITIAL_SIZE,
    fontFamily: theme.fonts?.primary?.extraBold || 'InterCustom-ExtraBold',
    letterSpacing: 2,
  },
  
  // Tagline
  taglineWrap: {
    position: 'absolute',
    top: '45%',
    alignItems: 'center',
  },
  tagline: {
    color: COLORS.text,
    fontSize: 80,
    lineHeight: 74,
    textAlign: 'center',
    fontFamily: theme.fonts?.primary?.extraBold || 'InterCustom-ExtraBold',
  },
  
  // Bottom actions
  bottomArea: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    zIndex: 3,
  },
  
  // CTA Button
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: 18,
    fontFamily: theme.fonts?.primary?.bold || 'InterCustom-Bold',
  },
  
  // Sign In Row
  signInRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontFamily: theme.fonts?.primary?.regular || 'InterCustom-Regular',
  },
  signInLink: {
    color: COLORS.accent,
    fontSize: 16,
    fontFamily: theme.fonts?.primary?.bold || 'InterCustom-Bold',
  },
  
  // Progress Bar
  progressTrack: {
    height: 3,
    backgroundColor: 'white',
    borderRadius: 2,
    overflow: 'hidden',
    marginHorizontal: 24,
    marginBottom: 40,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
});
