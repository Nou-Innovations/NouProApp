/**
 * VoicePlayer Component
 *
 * Plays a voice message with play/pause button, progress bar, and duration display.
 * Uses expo-av Audio.Sound.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface VoicePlayerProps {
  audioUrl?: string;
  durationSeconds?: number;
  isOutgoing: boolean;
}

export default function VoicePlayer({ audioUrl, durationSeconds = 0, isOutgoing }: VoicePlayerProps) {
  const { theme: appTheme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durationSeconds * 1000);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(async () => {
    if (!audioUrl) return;

    try {
      if (!soundRef.current) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPosition(status.positionMillis);
              if (status.durationMillis) {
                setTotalDuration(status.durationMillis);
              }
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                soundRef.current?.setPositionAsync(0);
              }
            }
          }
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } else if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[VoicePlayer] Playback error:', err);
    }
  }, [audioUrl, isPlaying]);

  const progress = totalDuration > 0 ? position / totalDuration : 0;
  const displayDuration = totalDuration > 0 ? formatTime(totalDuration) : formatTime(durationSeconds * 1000);
  const displayPosition = position > 0 ? formatTime(position) : '0:00';

  const accentColor = isOutgoing ? appTheme.colors.textInverse : appTheme.colors.primary;
  const mutedColor = isOutgoing ? 'rgba(255,255,255,0.5)' : appTheme.colors.textMuted;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
        <Icon
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={accentColor}
        />
      </TouchableOpacity>
      <View style={styles.waveformContainer}>
        <View style={[styles.progressTrack, { backgroundColor: mutedColor }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accentColor }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: mutedColor }]}>{displayPosition}</Text>
          <Text style={[styles.timeText, { color: mutedColor }]}>{displayDuration}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minWidth: 200,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  waveformContainer: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
  },
});
