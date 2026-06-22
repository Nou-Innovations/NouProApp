/**
 * UploadBusinessLogoScreen
 * Upload business logo during registration
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@/shared/types/navigation';
import { UserBusiness } from '@/shared/types/business';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import { AppButton, TextButton } from '@/shared/components/ui';
import AppModal from '@/shared/components/ui/AppModal';
import ImageUploadField from '@/shared/components/ui/ImageUploadField';
import { useProfileStore } from '@/shared/store/profileStore';
import { authAPI, post } from '@/shared/services/api';
import { uploadImage } from '@/shared/services/imageService';

type Props = NativeStackScreenProps<AuthStackParamList, 'UploadBusinessLogo'>;

export default function UploadBusinessLogoScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation();
  const { businessData, fromProfileSwitcher, pendingAuth } = route.params;
  const login = useProfileStore((state) => state.login);
  const addUserBusiness = useProfileStore((state) => state.addUserBusiness);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);

  // State
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdBusiness, setCreatedBusiness] = useState<UserBusiness | null>(null);

  const handleImageSelected = (uri: string) => {
    setLogoImage(uri);
  };

  const createBusiness = async (withLogoUri: string | null): Promise<UserBusiness> => {
    // During registration flow, the user isn't in the store yet.
    // Temporarily set the pending token so the Axios interceptor can pick it up.
    const isLoggedIn = !!useProfileStore.getState().accessToken;
    if (!isLoggedIn && pendingAuth?.token) {
      useProfileStore.setState({ accessToken: pendingAuth.token });
    }

    // Upload logo if provided
    let logoUrl: string | undefined;
    if (withLogoUri) {
      logoUrl = await uploadImage(withLogoUri);
    }

    // Build the full payload from all onboarding steps
    const payload = {
      name: businessData.name,
      type: businessData.type,
      category: businessData.category,
      phone: `${businessData.countryCode}${businessData.phone}`,
      email: businessData.email,
      website: businessData.website,
      address: businessData.location.address,
      latitude: businessData.location.latitude,
      longitude: businessData.location.longitude,
      businessHours: businessData.businessHours,
      logoUrl,
    };

    const result = await post<UserBusiness>('/companies', payload);
    return result;
  };

  const handleCreate = async (withLogo: boolean) => {
    setIsCreating(true);
    try {
      const newBusiness = await createBusiness(withLogo ? logoImage : null);
      setCreatedBusiness(newBusiness);
      setIsCreating(false);
      setShowSuccessModal(true);
    } catch (err) {
      setIsCreating(false);
      // Clear the temporarily set token on failure so it doesn't pollute the store
      if (!fromProfileSwitcher) {
        useProfileStore.setState({ accessToken: null });
      }
      Alert.alert(
        'Failed to create business',
        'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDone = () => handleCreate(true);
  const handleLater = () => handleCreate(false);

  const handleSuccessModalContinue = async () => {
    setShowSuccessModal(false);

    if (fromProfileSwitcher) {
      // User is already logged in — add the new business and switch to it
      if (createdBusiness) {
        addUserBusiness(createdBusiness);
        // Automatically switch to the new business so the user lands in business mode
        switchToBusiness(createdBusiness.business.id);
      }
      // @ts-ignore
      rootNavigation.goBack();
    } else if (pendingAuth) {
      // Refresh token if it may have expired during the onboarding flow
      const fresh = await authAPI.refreshTokenIfNeeded(pendingAuth.token, pendingAuth.refreshToken);
      // Include the newly created business in the login call
      const businesses = createdBusiness
        ? [createdBusiness, ...(pendingAuth.businesses || [])]
        : (pendingAuth.businesses || []);
      login(
        pendingAuth.user,
        fresh.token,
        fresh.refreshToken,
        businesses,
        true // isNewUser
      );
      // Auto-switch to the newly created business so the user lands in business mode
      if (createdBusiness) {
        switchToBusiness(createdBusiness.business.id);
      }
    }
  };

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
        <TextButton
          title="Later"
          onPress={handleLater}
          disabled={isCreating}
          tone="muted"
          style={styles.laterButton}
          textStyle={{ color: appTheme.colors.text }}
        />
      </View>

      {/* Success Modal */}
      <AppModal
        visible={showSuccessModal}
        variant="success"
        title="Profile created!"
        message="Your Business profile has been successfully created! You can switch from personal to business profile now."
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
});
