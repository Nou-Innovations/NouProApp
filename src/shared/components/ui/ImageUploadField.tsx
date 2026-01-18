/**
 * ImageUploadField Component
 * Reusable image picker field for profile pictures and logos
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { imageService } from '@/shared/services/imageService';

interface ImageUploadFieldProps {
  /** Current image URI */
  imageUri?: string | null;
  /** Called when image is selected */
  onImageSelected: (uri: string) => void;
  /** Placeholder text (e.g., "Add Profile picture" or "Add Logo picture") */
  placeholder?: string;
  /** Change text shown after upload */
  changeText?: string;
  /** Size of the field (default: 200) */
  size?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Show square shape (for logos) vs circle (for profile) */
  variant?: 'circle' | 'square';
}

export default function ImageUploadField({
  imageUri,
  onImageSelected,
  placeholder = 'Add Profile picture',
  changeText = 'Change picture',
  size = 200,
  disabled = false,
  variant = 'circle',
}: ImageUploadFieldProps) {
  const { theme: appTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = () => {
    if (disabled || isLoading) return;

    Alert.alert(
      'Select Photo',
      'Choose how you want to add your photo',
      [
        {
          text: 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: handleChooseFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleTakePhoto = async () => {
    setIsLoading(true);
    try {
      const result = await imageService.openCamera();
      if (result.success && result.imageUri) {
        onImageSelected(result.imageUri);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChooseFromGallery = async () => {
    setIsLoading(true);
    try {
      const result = await imageService.openGallery();
      if (result.success && result.imageUri) {
        onImageSelected(result.imageUri);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Always use 16px border radius per design spec
  const borderRadius = 16;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.field,
          {
            width: size,
            height: size,
            borderRadius,
            borderColor: appTheme.colors.borderColor,
            backgroundColor: appTheme.colors.inputBackground,
          },
        ]}
        onPress={handlePress}
        disabled={disabled || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        ) : imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[
              styles.image,
              {
                width: size - 2,
                height: size - 2,
                borderRadius: borderRadius - 1,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Icon name="camera" size={40} color={appTheme.colors.textMuted} />
            <Text style={[styles.placeholderText, { color: appTheme.colors.textMuted }]}>
              {placeholder}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {imageUri && !isLoading && (
        <TouchableOpacity
          style={styles.changeButton}
          onPress={handlePress}
          disabled={disabled}
        >
          <Text style={[styles.changeText, { color: appTheme.colors.primary }]}>
            {changeText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  field: {
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    textAlign: 'center',
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
});
