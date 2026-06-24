import React, { useState, useRef } from 'react';
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

export default function TwoFactorVerifyScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { tempToken } = route.params;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isBackupMode, setIsBackupMode] = useState(false);

  const login = useProfileStore((state) => state.login);
  const setTwoFactorEnabled = useProfileStore((state) => state.setTwoFactorEnabled);
  const inputRef = useRef<TextInput>(null);

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
              disabled={loading || !code.trim()}
              variant={code.trim() && !loading ? 'primary' : 'disabled'}
            />

            <TextButton
              title={isBackupMode ? 'Use authenticator app instead' : 'Use a backup code instead'}
              onPress={toggleBackupMode}
              style={styles.switchModeButton}
              textStyle={styles.switchModeText}
            />
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
