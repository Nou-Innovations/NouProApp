-- Phase 2: Company Pages + Payments

-- Add new fields to Business model
ALTER TABLE "Business" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "size" TEXT;
ALTER TABLE "Business" ADD COLUMN "foundedYear" INTEGER;
ALTER TABLE "Business" ADD COLUMN "peachCustomerId" TEXT;
ALTER TABLE "Business" ADD COLUMN "peachCardRegistrationId" TEXT;

-- Unique constraint on peachCustomerId
CREATE UNIQUE INDEX "Business_peachCustomerId_key" ON "Business"("peachCustomerId");

-- Create BusinessFollow model
CREATE TABLE "BusinessFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessFollow_userId_businessId_key" ON "BusinessFollow"("userId", "businessId");
CREATE INDEX "BusinessFollow_userId_idx" ON "BusinessFollow"("userId");
CREATE INDEX "BusinessFollow_businessId_idx" ON "BusinessFollow"("businessId");

ALTER TABLE "BusinessFollow" ADD CONSTRAINT "BusinessFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessFollow" ADD CONSTRAINT "BusinessFollow_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PaymentType enum
CREATE TYPE "PaymentType" AS ENUM ('SUBSCRIPTION', 'INVOICE_PAYMENT');

-- Create PaymentProcessingStatus enum
CREATE TYPE "PaymentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- Create Payment model
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" "PaymentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MUR',
    "status" "PaymentProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "peachCheckoutId" TEXT,
    "peachTransactionId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_peachCheckoutId_key" ON "Payment"("peachCheckoutId");
CREATE UNIQUE INDEX "Payment_peachTransactionId_key" ON "Payment"("peachTransactionId");
CREATE INDEX "Payment_businessId_idx" ON "Payment"("businessId");
CREATE INDEX "Payment_businessId_type_idx" ON "Payment"("businessId", "type");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "Payment_peachCheckoutId_idx" ON "Payment"("peachCheckoutId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
