import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Trash2, LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import theme from '@/shared/theme';

interface PersonalProfileSettingsScreenProps {
  navigation: any;
}

interface SettingsOptionProps {
  icon: LucideIcon;
  title: string;
  onPress: () => void;
  isDestructive?: boolean;
}

const SettingsOption: React.FC<SettingsOptionProps> = ({
  icon: Icon,
  title,
  onPress,
  isDestructive = false,
}) => {
  const { theme: appTheme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <Icon 
          size={24} 
          color={isDestructive ? '#DC2626' : appTheme.colors.iconColor} 
          strokeWidth={2}
        />
        <Text style={[
          styles.settingText, 
          { color: isDestructive ? '#DC2626' : appTheme.colors.text }
        ]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function PersonalProfileSettingsScreen({ navigation }: PersonalProfileSettingsScreenProps) {
  const { theme: appTheme } = useTheme();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAreYouSureDialog, setShowAreYouSureDialog] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive', 
          onPress: () => {
            // Clear auth state and navigate to login
            console.log('Logout');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    setShowAreYouSureDialog(true);
  };

  const handleConfirmAreYouSure = () => {
    setShowAreYouSureDialog(false);
    setShowDeleteDialog(true);
  };

  const confirmDeleteAccount = () => {
    setShowDeleteDialog(false);
    Alert.alert('Delete Account', 'Account deletion process started...');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <SecondaryHeader
        title="Profile"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.description, { color: appTheme.colors.textLight }]}>
            Manage your account settings.
          </Text>
          
          <View style={styles.settingsSection}>
            <SettingsOption
              icon={LogOut}
              title="Log out"
              onPress={handleLogout}
              isDestructive
            />
            <SettingsOption
              icon={Trash2}
              title="Delete account"
              onPress={handleDeleteAccount}
              isDestructive
            />
          </View>
        </View>
      </ScrollView>

      {/* Are You Sure Dialog */}
      <AppModal
        visible={showAreYouSureDialog}
        onClose={() => setShowAreYouSureDialog(false)}
        title="Are you sure?"
        message="You are about to delete your account. This action is irreversible."
        footer={
          <View style={styles.modalFooter}>
            <AppButton
              title="Yes, I'm sure"
              onPress={handleConfirmAreYouSure}
              variant="alert"
              style={{ flex: 1, marginRight: 8 }}
            />
            <AppButton
              title="No"
              onPress={() => setShowAreYouSureDialog(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        }
      />

      {/* Delete Confirmation Dialog */}
      <AppModal
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Account?"
        message="This action cannot be undone. All your data will be permanently deleted."
        footer={
          <View style={styles.modalFooter}>
            <AppButton
              title="Delete"
              onPress={confirmDeleteAccount}
              variant="alert"
              style={{ flex: 1, marginRight: 8 }}
            />
            <AppButton
              title="Cancel"
              onPress={() => setShowDeleteDialog(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        }
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
  modalFooter: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
