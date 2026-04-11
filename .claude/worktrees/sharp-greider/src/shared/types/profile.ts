/**
 * Profile Types
 * Based on app-logic.json identitySystem.profileViewType
 * 
 * ProfileViewType determines which type of profile view is being displayed.
 * Used to control UI elements, buttons, and available actions.
 */

/**
 * Profile View Type enum
 * Determines which type of profile is being viewed
 */
export enum ProfileViewType {
  SELF_PROFILE = 'self_profile',       // Your own personal user profile
  SELF_BUSINESS = 'self_business',     // Your own business profile
  OTHER_USER = 'other_user',           // Another person's personal profile
  OTHER_BUSINESS = 'other_business',   // Another user's business profile
}

/**
 * Profile action button configuration
 */
export interface ProfileActionButton {
  label: string;
  action: string;
  variant: 'primary' | 'secondary' | 'outline';
  icon?: string;
}

/**
 * Profile action configuration based on view type
 */
export interface ProfileActionConfig {
  primaryButton: ProfileActionButton;
  secondaryButton: ProfileActionButton;
  additionalOptions?: string[];
  canEdit: boolean;
  canOrder?: boolean;
}

/**
 * Profile action configurations for each view type
 * Based on app-logic.json identitySystem.profileViewType
 */
export const PROFILE_ACTION_CONFIGS: Record<ProfileViewType, ProfileActionConfig> = {
  [ProfileViewType.SELF_PROFILE]: {
    primaryButton: {
      label: 'Edit Profile',
      action: 'edit',
      variant: 'outline',
    },
    secondaryButton: {
      label: 'Share Profile',
      action: 'share',
      variant: 'primary',
    },
    canEdit: true,
  },
  [ProfileViewType.SELF_BUSINESS]: {
    primaryButton: {
      label: 'Edit Profile',
      action: 'edit',
      variant: 'outline',
    },
    secondaryButton: {
      label: 'Share Profile',
      action: 'share',
      variant: 'primary',
    },
    canEdit: true,
  },
  [ProfileViewType.OTHER_USER]: {
    primaryButton: {
      label: 'Message',
      action: 'message',
      variant: 'outline',
    },
    secondaryButton: {
      label: 'Connect',
      action: 'connect',
      variant: 'primary',
    },
    additionalOptions: ['Report', 'Share', 'Block'],
    canEdit: false,
  },
  [ProfileViewType.OTHER_BUSINESS]: {
    primaryButton: {
      label: 'Message',
      action: 'message',
      variant: 'outline',
    },
    secondaryButton: {
      label: 'Connect',
      action: 'connect',
      variant: 'primary',
    },
    additionalOptions: ['Report', 'Share', 'Block'],
    canEdit: false,
    canOrder: true, // Only when viewing from Business Mode
  },
};

/**
 * Get profile action config for a given view type
 */
export function getProfileActionConfig(viewType: ProfileViewType): ProfileActionConfig {
  return PROFILE_ACTION_CONFIGS[viewType];
}

/**
 * Check if profile can be edited
 */
export function canEditProfile(viewType: ProfileViewType): boolean {
  return PROFILE_ACTION_CONFIGS[viewType].canEdit;
}

/**
 * Check if profile allows ordering (business profiles only)
 */
export function canOrderFromProfile(viewType: ProfileViewType): boolean {
  return PROFILE_ACTION_CONFIGS[viewType].canOrder ?? false;
}

/**
 * Get additional options for profile (Report, Share, Block)
 */
export function getProfileAdditionalOptions(viewType: ProfileViewType): string[] {
  return PROFILE_ACTION_CONFIGS[viewType].additionalOptions ?? [];
}

/**
 * Type guard to check if viewing own profile
 */
export function isOwnProfile(viewType: ProfileViewType): boolean {
  return viewType === ProfileViewType.SELF_PROFILE || viewType === ProfileViewType.SELF_BUSINESS;
}

/**
 * Type guard to check if viewing other's profile
 */
export function isOtherProfile(viewType: ProfileViewType): boolean {
  return viewType === ProfileViewType.OTHER_USER || viewType === ProfileViewType.OTHER_BUSINESS;
}

/**
 * Type guard to check if viewing a user profile (personal)
 */
export function isUserProfile(viewType: ProfileViewType): boolean {
  return viewType === ProfileViewType.SELF_PROFILE || viewType === ProfileViewType.OTHER_USER;
}

/**
 * Type guard to check if viewing a business profile
 */
export function isBusinessProfile(viewType: ProfileViewType): boolean {
  return viewType === ProfileViewType.SELF_BUSINESS || viewType === ProfileViewType.OTHER_BUSINESS;
}

