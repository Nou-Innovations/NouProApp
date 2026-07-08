/**
 * BusinessTarget Repository - Prisma Implementation
 *
 * Monthly budget goals (one row per business per 'YYYY-MM'). Powers the
 * Budget-vs-Actual section of the Variance report.
 */
const { prisma } = require('../../db/prisma');

async function getByPeriod(businessId, period) {
  return prisma.businessTarget.findUnique({
    where: { businessId_period: { businessId, period } },
  });
}

async function upsert(businessId, period, { id, revenueTarget, ordersTarget }) {
  return prisma.businessTarget.upsert({
    where: { businessId_period: { businessId, period } },
    update: {
      revenueTarget: revenueTarget ?? null,
      ordersTarget: ordersTarget ?? null,
      updatedAt: new Date(),
    },
    create: {
      id,
      businessId,
      period,
      revenueTarget: revenueTarget ?? null,
      ordersTarget: ordersTarget ?? null,
    },
  });
}

module.exports = { getByPeriod, upsert };
