/**
 * otpService — provider selection, code checking, expiry, lockout.
 *
 * Pure logic with the Prisma client stubbed, so this runs with no network and no DB.
 * The behaviour under test is the fix for audit A-9: signup must work when Twilio is
 * absent, and must fail loudly rather than silently in production.
 */
const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');

const { prisma } = require('../db/prisma');
const otpService = require('./otpService');

// ---- stubs ----------------------------------------------------------------

let rows = [];
const originalOtp = prisma.otpCode;

function stubPrisma() {
  rows = [];
  prisma.otpCode = {
    create: async ({ data }) => { rows.push({ ...data }); return data; },
    updateMany: async ({ where, data }) => {
      rows.forEach((r) => {
        if (r.destination === where.destination && r.consumedAt == null) Object.assign(r, data);
      });
      return { count: 0 };
    },
    findFirst: async ({ where }) => {
      const list = where.destination.in;
      return (
        rows
          .filter((r) => list.includes(r.destination) && r.consumedAt == null && r.expiresAt > new Date())
          .sort((a, b) => b.expiresAt - a.expiresAt)[0] || null
      );
    },
    update: async ({ where, data }) => {
      const row = rows.find((r) => r.id === where.id);
      if (data.attempts?.increment) row.attempts += data.attempts.increment;
      if (data.consumedAt) row.consumedAt = data.consumedAt;
      return row;
    },
  };
}

function restorePrisma() { prisma.otpCode = originalOtp; }

const noTwilio = () => null;
const noEmail = () => null;
const withTwilio = () => ({
  verify: { v2: { services: () => ({
    verifications: { create: async () => ({ status: 'pending' }) },
    verificationChecks: { create: async ({ code }) => ({ status: code === '111111' ? 'approved' : 'denied' }) },
  }) } },
});

// ---- capabilities ----------------------------------------------------------

test('capabilities: twilio configured reports both channels', () => {
  const caps = otpService.getVerificationCapabilities({
    getTwilioClient: withTwilio, getEmailTransporter: noEmail,
  });
  assert.equal(caps.sms, true);
  assert.equal(caps.email, true);
  assert.equal(caps.provider, 'twilio');
});

test('capabilities: production with email only offers email, never sms', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const caps = otpService.getVerificationCapabilities({
    getTwilioClient: noTwilio, getEmailTransporter: () => ({}),
  });
  process.env.NODE_ENV = prev;
  // Nothing but Twilio can deliver an SMS — this is what stops the client from
  // dead-ending on the phone screen.
  assert.equal(caps.sms, false);
  assert.equal(caps.email, true);
  assert.equal(caps.provider, 'email');
});

test('capabilities: production with nothing configured offers neither', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const caps = otpService.getVerificationCapabilities({
    getTwilioClient: noTwilio, getEmailTransporter: noEmail,
  });
  process.env.NODE_ENV = prev;
  assert.equal(caps.sms, false);
  assert.equal(caps.email, false);
  assert.equal(caps.provider, 'none');
});

// ---- sending ---------------------------------------------------------------

test('sendOtp falls back to email when Twilio is absent', async () => {
  stubPrisma();
  let sentTo = null;
  let sentCode = null;
  const res = await otpService.sendOtp(
    { to: 'Person@Example.com', channel: 'email' },
    {
      getTwilioClient: noTwilio,
      getEmailTransporter: () => ({}),
      sendOtpEmail: async (to, code) => { sentTo = to; sentCode = code; },
    },
  );
  restorePrisma();
  assert.equal(res.provider, 'email');
  assert.equal(sentTo, 'person@example.com', 'email destination is normalized');
  assert.match(sentCode, /^\d{6}$/, 'a 6-digit code is generated');
});

test('sendOtp throws OTP_UNAVAILABLE in production with no provider', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  stubPrisma();
  await assert.rejects(
    () => otpService.sendOtp({ to: '+23057000000', channel: 'sms' }, {
      getTwilioClient: noTwilio, getEmailTransporter: noEmail, sendOtpEmail: async () => {},
    }),
    (err) => err.code === 'OTP_UNAVAILABLE',
  );
  restorePrisma();
  process.env.NODE_ENV = prev;
});

test('sendOtp uses the dev console when nothing is configured outside production', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  stubPrisma();
  const res = await otpService.sendOtp({ to: '+23057000000', channel: 'sms' }, {
    getTwilioClient: noTwilio, getEmailTransporter: noEmail, sendOtpEmail: async () => {},
  });
  restorePrisma();
  process.env.NODE_ENV = prev;
  assert.equal(res.provider, 'console');
});

// ---- verifying -------------------------------------------------------------

async function seed({ code = '123456', destination = 'a@b.com', attempts = 0, ttlMs = 60000 } = {}) {
  stubPrisma();
  rows.push({
    id: 'otp-1',
    destination,
    channel: 'email',
    codeHash: await bcrypt.hash(code, 4),
    attempts,
    expiresAt: new Date(Date.now() + ttlMs),
    consumedAt: null,
  });
}

const localDeps = { getTwilioClient: noTwilio, getEmailTransporter: () => ({}), sendOtpEmail: async () => {} };

test('verifyOtp accepts the right code and consumes it (single use)', async () => {
  await seed();
  assert.equal(await otpService.verifyOtp({ to: 'a@b.com', code: '123456' }, localDeps), true);
  // Replaying the same code must fail — the row is consumed.
  assert.equal(await otpService.verifyOtp({ to: 'a@b.com', code: '123456' }, localDeps), false);
  restorePrisma();
});

test('verifyOtp rejects a wrong code and counts the attempt', async () => {
  await seed();
  assert.equal(await otpService.verifyOtp({ to: 'a@b.com', code: '000000' }, localDeps), false);
  assert.equal(rows[0].attempts, 1);
  restorePrisma();
});

test('verifyOtp ignores an expired code', async () => {
  await seed({ ttlMs: -1000 });
  assert.equal(await otpService.verifyOtp({ to: 'a@b.com', code: '123456' }, localDeps), false);
  restorePrisma();
});

test('verifyOtp locks out after too many attempts', async () => {
  await seed({ attempts: otpService.MAX_ATTEMPTS });
  await assert.rejects(
    () => otpService.verifyOtp({ to: 'a@b.com', code: '123456' }, localDeps),
    (err) => err.code === 'OTP_LOCKED',
    'a correct code must not rescue a locked-out destination',
  );
  restorePrisma();
});

test('verifyOtp delegates to Twilio when configured', async () => {
  stubPrisma();
  const deps = { ...localDeps, getTwilioClient: withTwilio };
  assert.equal(await otpService.verifyOtp({ to: '+23057000000', code: '111111' }, deps), true);
  assert.equal(await otpService.verifyOtp({ to: '+23057000000', code: '222222' }, deps), false);
  restorePrisma();
});

test('generateCode always produces 6 digits', () => {
  for (let i = 0; i < 200; i++) {
    assert.match(otpService.generateCode(), /^\d{6}$/);
  }
});
