-- Merge the two disjoint notions of "workplace" into one timeline (audit P-3 + P-11).
--
-- Before: company memberships (BusinessMember) and typed-in entries (WorkExperience)
-- were unrelated. The Add screen wrote WorkExperience rows that NOTHING displayed, and
-- the Edit screen — their only reader — was handed a Business id, so it permanently
-- rendered "Experience not found". Profile timelines were derived from memberships and
-- had no real dates, so every row read "Present - Present".
--
-- After: WorkExperience is the single source of truth. A membership PROJECTS into it as
-- an origin='MEMBERSHIP' row, created on accept and CLOSED (not deleted) on leave —
-- leaving a company is history, not an erasure.

CREATE TYPE "WorkExperienceOrigin" AS ENUM ('MEMBERSHIP', 'MANUAL');

-- Existing rows are all hand-typed, so MANUAL is the correct default for them.
ALTER TABLE "WorkExperience"
  ADD COLUMN "origin" "WorkExperienceOrigin" NOT NULL DEFAULT 'MANUAL',
  -- Backs the "Show this workplace on profile" switch, which had nowhere to write.
  ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- linkedBusinessId was a bare string with no foreign key, so it may hold ids that never
-- existed (the Add screen used to fabricate "new-<timestamp>" placeholders). Null those
-- out first or the constraint below cannot be created.
UPDATE "WorkExperience"
SET "linkedBusinessId" = NULL
WHERE "linkedBusinessId" IS NOT NULL
  AND "linkedBusinessId" NOT IN (SELECT "id" FROM "Business");

ALTER TABLE "WorkExperience"
  ADD CONSTRAINT "WorkExperience_linkedBusinessId_fkey"
  FOREIGN KEY ("linkedBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WorkExperience_linkedBusinessId_idx" ON "WorkExperience"("linkedBusinessId");

-- One membership row per (user, company). Postgres treats NULLs as distinct, so MANUAL
-- entries — which have a NULL linkedBusinessId — are unaffected and can repeat freely.
CREATE UNIQUE INDEX "WorkExperience_userId_linkedBusinessId_origin_key"
  ON "WorkExperience"("userId", "linkedBusinessId", "origin");

-- Backfill: without this, every existing user's profile would empty out on deploy,
-- because the profile timeline stops being derived from memberships.
--
-- Idempotent by the ON CONFLICT clause, so it is safe to re-run.
INSERT INTO "WorkExperience" (
  "id", "userId", "companyName", "companyLogo", "position",
  "startDate", "isCurrent", "linkedBusinessId", "origin", "isVisible",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  bm."userId",
  b."name",
  b."logoUrl",
  -- Mirrors the role labels the app already shows.
  CASE bm."role"
    WHEN 'super_admin' THEN 'Owner'
    WHEN 'admin'       THEN 'Admin'
    ELSE 'Staff'
  END,
  bm."createdAt",
  true,
  bm."businessId",
  'MEMBERSHIP',
  true,
  NOW(),
  NOW()
FROM "BusinessMember" bm
JOIN "Business" b ON b."id" = bm."businessId"
WHERE bm."status" = 'accepted'
  AND b."deletedAt" IS NULL
ON CONFLICT ("userId", "linkedBusinessId", "origin") DO NOTHING;
