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

  if (record.attempts >= MAX_ATTEMPTS) {
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
  return true;
}

module.exports = {
  sendOtp,
  verifyOtp,
  getVerificationCapabilities,
  OtpUnavailableError,
  MAX_ATTEMPTS,
  CODE_TTL_MS,
  // exported for tests
  generateCode,
  normalizeDestination,
};
