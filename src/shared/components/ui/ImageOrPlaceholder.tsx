/**
 * ImageOrPlaceholder
 *
 * Display-only thumbnail: renders the remote image when a URI is present, otherwise an
 * on-brand placeholder (themed `imagePlaceholder` background + image-outline icon).
 * Replaces ad-hoc `uri || 'https://via.placeholder.com/N'` fallbacks so we don't depend
 * on a third-party image domain. (For an interactive upload field, use `ImagePlaceholder`.)
 */

import React from 'react';
import { View, Image, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface ImageOrPlaceholderProps {
  /** Remote image URI; when falsy, the placeholder is shown */
  uri?: string | null;
  /** Style (size / borderRadius) applied to both the image and the placeholder box */
  style?: StyleProp<ImageStyle>;
  /** Placeholder icon size (default 24) */
  iconSize?: number;
}

const ImageOrPlaceholder: React.FC<ImageOrPlaceholderProps> = ({ uri, style, iconSize = 24 }) => {
  const { theme: appTheme } = useTheme();

  if (uri) {
    return <Image source={{ uri }} style={style} />;
  }

  return (
    <View
      style={[
        // Take size/radius/margins from the caller's style first, then force centering
        // and the themed placeholder background last so it wins over any hardcoded bg
        // (keeps the placeholder on-brand in both light and dark mode).
        style as StyleProp<ViewStyle>,
        styles.placeholder,
        { backgroundColor: appTheme.colors.imagePlaceholder },
      ]}
    >
      <Icon name="image-outline" size={iconSize} color={appTheme.colors.textMuted} />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default ImageOrPlaceholder;
