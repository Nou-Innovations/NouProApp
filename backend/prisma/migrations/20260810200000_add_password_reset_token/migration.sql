-- Single-use password-reset tokens (audit AUTH-3).
--
-- The reset token is a JWT, which carries its own signature and expiry — but a JWT cannot
-- be consumed. Nothing was persisted, so the emailed link kept working for its full 15
-- minutes and could be replayed by anyone who saw it (mail scanner, Referer leak, a shared
-- or briefly-accessed inbox). The `tokenVersion` bump performed on reset did not close it
-- either, because the reset token carries no `tv` claim to compare against.
--
-- Only the SHA-256 of the token is stored — this table must never become a second copy of
-- a live credential. Single use is enforced by a conditional UPDATE on `consumedAt`, which
-- is atomic in Postgres, so two concurrent redemptions cannot both succeed and no explicit
-- transaction is needed.
--
-- Purely additive: no existing table is read or modified by this migration.
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- The redemption lookup: reset-password finds the row by token hash on every attempt.
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");
-- Superseding a user's older live tokens when they request a new reset link.
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
-- Supports pruning expired rows.
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
