/**
 * PhoneVerificationScreen
 * Verify phone number with 6-digit code sent via SMS
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppButton from '@/shared/components/ui/AppButton';
import CodeInput from '@/shared/components/ui/CodeInput';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneVerification'>;

// Mock verification code for testing
const VALID_CODE = '123456';

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

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (code === VALID_CODE) {
      // Success - navigate to create password
      navigation.navigate('CreatePassword', { userData });
    } else {
      // Error - wrong code
      setError('Incorrect code. Please try again.');
      setCode('');
      setCodeInputKey(prev => prev + 1); // Reset CodeInput
    }

    setIsVerifying(false);
  };

  const handleResendCode = async () => {
    // Simulate resending code
    Alert.alert(
      'Code Sent',
      `A new verification code has been sent to ${maskedPhone}`,
      [{ text: 'OK' }]
    );
    setError('');
    setCode('');
    setCodeInputKey(prev => prev + 1);
  };

  const handleSendOnEmail = () => {
    if (!userData.email) {
      // No email provided - go back with message
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

    // Navigate to email verification
    navigation.replace('EmailVerification', {
      userData,
      verificationMethod: 'email',
    });
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
        <TouchableOpacity
          style={styles.sendEmailButton}
          onPress={handleSendOnEmail}
        >
          <Text style={[styles.sendEmailText, { color: appTheme.colors.primary }]}>
            Send on email
          </Text>
        </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendCode}
          disabled={isVerifying}
        >
          <Text style={[styles.resendText, { color: appTheme.colors.text }]}>
            Resend Code
          </Text>
        </TouchableOpacity>
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
  sendEmailText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  bottomContainer: {
    paddingHorizontal: 16,
    gap: 0,
  },
  resendButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
