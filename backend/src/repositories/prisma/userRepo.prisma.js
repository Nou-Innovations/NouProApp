/**
 * User Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

async function list(limit = 500) {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getById(id) {
  return prisma.user.findUnique({
    where: { id }
  });
}

/**
 * SECURITY (AUTH-7): email lookup is case-insensitive.
 *
 * This was an exact match while several writers lowercased. The result: `Foo@Bar.com` and
 * `foo@bar.com` behaved as two separate accounts, login and forgot-password silently
 * failed on a case mismatch, and register's duplicate check could be bypassed by varying
 * case — letting one address own two accounts.
 *
 * `mode: 'insensitive'` rather than lowercasing the argument, because rows written before
 * this fix may already contain capitals and must still be found.
 */
async function getByEmail(email) {
  if (!email) return null;
  return prisma.user.findFirst({
    where: { email: { equals: String(email).trim(), mode: 'insensitive' } }
  });
}

/**
 * Batch lookup of users by id. Returns lean records (id/name/avatar) for
 * resolving chat participant display info without N+1 queries.
 * @param {string[]} ids
 */
async function getByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, avatar: true },
  });
}

async function getByPhone(phone) {
  return prisma.user.findFirst({
    where: { phone }
  });
}

async function create(data) {
  return prisma.user.create({
    data
  });
}

async function update(id, patch) {
  return prisma.user.update({
    where: { id },
    data: patch
  });
}

async function remove(id) {
  try {
    await prisma.user.delete({
      where: { id }
    });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  list,
  getById,
  getByIds,
  getByEmail,
  getByPhone,
  create,
  update,
  delete: remove
};

