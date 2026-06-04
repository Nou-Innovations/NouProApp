#!/usr/bin/env node
/**
 * Reads the production `_prisma_migrations` bookkeeping table and writes it to
 * prisma/_prisma_migrations_backup.json. This is the rollback artifact for the
 * 2026-06 migration re-baseline (P0-3): if the metadata reconciliation needs to
 * be undone, the rows in this file can be re-inserted.
 *
 * Read-only: it only runs SELECT. It does NOT modify the database.
 * Uses the Prisma client (handles Supabase SSL/pooling automatically).
 *
 * Run:  node scripts/backup-prisma-migrations.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM "_prisma_migrations" ORDER BY started_at');

  const outPath = path.join(__dirname, '..', 'prisma', '_prisma_migrations_backup.json');
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));

  console.log(`Backed up ${rows.length} _prisma_migrations row(s) -> ${outPath}`);
  console.log('Migration names currently recorded in the DB:');
  rows.forEach((r) =>
    console.log(`  - ${r.migration_name}  (applied: ${r.finished_at ? 'yes' : 'NO/rolled-back'})`)
  );
})()
  .catch((err) => {
    console.error('Backup failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
