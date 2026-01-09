import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { isValidImageUri } from '@/shared/utils/avatarUtils';
import { userAvatarService } from '@/shared/services/userAvatarService';
import theme from '@/shared/theme';

interface AvatarProps {
  userId: string;
  userName: string;
  imageUri?: string | null;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showFallback?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  userId,
  userName,
  imageUri,
  size = theme.avatarSizes.sm, // Default to sm (40px)
  style,
  textStyle,
  showFallback = true,
}) => {
  // Use theme colors as defaults
  const [backgroundColor, setBackgroundColor] = useState(theme.colors.surface);
  const [textColor, setTextColor] = useState(theme.colors.textSecondary);
  const [initials, setInitials] = useState('?');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAvatarData = async () => {
      try {
        const [bgColor, txtColor] = await userAvatarService.getUserAvatarColors(userId, userName);
        const userInitials = await userAvatarService.getUserInitials(userId, userName);
        
        setBackgroundColor(bgColor);
        setTextColor(txtColor);
        setInitials(userInitials);
      } catch (error) {
        console.error('Error loading avatar data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvatarData();
  }, [userId, userName]);

  const hasValidImage = isValidImageUri(imageUri) && !imageLoadError;
  const shouldShowFallback = showFallback && (!hasValidImage || isLoading);

  const avatarStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: theme.borderRadius.md,
    backgroundColor: shouldShowFallback ? backgroundColor : 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    ...style,
  };

  const fontSize = Math.max(theme.fontSize.xs, size * 0.4); // Dynamic font size based on avatar size
  const finalTextStyle: TextStyle = {
    fontSize,
    fontFamily: theme.fonts.primary.bold,
    color: textColor,
    ...textStyle,
  };

  if (hasValidImage && !isLoading) {
    return (
      <Image
        source={{ uri: imageUri! }}
        style={avatarStyle}
        onError={(error) => {
          console.log('Avatar image loading error:', error.nativeEvent.error);
          setImageLoadError(true);
        }}
        onLoad={() => {
          setImageLoadError(false);
        }}
      />
    );
  }

  if (shouldShowFallback) {
    return (
      <View style={avatarStyle}>
        <Text style={finalTextStyle}>{initials}</Text>
      </View>
    );
  }

  // Return empty view if no fallback should be shown
  return <View style={avatarStyle} />;
};

export default Avatar; 