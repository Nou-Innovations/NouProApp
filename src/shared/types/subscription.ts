/**
 * Subscription Types
 * Based on app-logic.json subscriptionPlans
 */

/**
 * Subscription plan types
 */
export type SubscriptionPlan = 'free' | 'pro' | 'business' | 'enterprise';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'grace' | 'expired';

/**
 * Subscription status colors
 */
export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: '#22C55E',
  grace: '#F59E0B',
  expired: '#EF4444',
};

/**
 * Plan pricing (in MUR - Mauritian Rupee)
 */
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 799,
  business: 1999,
  enterprise: 3999,
};

/**
 * Plan limits
 */
export interface PlanLimits {
  staff: number | 'unlimited';
  locations: number | 'unlimited';
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: { staff: 1, locations: 1 },
  pro: { staff: 3, locations: 3 },
  business: { staff: 9, locations: 8 },
  enterprise: { staff: 'unlimited', locations: 'unlimited' },
};

/**
 * Plan features
 */
export interface PlanFeatures {
  create_business: boolean;
  create_products: boolean;
  manage_stock: boolean;
  use_inbox: boolean;
  receive_orders: boolean;
  create_selling_orders: boolean;
  generate_invoices: boolean;
  publish_business_page: boolean;
  create_deliveries: boolean;
  accept_staff: boolean;
  price_privacy: boolean;
  analytics: boolean;
  priority_support: boolean;
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  free: {
    create_business: true,
    create_products: true, // private only
    manage_stock: true,
    use_inbox: true,
    receive_orders: false,
    create_selling_orders: false,
    generate_invoices: false,
    publish_business_page: false,
    create_deliveries: false,
    accept_staff: false,
    price_privacy: false,
    analytics: false,
    priority_support: false,
  },
  pro: {
    create_business: true,
    create_products: true,
    manage_stock: true,
    use_inbox: true,
    receive_orders: true,
    create_selling_orders: true,
    generate_invoices: true,
    publish_business_page: true,
    create_deliveries: true,
    accept_staff: true,
    price_privacy: true, // on LaBoutik Rouz
    analytics: false,
    priority_support: false,
  },
  business: {
    create_business: true,
    create_products: true,
    manage_stock: true,
    use_inbox: true,
    receive_orders: true,
    create_selling_orders: true,
    generate_invoices: true,
    publish_business_page: true,
    create_deliveries: true,
    accept_staff: true,
    price_privacy: true, // full
    analytics: true, // 1-week
    priority_support: false,
  },
  enterprise: {
    create_business: true,
    create_products: true,
    manage_stock: true,
    use_inbox: true,
    receive_orders: true,
    create_selling_orders: true,
    generate_invoices: true,
    publish_business_page: true,
    create_deliveries: true,
    accept_staff: true,
    price_privacy: true,
    analytics: true, // full
    priority_support: true,
  },
};

/**
 * Plan display information
 */
export interface PlanInfo {
  name: string;
  price: number;
  period: string;
  description: string;
  targetUser: string;
  highlights: string[];
}

export const PLAN_INFO: Record<SubscriptionPlan, PlanInfo> = {
  free: {
    name: 'Free Plan',
    price: 0,
    period: '',
    description: 'Get started with basic features',
    targetUser: 'Small businesses',
    highlights: [
      'Create a business profile',
      'Create products (private only)',
      'Manage basic stock',
      'Use business Inbox',
    ],
  },
  pro: {
    name: 'Pro Plan',
    price: 799,
    period: '/month',
    description: 'For small teams getting serious',
    targetUser: 'Startups',
    highlights: [
      'All Free features',
      'Full product management',
      'Selling orders',
      'Invoices & estimates',
      'Delivery workflow',
      'Publish public page',
      'Up to 3 staff members',
      'Up to 3 locations',
    ],
  },
  business: {
    name: 'Business Plan',
    price: 1999,
    period: '/month',
    description: 'For growing businesses',
    targetUser: 'Growing businesses',
    highlights: [
      'All Pro features',
      'Product & price privacy',
      'Analytics dashboard',
      'Up to 9 staff members',
      'Up to 8 locations',
    ],
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: 3999,
    period: '/month',
    description: 'For large operations',
    targetUser: 'Large organizations',
    highlights: [
      'All Business features',
      'Full analytics (real-time + history)',
      'Unlimited staff',
      'Unlimited locations',
      'Priority support',
    ],
  },
};

/**
 * Currency settings for Mauritius
 */
export const CURRENCY = {
  code: 'MUR',
  symbol: 'Rs',
  name: 'Mauritian Rupee',
};

/**
 * VAT settings
 */
export const VAT = {
  rate: 0.15, // 15%
  description: 'Standard VAT rate in Mauritius',
};






