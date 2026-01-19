/**
 * ChoosePathScreen
 * Choose between creating a business or joining a company
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppButton from '@/shared/components/ui/AppButton';
import AppModal from '@/shared/components/ui/AppModal';
import { useProfileStore } from '@/shared/store/profileStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'ChoosePath'>;

type PathOption = 'create' | 'join' | null;

export default function ChoosePathScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const login = useProfileStore((state) => state.login);
  const { pendingAuth } = route.params;
  
  // State
  const [selectedOption, setSelectedOption] = useState<PathOption>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleContinue = () => {
    if (!selectedOption) return;

    if (selectedOption === 'create') {
      // Navigate to business creation (pass pendingAuth for later login)
      navigation.navigate('BusinessBasicInfo', { fromProfileSwitcher: false, pendingAuth });
    } else {
      // Show success modal first, then navigate to select company
      setShowSuccessModal(true);
    }
  };

  const handleSkip = () => {
    // Show success modal and go to personal home
    setShowSuccessModal(true);
  };

  // Complete registration and login using the pending auth data
  const completeRegistration = () => {
    // Login the user with the auth data from registration
    // Pass isNewUser=true to show welcome message
    login(
      pendingAuth.user,
      pendingAuth.token,
      pendingAuth.refreshToken,
      pendingAuth.businesses || [],
      true // isNewUser
    );
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    
    if (selectedOption === 'join') {
      // Navigate to select company (pass pendingAuth for later login)
      navigation.navigate('SelectCompany', { pendingAuth });
    } else {
      // Skip selected - complete registration and go to personal home
      completeRegistration();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Almost there!
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            Build your empire or join forces
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Create Business Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                borderColor: selectedOption === 'create' 
                  ? appTheme.colors.primary 
                  : appTheme.colors.borderColor,
                backgroundColor: selectedOption === 'create'
                  ? `${appTheme.colors.primary}10`
                  : appTheme.colors.cardBackground,
              },
            ]}
            onPress={() => setSelectedOption('create')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.optionIconContainer,
              { backgroundColor: appTheme.colors.surface }
            ]}>
              <Icon 
                name="business-outline" 
                size={32} 
                color={selectedOption === 'create' ? appTheme.colors.primary : appTheme.colors.textSecondary} 
              />
            </View>
            <Text style={[
              styles.optionTitle,
              { 
                color: selectedOption === 'create' ? appTheme.colors.primary : appTheme.colors.text 
              }
            ]}>
              Create your Business profile
            </Text>
            <Text style={[styles.optionDescription, { color: appTheme.colors.textSecondary }]}>
              Set up your own business and start managing your operations
            </Text>
          </TouchableOpacity>

          {/* Join Company Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                borderColor: selectedOption === 'join' 
                  ? appTheme.colors.primary 
                  : appTheme.colors.borderColor,
                backgroundColor: selectedOption === 'join'
                  ? `${appTheme.colors.primary}10`
                  : appTheme.colors.cardBackground,
              },
            ]}
            onPress={() => setSelectedOption('join')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.optionIconContainer,
              { backgroundColor: appTheme.colors.surface }
            ]}>
              <Icon 
                name="people-outline" 
                size={32} 
                color={selectedOption === 'join' ? appTheme.colors.primary : appTheme.colors.textSecondary} 
              />
            </View>
            <Text style={[
              styles.optionTitle,
              { 
                color: selectedOption === 'join' ? appTheme.colors.primary : appTheme.colors.text 
              }
            ]}>
              Join an existing Company
            </Text>
            <Text style={[styles.optionDescription, { color: appTheme.colors.textSecondary }]}>
              Request to join a company and collaborate with your team
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={[
        styles.bottomContainer,
        { paddingBottom: insets.bottom + 16 }
      ]}>
        <AppButton
          title="Continue"
          onPress={handleContinue}
          variant={selectedOption ? 'primary' : 'disabled'}
          disabled={!selectedOption}
        />
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={[styles.skipText, { color: appTheme.colors.text }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <AppModal
        visible={showSuccessModal}
        variant="success"
        title="Profile created!"
        message="Your profile has been successfully created! You can now connect with other professionals."
        primaryButtonText="Continue"
        onPrimaryAction={handleSuccessModalContinue}
        onClose={() => setShowSuccessModal(false)}
      />
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.semiBold,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: 16,
    gap: 0,
  },
  skipButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
