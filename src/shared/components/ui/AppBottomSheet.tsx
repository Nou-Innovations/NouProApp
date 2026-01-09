import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { OVERLAY, MODAL_TYPOGRAPHY } from '@/shared/ui/tokens/overlays';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * AppBottomSheet
 * Use for lists/options/actions (create new, choose status, filters, etc.).
 * Slides up from the bottom with a drag handle and scrollable content.
 * 
 * This is the ONLY bottom sheet component to use. Replace:
 * - ActionBottomSheet → AppBottomSheet
 * - ModalList → AppBottomSheet
 * - DropdownModal → AppBottomSheet
 */
export default function AppBottomSheet({ visible, onClose, title, children }: AppBottomSheetProps) {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(20);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, translateY]);

  const overlayStyle = useMemo(
    () => [styles.overlay, { backgroundColor: OVERLAY.backdrop, opacity }],
    [opacity]
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={overlayStyle}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.cardBackground,
              borderTopColor: theme.colors.borderColor,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />

          {(title || true) && (
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                {title ?? ''}
              </Text>
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.closeBtn} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={theme.colors.iconColor} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.content}>{children}</View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
  },
  backdrop: { 
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: OVERLAY.sheetRadius,
    borderTopRightRadius: OVERLAY.sheetRadius,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  title: { 
    fontSize: MODAL_TYPOGRAPHY.title.fontSize, 
    fontWeight: MODAL_TYPOGRAPHY.title.fontWeight, 
    flex: 1, 
    paddingRight: 10,
  },
  closeBtn: { 
    width: 40, 
    height: 40, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  content: { 
    paddingTop: 6,
  },
});

