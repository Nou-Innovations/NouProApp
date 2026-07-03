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
