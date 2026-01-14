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
import { useProfileStore } from '@/shared/store/profileStore';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import theme from '@/shared/theme';

interface ProfileSettingsScreenProps {
  navigation: any;
}

interface SettingsOptionProps {
  icon: LucideIcon;
  title: string;
  onPress: () => void;
  isDestructive?: boolean;
  disabled?: boolean;
}

const SettingsOption: React.FC<SettingsOptionProps> = ({
  icon: Icon,
  title,
  onPress,
  isDestructive = false,
  disabled = false,
}) => {
  const { theme: appTheme } = useTheme();
  
  const getIconColor = () => {
    if (disabled) return appTheme.colors.textMuted;
    if (isDestructive) return '#DC2626';
    return appTheme.colors.iconColor;
  };

  const getTextColor = () => {
    if (disabled) return appTheme.colors.textMuted;
    if (isDestructive) return '#DC2626';
    return appTheme.colors.text;
  };
  
  return (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View style={styles.settingLeft}>
        <Icon 
          size={24} 
          color={getIconColor()} 
          strokeWidth={2}
        />
        <Text style={[
          styles.settingText, 
          { color: getTextColor() }
        ]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ProfileSettingsScreen({ navigation }: ProfileSettingsScreenProps) {
  const { theme: appTheme } = useTheme();
  
  // Use profileStore for role checks
  const isSuperAdminRole = useProfileStore((state) => state.isSuperAdmin);
  const isSuperAdmin = isSuperAdminRole();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showAreYouSureDialog, setShowAreYouSureDialog] = useState(false);

  const handleLeaveWorkplace = () => {
    setShowLeaveDialog(true);
  };

  const handleDeleteCompany = () => {
    if (!isSuperAdmin) {
      return;
    }
    setShowAreYouSureDialog(true);
  };

  const handleConfirmAreYouSure = () => {
    setShowAreYouSureDialog(false);
    setShowDeleteDialog(true);
  };

  const confirmDeleteCompany = () => {
    setShowDeleteDialog(false);
    Alert.alert('Delete Company', 'Company deletion process started...');
  };

  const confirmLeaveWorkplace = () => {
    setShowLeaveDialog(false);
    Alert.alert('Leave Workplace', 'You have left the workplace.');
    navigation.goBack();
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
            Manage your workplace membership and company settings.
          </Text>
          
          <View style={styles.settingsSection}>
            <SettingsOption
              icon={LogOut}
              title="Leave workplace"
              onPress={handleLeaveWorkplace}
              isDestructive
            />
            <SettingsOption
              icon={Trash2}
              title="Delete Company"
              onPress={handleDeleteCompany}
              isDestructive
              disabled={!isSuperAdmin}
            />
          </View>

          {!isSuperAdmin && (
            <Text style={[styles.disabledHint, { color: appTheme.colors.textMuted }]}>
              Only Super Admins can delete the company.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Are You Sure Dialog */}
      <AppModal
        visible={showAreYouSureDialog}
        onClose={() => setShowAreYouSureDialog(false)}
        title="Are you sure?"
        message="You are about to delete this company. This action is irreversible."
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
        title="Delete Company?"
        message="This action cannot be undone. All company data will be permanently deleted."
        footer={
          <View style={styles.modalFooter}>
            <AppButton
              title="Delete"
              onPress={confirmDeleteCompany}
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

      {/* Leave Workplace Confirmation Dialog */}
      <AppModal
        visible={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        title="Leave Workplace?"
        message="Are you sure you want to leave this workplace?"
        footer={
          <View style={styles.modalFooter}>
            <AppButton
              title="Leave"
              onPress={confirmLeaveWorkplace}
              variant="alert"
              style={{ flex: 1, marginRight: 8 }}
            />
            <AppButton
              title="Cancel"
              onPress={() => setShowLeaveDialog(false)}
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
  disabledHint: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
