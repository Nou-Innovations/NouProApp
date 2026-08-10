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

async function addBusinessMember(data) {
  return prisma.businessMember.create({
    data,
    include: safeUserInclude
  });
}

async function updateBusinessMember(id, patch) {
  return prisma.businessMember.update({
    where: { id },
    data: patch,
    include: safeUserInclude
  });
}

async function removeBusinessMember(id) {
  try {
    await prisma.businessMember.delete({
      where: { id }
    });
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

