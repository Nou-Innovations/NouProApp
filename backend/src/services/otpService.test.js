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

/** Does a row satisfy a where clause? Handles both `destination: 'x'` and `destination: { in: [...] }`. */
function rowMatches(r, where = {}) {
  const destOk = where.destination?.in
    ? where.destination.in.includes(r.destination)
    : where.destination === undefined || r.destination === where.destination;
  if (!destOk) return false;
  if (where.consumedAt === null && r.consumedAt != null) return false;
  if (where.createdAt?.gt && !(r.createdAt > where.createdAt.gt)) return false;
  if (where.attempts?.gt !== undefined && !(r.attempts > where.attempts.gt)) return false;
  return true;
}

function stubPrisma() {
  rows = [];
  // ABUSE-3 added a module-level send throttle; clear it so tests don't throttle each other.
  otpService._resetSendHistory();
  prisma.otpCode = {
    // `attempts`, `consumedAt` and `createdAt` all have DB-side defaults, so the fake has
    // to supply them too — the ABUSE-3 attempt aggregation filters on createdAt.
    create: async ({ data }) => {
      const row = { attempts: 0, consumedAt: null, createdAt: new Date(), ...data };
      rows.push(row);
      return row;
    },
    updateMany: async ({ where, data }) => {
      let count = 0;
      rows.forEach((r) => {
        if (!rowMatches(r, where)) return;
        Object.assign(r, data);
        count++;
      });
      return { count };
    },
    findMany: async ({ where }) => rows.filter((r) => rowMatches(r, where)),
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

test('capabilities: email only offers email, never sms', () => {
  const prev = process.env.ALLOW_EMAIL_STUB;
  delete process.env.ALLOW_EMAIL_STUB;
  const caps = otpService.getVerificationCapabilities({
    getTwilioClient: noTwilio, getEmailTransporter: () => ({}),
  });
  if (prev === undefined) delete process.env.ALLOW_EMAIL_STUB; else process.env.ALLOW_EMAIL_STUB = prev;
  // Nothing but Twilio can deliver an SMS — this is what stops the client from
  // dead-ending on the phone screen.
  assert.equal(caps.sms, false);
  assert.equal(caps.email, true);
  assert.equal(caps.provider, 'email');
});

test('capabilities: nothing configured and no stub opt-in offers neither', () => {
  const prev = process.env.ALLOW_EMAIL_STUB;
  delete process.env.ALLOW_EMAIL_STUB;
  const caps = otpService.getVerificationCapabilities({
    getTwilioClient: noTwilio, getEmailTransporter: noEmail,
  });
  if (prev === undefined) delete process.env.ALLOW_EMAIL_STUB; else process.env.ALLOW_EMAIL_STUB = prev;
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

test('sendOtp throws OTP_UNAVAILABLE with no provider and no stub opt-in', async () => {
  const prev = process.env.ALLOW_EMAIL_STUB;
  delete process.env.ALLOW_EMAIL_STUB;
  stubPrisma();
  await assert.rejects(
    () => otpService.sendOtp({ to: '+23057000000', channel: 'sms' }, {
      getTwilioClient: noTwilio, getEmailTransporter: noEmail, sendOtpEmail: async () => {},
    }),
    (err) => err.code === 'OTP_UNAVAILABLE',
  );
  restorePrisma();
  if (prev === undefined) delete process.env.ALLOW_EMAIL_STUB; else process.env.ALLOW_EMAIL_STUB = prev;
});

// The console fallback is now an explicit opt-in rather than "any non-production
// NODE_ENV". Staging used to qualify, so it reported a code had been sent and only
// logged it — the signup half of A-12.
test('sendOtp refuses on staging (non-production, no stub opt-in, no provider)', async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevStub = process.env.ALLOW_EMAIL_STUB;
  process.env.NODE_ENV = 'staging';
  delete process.env.ALLOW_EMAIL_STUB;
  stubPrisma();
  await assert.rejects(
    () => otpService.sendOtp({ to: '+23057000000', channel: 'sms' }, {
      getTwilioClient: noTwilio, getEmailTransporter: noEmail, sendOtpEmail: async () => {},
    }),
    (err) => err.code === 'OTP_UNAVAILABLE',
  );
  restorePrisma();
  process.env.NODE_ENV = prevEnv;
  if (prevStub === undefined) delete process.env.ALLOW_EMAIL_STUB; else process.env.ALLOW_EMAIL_STUB = prevStub;
});

test('sendOtp uses the dev console when ALLOW_EMAIL_STUB is opted in', async () => {
  const prev = process.env.ALLOW_EMAIL_STUB;
  process.env.ALLOW_EMAIL_STUB = 'true';
  stubPrisma();
  const res = await otpService.sendOtp({ to: '+23057000000', channel: 'sms' }, {
    getTwilioClient: noTwilio, getEmailTransporter: noEmail, sendOtpEmail: async () => {},
  });
  restorePrisma();
  if (prev === undefined) delete process.env.ALLOW_EMAIL_STUB; else process.env.ALLOW_EMAIL_STUB = prev;
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
    createdAt: new Date(),
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

// ---------------------------------------------------------------------------
// ABUSE-3 — per-destination send throttle.
//
// send-phone-otp needs no login and nothing limited how often a given number could be
// targeted, so anyone could SMS-bomb a phone and burn Twilio credit. The IP-keyed route
// limiter does not help: the cost is per DESTINATION, and a distributed sender gets the
// full IP allowance from every address it controls.
// ---------------------------------------------------------------------------

test('a first send to a destination is always allowed', () => {
  otpService._resetSendHistory();
  assert.doesNotThrow(() => otpService.assertSendAllowed('+23050000001'));
});

test('a second send within the cooldown is refused', () => {
  otpService._resetSendHistory();
  const now = 1_000_000;
  otpService.assertSendAllowed('+23050000002', now);

  assert.throws(
    () => otpService.assertSendAllowed('+23050000002', now + 1000),
    (err) => err.code === 'OTP_THROTTLED',
    'a resend one second later must be throttled',
  );
});

test('a send after the cooldown is allowed again', () => {
  otpService._resetSendHistory();
  const now = 2_000_000;
  otpService.assertSendAllowed('+23050000003', now);
  assert.doesNotThrow(
    () => otpService.assertSendAllowed('+23050000003', now + otpService.SEND_COOLDOWN_MS + 1),
  );
});

test('the hourly cap holds even when the cooldown is respected', () => {
  otpService._resetSendHistory();
  const dest = '+23050000004';
  let now = 3_000_000;
  const step = otpService.SEND_COOLDOWN_MS + 1;

  for (let i = 0; i < otpService.SEND_MAX_PER_HOUR; i++) {
    otpService.assertSendAllowed(dest, now);
    now += step;
  }

  assert.throws(
    () => otpService.assertSendAllowed(dest, now),
    (err) => err.code === 'OTP_THROTTLED',
    `the ${otpService.SEND_MAX_PER_HOUR + 1}th send in the window must be refused`,
  );
});

test('the hourly cap is per destination — one target cannot block another', () => {
  otpService._resetSendHistory();
  let now = 4_000_000;
  const step = otpService.SEND_COOLDOWN_MS + 1;
  for (let i = 0; i < otpService.SEND_MAX_PER_HOUR; i++) {
    otpService.assertSendAllowed('+23050000005', now);
    now += step;
  }
  assert.doesNotThrow(() => otpService.assertSendAllowed('+23050000006', now));
});

test('the window slides — sends older than an hour stop counting', () => {
  otpService._resetSendHistory();
  const dest = '+23050000007';
  let now = 5_000_000;
  const step = otpService.SEND_COOLDOWN_MS + 1;
  for (let i = 0; i < otpService.SEND_MAX_PER_HOUR; i++) {
    otpService.assertSendAllowed(dest, now);
    now += step;
  }
  // Jump past the window; the earlier sends should have aged out.
  assert.doesNotThrow(() => otpService.assertSendAllowed(dest, now + 60 * 60 * 1000));
});

// ---------------------------------------------------------------------------
// ABUSE-3 — re-sending must NOT reset the attempt lockout.
//
// persistCode supersedes the previous live code and inserts a fresh row with
// attempts = 0, and verifyOtp used to read only the newest row. So MAX_ATTEMPTS really
// meant "5 guesses per send, unlimited sends" — an attacker grinding a 6-digit code just
// requested a new one every 5 tries. Attempts are now summed across the window.
// ---------------------------------------------------------------------------

test('re-sending a code does NOT reset the attempt lockout', async () => {
  stubPrisma();
  const dest = 'lockout@b.com';

  // Burn the whole allowance against the first code.
  rows.push({
    id: 'otp-burned',
    destination: dest,
    channel: 'email',
    codeHash: await bcrypt.hash('111111', 4),
    attempts: otpService.MAX_ATTEMPTS,
    expiresAt: new Date(Date.now() + 60000),
    consumedAt: null,
    createdAt: new Date(),
  });

  // Attacker requests a fresh code, which supersedes the old row and starts at attempts 0.
  await otpService.sendOtp({ to: dest, channel: 'email' }, localDeps);

  // Before the fix this returned false/true against the NEW row's own counter. It must
  // now stay locked, because the window still holds the earlier failures.
  await assert.rejects(
    () => otpService.verifyOtp({ to: dest, code: '000000' }, localDeps),
    (err) => err.code === 'OTP_LOCKED',
    'requesting a new code must not hand back a fresh set of guesses',
  );
  restorePrisma();
});

test('a successful verification clears the attempt window', async () => {
  stubPrisma();
  const dest = 'clears@b.com';

  // A couple of fumbles, then success — the user should not carry those into a later flow.
  rows.push({
    id: 'otp-ok',
    destination: dest,
    channel: 'email',
    codeHash: await bcrypt.hash('123456', 4),
    attempts: otpService.MAX_ATTEMPTS - 1,
    expiresAt: new Date(Date.now() + 60000),
    consumedAt: null,
    createdAt: new Date(),
  });

  assert.equal(await otpService.verifyOtp({ to: dest, code: '123456' }, localDeps), true);
  assert.equal(
    rows.reduce((sum, r) => sum + (r.attempts || 0), 0),
    0,
    'attempts in the window should be zeroed after a success',
  );
  restorePrisma();
});
