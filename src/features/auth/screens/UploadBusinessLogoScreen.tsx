/**
 * UploadBusinessLogoScreen
 * Upload business logo during registration
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { getApiErrorMessage } from '@/shared/utils/apiError';
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

  const createBusiness = async (
    withLogoUri: string | null,
    extra: Record<string, unknown> = {},
  ): Promise<UserBusiness> => {
    // During registration flow, the user isn't in the store yet.
    // Temporarily set the pending token so the Axios interceptor can pick it up.
    const isLoggedIn = !!useProfileStore.getState().accessToken;
    if (!isLoggedIn && pendingAuth?.token) {
      // Both tokens. This branch is the riskiest: BasicInfo -> Location -> Hours -> Logo
      // can easily outlive the 30-minute access token, and POST /companies is the last
      // call in it. Without a refresh token that 401 wiped the whole registration (A-8).
      useProfileStore.setState({
        accessToken: pendingAuth.token,
        ...(pendingAuth.refreshToken ? { refreshToken: pendingAuth.refreshToken } : {}),
      });
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

    const result = await post<UserBusiness>('/companies', { ...payload, ...extra });
    return result;
  };

  // Set when the API reports an archived company this user still owns (409).
  const [restoreCandidate, setRestoreCandidate] = useState<{ id: string; name: string } | null>(null);
  const [pendingLogoChoice, setPendingLogoChoice] = useState(true);

  const handleCreate = async (withLogo: boolean, extra?: Record<string, unknown>) => {
    setIsCreating(true);
    try {
      const newBusiness = await createBusiness(withLogo ? logoImage : null, extra);
      setCreatedBusiness(newBusiness);
      setIsCreating(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      setIsCreating(false);
      // The user previously archived a company with these contact details and still owns
      // it. Ask before discarding what they just typed OR resurrecting a whole catalogue.
      // NOTE: ApiError.response is the response BODY, so read err.status / err.response.data.
      if (err?.status === 409 && err?.response?.data?.candidates?.length) {
        const candidate = err.response.data.candidates[0];
        setPendingLogoChoice(withLogo);
        setRestoreCandidate(candidate);
        return;
      }
      // Clear the temporarily set token on failure so it doesn't pollute the store
      if (!fromProfileSwitcher) {
        useProfileStore.setState({ accessToken: null, refreshToken: null });
      }
      AppAlert.alert(
        'Failed to create business',
        getApiErrorMessage(err, 'Something went wrong. Please try again.'),
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
      // Prefer whatever is in the store: if the interceptor refreshed at any point during
      // onboarding, the route params are now stale and would overwrite good tokens with
      // old ones. That self-heals only because refresh tokens aren't invalidated on use —
      // don't leave onboarding quietly depending on that.
      const seeded = useProfileStore.getState();
      const fresh = await authAPI.refreshTokenIfNeeded(
        seeded.accessToken || pendingAuth.token,
        seeded.refreshToken || pendingAuth.refreshToken,
      );
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

      {/* Restore a company this user previously archived (409 from POST /companies) */}
      <AppModal
        visible={!!restoreCandidate}
        variant="confirm"
        title="Restore your previous company?"
        message={`You deleted “${restoreCandidate?.name}” earlier. Restoring brings back its products, customers and history. It stays unpublished until you publish it again.`}
        primaryButtonText="Restore it"
        onPrimaryAction={() => {
          const id = restoreCandidate?.id;
          setRestoreCandidate(null);
          if (id) void handleCreate(pendingLogoChoice, { restoreBusinessId: id });
        }}
        secondaryButtonText="Create a new one"
        onSecondaryAction={() => {
          setRestoreCandidate(null);
          void handleCreate(pendingLogoChoice, { forceCreateNew: true });
        }}
        onClose={() => setRestoreCandidate(null)}
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
