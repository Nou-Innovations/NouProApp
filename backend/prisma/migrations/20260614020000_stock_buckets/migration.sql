-- Logistics v2 — Phase 2: multi-stage inventory buckets on Stock.
-- Additive only. available = qtyOnHand - qtyReserved (computed in the service, not stored).
-- No behavior change yet: columns default to 0 and are unused until Phase 4 wires stockService in.

ALTER TABLE "Stock" ADD COLUMN     "qtyReserved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qtyInTransit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reorderLevel" INTEGER;
