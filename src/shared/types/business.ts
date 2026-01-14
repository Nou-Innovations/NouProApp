/**
 * Business Types - Business Profile
 * Based on app-logic.json dataModels.business and dataModels.businessStaff
 * 
 * Business Profile is a professional entity. Shows products that can be ordered by others.
 * Types: Distributor, Retailer/Shop, Factory/Production, Service Provider, etc.
 */

import { SubscriptionPlan, SubscriptionStatus } from './subscription';

/**
 * Industry types for businesses
 */
export type BusinessIndustry = 
  | 'food_beverage'
  | 'general_retail'
  | 'production'
  | 'services'
  | 'cosmetics'
  | 'electronics'
  | 'other';

/**
 * Business - Professional entity profile
 * Based on app-logic.json dataModels.business
 */
export interface Business {
  id: string; // UUID
  owner_id: string; // FK to User - primary owner / super admin
  name: string;
  industry?: BusinessIndustry;
  description?: string;
  logo_url?: string;
  banner_url?: string; // Public profile banner
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  plan: SubscriptionPlan;
  is_published: boolean; // Public page visible or not
  subscription_status: SubscriptionStatus;
  next_billing_date?: string; // ISO date
  connections_count?: number; // Number of business connections
  created_at: string; // ISO timestamp
  updated_at?: string;
}

/**
 * Staff roles within a business
 * Three-tier role system as defined in app-logic.json
 */
export type StaffRole = 'staff' | 'admin' | 'super_admin';

/**
 * Staff status for join requests
 */
export type StaffStatus = 'pending' | 'accepted' | 'rejected' | 'locked';

/**
 * Staff role types for specific permissions
 */
export type StaffRoleType = 'delivery' | 'sales' | 'inventory' | 'custom';

/**
 * BusinessStaff - Links users to businesses with roles
 * Based on app-logic.json dataModels.businessStaff
 */
export interface BusinessStaff {
  id: string; // UUID
  business_id: string; // FK to Business
  user_id: string; // FK to User
  role: StaffRole;
  role_type?: StaffRoleType; // For staff role - what type of staff
  status: StaffStatus;
  permissions?: StaffPermissions; // Custom permissions for this staff member
  created_at: string; // ISO timestamp
  updated_at?: string;
}

/**
 * Staff-specific permissions
 * Used for granular access control
 */
export interface StaffPermissions {
  can_view_products: boolean;
  can_edit_products: boolean;
  can_view_stock: boolean;
  can_edit_stock: boolean;
  can_view_orders: boolean;
  can_process_orders: boolean;
  can_view_deliveries: boolean;
  can_manage_deliveries: boolean;
  can_view_invoices: boolean;
  can_manage_invoices: boolean;
  can_view_inbox: boolean;
}

/**
 * Business creation payload
 */
export interface CreateBusinessPayload {
  name: string;
  industry?: BusinessIndustry;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  phone?: string;
  email?: string;
  address?: string;
}

/**
 * Business update payload
 */
export interface UpdateBusinessPayload {
  name?: string;
  industry?: BusinessIndustry;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  is_published?: boolean;
}

/**
 * Business as viewed publicly
 */
export interface PublicBusinessProfile {
  id: string;
  name: string;
  industry?: BusinessIndustry;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
}

/**
 * Business location for multi-location businesses
 */
export interface BusinessLocation {
  id: string;
  business_id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  is_primary: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Business with staff count and other computed fields
 * Used for business list displays
 */
export interface BusinessListItem extends Business {
  staff_count: number;
  products_count: number;
  locations_count: number;
}

/**
 * User's businesses - businesses they own or have access to
 * Includes experience dates for profile display (like LinkedIn)
 */
export interface UserBusiness {
  business: Business;
  staff_entry: BusinessStaff;
  role: StaffRole;
  // Experience dates for profile display
  start_date?: string; // ISO date - when user started at this business
  end_date?: string; // ISO date - when user left (null/undefined = Present)
}






