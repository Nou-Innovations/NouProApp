import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { OVERLAY, MODAL_TYPOGRAPHY } from '@/shared/ui/tokens/overlays';
import AppButton from './AppButton';

export type AppModalVariant = 'default' | 'delete' | 'confirm' | 'success';

export interface AppModalProps {
  visible: boolean;
  variant?: AppModalVariant;
  title?: string;
  message?: string;
  primaryButtonText: string;
  secondaryButtonText?: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  onClose: () => void;
}

/**
 * AppModal - A reusable modal with four variants:
 * 
 * 1. 'default' - Theme-aware background, theme-aware text, for general modals
 * 2. 'delete' - Dark red background, white text, for destructive actions (delete, remove, discard)
 * 3. 'confirm' - Dark green background, white text, for asking confirmation before an action (save changes?, proceed?)
 * 4. 'success' - Dark green background, white text, checkmark icon, for success feedback AFTER an action (saved!, created!, sent!)
 */
export default function AppModal({
  visible,
  variant = 'default',
  title,
  message,
  primaryButtonText,
  secondaryButtonText,
  onPrimaryAction,
  onSecondaryAction,
  onClose,
}: AppModalProps) {
  const { theme: appTheme } = useTheme();
  
  // Animation values
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

  const isDefaultVariant = variant === 'default';
  const isDeleteVariant = variant === 'delete';
  const isSuccessVariant = variant === 'success';
  const isGreenVariant = variant === 'confirm' || variant === 'success';
  
  // Background colors
  const getBackgroundColor = () => {
    if (isDefaultVariant) return appTheme.colors.cardBackground;
    if (isDeleteVariant) return appTheme.colors.confirmDialogDarkRed;
    return appTheme.colors.confirmDialogDarkGreen;
  };
  
  // Text colors
  const textColor = isDefaultVariant ? appTheme.colors.text : '#FFFFFF';
  const messageColor = isDefaultVariant ? appTheme.colors.textLight : '#FFFFFF';
  
  // Button variant
  const getButtonVariant = () => {
    if (isDefaultVariant) return 'primary';
    if (isDeleteVariant) return 'alert';
    return 'confirm';
  };
  
  // Text color for green variant primary buttons (confirm and success)
  const greenButtonTextColor = isGreenVariant 
    ? appTheme.colors.confirmDialogDarkGreenSolid
    : undefined;

  // Secondary button text color
  const secondaryTextColor = isDefaultVariant ? appTheme.colors.text : '#FFFFFF';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity, backgroundColor: OVERLAY.backdrop }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.content,
            {
              backgroundColor: getBackgroundColor(),
              borderColor: isDefaultVariant ? appTheme.colors.borderColor : 'transparent',
              borderWidth: isDefaultVariant ? 1 : 0,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Icon Container - Only for success variant */}
          {isSuccessVariant && (
            <View 
              style={[
                styles.iconContainer, 
                { borderColor: appTheme.colors.success }
              ]}
            >
              <Icon name="checkmark" size={32} color="#FFFFFF" />
            </View>
          )}
          
          {/* Title */}
          {title ? (
            <Text style={[styles.title, { color: textColor }, isSuccessVariant && styles.titleWithIcon]}>
              {title}
            </Text>
          ) : null}
          
          {/* Message */}
          {message ? (
            <Text style={[styles.message, { color: messageColor }]}>
              {message}
            </Text>
          ) : null}
          
          {/* Primary Action */}
          <View style={styles.primaryActions}>
            <AppButton
              title={primaryButtonText}
              onPress={onPrimaryAction}
              variant={getButtonVariant()}
              size="default"
              style={styles.primaryButton}
              textStyle={greenButtonTextColor ? { color: greenButtonTextColor } : undefined}
            />
          </View>
          
          {/* Secondary Action */}
          {secondaryButtonText && onSecondaryAction && (
            <View style={styles.secondaryActions}>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={onSecondaryAction}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: secondaryTextColor }]}>
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  content: {
    width: '86%',
    maxWidth: 360,
    borderRadius: OVERLAY.modalRadius,
    paddingTop: 32,
    paddingBottom: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: MODAL_TYPOGRAPHY.title.fontSize,
    fontFamily: MODAL_TYPOGRAPHY.title.fontFamily,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  titleWithIcon: {
    // Title comes after icon, already has spacing from icon marginBottom
  },
  message: {
    fontSize: MODAL_TYPOGRAPHY.body.fontSize,
    fontFamily: MODAL_TYPOGRAPHY.body.fontFamily,
    textAlign: 'center',
    lineHeight: MODAL_TYPOGRAPHY.body.lineHeight,
    marginBottom: 24,
  },
  primaryActions: {
    width: '100%',
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'InterCustom-SemiBold',
  },
});
