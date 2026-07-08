-- CreateTable
CREATE TABLE "BusinessTarget" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "revenueTarget" DOUBLE PRECISION,
    "ordersTarget" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessTarget_businessId_idx" ON "BusinessTarget"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTarget_businessId_period_key" ON "BusinessTarget"("businessId", "period");

-- AddForeignKey
ALTER TABLE "BusinessTarget" ADD CONSTRAINT "BusinessTarget_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
