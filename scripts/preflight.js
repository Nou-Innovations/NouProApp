#!/usr/bin/env node
/**
 * Preflight check — run this before `eas update` or `eas build`.
 *
 *   npm run preflight
 *
 * It blocks publishing if the code references a name that doesn't exist
 * (TypeScript error TS2304, "Cannot find name"). That is the one class of bug
 * that CRASHES the built app at launch on Hermes but is invisible in dev — e.g.
 * writing `alignItems: center` instead of `alignItems: 'center'`, or using a
 * variable/import that isn't defined. (That exact typo once froze the whole app.)
 *
 * It intentionally ignores the project's other pre-existing type errors so it
 * stays a fast, zero-noise gate. To see ALL type errors, run `npx tsc --noEmit`.
 */
const { execFileSync } = require('child_process');

console.log('🔎 Preflight: scanning for undefined-name typos (the kind that freeze the built app)…\n');

// Fixed command, no user input — run tsc via execFile (no shell) to stay
// injection-free. tsc exits non-zero when ANY type error exists; we capture its
// report either way and then keep only the TS2304 ("Cannot find name") lines.
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let output = '';
try {
  output = execFileSync(npx, ['tsc', '--noEmit'], { encoding: 'utf8' });
} catch (err) {
  output = `${err.stdout || ''}${err.stderr || ''}`;
}

const offenders = output
  .split('\n')
  .filter((line) => /error TS2304/.test(line))
  .map((line) => line.trim());

if (offenders.length > 0) {
  console.error(`❌ BLOCKED — found ${offenders.length} undefined name(s). Fix before publishing:\n`);
  offenders.forEach((line) => console.error(`   ${line}`));
  console.error(
    '\nThese crash the built (Hermes) app at launch — usually a missing quote around a\n' +
      "style value (e.g. center -> 'center') or a missing/typo'd import.\n"
  );
  process.exit(1);
}

console.log('✅ Preflight passed — no undefined-name typos. Safe to publish.\n');
