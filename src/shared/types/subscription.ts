/**
 * Subscription Types
 * Based on app-logic.json subscriptionPlans
 */

/**
 * Subscription plan types
 */
export type SubscriptionPlan = 'free' | 'pro' | 'business' | 'enterprise';

/**
 * Billing period types
 */
export type BillingPeriod = 'monthly' | 'yearly';

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
 * Plan pricing - Monthly (in MUR - Mauritian Rupee)
 */
export const PLAN_PRICES_MONTHLY: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 899,
  business: 2699,
  enterprise: 4399,
};

/**
 * Plan pricing - Yearly (in MUR - Mauritian Rupee)
 * Total billed annually
 */
export const PLAN_PRICES_YEARLY: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 9588,
  business: 28788,
  enterprise: 46788,
};

/**
 * Plan pricing - Yearly effective monthly rate
 * For display purposes (billed yearly)
 */
export const PLAN_PRICES_YEARLY_MONTHLY: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 799,
  business: 2399,
  enterprise: 3899,
};

/**
 * Legacy plan prices (kept for backwards compatibility)
 * Defaults to monthly pricing
 */
export const PLAN_PRICES: Record<SubscriptionPlan, number> = PLAN_PRICES_MONTHLY;

/**
 * Plan limits
 */
export interface PlanLimits {
  staff: number | 'unlimited';
  locations: number | 'unlimited';
  products: number | 'unlimited';
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: { staff: 1, locations: 1, products: 20 },
  pro: { staff: 3, locations: 1, products: 500 },
  business: { staff: 9, locations: 7, products: 5000 },
  enterprise: { staff: 'unlimited', locations: 'unlimited', products: 'unlimited' },
};

/**
 * Analytics types
 */
export type AnalyticsType = 'none' | 'basic_7day' | 'full';

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
  analytics: boolean; // Legacy field
  analytics_type: AnalyticsType;
  priority_support: boolean;
  business_specific_pricing: boolean;
  advanced_permissions: boolean;
  api_access: boolean;
  show_noupro_branding: boolean;
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
    analytics_type: 'none',
    priority_support: false,
    business_specific_pricing: false,
    advanced_permissions: false,
    api_access: false,
    show_noupro_branding: true,
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
    price_privacy: true,
    analytics: false,
    analytics_type: 'none',
    priority_support: false,
    business_specific_pricing: false,
    advanced_permissions: false,
    api_access: false,
    show_noupro_branding: false,
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
    price_privacy: true,
    analytics: true,
    analytics_type: 'basic_7day',
    priority_support: false,
    business_specific_pricing: true,
    advanced_permissions: false,
    api_access: false,
    show_noupro_branding: false,
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
    analytics: true,
    analytics_type: 'full',
    priority_support: true,
    business_specific_pricing: true,
    advanced_permissions: true,
    api_access: true,
    show_noupro_branding: false,
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
    targetUser: 'Get started',
    highlights: [
      'Create a business profile',
      'Up to 20 products (private only)',
      'Manage basic stock',
      'Use business Inbox',
      'Request orders',
    ],
  },
  pro: {
    name: 'Pro Plan',
    price: 899,
    period: '/month',
    description: 'For small teams getting serious',
    targetUser: 'For small teams',
    highlights: [
      'All Free features',
      'Up to 500 products',
      'Create selling orders',
      'Invoices & estimates (send & export PDF)',
      'Delivery workflow',
      'Publish public page',
      'Up to 3 staff members',
      '1 location',
    ],
  },
  business: {
    name: 'Business Plan',
    price: 2699,
    period: '/month',
    description: 'Scale + visibility',
    targetUser: 'Most popular',
    highlights: [
      'All Pro features',
      'Up to 5,000 products',
      'Product & price privacy',
      'Business-specific pricing',
      'Analytics dashboard (7 days)',
      'Published on feed',
      'Up to 9 staff members',
      'Up to 7 locations',
    ],
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: 4399,
    period: '/month',
    description: 'Autonomy, control, and power',
    targetUser: 'Full control',
    highlights: [
      'All Business features',
      'Unlimited products',
      'Independent locations',
      'Advanced permissions & roles',
      'Full analytics (real-time + history)',
      'API access',
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

/**
 * Free trial days per plan
 */
export const FREE_TRIAL_DAYS: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 7,
  business: 7,
  enterprise: 14,
};

/**
 * Get plan price based on billing period
 */
export function getPlanPrice(plan: SubscriptionPlan, billingPeriod: BillingPeriod): number {
  return billingPeriod === 'yearly' ? PLAN_PRICES_YEARLY[plan] : PLAN_PRICES_MONTHLY[plan];
}

/**
 * Get plan price per month display value
 * For yearly billing, shows the effective monthly rate
 */
export function getPlanPricePerMonth(plan: SubscriptionPlan, billingPeriod: BillingPeriod): number {
  return billingPeriod === 'yearly' ? PLAN_PRICES_YEARLY_MONTHLY[plan] : PLAN_PRICES_MONTHLY[plan];
}

/**
 * Calculate savings for yearly billing
 */
export function getYearlySavings(plan: SubscriptionPlan): number {
  return PLAN_PRICES_MONTHLY[plan] * 12 - PLAN_PRICES_YEARLY[plan];
}


