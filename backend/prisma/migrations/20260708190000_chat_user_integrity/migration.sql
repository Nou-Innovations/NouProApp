-- Chat data-model integrity (CHAT_AUDIT.md E1 + E2). Cleanup precedes every constraint
-- so the migration cannot fail on existing data; Prisma runs this file in a transaction.

-- E2: drop the dead ReadReceipt.messageId index (ReadReceipt is a per-user last-read
-- pointer; nothing ever queries it by messageId).
DROP INDEX IF EXISTS "ReadReceipt_messageId_idx";

-- E1: Message.senderId -> User (SET NULL keeps chat history; senderName preserves the
-- display name). Null out non-user senders ('system' event messages) + any orphan first.
UPDATE "Message" SET "senderId" = NULL
  WHERE "senderId" IS NOT NULL AND "senderId" NOT IN (SELECT "id" FROM "User");
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- E1: ChatParticipant.userId -> User (per-user bookkeeping; cascade on user delete).
-- Delete orphaned rows first.
DELETE FROM "ChatParticipant" WHERE "userId" NOT IN (SELECT "id" FROM "User");
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- E1: ReadReceipt.userId -> User (per-user last-read pointer; cascade on user delete).
-- Delete orphaned rows first.
DELETE FROM "ReadReceipt" WHERE "userId" NOT IN (SELECT "id" FROM "User");
ALTER TABLE "ReadReceipt" ADD CONSTRAINT "ReadReceipt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
