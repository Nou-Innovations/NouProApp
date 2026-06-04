-- Add status tracking fields to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "statusChangedBy" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "statusReason" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);

-- Create OrderStatusHistory table
CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- Create index on orderId
CREATE INDEX IF NOT EXISTS "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- Add foreign key
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
