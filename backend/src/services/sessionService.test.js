/**
 * sessionService — the rules that decide whether a device can still mint tokens.
 *
 * These cover the four audit findings this feature exists for: logging out on one device
 * must not touch the others (A-7), changing your password must revoke everyone EXCEPT the
 * caller (A-6), and a revoked/expired session must stop refreshing.
 */
const test = require('node:test');
const assert = require('node:assert');

const { prisma } = require('../db/prisma');
const sessionService = require('./sessionService');

// ---- stub ------------------------------------------------------------------

let rows = [];
const original = prisma.session;

function matches(row, where) {
  if (where.id) {
    if (typeof where.id === 'object' && where.id.not !== undefined) {
      if (row.id === where.id.not) return false;
    } else if (row.id !== where.id) return false;
  }
  if (where.userId && row.userId !== where.userId) return false;
  if (where.revokedAt === null && row.revokedAt !== null) return false;
  if (where.expiresAt?.gt && !(row.expiresAt > where.expiresAt.gt)) return false;
  return true;
}

function stub() {
  rows = [];
  prisma.session = {
    create: async ({ data }) => { rows.push({ revokedAt: null, ...data }); return rows[rows.length - 1]; },
    findUnique: async ({ where }) => rows.find((r) => r.id === where.id) || null,
    findMany: async ({ where }) => rows.filter((r) => matches(r, where)),
    update: async ({ where, data }) => {
      const row = rows.find((r) => r.id === where.id);
      Object.assign(row, data);
      return row;
    },
    updateMany: async ({ where, data }) => {
      let count = 0;
      rows.forEach((r) => { if (matches(r, where)) { Object.assign(r, data); count++; } });
      return { count };
    },
  };
}
function restore() { prisma.session = original; }

// ---- isUsable --------------------------------------------------------------

test('isUsable: a live session can refresh', () => {
  assert.equal(
    sessionService.isUsable({ revokedAt: null, expiresAt: new Date(Date.now() + 1000) }),
    true,
  );
});

test('isUsable: a revoked session cannot — this is what "sign out that device" relies on', () => {
  assert.equal(
    sessionService.isUsable({ revokedAt: new Date(), expiresAt: new Date(Date.now() + 100000) }),
    false,
  );
});

test('isUsable: an expired session cannot', () => {
  assert.equal(
    sessionService.isUsable({ revokedAt: null, expiresAt: new Date(Date.now() - 1000) }),
    false,
  );
});

test('isUsable: a missing session cannot', () => {
  assert.equal(sessionService.isUsable(null), false);
});

// ---- revocation ------------------------------------------------------------

test('A-7: revoking one device leaves the others signed in', async () => {
  stub();
  const phone = await sessionService.createSession({ userId: 'u1', deviceName: 'iPhone' });
  const laptop = await sessionService.createSession({ userId: 'u1', deviceName: 'iPad' });

  await sessionService.revoke(phone.id);

  assert.equal(sessionService.isUsable(await sessionService.getById(phone.id)), false);
  assert.equal(sessionService.isUsable(await sessionService.getById(laptop.id)), true,
    'the other device must survive — this is the whole point of A-7');
  restore();
});

test('A-6: change-password revokes every session EXCEPT the caller', async () => {
  stub();
  const caller = await sessionService.createSession({ userId: 'u1', deviceName: 'iPhone' });
  const other1 = await sessionService.createSession({ userId: 'u1', deviceName: 'iPad' });
  const other2 = await sessionService.createSession({ userId: 'u1', deviceName: 'Pixel' });
  const someoneElse = await sessionService.createSession({ userId: 'u2', deviceName: 'Other user' });

  await sessionService.revokeAllForUser('u1', { exceptSessionId: caller.id });

  assert.equal(sessionService.isUsable(await sessionService.getById(caller.id)), true,
    'the person who changed the password must stay signed in');
  assert.equal(sessionService.isUsable(await sessionService.getById(other1.id)), false);
  assert.equal(sessionService.isUsable(await sessionService.getById(other2.id)), false);
  assert.equal(sessionService.isUsable(await sessionService.getById(someoneElse.id)), true,
    'another user must never be affected');
  restore();
});

test('revokeAllForUser with no exception signs out everything (reset/deletion)', async () => {
  stub();
  await sessionService.createSession({ userId: 'u1' });
  await sessionService.createSession({ userId: 'u1' });
  const result = await sessionService.revokeAllForUser('u1');
  assert.equal(result.count, 2);
  restore();
});

test('listForUser hides revoked and expired sessions', async () => {
  stub();
  const live = await sessionService.createSession({ userId: 'u1', deviceName: 'Live' });
  const dead = await sessionService.createSession({ userId: 'u1', deviceName: 'Revoked' });
  await sessionService.revoke(dead.id);
  const expired = await sessionService.createSession({ userId: 'u1', deviceName: 'Expired' });
  await prisma.session.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

  const listed = await sessionService.listForUser('u1');
  assert.deepEqual(listed.map((s) => s.id), [live.id]);
  restore();
});

test('touch pushes the expiry window forward', async () => {
  stub();
  const s = await sessionService.createSession({ userId: 'u1' });
  const before = s.expiresAt;
  await new Promise((r) => setTimeout(r, 5));
  const after = await sessionService.touch(s.id);
  assert.ok(after.expiresAt > before, 'an actively used device should not expire mid-use');
  assert.ok(after.lastUsedAt instanceof Date);
  restore();
});

// ---- input handling --------------------------------------------------------

test('device labels are trimmed and length-capped (they are shown back to the user)', () => {
  assert.equal(sessionService.sanitizeLabel('  iPhone 15 Pro  '), 'iPhone 15 Pro');
  assert.equal(sessionService.sanitizeLabel('x'.repeat(500)).length, 60);
  assert.equal(sessionService.sanitizeLabel('   '), null);
  assert.equal(sessionService.sanitizeLabel(undefined), null);
  assert.equal(sessionService.sanitizeLabel(12345), null);
});

test('revoke tolerates a missing session id', async () => {
  stub();
  await assert.doesNotReject(() => sessionService.revoke(null));
  await assert.doesNotReject(() => sessionService.revoke(undefined));
  restore();
});
