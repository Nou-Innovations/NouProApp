-- Soft-delete / archive timestamp for Business, mirroring User.deletedAt.
-- NULL = active company. Non-NULL = the owner archived it at that time.
--
-- Why soft and not hard: Order.buyerBusinessId and Invoice.clientBusinessId are plain
-- String? columns with NO foreign key, while Order.businessId / Invoice.businessId cascade.
-- A buyer's record of a transaction physically lives on the SELLER's row, so
-- DELETE FROM "Business" would destroy a trading partner's own order and invoice history.
-- Keeping the row lets every counterparty still resolve the company name (rendered as a
-- greyed-out, non-tappable tombstone) while the company leaves search and discovery.
ALTER TABLE "Business" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Supports the reactivation lookup (find archived companies by email/phone).
-- Plain btree to match @@index([deletedAt]) in schema.prisma.
CREATE INDEX "Business_deletedAt_idx" ON "Business"("deletedAt");
