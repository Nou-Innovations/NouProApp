import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppModal } from '@/shared/components/ui';
import { authAPI } from '@/shared/services/api';

interface TwoFactorAuthScreenProps {
  navigation: any;
}

export default function TwoFactorAuthScreen({ navigation }: TwoFactorAuthScreenProps) {
  const { theme: appTheme } = useTheme();

  // Two-factor state from store
  const twoFactorEnabled = useProfileStore((state) => state.twoFactorEnabled);
  const setTwoFactorEnabled = useProfileStore((state) => state.setTwoFactorEnabled);

  // Local state for setup flow
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisablePrompt, setShowDisablePrompt] = useState(false);

  const handleToggle = async (value: boolean) => {
    if (value) {
      // Starting setup - call backend to generate secret
      setIsLoading(true);
      try {
        const response = await authAPI.setup2FA();
        const data = response.data || response;
        setSecretKey(data.secret);
        setOtpauthUrl(data.otpauthUrl);
        setIsSettingUp(true);
      } catch (error: any) {
        const message = error?.response?.data?.message || 'Failed to set up 2FA. Please try again.';
        Alert.alert('Error', message);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Disabling 2FA - prompt for password
      setShowDisablePrompt(true);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.disable2FA(disablePassword);
      setTwoFactorEnabled(false);
      setIsSettingUp(false);
      setVerificationCode('');
      setDisablePassword('');
      setShowDisablePrompt(false);
      Alert.alert('Success', 'Two-factor authentication has been disabled.');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to disable 2FA.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.verifySetup2FA(verificationCode);
      const data = response.data || response;
      setTwoFactorEnabled(true);
      setIsSettingUp(false);
      setVerificationCode('');
      setBackupCodes(data.backupCodes || []);
      setShowBackupCodesModal(true);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Invalid code. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSetup = () => {
    setIsSettingUp(false);
    setVerificationCode('');
    setSecretKey('');
    setOtpauthUrl('');
  };

  const handleCopySecret = async () => {
    await Clipboard.setStringAsync(secretKey.replace(/-/g, ''));
    Alert.alert('Copied', 'Secret key copied to clipboard');
  };

  const handleCopyBackupCodes = async () => {
    await Clipboard.setStringAsync(backupCodes.join('\n'));
    Alert.alert('Copied', 'Backup codes copied to clipboard');
  };

  const renderSetupFlow = () => (
    <View style={styles.setupContainer}>
      <View style={[styles.stepCard, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNumber, { backgroundColor: appTheme.colors.primary }]}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={[styles.stepTitle, { color: appTheme.colors.text }]}>
            Download an authenticator app
          </Text>
        </View>
        <Text style={[styles.stepDescription, { color: appTheme.colors.textLight }]}>
          Download Google Authenticator, Microsoft Authenticator, or any TOTP-compatible app from your app store.
        </Text>
      </View>

      <View style={[styles.stepCard, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNumber, { backgroundColor: appTheme.colors.primary }]}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={[styles.stepTitle, { color: appTheme.colors.text }]}>
            Add your account
          </Text>
        </View>
        <Text style={[styles.stepDescription, { color: appTheme.colors.textLight }]}>
          Scan the QR code below or manually enter the secret key in your authenticator app.
        </Text>

        {/* Real QR Code */}
        {otpauthUrl ? (
          <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
            <QRCode value={otpauthUrl} size={150} />
          </View>
        ) : (
          <View style={[styles.qrContainer, { backgroundColor: appTheme.colors.surface }]}>
            <ActivityIndicator size="large" color={appTheme.colors.primary} />
          </View>
        )}

        <Text style={[styles.secretKeyLabel, { color: appTheme.colors.textLight }]}>
          Or enter this key manually:
        </Text>
        <View style={[styles.secretKeyContainer, { backgroundColor: appTheme.colors.surface }]}>
          <Text style={[styles.secretKey, { color: appTheme.colors.text }]}>
            {secretKey}
          </Text>
          <TouchableOpacity onPress={handleCopySecret} style={styles.copyButton}>
            <Icon name="copy-outline" size={20} color={appTheme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.stepCard, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNumber, { backgroundColor: appTheme.colors.primary }]}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={[styles.stepTitle, { color: appTheme.colors.text }]}>
            Enter verification code
          </Text>
        </View>
        <Text style={[styles.stepDescription, { color: appTheme.colors.textLight }]}>
          Enter the 6-digit code from your authenticator app to complete setup.
        </Text>

        <TextInput
          style={[
            styles.codeInput,
            {
              borderColor: appTheme.colors.borderColor,
              backgroundColor: appTheme.colors.inputBackground,
              color: appTheme.colors.text,
            }
          ]}
          value={verificationCode}
          onChangeText={setVerificationCode}
          placeholder="000000"
          placeholderTextColor={appTheme.colors.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />
      </View>

      <View style={styles.setupActions}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: appTheme.colors.borderColor }]}
          onPress={handleCancelSetup}
          disabled={isLoading}
        >
          <Text style={[styles.cancelButtonText, { color: appTheme.colors.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            { backgroundColor: verificationCode.length === 6 ? appTheme.colors.primary : appTheme.colors.surface }
          ]}
          onPress={handleVerifyCode}
          disabled={verificationCode.length !== 6 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[
              styles.verifyButtonText,
              { color: verificationCode.length === 6 ? '#FFFFFF' : appTheme.colors.textMuted }
            ]}>
              Verify & Enable
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEnabledState = () => (
    <View style={styles.enabledContainer}>
      <View style={[styles.statusCard, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={styles.statusIcon}>
          <Icon name="shield-checkmark" size={48} color="#10B981" />
        </View>
        <Text style={[styles.statusTitle, { color: appTheme.colors.text }]}>
          Two-Factor Authentication is Active
        </Text>
        <Text style={[styles.statusDescription, { color: appTheme.colors.textLight }]}>
          Your account is protected with an additional layer of security. You'll need to enter a verification code from your authenticator app when signing in.
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: appTheme.colors.surface }]}>
        <Icon name="information-circle-outline" size={20} color={appTheme.colors.textLight} />
        <Text style={[styles.infoText, { color: appTheme.colors.textLight }]}>
          Keep your authenticator app and backup codes in a safe place. You'll need them to access your account.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <SecondaryHeader
        title="Two-Factor Authentication"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.description, { color: appTheme.colors.textLight }]}>
            Add an extra layer of security to your account by requiring a verification code in addition to your password.
          </Text>

          {/* Toggle Section */}
          <View style={[styles.toggleSection, { backgroundColor: appTheme.colors.cardBackground }]}>
            <View style={styles.toggleLeft}>
              <Icon name="shield-checkmark-outline" size={24} color={appTheme.colors.iconColor} />
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleTitle, { color: appTheme.colors.text }]}>
                  Two-Factor Authentication
                </Text>
                <Text style={[styles.toggleDescription, { color: appTheme.colors.textLight }]}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={twoFactorEnabled || isSettingUp}
              onValueChange={handleToggle}
              trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E9E9EA"
              disabled={isLoading}
            />
          </View>

          {/* Setup Flow or Enabled State */}
          {isSettingUp && renderSetupFlow()}
          {twoFactorEnabled && !isSettingUp && renderEnabledState()}
        </View>
      </ScrollView>

      {/* Backup Codes Modal */}
      <AppModal
        visible={showBackupCodesModal}
        onClose={() => setShowBackupCodesModal(false)}
        variant="success"
        title="Save Your Backup Codes"
        message={`Two-factor authentication is now enabled!\n\nSave these backup codes in a safe place. Each code can only be used once:\n\n${backupCodes.join('\n')}`}
        primaryButtonText="Copy & Close"
        onPrimaryAction={() => {
          handleCopyBackupCodes();
          setShowBackupCodesModal(false);
        }}
      />

      {/* Disable 2FA Password Prompt */}
      <AppModal
        visible={showDisablePrompt}
        onClose={() => {
          setShowDisablePrompt(false);
          setDisablePassword('');
        }}
        variant="confirm"
        title="Disable Two-Factor Authentication"
        message="Enter your password to disable two-factor authentication. This will make your account less secure."
        primaryButtonText={isLoading ? 'Disabling...' : 'Disable'}
        onPrimaryAction={handleDisable2FA}
        secondaryButtonText="Cancel"
        onSecondaryAction={() => {
          setShowDisablePrompt(false);
          setDisablePassword('');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: theme.fonts.primary.regular,
  },
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  toggleDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  setupContainer: {
    gap: 16,
  },
  stepCard: {
    padding: 16,
    borderRadius: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: theme.fonts.primary.bold,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 40,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 16,
    marginLeft: 40,
    borderRadius: 8,
  },
  secretKeyLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 16,
    marginLeft: 40,
  },
  secretKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginLeft: 40,
  },
  secretKey: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
  },
  codeInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 16,
    marginLeft: 40,
    fontSize: 24,
    fontFamily: theme.fonts.primary.medium,
    letterSpacing: 8,
  },
  setupActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  verifyButton: {
    flex: 2,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  enabledContainer: {
    gap: 16,
  },
  statusCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusIcon: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.primary.regular,
  },
});
