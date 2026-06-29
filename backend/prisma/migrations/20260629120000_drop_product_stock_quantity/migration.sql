-- Drop the stale Product.stockQuantity column. Stock-of-truth is the Stock table
-- (Stock.qtyOnHand, ledger-backed). The API still returns a computed `stockQuantity`
-- field derived from Stock rows; only the unused column is removed.
ALTER TABLE "Product" DROP COLUMN IF EXISTS "stockQuantity";
