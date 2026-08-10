/**
 * AppLockScreen
 *
 * Shown when a session exists but is hidden behind the lock. Two triggers, one screen:
 *  - Biometric sign-in: the app starts locked when biometrics are on, so Face ID is
 *    what actually gets you in. (Before this, the toggle enabled a feature that never
 *    ran — audit A-11.)
 *  - App Lock: re-locks after the app has been in the background past the timeout.
 *
 * Nothing here touches the network. The session is already on the device — persisted
 * user/businesses plus tokens in SecureStore — so unlocking is instant and works
 * offline. Biometrics prove possession of the device; they never stand in for the
 * account's second factor. If the stored session is gone or revoked, "Use password"
 * drops to the normal login screen, which enforces 2FA as usual.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import theme from '@/shared/theme';

const BIOMETRIC_USER_KEY = 'noupro_biometric_user_id';

export default function AppLockScreen() {
  const { theme: appTheme } = useTheme();
  const currentUser = useProfileStore((state) => state.currentUser);
  const biometricEnabled = useProfileStore((state) => state.biometricEnabled);
  const unlockApp = useProfileStore((state) => state.unlockApp);
  const logout = useProfileStore((state) => state.logout);

  const [isPrompting, setIsPrompting] = useState(false);
  const [failed, setFailed] = useState(false);
  // Ref, not state: the auto-prompt must fire exactly once per mount, and a state
  // update here would re-run the effect and re-open the system sheet.
  const hasPrompted = useRef(false);

  const signOutToPassword = useCallback(() => {
    // Unlock first so the gate doesn't hold a lock screen over the auth navigator.
    unlockApp();
    logout();
  }, [unlockApp, logout]);

  const promptBiometric = useCallback(async () => {
    if (isPrompting) return;
    setIsPrompting(true);
    setFailed(false);
    try {
      // Guard against unlocking the WRONG account: the stored id is from whoever
      // enabled biometrics. Until now this value was read and thrown away.
      const storedUserId = await SecureStore.getItemAsync(BIOMETRIC_USER_KEY).catch(() => null);
      if (storedUserId && currentUser?.id && storedUserId !== currentUser.id) {
        await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY).catch(() => {});
        signOutToPassword();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock NouPro',
        cancelLabel: 'Use password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        unlockApp();
      } else {
        // Cancelled or failed: stay locked and offer a way forward. The old code
        // silently swallowed this and left the user staring at nothing.
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setIsPrompting(false);
    }
  }, [isPrompting, currentUser?.id, unlockApp, signOutToPassword]);

  useEffect(() => {
    if (hasPrompted.current) return;
    hasPrompted.current = true;
    // If biometrics aren't available for some reason, don't trap the user behind a
    // prompt that can never succeed — they can still use the password route below.
    if (biometricEnabled) void promptBiometric();
  }, [biometricEnabled, promptBiometric]);

  const firstName = (currentUser?.name || '').split(' ')[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: appTheme.colors.cardBackground }]}>
          <Icon name="lock-closed" size={40} color={appTheme.colors.primary} />
        </View>

        <Text style={[styles.title, { color: appTheme.colors.text }]}>
          {firstName ? `Welcome back, ${firstName}` : 'NouPro is locked'}
        </Text>
        <Text style={[styles.subtitle, { color: appTheme.colors.textLight }]}>
          {failed
            ? 'Unlock to continue, or sign in with your password.'
            : 'Unlock to continue.'}
        </Text>

        {isPrompting ? (
          <ActivityIndicator style={styles.spinner} color={appTheme.colors.primary} />
        ) : (
          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: appTheme.colors.primary }]}
            onPress={promptBiometric}
            accessibilityLabel="Unlock with biometrics"
          >
            <Text style={[styles.unlockText, { color: appTheme.colors.textInverse }]}>Unlock</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={signOutToPassword} style={styles.passwordLink}>
          <Text style={[styles.passwordText, { color: appTheme.colors.textLight }]}>
            Use password instead
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontFamily: theme.fonts.primary.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  spinner: { marginVertical: 18 },
  unlockButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 10,
  },
  unlockText: { fontSize: theme.fontSize.base, fontFamily: theme.fonts.primary.semiBold },
  passwordLink: { marginTop: 24, padding: 8 },
  passwordText: { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.primary.medium },
});
