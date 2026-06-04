-- AlterTable: User - Add passwordHash column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- CreateIndex: Unique constraint on email (skip nulls)
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex: Unique constraint on phone (skip nulls)
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
