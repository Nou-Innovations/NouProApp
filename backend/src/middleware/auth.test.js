'use strict';

/**
 * Token-type matrix — the regression guard for AUTH-1.
 *
 * The bug: every token kind (access, refresh, password_reset, 2fa_pending,
 * contact_verified) is signed with the same JWT_SECRET and carries the real user id in
 * `sub`, and neither requireAuth nor optionalAuth nor the Socket.IO handshake inspected
 * the `type` claim. So the 5-minute ticket handed out BEFORE the TOTP check authenticated
 * every route — 2FA protected nothing. A password-reset link became a 15-minute API key,
 * and a 30-day refresh token bypassed all session/tokenVersion revocation.
 *
 * These tests are cheap and pure (no DB, no network). If someone later "simplifies" the
 * middleware and drops the type check, CI goes red instead of 2FA silently dying again.
 */

const { test } = require('node:test');
const assert = require('node:assert');

// Must be set before requiring the middleware — generateToken reads it at call time.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-auth-type-matrix';

const {
  requireAuth,
  optionalAuth,
  generateToken,
  isNonAccessToken,
  NON_ACCESS_TOKEN_TYPES,
} = require('./auth');

const USER_ID = 'user-123';

// Minimal Express req/res/next doubles.
function makeReq(token) {
  return { headers: token ? { authorization: `Bearer ${token}` } : {} };
}
function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}
function run(middleware, token) {
  const req = makeReq(token);
  const res = makeRes();
  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });
  return { req, res, nextCalled };
}

// The five token kinds actually minted by server.js.
const TOKENS = {
  access: { sub: USER_ID, type: 'access', email: 'a@b.c', name: 'A', sid: 'sess-1' },
  refresh: { sub: USER_ID, type: 'refresh', tv: 0, sid: 'sess-1' },
  password_reset: { sub: USER_ID, type: 'password_reset', email: 'a@b.c' },
  '2fa_pending': { sub: USER_ID, type: '2fa_pending' },
  contact_verified: { sub: 'a@b.c', type: 'contact_verified', channel: 'email', to: 'a@b.c' },
};

const NON_ACCESS = ['refresh', 'password_reset', '2fa_pending', 'contact_verified'];

test('requireAuth accepts an access token', () => {
  const { res, nextCalled, req } = run(requireAuth, generateToken(TOKENS.access));
  assert.strictEqual(nextCalled, true, 'access token should pass requireAuth');
  assert.strictEqual(res.statusCode, null);
  assert.strictEqual(req.user.id, USER_ID);
});

for (const kind of NON_ACCESS) {
  test(`requireAuth REJECTS a ${kind} token`, () => {
    const { res, nextCalled, req } = run(requireAuth, generateToken(TOKENS[kind]));
    assert.strictEqual(nextCalled, false, `${kind} token must not authenticate a request`);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'INVALID_TOKEN');
    assert.strictEqual(req.user, undefined);
  });

  test(`optionalAuth downgrades a ${kind} token to anonymous (does not throw)`, () => {
    const { res, nextCalled, req } = run(optionalAuth, generateToken(TOKENS[kind]));
    assert.strictEqual(nextCalled, true, 'optionalAuth must always continue');
    assert.strictEqual(res.statusCode, null, 'optionalAuth must not send a response');
    assert.strictEqual(req.user, null, `${kind} token must not populate req.user`);
  });
}

test('optionalAuth still authenticates an access token', () => {
  const { req, nextCalled } = run(optionalAuth, generateToken(TOKENS.access));
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.id, USER_ID);
});

test('optionalAuth allows an anonymous request', () => {
  const { req, nextCalled } = run(optionalAuth, null);
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user, null);
});

// PHASE 1 is a deny-list: a legacy access token minted before `type` was added has no
// type claim at all, and must still work — otherwise the deploy signs out every user.
// PHASE 2 (>=24h later) flips to a strict allow-list; at that point this test should be
// changed to assert the opposite, since untyped tokens will have expired by then.
test('PHASE 1: a legacy untyped access token is still accepted', () => {
  const legacy = generateToken({ sub: USER_ID, email: 'a@b.c', name: 'A', sid: 'sess-1' });
  const { nextCalled, req } = run(requireAuth, legacy);
  assert.strictEqual(nextCalled, true, 'legacy untyped tokens must not be signed out in phase 1');
  assert.strictEqual(req.user.id, USER_ID);
});

test('isNonAccessToken covers exactly the four special-purpose types', () => {
  assert.deepStrictEqual([...NON_ACCESS_TOKEN_TYPES].sort(), [...NON_ACCESS].sort());
  for (const kind of NON_ACCESS) {
    assert.strictEqual(isNonAccessToken({ type: kind }), true, `${kind} should be non-access`);
  }
  assert.strictEqual(isNonAccessToken({ type: 'access' }), false);
  assert.strictEqual(isNonAccessToken({}), false, 'untyped (legacy) is access in phase 1');
  assert.strictEqual(isNonAccessToken(null), false);
});

test('a token signed with a different secret is rejected outright', () => {
  const jwt = require('jsonwebtoken');
  const forged = jwt.sign({ sub: USER_ID, type: 'access' }, 'not-the-real-secret');
  const { res, nextCalled } = run(requireAuth, forged);
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
});
