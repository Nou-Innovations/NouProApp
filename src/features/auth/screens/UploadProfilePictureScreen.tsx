/**
 * UploadProfilePictureScreen
 * Upload profile picture during registration
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import { AppButton, TextButton } from '@/shared/components/ui';
import ImageUploadField from '@/shared/components/ui/ImageUploadField';
import { Icon } from '@/shared/utils/icons';
import { authAPI, unwrapAuthResponse } from '@/shared/services/api';
import { useRegistrationStore } from '@/shared/store/registrationStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'UploadProfilePicture'>;

export default function UploadProfilePictureScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userData } = route.params;
  const password = useRegistrationStore((state) => state.password);
  const clearPassword = useRegistrationStore((state) => state.clearPassword);

  // State
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const handleImageSelected = (uri: string) => {
    setProfileImage(uri);
    setError('');
  };

  const registerUser = async (withProfilePicture: boolean) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      // Note: Profile picture upload happens via profile edit after registration
      // Sending a local file URI as JSON doesn't work - the image needs to be uploaded separately
      const response = await authAPI.register({
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        countryCode: userData.countryCode,
        email: userData.email || undefined,
        password: password || '',
      });

      const pendingAuth = unwrapAuthResponse(response);
      navigation.navigate('ChoosePath', { pendingAuth });
      clearPassword();
    } catch (err: any) {
      if (__DEV__) {
        console.log('[Register] Error:', err);
      }
      if (err.status === 0 || err.code === 'ERR_NETWORK') {
        setError('No internet connection. Please check your network and try again.');
      } else {
        setError(err.response?.message || err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleDone = async () => {
    await registerUser(true);
  };

  const handleLater = async () => {
    await registerUser(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={24} color={appTheme.colors.text} />
        </TouchableOpacity>

        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Upload Profile Picture
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            Add a picture to complete your profile.
          </Text>
        </View>

        {/* Error Message */}
        {error ? (
          <Text style={[styles.errorText, { color: appTheme.colors.error }]}>{error}</Text>
        ) : null}

        {/* Image Upload Field */}
        <View style={styles.imageContainer}>
          <ImageUploadField
            imageUri={profileImage}
            onImageSelected={handleImageSelected}
            placeholder="Add Profile picture"
            changeText="Change picture"
            size={200}
            variant="circle"
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
          variant={profileImage && !loading ? 'primary' : 'disabled'}
          disabled={!profileImage || loading}
          loading={loading}
        />
        <TextButton
          title="Later"
          onPress={handleLater}
          disabled={loading}
          loading={loading}
          tone="muted"
          style={styles.laterButton}
          textStyle={{ color: appTheme.colors.text }}
        />
      </View>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
  errorText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
  laterButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
