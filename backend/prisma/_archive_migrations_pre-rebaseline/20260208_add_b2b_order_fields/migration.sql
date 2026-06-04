-- Migration: Add B2B ordering fields to Order model
-- Adds buyerBusinessId, buyerBusinessName, createdBy columns
-- These enable B2B ordering where one business places an order with another

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "buyerBusinessId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "buyerBusinessName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Add index for querying orders by buyer business
CREATE INDEX IF NOT EXISTS "Order_buyerBusinessId_idx" ON "Order"("buyerBusinessId");
