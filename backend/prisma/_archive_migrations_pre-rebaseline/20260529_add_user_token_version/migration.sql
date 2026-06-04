-- Add a token version counter used to invalidate refresh tokens server-side.
-- Bumping User.tokenVersion (on logout / password change) invalidates every
-- refresh token that was issued with the previous version.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
