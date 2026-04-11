/**
 * ImageUploadField Component
 * 
 * Universal image picker field for profile pictures and logos.
 * 
 * Design Specs:
 * - Size: 200x200px (default, customizable)
 * - Border: 1px dashed
 * - Border Radius: 16px
 * - Camera Icon: 32px
 * - Placeholder Text: 16px semi-bold
 * - "Change picture" Text: 16px semi-bold, primary color
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { imageService } from '@/shared/services/imageService';

// Design constants
const FIELD_SIZE = 200;
const BORDER_RADIUS = 16;
const ICON_SIZE = 32;
const TEXT_SIZE = 16;

interface ImageUploadFieldProps {
  /** Current image URI */
  imageUri?: string | null;
  /** Called when image is selected */
  onImageSelected: (uri: string) => void;
  /** Placeholder text (e.g., "Add Profile picture" or "Add Logo picture") */
  placeholder?: string;
  /** Change text shown after upload */
  changeText?: string;
  /** Size of the field (default: 200px) */
  size?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Show loading state externally (optional - component also manages internal loading) */
  isLoading?: boolean;
}

export default function ImageUploadField({
  imageUri,
  onImageSelected,
  placeholder = 'Add Profile picture',
  changeText = 'Change picture',
  size = FIELD_SIZE,
  disabled = false,
  isLoading: externalLoading = false,
}: ImageUploadFieldProps) {
  const { theme: appTheme } = useTheme();
  const [internalLoading, setInternalLoading] = useState(false);
  
  // Use external loading state if provided, otherwise use internal
  const isLoading = externalLoading || internalLoading;

  const handlePress = () => {
    if (disabled || isLoading) return;

    // Use imageService's built-in picker options
    imageService.showImagePickerOptions(handleTakePhoto, handleChooseFromGallery);
  };

  const handleTakePhoto = async () => {
    setInternalLoading(true);
    try {
      const result = await imageService.openCamera();
      if (result.success && result.imageUri) {
        onImageSelected(result.imageUri);
      }
    } finally {
      setInternalLoading(false);
    }
  };

  const handleChooseFromGallery = async () => {
    setInternalLoading(true);
    try {
      const result = await imageService.openGallery();
      if (result.success && result.imageUri) {
        onImageSelected(result.imageUri);
      }
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.field,
          {
            width: size,
            height: size,
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
                borderRadius: BORDER_RADIUS - 1,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Icon name="camera" size={ICON_SIZE} color={appTheme.colors.textMuted} />
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
    borderRadius: BORDER_RADIUS,
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
    fontSize: TEXT_SIZE,
    fontFamily: theme.fonts.primary.semiBold,
    textAlign: 'center',
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeText: {
    fontSize: TEXT_SIZE,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
