'use strict';

/**
 * Cross-tenant access probes (audit Batch F).
 *
 * This is the test that would have caught TEN-1 … TEN-6. Every one of those was a route
 * that authenticated the caller correctly and then trusted an id from the URL or body —
 * so no amount of unit-testing the repos would have found them. They only show up when a
 * real request from user B is made against user A's resource.
 *
 * How it works, and why it works without a database:
 *   - server.js only calls listen() when run directly, so requiring it here yields a
 *     configured-but-idle Express app. The test binds an ephemeral port itself.
 *   - Node 20 ships global fetch, so no supertest dependency is needed.
 *   - The Prisma delegates and repository functions are replaced with in-memory fakes
 *     before server.js is required, using the same Module._load trick that
 *     passwordResetService.test.js and sessionService.test.js already use.
 *
 * What that buys and what it does not: this exercises the real middleware chain, the real
 * membership checks and the real scoping logic — which is where all six findings lived.
 * It does NOT exercise Prisma's own query semantics, so a fix that scopes in the WHERE
 * clause (TEN-4) is verified by its repo unit test instead. Swapping these fakes for a
 * seeded throwaway database later needs no change to the tests themselves.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

// --- fixture ---------------------------------------------------------------
// Two businesses that share nothing. Alice belongs to A, Mallory to B.
const BIZ_A = 'biz-alice';
const BIZ_B = 'biz-mallory';
const USER_A = 'user-alice';
const USER_B = 'user-mallory';

const INVOICE_A = { id: 'inv-a1', businessId: BIZ_A, clientBusinessId: null, totalAmount: 500, status: 'SENT', currency: 'MUR' };
const COLLECTION_A = { id: 'col-a1', businessId: BIZ_A, name: 'A private collection', products: [] };
const PAYMENT_A = { id: 'pay-a1', businessId: BIZ_A, peachCheckoutId: 'chk-a1', status: 'PENDING' };

const members = [
  { id: 'bm-1', businessId: BIZ_A, userId: USER_A, role: 'super_admin', status: 'accepted' },
  { id: 'bm-2', businessId: BIZ_B, userId: USER_B, role: 'super_admin', status: 'accepted' },
];

/** Minimal stand-ins. Only what the probed routes actually touch. */
const fakePrisma = {
  invoice: {
    findUnique: async ({ where }) => (where.id === INVOICE_A.id ? { ...INVOICE_A } : null),
    findMany: async () => [],
  },
  payment: {
    findUnique: async ({ where }) =>
      where.peachCheckoutId === PAYMENT_A.peachCheckoutId ? { ...PAYMENT_A } : null,
    create: async ({ data }) => ({ id: 'pay-new', ...data }),
  },
  businessMember: {
    findUnique: async ({ where }) => {
      const { businessId, userId } = where.businessId_userId || {};
      return members.find((m) => m.businessId === businessId && m.userId === userId) || null;
    },
    findFirst: async ({ where }) =>
      members.find((m) => m.businessId === where.businessId && m.userId === where.userId
        && (!where.status || m.status === where.status)) || null,
    findMany: async () => [],
  },
  user: { findUnique: async ({ where }) => ({ id: where.id, name: 'Test', email: `${where.id}@x.com` }) },
  business: { findMany: async () => [], findUnique: async () => null },
  session: { findUnique: async () => null, updateMany: async () => ({ count: 0 }), deleteMany: async () => ({ count: 0 }) },
  passwordResetToken: { deleteMany: async () => ({ count: 0 }) },
};

const fakeRepos = {
  memberRepo: {
    getBusinessMember: async (businessId, userId) =>
      members.find((m) => m.businessId === businessId && m.userId === userId) || null,
    isBusinessMember: async (businessId, userId) =>
      members.some((m) => m.businessId === businessId && m.userId === userId && m.status === 'accepted'),
    listBusinessMembers: async (businessId) => members.filter((m) => m.businessId === businessId),
    getByUserId: async (userId) => members.filter((m) => m.userId === userId),
    listLocationMembersByBusinessAndUser: async () => [],
  },
  collectionRepo: {
    getByBusinessId: async (businessId) => (businessId === BIZ_A ? [COLLECTION_A] : []),
    getById: async (id) => (id === COLLECTION_A.id ? { ...COLLECTION_A } : null),
  },
  userRepo: {
    getById: async (id) => ({ id, name: 'Test', email: `${id}@x.com`, passwordHash: null }),
    getByEmail: async () => null,
  },
  businessRepo: { getById: async (id) => ({ id, subscriptionTier: 'FREE' }), getActiveById: async (id) => ({ id }) },
  priceListRepo: { getById: async () => null, removeItem: async () => false },
  locationRepo: { getById: async () => null },
  productRepo: { getById: async () => null, list: async () => [], listPublic: async () => [] },
  blockRepo: { isBlocked: async () => false, getBlockedIds: async () => [] },
  educationRepo: { getByUserId: async () => [] },
  certificationRepo: { getByUserId: async () => [] },
  skillRepo: { getUserSkills: async () => [] },
};

let server;
let baseUrl;
let generateToken;

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'cross-tenant-integration-test-secret';
  process.env.DATABASE_URL = 'postgresql://t:t@localhost:5432/t';
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  delete process.env.SENTRY_DSN;

  const backendRoot = path.resolve(__dirname, '..', '..');
  const dbPath = path.join(backendRoot, 'src', 'db', 'prisma.js');
  const reposPath = path.join(backendRoot, 'src', 'repositories', 'index.js');

  // Inject the fakes before server.js pulls in the real ones.
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    const resolved = (() => {
      try { return Module._resolveFilename(request, parent, isMain); } catch { return request; }
    })();
    if (resolved === dbPath) return { prisma: fakePrisma };
    // The module exports a factory, not the repos object.
    if (resolved === reposPath) return { getRepos: () => fakeRepos, getDataSource: () => 'prisma' };
    return originalLoad.apply(this, arguments);
  };

  const { app } = require(path.join(backendRoot, 'server.js'));
  ({ generateToken } = require(path.join(backendRoot, 'src', 'middleware', 'auth.js')));
  Module._load = originalLoad;

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

/** A real access token for `userId`, minted the same way login does. */
const tokenFor = (userId) => generateToken({ sub: userId, type: 'access', email: `${userId}@x.com` });

const asUser = (userId, url, init = {}) =>
  fetch(`${baseUrl}${url}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenFor(userId)}`,
      ...(init.headers || {}),
    },
  });

/** Anything that isn't a 2xx counts as "kept out"; 401/403/404 are all acceptable. */
const assertDenied = (res, what) => {
  assert.ok(
    res.status === 401 || res.status === 403 || res.status === 404,
    `${what}: expected the request to be refused, got HTTP ${res.status}`,
  );
};

// ---------------------------------------------------------------------------

test('TEN-2: an outsider cannot list another company\'s collections', async () => {
  const mine = await asUser(USER_A, `/api/companies/${BIZ_A}/collections`);
  assert.equal(mine.status, 200, 'the owner must still be able to read their own');

  const theirs = await asUser(USER_B, `/api/companies/${BIZ_A}/collections`);
  assertDenied(theirs, 'collections list');
});

test('TEN-2: an outsider cannot read a single collection (which embeds cost prices)', async () => {
  const res = await asUser(USER_B, `/api/companies/${BIZ_A}/collections/${COLLECTION_A.id}`);
  assertDenied(res, 'collection detail');
});

test('TEN-1: an outsider cannot create a checkout against another tenant\'s invoice', async () => {
  const res = await asUser(USER_B, '/api/payments/invoice-checkout', {
    method: 'POST',
    body: JSON.stringify({ invoiceId: INVOICE_A.id }),
  });
  assertDenied(res, 'invoice checkout');
});

test('TEN-6: an outsider cannot read another tenant\'s payment status', async () => {
  const res = await asUser(USER_B, `/api/payments/checkout-result/${PAYMENT_A.peachCheckoutId}`);
  assertDenied(res, 'checkout result');
});

test('TEN-3: contacts cannot be read for a different user', async () => {
  const res = await asUser(USER_B, `/api/users/${USER_A}/contacts`);
  assertDenied(res, 'contacts');
});

test('AUTH-1: a refresh token is not accepted as an access token', async () => {
  // The P0 that made 2FA meaningless. Every non-access token type must be refused.
  for (const type of ['refresh', 'password_reset', '2fa_pending', 'contact_verified']) {
    const bad = generateToken({ sub: USER_A, type });
    const res = await fetch(`${baseUrl}/api/companies/${BIZ_A}/collections`, {
      headers: { Authorization: `Bearer ${bad}` },
    });
    assert.equal(res.status, 401, `a '${type}' token must not authenticate a normal request`);
  }
});

test('unauthenticated requests are refused on tenant-scoped routes', async () => {
  const res = await fetch(`${baseUrl}/api/companies/${BIZ_A}/collections`);
  assert.equal(res.status, 401);
});
