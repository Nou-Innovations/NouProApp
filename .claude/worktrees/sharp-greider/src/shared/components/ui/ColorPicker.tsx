import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput, Text } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface ColorPickerProps {
  onColorSelected: (color: string) => void;
  initialColor?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  onColorSelected,
  initialColor = '#000000',
}) => {
  const { theme: appTheme } = useTheme();
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [hexInput, setHexInput] = useState(initialColor);

  const colorOptions = [
    '#000000', // Black
    '#FFFFFF', // White
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#008000', // Dark Green
    '#800000', // Maroon
    '#008080', // Teal
    '#000080', // Navy
    '#808080', // Gray
  ];

  const handleColorPress = (color: string) => {
    setSelectedColor(color);
    setHexInput(color);
  };

  const handleHexInputChange = (text: string) => {
    // Only allow valid hex characters
    const validHex = text.replace(/[^0-9A-Fa-f#]/g, '');
    setHexInput(validHex);
  };

  const handleHexInputSubmit = () => {
    let finalHex = hexInput;
    // Ensure it starts with #
    if (!finalHex.startsWith('#')) {
      finalHex = '#' + finalHex;
    }
    // Add leading zeros if needed
    if (finalHex.length === 4) {
      // Convert #RGB to #RRGGBB
      finalHex = '#' + finalHex[1] + finalHex[1] + finalHex[2] + finalHex[2] + finalHex[3] + finalHex[3];
    } else if (finalHex.length > 7) {
      // Truncate if too long
      finalHex = finalHex.substring(0, 7);
    } else if (finalHex.length < 7) {
      // Pad with zeros
      while (finalHex.length < 7) {
        finalHex += '0';
      }
    }
    
    setSelectedColor(finalHex);
    setHexInput(finalHex);
  };

  const handleConfirm = () => {
    handleHexInputSubmit();
    onColorSelected(selectedColor);
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.cardBackground }]}>
      <View style={styles.previewContainer}>
        <View style={[styles.previewColor, { 
          backgroundColor: selectedColor,
          borderColor: appTheme.colors.borderColor 
        }]} />
        <View style={styles.hexInputContainer}>
          <TextInput
            style={[styles.hexInput, { 
              color: appTheme.colors.text,
              borderColor: appTheme.colors.borderColor,
              backgroundColor: appTheme.colors.inputBackground
            }]}
            value={hexInput}
            onChangeText={handleHexInputChange}
            onEndEditing={handleHexInputSubmit}
            placeholder="#000000"
            placeholderTextColor={appTheme.colors.textLight}
            maxLength={7}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <View style={styles.paletteContainer}>
        {colorOptions.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              color === '#FFFFFF' && { borderColor: appTheme.colors.borderColor },
              selectedColor === color && { 
                borderColor: appTheme.colors.accent,
                borderWidth: 2
              },
            ]}
            onPress={() => handleColorPress(color)}
          />
        ))}
      </View>

      <TouchableOpacity style={[styles.confirmButton, { backgroundColor: appTheme.colors.accent }]} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewColor: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 16,
  },
  hexInputContainer: {
    flex: 1,
  },
  hexInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  paletteContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  whiteColorBorder: {
    borderColor: '#D1D5DB',
  },
  selectedColor: {
    borderColor: '#000',
    borderWidth: 2,
  },
  confirmButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ColorPicker; 