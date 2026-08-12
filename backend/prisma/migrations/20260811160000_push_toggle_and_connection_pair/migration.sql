-- Two P1 fixes that need columns (audit N-6 and C-7).

-- ---------------------------------------------------------------------------
-- N-6: a real master push switch.
--
-- `notifications_on` existed only in client state: PATCH /auth/me never persisted it and
-- normalizeUser defaulted it back to `true`, so a user who turned push off had it
-- silently re-enabled on their next login and the token re-registered. Preferences
-- already have a home; the master switch belongs beside them.
-- ---------------------------------------------------------------------------
ALTER TABLE "NotificationPreference"
  ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- C-7: one relationship = one row.
--
-- @@unique([senderId, receiverId]) is DIRECTIONAL, so A->B and B->A could both exist:
-- connections were double-counted, and getStatus() returned whichever row it found
-- first, so accept/reject could act on a row the UI wasn't showing. The fix is a
-- canonical sorted pair with its own unique index, which lets the DATABASE refuse the
-- duplicate rather than relying on a check-then-write that isn't transactional.
-- ---------------------------------------------------------------------------
ALTER TABLE "UserConnection"
  ADD COLUMN "pairAId" TEXT,
  ADD COLUMN "pairBId" TEXT;

-- De-duplicate BEFORE adding the constraint, or it cannot be created.
--
-- Keep the most meaningful row of each reciprocal pair: an accepted connection beats a
-- pending one (losing an accepted connection would be user-visible data loss), and
-- otherwise the oldest wins so the original requester stays the sender.
DELETE FROM "UserConnection" a
USING "UserConnection" b
WHERE a."senderId" = b."receiverId"
  AND a."receiverId" = b."senderId"
  AND (
    -- b is accepted and a is not: drop a.
    (b."status" = 'accepted' AND a."status" <> 'accepted')
    -- same status: drop the newer one. Tie-break on id so exactly one side is deleted.
    OR (b."status" = a."status" AND (a."createdAt" > b."createdAt"
        OR (a."createdAt" = b."createdAt" AND a."id" > b."id")))
  );

UPDATE "UserConnection"
SET "pairAId" = LEAST("senderId", "receiverId"),
    "pairBId" = GREATEST("senderId", "receiverId");

CREATE UNIQUE INDEX "UserConnection_pairAId_pairBId_key"
  ON "UserConnection"("pairAId", "pairBId");
