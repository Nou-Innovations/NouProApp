-- Pending invitations for people who do not yet have an account.
--
-- Before this table, POST /api/companies/:companyId/users/invite created a User row
-- with a NULL passwordHash. Since POST /auth/register 409s on a duplicate email, that
-- permanently blocked the invitee from ever signing up with their own address — and it
-- let any admin burn arbitrary email addresses. Invites now live here and are consumed
-- by register, so no account exists until the person actually signs up.
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

CREATE TABLE "CompanyInvite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "invitedByUserId" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyInvite_pkey" PRIMARY KEY ("id")
);

-- One invite per person per company; re-inviting updates the existing row.
CREATE UNIQUE INDEX "CompanyInvite_businessId_email_key" ON "CompanyInvite"("businessId", "email");

-- Register looks invites up by email across all companies.
CREATE INDEX "CompanyInvite_email_idx" ON "CompanyInvite"("email");
CREATE INDEX "CompanyInvite_businessId_idx" ON "CompanyInvite"("businessId");

ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
