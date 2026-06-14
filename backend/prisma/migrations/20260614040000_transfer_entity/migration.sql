-- Logistics v2 — Phase 5: dedicated Transfer entity + status history + enum.
-- Additive only (new tables + enum). No changes to existing tables. The cutover
-- from the old "Delivery row with type=transfer" model (data copy, creation
-- reroute, hiding old rows) happens later in P9 — this migration is safe-anytime.

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('Requested', 'Approved', 'Preparing', 'InTransit', 'Received', 'Completed', 'Rejected', 'Canceled');

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "fromLocationName" TEXT,
    "toLocationName" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'Requested',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "rejectedReason" TEXT,
    "items" JSONB,
    "itemCount" INTEGER,
    "totalAmount" DOUBLE PRECISION,
    "assignedStaffId" TEXT,
    "transportId" TEXT,
    "trackingNumber" TEXT,
    "notes" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "orderTime" TIMESTAMP(3),
    "expectedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "stockAppliedAt" TIMESTAMP(3),
    "recurringScheduleId" TEXT,
    "legacyDeliveryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferStatusHistory" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "from" "TransferStatus",
    "to" "TransferStatus" NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transfer_businessId_idx" ON "Transfer"("businessId");
CREATE INDEX "Transfer_businessId_status_idx" ON "Transfer"("businessId", "status");
CREATE INDEX "Transfer_fromLocationId_idx" ON "Transfer"("fromLocationId");
CREATE INDEX "Transfer_toLocationId_idx" ON "Transfer"("toLocationId");
CREATE INDEX "TransferStatusHistory_transferId_idx" ON "TransferStatusHistory"("transferId");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransferStatusHistory" ADD CONSTRAINT "TransferStatusHistory_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
