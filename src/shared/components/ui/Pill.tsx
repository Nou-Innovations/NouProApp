import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import theme from '@/shared/theme';
import { Text } from './Typography';

interface PillProps {
  text: string;
  color: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Pill: React.FC<PillProps> = ({ text, color, style, textStyle }) => {
  // Capitalize first letter of each word
  const formattedText = text.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return (
    <View style={[styles.pill, { backgroundColor: color }, style]}>
      <Text style={[styles.pillText, textStyle]}>{formattedText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    height: 28,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
    color: theme.colors.textInverse,
  },
});

export default Pill; 