/**
 * Tests for the subscription renewal job (REV-1).
 *
 * The service transitively constructs a PrismaClient at import time (it does NOT connect
 * until a query runs), so we set harmless dummy datasource envs before requiring it, then
 * inject fake prisma/peach/push/clock so no DB or network is touched.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/noupro_test';
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { isPastGrace, GRACE_DAYS, processRenewals } = require('./subscriptionRenewal');
const paymentService = require('./paymentService');

const NOW = new Date('2026-07-08T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

// ---- Fakes -----------------------------------------------------------------

// A minimal Prisma double that records writes and serves a scripted business list.
function makePrisma(businesses, { existingPayment = null } = {}) {
  const calls = { businessUpdates: [], paymentCreates: [], paymentUpdates: [] };
  return {
    calls,
    business: {
      findMany: async () => businesses,
      update: async ({ where, data }) => {
        calls.businessUpdates.push({ id: where.id, data });
        return { id: where.id, ...data };
      },
    },
    payment: {
      findFirst: async () => existingPayment,
      create: async ({ data }) => {
        const row = { id: `pay-${calls.paymentCreates.length + 1}`, ...data };
        calls.paymentCreates.push(row);
        return row;
      },
      updateMany: async ({ where, data }) => {
        calls.paymentUpdates.push({ where, data });
        return { count: 1 };
      },
    },
  };
}

// Peach double: SUCCEEDED for code 'ok', FAILED otherwise; optionally throws.
function makePeach({ code = 'ok', throwOnCharge = false } = {}) {
  const calls = { charges: [] };
  return {
    calls,
    chargeStoredCard: async (args) => {
      calls.charges.push(args);
      if (throwOnCharge) throw new Error('network down');
      return { id: 'txn-1', result: { code } };
    },
    decidePaymentOutcome: (c) => (c === 'ok' ? 'SUCCEEDED' : 'FAILED'),
  };
}

const noPush = { sendToUsers: async () => {} };

const bizBase = {
  id: 'biz-1',
  subscriptionTier: 'PRO',
  billingPeriod: 'MONTHLY',
  peachCardRegistrationId: 'card-tok-1',
};

// ---- Pure helpers ----------------------------------------------------------

test('isPastGrace: within grace is false, beyond grace is true', () => {
  assert.equal(isPastGrace(daysAgo(1), NOW), false);
  assert.equal(isPastGrace(daysAgo(GRACE_DAYS - 1), NOW), false);
  assert.equal(isPastGrace(daysAgo(GRACE_DAYS + 1), NOW), true);
});

test('buildSubscriptionUpdate advances the period and keeps the token', () => {
  const data = paymentService.buildSubscriptionUpdate({ plan: 'PRO', billingPeriod: 'MONTHLY', registrationId: 'tok' });
  assert.equal(data.subscriptionTier, 'PRO');
  assert.equal(data.peachCardRegistrationId, 'tok');
  assert.ok(data.currentPeriodEnd > new Date());
});

test('getPlanPrice returns null for unpriced tiers', () => {
  assert.equal(paymentService.getPlanPrice('MONTHLY', 'PRO'), 899);
  assert.equal(paymentService.getPlanPrice('MONTHLY', 'FREE'), null);
});

// ---- processRenewals -------------------------------------------------------

test('successful charge: advances period, writes SUCCEEDED payment', async () => {
  const prisma = makePrisma([{ ...bizBase, currentPeriodEnd: daysAgo(1) }]);
  const peach = makePeach({ code: 'ok' });
  const summary = await processRenewals({ _prisma: prisma, _peach: peach, _push: noPush, _now: NOW });

  assert.equal(summary.renewed, 1);
  assert.equal(summary.failed, 0);
  assert.equal(peach.calls.charges.length, 1);
  assert.equal(prisma.calls.paymentCreates.length, 1);
  // Payment flipped to SUCCEEDED and business period advanced.
  assert.ok(prisma.calls.paymentUpdates.some((u) => u.data.status === 'SUCCEEDED'));
  assert.equal(prisma.calls.businessUpdates.length, 1);
  assert.equal(prisma.calls.businessUpdates[0].data.subscriptionTier, 'PRO');
});

test('failed charge: keeps tier, writes FAILED payment, no business update', async () => {
  const prisma = makePrisma([{ ...bizBase, currentPeriodEnd: daysAgo(1) }]);
  const peach = makePeach({ code: '800.100.100' }); // declined
  const summary = await processRenewals({ _prisma: prisma, _peach: peach, _push: noPush, _now: NOW });

  assert.equal(summary.failed, 1);
  assert.equal(summary.renewed, 0);
  assert.ok(prisma.calls.paymentUpdates.some((u) => u.data.status === 'FAILED'));
  assert.equal(prisma.calls.businessUpdates.length, 0); // tier untouched
});

test('charge throws: payment marked FAILED, counted as failed', async () => {
  const prisma = makePrisma([{ ...bizBase, currentPeriodEnd: daysAgo(1) }]);
  const peach = makePeach({ throwOnCharge: true });
  const summary = await processRenewals({ _prisma: prisma, _peach: peach, _push: noPush, _now: NOW });

  assert.equal(summary.failed, 1);
  assert.ok(prisma.calls.paymentUpdates.some((u) => u.data.status === 'FAILED'));
  assert.equal(summary.errors.length, 1);
});

test('past grace: downgrades to FREE, no charge attempted', async () => {
  const prisma = makePrisma([{ ...bizBase, currentPeriodEnd: daysAgo(GRACE_DAYS + 2) }]);
  const peach = makePeach({ code: 'ok' });
  const summary = await processRenewals({ _prisma: prisma, _peach: peach, _push: noPush, _now: NOW });

  assert.equal(summary.downgraded, 1);
  assert.equal(summary.renewed, 0);
  assert.equal(peach.calls.charges.length, 0);
  assert.equal(prisma.calls.businessUpdates[0].data.subscriptionTier, 'FREE');
});

test('no stored card within grace: skipped, no charge', async () => {
  const prisma = makePrisma([{ ...bizBase, peachCardRegistrationId: null, currentPeriodEnd: daysAgo(1) }]);
  const peach = makePeach({ code: 'ok' });
  const summary = await processRenewals({ _prisma: prisma, _peach: peach, _push: noPush, _now: NOW });

  assert.equal(summary.skipped, 1);
  assert.equal(peach.calls.charges.length, 0);
});

test('idempotency guard: existing payment this cycle skips the charge', async () => {
  const prisma = makePrisma([{ ...bizBase, currentPeriodEnd: daysAgo(1) }], { existingPayment: { id: 'prev' } });
  const peach = makePeach({ code: 'ok' });
  const summary = await processRenewals({ _prisma: prisma, _peach: peach, _push: noPush, _now: NOW });

  assert.equal(summary.skipped, 1);
  assert.equal(summary.renewed, 0);
  assert.equal(peach.calls.charges.length, 0);
  assert.equal(prisma.calls.paymentCreates.length, 0);
});

test('dryRun: no charges, no writes, counts wouldRenew', async () => {
  const prisma = makePrisma([{ ...bizBase, currentPeriodEnd: daysAgo(1) }]);
  const peach = makePeach({ code: 'ok' });
  const summary = await processRenewals({ dryRun: true, _prisma: prisma, _peach: peach, _push: noPush, _now: NOW });

  assert.equal(summary.wouldRenew, 1);
  assert.equal(summary.renewed, 0);
  assert.equal(peach.calls.charges.length, 0);
  assert.equal(prisma.calls.paymentCreates.length, 0);
  assert.equal(prisma.calls.businessUpdates.length, 0);
});

test('due query excludes FREE and future periods', async () => {
  let capturedWhere = null;
  const prisma = makePrisma([]);
  prisma.business.findMany = async ({ where }) => {
    capturedWhere = where;
    return [];
  };
  await processRenewals({ _prisma: prisma, _peach: makePeach(), _push: noPush, _now: NOW });

  assert.deepEqual(capturedWhere.subscriptionTier, { not: 'FREE' });
  assert.deepEqual(capturedWhere.currentPeriodEnd, { lte: NOW });
});
