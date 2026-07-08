const logger = require('../utils/logger');
/**
 * Subscription Renewal Service (REV-1)
 *
 * Fixes the audit's top revenue finding: subscriptions were charged once and never
 * again. This job runs daily (via POST /api/automation/subscriptions/renew and an
 * in-process timer), finds paid businesses at/after `currentPeriodEnd`, and charges
 * their stored card (Peach merchant-initiated / MIT) via `chargeStoredCard`.
 *
 * Dunning: on a failed charge the business keeps its tier through a GRACE_DAYS window
 * (retried each daily run + admins notified); past the window it is downgraded to FREE.
 *
 * Idempotent: a deterministic per-period `orderId` + a pre-charge guard (an existing
 * PENDING/SUCCEEDED subscription Payment created on/after `currentPeriodEnd`) prevent a
 * double-charge if two runs overlap. NOTE: like the other schedulers, this is
 * single-instance friendly — a multi-instance deploy should move it to a dedicated worker.
 */

// Prisma is the only data source (mirrors orderAutomation.js).
const dataSource = process.env.DATA_SOURCE || 'prisma';
let defaultPrisma = null;
if (dataSource === 'prisma') {
  defaultPrisma = require('../db/prisma').prisma;
}
const defaultPeach = require('./peachPayments');
const defaultPush = require('./pushService');
const { getPlanPrice, buildSubscriptionUpdate } = require('./paymentService');

// Days a business keeps its paid tier after a failed renewal before dropping to FREE.
const GRACE_DAYS = 7;
const CURRENCY = 'MUR';

/**
 * True when `now` is past the grace window that follows `currentPeriodEnd`.
 * @param {Date} currentPeriodEnd
 * @param {Date} now
 * @param {number} [graceDays]
 */
function isPastGrace(currentPeriodEnd, now, graceDays = GRACE_DAYS) {
  const cutoff = new Date(currentPeriodEnd);
  cutoff.setDate(cutoff.getDate() + graceDays);
  return now > cutoff;
}

/** Accepted admin/super-admin user IDs for a business (who get billing alerts). */
async function getBusinessAdminUserIds(prisma, businessId) {
  if (!prisma) return [];
  const admins = await prisma.businessMember.findMany({
    where: { businessId, status: 'accepted', role: { in: ['admin', 'super_admin'] } },
    select: { userId: true },
  });
  return admins.map((m) => m.userId);
}

/** Best-effort push to a business's admins; never throws into the renewal loop. */
async function notifyAdmins(prisma, push, repos, businessId, title, body, data) {
  try {
    const userIds = await getBusinessAdminUserIds(prisma, businessId);
    if (!userIds.length) return;
    await push.sendToUsers({ userIds, title, body, category: 'system', data }, repos);
  } catch (err) {
    logger.error(`[renewal] notify failed for ${businessId}:`, err.message);
  }
}

/**
 * Run one renewal pass.
 * @param {object} [opts]
 * @param {boolean} [opts.dryRun] Compute what would happen; make no charges/writes.
 * @param {boolean} [opts.notify] Send push alerts to admins on renew/fail/downgrade.
 * @param {object}  [opts.repos] Repository container (required by pushService).
 * @param {object}  [opts._prisma] Injected Prisma (tests).
 * @param {object}  [opts._peach] Injected peachPayments (tests).
 * @param {object}  [opts._push] Injected pushService (tests).
 * @param {Date}    [opts._now] Injected clock (tests).
 * @returns {Promise<object>} Summary of the run.
 */
async function processRenewals({
  dryRun = false,
  notify = false,
  repos = null,
  _prisma,
  _peach,
  _push,
  _now,
} = {}) {
  const prisma = _prisma || defaultPrisma;
  const peach = _peach || defaultPeach;
  const push = _push || defaultPush;
  const now = _now || new Date();
  const startedAt = Date.now();

  const summary = {
    timestamp: now.toISOString(),
    dryRun,
    due: 0,
    renewed: 0,
    failed: 0,
    downgraded: 0,
    wouldRenew: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  // Businesses whose paid period has ended. FREE is excluded; a null currentPeriodEnd
  // can't match `lte: now`, so every row here has a real period end.
  const businesses = await prisma.business.findMany({
    where: {
      subscriptionTier: { not: 'FREE' },
      currentPeriodEnd: { lte: now },
    },
  });
  summary.due = businesses.length;

  for (const biz of businesses) {
    try {
      const currentPeriodEnd = new Date(biz.currentPeriodEnd);

      // Past the grace window → downgrade to FREE (dunning give-up).
      if (isPastGrace(currentPeriodEnd, now)) {
        if (!dryRun) {
          await prisma.business.update({
            where: { id: biz.id },
            data: { subscriptionTier: 'FREE' },
          });
        }
        summary.downgraded += 1;
        if (notify) {
          await notifyAdmins(
            prisma, push, repos, biz.id,
            'Subscription ended',
            `Your ${biz.subscriptionTier} plan ended because we couldn't collect payment. Re-subscribe anytime to restore it.`,
            { type: 'subscription_ended', businessId: biz.id },
          );
        }
        continue;
      }

      // Within grace but no stored card → can't charge; nudge them to add one.
      if (!biz.peachCardRegistrationId) {
        summary.skipped += 1;
        if (notify) {
          await notifyAdmins(
            prisma, push, repos, biz.id,
            'Add a payment card',
            `Your ${biz.subscriptionTier} plan is due for renewal. Add a card to keep it active.`,
            { type: 'subscription_needs_card', businessId: biz.id },
          );
        }
        continue;
      }

      const amount = getPlanPrice(biz.billingPeriod, biz.subscriptionTier);
      if (!amount) {
        // No auto-charge price (e.g. custom-priced ENTERPRISE) — leave it for manual handling.
        summary.skipped += 1;
        logger.warn(`[renewal] no price for ${biz.subscriptionTier}/${biz.billingPeriod}; skipping ${biz.id}`);
        continue;
      }

      // Idempotency guard: a PENDING/SUCCEEDED subscription Payment already created this
      // cycle means we (or a concurrent run) already attempted the charge — don't repeat it.
      const existing = await prisma.payment.findFirst({
        where: {
          businessId: biz.id,
          type: 'SUBSCRIPTION',
          status: { in: ['PENDING', 'SUCCEEDED'] },
          createdAt: { gte: currentPeriodEnd },
        },
      });
      if (existing) {
        summary.skipped += 1;
        continue;
      }

      const orderId = `renewal-${biz.id}-${currentPeriodEnd.toISOString().slice(0, 10)}`;

      if (dryRun) {
        summary.wouldRenew += 1;
        continue;
      }

      // Record the attempt BEFORE charging so the guard above sees it on any overlapping run.
      const payment = await prisma.payment.create({
        data: {
          businessId: biz.id,
          type: 'SUBSCRIPTION',
          amount,
          currency: CURRENCY,
          status: 'PENDING',
          description: `Auto-renewal — ${biz.subscriptionTier} (${biz.billingPeriod})`,
          metadata: {
            plan: biz.subscriptionTier,
            billingPeriod: biz.billingPeriod,
            orderId,
            renewal: true,
          },
        },
      });

      let result;
      try {
        result = await peach.chargeStoredCard({
          registrationId: biz.peachCardRegistrationId,
          amount,
          currency: CURRENCY,
          orderId,
        });
      } catch (err) {
        await prisma.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'FAILED' },
        });
        summary.failed += 1;
        summary.errors.push({ businessId: biz.id, error: err.message });
        if (notify) {
          await notifyAdmins(
            prisma, push, repos, biz.id,
            'Payment failed — update your card',
            `We couldn't renew your ${biz.subscriptionTier} plan. Update your card within ${GRACE_DAYS} days to avoid losing access.`,
            { type: 'subscription_payment_failed', businessId: biz.id },
          );
        }
        continue;
      }

      const outcome = peach.decidePaymentOutcome(result && result.result && result.result.code);

      if (outcome === 'SUCCEEDED') {
        await prisma.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'SUCCEEDED', peachTransactionId: result.id },
        });
        const updateData = buildSubscriptionUpdate({
          plan: biz.subscriptionTier,
          billingPeriod: biz.billingPeriod,
          registrationId: biz.peachCardRegistrationId,
        });
        await prisma.business.update({ where: { id: biz.id }, data: updateData });
        summary.renewed += 1;
        if (notify) {
          await notifyAdmins(
            prisma, push, repos, biz.id,
            'Subscription renewed',
            `Your ${biz.subscriptionTier} plan renewed successfully.`,
            { type: 'subscription_renewed', businessId: biz.id },
          );
        }
      } else if (outcome === 'PENDING') {
        // Async/3DS result still in flight (rare for MIT) — leave PENDING; retried next run.
        summary.skipped += 1;
      } else {
        await prisma.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'FAILED', peachTransactionId: result.id },
        });
        summary.failed += 1;
        if (notify) {
          await notifyAdmins(
            prisma, push, repos, biz.id,
            'Payment failed — update your card',
            `We couldn't renew your ${biz.subscriptionTier} plan. Update your card within ${GRACE_DAYS} days to avoid losing access.`,
            { type: 'subscription_payment_failed', businessId: biz.id },
          );
        }
      }
    } catch (err) {
      summary.errors.push({ businessId: biz.id, error: err.message });
      logger.error(`[renewal] error processing ${biz.id}:`, err.message);
    }
  }

  summary.durationMs = Date.now() - startedAt;
  logger.debug(
    `[renewal] done: due=${summary.due} renewed=${summary.renewed} failed=${summary.failed} ` +
    `downgraded=${summary.downgraded} skipped=${summary.skipped}${dryRun ? ` wouldRenew=${summary.wouldRenew}` : ''}`,
  );
  return summary;
}

module.exports = {
  GRACE_DAYS,
  isPastGrace,
  getBusinessAdminUserIds,
  processRenewals,
};
