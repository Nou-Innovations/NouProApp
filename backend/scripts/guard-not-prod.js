#!/usr/bin/env node
/**
 * Safety guard for destructive database commands (db:reset, prisma:seed).
 *
 * The seed wipes every table and `prisma migrate reset` drops the whole schema.
 * Running either against the live NouPro database would destroy production data.
 * This guard refuses to run when DATABASE_URL / DIRECT_URL point at a known
 * production Supabase project.
 *
 * Usage:
 *   - As a CLI gate:  `node scripts/guard-not-prod.js && <destructive command>`
 *   - As a module:    `require('../scripts/guard-not-prod')()` (e.g. at the top of seed.js)
 *
 * To run db:reset/seed against a throwaway DB, set DATABASE_URL/DIRECT_URL in the
 * shell to the throwaway connection string (shell env wins over .env via dotenv).
 */
require('dotenv').config();

// Known production Supabase project ref(s). Add more here if prod ever moves.
const PROD_REFS = ['vxmfbaalnzcdotjfjbce'];

function assertNotProd() {
  const urls = [process.env.DATABASE_URL, process.env.DIRECT_URL].filter(Boolean);
  const matchedRef = PROD_REFS.find((ref) => urls.some((u) => u.includes(ref)));

  if (matchedRef) {
    console.error('\n⛔  REFUSING destructive DB command — target looks like PRODUCTION.');
    console.error(`    DATABASE_URL/DIRECT_URL contains the production project ref "${matchedRef}".`);
    console.error('    db:reset and prisma:seed WIPE all data; never run them against the live DB.');
    console.error('    Point DATABASE_URL/DIRECT_URL at a local or throwaway database instead.\n');
    process.exit(1);
  }
}

if (require.main === module) {
  assertNotProd();
  console.log('✓ guard-not-prod: target database is not production — safe to proceed.');
}

module.exports = assertNotProd;
