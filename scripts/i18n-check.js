#!/usr/bin/env node
/**
 * Translation check.
 *
 *   npm run i18n:check
 *
 * There are no frontend tests and no jest config in this project, so this and `tsc` are
 * the whole automated net for the translation layer. It answers the two questions that
 * actually go wrong:
 *
 *   1. Do the locale files agree? A key present in one and missing from the other means
 *      a string that silently falls back — or, worse, a key nobody will ever fill in
 *      because it isn't in the French file to see.
 *   2. How much French is actually written? Values in fr.json start as the English text
 *      (deliberately — see the file's _README), so "still identical to English" is the
 *      honest measure of what is left, and the only one that can't be faked.
 *
 * Exits non-zero on a structural problem (missing/orphan/empty keys). Untranslated
 * values are reported but do NOT fail: French is meant to land incrementally, and a
 * gate that blocks every commit until 100% is a gate people delete.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'shared', 'i18n', 'locales');
const BASE = 'en';

/** Flatten nested objects to dotted keys, skipping the `_README` block. */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_README') continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function load(locale) {
  const file = path.join(DIR, `${locale}.json`);
  try {
    return flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (err) {
    console.error(`✗ Could not read ${locale}.json — ${err.message}`);
    process.exit(1);
  }
}

const locales = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

const base = load(BASE);
const baseKeys = Object.keys(base);
let failed = false;

console.log(`\nTranslations — ${baseKeys.length} keys in ${BASE}.json\n`);

for (const locale of locales) {
  if (locale === BASE) continue;
  const target = load(locale);
  const targetKeys = Object.keys(target);

  const missing = baseKeys.filter((k) => !(k in target));
  const orphan = targetKeys.filter((k) => !(k in base));
  const empty = targetKeys.filter((k) => typeof target[k] === 'string' && !target[k].trim());
  const untranslated = baseKeys.filter((k) => k in target && target[k] === base[k]);

  // A placeholder present in English but dropped in translation renders a literal
  // "{{name}}" to the user — worth catching, because it looks like a bug, not a gap.
  const placeholderMismatch = baseKeys
    .filter((k) => k in target && target[k] !== base[k])
    .filter((k) => {
      const of = (s) => (String(s).match(/\{\{\s*\w+\s*\}\}/g) || []).sort().join(',');
      return of(base[k]) !== of(target[k]);
    });

  const done = baseKeys.length - untranslated.length - missing.length;
  const pct = baseKeys.length ? Math.round((done / baseKeys.length) * 100) : 0;

  console.log(`  ${locale}: ${done}/${baseKeys.length} translated (${pct}%)`);

  const report = (label, list) => {
    if (!list.length) return;
    console.log(`    ${label} (${list.length}):`);
    for (const k of list.slice(0, 15)) console.log(`      ${k}`);
    if (list.length > 15) console.log(`      … and ${list.length - 15} more`);
  };

  if (missing.length) { failed = true; report('✗ MISSING — will fall back to English', missing); }
  if (orphan.length) { failed = true; report(`✗ ORPHAN — not in ${BASE}.json`, orphan); }
  if (empty.length) { failed = true; report('✗ EMPTY — renders as blank text', empty); }
  if (placeholderMismatch.length) { failed = true; report('✗ PLACEHOLDER MISMATCH', placeholderMismatch); }
  if (untranslated.length) report('· still English', untranslated);
  console.log('');
}

if (failed) {
  console.error('✗ Locale files are out of sync. Fix the items marked ✗ above.\n');
  process.exit(1);
}
console.log('✓ Locale files are structurally sound.\n');
