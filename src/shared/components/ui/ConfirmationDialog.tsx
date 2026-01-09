import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppButton from './AppButton';

export type ConfirmationDialogVariant = 'delete' | 'confirm' | 'success';

interface ConfirmationDialogProps {
  visible: boolean;
  variant: ConfirmationDialogVariant;
  title: string;
  message: string;
  primaryButtonText: string;
  secondaryButtonText?: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  onClose: () => void;
}

/**
 * ConfirmationDialog - A reusable confirmation modal with three variants:
 * 
 * 1. 'delete' - Dark red background, no icon, for destructive actions (delete, remove, discard)
 * 2. 'confirm' - Dark green background, NO icon, for asking confirmation before an action (save changes?, proceed?)
 * 3. 'success' - Dark green background, checkmark icon, for success feedback AFTER an action (saved!, created!, sent!)
 */
export default function ConfirmationDialog({
  visible,
  variant,
  title,
  message,
  primaryButtonText,
  secondaryButtonText,
  onPrimaryAction,
  onSecondaryAction,
  onClose,
}: ConfirmationDialogProps) {
  const { theme: appTheme } = useTheme();

  const isDeleteVariant = variant === 'delete';
  const isSuccessVariant = variant === 'success';
  const isGreenVariant = variant === 'confirm' || variant === 'success';
  
  // Background colors from theme (already include 90% opacity)
  const cardBackgroundColor = isDeleteVariant 
    ? appTheme.colors.confirmDialogDarkRed
    : appTheme.colors.confirmDialogDarkGreen;
  
  // Primary button and shadow colors
  const primaryColor = isDeleteVariant 
    ? appTheme.colors.error 
    : appTheme.colors.success;
  
  // Text color for green variant primary buttons (confirm and success)
  const greenButtonTextColor = isGreenVariant 
    ? appTheme.colors.confirmDialogDarkGreenSolid
    : undefined;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop}>
          <View 
            style={[
              styles.content, 
              { 
                backgroundColor: cardBackgroundColor,
              }
            ]}
          >
            {/* Icon Container - Only for success variant (after action completed) */}
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
            <Text style={[styles.title, isSuccessVariant && styles.titleWithIcon]}>
              {title}
            </Text>
            
            {/* Message */}
            <Text style={styles.message}>
              {message}
            </Text>
            
            {/* Primary Action */}
            <View style={styles.primaryActions}>
              <AppButton
                title={primaryButtonText}
                onPress={onPrimaryAction}
                variant={isDeleteVariant ? 'alert' : 'confirm'}
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
                  <Text style={styles.secondaryButtonText}>
                    {secondaryButtonText}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
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
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  titleWithIcon: {
    // Title comes after icon, already has spacing from icon marginBottom
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    color: '#FFFFFF',
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
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});

