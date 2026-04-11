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
  style,
}: ProfileActionButtonsProps) {
  const { theme: appTheme } = useTheme();
  const config = getProfileActionConfig(viewType);
  const additionalOptions = getProfileAdditionalOptions(viewType);
  const showMoreButton = additionalOptions.length > 0;

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
          config.secondaryButton.variant === 'primary' && dynamicStyles.filledButton,
          config.secondaryButton.variant === 'outline' && dynamicStyles.outlineButton,
        ]}
        onPress={onSecondaryPress}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            config.secondaryButton.variant === 'primary' && dynamicStyles.filledButtonText,
            config.secondaryButton.variant === 'outline' && dynamicStyles.outlineButtonText,
          ]}
        >
          {config.secondaryButton.label}
        </Text>
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


