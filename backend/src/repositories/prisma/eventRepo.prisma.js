const { prisma } = require('../../db/prisma');

const businessSelect = {
  id: true,
  name: true,
  logoUrl: true,
  industry: true,
  category: true,
  isVerified: true,
};

// Upcoming, scheduled events (startAt in the future), optionally filtered.
async function listUpcoming(filters = {}) {
  const where = { status: 'scheduled', startAt: { gte: new Date() } };
  if (filters.type) where.type = filters.type;
  if (filters.locationText) where.locationText = { contains: filters.locationText, mode: 'insensitive' };
  if (filters.isOnline != null) where.isOnline = filters.isOnline;

  return prisma.event.findMany({
    where,
    include: {
      business: { select: businessSelect },
      _count: { select: { rsvps: true } },
    },
    orderBy: { startAt: 'asc' },
    take: filters.take || 50,
    skip: filters.skip || 0,
  });
}

async function getByBusinessId(businessId) {
  return prisma.event.findMany({
    where: { businessId },
    include: { _count: { select: { rsvps: true } } },
    orderBy: { startAt: 'desc' },
  });
}

async function getById(id) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      business: { select: businessSelect },
      _count: { select: { rsvps: true } },
    },
  });
}

async function create(data) {
  return prisma.event.create({ data });
}

async function update(id, patch) {
  return prisma.event.update({ where: { id }, data: patch });
}

async function remove(id) {
  try {
    await prisma.event.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

async function listRsvps(eventId) {
  return prisma.eventRSVP.findMany({ where: { eventId }, orderBy: { createdAt: 'desc' } });
}

async function findRsvp(eventId, businessId) {
  return prisma.eventRSVP.findUnique({ where: { eventId_businessId: { eventId, businessId } } });
}

async function upsertRsvp({ eventId, businessId, userId, status }) {
  return prisma.eventRSVP.upsert({
    where: { eventId_businessId: { eventId, businessId } },
    create: { eventId, businessId, userId, status },
    update: { status, userId },
  });
}

async function countRsvps(eventId, status = 'going') {
  return prisma.eventRSVP.count({ where: { eventId, status } });
}

module.exports = {
  listUpcoming,
  getByBusinessId,
  getById,
  create,
  update,
  delete: remove,
  listRsvps,
  findRsvp,
  upsertRsvp,
  countRsvps,
};
