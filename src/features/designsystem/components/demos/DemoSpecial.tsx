/**
 * DemoSpecial — bespoke sheets whose body we can't faithfully re-implement
 * (signature pad, date/time pickers). Renders the legacy bottom-sheet chrome via
 * DemoBottomSheet with a labeled placeholder body.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import DemoBottomSheet from './DemoBottomSheet';
import { SheetAttributes } from '../../data/bottomSheetRegistry';

interface DemoSpecialProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  attributes: SheetAttributes;
  placeholder?: string;
}

export default function DemoSpecial({ visible, onClose, title, attributes, placeholder }: DemoSpecialProps) {
  const { theme } = useTheme();

  return (
    <DemoBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      attributes={attributes}
      body={
        <View style={styles.body}>
          <Text style={[styles.placeholder, { color: theme.colors.textMuted }]}>
            {placeholder ?? 'Custom content'}
          </Text>
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
            Specialized content (not re-implemented in the gallery).
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  placeholder: {
    fontSize: 22,
    fontFamily: 'InterCustom-SemiBold',
  },
  hint: {
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    textAlign: 'center',
  },
});
