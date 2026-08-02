/**
 * Subscription Types
 * Based on app-logic.json subscriptionPlans
 *
 * PRICING: the backend `backend/src/services/paymentService.js` PLAN_PRICES is the SINGLE
 * SOURCE OF TRUTH for the amount a card is charged. At boot the app fetches
 * `GET /api/subscription-pricing` and calls `hydrateSubscriptionPricing()` (see
 * `src/shared/services/subscriptionPricingSync.ts`) to fold the server's prices into the
 * constants below. So the price maps here are the typed **offline fallback / first-paint
 * defaults**, not a hand-maintained mirror — only PLAN_PRICES_MONTHLY and PLAN_PRICES_YEARLY
 * are authored by hand; everything else (effective-monthly, PLAN_PRICES alias, PLAN_INFO.price)
 * derives from them. If they ever drift from the backend, the runtime sync corrects them and
 * logs a loud warning.
 */

import { theme } from '@/shared/theme';

/**
 * Subscription plan types
 */
export type SubscriptionPlan = 'free' | 'pro' | 'business' | 'enterprise';

/**
 * Billing period types
 * Uses UPPERCASE to match DB enum and backend
 */
export type BillingPeriod = 'MONTHLY' | 'YEARLY';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'grace' | 'expired';

/**
 * Subscription status colors
 */
export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: theme.colors.success,
  grace: theme.colors.warning,
  expired: theme.colors.error,
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
 * Plan pricing - Yearly effective monthly rate (DERIVED from PLAN_PRICES_YEARLY / 12).
 * For display purposes (billed yearly). Not hand-authored — kept in sync by derivation here
 * and re-derived in place by hydrateSubscriptionPricing() when the yearly price updates.
 */
export const PLAN_PRICES_YEARLY_MONTHLY: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: Math.round(PLAN_PRICES_YEARLY.pro / 12),
  business: Math.round(PLAN_PRICES_YEARLY.business / 12),
  enterprise: Math.round(PLAN_PRICES_YEARLY.enterprise / 12),
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
  listedProducts: number | 'unlimited';
  collections: number | 'unlimited';
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: { staff: 1, locations: 1, products: 'unlimited', listedProducts: 10, collections: 3 },
  pro: { staff: 3, locations: 1, products: 'unlimited', listedProducts: 50, collections: 25 },
  business: { staff: 9, locations: 7, products: 'unlimited', listedProducts: 150, collections: 100 },
  enterprise: { staff: 'unlimited', locations: 'unlimited', products: 'unlimited', listedProducts: 'unlimited', collections: 'unlimited' },
};

/**
 * Max collections allowed for a plan. Returns Infinity for 'unlimited'.
 * Mirrors the backend `maxCollections` capability (Free = 3).
 */
export function maxCollectionsForPlan(plan: SubscriptionPlan | null | undefined): number {
  const limit = PLAN_LIMITS[plan || 'free'].collections;
  return limit === 'unlimited' ? Infinity : limit;
}

// Recipe quota per plan (mirrors backend capabilities.maxRecipes: 3 / 25 / 100 / ∞).
export function maxRecipesForPlan(plan: SubscriptionPlan | null | undefined): number {
  switch (plan) {
    case 'pro': return 25;
    case 'business': return 100;
    case 'enterprise': return Infinity;
    default: return 3;
  }
}

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
  generate_invoices: boolean; // Full invoice capability (Pro+) - includes send/export
  invoice_create_draft: boolean; // Can create invoice drafts (Free+)
  publish_business_page: boolean; // Public profile page
  publish_on_feed: boolean; // Appear in Explore/Feed
  publish_products_on_feed: boolean; // Products/brands visible in feed
  create_deliveries: boolean;
  accept_staff: boolean;
  price_privacy: boolean;
  analytics: boolean; // Legacy field - derive from analytics_type !== 'none'
  analytics_type: AnalyticsType;
  priority_support: boolean;
  business_specific_pricing: boolean;
  advanced_permissions: boolean;
  api_access: boolean;
  show_noupro_branding: boolean;
  // Paywall-specific capabilities (match trigger IDs)
  independent_locations: boolean;
  assign_transport: boolean;
  invoice_send: boolean;
  invoice_export_pdf: boolean;
  remove_branding: boolean; // Inverse of show_noupro_branding (for trigger alignment)
  analytics_access: boolean; // Business+ can access analytics (analytics_type !== 'none')
  analytics_full: boolean; // Enterprise has full analytics (analytics_type === 'full')
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  free: {
    create_business: true,
    create_products: true, // private only
    manage_stock: true,
    use_inbox: true,
    receive_orders: true, // Free can receive B2B order requests
    create_selling_orders: false,
    generate_invoices: false, // Full invoice capability (send/export)
    invoice_create_draft: true, // Free can create drafts (but not send/export)
    publish_business_page: false,
    publish_on_feed: false,
    publish_products_on_feed: false,
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
    // Paywall-specific
    independent_locations: false,
    assign_transport: false,
    invoice_send: false,
    invoice_export_pdf: false,
    remove_branding: false,
    analytics_access: false,
    analytics_full: false,
  },
  pro: {
    create_business: true,
    create_products: true,
    manage_stock: true,
    use_inbox: true,
    receive_orders: true,
    create_selling_orders: true,
    generate_invoices: true,
    invoice_create_draft: true,
    publish_business_page: true,
    publish_on_feed: false, // Business+ only
    publish_products_on_feed: false, // Business+ only
    create_deliveries: true,
    accept_staff: true,
    price_privacy: false, // Business+ only
    analytics: false,
    analytics_type: 'none',
    priority_support: false,
    business_specific_pricing: false,
    advanced_permissions: false,
    api_access: false,
    show_noupro_branding: false,
    // Paywall-specific
    independent_locations: false,
    assign_transport: true,
    invoice_send: true,
    invoice_export_pdf: true,
    remove_branding: true,
    analytics_access: false,
    analytics_full: false,
  },
  business: {
    create_business: true,
    create_products: true,
    manage_stock: true,
    use_inbox: true,
    receive_orders: true,
    create_selling_orders: true,
    generate_invoices: true,
    invoice_create_draft: true,
    publish_business_page: true,
    publish_on_feed: true,
    publish_products_on_feed: true,
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
    // Paywall-specific
    independent_locations: false,
    assign_transport: true,
    invoice_send: true,
    invoice_export_pdf: true,
    remove_branding: true,
    analytics_access: true,
    analytics_full: false,
  },
  enterprise: {
    create_business: true,
    create_products: true,
    manage_stock: true,
    use_inbox: true,
    receive_orders: true,
    create_selling_orders: true,
    generate_invoices: true,
    invoice_create_draft: true,
    publish_business_page: true,
    publish_on_feed: true,
    publish_products_on_feed: true,
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
    // Paywall-specific
    independent_locations: true,
    assign_transport: true,
    invoice_send: true,
    invoice_export_pdf: true,
    remove_branding: true,
    analytics_access: true,
    analytics_full: true,
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
    price: PLAN_PRICES_MONTHLY.free,
    period: '',
    description: 'Get started with basic features',
    targetUser: 'Get started',
    highlights: [
      'Create a business profile',
      'Unlimited products in store',
      'Up to 10 listed products',
      'Manage basic stock',
      'Use business Inbox',
      'Receive orders',
      'Request orders',
    ],
  },
  pro: {
    name: 'Pro Plan',
    price: PLAN_PRICES_MONTHLY.pro,
    period: '/month',
    description: 'For small teams getting serious',
    targetUser: 'For small teams',
    highlights: [
      'All Free features',
      'Up to 50 listed products',
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
    price: PLAN_PRICES_MONTHLY.business,
    period: '/month',
    description: 'Scale + visibility',
    targetUser: 'Most popular',
    highlights: [
      'All Pro features',
      'Up to 150 listed products',
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
    price: PLAN_PRICES_MONTHLY.enterprise,
    period: '/month',
    description: 'Autonomy, control, and power',
    targetUser: 'Full control',
    highlights: [
      'All Business features',
      'Unlimited listed products',
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
  return billingPeriod === 'YEARLY' ? PLAN_PRICES_YEARLY[plan] : PLAN_PRICES_MONTHLY[plan];
}

/**
 * Get plan price per month display value
 * For yearly billing, shows the effective monthly rate
 */
export function getPlanPricePerMonth(plan: SubscriptionPlan, billingPeriod: BillingPeriod): number {
  return billingPeriod === 'YEARLY' ? PLAN_PRICES_YEARLY_MONTHLY[plan] : PLAN_PRICES_MONTHLY[plan];
}

/**
 * Calculate savings for yearly billing
 */
export function getYearlySavings(plan: SubscriptionPlan): number {
  return PLAN_PRICES_MONTHLY[plan] * 12 - PLAN_PRICES_YEARLY[plan];
}

// ============================================================================
// RUNTIME SYNC — fold the backend pricing SSOT into the defaults above
// ============================================================================

/** Shape of GET /api/subscription-pricing. All fields optional / untrusted. */
export interface ServerSubscriptionPricing {
  currency?: string;
  monthly?: Record<string, number>;
  yearly?: Record<string, number>;
}

/** Paid tiers the backend prices. FREE is always 0 and is not served by the endpoint. */
const PAID_PLANS: Exclude<SubscriptionPlan, 'free'>[] = ['pro', 'business', 'enterprise'];

function isValidPrice(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

/**
 * Fold a server pricing config (from GET /api/subscription-pricing) into this module's price
 * defaults, IN PLACE — so every consumer that already imported PLAN_PRICES_MONTHLY /
 * PLAN_PRICES_YEARLY / PLAN_PRICES_YEARLY_MONTHLY / PLAN_INFO sees the update on its next render
 * without re-importing.
 *
 * Defensive by contract: never throws, ignores malformed/negative values, only touches the paid
 * tiers (FREE stays 0). Re-derives the effective-monthly rate and the (display-unused)
 * PLAN_INFO.price from the new monthly figures. Returns true if anything changed and logs each
 * drift it corrects. The backend serves UPPERCASE keys (PRO/BUSINESS/ENTERPRISE).
 */
export function hydrateSubscriptionPricing(
  server: ServerSubscriptionPricing | null | undefined
): boolean {
  if (!server || typeof server !== 'object') return false;
  const monthly = server.monthly && typeof server.monthly === 'object' ? server.monthly : null;
  const yearly = server.yearly && typeof server.yearly === 'object' ? server.yearly : null;
  if (!monthly && !yearly) return false;

  let changed = false;
  const drifts: string[] = [];

  for (const plan of PAID_PLANS) {
    const key = plan.toUpperCase();

    if (monthly) {
      const next = monthly[key];
      if (isValidPrice(next) && next !== PLAN_PRICES_MONTHLY[plan]) {
        drifts.push(`monthly.${plan}: ${PLAN_PRICES_MONTHLY[plan]} → ${next}`);
        PLAN_PRICES_MONTHLY[plan] = next; // PLAN_PRICES shares this object reference
        PLAN_INFO[plan].price = next; // display-unused, kept consistent
        changed = true;
      }
    }

    if (yearly) {
      const next = yearly[key];
      if (isValidPrice(next) && next !== PLAN_PRICES_YEARLY[plan]) {
        drifts.push(`yearly.${plan}: ${PLAN_PRICES_YEARLY[plan]} → ${next}`);
        PLAN_PRICES_YEARLY[plan] = next;
        PLAN_PRICES_YEARLY_MONTHLY[plan] = Math.round(next / 12); // re-derive in place
        changed = true;
      }
    }
  }

  if (drifts.length) {
    console.warn(
      '[subscriptionPricing] Frontend plan prices differed from the backend' +
        (changed ? ' and were auto-corrected at runtime' : '') +
        '. Update the defaults in src/shared/types/subscription.ts to match ' +
        'backend/src/services/paymentService.js PLAN_PRICES:\n  - ' +
        drifts.join('\n  - ')
    );
  }

  return changed;
}


