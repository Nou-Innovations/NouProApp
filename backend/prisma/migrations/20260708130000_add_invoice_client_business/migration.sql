-- Add nullable clientBusinessId to Invoice so invoices/estimates can be delivered
-- live into the client's chat (see CHAT_AUDIT.md Theme A / Phase 2b).
-- Forward-only, no backfill: existing invoices keep NULL and fall back to the
-- seller's activity feed (or the linked order's buyer) at event time.
ALTER TABLE "Invoice" ADD COLUMN "clientBusinessId" TEXT;
CREATE INDEX "Invoice_clientBusinessId_idx" ON "Invoice"("clientBusinessId");
