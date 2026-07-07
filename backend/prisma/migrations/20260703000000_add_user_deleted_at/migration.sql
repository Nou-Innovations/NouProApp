-- Add a soft-delete / anonymization timestamp to User (GDPR erasure + Apple account-deletion).
-- Nullable, no default: NULL = active account, non-NULL = the account was erased/anonymized at that time.
-- The row itself is kept (not DELETEd) so that other parties' orders/invoices/messages that
-- reference this user remain intact (GDPR Art. 17(3)(b) — retention for legal records).
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
