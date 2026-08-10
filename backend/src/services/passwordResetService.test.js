'use strict';

/**
 * Single-use password-reset tokens (audit AUTH-3).
 *
 * The bug: the reset token was a bare JWT with nothing persisted, so the emailed link
 * worked REPEATEDLY for its full 15 minutes. Anyone who saw the link — mail scanner,
 * Referer leak, shared inbox — could replay it, and could do so WITHOUT resetting the
 * password, so the victim never noticed.
 *
 * These tests pin the four properties that make replay impossible: single use, atomic
 * under concurrency, expiry honoured, and superseded-by-a-newer-request. Prisma is faked
 * with an in-memory table so this stays a pure unit test — no DB, no network.
 */

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// ---------------------------------------------------------------------------
// Minimal in-memory stand-in for prisma.passwordResetToken, modelling only the
// semantics the service relies on: updateMany returns { count }, and the WHERE is
// evaluated at write time (which is what makes the conditional update atomic).
// ---------------------------------------------------------------------------
let rows = [];

function matches(row, where = {}) {
  if (where.tokenHash !== undefined && row.tokenHash !== where.tokenHash) return false;
  if (where.userId !== undefined && row.userId !== where.userId) return false;
  if (where.consumedAt === null && row.consumedAt !== null) return false;
  if (where.expiresAt?.gt !== undefined && !(row.expiresAt > where.expiresAt.gt)) return false;
  if (where.expiresAt?.lt !== undefined && !(row.expiresAt < where.expiresAt.lt)) return false;
  return true;
}

const fakePrisma = {
  passwordResetToken: {
    async create({ data }) {
      const row = { consumedAt: null, createdAt: new Date(), ...data };
      rows.push(row);
      return row;
    },
    async updateMany({ where, data }) {
      let count = 0;
      for (const row of rows) {
        if (matches(row, where)) { Object.assign(row, data); count++; }
      }
      return { count };
    },
    async findFirst({ where }) {
      const hits = rows.filter((r) => matches(r, where));
      hits.sort((a, b) => b.createdAt - a.createdAt);
      return hits[0] || null;
    },
    async deleteMany({ where }) {
      const before = rows.length;
      rows = rows.filter((r) => !matches(r, where));
      return { count: before - rows.length };
    },
  },
};

// Inject the fake before the service is required.
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '../db/prisma') return { prisma: fakePrisma };
  return originalLoad.apply(this, arguments);
};
const passwordResetService = require('./passwordResetService');
Module._load = originalLoad;

beforeEach(() => { rows = []; });

const USER = 'user-1';

test('a freshly issued token can be consumed exactly once', async () => {
  await passwordResetService.issue(USER, 'tok-A');

  assert.equal(await passwordResetService.consume('tok-A'), USER, 'first use should succeed');
  assert.equal(await passwordResetService.consume('tok-A'), null, 'replay must fail');
  assert.equal(await passwordResetService.consume('tok-A'), null, 'and keep failing');
});

test('the raw token is never stored — only its hash', async () => {
  await passwordResetService.issue(USER, 'tok-secret');
  const serialized = JSON.stringify(rows);
  assert.ok(!serialized.includes('tok-secret'), 'raw token must not appear in the row');
  assert.ok(serialized.includes(passwordResetService.hashToken('tok-secret')), 'hash should be stored');
});

test('concurrent redemptions: exactly one wins', async () => {
  await passwordResetService.issue(USER, 'tok-race');

  const results = await Promise.all([
    passwordResetService.consume('tok-race'),
    passwordResetService.consume('tok-race'),
    passwordResetService.consume('tok-race'),
  ]);

  const winners = results.filter((r) => r === USER);
  assert.equal(winners.length, 1, `exactly one redemption should win, got ${winners.length}`);
});

test('an expired token is rejected', async () => {
  const past = new Date(Date.now() - 60_000);
  await passwordResetService.issue(USER, 'tok-old', { ttlMs: 1, now: new Date(past.getTime() - 1) });

  assert.equal(await passwordResetService.consume('tok-old'), null);
});

test('requesting a new link supersedes the previous one', async () => {
  await passwordResetService.issue(USER, 'tok-first');
  await passwordResetService.issue(USER, 'tok-second');

  assert.equal(await passwordResetService.consume('tok-first'), null, 'old link must be dead');
  assert.equal(await passwordResetService.consume('tok-second'), USER, 'newest link should work');
});

test('superseding is scoped to the user — one person resetting does not break another', async () => {
  await passwordResetService.issue('user-A', 'tok-A');
  await passwordResetService.issue('user-B', 'tok-B');

  assert.equal(await passwordResetService.consume('tok-A'), 'user-A');
  assert.equal(await passwordResetService.consume('tok-B'), 'user-B');
});

test('an unknown token is rejected without throwing', async () => {
  assert.equal(await passwordResetService.consume('never-issued'), null);
});

test('pruneExpired removes only expired rows', async () => {
  await passwordResetService.issue('user-A', 'tok-live');
  await passwordResetService.issue('user-B', 'tok-dead', { ttlMs: 1, now: new Date(Date.now() - 60_000) });

  const { count } = await passwordResetService.pruneExpired();
  assert.equal(count, 1);
  assert.equal(await passwordResetService.consume('tok-live'), 'user-A', 'live token survives pruning');
});
