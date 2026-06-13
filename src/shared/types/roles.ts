/**
 * Roles & Permissions Types
 * Based on app-logic.json roles and permissionsMatrix
 */

import { StaffRole, StaffRoleType, StaffPermissions } from './business';
import { SubscriptionPlan } from './subscription';
import { theme } from '@/shared/theme';

/**
 * Profile mode - whether user is in personal or business context
 */
export type ProfileMode = 'personal' | 'business';

/**
 * Role capabilities as defined in app-logic.json
 */
export interface RoleCapabilities {
  // Staff management
  can_manage_staff: boolean;
  can_invite_staff: boolean;
  can_remove_staff: boolean;
  can_change_roles: boolean;
  can_accept_staff_requests: boolean;
  
  // Business management
  can_edit_business_settings: boolean;
  can_edit_business_profile: boolean;
  can_delete_business: boolean;
  can_transfer_ownership: boolean;
  can_change_subscription: boolean;
  can_publish_business_page: boolean;
  
  // Operations
  can_view_products: boolean;
  can_edit_products: boolean;
  can_view_stock: boolean;
  can_edit_stock: boolean;
  can_view_orders: boolean;
  can_process_orders: boolean;
  can_create_orders: boolean;
  can_view_deliveries: boolean;
  can_manage_deliveries: boolean;
  can_update_delivery_status: boolean;
  can_view_invoices: boolean;
  can_manage_invoices: boolean;
  can_view_business_inbox: boolean;
}

/**
 * Role capabilities by role type
 */
export const ROLE_CAPABILITIES: Record<StaffRole, RoleCapabilities> = {
  super_admin: {
    can_manage_staff: true,
    can_invite_staff: true,
    can_remove_staff: true,
    can_change_roles: true,
    can_accept_staff_requests: true,
    can_edit_business_settings: true,
    can_edit_business_profile: true,
    can_delete_business: true,
    can_transfer_ownership: true,
    can_change_subscription: true,
    can_publish_business_page: true,
    can_view_products: true,
    can_edit_products: true,
    can_view_stock: true,
    can_edit_stock: true,
    can_view_orders: true,
    can_process_orders: true,
    can_create_orders: true,
    can_view_deliveries: true,
    can_manage_deliveries: true,
    can_update_delivery_status: true,
    can_view_invoices: true,
    can_manage_invoices: true,
    can_view_business_inbox: true,
  },
  admin: {
    can_manage_staff: false, // Limited - can invite/remove but not change roles
    can_invite_staff: true,
    can_remove_staff: true,
    can_change_roles: false,
    can_accept_staff_requests: false,
    can_edit_business_settings: true, // Limited
    can_edit_business_profile: true,
    can_delete_business: false,
    can_transfer_ownership: false,
    can_change_subscription: false,
    can_publish_business_page: true, // Paid plans only
    can_view_products: true,
    can_edit_products: true,
    can_view_stock: true,
    can_edit_stock: true,
    can_view_orders: true,
    can_process_orders: true,
    can_create_orders: true,
    can_view_deliveries: true,
    can_manage_deliveries: true,
    can_update_delivery_status: true,
    can_view_invoices: true, // Paid plans only
    can_manage_invoices: true, // Paid plans only
    can_view_business_inbox: true,
  },
  staff: {
    can_manage_staff: false,
    can_invite_staff: false,
    can_remove_staff: false,
    can_change_roles: false,
    can_accept_staff_requests: false,
    can_edit_business_settings: false,
    can_edit_business_profile: false,
    can_delete_business: false,
    can_transfer_ownership: false,
    can_change_subscription: false,
    can_publish_business_page: false,
    can_view_products: true, // If permitted
    can_edit_products: false, // If permitted
    can_view_stock: false, // If permitted
    can_edit_stock: false, // If permitted
    can_view_orders: false, // If permitted
    can_process_orders: false, // If permitted
    can_create_orders: false,
    can_view_deliveries: true, // Delivery role only - assigned ones
    can_manage_deliveries: false,
    can_update_delivery_status: true, // Delivery role only - assigned ones
    can_view_invoices: false,
    can_manage_invoices: false,
    can_view_business_inbox: false, // If permitted
  },
};

/**
 * Default permissions for staff role types
 */
export const DEFAULT_STAFF_PERMISSIONS: Record<StaffRoleType, Partial<StaffPermissions>> = {
  delivery: {
    can_view_products: false,
    can_edit_products: false,
    can_view_stock: false,
    can_edit_stock: false,
    can_view_orders: true,
    can_process_orders: false,
    can_view_deliveries: true,
    can_manage_deliveries: false,
    can_view_invoices: false,
    can_manage_invoices: false,
    can_view_inbox: false,
  },
  sales: {
    can_view_products: true,
    can_edit_products: false,
    can_view_stock: true,
    can_edit_stock: false,
    can_view_orders: true,
    can_process_orders: true,
    can_view_deliveries: false,
    can_manage_deliveries: false,
    can_view_invoices: false,
    can_manage_invoices: false,
    can_view_inbox: true,
  },
  inventory: {
    can_view_products: true,
    can_edit_products: true,
    can_view_stock: true,
    can_edit_stock: true,
    can_view_orders: false,
    can_process_orders: false,
    can_view_deliveries: false,
    can_manage_deliveries: false,
    can_view_invoices: false,
    can_manage_invoices: false,
    can_view_inbox: false,
  },
  custom: {
    can_view_products: false,
    can_edit_products: false,
    can_view_stock: false,
    can_edit_stock: false,
    can_view_orders: false,
    can_process_orders: false,
    can_view_deliveries: false,
    can_manage_deliveries: false,
    can_view_invoices: false,
    can_manage_invoices: false,
    can_view_inbox: false,
  },
};

/**
 * Staff status colors for UI
 */
export const STAFF_STATUS_COLORS: Record<string, string> = {
  pending: theme.colors.warning,
  accepted: theme.colors.success,
  rejected: theme.colors.error,
  locked: theme.colors.neutral,
};

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

/**
 * Staff role type display names
 */
export const STAFF_ROLE_TYPE_DISPLAY_NAMES: Record<StaffRoleType, string> = {
  delivery: 'Delivery',
  sales: 'Sales',
  inventory: 'Inventory',
  custom: 'Custom',
};






