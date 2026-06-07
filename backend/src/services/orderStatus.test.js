/**
 * Smoke tests for the Order status state machine (single source of truth).
 *
 * Pure transition logic only — no database is touched. The service module
 * transitively constructs a PrismaClient at import time, which requires a
 * datasource URL to be present (it does NOT connect until a query runs), so we
 * set harmless dummy values before requiring it.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/noupro_test';
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ORDER_STATUS,
  ALLOWED_TRANSITIONS,
  isValidTransition,
  getValidNextStatuses,
  isFinalStatus,
  requiresReason,
  canEditInStatus,
} = require('./orderStatus');

test('valid forward transitions are allowed', () => {
  assert.ok(isValidTransition('NEW', 'ACCEPTED'));
  assert.ok(isValidTransition('ACCEPTED', 'ONGOING'));
  assert.ok(isValidTransition('ONGOING', 'DONE'));
  assert.ok(isValidTransition('PENDING', 'ACCEPTED'));
  assert.ok(isValidTransition('IN_REVIEW', 'DONE'));
});

test('invalid transitions are rejected', () => {
  assert.equal(isValidTransition('NEW', 'DONE'), false); // can't skip straight to done
  assert.equal(isValidTransition('DONE', 'NEW'), false); // terminal
  assert.equal(isValidTransition('CANCELED', 'ACCEPTED'), false);
  assert.equal(isValidTransition('REJECTED', 'NEW'), false);
});

test('terminal states have no outgoing transitions and are final', () => {
  for (const s of ['DONE', 'CANCELED', 'REJECTED']) {
    assert.deepEqual(getValidNextStatuses(s), []);
    assert.ok(isFinalStatus(s), `${s} should be final`);
  }
});

test('cancel/reject/pending require a reason; accept does not', () => {
  assert.ok(requiresReason('CANCELED'));
  assert.ok(requiresReason('REJECTED'));
  assert.ok(requiresReason('PENDING'));
  assert.equal(requiresReason('ACCEPTED'), false);
});

test('blocksEdits: NEW is editable, ACCEPTED/ONGOING are not', () => {
  assert.equal(canEditInStatus('NEW'), true);
  assert.equal(canEditInStatus('ACCEPTED'), false);
  assert.equal(canEditInStatus('ONGOING'), false);
});

test('every status has an entry in the transition map', () => {
  for (const s of Object.values(ORDER_STATUS)) {
    assert.ok(Array.isArray(ALLOWED_TRANSITIONS[s]), `missing transitions for ${s}`);
  }
});

test('unknown status: no transitions, not final, not blocking', () => {
  assert.deepEqual(getValidNextStatuses('BOGUS'), []);
  assert.equal(isValidTransition('BOGUS', 'NEW'), false);
  assert.equal(isFinalStatus('BOGUS'), false);
  assert.equal(canEditInStatus('BOGUS'), true);
});
