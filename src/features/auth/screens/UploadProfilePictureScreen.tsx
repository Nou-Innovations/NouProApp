/**
 * UploadProfilePictureScreen
 * Upload profile picture during registration
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
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppButton from '@/shared/components/ui/AppButton';
import ImageUploadField from '@/shared/components/ui/ImageUploadField';
import { authAPI } from '@/shared/services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'UploadProfilePicture'>;

export default function UploadProfilePictureScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userData, password } = route.params;
  
  // State
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageSelected = (uri: string) => {
    setProfileImage(uri);
    setError('');
  };

  const registerUser = async (withProfilePicture: boolean) => {
    setLoading(true);
    setError('');
    
    try {
      // Call registration API
      const response = await authAPI.register({
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email || '',
        password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        countryCode: userData.countryCode,
        profilePicture: withProfilePicture ? profileImage : undefined,
      });
      
      // Extract auth data from response
      const pendingAuth = {
        user: response.data?.user || response.user,
        token: response.data?.token || response.token,
        refreshToken: response.data?.refreshToken || response.refreshToken,
        businesses: response.data?.businesses || [],
      };
      
      // Navigate to choose path with pending auth data (don't login yet)
      navigation.navigate('ChoosePath', { pendingAuth });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create account');
    } finally {
      setLoading(false);
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
        <TouchableOpacity
          style={styles.laterButton}
          onPress={handleLater}
          disabled={loading}
        >
          <Text style={[styles.laterText, { color: loading ? appTheme.colors.textMuted : appTheme.colors.text }]}>
            {loading ? 'Creating account...' : 'Later'}
          </Text>
        </TouchableOpacity>
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
