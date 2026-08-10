/**
 * Smoke tests for Peach result-code classification — the logic that decides whether a
 * payment succeeded. Pure functions, no network, no database.
 *
 * This guards the webhook-forgery fix (SEC-1): the webhook and the client checkout-result
 * poll both finalize a payment by applying decidePaymentOutcome() to the result code that
 * *Peach itself returns* (never a code from the request body). These tests lock down that
 * classification so a future change can't accidentally widen "success".
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  isSuccessResult,
  isPendingResult,
  decidePaymentOutcome,
  isValidCheckoutId,
  generateCheckoutHtml,
} = require('./peachPayments');

test('Peach success codes classify as SUCCEEDED', () => {
  // 000.000.xxx, 000.100.1xx, 000.300.xxx, 000.600.xxx are Peach "successful" results.
  for (const code of ['000.000.000', '000.100.110', '000.300.000', '000.600.000']) {
    assert.equal(isSuccessResult(code), true, `isSuccessResult(${code})`);
    assert.equal(decidePaymentOutcome(code), 'SUCCEEDED', `decide(${code})`);
  }
});

test('Peach pending codes classify as PENDING, not SUCCEEDED', () => {
  // 000.200.xxx = still in progress (e.g. awaiting 3DS). Must NOT grant entitlement.
  const code = '000.200.100';
  assert.equal(isPendingResult(code), true);
  assert.equal(isSuccessResult(code), false);
  assert.equal(decidePaymentOutcome(code), 'PENDING');
});

test('rejected/declined codes classify as FAILED', () => {
  for (const code of ['800.100.150', '800.100.151', '100.396.101']) {
    assert.equal(isSuccessResult(code), false, `isSuccessResult(${code})`);
    assert.equal(decidePaymentOutcome(code), 'FAILED', `decide(${code})`);
  }
});

test('missing/empty result code is FAILED, never SUCCEEDED', () => {
  assert.equal(decidePaymentOutcome(undefined), 'FAILED');
  assert.equal(decidePaymentOutcome(''), 'FAILED');
  assert.equal(decidePaymentOutcome(null), 'FAILED');
  assert.equal(isSuccessResult(undefined), false);
});

// ---------------------------------------------------------------------------
// INJ-1 — reflected XSS on GET /api/payments/checkout-page/:checkoutId
//
// The checkout id is a path param on an UNAUTHENTICATED route, interpolated into both a
// <script src> attribute and a JS string literal and served as text/html. Unvalidated, it
// executed attacker JS on the API's own origin — the origin the payment form runs on.
// These tests lock the validator and the escaping so it can't regress.
// ---------------------------------------------------------------------------

test('valid Peach checkout ids are accepted', () => {
  for (const id of [
    'ABC123',
    '0123456789abcdefABCDEF',
    'chk_test-01.abc',
    'A'.repeat(64),
  ]) {
    assert.equal(isValidCheckoutId(id), true, `isValidCheckoutId(${id})`);
  }
});

test('injection-shaped checkout ids are rejected', () => {
  for (const id of [
    "a'});alert(document.domain);//",   // the actual XSS payload
    '<script>alert(1)</script>',
    'a"/><img src=x onerror=alert(1)>',
    'a b',                               // whitespace
    'a/../../etc/passwd',                // path traversal shape
    'a?b=c',                             // extra query param onto the widget URL
    'A'.repeat(65),                      // over length
    '',
  ]) {
    assert.equal(isValidCheckoutId(id), false, `isValidCheckoutId(${JSON.stringify(id)})`);
  }
});

test('non-string checkout ids are rejected, not coerced', () => {
  for (const id of [undefined, null, 123, {}, [], true]) {
    assert.equal(isValidCheckoutId(id), false, `isValidCheckoutId(${String(id)})`);
  }
});

test('generateCheckoutHtml throws rather than emitting an unvalidated id', () => {
  assert.throws(() => generateCheckoutHtml("a'});alert(1);//"), /INVALID_CHECKOUT_ID/);
  assert.throws(() => generateCheckoutHtml(undefined), /INVALID_CHECKOUT_ID/);
});

test('generateCheckoutHtml emits the id only in escaped contexts', () => {
  const html = generateCheckoutHtml('chk_test-01.abc', { nonce: 'n0nce' });
  // JS-literal context is JSON-quoted, not hand-quoted.
  assert.ok(html.includes('checkoutId: "chk_test-01.abc"'), 'JS literal should be JSON-encoded');
  // URL context carries the id as a query value.
  assert.ok(html.includes('paymentWidgets.js?checkoutId=chk_test-01.abc'), 'URL should carry the id');
  // The inline script must carry the nonce, or the INJ-4 CSP blocks it.
  assert.ok(html.includes('nonce="n0nce"'), 'inline script should carry the CSP nonce');
});

test('generateCheckoutHtml omits the nonce attribute when none is supplied', () => {
  const html = generateCheckoutHtml('ABC123');
  assert.ok(!html.includes('nonce='), 'no nonce attribute when no nonce given');
});
