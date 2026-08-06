import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import {
  ChevronRight,
  Lock,
  Pencil,
  Users,
  MapPin,
  Car,
  ShieldCheck,
  FileText,
  User,
  Eye,
  LogOut,
  CreditCard,
  Trash2,
  LucideIcon,
} from 'lucide-react-native';
import { AppModal } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';
import { getCapabilities } from '@/shared/auth/capabilities';
import { hasPricePrivacy, checkPaywall, PaywallCheck } from '@/shared/utils/permissions';
import BusinessAdminGuard from '@/shared/guards/BusinessAdminGuard';
import AppButton from '@/shared/components/ui/AppButton';
import AppTextField from '@/shared/components/ui/AppTextField';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { patch } from '@/shared/services/api';
import { deleteCompany } from '@/features/team/team.service';
import theme from '@/shared/theme';
import { getApiErrorMessage } from '@/shared/utils/apiError';

interface SettingsOptionProps {
  icon: LucideIcon;
  title: string;
  onPress: () => void;
  showArrow?: boolean;
  isDestructive?: boolean;
}

const SettingsOption: React.FC<SettingsOptionProps> = ({
  icon: Icon,
  title,
  onPress,
  showArrow = true,
  isDestructive = false,
}) => {
  const { theme: appTheme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[styles.optionItem, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionLeft}>
        <Icon 
          size={24} 
          color={isDestructive ? appTheme.colors.error : appTheme.colors.iconColor}
          strokeWidth={2}
        />
        <Text style={[
          styles.optionTitle, 
          { color: isDestructive ? appTheme.colors.error : appTheme.colors.text }
        ]}>
          {title}
        </Text>
      </View>
      {showArrow && (
        <ChevronRight 
          size={20} 
          color={appTheme.colors.iconMuted} 
          strokeWidth={2}
        />
      )}
    </TouchableOpacity>
  );
};

export default function CompanySettingsScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const currentCompany = useBusinessStore((state) => state.currentCompany);
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const removeUserBusiness = useProfileStore((state) => state.removeUserBusiness);
  const switchToPersonal = useProfileStore((state) => state.switchToPersonal);
  const refreshBusinesses = useProfileStore((state) => state.refreshBusinesses);
  
  // Use capabilities for access control (single source of truth)
  const capabilities = currentUserRole ? getCapabilities(currentUserRole) : null;
  const canManageBusiness = capabilities?.canManageBusiness ?? false;

  // Price privacy state
  const [pricePrivacyEnabled, setPricePrivacyEnabled] = useState(
    (activeBusiness as any)?.settings?.pricePrivacyEnabled ?? false
  );
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallCheckResult, setPaywallCheckResult] = useState<PaywallCheck | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!activeBusiness?.id || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCompany(activeBusiness.id, deleteConfirmName);
      setShowDeleteDialog(false);
      setDeleteConfirmName('');
      // Leave business mode locally, then resync. Deliberately NOT removeUserBusiness():
      // that calls DELETE members/me and would erase the owner's accepted membership —
      // the very row that proves ownership if they later restore the company.
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

  const handlePricePrivacyToggle = async (newValue: boolean) => {
    const plan = activeBusiness?.plan || null;
    if (newValue && !hasPricePrivacy(plan)) {
      const check = checkPaywall('price_privacy', plan);
      if (!check.allowed) {
        setPaywallCheckResult(check);
        setShowPaywall(true);
        return;
      }
    }
    setPricePrivacyEnabled(newValue);
    try {
      await patch(`/companies/${activeBusiness?.id}`, {
        settings: { pricePrivacyEnabled: newValue },
      });
    } catch {
      setPricePrivacyEnabled(!newValue); // Revert on failure
      AppAlert.alert('Error', 'Failed to update price privacy setting.');
    }
  };

  const handleEditProfile = () => {
    // @ts-ignore
    navigation.navigate('EditBusiness');
  };

  const handleStaffs = () => {
    // @ts-ignore
    navigation.navigate('TeamManagement');
  };

  const handleLocations = () => {
    // @ts-ignore
    navigation.navigate('Locations');
  };

  const handleTransports = () => {
    // @ts-ignore
    navigation.navigate('Transports');
  };

  const handleSecurity = () => {
    // @ts-ignore
    navigation.navigate('SecuritySettings');
  };

  const handlePrivacyPolicy = () => {
    AppAlert.alert('Privacy Policy', 'Navigate to privacy policy screen');
  };

  const handleProfile = () => {
    // @ts-ignore
    navigation.navigate('ProfileSettings');
  };

  const handleExplorePlans = () => {
    // @ts-ignore
    navigation.navigate('SubscriptionPlans');
  };

  const handlePaymentHistory = () => {
    // @ts-ignore
    navigation.navigate('PaymentHistory');
  };

  const handleConfirmLeave = async (archiveCompany = false) => {
    if (!activeBusiness?.id) return;
    setIsLeaving(true);
    try {
      await removeUserBusiness(activeBusiness.id, archiveCompany ? { archiveCompany: true } : undefined);
      setShowLeaveDialog(false);
    } catch (error: any) {
      setIsLeaving(false);
      // 409 LAST_OWNER: you are the only owner. Either hand it to an admin first, or
      // confirm that leaving archives the company (it cannot be left live-but-ownerless).
      if (error?.status === 409 && error?.response?.error?.code === 'LAST_OWNER') {
        const admins: { userId: string; name: string | null }[] = error?.response?.data?.admins || [];
        setShowLeaveDialog(false);
        AppAlert.alert(
          admins.length ? 'You are the only owner' : 'This will archive the company',
          admins.length
            ? `Make someone else an owner first (Team > tap their role), or leave anyway and ${activeBusiness?.name || 'this company'} will be archived.`
            : `You are the only member. Leaving will archive ${activeBusiness?.name || 'this company'}. Past orders and invoices stay in your partners' records.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave and archive',
              style: 'destructive',
              onPress: () => { void handleConfirmLeave(true); },
            },
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
    <BusinessAdminGuard message={`Only admins can access ${activeBusiness?.name || 'business'} settings.`}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader
          title="Settings"
          leftAction={{ icon: 'menu', onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()), accessibilityLabel: 'Open menu' }}
        />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollViewContent}>
        {/* Subscription Button */}
        <View style={styles.subscriptionSection}>
          <AppButton
            title="Explore plans"
            onPress={handleExplorePlans}
            variant="accent"
          />
        </View>

        {/* Settings Options */}
        <View>
          <SettingsOption
            icon={Pencil}
            title="Edit profile"
            onPress={handleEditProfile}
          />
          <SettingsOption
            icon={Users}
            title="Staffs"
            onPress={handleStaffs}
          />
          <SettingsOption
            icon={MapPin}
            title="Locations"
            onPress={handleLocations}
          />
          <SettingsOption
            icon={Car}
            title="Transports"
            onPress={handleTransports}
          />
          <SettingsOption
            icon={ShieldCheck}
            title="Security"
            onPress={handleSecurity}
          />
          <SettingsOption
            icon={CreditCard}
            title="Payment History"
            onPress={handlePaymentHistory}
          />

          {/* Price Privacy Toggle */}
          <View style={[styles.optionItem, { borderBottomColor: appTheme.colors.borderColor }]}>
            <View style={styles.optionLeft}>
              <Eye
                size={24}
                color={appTheme.colors.iconColor}
                strokeWidth={2}
              />
              <Text style={[styles.optionTitle, { color: appTheme.colors.text }]}>
                Price Privacy
              </Text>
            </View>
            <Switch
              trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.switchTrackOn }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={appTheme.colors.switchTrackOff}
              onValueChange={handlePricePrivacyToggle}
              value={pricePrivacyEnabled}
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
            />
          </View>

          <SettingsOption
            icon={FileText}
            title="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />
          <SettingsOption
            icon={User}
            title="Profile"
            onPress={handleProfile}
          />
          {currentUserRole !== 'super_admin' && (
            <SettingsOption
              icon={LogOut}
              title="Leave Company"
              onPress={() => setShowLeaveDialog(true)}
              isDestructive
            />
          )}
          {currentUserRole === 'super_admin' && (
            <SettingsOption
              icon={Trash2}
              title="Delete Company"
              onPress={() => setShowDeleteDialog(true)}
              isDestructive
            />
          )}
        </View>
      </ScrollView>

      {/* Leave Company Confirmation */}
      <AppModal
        visible={showLeaveDialog}
        onClose={() => !isLeaving && setShowLeaveDialog(false)}
        variant="delete"
        title="Leave Company"
        message={`Are you sure you want to leave ${activeBusiness?.name || 'this company'}? You will lose access immediately.`}
        primaryButtonText="Leave"
        onPrimaryAction={() => { void handleConfirmLeave(); }}
        primaryButtonLoading={isLeaving}
        secondaryButtonText="Cancel"
        onSecondaryAction={() => setShowLeaveDialog(false)}
        secondaryButtonDisabled={isLeaving}
      />

      {/* Delete (archive) Company — typed-name confirmation */}
      <AppModal
        visible={showDeleteDialog}
        onClose={() => {
          if (isDeleting) return;
          setShowDeleteDialog(false);
          setDeleteConfirmName('');
        }}
        variant="delete"
        title="Delete Company"
        message={`This removes ${activeBusiness?.name || 'this company'} from NouPro: it disappears from search, its storefront goes offline, and your team loses access. Orders and invoices already exchanged with other businesses stay in their records, where your name shows as no longer active.\n\nType the company name to confirm.`}
        primaryButtonText="Delete"
        onPrimaryAction={handleConfirmDelete}
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

      {/* Paywall Modal for Price Privacy */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          // @ts-ignore
          navigation.navigate('SubscriptionPlans');
        }}
        requiredPlan={paywallCheckResult?.requiredPlan || 'business'}
        modalType={paywallCheckResult?.modalType}
        title={paywallCheckResult?.title}
        description={paywallCheckResult?.description}
      />
      </SafeAreaView>
    </BusinessAdminGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  subscriptionSection: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginLeft: theme.spacing.md,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  accessDeniedText: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginBottom: 32,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
});
