-- Client-copy → source product link (nullable, additive).
-- Lets a client "carry" another business's product as their own catalog entry
-- (with its own stock + listing) while remembering which product it came from.
ALTER TABLE "Product" ADD COLUMN "sourceProductId" TEXT;
CREATE INDEX "Product_businessId_sourceProductId_idx" ON "Product"("businessId", "sourceProductId");
