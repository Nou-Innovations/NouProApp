-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
