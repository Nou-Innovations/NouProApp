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

type Props = NativeStackScreenProps<AuthStackParamList, 'UploadProfilePicture'>;

export default function UploadProfilePictureScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userData, password } = route.params;
  
  // State
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleImageSelected = (uri: string) => {
    setProfileImage(uri);
  };

  const handleDone = async () => {
    // TODO: Save user profile with image
    // For now, navigate to choose path
    navigation.navigate('ChoosePath');
  };

  const handleLater = () => {
    // Skip profile picture, navigate to choose path
    navigation.navigate('ChoosePath');
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
          variant={profileImage ? 'primary' : 'disabled'}
          disabled={!profileImage}
        />
        <TouchableOpacity
          style={styles.laterButton}
          onPress={handleLater}
        >
          <Text style={[styles.laterText, { color: appTheme.colors.text }]}>
            Later
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
