import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { OVERLAY, MODAL_TYPOGRAPHY } from '@/shared/ui/tokens/overlays';

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: React.ReactNode; // custom body if needed
  footer?: React.ReactNode;   // buttons row
}

/**
 * AppModal
 * Use for confirmations/info/success/error (delete?, created successfully).
 * Centered modal that blocks interaction with clear button row.
 * 
 * This is the ONLY modal component to use. Replace:
 * - ConfirmationDialog → AppModal
 */
export default function AppModal({ visible, onClose, title, message, children, footer }: AppModalProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    scale.setValue(0.98);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, scale]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity, backgroundColor: OVERLAY.backdrop }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.borderColor,
              transform: [{ scale }],
            },
          ]}
        >
          {title ? <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text> : null}
          {message ? <Text style={[styles.message, { color: theme.colors.textLight }]}>{message}</Text> : null}
          {children ? <View style={styles.body}>{children}</View> : null}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  backdrop: { 
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    width: '86%',
    maxWidth: 420,
    borderRadius: OVERLAY.modalRadius,
    padding: 20,
    borderWidth: 1,
  },
  title: { 
    fontSize: MODAL_TYPOGRAPHY.title.fontSize, 
    fontWeight: MODAL_TYPOGRAPHY.title.fontWeight,
  },
  message: { 
    marginTop: 8, 
    fontSize: MODAL_TYPOGRAPHY.body.fontSize, 
    fontWeight: MODAL_TYPOGRAPHY.body.fontWeight, 
    lineHeight: MODAL_TYPOGRAPHY.body.lineHeight,
  },
  body: { 
    marginTop: 12,
  },
  footer: { 
    marginTop: 16,
  },
});

