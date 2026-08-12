/**
 * connectionPair — one relationship is one row (audit C-7).
 *
 * The old `@@unique([senderId, receiverId])` is directional, so A->B and B->A could both
 * exist: connections were double-counted, and getStatus() returned whichever row it hit
 * first, so accept/reject could act on a row the UI wasn't showing. The canonical sorted
 * pair is what lets the DATABASE refuse the duplicate, rather than relying on a
 * check-then-write that isn't transactional.
 */
const test = require('node:test');
const assert = require('node:assert');

const { connectionPair } = require('./connectionRepo.prisma');

test('both directions produce the same pair', () => {
  const forward = connectionPair('usr-aaa', 'usr-bbb');
  const reverse = connectionPair('usr-bbb', 'usr-aaa');
  assert.deepStrictEqual(forward, reverse, 'A->B and B->A must collapse to one key');
});

test('the pair is sorted, so the unique index is stable', () => {
  const { pairAId, pairBId } = connectionPair('usr-zzz', 'usr-aaa');
  assert.equal(pairAId, 'usr-aaa');
  assert.equal(pairBId, 'usr-zzz');
  assert.ok(pairAId < pairBId);
});

test('distinct relationships keep distinct keys', () => {
  const ab = connectionPair('usr-a', 'usr-b');
  const ac = connectionPair('usr-a', 'usr-c');
  assert.notDeepStrictEqual(ab, ac);
});
