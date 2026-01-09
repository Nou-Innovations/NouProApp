/**
 * useProfileViewType Hook
 * Determines the ProfileViewType based on context
 * 
 * Based on app-logic.json identitySystem.profileViewType
 */

import { useMemo } from 'react';
import { useProfileStore } from '@/shared/store/profileStore';
import { ProfileViewType } from '@/shared/types/profile';

interface UseProfileViewTypeParams {
  /**
   * The ID of the profile being viewed (user ID or business ID)
   */
  profileId?: string;
  
  /**
   * The type of profile being viewed
   */
  profileType: 'user' | 'business';
}

interface UseProfileViewTypeResult {
  /**
   * The determined profile view type
   */
  viewType: ProfileViewType;
  
  /**
   * Whether viewing own profile
   */
  isOwnProfile: boolean;
  
  /**
   * Whether the profile can be edited
   */
  canEdit: boolean;
  
  /**
   * Whether ordering is available (business profiles only, when in business mode)
   */
  canOrder: boolean;
  
  /**
   * Whether to show additional options (Report, Share, Block)
   */
  showAdditionalOptions: boolean;
}

/**
 * Hook to determine the profile view type and available actions
 * 
 * @example
 * // Viewing own personal profile
 * const { viewType, canEdit } = useProfileViewType({ profileType: 'user' });
 * // viewType = ProfileViewType.SELF_PROFILE, canEdit = true
 * 
 * @example
 * // Viewing another user's profile
 * const { viewType, canEdit } = useProfileViewType({ profileId: 'other-user-id', profileType: 'user' });
 * // viewType = ProfileViewType.OTHER_USER, canEdit = false
 * 
 * @example
 * // Viewing own business profile
 * const { viewType, canEdit } = useProfileViewType({ profileType: 'business' });
 * // viewType = ProfileViewType.SELF_BUSINESS, canEdit = true
 * 
 * @example
 * // Viewing another business profile
 * const { viewType, canOrder } = useProfileViewType({ profileId: 'other-business-id', profileType: 'business' });
 * // viewType = ProfileViewType.OTHER_BUSINESS, canOrder = true (if in business mode)
 */
export function useProfileViewType({ 
  profileId, 
  profileType 
}: UseProfileViewTypeParams): UseProfileViewTypeResult {
  const currentUser = useProfileStore((state) => state.currentUser);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const activeMode = useProfileStore((state) => state.activeMode);

  return useMemo(() => {
    // Determine if viewing own profile
    let isOwnProfile = false;
    
    if (profileType === 'user') {
      // For user profiles, check if profileId matches current user
      // If no profileId provided, assume viewing own profile
      isOwnProfile = !profileId || profileId === currentUser?.id;
    } else {
      // For business profiles, check if profileId matches active business
      // If no profileId provided, assume viewing own business
      isOwnProfile = !profileId || profileId === activeBusiness?.id;
    }

    // Determine view type
    let viewType: ProfileViewType;
    if (profileType === 'user') {
      viewType = isOwnProfile ? ProfileViewType.SELF_PROFILE : ProfileViewType.OTHER_USER;
    } else {
      viewType = isOwnProfile ? ProfileViewType.SELF_BUSINESS : ProfileViewType.OTHER_BUSINESS;
    }

    // Determine capabilities
    const canEdit = isOwnProfile;
    
    // Can order from other business profiles when in business mode
    const canOrder = !isOwnProfile && 
      profileType === 'business' && 
      activeMode === 'business';
    
    // Show additional options (Report, Share, Block) when viewing others
    const showAdditionalOptions = !isOwnProfile;

    return {
      viewType,
      isOwnProfile,
      canEdit,
      canOrder,
      showAdditionalOptions,
    };
  }, [profileId, profileType, currentUser?.id, activeBusiness?.id, activeMode]);
}

/**
 * Simpler hook for when you already know the view type
 */
export function useProfileActions(viewType: ProfileViewType) {
  const activeMode = useProfileStore((state) => state.activeMode);
  
  return useMemo(() => {
    const isOwn = viewType === ProfileViewType.SELF_PROFILE || 
                  viewType === ProfileViewType.SELF_BUSINESS;
    
    const isBusiness = viewType === ProfileViewType.SELF_BUSINESS || 
                       viewType === ProfileViewType.OTHER_BUSINESS;
    
    return {
      canEdit: isOwn,
      canOrder: !isOwn && isBusiness && activeMode === 'business',
      showAdditionalOptions: !isOwn,
      primaryAction: isOwn ? 'edit' : 'message',
      secondaryAction: isOwn ? 'share' : 'connect',
    };
  }, [viewType, activeMode]);
}

export default useProfileViewType;

