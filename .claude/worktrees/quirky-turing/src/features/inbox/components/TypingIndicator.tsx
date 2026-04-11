/**
 * TypingIndicator Component
 *
 * Displays "John is typing..." or "John, Sarah are typing..." with animated dots.
 * Positioned between message list and input area.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface TypingIndicatorProps {
  typingUsers: string[];
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const { theme: appTheme } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length === 0) return;

    const createDotAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );

    const anim1 = createDotAnimation(dot1, 0);
    const anim2 = createDotAnimation(dot2, 200);
    const anim3 = createDotAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [typingUsers.length > 0]);

  if (typingUsers.length === 0) return null;

  const getText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing`;
    }
    return `${typingUsers[0]} and ${typingUsers.length - 1} others are typing`;
  };

  const renderDot = (anim: Animated.Value) => (
    <Animated.Text
      style={[
        styles.dot,
        { color: appTheme.colors.textSecondary, opacity: anim },
      ]}
    >
      .
    </Animated.Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.surface }]}>
      <Text style={[styles.text, { color: appTheme.colors.textSecondary }]}>
        {getText()}
      </Text>
      {renderDot(dot1)}
      {renderDot(dot2)}
      {renderDot(dot3)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  text: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    fontStyle: 'italic',
  },
  dot: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginLeft: 1,
  },
});
