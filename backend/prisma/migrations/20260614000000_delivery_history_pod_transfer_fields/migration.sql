-- Deliveries/Transfers rework — Phase 0
-- Additive only: new nullable Delivery columns (POD, SLA, transfer FK locations,
-- stock-move idempotency guard) + DeliveryStatusHistory audit table.
-- No backfill, no enum changes, no drops. Safe to apply to the shared prod DB.

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveredBy" TEXT,
ADD COLUMN     "fromLocationId" TEXT,
ADD COLUMN     "podPhotoUrl" TEXT,
ADD COLUMN     "podSignatureUrl" TEXT,
ADD COLUMN     "stockAppliedAt" TIMESTAMP(3),
ADD COLUMN     "toLocationId" TEXT;

-- CreateTable
CREATE TABLE "DeliveryStatusHistory" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "from" "DeliveryStatus",
    "to" "DeliveryStatus" NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryStatusHistory_deliveryId_idx" ON "DeliveryStatusHistory"("deliveryId");

-- AddForeignKey
ALTER TABLE "DeliveryStatusHistory" ADD CONSTRAINT "DeliveryStatusHistory_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
