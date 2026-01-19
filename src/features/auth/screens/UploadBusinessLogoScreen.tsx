/**
 * UploadBusinessLogoScreen
 * Upload business logo during registration
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppButton from '@/shared/components/ui/AppButton';
import AppModal from '@/shared/components/ui/AppModal';
import ImageUploadField from '@/shared/components/ui/ImageUploadField';
import { useProfileStore } from '@/shared/store/profileStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'UploadBusinessLogo'>;

export default function UploadBusinessLogoScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation();
  const { businessData, fromProfileSwitcher, pendingAuth } = route.params;
  const login = useProfileStore((state) => state.login);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);
  
  // State
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleImageSelected = (uri: string) => {
    setLogoImage(uri);
  };

  const handleDone = async () => {
    setIsCreating(true);
    
    // TODO: Actually create the business with all the data
    // For now, simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsCreating(false);
    setShowSuccessModal(true);
  };

  const handleLater = async () => {
    setIsCreating(true);
    
    // TODO: Actually create the business without logo
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsCreating(false);
    setShowSuccessModal(true);
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    
    if (fromProfileSwitcher) {
      // Coming from ProfileSwitcher - go back to main app
      // The user is already logged in, just go back
      // @ts-ignore
      rootNavigation.goBack();
    } else if (pendingAuth) {
      // Coming from registration - use pendingAuth to login
      // Pass isNewUser=true to show welcome message
      login(
        pendingAuth.user,
        pendingAuth.token,
        pendingAuth.refreshToken,
        pendingAuth.businesses || [],
        true // isNewUser
      );
    }
  };

  const successMessage = fromProfileSwitcher
    ? "Your Business profile has been successfully created! You can switch from personal to business profile now."
    : "Your Business profile has been successfully created! You can switch from personal to business profile now.";

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Upload Profile Picture
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            Add a Logo to complete your profile.
          </Text>
        </View>

        {/* Image Upload Field */}
        <View style={styles.imageContainer}>
          <ImageUploadField
            imageUri={logoImage}
            onImageSelected={handleImageSelected}
            placeholder="Add Logo picture"
            changeText="Change picture"
            size={200}
            variant="square"
          />
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={[
        styles.bottomContainer,
        { paddingBottom: insets.bottom + 16 }
      ]}>
        <AppButton
          title="Done"
          onPress={handleDone}
          variant={logoImage ? 'primary' : 'disabled'}
          disabled={!logoImage || isCreating}
          loading={isCreating && logoImage !== null}
        />
        <TouchableOpacity
          style={styles.laterButton}
          onPress={handleLater}
          disabled={isCreating}
        >
          <Text style={[
            styles.laterText, 
            { color: isCreating ? appTheme.colors.textMuted : appTheme.colors.text }
          ]}>
            Later
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <AppModal
        visible={showSuccessModal}
        variant="success"
        title="Profile created!"
        message={successMessage}
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
    marginBottom: 48,
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
  imageContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  bottomContainer: {
    paddingHorizontal: 16,
    gap: 0,
  },
  laterButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laterText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
