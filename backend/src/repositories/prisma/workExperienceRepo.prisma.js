const { prisma } = require('../../db/prisma');

async function getByUserId(userId, { visibleOnly = false } = {}) {
  return prisma.workExperience.findMany({
    where: { userId, ...(visibleOnly ? { isVisible: true } : {}) },
    orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
    include: {
      // Linked companies render the LIVE logo/name rather than the snapshot taken when
      // the row was written, and let the profile deep-link to the company.
      linkedBusiness: { select: { id: true, name: true, logoUrl: true, deletedAt: true } },
    },
  });
}

async function getById(id) {
  return prisma.workExperience.findUnique({
    where: { id },
  });
}

async function create(data) {
  return prisma.workExperience.create({ data });
}

async function update(id, patch) {
  return prisma.workExperience.update({
    where: { id },
    data: patch,
  });
}

async function remove(id) {
  try {
    await prisma.workExperience.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Project an accepted membership into the profile timeline.
 *
 * Called when someone joins a company. Idempotent: re-joining a company you previously
 * left re-opens the SAME row rather than stacking duplicates, which is what the
 * (userId, linkedBusinessId, origin) unique index enforces.
 */
async function upsertMembershipExperience({ userId, business, role, startedAt }) {
  const position = role === 'super_admin' ? 'Owner' : role === 'admin' ? 'Admin' : 'Staff';
  return prisma.workExperience.upsert({
    where: {
      userId_linkedBusinessId_origin: {
        userId,
        linkedBusinessId: business.id,
        origin: 'MEMBERSHIP',
      },
    },
    update: { position, isCurrent: true, endDate: null, companyName: business.name, companyLogo: business.logoUrl },
    create: {
      userId,
      linkedBusinessId: business.id,
      origin: 'MEMBERSHIP',
      companyName: business.name,
      companyLogo: business.logoUrl,
      position,
      startDate: startedAt || new Date(),
      isCurrent: true,
    },
  });
}

/**
 * Close a membership row when someone leaves. Deliberately NOT a delete: having worked
 * somewhere is history, and wiping it would silently rewrite the person's profile.
 */
async function closeMembershipExperience(userId, businessId) {
  return prisma.workExperience.updateMany({
    where: { userId, linkedBusinessId: businessId, origin: 'MEMBERSHIP', isCurrent: true },
    data: { isCurrent: false, endDate: new Date() },
  });
}

module.exports = {
  getByUserId,
  getById,
  create,
  update,
  delete: remove,
  upsertMembershipExperience,
  closeMembershipExperience,
};
