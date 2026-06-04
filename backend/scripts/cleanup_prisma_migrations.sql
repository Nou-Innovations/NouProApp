-- Phase C cleanup for the 2026-06 migration re-baseline (P0-3).
--
-- Pre-req: `prisma migrate resolve --applied 0_init` has already inserted the new
-- baseline row into "_prisma_migrations", and scripts/backup-prisma-migrations.js
-- has saved a backup.
--
-- This removes the 13 stale pre-rebaseline rows so the table contains exactly the
-- single `0_init` baseline, matching the squashed migrations/ folder. It does NOT
-- touch any real application tables or data.
DELETE FROM "_prisma_migrations" WHERE migration_name <> '0_init';
