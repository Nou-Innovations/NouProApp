/**
 * RecurringSchedule Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');
const { v4: uuidv4 } = require('uuid');

async function getByBusinessId(businessId) {
  return prisma.recurringSchedule.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id) {
  return prisma.recurringSchedule.findUnique({ where: { id } });
}

/** Active schedules whose nextRunAt is due (<= now). For the scheduler. */
async function getDue(now) {
  return prisma.recurringSchedule.findMany({
    where: { active: true, nextRunAt: { lte: now } },
  });
}

async function create(data) {
  return prisma.recurringSchedule.create({ data: { id: data.id || uuidv4(), ...data } });
}

async function update(id, patch) {
  return prisma.recurringSchedule.update({ where: { id }, data: patch });
}

async function remove(id) {
  await prisma.recurringSchedule.delete({ where: { id } });
  return true;
}

module.exports = {
  getByBusinessId,
  getById,
  getDue,
  create,
  update,
  delete: remove,
};
