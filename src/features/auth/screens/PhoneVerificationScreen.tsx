/**
 * PhoneVerificationScreen
 * Verify phone number with 6-digit code sent via SMS
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import { AppButton, TextButton } from '@/shared/components/ui';
import CodeInput from '@/shared/components/ui/CodeInput';
import { authAPI } from '@/shared/services/api';
import { IS_DEV } from '@/config/env';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneVerification'>;

// Only use mock verification in development
const VALID_CODE = IS_DEV ? '123456' : null;

export default function PhoneVerificationScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userData } = route.params;
  
  // State
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeInputKey, setCodeInputKey] = useState(0);

  // Mask phone number for display (e.g., +230 597....34)
  const maskPhone = (phone: string, countryCode: string) => {
    if (phone.length < 4) return `${countryCode} ${phone}`;
    const firstThree = phone.substring(0, 3);
    const lastTwo = phone.substring(phone.length - 2);
    return `${countryCode} ${firstThree}....${lastTwo}`;
  };

  const maskedPhone = maskPhone(userData.phone, userData.countryCode);

  // Check if code is complete
  const isCodeComplete = code.length === 6;

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (error) setError('');
  };

  const handleCodeComplete = (completedCode: string) => {
    setCode(completedCode);
  };

  const handleVerify = async () => {
    if (!isCodeComplete) return;

    setIsVerifying(true);
    setError('');

    try {
      if (IS_DEV && code === VALID_CODE) {
        navigation.navigate('CreatePassword', { userData });
        return;
      }

      await authAPI.verifyPhoneOTP(userData.phone, userData.countryCode, code);
      navigation.navigate('CreatePassword', { userData });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Incorrect code. Please try again.';
      setError(message);
      setCode('');
      setCodeInputKey(prev => prev + 1);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await authAPI.sendPhoneOTP(userData.phone, userData.countryCode);
      Alert.alert(
        'Code Sent',
        `A new verification code has been sent to ${maskedPhone}`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resend code. Please try again.');
    }
    setError('');
    setCode('');
    setCodeInputKey(prev => prev + 1);
  };

  const handleSendOnEmail = async () => {
    if (!userData.email) {
      Alert.alert(
        'Email Required',
        'You need to provide an email address to receive the code via email.',
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    try {
      await authAPI.sendEmailOTP(userData.email);
      navigation.replace('EmailVerification', {
        userData,
        verificationMethod: 'email',
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send email code. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Enter the 6-digit code we messaged you
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            Verify your phone number {maskedPhone}. This helps us keep your account secure by verifying that it's really you.
          </Text>
        </View>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          <CodeInput
            key={codeInputKey}
            length={6}
            onComplete={handleCodeComplete}
            onChange={handleCodeChange}
            error={!!error}
            autoFocus
          />
          
          {/* Error Message */}
          {error ? (
            <Text style={[styles.errorText, { color: appTheme.colors.error }]}>
              {error}
            </Text>
          ) : null}
        </View>

        {/* Send on Email Link */}
        <TextButton
          title="Send on email"
          onPress={handleSendOnEmail}
          style={styles.sendEmailButton}
        />
      </View>

      {/* Bottom Buttons */}
      <View style={[
        styles.bottomContainer,
        { paddingBottom: insets.bottom + 16 }
      ]}>
        <AppButton
          title="Verify Code"
          onPress={handleVerify}
          variant={isCodeComplete ? 'primary' : 'disabled'}
          disabled={!isCodeComplete || isVerifying}
          loading={isVerifying}
        />
        <TextButton
          title="Resend Code"
          onPress={handleResendCode}
          disabled={isVerifying}
          tone="muted"
          style={styles.resendButton}
          textStyle={{ color: appTheme.colors.text }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 24,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 16,
    textAlign: 'center',
  },
  sendEmailButton: {
    alignSelf: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
  resendButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
