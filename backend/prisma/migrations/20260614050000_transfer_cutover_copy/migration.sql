-- Logistics v2 — P9 transfer cutover: copy legacy type=transfer Delivery rows
-- into the dedicated Transfer table.
--
-- SAFE + IDEMPOTENT + NON-DESTRUCTIVE:
--   * Only INSERTs into Transfer; the source Delivery rows are LEFT INTACT
--     (kept one release for rollback — a later cleanup migration removes them).
--   * Transfer.id is set to the source Delivery.id, so re-running is a no-op
--     (ON CONFLICT (id) DO NOTHING). legacyDeliveryId also records the source.
--   * Does NOT touch stock — already-applied transfers carry their stockAppliedAt
--     across, so no stock is re-applied.
--
-- Status mapping (Delivery.deliveryStatus -> TransferStatus):
--   Delivered -> Completed   InTransit -> InTransit   Canceled/Issue -> Canceled
--   Draft/Scheduled/Ready    -> Approved (treated as an in-progress transfer)

INSERT INTO "Transfer" (
  "id", "businessId", "fromLocationId", "toLocationId", "fromLocationName", "toLocationName",
  "status", "items", "itemCount", "totalAmount", "assignedStaffId", "trackingNumber",
  "notes", "priority", "orderTime", "expectedAt", "stockAppliedAt", "legacyDeliveryId",
  "createdAt", "updatedAt"
)
SELECT
  d."id",
  d."businessId",
  d."fromLocationId",
  d."toLocationId",
  d."fromLocation",
  d."toLocation",
  (CASE d."deliveryStatus"::text
     WHEN 'Delivered' THEN 'Completed'
     WHEN 'InTransit'  THEN 'InTransit'
     WHEN 'Canceled'  THEN 'Canceled'
     WHEN 'Issue'     THEN 'Canceled'
     ELSE 'Approved'
   END)::"TransferStatus",
  d."items",
  d."itemCount",
  d."totalAmount",
  d."assignedStaffId",
  d."trackingNumber",
  d."distributorNotes",
  'normal',
  d."orderTime",
  d."expectedDeliveryDateTime",
  d."stockAppliedAt",
  d."id",
  d."createdAt",
  d."updatedAt"
FROM "Delivery" d
WHERE d."type"::text = 'transfer'
ON CONFLICT ("id") DO NOTHING;
