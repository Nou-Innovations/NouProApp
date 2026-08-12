/**
 * OTP delivery and verification.
 *
 * Why this exists: Twilio Verify used to be the only provider, and email OTP went
 * through the SAME Verify service (channel:'email'). So an unconfigured Twilio meant
 * every OTP endpoint 503'd at once and signup became impossible in every build profile
 * — including TestFlight, where the client-side dev bypass is disabled (audit A-9).
 *
 * Provider order:
 *   1. Twilio Verify  — when configured. Twilio owns and checks the code.
 *   2. SMTP email     — reuses the transport that already sends password resets. We
 *                       generate the code, store its hash, and check it ourselves.
 *   3. Console        — development only: same as (2) but logged instead of sent.
 *   4. none           — throw OtpUnavailableError; routes turn it into a 503.
 *
 * Two rules that must not be relaxed:
 *   - The code is NEVER returned in an HTTP response (it would leak into Sentry
 *     breadcrumbs, network logs, and any demo build pointed at production).
 *   - There is NEVER a hardcoded code. A fixed value on the server is a master key for
 *     every account.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { prisma } = require('../db/prisma');
const logger = require('../utils/logger');

const CODE_TTL_MS = 10 * 60 * 1000;
/** Twilio used to throttle for us. The IP-keyed limiter is not enough on its own:
 *  a carrier's CGNAT shares one bucket, while a distributed attacker gets the full
 *  allowance per IP against a 6-digit code. */
const MAX_ATTEMPTS = 5;
/** Window over which failed attempts are summed for a destination (see ABUSE-3). */
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

class OtpUnavailableError extends Error {
  constructor(channel) {
    super(
      channel === 'sms'
        ? 'SMS verification is not available right now.'
        : 'Email verification is not available right now.',
    );
    this.name = 'OtpUnavailableError';
    this.code = 'OTP_UNAVAILABLE';
  }
}

/** Uniformly formatted 6-digit code. crypto, not Math.random. */
function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function normalizeDestination(to, channel) {
  const value = String(to || '').trim();
  return channel === 'email' ? value.toLowerCase() : value;
}

/**
 * Which channels can actually reach a user right now.
 * The client calls this BEFORE collecting a code, so it can route to a channel that
 * works instead of dead-ending on a 503.
 */
function getVerificationCapabilities({ getTwilioClient, getEmailTransporter }) {
  const hasTwilio = !!getTwilioClient();
  const hasEmail = !!getEmailTransporter();
  const devConsole = process.env.NODE_ENV !== 'production';
  return {
    // Only Twilio can send an SMS. Email/console cannot stand in for a phone number.
    sms: hasTwilio || devConsole,
    email: hasTwilio || hasEmail || devConsole,
    // Surfaced for diagnostics; the client only needs the two booleans above.
    provider: hasTwilio ? 'twilio' : hasEmail ? 'email' : devConsole ? 'console' : 'none',
  };
}

/**
 * SECURITY (ABUSE-3): per-destination send throttle.
 *
 * `POST /api/auth/send-phone-otp` needs no login, and nothing here limited how often a
 * given number could be targeted — so anyone could SMS-bomb an arbitrary phone and burn
 * Twilio credit. The IP-keyed route limiter does not help: the cost is per DESTINATION,
 * and a distributed sender gets the full IP allowance from every address it controls.
 *
 * In-memory on purpose. This is a cost guard over a short window, so a process restart
 * costs at most one extra message — whereas the brute-force guard (attempt counting) is
 * DB-backed precisely because it must survive restarts. Not shared across Render
 * instances; same known gap as the login lockout, tracked as ABUSE-5.
 *
 * Bounded like recordFailedLogin: the keys are attacker-supplied, so the map needs a
 * ceiling or it becomes a memory-growth vector.
 */
const SEND_COOLDOWN_MS = 60 * 1000;
const SEND_MAX_PER_HOUR = 10;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_THROTTLE_ENTRIES = 10000;
/** destination -> { last: epochMs, times: epochMs[] } */
const sendHistory = new Map();

class OtpThrottledError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OtpThrottledError';
    this.code = 'OTP_THROTTLED';
  }
}

function pruneSendHistory(now) {
  if (sendHistory.size < MAX_THROTTLE_ENTRIES) return;
  for (const [key, entry] of sendHistory) {
    if (now - entry.last >= SEND_WINDOW_MS) sendHistory.delete(key);
  }
  // Map preserves insertion order, so the first key is the least recently added.
  while (sendHistory.size >= MAX_THROTTLE_ENTRIES) {
    const oldest = sendHistory.keys().next().value;
    if (oldest === undefined) break;
    sendHistory.delete(oldest);
  }
}

/**
 * Throws OtpThrottledError if this destination has been messaged too recently or too
 * often. Records the send otherwise. Must be called ABOVE the provider branch — the
 * Twilio path returns early without touching the database, so a DB-backed counter would
 * silently not cover the expensive channel.
 */
function assertSendAllowed(destination, now = Date.now()) {
  pruneSendHistory(now);
  const entry = sendHistory.get(destination) || { last: 0, times: [] };

  if (entry.last && now - entry.last < SEND_COOLDOWN_MS) {
    const wait = Math.ceil((SEND_COOLDOWN_MS - (now - entry.last)) / 1000);
    throw new OtpThrottledError(`Please wait ${wait}s before requesting another code.`);
  }

  const recent = entry.times.filter((t) => now - t < SEND_WINDOW_MS);
  if (recent.length >= SEND_MAX_PER_HOUR) {
    throw new OtpThrottledError('Too many codes requested for this destination. Try again later.');
  }

  recent.push(now);
  sendHistory.set(destination, { last: now, times: recent });
}

/** Test seam: drop all throttle state. */
function _resetSendHistory() {
  sendHistory.clear();
}

/** Store a freshly generated code, superseding any previous live code for the same destination. */
async function persistCode(destination, channel, code) {
  await prisma.otpCode.updateMany({
    where: { destination, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.otpCode.create({
    data: {
      id: `otp-${crypto.randomUUID()}`,
      destination,
      channel,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
}

/**
 * Send a verification code.
 * @param {object} deps  { getTwilioClient, getEmailTransporter, sendOtpEmail }
 * @returns {Promise<{ provider: string }>}
 */
async function sendOtp({ to, channel }, deps) {
  const destination = normalizeDestination(to, channel);
  if (!destination) throw new Error('A destination is required');

  // SECURITY (ABUSE-3): ABOVE the provider branch on purpose — Twilio returns early
  // without persisting anything, so a DB-backed guard would miss the paid channel.
  assertSendAllowed(destination);

  const client = deps.getTwilioClient();
  if (client) {
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: destination, channel });
    return { provider: 'twilio' };
  }

  // No Twilio. An SMS cannot be delivered by any other means, so an sms request can
  // only fall through to the dev console — callers should consult
  // getVerificationCapabilities() and steer the user to email instead.
  const transporter = deps.getEmailTransporter();
  const code = generateCode();

  if (channel === 'email' && transporter) {
    await persistCode(destination, channel, code);
    await deps.sendOtpEmail(destination, code);
    return { provider: 'email' };
  }

  if (process.env.NODE_ENV !== 'production') {
    await persistCode(destination, channel, code);
    // Development only. Deliberately logged rather than returned.
    logger.info(`[OTP] (dev) Verification code for ${destination}: ${code}`);
    return { provider: 'console' };
  }

  throw new OtpUnavailableError(channel);
}

/**
 * Check a code. Returns true when it matches a live, unconsumed code.
 * Throws OtpUnavailableError only when no provider exists at all.
 */
async function verifyOtp({ to, code }, deps) {
  const destinationEmail = normalizeDestination(to, 'email');
  const destinationRaw = normalizeDestination(to, 'sms');

  const client = deps.getTwilioClient();
  if (client) {
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: destinationRaw, code });
    return check.status === 'approved';
  }

  // Match either normalization so an email typed with capitals still verifies.
  const record = await prisma.otpCode.findFirst({
    where: {
      destination: { in: [destinationRaw, destinationEmail] },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    if (process.env.NODE_ENV === 'production' && !deps.getEmailTransporter()) {
      throw new OtpUnavailableError('email');
    }
    return false;
  }

  // SECURITY (ABUSE-3): count attempts across the whole window, not just this row.
  //
  // persistCode supersedes the previous live code and inserts a fresh row with
  // attempts = 0, and this function only ever read the newest row — so MAX_ATTEMPTS
  // really meant "5 guesses per send, unlimited sends". Requesting a new code reset the
  // lockout, which is precisely what an attacker grinding a 6-digit code would do.
  //
  // Superseded rows keep their `attempts`, so the history is already in the table; this
  // sums it. DB-backed rather than in-memory because a brute-force guard must survive a
  // restart. Same dual normalization as the lookup above, or varying an email's case
  // would sidestep the counter.
  const windowStart = new Date(Date.now() - ATTEMPT_WINDOW_MS);
  const recentRows = await prisma.otpCode.findMany({
    where: {
      destination: { in: [destinationRaw, destinationEmail] },
      createdAt: { gt: windowStart },
    },
    select: { attempts: true },
  });
  const attemptsInWindow = recentRows.reduce((sum, r) => sum + (r.attempts || 0), 0);

  if (attemptsInWindow >= MAX_ATTEMPTS) {
    const err = new Error('Too many incorrect attempts. Request a new code.');
    err.code = 'OTP_LOCKED';
    throw err;
  }

  const ok = await bcrypt.compare(String(code || ''), record.codeHash);
  if (!ok) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  // Single use.
  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  // Clear the attempt window on success. Without this, someone who fumbled a code, then
  // succeeded, then legitimately needed another one (changing their email twice, say)
  // would carry the earlier misses into the next flow and lock themselves out.
  await prisma.otpCode.updateMany({
    where: {
      destination: { in: [destinationRaw, destinationEmail] },
      createdAt: { gt: new Date(Date.now() - ATTEMPT_WINDOW_MS) },
      attempts: { gt: 0 },
    },
    data: { attempts: 0 },
  });
  return true;
}

module.exports = {
  sendOtp,
  verifyOtp,
  getVerificationCapabilities,
  OtpUnavailableError,
  OtpThrottledError,
  MAX_ATTEMPTS,
  CODE_TTL_MS,
  ATTEMPT_WINDOW_MS,
  SEND_COOLDOWN_MS,
  SEND_MAX_PER_HOUR,
  // exported for tests
  generateCode,
  normalizeDestination,
  assertSendAllowed,
  _resetSendHistory,
};
