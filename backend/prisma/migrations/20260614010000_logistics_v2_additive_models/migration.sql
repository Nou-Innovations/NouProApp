-- Logistics v2 — Phase 1: additive models (Issue, Return, Route, RecurringSchedule, StockMovement).
-- Additive only: new tables + enums, no changes to existing tables. Safe on the shared prod DB.

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('open', 'investigating', 'resolved');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('Requested', 'Scheduled', 'PickedUp', 'Received', 'Completed', 'Rejected');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('Planned', 'Active', 'Completed', 'Canceled');

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" "IssueStatus" NOT NULL DEFAULT 'open',
    "photoUrl" TEXT,
    "note" TEXT,
    "reportedBy" TEXT,
    "assignedTo" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "locationId" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'Requested',
    "reason" TEXT,
    "items" JSONB,
    "creditNoteId" TEXT,
    "stockAppliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT,
    "date" TIMESTAMP(3),
    "driverId" TEXT,
    "transportId" TEXT,
    "status" "RouteStatus" NOT NULL DEFAULT 'Planned',
    "stops" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringSchedule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "daysOfWeek" JSONB,
    "template" JSONB NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecurringSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "phase" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Issue_businessId_idx" ON "Issue"("businessId");
CREATE INDEX "Issue_businessId_status_idx" ON "Issue"("businessId", "status");
CREATE INDEX "Issue_entityType_entityId_idx" ON "Issue"("entityType", "entityId");
CREATE INDEX "Return_businessId_idx" ON "Return"("businessId");
CREATE INDEX "Return_businessId_status_idx" ON "Return"("businessId", "status");
CREATE INDEX "Return_orderId_idx" ON "Return"("orderId");
CREATE INDEX "Route_businessId_idx" ON "Route"("businessId");
CREATE INDEX "Route_businessId_status_idx" ON "Route"("businessId", "status");
CREATE INDEX "Route_driverId_idx" ON "Route"("driverId");
CREATE INDEX "RecurringSchedule_businessId_idx" ON "RecurringSchedule"("businessId");
CREATE INDEX "RecurringSchedule_active_nextRunAt_idx" ON "RecurringSchedule"("active", "nextRunAt");
CREATE INDEX "StockMovement_businessId_locationId_productId_idx" ON "StockMovement"("businessId", "locationId", "productId");
CREATE INDEX "StockMovement_refType_refId_idx" ON "StockMovement"("refType", "refId");

-- CreateIndex (idempotency guard for ledger writes; bucket included so one op can move several buckets per product)
CREATE UNIQUE INDEX "StockMovement_refType_refId_phase_productId_bucket_key" ON "StockMovement"("refType", "refId", "phase", "productId", "bucket");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Return" ADD CONSTRAINT "Return_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Route" ADD CONSTRAINT "Route_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
