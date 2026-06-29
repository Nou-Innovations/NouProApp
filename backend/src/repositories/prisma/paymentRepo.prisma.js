/**
 * Payment Repository - Prisma Implementation
 *
 * Backs the invoice payment ledger (manual received payments) and is also used to
 * recompute an invoice's paidAmount/status from its real Payment rows. Peach checkout
 * payments share the same Payment model.
 */
const { prisma } = require('../../db/prisma');

async function create(data) {
  return prisma.payment.create({ data });
}

async function getById(id) {
  return prisma.payment.findUnique({ where: { id } });
}

// All payments for an invoice, newest first.
async function getByInvoiceId(invoiceId) {
  return prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { createdAt: 'desc' },
  });
}

async function remove(id) {
  try {
    await prisma.payment.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  create,
  getById,
  getByInvoiceId,
  delete: remove,
};
