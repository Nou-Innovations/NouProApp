-- Additive performance indexes on frequently-queried foreign keys.
-- All use IF NOT EXISTS so the migration is safe to re-run.
CREATE INDEX IF NOT EXISTS "Invoice_orderId_idx" ON "Invoice"("orderId");
CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "Stock_productId_idx" ON "Stock"("productId");
