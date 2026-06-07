/**
 * Smoke tests for the Purchase Order status state machine (single source of truth).
 *
 * Pure transition logic only — no database is touched. See orderStatus.test.js
 * for why the dummy datasource env vars are set before requiring the module.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/noupro_test';
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  PO_STATUS,
  ALLOWED_TRANSITIONS,
  isValidTransition,
  getValidNextStatuses,
  isFinalStatus,
  requiresReason,
  canEditInStatus,
} = require('./purchaseOrderStatus');

test('valid PO transitions are allowed', () => {
  assert.ok(isValidTransition('DRAFT', 'SENT'));
  assert.ok(isValidTransition('SENT', 'CONFIRMED'));
  assert.ok(isValidTransition('CONFIRMED', 'PARTIALLY_RECEIVED'));
  assert.ok(isValidTransition('CONFIRMED', 'RECEIVED'));
  assert.ok(isValidTransition('PARTIALLY_RECEIVED', 'RECEIVED'));
});

test('invalid PO transitions are rejected', () => {
  assert.equal(isValidTransition('DRAFT', 'RECEIVED'), false); // can't skip ahead
  assert.equal(isValidTransition('SENT', 'PARTIALLY_RECEIVED'), false);
  assert.equal(isValidTransition('RECEIVED', 'SENT'), false); // terminal
  assert.equal(isValidTransition('CANCELED', 'DRAFT'), false);
});

test('every PO status can be canceled except terminal states', () => {
  assert.ok(isValidTransition('DRAFT', 'CANCELED'));
  assert.ok(isValidTransition('SENT', 'CANCELED'));
  assert.ok(isValidTransition('CONFIRMED', 'CANCELED'));
  assert.ok(isValidTransition('PARTIALLY_RECEIVED', 'CANCELED'));
  assert.equal(isValidTransition('RECEIVED', 'CANCELED'), false);
});

test('terminal states have no outgoing transitions and are final', () => {
  for (const s of ['RECEIVED', 'CANCELED']) {
    assert.deepEqual(getValidNextStatuses(s), []);
    assert.ok(isFinalStatus(s), `${s} should be final`);
  }
});

test('cancel requires a reason; sending does not', () => {
  assert.ok(requiresReason('CANCELED'));
  assert.equal(requiresReason('SENT'), false);
  assert.equal(requiresReason('RECEIVED'), false);
});

test('blocksEdits: DRAFT is editable, SENT is not', () => {
  assert.equal(canEditInStatus('DRAFT'), true);
  assert.equal(canEditInStatus('SENT'), false);
  assert.equal(canEditInStatus('CONFIRMED'), false);
});

test('every PO status has an entry in the transition map', () => {
  for (const s of Object.values(PO_STATUS)) {
    assert.ok(Array.isArray(ALLOWED_TRANSITIONS[s]), `missing transitions for ${s}`);
  }
});
