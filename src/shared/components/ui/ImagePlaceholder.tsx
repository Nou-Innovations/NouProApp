import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ViewStyle, TextStyle, ImageStyle, Alert } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import * as ImagePicker from 'expo-image-picker';

interface ImagePlaceholderProps {
  text: string;
  onPress: (uri: string) => void;
  imageUri?: string | null;
  style?: ViewStyle;
  iconName?: keyof typeof Icon.glyphMap;
  iconSize?: number;
  iconColor?: string;
  textSize?: number;
  textColor?: string;
}

const DEFAULT_SIZE = 200;
const DEFAULT_BORDER_RADIUS = 16;
const DEFAULT_ICON_SIZE = 24;
const DEFAULT_ICON_COLOR = '#A0A0A0';
const DEFAULT_TEXT_COLOR = '#A0A0A0';
const DEFAULT_BORDER_COLOR = '#D0D0D0';

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  text,
  onPress,
  imageUri,
  style,
  iconName = 'image-outline',
  iconSize = DEFAULT_ICON_SIZE,
  iconColor = DEFAULT_ICON_COLOR,
  textSize = 16,
  textColor = DEFAULT_TEXT_COLOR,
}) => {
  const handleImageSelection = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to make this work!'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onPress(result.assets[0].uri); // Pass the selected image URI to the parent
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  return (
    <TouchableOpacity onPress={handleImageSelection} style={[styles.container, style]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholderContent}>
          <Icon name={iconName} size={iconSize} color={iconColor} />
          <Text style={[styles.text, { fontSize: textSize, color: textColor }]}>{text}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: DEFAULT_SIZE,
    height: DEFAULT_SIZE,
    borderRadius: DEFAULT_BORDER_RADIUS,
    borderWidth: 1,
    borderColor: DEFAULT_BORDER_COLOR,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  placeholderContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10, // Add some padding for text if it's long
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  text: {
    marginTop: 12, // Space between icon and text
    textAlign: 'center',
  },
});

export default ImagePlaceholder; 