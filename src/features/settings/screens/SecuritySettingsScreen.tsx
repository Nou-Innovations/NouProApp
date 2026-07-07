import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useProfileStore } from '@/shared/store/profileStore';
import { authAPI } from '@/shared/services/api';
import { AppAlert } from '@/shared/services/appAlert';
import { SectionTitle } from '@/shared/components/ui';

interface SecuritySettingsScreenProps {
  navigation: any;
}

export default function SecuritySettingsScreen({ navigation }: SecuritySettingsScreenProps) {
  const { theme: appTheme } = useTheme();
  
  // Stay signed in preference from store (only shown in personal mode)
  const staySignedIn = useProfileStore((state) => state.staySignedIn);
  const setStaySignedIn = useProfileStore((state) => state.setStaySignedIn);
  const isPersonalMode = useProfileStore((state) => state.isPersonalMode);
  
  // Security settings
  const twoFactorEnabled = useProfileStore((state) => state.twoFactorEnabled);
  const biometricEnabled = useProfileStore((state) => state.biometricEnabled);

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleTwoFactorAuth = () => {
    navigation.navigate('TwoFactorAuth');
  };

  const handleBiometricLogin = () => {
    navigation.navigate('BiometricLogin');
  };

  const handleStaySignedInToggle = (value: boolean) => {
    setStaySignedIn(value);
  };

  // GDPR data export — fetches the user's data bundle and opens the share sheet.
  const [isExporting, setIsExporting] = useState(false);
  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const data = await authAPI.exportMyData();
      const fileUri = `${FileSystem.cacheDirectory}noupro-data-export.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Your NouPro data',
        });
      } else {
        AppAlert.alert('Export Ready', 'Your data file was saved to the app cache.');
      }
    } catch (error: any) {
      AppAlert.alert(
        'Export Failed',
        error?.response?.data?.message || 'Could not export your data. Please try again.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    navigation.navigate('DeleteAccount');
  };


  const renderSecurityOptions = () => (
    <View style={styles.settingsSection}>
      <TouchableOpacity 
        style={[styles.settingItem, { borderBottomColor: appTheme.colors.borderColor }]} 
        onPress={handleChangePassword}
      >
        <View style={styles.settingLeft}>
          <Icon name="lock-closed-outline" size={24} color={appTheme.colors.iconColor} />
          <Text style={[styles.settingText, { color: appTheme.colors.text }]}>Change Password</Text>
        </View>
        <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
      </TouchableOpacity>

      {/* Two-Factor and Biometric - Only shown in Personal mode */}
      {isPersonalMode() && (
        <>
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: appTheme.colors.borderColor }]} 
            onPress={handleTwoFactorAuth}
          >
            <View style={styles.settingLeft}>
              <Icon name="shield-checkmark-outline" size={24} color={appTheme.colors.iconColor} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: appTheme.colors.text }]}>Two-Factor Authentication</Text>
                <Text style={[styles.settingDescription, { color: twoFactorEnabled ? appTheme.colors.success : appTheme.colors.textLight }]}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: appTheme.colors.borderColor }]} 
            onPress={handleBiometricLogin}
          >
            <View style={styles.settingLeft}>
              <Icon name="finger-print-outline" size={24} color={appTheme.colors.iconColor} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: appTheme.colors.text }]}>Biometric Login</Text>
                <Text style={[styles.settingDescription, { color: biometricEnabled ? appTheme.colors.success : appTheme.colors.textLight }]}>
                  {biometricEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
          </TouchableOpacity>
        </>
      )}

      {/* Stay Signed In Toggle - Only shown in Personal mode */}
      {isPersonalMode() && (
        <View style={[styles.settingItem, { borderBottomColor: appTheme.colors.borderColor }]}>
          <View style={styles.settingLeft}>
            <Icon name="key-outline" size={24} color={appTheme.colors.iconColor} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: appTheme.colors.text }]}>Stay Signed In</Text>
              <Text style={[styles.settingDescription, { color: appTheme.colors.textLight }]}>
                {staySignedIn ? 'You won\'t need to sign in every time' : 'You\'ll need to sign in every time'}
              </Text>
            </View>
          </View>
          <Switch
            value={staySignedIn}
            onValueChange={handleStaySignedInToggle}
            trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.success }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={appTheme.colors.switchTrackOff}
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <SecondaryHeader
        title="Security Settings"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.description, { color: appTheme.colors.textLight }]}>
            Manage your account security settings and authentication methods.
          </Text>
          {renderSecurityOptions()}

          <SectionTitle style={styles.dataSectionTitle}>Your Data</SectionTitle>
          <View style={styles.settingsSection}>
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: appTheme.colors.borderColor }]}
              onPress={handleExportData}
              disabled={isExporting}
              accessibilityLabel="Export a copy of my personal data"
            >
              <View style={styles.settingLeft}>
                <Icon name="download-outline" size={24} color={appTheme.colors.iconColor} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: appTheme.colors.text }]}>
                    Export My Data
                  </Text>
                  <Text style={[styles.settingDescription, { color: appTheme.colors.textLight }]}>
                    Download a copy of your personal data
                  </Text>
                </View>
              </View>
              {isExporting ? (
                <ActivityIndicator size="small" color={appTheme.colors.iconMuted} />
              ) : (
                <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: appTheme.colors.borderColor }]}
              onPress={handleDeleteAccount}
              accessibilityLabel="Delete my account permanently"
            >
              <View style={styles.settingLeft}>
                <Icon name="trash-outline" size={24} color={appTheme.colors.error} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: appTheme.colors.error }]}>
                    Delete Account
                  </Text>
                  <Text style={[styles.settingDescription, { color: appTheme.colors.textLight }]}>
                    Permanently erase your account and personal data
                  </Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
            </TouchableOpacity>
          </View>
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
    paddingVertical: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    marginHorizontal: 20,
    textAlign: 'center',
    fontFamily: theme.fonts.primary.regular,
  },
  settingsSection: {
    marginTop: theme.spacing.sm,
  },
  dataSectionTitle: {
    marginTop: 32,
    marginHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginLeft: theme.spacing.md,
  },
  settingTextContainer: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
  },
  settingDescription: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
}); 