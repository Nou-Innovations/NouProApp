-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('buying', 'selling', 'partnership', 'service', 'hiring', 'other');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('open', 'closed', 'fulfilled');

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "OpportunityType" NOT NULL DEFAULT 'buying',
    "category" TEXT,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'MUR',
    "locationText" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'open',
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityResponse" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "responderBusinessId" TEXT NOT NULL,
    "message" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Opportunity_businessId_idx" ON "Opportunity"("businessId");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_type_status_idx" ON "Opportunity"("type", "status");

-- CreateIndex
CREATE INDEX "Opportunity_category_idx" ON "Opportunity"("category");

-- CreateIndex
CREATE INDEX "OpportunityResponse_opportunityId_idx" ON "OpportunityResponse"("opportunityId");

-- CreateIndex
CREATE INDEX "OpportunityResponse_responderBusinessId_idx" ON "OpportunityResponse"("responderBusinessId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityResponse_opportunityId_responderBusinessId_key" ON "OpportunityResponse"("opportunityId", "responderBusinessId");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityResponse" ADD CONSTRAINT "OpportunityResponse_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityResponse" ADD CONSTRAINT "OpportunityResponse_responderBusinessId_fkey" FOREIGN KEY ("responderBusinessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
