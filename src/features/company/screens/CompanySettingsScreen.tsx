import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { 
  ChevronRight, 
  Lock, 
  Pencil, 
  Users, 
  MapPin, 
  Car, 
  ShieldCheck, 
  FileText, 
  LogOut, 
  Heart, 
  Trash2,
  LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import theme from '@/shared/theme';

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
          color={isDestructive ? '#DC2626' : appTheme.colors.iconColor} 
          strokeWidth={2}
        />
        <Text style={[
          styles.optionTitle, 
          { color: isDestructive ? '#DC2626' : appTheme.colors.text }
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
  const { theme: appTheme, isDarkMode } = useTheme();
  const { currentCompany } = useBusinessStore();
  
  // Use profileStore for role checks (single source of truth)
  const isSuperAdminRole = useProfileStore((state) => state.isSuperAdmin);
  const isAdminRole = useProfileStore((state) => state.isAdmin);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const isSuperAdmin = isSuperAdminRole();
  const isAdmin = isAdminRole();

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <View style={styles.accessDeniedContainer}>
          <Lock size={60} color={appTheme.colors.textMuted} strokeWidth={2} />
          <Text style={[styles.accessDeniedText, { color: appTheme.colors.text }]}>
            Access Denied
          </Text>
          <Text style={[styles.accessDeniedSubtext, { color: appTheme.colors.textSecondary }]}>
            Only admins can access company settings
          </Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: appTheme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
    Alert.alert('Privacy Policy', 'Navigate to privacy policy screen');
  };

  const handleLeaveWorkplace = () => {
    setShowLeaveDialog(true);
  };

  const handleExplorePlans = () => {
    Alert.alert('Subscription', 'Navigate to subscription plans screen');
  };

  const handleHelpCommunity = () => {
    Linking.openURL('https://noupro.app/community');
  };

  const handleDeleteCompany = () => {
    if (!isSuperAdmin) {
      Alert.alert('Access Denied', 'Only Super Admins can delete companies.');
      return;
    }
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Settings"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
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
            variant="alert"
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
            icon={FileText}
            title="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />
          <SettingsOption
            icon={LogOut}
            title="Leave workplace"
            onPress={handleLeaveWorkplace}
            isDestructive
          />
        </View>
      </ScrollView>

      {/* Bottom Fixed Buttons */}
      <View style={styles.bottomButtonsContainer}>
        {/* Help Community Section */}
        <TouchableOpacity
          style={[styles.communityButton, { backgroundColor: '#DBEAFE' }]}
          onPress={handleHelpCommunity}
        >
          <View style={styles.communityContent}>
            <View style={[styles.communityIcon]}>
              <Heart size={24} color="#3B82F6" strokeWidth={2} />
            </View>
            <View style={styles.communityText}>
              <Text style={[styles.communityTitle, { color: "#3B82F6", fontFamily: theme.fonts.primary.bold}]}>
                Help the Community grow
              </Text>
              <Text style={[styles.communitySubtitle, { color: appTheme.colors.secondary }]}>
                Propose features, report bugs, and share your feedback
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Delete Company Button */}
        {isSuperAdmin && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteCompany}
          >
            <Trash2 size={20} color="#DC2626" strokeWidth={2} />
            <Text style={styles.deleteButtonText}>Delete Company</Text>
          </TouchableOpacity>
        )}
      </View>

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
  bottomButtonsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 40,
    gap: 8,
  },
  communityButton: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
  },
  communityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  communityIcon: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  communityText: {
    flex: 1,
  },
  communityTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  communitySubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    gap: theme.spacing.md,
  },
  deleteButtonText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#DC2626',
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
  modalFooter: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
