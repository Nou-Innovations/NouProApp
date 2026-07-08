/**
 * Customer Repository - Prisma Implementation
 *
 * Sell-side CRM directory: a record a business keeps about who it sells to.
 * Mirrors the buy-side Supplier repo. A Customer may link to a NouPro Business
 * (customerBusinessId) or be a standalone external contact (name/email/phone).
 */
const { prisma } = require('../../db/prisma');

// Light include so list/detail rows can show the linked business avatar + name.
const linkInclude = {
  customerBusiness: { select: { id: true, name: true, logoUrl: true } },
};

async function getByBusinessId(businessId, { search, status } = {}) {
  const AND = [{ businessId }];
  if (status) AND.push({ status });
  if (search && search.trim()) {
    const q = search.trim();
    AND.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ],
    });
  }
  return prisma.customer.findMany({
    where: { AND },
    orderBy: { name: 'asc' },
    include: linkInclude,
  });
}

async function getById(id) {
  return prisma.customer.findUnique({ where: { id }, include: linkInclude });
}

async function countByBusinessId(businessId) {
  return prisma.customer.count({ where: { businessId } });
}

async function create(data) {
  return prisma.customer.create({ data });
}

async function update(id, patch) {
  return prisma.customer.update({ where: { id }, data: patch });
}

async function remove(id) {
  try {
    await prisma.customer.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

// Find an existing customer for this business matching a client identity, so the
// auto-seed / auto-add-on-invoice logic never creates duplicates. Prefers the
// business link; falls back to a case-insensitive (name [+ email]) match.
async function findByIdentity(businessId, { customerBusinessId, name, email } = {}) {
  if (customerBusinessId) {
    const linked = await prisma.customer.findFirst({ where: { businessId, customerBusinessId } });
    if (linked) return linked;
  }
  if (name && name.trim()) {
    const where = { businessId, name: { equals: name.trim(), mode: 'insensitive' } };
    if (email && email.trim()) where.email = { equals: email.trim(), mode: 'insensitive' };
    return prisma.customer.findFirst({ where });
  }
  return null;
}

// Invoices + orders belonging to a customer: precise via customerId going forward,
// best-effort via the business link / denormalized name for legacy rows.
async function getHistory(businessId, customer) {
  const invoiceOr = [{ customerId: customer.id }];
  const orderOr = [{ customerId: customer.id }];
  if (customer.customerBusinessId) {
    invoiceOr.push({ clientBusinessId: customer.customerBusinessId });
    orderOr.push({ buyerBusinessId: customer.customerBusinessId });
  }
  if (customer.name && customer.name.trim()) {
    invoiceOr.push({ clientName: { equals: customer.name.trim(), mode: 'insensitive' } });
    orderOr.push({ customerName: { equals: customer.name.trim(), mode: 'insensitive' } });
  }
  const [invoices, orders] = await Promise.all([
    prisma.invoice.findMany({ where: { businessId, OR: invoiceOr }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.order.findMany({ where: { businessId, OR: orderOr }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  return { invoices, orders };
}

module.exports = {
  getByBusinessId,
  getById,
  countByBusinessId,
  create,
  update,
  delete: remove,
  findByIdentity,
  getHistory,
};
