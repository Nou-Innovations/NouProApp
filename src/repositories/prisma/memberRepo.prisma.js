/**
 * Member Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

// ============================================================================
// BUSINESS MEMBERS
// ============================================================================

async function listBusinessMembers(businessId) {
  return prisma.businessMember.findMany({
    where: { businessId },
    include: { user: true }
  });
}

async function getBusinessMember(businessId, userId) {
  return prisma.businessMember.findUnique({
    where: {
      businessId_userId: { businessId, userId }
    },
    include: { user: true }
  });
}

async function addBusinessMember(data) {
  return prisma.businessMember.create({
    data,
    include: { user: true }
  });
}

async function updateBusinessMember(id, patch) {
  return prisma.businessMember.update({
    where: { id },
    data: patch,
    include: { user: true }
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
    include: { user: true }
  });
}

async function getLocationMember(locationId, userId) {
  return prisma.locationMember.findUnique({
    where: {
      locationId_userId: { locationId, userId }
    },
    include: { user: true }
  });
}

async function addLocationMember(data) {
  return prisma.locationMember.create({
    data: {
      ...data,
      permissions: data.permissions || []
    },
    include: { user: true }
  });
}

async function updateLocationMember(id, patch) {
  return prisma.locationMember.update({
    where: { id },
    data: patch,
    include: { user: true }
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
  getLocationMember,
  addLocationMember,
  updateLocationMember,
  removeLocationMember,
  
  // Helper queries
  isBusinessMember,
  isBusinessSuperAdmin,
  isLocationMember
};

