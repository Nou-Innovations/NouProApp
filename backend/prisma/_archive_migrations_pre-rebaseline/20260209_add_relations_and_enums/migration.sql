-- M11: Add foreign key relation from Delivery.orderId to Order.id
-- First clean up any orphaned orderId references that don't exist in Order table
UPDATE "Delivery" SET "orderId" = NULL WHERE "orderId" IS NOT NULL AND "orderId" NOT IN (SELECT "id" FROM "Order");

-- Add foreign key constraint
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on orderId for faster lookups
CREATE INDEX "Delivery_orderId_idx" ON "Delivery"("orderId");

-- L7: Change OrderStatusHistory.from and .to from String to OrderStatus enum
-- Cast existing string values to the OrderStatus enum type
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "from" TYPE "OrderStatus" USING "from"::"OrderStatus";
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "to" TYPE "OrderStatus" USING "to"::"OrderStatus";

-- L8: Create DeliveryDirection and DeliveryType enums
CREATE TYPE "DeliveryDirection" AS ENUM ('outgoing', 'incoming');
CREATE TYPE "DeliveryType" AS ENUM ('delivery', 'transfer');

-- Convert Delivery.direction from String to DeliveryDirection enum
-- First set any invalid values to NULL
UPDATE "Delivery" SET "direction" = NULL WHERE "direction" IS NOT NULL AND "direction" NOT IN ('outgoing', 'incoming');
ALTER TABLE "Delivery" ALTER COLUMN "direction" TYPE "DeliveryDirection" USING "direction"::"DeliveryDirection";

-- Convert Delivery.type from String to DeliveryType enum
UPDATE "Delivery" SET "type" = NULL WHERE "type" IS NOT NULL AND "type" NOT IN ('delivery', 'transfer');
ALTER TABLE "Delivery" ALTER COLUMN "type" TYPE "DeliveryType" USING "type"::"DeliveryType";
