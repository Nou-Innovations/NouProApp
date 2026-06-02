/**
 * ProfileActionButtons Component
 * Renders consistent action buttons based on ProfileViewType
 * 
 * Based on app-logic.json identitySystem.profileViewType
 * 
 * Button Specs (Small Buttons - 40px height):
 * - Height: 40px
 * - Border radius: 8px
 * - Font: Inter-SemiBold 16px
 * - Padding: 24px horizontal
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import {
  ProfileViewType,
  getProfileActionConfig,
  getProfileAdditionalOptions,
} from '@/shared/types/profile';

interface ProfileActionButtonsProps {
  /**
   * The profile view type
   */
  viewType: ProfileViewType;
  
  /**
   * Handler for primary button press (Edit/Message)
   */
  onPrimaryPress: () => void;
  
  /**
   * Handler for secondary button press (Share/Connect)
   */
  onSecondaryPress: () => void;
  
  /**
   * Handler for more options press (Report/Share/Block)
   */
  onMoreOptionsPress?: () => void;

  /**
   * Override the secondary button label (e.g. "Follow" / "Connected" / "Pending").
   * When omitted, the label from the view-type config is used.
   */
  secondaryLabel?: string;

  /**
   * Override the secondary button variant. Defaults to the config's variant.
   */
  secondaryVariant?: 'primary' | 'outline';

  /**
   * Show a spinner in the secondary button and disable it (e.g. while a
   * follow/connect request is in flight).
   */
  secondaryLoading?: boolean;

  /**
   * Custom styles for the container
   */
  style?: object;
}

/**
 * ProfileActionButtons - Renders action buttons based on profile view type
 * 
 * SELF_PROFILE: [Edit profile] [Share]
 * SELF_BUSINESS: [Edit] [Share Profile]
 * OTHER_USER: [Message] [Connect] [...]
 * OTHER_BUSINESS: [Message] [Connect] [...]
 */
export default function ProfileActionButtons({
  viewType,
  onPrimaryPress,
  onSecondaryPress,
  onMoreOptionsPress,
  secondaryLabel,
  secondaryVariant,
  secondaryLoading = false,
  style,
}: ProfileActionButtonsProps) {
  const { theme: appTheme } = useTheme();
  const config = getProfileActionConfig(viewType);
  const additionalOptions = getProfileAdditionalOptions(viewType);
  const showMoreButton = additionalOptions.length > 0;

  // Allow callers to drive the secondary button (Follow/Connect states) dynamically.
  const resolvedSecondaryLabel = secondaryLabel ?? config.secondaryButton.label;
  const resolvedSecondaryVariant = secondaryVariant ?? config.secondaryButton.variant;

  const handleMoreOptions = () => {
    if (onMoreOptionsPress) {
      onMoreOptionsPress();
    } else {
      // Default: show alert with options
      Alert.alert(
        'Options',
        'Select an action',
        [
          ...additionalOptions.map((option) => ({
            text: option,
            onPress: () => {},
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    outlineButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: appTheme.colors.primary,
    },
    filledButton: {
      backgroundColor: appTheme.colors.primary,
    },
    outlineButtonText: {
      color: appTheme.colors.primary,
    },
    filledButtonText: {
      color: appTheme.colors.textInverse,
    },
  };

  return (
    <View style={[styles.container, style]}>
      {/* Primary Button */}
      <TouchableOpacity
        style={[
          styles.button,
          config.primaryButton.variant === 'outline' && dynamicStyles.outlineButton,
          config.primaryButton.variant === 'primary' && dynamicStyles.filledButton,
        ]}
        onPress={onPrimaryPress}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            config.primaryButton.variant === 'outline' && dynamicStyles.outlineButtonText,
            config.primaryButton.variant === 'primary' && dynamicStyles.filledButtonText,
          ]}
        >
          {config.primaryButton.label}
        </Text>
      </TouchableOpacity>

      {/* Secondary Button */}
      <TouchableOpacity
        style={[
          styles.button,
          resolvedSecondaryVariant === 'primary' && dynamicStyles.filledButton,
          resolvedSecondaryVariant === 'outline' && dynamicStyles.outlineButton,
        ]}
        onPress={onSecondaryPress}
        activeOpacity={0.7}
        disabled={secondaryLoading}
      >
        {secondaryLoading ? (
          <ActivityIndicator
            size="small"
            color={resolvedSecondaryVariant === 'primary' ? appTheme.colors.textInverse : appTheme.colors.primary}
          />
        ) : (
          <Text
            style={[
              styles.buttonText,
              resolvedSecondaryVariant === 'primary' && dynamicStyles.filledButtonText,
              resolvedSecondaryVariant === 'outline' && dynamicStyles.outlineButtonText,
            ]}
          >
            {resolvedSecondaryLabel}
          </Text>
        )}
      </TouchableOpacity>

      {/* More Options Button (only for OTHER_* profiles) */}
      {showMoreButton && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={handleMoreOptions}
          activeOpacity={0.7}
        >
          <Icon
            name="ellipsis-vertical"
            size={20}
            color={appTheme.colors.iconMuted}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


