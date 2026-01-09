/**
 * Permissions Utility
 * Role-based and plan-based permission checks
 * Based on app-logic.json permissionsMatrix and paywallTriggers
 */

import { StaffRole, StaffPermissions, StaffRoleType } from '@/shared/types/business';
import { SubscriptionPlan, PLAN_FEATURES, PLAN_LIMITS, PlanLimits } from '@/shared/types/subscription';
import { ProfileMode, ROLE_CAPABILITIES, DEFAULT_STAFF_PERMISSIONS } from '@/shared/types/roles';

// ========== Role-Based Permission Checks ==========

/**
 * Check if user can manage staff (invite, promote, remove)
 * Only Super Admin can manage staff
 */
export const canManageStaff = (role: StaffRole | null): boolean => {
  return role === 'super_admin';
};

/**
 * Check if user can invite staff
 * Admin and Super Admin can invite
 */
export const canInviteStaff = (role: StaffRole | null): boolean => {
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if user can remove staff
 * Admin and Super Admin can remove
 */
export const canRemoveStaff = (role: StaffRole | null): boolean => {
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if user can change staff roles
 * Only Super Admin can change roles
 */
export const canChangeStaffRoles = (role: StaffRole | null): boolean => {
  return role === 'super_admin';
};

/**
 * Check if user can accept/reject staff join requests
 * Only Super Admin can accept/reject
 */
export const canAcceptStaffRequests = (role: StaffRole | null): boolean => {
  return role === 'super_admin';
};

/**
 * Check if user can edit business settings
 * Admin has limited access, Super Admin has full access
 */
export const canEditBusinessSettings = (role: StaffRole | null): boolean => {
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if user can edit business profile
 */
export const canEditBusinessProfile = (role: StaffRole | null): boolean => {
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if user can delete business
 * Only Super Admin can delete
 */
export const canDeleteBusiness = (role: StaffRole | null): boolean => {
  return role === 'super_admin';
};

/**
 * Check if user can transfer business ownership
 * Only Super Admin can transfer
 */
export const canTransferOwnership = (role: StaffRole | null): boolean => {
  return role === 'super_admin';
};

/**
 * Check if user can change subscription plan
 * Only Super Admin can change
 */
export const canChangeSubscription = (role: StaffRole | null): boolean => {
  return role === 'super_admin';
};

/**
 * Check if user can publish business page
 * Requires Admin/Super Admin AND paid plan
 */
export const canPublishBusinessPage = (
  role: StaffRole | null,
  plan: SubscriptionPlan | null
): boolean => {
  const hasRole = role === 'admin' || role === 'super_admin';
  const hasPlan = plan && plan !== 'free';
  return hasRole && !!hasPlan;
};

/**
 * Check if user can view products
 */
export const canViewProducts = (
  role: StaffRole | null,
  customPermissions?: StaffPermissions
): boolean => {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'staff' && customPermissions?.can_view_products) return true;
  return false;
};

/**
 * Check if user can edit products
 */
export const canEditProducts = (
  role: StaffRole | null,
  customPermissions?: StaffPermissions
): boolean => {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'staff' && customPermissions?.can_edit_products) return true;
  return false;
};

/**
 * Check if user can view stock
 */
export const canViewStock = (
  role: StaffRole | null,
  customPermissions?: StaffPermissions
): boolean => {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'staff' && customPermissions?.can_view_stock) return true;
  return false;
};

/**
 * Check if user can edit stock
 */
export const canEditStock = (
  role: StaffRole | null,
  customPermissions?: StaffPermissions
): boolean => {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'staff' && customPermissions?.can_edit_stock) return true;
  return false;
};

/**
 * Check if user can view orders
 */
export const canViewOrders = (
  role: StaffRole | null,
  customPermissions?: StaffPermissions
): boolean => {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'staff' && customPermissions?.can_view_orders) return true;
  return false;
};

/**
 * Check if user can process orders
 */
export const canProcessOrders = (
  role: StaffRole | null,
  customPermissions?: StaffPermissions
): boolean => {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'staff' && customPermissions?.can_process_orders) return true;
  return false;
};

/**
 * Check if user can view deliveries
 * Staff with delivery role can view their assigned deliveries
 */
export const canViewDeliveries = (
  role: StaffRole | null,
  staffRoleType?: StaffRoleType,
  customPermissions?: StaffPermissions
): boolean => {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'staff') {
    if (staffRoleType === 'delivery') return true;
    if (customPermissions?.can_view_deliveries) return true;
  }
  return false;
};

/**
 * Check if user can manage deliveries (assign, create)
 */
export const canManageDeliveries = (role: StaffRole | null): boolean => {
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if user can update delivery status
 * Staff with delivery role can update their assigned deliveries
 */
export const canUpdateDeliveryStatus = (
  role: StaffRole | null,
  staffRoleType?: StaffRoleType
): boolean => {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'staff' && staffRoleType === 'delivery') return true;
  return false;
};

/**
 * Check if user can view invoices
 * Requires Admin/Super Admin AND paid plan
 */
export const canViewInvoices = (
  role: StaffRole | null,
  plan: SubscriptionPlan | null
): boolean => {
  const hasRole = role === 'admin' || role === 'super_admin';
  const hasPlan = plan && plan !== 'free';
  return hasRole && !!hasPlan;
};

/**
 * Check if user can manage invoices
 * Requires Admin/Super Admin AND paid plan
 */
export const canManageInvoices = (
  role: StaffRole | null,
  plan: SubscriptionPlan | null
): boolean => {
  const hasRole = role === 'admin' || role === 'super_admin';
  const hasPlan = plan && plan !== 'free';
  return hasRole && !!hasPlan;
};

/**
 * Check if user can view business inbox
 */
export const canViewBusinessInbox = (
  role: StaffRole | null,
  customPermissions?: StaffPermissions
): boolean => {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'staff' && customPermissions?.can_view_inbox) return true;
  return false;
};

// ========== Plan-Based Permission Checks ==========

/**
 * Check if business can receive orders
 * Only paid plans can receive orders
 */
export const canReceiveOrders = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].receive_orders;
};

/**
 * Check if business can create selling orders
 * Only paid plans can create selling orders
 */
export const canCreateSellingOrders = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].create_selling_orders;
};

/**
 * Check if business can create deliveries
 * Only paid plans can create deliveries
 */
export const canCreateDeliveries = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].create_deliveries;
};

/**
 * Check if business can accept staff
 * Only paid plans can accept staff join requests
 */
export const canAcceptStaff = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].accept_staff;
};

/**
 * Check if business can generate invoices
 * Only paid plans can generate invoices
 */
export const canGenerateInvoices = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].generate_invoices;
};

/**
 * Check if business can publish products
 * Free plan: products are private only
 * Paid plans: can publish products
 */
export const canPublishProducts = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].publish_business_page;
};

/**
 * Check if business has price privacy
 */
export const hasPricePrivacy = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].price_privacy;
};

/**
 * Check if business has analytics access
 */
export const hasAnalytics = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].analytics;
};

/**
 * Get maximum staff count for plan
 */
export const getMaxStaffCount = (plan: SubscriptionPlan | null): number | 'unlimited' => {
  if (!plan) return 1;
  return PLAN_LIMITS[plan].staff;
};

/**
 * Get maximum locations count for plan
 */
export const getMaxLocations = (plan: SubscriptionPlan | null): number | 'unlimited' => {
  if (!plan) return 1;
  return PLAN_LIMITS[plan].locations;
};

/**
 * Check if staff limit is exceeded
 */
export const isStaffLimitExceeded = (
  plan: SubscriptionPlan | null,
  currentStaffCount: number
): boolean => {
  const maxStaff = getMaxStaffCount(plan);
  if (maxStaff === 'unlimited') return false;
  return currentStaffCount >= maxStaff;
};

/**
 * Check if location limit is exceeded
 */
export const isLocationLimitExceeded = (
  plan: SubscriptionPlan | null,
  currentLocationCount: number
): boolean => {
  const maxLocations = getMaxLocations(plan);
  if (maxLocations === 'unlimited') return false;
  return currentLocationCount >= maxLocations;
};

// ========== Tab Visibility Checks ==========

/**
 * Check which business tabs should be visible based on role and plan
 */
export interface TabVisibility {
  inbox: boolean;
  deliveries: boolean;
  products: boolean;
  invoices: boolean;
  business: boolean;
}

export const getBusinessTabVisibility = (
  role: StaffRole | null,
  plan: SubscriptionPlan | null,
  staffRoleType?: StaffRoleType,
  customPermissions?: StaffPermissions
): TabVisibility => {
  return {
    inbox: canViewBusinessInbox(role, customPermissions),
    deliveries: canViewDeliveries(role, staffRoleType, customPermissions),
    products: canViewProducts(role, customPermissions),
    invoices: canViewInvoices(role, plan),
    business: role === 'admin' || role === 'super_admin',
  };
};

// ========== Paywall Trigger Checks ==========

/**
 * Paywall trigger result
 */
export interface PaywallCheck {
  allowed: boolean;
  requiredPlan?: SubscriptionPlan;
  message?: string;
}

/**
 * Check if action triggers a paywall
 */
export const checkPaywall = (
  action: string,
  currentPlan: SubscriptionPlan | null
): PaywallCheck => {
  const plan = currentPlan || 'free';

  switch (action) {
    case 'accept_staff':
      if (!PLAN_FEATURES[plan].accept_staff) {
        return {
          allowed: false,
          requiredPlan: 'pro',
          message: 'Upgrade to Pro to accept staff join requests',
        };
      }
      break;

    case 'publish_business':
      if (!PLAN_FEATURES[plan].publish_business_page) {
        return {
          allowed: false,
          requiredPlan: 'pro',
          message: 'Upgrade to Pro to publish your business page',
        };
      }
      break;

    case 'publish_product':
      if (!PLAN_FEATURES[plan].publish_business_page) {
        return {
          allowed: false,
          requiredPlan: 'pro',
          message: 'Upgrade to Pro to publish products publicly',
        };
      }
      break;

    case 'receive_orders':
      if (!PLAN_FEATURES[plan].receive_orders) {
        return {
          allowed: false,
          requiredPlan: 'pro',
          message: 'Upgrade to Pro to receive orders from other businesses',
        };
      }
      break;

    case 'create_invoice':
      if (!PLAN_FEATURES[plan].generate_invoices) {
        return {
          allowed: false,
          requiredPlan: 'pro',
          message: 'Upgrade to Pro to create invoices and estimates',
        };
      }
      break;

    case 'create_delivery':
      if (!PLAN_FEATURES[plan].create_deliveries) {
        return {
          allowed: false,
          requiredPlan: 'pro',
          message: 'Upgrade to Pro to create and manage deliveries',
        };
      }
      break;
  }

  return { allowed: true };
};

// ========== Utility Functions ==========

/**
 * Get default permissions for a staff role type
 */
export const getDefaultStaffPermissions = (roleType: StaffRoleType): StaffPermissions => {
  const defaults = DEFAULT_STAFF_PERMISSIONS[roleType];
  return {
    can_view_products: defaults.can_view_products ?? false,
    can_edit_products: defaults.can_edit_products ?? false,
    can_view_stock: defaults.can_view_stock ?? false,
    can_edit_stock: defaults.can_edit_stock ?? false,
    can_view_orders: defaults.can_view_orders ?? false,
    can_process_orders: defaults.can_process_orders ?? false,
    can_view_deliveries: defaults.can_view_deliveries ?? false,
    can_manage_deliveries: defaults.can_manage_deliveries ?? false,
    can_view_invoices: defaults.can_view_invoices ?? false,
    can_manage_invoices: defaults.can_manage_invoices ?? false,
    can_view_inbox: defaults.can_view_inbox ?? false,
  };
};

/**
 * Check if user has any business access
 */
export const hasBusinessAccess = (
  mode: ProfileMode,
  role: StaffRole | null
): boolean => {
  return mode === 'business' && role !== null;
};

/**
 * Get minimum plan required for a feature
 */
export const getMinimumPlanForFeature = (feature: keyof typeof PLAN_FEATURES.free): SubscriptionPlan => {
  const plans: SubscriptionPlan[] = ['free', 'pro', 'business', 'enterprise'];
  
  for (const plan of plans) {
    if (PLAN_FEATURES[plan][feature]) {
      return plan;
    }
  }
  
  return 'enterprise';
};






