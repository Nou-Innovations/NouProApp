/**
 * Member Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

/**
 * SECURITY (EXP-1): the ONLY shape in which this repo may embed a User.
 *
 * These functions used `include: { user: true }`, which makes Prisma select every User
 * scalar — including `passwordHash`, `twoFactorSecret` and `twoFactorBackupCodes`. Several
 * routes return the member row straight to the client, so any accepted company member
 * (a plain `staff` account was enough) could read every colleague's password hash and
 * TOTP shared secret, and generate valid 2FA codes for them indefinitely.
 *
 * Fixed here rather than per-route on purpose: ~32 call sites reach these functions, so a
 * route-level patch would leave the next new caller exposed. Anything added to this select
 * is visible to every consumer — keep it to fields the UI actually renders.
 *
 * Deliberately excluded: passwordHash, twoFactorSecret, twoFactorBackupCodes, tokenVersion,
 * twoFactorEnabled, lastLoginAt, privacySettings, address, and unused profile columns.
 */
const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  phone: true,
  jobTitle: true,
  headline: true,
  profileSlug: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

// Embed a User relation safely. Use this instead of `user: true`, always.
const safeUserInclude = { user: { select: USER_SAFE_SELECT } };

// ============================================================================
// BUSINESS MEMBERS
// ============================================================================

async function listBusinessMembers(businessId) {
  return prisma.businessMember.findMany({
    where: { businessId },
    include: safeUserInclude
  });
}

async function getBusinessMember(businessId, userId) {
  return prisma.businessMember.findUnique({
    where: {
      businessId_userId: { businessId, userId }
    },
    include: safeUserInclude
  });
}

/**
 * Keep the profile timeline in step with membership state (audit P-3 / P-11).
 *
 * Done HERE rather than at the ~5 route call sites so that every path — create company,
 * invite accept, join-request approval, staff assign, and anything added later — projects
 * automatically. A route-level patch would silently miss the next new caller, which is
 * exactly how the two models drifted apart in the first place.
 *
 * Always best-effort: a timeline write must never fail or roll back the membership change
 * that triggered it.
 */
async function syncMembershipExperience(userId, businessId, { role, status, startedAt }) {
  try {
    const workExperienceRepo = require('./workExperienceRepo.prisma');
    if (status === 'accepted') {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true, logoUrl: true },
      });
      if (!business) return;
      await workExperienceRepo.upsertMembershipExperience({ userId, business, role, startedAt });
    } else {
      // Suspended / invited / removed: the person is no longer actively there.
      await workExperienceRepo.closeMembershipExperience(userId, businessId);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[memberRepo] timeline sync failed:', err?.message || err);
  }
}

async function addBusinessMember(data) {
  const created = await prisma.businessMember.create({
    data,
    include: safeUserInclude
  });
  await syncMembershipExperience(created.userId, created.businessId, {
    role: created.role,
    status: created.status,
    startedAt: created.createdAt,
  });
  return created;
}

async function updateBusinessMember(id, patch) {
  const updated = await prisma.businessMember.update({
    where: { id },
    data: patch,
    include: safeUserInclude
  });
  // Covers the invite-accept transition (invited -> accepted) and role changes.
  await syncMembershipExperience(updated.userId, updated.businessId, {
    role: updated.role,
    status: updated.status,
    startedAt: updated.createdAt,
  });
  return updated;
}

async function removeBusinessMember(id) {
  try {
    // Read first: after the delete there is no row to tell us whose timeline to close.
    const existing = await prisma.businessMember.findUnique({
      where: { id },
      select: { userId: true, businessId: true },
    });
    await prisma.businessMember.delete({
      where: { id }
    });
    if (existing) {
      await syncMembershipExperience(existing.userId, existing.businessId, { status: 'removed' });
    }
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// LOCATION MEMBERS
// ============================================================================

async function listLocationMembers(locationId) {
  return prisma.locationMember.findMany({
    where: { locationId },
    include: safeUserInclude
  });
}

async function listLocationMembersByBusinessId(businessId) {
  return prisma.locationMember.findMany({
    where: { businessId },
    include: safeUserInclude
  });
}

async function listLocationMembersByBusinessAndUser(businessId, userId) {
  return prisma.locationMember.findMany({
    where: { businessId, userId },
    include: safeUserInclude
  });
}

async function listLocationMembersByUserId(userId) {
  return prisma.locationMember.findMany({
    where: { userId },
    include: {
      user: { select: USER_SAFE_SELECT },
      location: true,
      business: { select: { id: true, name: true } }
    }
  });
}

async function getLocationMember(locationId, userId) {
  return prisma.locationMember.findUnique({
    where: {
      locationId_userId: { locationId, userId }
    },
    include: safeUserInclude
  });
}

async function addLocationMember(data) {
  return prisma.locationMember.create({
    data: {
      ...data,
      permissions: data.permissions || []
    },
    include: safeUserInclude
  });
}

async function updateLocationMember(id, patch) {
  return prisma.locationMember.update({
    where: { id },
    data: patch,
    include: safeUserInclude
  });
}

async function removeLocationMember(id) {
  try {
    await prisma.locationMember.delete({
      where: { id }
    });
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// HELPER QUERIES
// ============================================================================

async function getByUserId(userId) {
  return prisma.businessMember.findMany({
    where: { userId },
    include: { user: { select: USER_SAFE_SELECT }, business: { select: { id: true, name: true, logoUrl: true } } }
  });
}

async function isBusinessMember(businessId, userId) {
  const member = await prisma.businessMember.findFirst({
    where: {
      businessId,
      userId,
      status: 'accepted'
    }
  });
  return !!member;
}

async function isBusinessSuperAdmin(businessId, userId) {
  const member = await prisma.businessMember.findFirst({
    where: {
      businessId,
      userId,
      status: 'accepted',
      role: 'super_admin'
    }
  });
  return !!member;
}

async function listUserMemberships(userId) {
  return prisma.businessMember.findMany({
    where: { userId },
  });
}

async function isLocationMember(locationId, userId) {
  const member = await prisma.locationMember.findFirst({
    where: {
      locationId,
      userId,
      status: 'accepted'
    }
  });
  return !!member;
}

module.exports = {
  // Business members
  listBusinessMembers,
  getBusinessMember,
  addBusinessMember,
  updateBusinessMember,
  removeBusinessMember,
  
  // Location members
  listLocationMembers,
  listLocationMembersByBusinessId,
  listLocationMembersByBusinessAndUser,
  listLocationMembersByUserId,
  getLocationMember,
  addLocationMember,
  updateLocationMember,
  removeLocationMember,
  
  // Helper queries
  getByUserId,
  listUserMemberships,
  isBusinessMember,
  isBusinessSuperAdmin,
  isLocationMember
};

