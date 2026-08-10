-- Per-device sessions (audit A-6, A-7).
--
-- Until now `tokenVersion` was the only revocation mechanism and it is global: logging
-- out on one device bumped it and therefore signed the user out EVERYWHERE, and changing
-- your password did the same to your own session ~30 minutes later. Refresh tokens now
-- carry a session id and revocation happens per row.
--
-- Deliberately no refresh-token hash and no reuse detection. The client writes rotated
-- tokens to SecureStore fire-and-forget, and two code paths bypass its single-flight
-- refresh lock, so invalidate-on-use would turn ordinary races into false "token theft"
-- logouts. `tokenVersion` is kept for the genuinely global cases (password reset,
-- account deletion) and as the fallback for tokens issued before this migration.
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Listing a user's devices, and revoking every session on password reset / deletion.
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
-- Supports pruning expired rows.
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
