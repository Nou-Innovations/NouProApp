/**
 * DemoCenteredDialog — faithful reproduction of a legacy centered dialog
 * (StockScreen edit, invoice download/confirm, profile-switcher access, paywall).
 * Look driven by `attributes` (backdrop opacity + card radius + animation).
 */
import React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppButton from '@/shared/components/ui/AppButton';
import { SheetAttributes } from '../../data/bottomSheetRegistry';

interface DemoCenteredDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  attributes: SheetAttributes;
}

export default function DemoCenteredDialog({ visible, onClose, title, attributes }: DemoCenteredDialogProps) {
  const { theme } = useTheme();
  const rnAnimation = attributes.animationType === 'custom-spring' ? 'none' : attributes.animationType;

  return (
    <Modal visible={visible} transparent={attributes.transparent} animationType={rnAnimation} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: attributes.backdrop }]}
          onPress={onClose}
        />

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
          {attributes.closeButton ? (
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={22} color={theme.colors.iconColor} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}

          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.colors.textLight }]}>
            A centered dialog reproduction. Backdrop {attributes.backdrop}, radius {attributes.radius}.
          </Text>

          <AppButton title="Confirm" onPress={onClose} style={styles.primaryBtn} />
          <TouchableOpacity onPress={onClose} style={styles.secondaryBtn}>
            <Text style={[styles.secondaryText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '86%',
    maxWidth: 360,
    borderWidth: 1,
    paddingTop: 28,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: 'InterCustom-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    fontFamily: 'InterCustom-Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    marginBottom: 8,
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryText: {
    fontSize: 16,
    fontFamily: 'InterCustom-SemiBold',
  },
});
