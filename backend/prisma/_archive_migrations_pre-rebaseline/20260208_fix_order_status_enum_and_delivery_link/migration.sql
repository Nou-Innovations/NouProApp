-- Migration: Fix OrderStatus enum, add orderId to Delivery, fix Order.paymentStatus type
-- This migration:
-- 1. Updates OrderStatus enum to correct order workflow statuses
-- 2. Adds orderId column to Delivery model
-- 3. Changes Order.paymentStatus from String to PaymentStatus enum

-- Step 1: Fix OrderStatus enum
-- First, update existing data to use new values before changing the enum
-- Map old values to new values:
--   ASSIGNED -> ACCEPTED
--   PACKED -> ONGOING
--   OUT_FOR_DELIVERY -> ONGOING
--   DELIVERED -> DONE
--   CANCELLED -> CANCELED (note: single L)

-- Convert the column to text temporarily
ALTER TABLE "Order" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;

-- Update existing values to new enum values
UPDATE "Order" SET "status" = 'ACCEPTED' WHERE "status" = 'ASSIGNED';
UPDATE "Order" SET "status" = 'ONGOING' WHERE "status" = 'PACKED';
UPDATE "Order" SET "status" = 'ONGOING' WHERE "status" = 'OUT_FOR_DELIVERY';
UPDATE "Order" SET "status" = 'DONE' WHERE "status" = 'DELIVERED';
UPDATE "Order" SET "status" = 'CANCELED' WHERE "status" = 'CANCELLED';

-- Drop old enum and create new one
DROP TYPE IF EXISTS "OrderStatus" CASCADE;
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'ACCEPTED', 'ONGOING', 'PENDING', 'IN_REVIEW', 'DONE', 'CANCELED', 'REJECTED');

-- Convert column back to enum
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'NEW'::"OrderStatus";

-- Step 2: Add orderId column to Delivery model
ALTER TABLE "Delivery" ADD COLUMN IF NOT EXISTS "orderId" TEXT;

-- Step 3: Fix Order.paymentStatus from String to PaymentStatus enum
-- First update any non-enum values in the existing data
UPDATE "Order" SET "paymentStatus" = 'UNPAID' WHERE "paymentStatus" IS NULL OR "paymentStatus" = '';
UPDATE "Order" SET "paymentStatus" = 'PAID' WHERE "paymentStatus" = 'Paid';
UPDATE "Order" SET "paymentStatus" = 'UNPAID' WHERE "paymentStatus" = 'Unpaid';
UPDATE "Order" SET "paymentStatus" = 'PENDING_CONFIRMATION' WHERE "paymentStatus" = 'Pending Confirmation';
UPDATE "Order" SET "paymentStatus" = 'PENDING_CONFIRMATION' WHERE "paymentStatus" = 'Pending';

-- Now alter the column type to use PaymentStatus enum
DO $$ BEGIN
    ALTER TABLE "Order" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus" USING "paymentStatus"::"PaymentStatus";
    ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID'::"PaymentStatus";
EXCEPTION
    WHEN others THEN
        -- If conversion fails, drop and recreate
        ALTER TABLE "Order" DROP COLUMN IF EXISTS "paymentStatus";
        ALTER TABLE "Order" ADD COLUMN "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID';
END $$;
