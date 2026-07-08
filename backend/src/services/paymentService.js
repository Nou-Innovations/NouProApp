/**
 * Payment Service — shared subscription-billing helpers.
 *
 * Pure logic only (no Prisma, no I/O) so it can be reused by BOTH the payment
 * webhook path (server.js `processSuccessfulPayment`) and the recurring-renewal
 * job (`subscriptionRenewal.js`) without duplicating pricing / period math, and
 * so it's trivially unit-testable. Callers do their own `prisma.business.update`.
 */

// Subscription plan pricing (MUR) — must match the frontend (src/shared/.../subscription.ts)
// and the create-checkout endpoint. Single source of truth for the backend.
const PLAN_PRICES = {
  MONTHLY: { PRO: 899, BUSINESS: 2699, ENTERPRISE: 4399 },
  YEARLY: { PRO: 9588, BUSINESS: 28788, ENTERPRISE: 46788 },
};

/**
 * Look up the price for a tier + billing period. Returns null when there is no
 * price (e.g. FREE, or a custom-priced ENTERPRISE that shouldn't be auto-charged).
 * @param {string} billingPeriod 'MONTHLY' | 'YEARLY'
 * @param {string} plan 'PRO' | 'BUSINESS' | 'ENTERPRISE'
 * @returns {number|null}
 */
function getPlanPrice(billingPeriod, plan) {
  const tier = PLAN_PRICES[billingPeriod];
  return (tier && tier[plan]) || null;
}

/**
 * Build the Business update payload that activates/extends a subscription.
 * Sets the new period end to now + (365|30) days. Only includes the card token
 * when one is supplied (so a renewal without a fresh token keeps the stored one).
 * @param {{ plan: string, billingPeriod?: string, registrationId?: string|null }} args
 * @returns {{ subscriptionTier: string, billingPeriod: string, currentPeriodEnd: Date, peachCardRegistrationId?: string }}
 */
function buildSubscriptionUpdate({ plan, billingPeriod, registrationId }) {
  const periodDays = billingPeriod === 'YEARLY' ? 365 : 30;
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + periodDays);

  const data = {
    subscriptionTier: plan,
    billingPeriod: billingPeriod || 'MONTHLY',
    currentPeriodEnd,
  };
  if (registrationId) {
    data.peachCardRegistrationId = registrationId;
  }
  return data;
}

module.exports = {
  PLAN_PRICES,
  getPlanPrice,
  buildSubscriptionUpdate,
};
