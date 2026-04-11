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
 * Requires Admin/Super Admin AND plan with publish_business_page feature
 */
export const canPublishBusinessPage = (
  role: StaffRole | null,
  plan: SubscriptionPlan | null
): boolean => {
  const hasRole = role === 'admin' || role === 'super_admin';
  if (!plan) return false;
  return hasRole && PLAN_FEATURES[plan].publish_business_page;
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
 * Requires Admin/Super Admin AND plan with invoice_create_draft (Free+ can view their drafts)
 */
export const canViewInvoices = (
  role: StaffRole | null,
  plan: SubscriptionPlan | null
): boolean => {
  const hasRole = role === 'admin' || role === 'super_admin';
  if (!plan) return false;
  return hasRole && PLAN_FEATURES[plan].invoice_create_draft;
};

/**
 * Check if user can manage invoices (send/export)
 * Requires Admin/Super Admin AND plan with invoice_send capability (Pro+)
 */
export const canManageInvoices = (
  role: StaffRole | null,
  plan: SubscriptionPlan | null
): boolean => {
  const hasRole = role === 'admin' || role === 'super_admin';
  if (!plan) return false;
  return hasRole && PLAN_FEATURES[plan].invoice_send;
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
 * Check if business can receive order requests
 * Free can receive B2B order requests (but cannot create selling orders)
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
 * Check if business can have a public page (profile published)
 * Free plan: no public page
 * Pro+: can publish business page
 * @deprecated Use canPublishOnFeed or canPublishProductsOnFeed for feed-specific checks
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

/**
 * Get maximum products count for plan (unlimited for all plans)
 */
export const getMaxProducts = (plan: SubscriptionPlan | null): number | 'unlimited' => {
  if (!plan) return 'unlimited';
  return PLAN_LIMITS[plan].products;
};

/**
 * Check if product limit is exceeded (always false - unlimited creation)
 */
export const isProductLimitExceeded = (
  plan: SubscriptionPlan | null,
  currentProductCount: number
): boolean => {
  const maxProducts = getMaxProducts(plan);
  if (maxProducts === 'unlimited') return false;
  return currentProductCount >= maxProducts;
};

/**
 * Get maximum listed products count for plan
 */
export const getMaxListedProducts = (plan: SubscriptionPlan | null): number | 'unlimited' => {
  if (!plan) return 10;
  return PLAN_LIMITS[plan].listedProducts;
};

/**
 * Check if listed product limit is exceeded
 */
export const isListedProductLimitExceeded = (
  plan: SubscriptionPlan | null,
  currentListedCount: number
): boolean => {
  const maxListed = getMaxListedProducts(plan);
  if (maxListed === 'unlimited') return false;
  return currentListedCount >= maxListed;
};

/**
 * Check if plan allows business-specific pricing
 */
export const canUseBusinessSpecificPricing = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].business_specific_pricing;
};

/**
 * Check if plan allows advanced permissions
 */
export const canUseAdvancedPermissions = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].advanced_permissions;
};

/**
 * Check if plan allows API access
 */
export const canUseAPI = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].api_access;
};

/**
 * Get analytics type for plan
 */
export const getAnalyticsType = (plan: SubscriptionPlan | null): 'none' | 'basic_7day' | 'full' => {
  if (!plan) return 'none';
  return PLAN_FEATURES[plan].analytics_type;
};

/**
 * Check if NouPro branding should be shown
 */
export const shouldShowNouProBranding = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return true;
  return PLAN_FEATURES[plan].show_noupro_branding;
};

/**
 * Check if plan allows publishing on feed
 */
export const canPublishOnFeed = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].publish_on_feed;
};

/**
 * Check if plan allows publishing products on feed
 */
export const canPublishProductsOnFeed = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].publish_products_on_feed;
};

/**
 * Check if plan allows assigning transport to deliveries
 * Free cannot assign transport/deliverer (Pro+ required)
 */
export const canAssignTransport = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].assign_transport;
};

/**
 * Check if plan allows creating invoice drafts
 * Free+ can create drafts (all plans)
 */
export const canCreateInvoiceDraft = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].invoice_create_draft;
};

/**
 * Check if plan allows sending invoices
 * Free can create drafts but cannot send (Pro+ required)
 */
export const canSendInvoice = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].invoice_send;
};

/**
 * Check if plan allows exporting invoice PDFs
 * Free cannot export PDFs (Pro+ required)
 */
export const canExportInvoicePDF = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].invoice_export_pdf;
};

/**
 * Check if plan allows removing NouPro branding from documents
 * Inverted from show_noupro_branding - true when branding NOT shown
 */
export const canRemoveBranding = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return !PLAN_FEATURES[plan].show_noupro_branding;
};

/**
 * Check if plan allows independent locations
 * Enterprise only
 */
export const canUseIndependentLocations = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].independent_locations;
};

/**
 * Check if plan has analytics access
 * Business+ only (analytics_type !== 'none')
 */
export const hasAnalyticsAccess = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].analytics_access;
};

/**
 * Check if plan has full analytics (real-time + history)
 * Enterprise only
 */
export const hasFullAnalytics = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return PLAN_FEATURES[plan].analytics_full;
};

// ========== Procurement Permission Checks ==========

/**
 * Check if user can view procurement (suppliers, POs, PRs)
 * Admin and Super Admin with paid plan
 */
export const canViewProcurement = (
  role: StaffRole | null,
  staffRoleType?: StaffRoleType
): boolean => {
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if user can manage procurement (create/edit suppliers, POs, PRs)
 * Admin and Super Admin only
 */
export const canManageProcurement = (role: StaffRole | null): boolean => {
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if user can approve purchase requests
 * Admin and Super Admin only
 */
export const canApproveProcurement = (role: StaffRole | null): boolean => {
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if plan allows procurement features
 * Pro+ only
 */
export const canCreateProcurementOrders = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return plan === 'pro' || plan === 'business' || plan === 'enterprise';
};

/**
 * Check if plan allows goods receipt
 * Business+ only
 */
export const canReceiveGoodsReceipts = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return plan === 'business' || plan === 'enterprise';
};

/**
 * Check if plan allows approval workflows
 * Business+ only
 */
export const canUseProcurementApproval = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return plan === 'business' || plan === 'enterprise';
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

// ========== Paywall Trigger System ==========

/**
 * Modal types for paywall triggers
 * Based on app-logic.json paywallTriggers.modalTemplates
 */
export type PaywallModalType = 'feature_gate' | 'limit_reached' | 'enterprise_control' | 'soft_upsell';

/**
 * Paywall trigger configuration
 * Based on app-logic.json paywallTriggers.triggers structure
 */
export interface PaywallTrigger {
  id: string;
  featureKey?: string;
  limitKey?: string;
  action: string;
  requiredPlan: SubscriptionPlan;
  appliesTo: SubscriptionPlan[];
  modalType: PaywallModalType;
  title: string;
  description: string;
  currentLimit?: number;
}

/**
 * Paywall trigger result - enhanced with modal type and trigger info
 */
export interface PaywallCheck {
  allowed: boolean;
  triggerId?: string;
  requiredPlan?: SubscriptionPlan;
  modalType?: PaywallModalType;
  title?: string;
  description?: string;
  currentLimit?: number;
  /** @deprecated Use description instead */
  message?: string;
}

/**
 * All paywall triggers from app-logic.json
 * Single source of truth for paywall behavior
 */
export const PAYWALL_TRIGGERS: PaywallTrigger[] = [
  // Pro Required (Free blocked)
  {
    id: 'create_selling_order',
    featureKey: 'create_selling_orders',
    action: 'orders.create_selling',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    modalType: 'feature_gate',
    title: 'Create selling orders',
    description: 'Create and send selling orders with Pro.',
  },
  {
    id: 'assign_transport',
    featureKey: 'assign_transport',
    action: 'orders.assign_transport',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    modalType: 'feature_gate',
    title: 'Assign transport',
    description: 'Assign drivers or transport details with Pro.',
  },
  {
    id: 'send_invoice',
    featureKey: 'invoice_send',
    action: 'invoices.send',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    modalType: 'feature_gate',
    title: 'Send invoices',
    description: 'Send invoices to clients with Pro.',
  },
  {
    id: 'export_invoice_pdf',
    featureKey: 'invoice_export_pdf',
    action: 'invoices.export_pdf',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    modalType: 'feature_gate',
    title: 'Export invoice PDF',
    description: 'Export and share invoice PDFs with Pro.',
  },
  {
    id: 'remove_branding',
    featureKey: 'remove_branding',
    action: 'documents.remove_branding',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    modalType: 'feature_gate',
    title: 'Remove NouPro branding',
    description: 'Remove NouPro branding from documents with Pro.',
  },
  {
    id: 'publish_business_page',
    featureKey: 'publish_business_page',
    action: 'business.publish_page',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    modalType: 'feature_gate',
    title: 'Publish business page',
    description: 'Make your business page public with Pro.',
  },
  {
    id: 'accept_staff',
    featureKey: 'accept_staff',
    action: 'staff.accept_request',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    modalType: 'feature_gate',
    title: 'Accept staff requests',
    description: 'Accept staff join requests with Pro.',
  },
  // Limit triggers - Free (listed products)
  {
    id: 'listed_limit_reached_free',
    limitKey: 'maxListedProducts',
    action: 'products.list',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    currentLimit: 10,
    modalType: 'limit_reached',
    title: 'Listed product limit reached',
    description: 'Upgrade to Pro to list up to 50 products.',
  },
  {
    id: 'staff_limit_reached_free',
    limitKey: 'maxStaff',
    action: 'staff.invite',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    currentLimit: 1,
    modalType: 'limit_reached',
    title: 'Staff limit reached',
    description: 'Upgrade to Pro to add up to 3 staff members.',
  },
  // Limit triggers - Pro (listed products)
  {
    id: 'listed_limit_reached_pro',
    limitKey: 'maxListedProducts',
    action: 'products.list',
    requiredPlan: 'business',
    appliesTo: ['pro'],
    currentLimit: 50,
    modalType: 'limit_reached',
    title: 'Listed product limit reached',
    description: 'Upgrade to Business to list up to 150 products.',
  },
  {
    id: 'staff_limit_reached_pro',
    limitKey: 'maxStaff',
    action: 'staff.invite',
    requiredPlan: 'business',
    appliesTo: ['pro'],
    currentLimit: 3,
    modalType: 'limit_reached',
    title: 'Staff limit reached',
    description: 'Upgrade to Business to add up to 9 staff members.',
  },
  {
    id: 'location_limit_reached',
    limitKey: 'maxLocations',
    action: 'locations.add',
    requiredPlan: 'business',
    appliesTo: ['free', 'pro'],
    currentLimit: 1,
    modalType: 'limit_reached',
    title: 'Location limit reached',
    description: 'Upgrade to Business to manage up to 7 locations.',
  },
  // Limit triggers - Business (listed products)
  {
    id: 'listed_limit_reached_business',
    limitKey: 'maxListedProducts',
    action: 'products.list',
    requiredPlan: 'enterprise',
    appliesTo: ['business'],
    currentLimit: 150,
    modalType: 'limit_reached',
    title: 'Listed product limit reached',
    description: 'Upgrade to Enterprise for unlimited listed products.',
  },
  {
    id: 'staff_limit_reached_business',
    limitKey: 'maxStaff',
    action: 'staff.invite',
    requiredPlan: 'enterprise',
    appliesTo: ['business'],
    currentLimit: 9,
    modalType: 'limit_reached',
    title: 'Staff limit reached',
    description: 'Upgrade to Enterprise for unlimited staff.',
  },
  {
    id: 'location_limit_reached_business',
    limitKey: 'maxLocations',
    action: 'locations.add',
    requiredPlan: 'enterprise',
    appliesTo: ['business'],
    currentLimit: 7,
    modalType: 'limit_reached',
    title: 'Location limit reached',
    description: 'Upgrade to Enterprise for unlimited locations.',
  },
  // Business Required (Free + Pro blocked)
  {
    id: 'business_specific_pricing',
    featureKey: 'business_specific_pricing',
    action: 'pricing.set_per_client',
    requiredPlan: 'business',
    appliesTo: ['free', 'pro'],
    modalType: 'feature_gate',
    title: 'Business-specific pricing',
    description: 'Set different prices per client with Business.',
  },
  {
    id: 'price_privacy',
    featureKey: 'price_privacy',
    action: 'products.set_privacy',
    requiredPlan: 'business',
    appliesTo: ['free', 'pro'],
    modalType: 'feature_gate',
    title: 'Product & price privacy',
    description: 'Control product and price visibility with Business.',
  },
  {
    id: 'publish_on_feed',
    featureKey: 'publish_on_feed',
    action: 'business.publish_feed',
    requiredPlan: 'business',
    appliesTo: ['free', 'pro'],
    modalType: 'feature_gate',
    title: 'Publish on feed',
    description: 'Publish your business and products on the feed with Business.',
  },
  {
    id: 'publish_products_on_feed',
    featureKey: 'publish_products_on_feed',
    action: 'products.publish_feed',
    requiredPlan: 'business',
    appliesTo: ['free', 'pro'],
    modalType: 'feature_gate',
    title: 'Publish products on feed',
    description: 'Showcase your products on the Explore feed with Business.',
  },
  {
    id: 'analytics_access',
    featureKey: 'analytics_access',
    action: 'analytics.open',
    requiredPlan: 'business',
    appliesTo: ['free', 'pro'],
    modalType: 'feature_gate',
    title: 'Analytics dashboard',
    description: 'Access analytics insights with Business.',
  },
  // Enterprise Required (All blocked)
  {
    id: 'analytics_extended_range',
    featureKey: 'analytics_full',
    action: 'analytics.select_range_extended',
    requiredPlan: 'enterprise',
    appliesTo: ['business'],
    modalType: 'soft_upsell',
    title: 'Full analytics access',
    description: 'Unlock full historical analytics with Enterprise.',
  },
  {
    id: 'independent_locations',
    featureKey: 'independent_locations',
    action: 'locations.enable_independent_mode',
    requiredPlan: 'enterprise',
    appliesTo: ['free', 'pro', 'business'],
    modalType: 'enterprise_control',
    title: 'Independent locations',
    description: 'Manage independent locations with Enterprise.',
  },
  {
    id: 'advanced_permissions',
    featureKey: 'advanced_permissions',
    action: 'permissions.configure_advanced',
    requiredPlan: 'enterprise',
    appliesTo: ['free', 'pro', 'business'],
    modalType: 'enterprise_control',
    title: 'Advanced permissions & roles',
    description: 'Configure granular permissions with Enterprise.',
  },
  {
    id: 'api_access',
    featureKey: 'api_access',
    action: 'integrations.open_api',
    requiredPlan: 'enterprise',
    appliesTo: ['free', 'pro', 'business'],
    modalType: 'enterprise_control',
    title: 'API access',
    description: 'Access NouPro APIs and integrations with Enterprise.',
  },
  {
    id: 'priority_support',
    featureKey: 'priority_support',
    action: 'support.priority',
    requiredPlan: 'enterprise',
    appliesTo: ['free', 'pro', 'business'],
    modalType: 'enterprise_control',
    title: 'Priority support',
    description: 'Get priority support with Enterprise.',
  },

  // Procurement triggers
  {
    id: 'create_procurement',
    featureKey: 'create_procurement',
    action: 'procurement.create',
    requiredPlan: 'pro',
    appliesTo: ['free'],
    modalType: 'feature_gate',
    title: 'Procurement & Suppliers',
    description: 'Manage suppliers and purchase orders with Pro.',
  },
  {
    id: 'approve_procurement',
    featureKey: 'approve_procurement',
    action: 'procurement.approve',
    requiredPlan: 'business',
    appliesTo: ['free', 'pro'],
    modalType: 'feature_gate',
    title: 'Approval workflows',
    description: 'Approve purchase requests and manage workflows with Business.',
  },
  {
    id: 'receive_goods',
    featureKey: 'receive_goods',
    action: 'procurement.receive',
    requiredPlan: 'business',
    appliesTo: ['free', 'pro'],
    modalType: 'feature_gate',
    title: 'Goods receipt',
    description: 'Receive goods and auto-update stock with Business.',
  },
  {
    id: 'supplier_limit_reached_pro',
    limitKey: 'maxSuppliers',
    action: 'suppliers.create',
    requiredPlan: 'business',
    appliesTo: ['pro'],
    currentLimit: 5,
    modalType: 'limit_reached',
    title: 'Supplier limit reached',
    description: 'Upgrade to Business to manage up to 20 suppliers.',
  },
  {
    id: 'supplier_limit_reached_business',
    limitKey: 'maxSuppliers',
    action: 'suppliers.create',
    requiredPlan: 'enterprise',
    appliesTo: ['business'],
    currentLimit: 20,
    modalType: 'limit_reached',
    title: 'Supplier limit reached',
    description: 'Upgrade to Enterprise for unlimited suppliers.',
  },
  {
    id: 'budget_controls',
    featureKey: 'budget_controls',
    action: 'procurement.budget',
    requiredPlan: 'enterprise',
    appliesTo: ['free', 'pro', 'business'],
    modalType: 'enterprise_control',
    title: 'Budget controls',
    description: 'Set spending limits and budget controls with Enterprise.',
  },
];

/**
 * Get a paywall trigger by ID
 */
export const getPaywallTrigger = (triggerId: string): PaywallTrigger | undefined => {
  return PAYWALL_TRIGGERS.find(t => t.id === triggerId);
};

/**
 * Get a paywall trigger by action path
 */
export const getTriggerByAction = (action: string): PaywallTrigger | undefined => {
  return PAYWALL_TRIGGERS.find(t => t.action === action);
};

/**
 * Get the appropriate limit trigger ID based on current plan
 * Returns empty string for enterprise (unlimited) - no limit check needed
 */
export const getLimitTriggerId = (
  limitType: 'products' | 'staff' | 'locations',
  currentPlan: SubscriptionPlan | null
): string => {
  const plan = currentPlan || 'free';
  
  // Enterprise has unlimited - no limit triggers apply
  if (plan === 'enterprise') return '';
  
  if (limitType === 'products') {
    if (plan === 'free') return 'listed_limit_reached_free';
    if (plan === 'pro') return 'listed_limit_reached_pro';
    return 'listed_limit_reached_business';
  }
  
  if (limitType === 'staff') {
    if (plan === 'free') return 'staff_limit_reached_free';
    if (plan === 'pro') return 'staff_limit_reached_pro';
    return 'staff_limit_reached_business';
  }
  
  if (limitType === 'locations') {
    if (plan === 'free' || plan === 'pro') return 'location_limit_reached';
    return 'location_limit_reached_business';
  }
  
  return '';
};

/**
 * Check if action triggers a paywall
 * Uses structured triggers from PAYWALL_TRIGGERS
 * 
 * @param triggerId - The trigger ID to check (e.g., 'send_invoice', 'product_limit_reached_free')
 * @param currentPlan - The user's current subscription plan
 * @param context - Optional context for limit checks (e.g., { currentCount: 21 })
 */
export const checkPaywall = (
  triggerId: string,
  currentPlan: SubscriptionPlan | null,
  context?: { currentCount?: number }
): PaywallCheck => {
  const plan = currentPlan || 'free';
  const trigger = getPaywallTrigger(triggerId);
  
  // If no trigger found, allow the action
  if (!trigger) {
    return { allowed: true };
  }
  
  // Check if this trigger applies to the current plan
  if (!trigger.appliesTo.includes(plan)) {
    return { allowed: true };
  }
  
  // For limit triggers, check if the limit is actually exceeded
  if (trigger.limitKey && context?.currentCount !== undefined) {
    const limit = trigger.currentLimit || 0;
    if (context.currentCount < limit) {
      return { allowed: true };
    }
  }
  
  // Trigger applies - return paywall info
  return {
    allowed: false,
    triggerId: trigger.id,
    requiredPlan: trigger.requiredPlan,
    modalType: trigger.modalType,
    title: trigger.title,
    description: trigger.description,
    currentLimit: trigger.currentLimit,
    message: trigger.description, // Backwards compatibility
  };
};

/**
 * Legacy check - maps old action strings to new trigger IDs
 * @deprecated Use checkPaywall with trigger IDs directly
 */
export const checkPaywallLegacy = (
  action: string,
  currentPlan: SubscriptionPlan | null
): PaywallCheck => {
  // Map old action strings to new trigger IDs
  const actionToTriggerMap: Record<string, string> = {
    'accept_staff': 'accept_staff',
    'publish_business': 'publish_business_page',
    'publish_product': 'publish_business_page',
    'create_invoice': 'send_invoice',
    'create_delivery': 'create_selling_order',
    'business_specific_pricing': 'business_specific_pricing',
    'advanced_permissions': 'advanced_permissions',
    'api_access': 'api_access',
    'publish_on_feed': 'publish_on_feed',
    'publish_products_on_feed': 'publish_products_on_feed',
  };
  
  const triggerId = actionToTriggerMap[action];
  if (!triggerId) {
    return { allowed: true };
  }
  
  return checkPaywall(triggerId, currentPlan);
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






