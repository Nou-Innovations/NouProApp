import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
  User,
  Heart, 
  LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';
import { getCapabilities } from '@/shared/auth/capabilities';
import BusinessAdminGuard from '@/shared/guards/BusinessAdminGuard';
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
  const { theme: appTheme } = useTheme();
  const { currentCompany } = useBusinessStore();
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  // Use capabilities for access control (single source of truth)
  const capabilities = currentUserRole ? getCapabilities(currentUserRole) : null;
  const canManageBusiness = capabilities?.canManageBusiness ?? false;

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

  const handleProfile = () => {
    // @ts-ignore
    navigation.navigate('ProfileSettings');
  };

  const handleExplorePlans = () => {
    // @ts-ignore
    navigation.navigate('SubscriptionPlans');
  };

  const handleHelpCommunity = () => {
    // @ts-ignore
    navigation.navigate('FeedbackCategories');
  };

  return (
    <BusinessAdminGuard message={`Only admins can access ${activeBusiness?.name || 'business'} settings.`}>
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
            icon={User}
            title="Profile"
            onPress={handleProfile}
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
      </View>
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
