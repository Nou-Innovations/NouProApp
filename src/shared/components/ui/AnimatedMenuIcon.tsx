import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { useDrawerProgress } from '@react-navigation/drawer';

export interface AnimatedMenuIconProps {
  /** Bounding box / line length in px. */
  size?: number;
  /** Bar color. */
  color?: string;
  /** Length of each line in px (the hamburger width). */
  lineWidth?: number;
  /** Stroke weight, matched to the app's Icon component (Lucide, 24px viewBox). */
  strokeWidth?: number;
  /** Vertical gap between the two lines when closed (hamburger state). */
  gap?: number;
}

/**
 * AnimatedMenuIcon
 * Two-line hamburger that morphs into an X driven by the drawer's open progress.
 * The two bars sit parallel (gap apart) when the drawer is closed and rotate to
 * cross at center (±45°) as it opens — following the swipe gesture, not a fixed
 * toggle, by reading `useDrawerProgress()` (same SharedValue used by AnimatedTabs).
 *
 * IMPORTANT: `useDrawerProgress()` throws outside a drawer, so this component must
 * only be rendered for the hamburger ("menu") action, which only appears on
 * top-level tab screens that live inside MainDrawerNavigator. Do not render it on
 * detail screens that sit outside the drawer.
 */
export default function AnimatedMenuIcon({
  size = 26,
  color = '#000000',
  lineWidth = 22,
  strokeWidth = 2.5,
  gap = 7,
}: AnimatedMenuIconProps) {
  const progress = useDrawerProgress() as SharedValue<number>;

  // Lucide draws its strokes inside a 24px viewBox, so an icon rendered at `size`
  // shows a stroke of `size * strokeWidth / 24` px. Replicate that here so the two
  // bars weigh exactly the same as every other icon in the app (Icon defaults to 2.5).
  const thickness = (size * strokeWidth) / 24;

  const topStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateY: interpolate(p, [0, 1], [-gap / 2, 0], Extrapolation.CLAMP) },
        { rotate: `${interpolate(p, [0, 1], [0, 45], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  const bottomStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateY: interpolate(p, [0, 1], [gap / 2, 0], Extrapolation.CLAMP) },
        { rotate: `${interpolate(p, [0, 1], [0, -45], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  const barStyle = {
    width: lineWidth,
    height: thickness,
    borderRadius: thickness / 2,
    backgroundColor: color,
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.bar, barStyle, topStyle]} />
      <Animated.View style={[styles.bar, barStyle, bottomStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
  },
});
