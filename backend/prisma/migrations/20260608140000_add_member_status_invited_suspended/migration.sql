-- AlterEnum
-- Adds the 'invited' and 'suspended' values to the MemberStatus enum so that the
-- staff-invite flow (POST /api/companies/:id/users/invite, defaults status='invited')
-- and the suspend flow (PATCH /api/companies/:id/users/:userId, status='suspended')
-- stop throwing PrismaClientValidationError. The JS constants (MEMBER_STATUS) and the
-- VALID_MEMBER_STATUSES whitelist already used these values; the DB enum had drifted.
--
-- This migration adds more than one value to an enum. With PostgreSQL versions 11 and
-- earlier this is not possible in a single migration; Supabase runs PostgreSQL 15+, so
-- both statements apply cleanly here. Additive and non-destructive (no data rewritten).

ALTER TYPE "MemberStatus" ADD VALUE 'invited';
ALTER TYPE "MemberStatus" ADD VALUE 'suspended';
