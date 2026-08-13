-- Give stock levels a time of their own (audit N-13).
--
-- `Stock` had no timestamps at all, so the low-stock notification derivation had nothing
-- to report and invented one: `const stockTime = new Date()` on every request, emitted as
-- `time: 'now'`. Two consequences. The feed is sorted by `timestamp` descending, so every
-- low-stock alert pinned itself above genuinely recent activity — permanently, on every
-- fetch. And the label never aged: an item that dropped below its reorder level six weeks
-- ago still read "now", which is the opposite of what an alert is for.
--
-- `updatedAt` only. A `createdAt` would be just as invented for existing rows, and nothing
-- reads one — "when did this stock level last change" is exactly the question the alert is
-- answering. Prisma maintains it via @updatedAt from here on.
--
-- Purely additive: no existing table is read or modified by this migration, and no row is
-- deleted or rewritten. Existing rows are stamped with the deploy time — that is a
-- backfill, not real history, so on the first day every alert still sorts together. It
-- self-corrects as stock actually moves.
ALTER TABLE "Stock"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
