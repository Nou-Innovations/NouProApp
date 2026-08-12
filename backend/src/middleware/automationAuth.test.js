'use strict';

/**
 * Automation API-key guard (audit ABUSE-2).
 *
 * Three properties pinned here:
 *   - fails CLOSED when AUTOMATION_API_KEY is unset (a misconfigured deploy must reject,
 *     never accept),
 *   - compares in constant time, so response timing cannot be walked byte-by-byte,
 *   - still accepts the key from the query string, deliberately, because the renewal cron
 *     may be configured that way and that job charges cards. That fallback is scheduled
 *     for removal (ABUSE-6) — when it goes, the last test here flips to expecting 401.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const buildGuard = require('./automationAuth');
const { timingSafeMatch } = require('./automationAuth');

const errorResponse = (message, code) => ({ success: false, message, code });

/** Minimal res double capturing status + body. */
function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function withKey(key, fn) {
  const previous = process.env.AUTOMATION_API_KEY;
  if (key === undefined) delete process.env.AUTOMATION_API_KEY;
  else process.env.AUTOMATION_API_KEY = key;
  try { return fn(); } finally {
    if (previous === undefined) delete process.env.AUTOMATION_API_KEY;
    else process.env.AUTOMATION_API_KEY = previous;
  }
}

const req = (over = {}) => ({ headers: {}, query: {}, method: 'POST', path: '/api/automation/x', ...over });

test('fails closed with 503 when no key is configured', () => {
  withKey(undefined, () => {
    const guard = buildGuard(errorResponse);
    const res = fakeRes();
    assert.equal(guard(req({ headers: { 'x-automation-key': 'anything' } }), res), false);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'NOT_CONFIGURED');
  });
});

test('accepts the correct key from the x-automation-key header', () => {
  withKey('s3cret-key', () => {
    const guard = buildGuard(errorResponse);
    const res = fakeRes();
    assert.equal(guard(req({ headers: { 'x-automation-key': 's3cret-key' } }), res), true);
    assert.equal(res.statusCode, null, 'no response should be written on success');
  });
});

test('rejects a wrong key, a missing key, and a near-miss', () => {
  withKey('s3cret-key', () => {
    const guard = buildGuard(errorResponse);
    for (const headers of [
      { 'x-automation-key': 'wrong' },
      { 'x-automation-key': 's3cret-ke' },   // prefix — the timing-attack shape
      { 'x-automation-key': 's3cret-keyy' }, // extension
      {},                                     // absent
    ]) {
      const res = fakeRes();
      assert.equal(guard(req({ headers }), res), false, `should reject ${JSON.stringify(headers)}`);
      assert.equal(res.statusCode, 401);
    }
  });
});

test('query-string key is still accepted (ABUSE-6: remove once the cron is confirmed header-only)', () => {
  withKey('s3cret-key', () => {
    const guard = buildGuard(errorResponse);
    const res = fakeRes();
    assert.equal(guard(req({ query: { key: 's3cret-key' } }), res), true);
  });
});

// --- the comparison primitive -------------------------------------------------

test('timingSafeMatch is exact', () => {
  assert.equal(timingSafeMatch('abc', 'abc'), true);
  assert.equal(timingSafeMatch('abc', 'abd'), false);
  assert.equal(timingSafeMatch('abc', 'ab'), false, 'length differences must not match');
  assert.equal(timingSafeMatch('', ''), false, 'empty is never a valid key');
});

test('timingSafeMatch does not throw on non-strings or absent values', () => {
  for (const bad of [undefined, null, 123, {}, [], true]) {
    assert.equal(timingSafeMatch(bad, 'abc'), false, `supplied=${String(bad)}`);
    assert.equal(timingSafeMatch('abc', bad), false, `expected=${String(bad)}`);
  }
});

test('timingSafeMatch handles length mismatch without leaking via a throw', () => {
  // crypto.timingSafeEqual throws on unequal buffer lengths, which is why both sides are
  // hashed to a fixed 32 bytes first. A regression here would surface as an exception.
  assert.doesNotThrow(() => timingSafeMatch('a', 'a-much-longer-key-value'));
  assert.equal(timingSafeMatch('a', 'a-much-longer-key-value'), false);
});
