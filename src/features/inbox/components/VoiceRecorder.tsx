/**
 * VoiceRecorder Component
 *
 * Replaces input area when recording.
 * Shows pulsing red dot, timer, cancel/send buttons.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface VoiceRecorderProps {
  duration: number;
  onCancel: () => void;
  onSend: () => void;
}

export default function VoiceRecorder({ duration, onCancel, onSend }: VoiceRecorderProps) {
  const { theme: appTheme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const formatDuration = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background, borderTopColor: appTheme.colors.borderColor }]}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
        <Icon name="x" size={24} color={appTheme.colors.error} />
      </TouchableOpacity>

      <View style={styles.recordingInfo}>
        <Animated.View style={[styles.redDot, { opacity: pulseAnim }]} />
        <Text style={[styles.timer, { color: appTheme.colors.text }]}>
          {formatDuration(duration)}
        </Text>
      </View>

      <TouchableOpacity onPress={onSend} style={[styles.sendButton, { backgroundColor: appTheme.colors.primary }]}>
        <Icon name="send" size={20} color={appTheme.colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  cancelButton: {
    padding: 8,
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D6453E',
  },
  timer: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.medium,
    fontVariant: ['tabular-nums'],
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
