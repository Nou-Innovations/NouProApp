-- Logistics v2 — Phase 3, Step B (MIGRATE + CONTRACT).
-- Rewrites existing delivery-status data to the new values, then recreates the
-- enum with ONLY the new values (Postgres can't DROP individual enum values).
--
-- Old -> New mapping (1:1):
--   NOT_ASSIGNED -> Draft   ASSIGNED -> Scheduled   PACKED -> Ready
--   OUT_FOR_DELIVERY -> InTransit   DELIVERED -> Delivered
--   FAILED -> Issue   CANCELED -> Canceled
-- Down-map (for a manual rollback fix-migration, if ever needed):
--   Draft -> NOT_ASSIGNED   Scheduled -> ASSIGNED   Ready -> PACKED
--   InTransit -> OUT_FOR_DELIVERY   Delivered -> DELIVERED
--   Issue -> FAILED   Canceled -> CANCELED
--
-- The DeliveryStatus enum is shared by Order.deliveryStatus, Delivery.deliveryStatus,
-- and DeliveryStatusHistory.from/to — ALL FOUR columns are migrated below.

-- ── Step 1: migrate existing data to the new values ────────────────────────
UPDATE "Delivery" SET "deliveryStatus" = (CASE "deliveryStatus"::text
  WHEN 'NOT_ASSIGNED' THEN 'Draft'
  WHEN 'ASSIGNED' THEN 'Scheduled'
  WHEN 'PACKED' THEN 'Ready'
  WHEN 'OUT_FOR_DELIVERY' THEN 'InTransit'
  WHEN 'DELIVERED' THEN 'Delivered'
  WHEN 'FAILED' THEN 'Issue'
  WHEN 'CANCELED' THEN 'Canceled'
  ELSE "deliveryStatus"::text END)::"DeliveryStatus"
WHERE "deliveryStatus" IS NOT NULL;

UPDATE "Order" SET "deliveryStatus" = (CASE "deliveryStatus"::text
  WHEN 'NOT_ASSIGNED' THEN 'Draft'
  WHEN 'ASSIGNED' THEN 'Scheduled'
  WHEN 'PACKED' THEN 'Ready'
  WHEN 'OUT_FOR_DELIVERY' THEN 'InTransit'
  WHEN 'DELIVERED' THEN 'Delivered'
  WHEN 'FAILED' THEN 'Issue'
  WHEN 'CANCELED' THEN 'Canceled'
  ELSE "deliveryStatus"::text END)::"DeliveryStatus"
WHERE "deliveryStatus" IS NOT NULL;

UPDATE "DeliveryStatusHistory" SET "to" = (CASE "to"::text
  WHEN 'NOT_ASSIGNED' THEN 'Draft'
  WHEN 'ASSIGNED' THEN 'Scheduled'
  WHEN 'PACKED' THEN 'Ready'
  WHEN 'OUT_FOR_DELIVERY' THEN 'InTransit'
  WHEN 'DELIVERED' THEN 'Delivered'
  WHEN 'FAILED' THEN 'Issue'
  WHEN 'CANCELED' THEN 'Canceled'
  ELSE "to"::text END)::"DeliveryStatus";

UPDATE "DeliveryStatusHistory" SET "from" = (CASE "from"::text
  WHEN 'NOT_ASSIGNED' THEN 'Draft'
  WHEN 'ASSIGNED' THEN 'Scheduled'
  WHEN 'PACKED' THEN 'Ready'
  WHEN 'OUT_FOR_DELIVERY' THEN 'InTransit'
  WHEN 'DELIVERED' THEN 'Delivered'
  WHEN 'FAILED' THEN 'Issue'
  WHEN 'CANCELED' THEN 'Canceled'
  ELSE "from"::text END)::"DeliveryStatus"
WHERE "from" IS NOT NULL;

-- ── Step 2: contract — recreate the enum with only the new values ──────────
CREATE TYPE "DeliveryStatus_new" AS ENUM ('Draft', 'Scheduled', 'Ready', 'InTransit', 'Delivered', 'Issue', 'Canceled');

ALTER TABLE "Order" ALTER COLUMN "deliveryStatus" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "deliveryStatus" DROP DEFAULT;

ALTER TABLE "Order" ALTER COLUMN "deliveryStatus" TYPE "DeliveryStatus_new" USING ("deliveryStatus"::text::"DeliveryStatus_new");
ALTER TABLE "Delivery" ALTER COLUMN "deliveryStatus" TYPE "DeliveryStatus_new" USING ("deliveryStatus"::text::"DeliveryStatus_new");
ALTER TABLE "DeliveryStatusHistory" ALTER COLUMN "from" TYPE "DeliveryStatus_new" USING ("from"::text::"DeliveryStatus_new");
ALTER TABLE "DeliveryStatusHistory" ALTER COLUMN "to" TYPE "DeliveryStatus_new" USING ("to"::text::"DeliveryStatus_new");

ALTER TYPE "DeliveryStatus" RENAME TO "DeliveryStatus_old";
ALTER TYPE "DeliveryStatus_new" RENAME TO "DeliveryStatus";
DROP TYPE "DeliveryStatus_old";

ALTER TABLE "Order" ALTER COLUMN "deliveryStatus" SET DEFAULT 'Draft';
ALTER TABLE "Delivery" ALTER COLUMN "deliveryStatus" SET DEFAULT 'Draft';
