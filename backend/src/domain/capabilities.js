/**
 * Subscription-tier capability derivation + effective public-status helpers.
 *
 * Extracted verbatim from server.js (Phase 1 modularization). Pure logic that
 * depends only on the enum constants — no repos, no prisma, no I/O.
 *
 * RULE: Only ENTERPRISE can have independent locations with public pages.
 * RULE: Expired subscriptions are treated as FREE (with 3-day grace period).
 */
const { SUBSCRIPTION_TIERS, LOCATION_MODES } = require('../constants');

// Derive capabilities from subscription tier (centralized logic)
function deriveCapabilities(business) {
  let tier = business.subscriptionTier || SUBSCRIPTION_TIERS.FREE;

  // SECURITY: Enforce subscription expiration
  if (tier !== SUBSCRIPTION_TIERS.FREE && business.currentPeriodEnd) {
    const expiryDate = new Date(business.currentPeriodEnd);
    const gracePeriodMs = 3 * 24 * 60 * 60 * 1000; // 3 days grace
    if (Date.now() > expiryDate.getTime() + gracePeriodMs) {
      tier = SUBSCRIPTION_TIERS.FREE; // Expired + grace period passed → treat as FREE
    }
  }

  const isEnterprise = tier === SUBSCRIPTION_TIERS.ENTERPRISE;
  const isBusiness = tier === SUBSCRIPTION_TIERS.BUSINESS;
  const isPaidTier = tier !== SUBSCRIPTION_TIERS.FREE;

  return {
    // Enterprise-only capabilities
    canChooseLocationMode: isEnterprise,
    canHaveIndependentLocations: isEnterprise,
    canEnablePublicLocationPages: isEnterprise,
    canUseAdvancedPermissions: isEnterprise,
    canUseAPI: isEnterprise,

    // Business & Enterprise capabilities
    // NOTE: canUseBusinessSpecificPricing is RESERVED for an unbuilt feature.
    // There is currently no business/customer-specific pricing write endpoint
    // (only the unused LocationProduct.priceOverride), so this gates nothing and
    // there is no active entitlement leak. If business-specific pricing is built,
    // gate its write endpoint with hasCapability(business, 'canUseBusinessSpecificPricing').
    canUseBusinessSpecificPricing: isBusiness || isEnterprise,

    // Feed publishing (Business+). Mirrors the frontend publish_on_feed /
    // publish_products_on_feed plan features.
    canPublishOnFeed: isBusiness || isEnterprise,
    canPublishProductsOnFeed: isBusiness || isEnterprise,

    // Discounts / promotions (Pro+ can run automatic promotions + coupon codes)
    canManageDiscounts: isPaidTier,

    // Marketplace growth (paid tiers can post Opportunities / host Events on Explore)
    canPostOpportunities: isPaidTier,
    canHostEvents: isPaidTier,

    // Order capabilities (granular)
    canReceiveOrders: true, // All tiers can receive B2B order requests
    canRequestOrders: true, // All tiers can create purchase order requests
    canCreateSellingOrders: isPaidTier, // Only paid tiers can create selling orders

    // Invoice capabilities (granular)
    canCreateInvoiceDraft: true, // All tiers can create drafts
    canSendInvoice: isPaidTier, // Only paid tiers can send invoices
    canExportInvoicePDF: isPaidTier, // Only paid tiers can export PDFs
    canCreateInvoices: isPaidTier, // Full invoice capability (legacy, use granular instead)

    // Delivery capabilities
    canCreateDeliveries: isPaidTier,
    canAssignTransport: isPaidTier,

    // Staff capabilities
    canInviteStaff: isPaidTier,
    canHaveStaff: isPaidTier,

    // Other paid tier capabilities
    canPublishBusinessPage: isPaidTier,

    // Analytics
    analyticsType: tier === SUBSCRIPTION_TIERS.FREE ? 'none' :
                   tier === SUBSCRIPTION_TIERS.PRO ? 'none' :
                   tier === SUBSCRIPTION_TIERS.BUSINESS ? 'basic_7day' : 'full',

    // Branding
    showNouProBranding: tier === SUBSCRIPTION_TIERS.FREE,
    canRemoveBranding: isPaidTier,

    // Tier-based limits
    maxLocations: tier === SUBSCRIPTION_TIERS.FREE ? 1 :
                  tier === SUBSCRIPTION_TIERS.PRO ? 1 :
                  tier === SUBSCRIPTION_TIERS.BUSINESS ? 7 : 999,
    maxStaff: tier === SUBSCRIPTION_TIERS.FREE ? 1 :
              tier === SUBSCRIPTION_TIERS.PRO ? 3 :
              tier === SUBSCRIPTION_TIERS.BUSINESS ? 9 : 999,
    maxListedProducts: tier === SUBSCRIPTION_TIERS.FREE ? 10 :
                      tier === SUBSCRIPTION_TIERS.PRO ? 50 :
                      tier === SUBSCRIPTION_TIERS.BUSINESS ? 150 : 999999,

    // Product collections (internal groupings). Free is capped at 3; paid tiers scale up.
    maxCollections: tier === SUBSCRIPTION_TIERS.FREE ? 3 :
                    tier === SUBSCRIPTION_TIERS.PRO ? 25 :
                    tier === SUBSCRIPTION_TIERS.BUSINESS ? 100 : 999999,

    // Product recipes (bill-of-materials). Free is capped at 3; paid tiers scale up.
    maxRecipes: tier === SUBSCRIPTION_TIERS.FREE ? 3 :
                tier === SUBSCRIPTION_TIERS.PRO ? 25 :
                tier === SUBSCRIPTION_TIERS.BUSINESS ? 100 : 999999,

    // Price privacy (Business+ only)
    canEnablePricePrivacy: isBusiness || isEnterprise,

    // Procurement (PRO+)
    canViewSuppliers: isPaidTier,
    canManageSuppliers: isPaidTier,
    canCreatePurchaseRequests: isPaidTier,
    canCreatePurchaseOrders: isPaidTier,

    // Procurement (BUSINESS+)
    canApprovePurchaseRequests: isBusiness || isEnterprise,
    canReceiveGoods: isBusiness || isEnterprise,
    canUseSupplierPricing: isBusiness || isEnterprise,
    canUse3WayMatching: isBusiness || isEnterprise,

    // Procurement (ENTERPRISE)
    canUseBudgetControls: isEnterprise,

    // Procurement limits
    maxSuppliers: tier === SUBSCRIPTION_TIERS.FREE ? 0 :
                  tier === SUBSCRIPTION_TIERS.PRO ? 5 :
                  tier === SUBSCRIPTION_TIERS.BUSINESS ? 20 : 999,
  };
}

// ============================================================================
// EFFECTIVE PUBLIC STATUS (computed, not stored)
// On downgrade, location.isPublic stays true but effective public becomes false.
// ============================================================================
function isLocationPublicEffective(business, location) {
  const caps = deriveCapabilities(business);
  return (
    location.operatingMode === LOCATION_MODES.INDEPENDENT &&
    location.isPublic === true &&
    caps.canEnablePublicLocationPages === true
  );
}

// Get public disabled reason for UI display
function getPublicDisabledReason(business, location) {
  if (location.operatingMode !== LOCATION_MODES.INDEPENDENT) {
    return 'Only independent locations can have public pages';
  }
  if (!location.isPublic) {
    return null; // Not marked public, so no "disabled" reason
  }
  const caps = deriveCapabilities(business);
  if (!caps.canEnablePublicLocationPages) {
    return 'Enterprise plan required';
  }
  return null;
}

// Check business capability
function hasCapability(business, capabilityName) {
  const caps = deriveCapabilities(business);
  return caps[capabilityName] === true;
}

module.exports = {
  deriveCapabilities,
  isLocationPublicEffective,
  getPublicDisabledReason,
  hasCapability,
};
