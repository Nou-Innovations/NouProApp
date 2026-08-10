/**
 * Per-device sessions.
 *
 * `tokenVersion` used to be the only revocation mechanism, and it is global — so logging
 * out on one device signed you out everywhere (audit A-7), and changing your password
 * silently signed YOU out ~30 minutes later (A-6). Refresh tokens now carry a `sid` and
 * revocation happens per row.
 *
 * `tokenVersion` is kept for the genuinely global cases (password reset, account
 * deletion) and as the fallback for refresh tokens minted before sessions existed.
 *
 * NOTE: no refresh-token hash and no reuse detection here, on purpose. The client writes
 * rotated tokens to SecureStore fire-and-forget and two code paths bypass its
 * single-flight refresh lock, so invalidate-on-use would turn ordinary races into false
 * "token theft" logouts.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');

/** Matches the refresh token's own lifetime. */
const SESSION_TTL_DAYS = 30;

function expiryFromNow(now = new Date()) {
  return new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Trim client-supplied device labels — they are displayed back to the user. */
function sanitizeLabel(value, max = 60) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

async function createSession({ userId, deviceName, platform }) {
  return prisma.session.create({
    data: {
      id: `ses-${crypto.randomUUID()}`,
      userId,
      deviceName: sanitizeLabel(deviceName),
      platform: sanitizeLabel(platform, 16),
      expiresAt: expiryFromNow(),
    },
  });
}

/** A session can mint new access tokens only while it is neither revoked nor expired. */
function isUsable(session, now = new Date()) {
  if (!session) return false;
  if (session.revokedAt) return false;
  return session.expiresAt > now;
}

async function getById(sessionId) {
  if (!sessionId) return null;
  return prisma.session.findUnique({ where: { id: sessionId } });
}

/** Record activity and push the expiry window forward on every successful refresh. */
async function touch(sessionId) {
  const now = new Date();
  return prisma.session.update({
    where: { id: sessionId },
    data: { lastUsedAt: now, expiresAt: expiryFromNow(now) },
  });
}

async function revoke(sessionId) {
  if (!sessionId) return null;
  return prisma.session
    .updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } })
    .catch(() => null);
}

/**
 * Revoke a user's sessions.
 * @param {string} userId
 * @param {{ exceptSessionId?: string }} opts  keep the caller signed in (password change)
 */
async function revokeAllForUser(userId, { exceptSessionId } = {}) {
  return prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

/** Live sessions, most recently used first. */
async function listForUser(userId) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: 'desc' },
  });
}

module.exports = {
  SESSION_TTL_DAYS,
  createSession,
  isUsable,
  getById,
  touch,
  revoke,
  revokeAllForUser,
  listForUser,
  // exported for tests
  sanitizeLabel,
  expiryFromNow,
};
