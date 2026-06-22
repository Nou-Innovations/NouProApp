/**
 * DemoDropdownPopover — faithful reproduction of the anchored dropdown style
 * (CompanyDropdown): a top-anchored card with a list of rows, fade animation,
 * lighter backdrop. Not a bottom sheet — included so the gallery shows the contrast.
 */
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SheetAttributes } from '../../data/bottomSheetRegistry';

interface DemoDropdownPopoverProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  attributes: SheetAttributes;
}

const SAMPLE_ROWS = ['Acme Distribution', 'North Branch', 'South Branch', 'Warehouse 4'];

export default function DemoDropdownPopover({ visible, onClose, title, attributes }: DemoDropdownPopoverProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const rnAnimation = attributes.animationType === 'custom-spring' ? 'none' : attributes.animationType;

  return (
    <Modal visible={visible} transparent={attributes.transparent} animationType={rnAnimation} onRequestClose={onClose}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: attributes.backdrop }]}
        onPress={onClose}
      />
      <View style={[styles.anchor, { marginTop: insets.top + 64 }]} pointerEvents="box-none">
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.borderColor,
              borderRadius: attributes.radius,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.textMuted }]}>{title}</Text>
          {SAMPLE_ROWS.map((label, i) => (
            <Pressable
              key={label}
              onPress={onClose}
              style={[
                styles.row,
                { borderBottomColor: theme.colors.borderColor },
                i === SAMPLE_ROWS.length - 1 && styles.rowLast,
              ]}
            >
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: {
    marginHorizontal: 16,
  },
  card: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 11,
    fontFamily: 'InterCustom-Bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: 'InterCustom-Medium',
  },
});
