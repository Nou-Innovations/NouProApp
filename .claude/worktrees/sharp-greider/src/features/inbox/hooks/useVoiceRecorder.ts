/**
 * useVoiceRecorder Hook
 *
 * Manages voice recording lifecycle using expo-av.
 * States: idle -> recording -> stopped
 * Returns recording URI and duration when done.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

type RecordingState = 'idle' | 'recording' | 'stopped';

interface UseVoiceRecorderReturn {
  state: RecordingState;
  duration: number;
  recordingUri: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      recordingRef.current = recording;
      setRecordingUri(null);
      setState('recording');
      startTimeRef.current = Date.now();
      setDuration(0);

      // Update duration every second
      intervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      console.error('[VoiceRecorder] Failed to start recording:', err);
      setState('idle');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(finalDuration);
      setRecordingUri(uri);
      setState('stopped');
      recordingRef.current = null;
    } catch (err) {
      console.error('[VoiceRecorder] Failed to stop recording:', err);
      setState('idle');
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    setRecordingUri(null);
    setDuration(0);
    setState('idle');
  }, []);

  return {
    state,
    duration,
    recordingUri,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
