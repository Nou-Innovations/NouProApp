-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" DOUBLE PRECISION,
    "currency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fixedPrice" DOUBLE PRECISION,
    "fixedPricePerCarton" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListAssignment" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "sellerBusinessId" TEXT NOT NULL,
    "buyerBusinessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceListAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceList_businessId_idx" ON "PriceList"("businessId");

-- CreateIndex
CREATE INDEX "PriceList_businessId_isActive_idx" ON "PriceList"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "PriceListItem_priceListId_idx" ON "PriceListItem"("priceListId");

-- CreateIndex
CREATE INDEX "PriceListItem_productId_idx" ON "PriceListItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_priceListId_productId_key" ON "PriceListItem"("priceListId", "productId");

-- CreateIndex
CREATE INDEX "PriceListAssignment_priceListId_idx" ON "PriceListAssignment"("priceListId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListAssignment_sellerBusinessId_buyerBusinessId_key" ON "PriceListAssignment"("sellerBusinessId", "buyerBusinessId");

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListAssignment" ADD CONSTRAINT "PriceListAssignment_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
