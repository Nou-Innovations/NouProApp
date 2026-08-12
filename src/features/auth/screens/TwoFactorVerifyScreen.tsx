import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import { useProfileStore, normalizeUser, normalizeBusiness } from '@/shared/store/profileStore';
import { authAPI, unwrapAuthResponse } from '@/shared/services/api';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import { AppButton, TextButton } from '@/shared/components/ui';
import { KeyboardAwareScreen } from '@/shared/components/layout';

type Props = NativeStackScreenProps<AuthStackParamList, 'TwoFactorVerify'>;

/**
 * Seconds left on the temp token, read from its own `exp` claim.
 *
 * The token lives 5 minutes and nothing told the user that, so letting it lapse produced
 * "Invalid code" for a code that was perfectly correct (A-15). Same base64url decode the
 * API layer already does for the access token; unverified on purpose — this only drives
 * a label, the server is still the authority.
 */
function secondsLeft(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
    const { exp } = JSON.parse(atob(padded));
    if (!exp) return null;
    return Math.max(0, exp - Math.floor(Date.now() / 1000));
  } catch {
    return null;
  }
}

export default function TwoFactorVerifyScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { tempToken } = route.params;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(() => secondsLeft(tempToken));
  const expired = remaining !== null && remaining <= 0;

  const login = useProfileStore((state) => state.login);
  const setTwoFactorEnabled = useProfileStore((state) => state.setTwoFactorEnabled);
  const inputRef = useRef<TextInput>(null);

  // Tick the countdown. Recomputed from `exp` each second rather than decremented, so a
  // backgrounded app doesn't come back with a timer that's minutes behind reality.
  useEffect(() => {
    if (secondsLeft(tempToken) === null) return;
    const id = setInterval(() => setRemaining(secondsLeft(tempToken)), 1000);
    return () => clearInterval(id);
  }, [tempToken]);

  // There is no endpoint to refresh a temp token — re-entering the password is the only
  // way to get a new one, so "start over" means going back to sign-in.
  const handleStartOver = () => {
    navigation.navigate('Login');
  };

  const handleVerify = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Please enter a code');
      return;
    }

    if (!isBackupMode && trimmedCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (expired) {
      setError('This sign-in request expired. Please start over.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verify2FA(tempToken, trimmedCode);
      const { user, token, refreshToken, businesses } = unwrapAuthResponse(response);

      // Complete login
      login(user as any, token, refreshToken, businesses);
      setTwoFactorEnabled(true);
    } catch (err: any) {
      if (err.status === 0 || err.code === 'ERR_NETWORK') {
        setError('No internet connection. Please check your network and try again.');
      } else if (err.response?.error?.code === 'TEMP_TOKEN_EXPIRED') {
        // Say what actually happened. This used to read "Invalid code", sending people
        // to re-check an authenticator app that was showing the right code (A-15).
        setRemaining(0);
        setError('This sign-in request expired. Please start over.');
      } else {
        setError(err.response?.message || err.message || 'Invalid code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleBackupMode = () => {
    setIsBackupMode(!isBackupMode);
    setCode('');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
      >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="arrow-back" size={24} color={appTheme.colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: appTheme.colors.text }]}>
              Two-Factor Authentication
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              {isBackupMode
                ? 'Enter one of your backup codes'
                : 'Enter the 6-digit code from your authenticator app'}
            </Text>
            {remaining !== null ? (
              <Text
                style={[
                  styles.countdown,
                  { color: expired ? appTheme.colors.error : appTheme.colors.textSecondary },
                ]}
              >
                {expired
                  ? 'This request has expired'
                  : `Expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}
              </Text>
            ) : null}
          </View>

          {/* Error */}
          {error ? (
            <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
          ) : null}

          {/* Code Input */}
          <View style={styles.formContainer}>
            <TextInput
              ref={inputRef}
              style={[
                styles.codeInput,
                {
                  color: appTheme.colors.text,
                  backgroundColor: appTheme.colors.surface,
                  borderColor: error ? appTheme.colors.error : appTheme.colors.borderColor,
                },
              ]}
              value={code}
              onChangeText={(text) => {
                setCode(isBackupMode ? text : text.replace(/[^0-9]/g, '').slice(0, 6));
                if (error) setError('');
              }}
              placeholder={isBackupMode ? 'Enter backup code' : '000000'}
              placeholderTextColor={appTheme.colors.textSecondary}
              keyboardType={isBackupMode ? 'default' : 'number-pad'}
              autoFocus
              textAlign="center"
              maxLength={isBackupMode ? 20 : 6}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <AppButton
              title="Verify"
              onPress={handleVerify}
              loading={loading}
              disabled={loading || !code.trim() || expired}
              variant={code.trim() && !loading && !expired ? 'primary' : 'disabled'}
            />

            {expired ? (
              <TextButton
                title="Start over"
                onPress={handleStartOver}
                style={styles.switchModeButton}
                textStyle={styles.switchModeText}
              />
            ) : (
              <TextButton
                title={isBackupMode ? 'Use authenticator app instead' : 'Use a backup code instead'}
                onPress={toggleBackupMode}
                style={styles.switchModeButton}
                textStyle={styles.switchModeText}
              />
            )}
          </View>
      </KeyboardAwareScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 36,
    marginBottom: 8,
  },
  countdown: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 16,
  },
  formContainer: {
    gap: 20,
  },
  codeInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    letterSpacing: 8,
    paddingHorizontal: 16,
  },
  switchModeButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  switchModeText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
});
