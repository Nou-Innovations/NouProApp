import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useProfileStore } from '@/shared/store/profileStore';

const BIOMETRIC_USER_KEY = 'noupro_biometric_user_id';

interface BiometricLoginScreenProps {
  navigation: any;
}

type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export default function BiometricLoginScreen({ navigation }: BiometricLoginScreenProps) {
  const { theme: appTheme } = useTheme();
  
  // Biometric state from store
  const biometricEnabled = useProfileStore((state) => state.biometricEnabled);
  const setBiometricEnabled = useProfileStore((state) => state.setBiometricEnabled);
  const currentUser = useProfileStore((state) => state.currentUser);

  // Device capability states
  const [isCompatible, setIsCompatible] = useState<boolean | null>(null);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      // Check if device supports biometrics
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsCompatible(compatible);

      if (compatible) {
        // Check if biometrics are enrolled
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsEnrolled(enrolled);

        // Get supported biometric types
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('facial');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('iris');
        }
      }
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      setIsCompatible(false);
    }
  };

  const getBiometricIcon = (): string => {
    switch (biometricType) {
      case 'facial':
        return 'scan-outline';
      case 'fingerprint':
        return 'finger-print-outline';
      case 'iris':
        return 'eye-outline';
      default:
        return 'finger-print-outline';
    }
  };

  const getBiometricName = (): string => {
    switch (biometricType) {
      case 'facial':
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case 'iris':
        return 'Iris Scanner';
      default:
        return 'Biometric';
    }
  };

  const handleToggle = async (value: boolean) => {
    if (value) {
      // Enabling - authenticate first
      setIsAuthenticating(true);
      
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${getBiometricName()} for NouPro`,
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });

        if (result.success) {
          setBiometricEnabled(true);
          // Store user ID so biometric auto-login can identify which user to restore
          if (currentUser?.id) {
            await SecureStore.setItemAsync(BIOMETRIC_USER_KEY, currentUser.id);
          }
          Alert.alert(
            'Success',
            `${getBiometricName()} has been enabled for your account.`,
            [{ text: 'OK' }]
          );
        } else if (result.error === 'user_cancel') {
          // User cancelled, do nothing
        } else {
          Alert.alert(
            'Authentication Failed',
            'Unable to verify your identity. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Biometric authentication error:', error);
        Alert.alert(
          'Error',
          'An error occurred while setting up biometric login. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      // Disabling
      Alert.alert(
        `Disable ${getBiometricName()}`,
        `Are you sure you want to disable ${getBiometricName()} login?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              setBiometricEnabled(false);
              await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY);
            }
          },
        ]
      );
    }
  };

  const renderNotCompatible = () => (
    <View style={[styles.statusCard, { backgroundColor: appTheme.colors.cardBackground }]}>
      <View style={styles.statusIcon}>
        <Icon name="close-circle" size={48} color={appTheme.colors.error} />
      </View>
      <Text style={[styles.statusTitle, { color: appTheme.colors.text }]}>
        Biometric Authentication Not Available
      </Text>
      <Text style={[styles.statusDescription, { color: appTheme.colors.textLight }]}>
        Your device doesn't support biometric authentication, or it hasn't been set up in your device settings.
      </Text>
    </View>
  );

  const renderNotEnrolled = () => (
    <View style={[styles.statusCard, { backgroundColor: appTheme.colors.cardBackground }]}>
      <View style={styles.statusIcon}>
        <Icon name="warning" size={48} color={appTheme.colors.warning} />
      </View>
      <Text style={[styles.statusTitle, { color: appTheme.colors.text }]}>
        No {getBiometricName()} Enrolled
      </Text>
      <Text style={[styles.statusDescription, { color: appTheme.colors.textLight }]}>
        You haven't set up {getBiometricName()} on your device yet. Go to your device settings to enroll your {biometricType === 'facial' ? 'face' : biometricType === 'fingerprint' ? 'fingerprint' : 'iris'}.
      </Text>
      <TouchableOpacity
        style={[styles.settingsButton, { backgroundColor: appTheme.colors.primary }]}
        onPress={() => {
          Alert.alert(
            'Open Settings',
            `Go to your device's Settings > ${Platform.OS === 'ios' ? 'Face ID & Passcode' : 'Security'} to set up ${getBiometricName()}.`,
            [{ text: 'OK' }]
          );
        }}
      >
        <Text style={styles.settingsButtonText}>Open Device Settings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEnabledState = () => (
    <View style={styles.enabledContainer}>
      <View style={[styles.statusCard, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={styles.statusIcon}>
          <Icon name={getBiometricIcon()} size={48} color={appTheme.colors.success} />
        </View>
        <Text style={[styles.statusTitle, { color: appTheme.colors.text }]}>
          {getBiometricName()} is Active
        </Text>
        <Text style={[styles.statusDescription, { color: appTheme.colors.textLight }]}>
          You can now use {getBiometricName()} to quickly and securely sign in to your NouPro account.
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: appTheme.colors.surface }]}>
        <Icon name="information-circle-outline" size={20} color={appTheme.colors.textLight} />
        <Text style={[styles.infoText, { color: appTheme.colors.textLight }]}>
          {getBiometricName()} provides a fast and secure way to access your account. Your biometric data never leaves your device.
        </Text>
      </View>
    </View>
  );

  const renderDisabledState = () => (
    <View style={styles.disabledContainer}>
      <View style={[styles.featureCard, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={styles.featureIcon}>
          <Icon name={getBiometricIcon()} size={32} color={appTheme.colors.primary} />
        </View>
        <Text style={[styles.featureTitle, { color: appTheme.colors.text }]}>
          Quick & Secure Access
        </Text>
        <Text style={[styles.featureDescription, { color: appTheme.colors.textLight }]}>
          Use {getBiometricName()} to sign in instantly without typing your password.
        </Text>
      </View>

      <View style={[styles.featureCard, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={styles.featureIcon}>
          <Icon name="shield-checkmark-outline" size={32} color={appTheme.colors.primary} />
        </View>
        <Text style={[styles.featureTitle, { color: appTheme.colors.text }]}>
          Privacy Protected
        </Text>
        <Text style={[styles.featureDescription, { color: appTheme.colors.textLight }]}>
          Your biometric data stays on your device and is never sent to our servers.
        </Text>
      </View>

      <View style={[styles.featureCard, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={styles.featureIcon}>
          <Icon name="flash-outline" size={32} color={appTheme.colors.primary} />
        </View>
        <Text style={[styles.featureTitle, { color: appTheme.colors.text }]}>
          Instant Authentication
        </Text>
        <Text style={[styles.featureDescription, { color: appTheme.colors.textLight }]}>
          Skip the password entry and access your account in seconds.
        </Text>
      </View>
    </View>
  );

  // Loading state
  if (isCompatible === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
        <SecondaryHeader
          title="Biometric Login"
          leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: appTheme.colors.textLight }]}>
            Checking device capabilities...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <SecondaryHeader
        title="Biometric Login"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.description, { color: appTheme.colors.textLight }]}>
            Use your device's biometric features for quick and secure sign-in.
          </Text>

          {!isCompatible ? (
            renderNotCompatible()
          ) : !isEnrolled ? (
            renderNotEnrolled()
          ) : (
            <>
              {/* Toggle Section */}
              <View style={[styles.toggleSection, { backgroundColor: appTheme.colors.cardBackground }]}>
                <View style={styles.toggleLeft}>
                  <Icon name={getBiometricIcon()} size={24} color={appTheme.colors.iconColor} />
                  <View style={styles.toggleTextContainer}>
                    <Text style={[styles.toggleTitle, { color: appTheme.colors.text }]}>
                      {getBiometricName()}
                    </Text>
                    <Text style={[styles.toggleDescription, { color: appTheme.colors.textLight }]}>
                      {biometricEnabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggle}
                  trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.success }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={appTheme.colors.switchTrackOff}
                  disabled={isAuthenticating}
                />
              </View>

              {/* State-specific content */}
              {biometricEnabled ? renderEnabledState() : renderDisabledState()}
            </>
          )}
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
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
  settingsButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  enabledContainer: {
    gap: 16,
  },
  disabledContainer: {
    gap: 12,
  },
  featureCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 4,
    flex: 1,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.primary.regular,
    flex: 2,
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
