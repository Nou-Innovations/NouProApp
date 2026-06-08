const { prisma } = require('../../db/prisma');

const businessSelect = {
  id: true,
  name: true,
  logoUrl: true,
  industry: true,
  category: true,
  isVerified: true,
};

// Discovery list (open opportunities, optionally excluding the viewer's own business).
async function listDiscovery(filters = {}) {
  const where = { status: 'open' };
  if (filters.type) where.type = filters.type;
  if (filters.category) where.category = { contains: filters.category, mode: 'insensitive' };
  if (filters.locationText) where.locationText = { contains: filters.locationText, mode: 'insensitive' };
  if (filters.excludeBusinessId) where.businessId = { not: filters.excludeBusinessId };

  return prisma.opportunity.findMany({
    where,
    include: {
      business: { select: businessSelect },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: filters.take || 50,
    skip: filters.skip || 0,
  });
}

async function getByBusinessId(businessId) {
  return prisma.opportunity.findMany({
    where: { businessId },
    include: { _count: { select: { responses: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id) {
  return prisma.opportunity.findUnique({
    where: { id },
    include: {
      business: { select: businessSelect },
      _count: { select: { responses: true } },
    },
  });
}

async function create(data) {
  return prisma.opportunity.create({ data });
}

async function update(id, patch) {
  return prisma.opportunity.update({ where: { id }, data: patch });
}

async function remove(id) {
  try {
    await prisma.opportunity.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

async function listResponses(opportunityId) {
  return prisma.opportunityResponse.findMany({
    where: { opportunityId },
    include: { responderBusiness: { select: businessSelect } },
    orderBy: { createdAt: 'desc' },
  });
}

async function findResponse(opportunityId, responderBusinessId) {
  return prisma.opportunityResponse.findUnique({
    where: { opportunityId_responderBusinessId: { opportunityId, responderBusinessId } },
  });
}

async function createResponse(data) {
  return prisma.opportunityResponse.create({ data });
}

async function countResponses(opportunityId) {
  return prisma.opportunityResponse.count({ where: { opportunityId } });
}

module.exports = {
  listDiscovery,
  getByBusinessId,
  getById,
  create,
  update,
  delete: remove,
  listResponses,
  findResponse,
  createResponse,
  countResponses,
};
