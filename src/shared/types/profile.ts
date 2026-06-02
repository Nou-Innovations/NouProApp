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
 * The relationship action available on another account's profile.
 * - 'connect' — mutual, request/accept (person↔person, business↔business)
 * - 'follow'  — one-way, instant (person → business)
 * - 'none'    — no relationship button (e.g. a business viewing a person)
 */
export type RelationshipAction = 'connect' | 'follow' | 'none';

/**
 * Decide whether another profile shows Follow, Connect, or no relationship button.
 *
 * Rule (see docs/PROFILES.md):
 *   - A person (personal mode) → another person  = Connect
 *   - A person (personal mode) → a business      = Follow
 *   - A business (business mode) → another business = Connect
 *   - A business (business mode) → a person      = none
 *
 * @param activeMode  the viewer's current mode ('personal' | 'business')
 * @param targetType  the type of profile being viewed ('user' | 'business')
 */
export function getRelationshipAction(
  activeMode: 'personal' | 'business',
  targetType: 'user' | 'business',
): RelationshipAction {
  if (activeMode === 'business') {
    return targetType === 'business' ? 'connect' : 'none';
  }
  // personal mode
  return targetType === 'business' ? 'follow' : 'connect';
}

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

// ========== Professional Profile Types ==========

/**
 * Work Experience entry on a user's professional profile
 */
export interface WorkExperience {
  id: string;
  userId: string;
  companyName: string;
  companyLogo?: string;
  position: string;
  description?: string;
  industry?: string;
  location?: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date, null = current
  isCurrent: boolean;
  linkedBusinessId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkExperienceDTO {
  companyName: string;
  companyLogo?: string;
  position: string;
  description?: string;
  industry?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  linkedBusinessId?: string;
}

export interface UpdateWorkExperienceDTO extends Partial<CreateWorkExperienceDTO> {}

/**
 * Education entry on a user's professional profile
 */
export interface Education {
  id: string;
  userId: string;
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEducationDTO {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

export interface UpdateEducationDTO extends Partial<CreateEducationDTO> {}

/**
 * Certification on a user's professional profile
 */
export interface Certification {
  id: string;
  userId: string;
  name: string;
  issuingOrganization: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCertificationDTO {
  name: string;
  issuingOrganization: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface UpdateCertificationDTO extends Partial<CreateCertificationDTO> {}

/**
 * Skill from the shared master table
 */
export interface Skill {
  id: string;
  name: string;
  category?: string;
  createdAt: string;
}

/**
 * Junction between user and skill with display ordering
 */
export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  displayOrder: number;
  createdAt: string;
  skill: Skill; // Included via Prisma include
}

/**
 * Profile completeness breakdown
 */
export interface ProfileCompleteness {
  percentage: number;
  completed: string[];
  missing: string[];
}

/**
 * Full professional profile (user + all sections)
 * Returned by the public profile endpoint
 */
export interface ProfessionalProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  headline?: string;
  bio?: string;
  industry?: string;
  cover_photo?: string;
  profile_slug?: string;
  job_title?: string;
  connections_count?: number;
  workExperiences: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  userSkills: UserSkill[];
  created_at: string;
}

