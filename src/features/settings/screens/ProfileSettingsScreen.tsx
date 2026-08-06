import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Trash2, LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { deleteCompany } from '@/features/team/team.service';
import AppTextField from '@/shared/components/ui/AppTextField';
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
    if (isDestructive) return appTheme.colors.error;
    return appTheme.colors.iconColor;
  };

  const getTextColor = () => {
    if (disabled) return appTheme.colors.textMuted;
    if (isDestructive) return appTheme.colors.error;
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
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const removeUserBusiness = useProfileStore((state) => state.removeUserBusiness);
  const switchToPersonal = useProfileStore((state) => state.switchToPersonal);
  const refreshBusinesses = useProfileStore((state) => state.refreshBusinesses);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showAreYouSureDialog, setShowAreYouSureDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const confirmDeleteCompany = async () => {
    if (!activeBusiness?.id || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCompany(activeBusiness.id, deleteConfirmName);
      setShowDeleteDialog(false);
      setDeleteConfirmName('');
      // Deliberately NOT removeUserBusiness(): that calls DELETE members/me and would
      // erase the owner's membership — the row that proves ownership on a later restore.
      switchToPersonal();
      await refreshBusinesses().catch(() => {});
    } catch (error) {
      AppAlert.alert(
        'Could not delete company',
        getApiErrorMessage(error, 'Failed to delete company. Please try again.'),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmLeaveWorkplace = async (archiveCompany = false) => {
    if (!activeBusiness?.id || isLeaving) return;
    setIsLeaving(true);
    try {
      // DELETE /companies/:id/members/me, then prunes userBusinesses and switches
      // back to personal mode — that mode swap re-renders the shell for us.
      await removeUserBusiness(activeBusiness.id, archiveCompany ? { archiveCompany: true } : undefined);
      setShowLeaveDialog(false);
    } catch (error: any) {
      // 409 LAST_OWNER: the company would be left with nobody who can own it.
      if (error?.status === 409 && error?.response?.error?.code === 'LAST_OWNER') {
        const admins: { userId: string; name: string | null }[] = error?.response?.data?.admins || [];
        setShowLeaveDialog(false);
        AppAlert.alert(
          admins.length ? 'You are the only owner' : 'This will archive the company',
          admins.length
            ? `Make someone else an owner first (Team > tap their role), or leave anyway and ${activeBusiness?.name || 'this company'} will be archived.`
            : `You are the only member. Leaving will archive ${activeBusiness?.name || 'this company'}.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Leave and archive', style: 'destructive', onPress: () => { void confirmLeaveWorkplace(true); } },
          ],
        );
        return;
      }
      AppAlert.alert(
        'Cannot Leave Company',
        getApiErrorMessage(error, 'Failed to leave company. Please try again.'),
      );
    } finally {
      setIsLeaving(false);
    }
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
        variant="confirm"
        title="Are you sure?"
        message="You are about to delete this company. Your team will lose access immediately."
        primaryButtonText="Yes, I'm sure"
        onPrimaryAction={handleConfirmAreYouSure}
        secondaryButtonText="No"
        onSecondaryAction={() => setShowAreYouSureDialog(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AppModal
        visible={showDeleteDialog}
        onClose={() => {
          if (isDeleting) return;
          setShowDeleteDialog(false);
          setDeleteConfirmName('');
        }}
        variant="delete"
        title="Delete Company?"
        message={`This removes ${activeBusiness?.name || 'this company'} from NouPro: it disappears from search, its storefront goes offline, and your team loses access. Orders and invoices already exchanged with other businesses stay in their records.\n\nType the company name to confirm.`}
        primaryButtonText="Delete"
        onPrimaryAction={confirmDeleteCompany}
        primaryButtonLoading={isDeleting}
        primaryButtonDisabled={
          deleteConfirmName.trim().toLowerCase() !== (activeBusiness?.name || '').trim().toLowerCase()
        }
        secondaryButtonText="Cancel"
        onSecondaryAction={() => {
          setShowDeleteDialog(false);
          setDeleteConfirmName('');
        }}
        secondaryButtonDisabled={isDeleting}
      >
        <AppTextField
          label="Company name"
          value={deleteConfirmName}
          onChangeText={setDeleteConfirmName}
          placeholder={activeBusiness?.name || 'Company name'}
          autoCapitalize="none"
        />
      </AppModal>

      {/* Leave Workplace Confirmation Dialog */}
      <AppModal
        visible={showLeaveDialog}
        onClose={() => !isLeaving && setShowLeaveDialog(false)}
        variant="delete"
        title="Leave Workplace?"
        message={`Are you sure you want to leave ${activeBusiness?.name || 'this workplace'}? You will lose access immediately.`}
        primaryButtonText="Leave"
        onPrimaryAction={() => { void confirmLeaveWorkplace(); }}
        primaryButtonLoading={isLeaving}
        secondaryButtonText="Cancel"
        onSecondaryAction={() => setShowLeaveDialog(false)}
        secondaryButtonDisabled={isLeaving}
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
});
