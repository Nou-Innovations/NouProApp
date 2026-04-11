/**
 * ImagePlaceholder Component
 * 
 * Universal image picker field for product images, attachments, etc.
 * 
 * Design Specs:
 * - Size: 200x200px (default, customizable)
 * - Border: 1px dashed
 * - Border Radius: 16px
 * - Icon: 32px (default image-outline)
 * - Placeholder Text: 16px semi-bold
 * - "Change picture" Text: 16px semi-bold, primary color (shown after upload)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ViewStyle, ActivityIndicator } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { imageService } from '@/shared/services/imageService';

// Design constants
const DEFAULT_SIZE = 200;
const DEFAULT_BORDER_RADIUS = 16;
const DEFAULT_ICON_SIZE = 32;

interface ImagePlaceholderProps {
  /** Placeholder text shown when no image is selected */
  text: string;
  /** Called when an image is selected */
  onPress: (uri: string) => void;
  /** Current image URI */
  imageUri?: string | null;
  /** Custom container style */
  style?: ViewStyle;
  /** Icon name (default: 'image-outline') */
  iconName?: keyof typeof Icon.glyphMap;
  /** Icon size (default: 32px) */
  iconSize?: number;
  /** Icon color (uses theme textMuted if not provided) */
  iconColor?: string;
  /** Text to show for changing image (default: 'Change picture') */
  changeText?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  text,
  onPress,
  imageUri,
  style,
  iconName = 'image-outline',
  iconSize = DEFAULT_ICON_SIZE,
  iconColor,
  changeText = 'Change picture',
  disabled = false,
}) => {
  const { theme: appTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleImageSelection = () => {
    if (disabled || isLoading) return;

    // Use imageService's built-in picker options
    imageService.showImagePickerOptions(handleTakePhoto, handleChooseFromGallery);
  };

  const handleTakePhoto = async () => {
    setIsLoading(true);
    try {
      const result = await imageService.openCamera();
      if (result.success && result.imageUri) {
        onPress(result.imageUri);
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
        onPress(result.imageUri);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const effectiveIconColor = iconColor || appTheme.colors.textMuted;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity 
        onPress={handleImageSelection} 
        style={[
          styles.container, 
          { borderColor: appTheme.colors.borderColor },
          style
        ]}
        disabled={disabled || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholderContent}>
            <Icon name={iconName} size={iconSize} color={effectiveIconColor} />
            <Text style={[styles.text, { color: appTheme.colors.textMuted }]}>{text}</Text>
          </View>
        )}
      </TouchableOpacity>

      {imageUri && !isLoading && (
        <TouchableOpacity
          style={styles.changeButton}
          onPress={handleImageSelection}
          disabled={disabled}
        >
          <Text style={[styles.changeText, { color: appTheme.colors.primary }]}>
            {changeText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 16,
  },
  container: {
    width: DEFAULT_SIZE,
    height: DEFAULT_SIZE,
    borderRadius: DEFAULT_BORDER_RADIUS,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  placeholderContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  text: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    textAlign: 'center',
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});

export default ImagePlaceholder; 