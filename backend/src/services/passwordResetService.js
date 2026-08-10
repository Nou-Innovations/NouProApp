/**
 * Single-use password-reset tokens (audit AUTH-3).
 *
 * The reset token itself stays a JWT — that gives us signature and expiry for free, and
 * keeps the existing `/reset-password` contract intact. What a JWT cannot do is be
 * *consumed*: nothing was persisted, so the emailed link kept working for its entire
 * 15-minute window. Anyone who saw the link — a mail scanner, a Referer leak from the
 * reset page, a shared or briefly-accessed inbox — could replay it, and could do so
 * without resetting the password, so the victim never noticed. The `tokenVersion` bump on
 * reset did not help: the reset token carries no `tv` claim to compare against.
 *
 * This table is the missing half. Two rules that must not be relaxed:
 *   - Only the SHA-256 of the token is stored. This table must never become a second
 *     copy of a live credential — a leaked backup should not hand over reset links.
 *   - Consumption is a CONDITIONAL update, not read-then-write. `updateMany` with
 *     `consumedAt: null` in the WHERE is atomic in Postgres, so two concurrent
 *     redemptions cannot both win, and we need no explicit transaction.
 *
 * SHA-256 (not bcrypt) is deliberate here, unlike OtpCode: the token is 200+ bits of
 * JWT, not a 6-digit code, so there is no brute-force surface for a slow hash to defend.
 * A fast hash also keeps the redemption lookup a single indexed query.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');

/** Matches the `expiresIn: '15m'` on the reset JWT. Kept here so the row cannot outlive it. */
const RESET_TTL_MS = 15 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Record a freshly-minted reset token so it can be consumed exactly once.
 *
 * Supersedes the user's other live tokens (same trick as otpService.persistCode): if you
 * request a second reset link, the first one stops working. Without this, every link ever
 * requested stays redeemable until its own expiry.
 *
 * @param {string} userId
 * @param {string} token - the raw JWT; only its hash is stored
 * @param {{ ttlMs?: number, now?: Date }} [opts]
 */
async function issue(userId, token, { ttlMs = RESET_TTL_MS, now = new Date() } = {}) {
  await prisma.passwordResetToken.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: now },
  });

  return prisma.passwordResetToken.create({
    data: {
      id: `prt-${crypto.randomUUID()}`,
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + ttlMs),
    },
  });
}

/**
 * Atomically consume a reset token.
 *
 * Returns the userId on success, or null if the token is unknown, already used, expired,
 * or superseded. Callers must treat null as "invalid or expired link" and must NOT
 * distinguish the reasons to the client — each distinction is an oracle.
 *
 * @param {string} token - the raw JWT presented by the client
 * @param {{ now?: Date }} [opts]
 * @returns {Promise<string|null>} userId when this call is the one that consumed it
 */
async function consume(token, { now = new Date() } = {}) {
  const tokenHash = hashToken(token);

  // Read first only to recover the userId for the caller; the authority is the
  // conditional update below, so a race here is harmless.
  const row = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;

  const claimed = await prisma.passwordResetToken.updateMany({
    where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
    data: { consumedAt: now },
  });

  // Exactly one row may transition to consumed. Zero means someone (or something) got
  // there first, or it had already expired.
  return claimed.count === 1 ? row.userId : null;
}

/** Housekeeping for a future pruning job; not wired to a schedule yet. */
async function pruneExpired({ now = new Date() } = {}) {
  return prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } });
}

module.exports = {
  issue,
  consume,
  pruneExpired,
  hashToken,
  RESET_TTL_MS,
};
