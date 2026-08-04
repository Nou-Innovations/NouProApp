#!/usr/bin/env node
/**
 * Rotate a user's password on the target database (safe to run against PRODUCTION).
 *
 * Why this exists: `prisma/seed.js` hashes the literal string "password" once and
 * reuses it for EVERY seeded user (seed.js:80, seed.js:117). Production was seeded
 * with that data, so every seeded account — including the admin — still logs in with
 * "password" until it is rotated.
 *
 * Unlike db:reset / prisma:seed this script is non-destructive (it only writes
 * passwordHash + tokenVersion), so it deliberately does NOT use guard-not-prod as a
 * gate. It warns loudly when the target is production and asks you to confirm.
 *
 * Usage (run from backend/):
 *   node scripts/rotate-password.js --audit
 *       Read-only. Lists every account whose password is still the seed default.
 *
 *   node scripts/rotate-password.js
 *       Rotates admin@nou.pro. Prompts for the new password (input is hidden).
 *
 *   node scripts/rotate-password.js --email someone@example.com
 *       Rotates a specific account.
 *
 *   node scripts/rotate-password.js --scramble-others
 *       Rotates the target account, then sets every OTHER still-default account to a
 *       random unguessable password. Demo/seed users nobody needs to log in as — this
 *       closes the hole without inventing 29 passwords. They can still use the app's
 *       "forgot password" flow if a real person ever needs one of them.
 *
 * The new password is never printed, logged, or passed on the command line.
 * Rotating bumps tokenVersion, which invalidates existing sessions/refresh tokens
 * (same mechanism as the app's own change-password route, server.js:1297).
 */
require('dotenv').config();

const readline = require('readline');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PROD_REFS } = require('./guard-not-prod');

// Prefer DIRECT_URL (session pooler, :5432) over DATABASE_URL (transaction pooler, :6543).
// 6543 is a non-standard port that some ISPs block outbound, and a direct session connection
// is the better fit for a one-off script anyway (no pgBouncer prepared-statement limits).
// Falls back to DATABASE_URL when DIRECT_URL isn't set.
function resolveConnection() {
  const direct = (process.env.DIRECT_URL || '').trim();
  if (direct) return { url: direct, source: 'DIRECT_URL' };
  const pooled = (process.env.DATABASE_URL || '').trim();
  return { url: pooled || null, source: pooled ? 'DATABASE_URL' : null };
}

const CONNECTION = resolveConnection();
const prisma = new PrismaClient(
  CONNECTION.url ? { datasources: { db: { url: CONNECTION.url } } } : undefined
);

const SEED_DEFAULT_PASSWORD = 'password'; // prisma/seed.js:80
const BCRYPT_ROUNDS = 12; // matches server.js (1296, 1405, 1505)
const DEFAULT_EMAIL = 'admin@nou.pro';

// Mirrors validatePassword() in server.js:1041. Kept in sync by hand: server.js is a
// monolith that starts a listener on require, so it cannot be imported from a script.
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
  if (!/\d/.test(password)) errors.push('one number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('one special character');
  if (password.length > 128) errors.push('at most 128 characters');
  return errors;
}

function parseArgs(argv) {
  const args = { audit: false, scrambleOthers: false, email: DEFAULT_EMAIL };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--audit') args.audit = true;
    else if (a === '--scramble-others') args.scrambleOthers = true;
    else if (a === '--email') args.email = (argv[++i] || '').trim();
    else if (a.startsWith('--email=')) args.email = a.slice('--email='.length).trim();
    else {
      console.error(`Unknown argument: ${a}`);
      console.error('Usage: node scripts/rotate-password.js [--audit] [--email <address>] [--scramble-others]');
      process.exit(1);
    }
  }
  return args;
}

function describeTarget() {
  const { url, source } = CONNECTION;
  if (!url) return { label: '(neither DIRECT_URL nor DATABASE_URL is set)', isProd: false };
  // Warn if EITHER configured URL points at production — both normally target the same project.
  const configured = [process.env.DATABASE_URL, process.env.DIRECT_URL].filter(Boolean);
  const isProd = PROD_REFS.some((ref) => configured.some((u) => u.includes(ref)));
  let label;
  try {
    const u = new URL(url);
    // host + port + db name only — never the credentials
    label = `${u.hostname}:${u.port || '5432'}${u.pathname}  (via ${source})`;
  } catch {
    label = `(unparseable ${source})`;
  }
  return { label, isProd };
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let promptWritten = false;
    // readline re-renders "prompt + typed text" on every keystroke. Let the prompt
    // through once, then swallow the rest so the password never reaches the screen.
    rl._writeToOutput = (str) => {
      if (!promptWritten) {
        rl.output.write(str);
        promptWritten = true;
      }
    };
    rl.question(question, (value) => {
      rl.output.write('\n');
      rl.close();
      resolve(value);
    });
  });
}

/** Every non-deleted account whose password is still the seed default. */
async function findDefaultPasswordUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, passwordHash: { not: null } },
    select: { id: true, email: true, name: true, passwordHash: true },
    orderBy: { email: 'asc' },
  });

  const stillDefault = [];
  for (const u of users) {
    if (await bcrypt.compare(SEED_DEFAULT_PASSWORD, u.passwordHash)) {
      stillDefault.push({ id: u.id, email: u.email, name: u.name });
    }
  }
  return { total: users.length, stillDefault };
}

async function runAudit() {
  console.log('Checking every account against the seed default password...\n');
  const { total, stillDefault } = await findDefaultPasswordUsers();

  if (stillDefault.length === 0) {
    console.log(`✓ None of the ${total} accounts with a password are still on the seed default.`);
    return;
  }

  console.log(`⚠️  ${stillDefault.length} of ${total} accounts still log in with "${SEED_DEFAULT_PASSWORD}":\n`);
  for (const u of stillDefault) {
    console.log(`    ${(u.email || '(no email)').padEnd(38)} ${u.name || ''}`);
  }
  console.log('\nRotate the important one:   node scripts/rotate-password.js --email <address>');
  console.log('Lock the rest out:          node scripts/rotate-password.js --scramble-others');
}

async function rotate({ email, scrambleOthers }) {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    console.error(`\n✗ No active account found with email "${email}".`);
    console.error('  Run with --audit to list the accounts on this database.\n');
    process.exitCode = 1;
    return;
  }

  console.log(`\nAccount: ${user.email}  (${user.name || 'no name'})  id=${user.id}`);

  const newPassword = await askHidden('New password (hidden): ');
  const errors = validatePassword(newPassword);
  if (errors.length > 0) {
    console.error(`\n✗ Password must contain ${errors.join(', ')}. Nothing was changed.\n`);
    process.exitCode = 1;
    return;
  }
  if (newPassword === SEED_DEFAULT_PASSWORD) {
    console.error('\n✗ That is the seed default. Nothing was changed.\n');
    process.exitCode = 1;
    return;
  }

  const confirmPassword = await askHidden('Confirm password (hidden): ');
  if (newPassword !== confirmPassword) {
    console.error('\n✗ Passwords do not match. Nothing was changed.\n');
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  console.log(`\n✓ Password updated for ${user.email}. Existing sessions were signed out.`);

  if (!scrambleOthers) return;

  const { stillDefault } = await findDefaultPasswordUsers();
  const others = stillDefault.filter((u) => u.id !== user.id);
  if (others.length === 0) {
    console.log('✓ No other accounts are on the seed default — nothing else to scramble.');
    return;
  }

  console.log(`\n${others.length} other accounts still use "${SEED_DEFAULT_PASSWORD}":`);
  for (const u of others) console.log(`    ${u.email || '(no email)'}`);
  const ok = await ask('\nSet all of them to a random password nobody knows? (yes/no): ');
  if (ok.toLowerCase() !== 'yes') {
    console.log('Skipped — those accounts were left unchanged.');
    return;
  }

  for (const u of others) {
    // Same idiom the account-deletion path uses to make a hash unusable (server.js:2216).
    const scrambled = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: scrambled, tokenVersion: { increment: 1 } },
    });
  }
  console.log(`✓ Scrambled ${others.length} accounts. They can recover via "forgot password" if ever needed.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = describeTarget();

  console.log(`\nDatabase: ${target.label}`);
  if (target.isProd) console.log('⚠️  This is the PRODUCTION database.');

  try {
    if (args.audit) {
      await runAudit();
      return;
    }

    if (!args.email) {
      console.error('✗ --email requires an address.\n');
      process.exitCode = 1;
      return;
    }

    if (target.isProd) {
      const ok = await ask('\nType "rotate" to change a password on production: ');
      if (ok !== 'rotate') {
        console.log('Aborted — nothing was changed.\n');
        return;
      }
    }

    await rotate(args);
    console.log('');
  } catch (e) {
    console.error('\n✗ Failed:', e.code || '', e.message, '\n');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

// Exported for tests. Requiring this file does not touch the database.
module.exports = { validatePassword, parseArgs, describeTarget, askHidden, SEED_DEFAULT_PASSWORD };
