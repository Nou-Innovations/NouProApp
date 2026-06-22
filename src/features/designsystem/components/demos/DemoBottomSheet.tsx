/**
 * DemoBottomSheet — a faithful, self-contained reproduction of a legacy raw-Modal
 * bottom sheet. Its look + open/close behavior are driven entirely by `attributes`
 * (animation, backdrop, radius, drag handle, close button, safe-area), so a single
 * component reproduces every legacy bottom-sheet style in the gallery.
 *
 * Intentionally "dumb": no shared OVERLAY tokens, no drag-to-close gesture — that is
 * exactly what makes it represent the legacy variants rather than the canonical sheet.
 */
import React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SheetAttributes } from '../../data/bottomSheetRegistry';

interface DemoBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  attributes: SheetAttributes;
  /** Optional custom body (used by the "special" demos) */
  body?: React.ReactNode;
}

const SAMPLE_ROWS = ['Option one', 'Option two', 'Option three', 'Another action'];

export default function DemoBottomSheet({ visible, onClose, title, attributes, body }: DemoBottomSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // RN Modal only accepts none|slide|fade; canonical 'custom-spring' falls back to none.
  const rnAnimation = attributes.animationType === 'custom-spring' ? 'none' : attributes.animationType;

  return (
    <Modal
      visible={visible}
      transparent={attributes.transparent}
      animationType={rnAnimation}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: attributes.backdrop }]}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.cardBackground,
              borderTopColor: theme.colors.borderColor,
              borderTopLeftRadius: attributes.radius,
              borderTopRightRadius: attributes.radius,
              paddingBottom: attributes.safeArea ? insets.bottom + 12 : 16,
            },
          ]}
        >
          {attributes.dragHandle ? (
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
          ) : null}

          <View style={[styles.header, !attributes.dragHandle && styles.headerTopPad]}>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            {attributes.closeButton ? (
              <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <X size={26} color={theme.colors.iconColor} strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
          </View>

          {body ?? (
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {SAMPLE_ROWS.map((label, i) => (
                <View
                  key={label}
                  style={[
                    styles.row,
                    { borderBottomColor: theme.colors.borderColor },
                    i === SAMPLE_ROWS.length - 1 && styles.rowLast,
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: theme.colors.buttonBackground }]} />
                  <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    maxHeight: '80%',
    paddingHorizontal: 16,
  },
  handleWrap: {
    paddingTop: 8,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerTopPad: {
    paddingTop: 20,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'InterCustom-Bold',
    paddingRight: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: 'InterCustom-Medium',
  },
});
