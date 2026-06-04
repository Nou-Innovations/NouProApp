-- Migration: Add enums and NotificationRead model
-- This migration adds the status enums and NotificationRead table for notification persistence

-- CreateEnum: DeliveryStatus (if not exists)
DO $$ BEGIN
    CREATE TYPE "DeliveryStatus" AS ENUM ('NOT_ASSIGNED', 'ASSIGNED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: PaymentStatus (if not exists)
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'PAYMENT_PENDING', 'PENDING_CONFIRMATION', 'PROCESSING', 'OVERDUE', 'DUE_TODAY', 'FAILED', 'CANCELED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: InvoiceStatus (if not exists)
DO $$ BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELED', 'VOID', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: NotificationRead
CREATE TABLE IF NOT EXISTS "NotificationRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationRead_userId_notificationKey_key" ON "NotificationRead"("userId", "notificationKey");
CREATE INDEX IF NOT EXISTS "NotificationRead_userId_idx" ON "NotificationRead"("userId");

-- AlterTable: Order - Add/Update deliveryStatus and paymentStatus columns
-- Note: If columns exist as text, they need to be converted. If they don't exist, they'll be added.
-- This is idempotent - it handles both scenarios.

-- For Order table: Add deliveryStatus if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN "deliveryStatus" "DeliveryStatus" DEFAULT 'NOT_ASSIGNED';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- For Order table: Add paymentStatus if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- For Delivery table: Convert deliveryStatus to enum (if it exists as text)
DO $$ BEGIN
    ALTER TABLE "Delivery" ALTER COLUMN "deliveryStatus" TYPE "DeliveryStatus" USING "deliveryStatus"::"DeliveryStatus";
    ALTER TABLE "Delivery" ALTER COLUMN "deliveryStatus" SET DEFAULT 'NOT_ASSIGNED';
EXCEPTION
    WHEN undefined_column THEN 
        -- Column doesn't exist, add it
        ALTER TABLE "Delivery" ADD COLUMN "deliveryStatus" "DeliveryStatus" DEFAULT 'NOT_ASSIGNED';
    WHEN invalid_text_representation THEN
        -- Can't convert, drop and recreate
        ALTER TABLE "Delivery" DROP COLUMN "deliveryStatus";
        ALTER TABLE "Delivery" ADD COLUMN "deliveryStatus" "DeliveryStatus" DEFAULT 'NOT_ASSIGNED';
END $$;

-- For Delivery table: Convert paymentStatus to enum (if it exists as text)
DO $$ BEGIN
    ALTER TABLE "Delivery" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus" USING "paymentStatus"::"PaymentStatus";
    ALTER TABLE "Delivery" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';
EXCEPTION
    WHEN undefined_column THEN 
        -- Column doesn't exist, add it
        ALTER TABLE "Delivery" ADD COLUMN "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID';
    WHEN invalid_text_representation THEN
        -- Can't convert, drop and recreate
        ALTER TABLE "Delivery" DROP COLUMN "paymentStatus";
        ALTER TABLE "Delivery" ADD COLUMN "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID';
END $$;

-- For Invoice table: Update status column to use InvoiceStatus enum
DO $$ BEGIN
    ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus" USING "status"::"InvoiceStatus";
    ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
EXCEPTION
    WHEN undefined_column THEN 
        ALTER TABLE "Invoice" ADD COLUMN "status" "InvoiceStatus" DEFAULT 'DRAFT';
    WHEN invalid_text_representation THEN
        ALTER TABLE "Invoice" DROP COLUMN "status";
        ALTER TABLE "Invoice" ADD COLUMN "status" "InvoiceStatus" DEFAULT 'DRAFT';
END $$;
