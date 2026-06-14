-- Logistics v2 — Phase 3, Step A (EXPAND): add the new DeliveryStatus values.
-- Old values (NOT_ASSIGNED, ...) remain for now so live rows + the currently
-- deployed code keep working. Data is migrated and old values removed in the
-- next migration (Step B). Adding enum values MUST be its own migration:
-- Postgres cannot use a newly-added enum value in the same transaction.

ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'Draft';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'Scheduled';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'Ready';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'InTransit';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'Delivered';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'Issue';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'Canceled';
