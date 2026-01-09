/**
 * usePermissions Hook
 * Centralizes all permission checks for components
 * Based on app-logic.json permissionsMatrix and roles
 */

import { useMemo } from 'react';
import { useProfileStore } from '@/shared/store/profileStore';
import {
  canManageStaff,
  canInviteStaff,
  canRemoveStaff,
  canChangeStaffRoles,
  canAcceptStaffRequests,
  canEditBusinessSettings,
  canEditBusinessProfile,
  canDeleteBusiness,
  canTransferOwnership,
  canChangeSubscription,
  canPublishBusinessPage,
  canViewProducts,
  canEditProducts,
  canViewStock,
  canEditStock,
  canViewOrders,
  canProcessOrders,
  canViewDeliveries,
  canManageDeliveries,
  canUpdateDeliveryStatus,
  canViewInvoices,
  canManageInvoices,
  canViewBusinessInbox,
  canReceiveOrders,
  canCreateSellingOrders,
  canCreateDeliveries,
  canAcceptStaff,
  canGenerateInvoices,
  canPublishProducts,
  hasPricePrivacy,
  hasAnalytics,
  getMaxStaffCount,
  getMaxLocations,
  isStaffLimitExceeded,
  isLocationLimitExceeded,
  getBusinessTabVisibility,
  checkPaywall,
  TabVisibility,
  PaywallCheck,
} from '@/shared/utils/permissions';
import { SubscriptionPlan } from '@/shared/types/subscription';

/**
 * Permissions interface returned by the hook
 */
export interface Permissions {
  // Staff management
  canManageStaff: boolean;
  canInviteStaff: boolean;
  canRemoveStaff: boolean;
  canChangeStaffRoles: boolean;
  canAcceptStaffRequests: boolean;
  
  // Business management
  canEditBusinessSettings: boolean;
  canEditBusinessProfile: boolean;
  canDeleteBusiness: boolean;
  canTransferOwnership: boolean;
  canChangeSubscription: boolean;
  canPublishBusinessPage: boolean;
  
  // Operations
  canViewProducts: boolean;
  canEditProducts: boolean;
  canViewStock: boolean;
  canEditStock: boolean;
  canViewOrders: boolean;
  canProcessOrders: boolean;
  canViewDeliveries: boolean;
  canManageDeliveries: boolean;
  canUpdateDeliveryStatus: boolean;
  canViewInvoices: boolean;
  canManageInvoices: boolean;
  canViewBusinessInbox: boolean;
  
  // Plan-based
  canReceiveOrders: boolean;
  canCreateSellingOrders: boolean;
  canCreateDeliveries: boolean;
  canAcceptStaff: boolean;
  canGenerateInvoices: boolean;
  canPublishProducts: boolean;
  hasPricePrivacy: boolean;
  hasAnalytics: boolean;
  
  // Limits
  maxStaffCount: number | 'unlimited';
  maxLocations: number | 'unlimited';
  isStaffLimitExceeded: (currentCount: number) => boolean;
  isLocationLimitExceeded: (currentCount: number) => boolean;
  
  // Tab visibility
  tabVisibility: TabVisibility;
  
  // Paywall checker
  checkPaywall: (action: string) => PaywallCheck;
  
  // Role info
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isBusinessMode: boolean;
  isPersonalMode: boolean;
  currentPlan: SubscriptionPlan | null;
}

/**
 * Hook to get all permissions for the current user context
 * 
 * Usage:
 * ```tsx
 * const { canEditProducts, canPublishProducts, checkPaywall } = usePermissions();
 * 
 * if (!canEditProducts) {
 *   return <AccessDenied />;
 * }
 * 
 * const paywallResult = checkPaywall('publish_product');
 * if (!paywallResult.allowed) {
 *   showPaywall(paywallResult.requiredPlan);
 * }
 * ```
 */
export function usePermissions(): Permissions {
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const currentStaffRoleType = useProfileStore((state) => state.currentStaffRoleType);
  const currentStaffEntry = useProfileStore((state) => state.currentStaffEntry);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const activeMode = useProfileStore((state) => state.activeMode);
  
  const plan = activeBusiness?.plan || null;
  const customPermissions = currentStaffEntry?.permissions;
  
  return useMemo(() => ({
    // Staff management
    canManageStaff: canManageStaff(currentUserRole),
    canInviteStaff: canInviteStaff(currentUserRole),
    canRemoveStaff: canRemoveStaff(currentUserRole),
    canChangeStaffRoles: canChangeStaffRoles(currentUserRole),
    canAcceptStaffRequests: canAcceptStaffRequests(currentUserRole),
    
    // Business management
    canEditBusinessSettings: canEditBusinessSettings(currentUserRole),
    canEditBusinessProfile: canEditBusinessProfile(currentUserRole),
    canDeleteBusiness: canDeleteBusiness(currentUserRole),
    canTransferOwnership: canTransferOwnership(currentUserRole),
    canChangeSubscription: canChangeSubscription(currentUserRole),
    canPublishBusinessPage: canPublishBusinessPage(currentUserRole, plan),
    
    // Operations
    canViewProducts: canViewProducts(currentUserRole, customPermissions),
    canEditProducts: canEditProducts(currentUserRole, customPermissions),
    canViewStock: canViewStock(currentUserRole, customPermissions),
    canEditStock: canEditStock(currentUserRole, customPermissions),
    canViewOrders: canViewOrders(currentUserRole, customPermissions),
    canProcessOrders: canProcessOrders(currentUserRole, customPermissions),
    canViewDeliveries: canViewDeliveries(currentUserRole, currentStaffRoleType ?? undefined, customPermissions),
    canManageDeliveries: canManageDeliveries(currentUserRole),
    canUpdateDeliveryStatus: canUpdateDeliveryStatus(currentUserRole, currentStaffRoleType ?? undefined),
    canViewInvoices: canViewInvoices(currentUserRole, plan),
    canManageInvoices: canManageInvoices(currentUserRole, plan),
    canViewBusinessInbox: canViewBusinessInbox(currentUserRole, customPermissions),
    
    // Plan-based
    canReceiveOrders: canReceiveOrders(plan),
    canCreateSellingOrders: canCreateSellingOrders(plan),
    canCreateDeliveries: canCreateDeliveries(plan),
    canAcceptStaff: canAcceptStaff(plan),
    canGenerateInvoices: canGenerateInvoices(plan),
    canPublishProducts: canPublishProducts(plan),
    hasPricePrivacy: hasPricePrivacy(plan),
    hasAnalytics: hasAnalytics(plan),
    
    // Limits
    maxStaffCount: getMaxStaffCount(plan),
    maxLocations: getMaxLocations(plan),
    isStaffLimitExceeded: (currentCount: number) => isStaffLimitExceeded(plan, currentCount),
    isLocationLimitExceeded: (currentCount: number) => isLocationLimitExceeded(plan, currentCount),
    
    // Tab visibility
    tabVisibility: getBusinessTabVisibility(currentUserRole, plan, currentStaffRoleType ?? undefined, customPermissions),
    
    // Paywall checker
    checkPaywall: (action: string) => checkPaywall(action, plan),
    
    // Role info
    isSuperAdmin: currentUserRole === 'super_admin',
    isAdmin: currentUserRole === 'admin' || currentUserRole === 'super_admin',
    isStaff: currentUserRole === 'staff',
    isBusinessMode: activeMode === 'business',
    isPersonalMode: activeMode === 'personal',
    currentPlan: plan,
  }), [currentUserRole, currentStaffRoleType, currentStaffEntry, activeBusiness, activeMode, plan, customPermissions]);
}

export default usePermissions;

