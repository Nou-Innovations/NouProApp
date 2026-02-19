/**
 * Procurement Repository - Prisma Implementation
 * Handles Supplier, SupplierProduct, PurchaseRequest, PurchaseOrder,
 * PurchaseOrderStatusHistory, and GoodsReceipt data operations.
 */
const { prisma } = require('../../db/prisma');

// ── Suppliers ──

async function getSuppliers(businessId) {
  return prisma.supplier.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });
}

async function getSupplierById(id) {
  return prisma.supplier.findUnique({
    where: { id },
    include: {
      products: { include: { product: true } },
    },
  });
}

async function createSupplier(data) {
  return prisma.supplier.create({ data });
}

async function updateSupplier(id, patch) {
  return prisma.supplier.update({
    where: { id },
    data: patch,
  });
}

async function deleteSupplier(id) {
  try {
    await prisma.supplier.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

async function countSuppliers(businessId) {
  return prisma.supplier.count({ where: { businessId } });
}

// ── Supplier Products ──

async function getSupplierProducts(supplierId) {
  return prisma.supplierProduct.findMany({
    where: { supplierId },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function upsertSupplierProduct(data) {
  return prisma.supplierProduct.upsert({
    where: {
      supplierId_productId: {
        supplierId: data.supplierId,
        productId: data.productId,
      },
    },
    create: data,
    update: {
      supplierPrice: data.supplierPrice,
      minOrderQty: data.minOrderQty,
      bulkPrice: data.bulkPrice,
      bulkMinQty: data.bulkMinQty,
      supplierSKU: data.supplierSKU,
      leadTimeDays: data.leadTimeDays,
    },
  });
}

async function updateSupplierProduct(id, patch) {
  return prisma.supplierProduct.update({
    where: { id },
    data: patch,
    include: { product: true },
  });
}

async function deleteSupplierProduct(id) {
  try {
    await prisma.supplierProduct.delete({ where: { id } });
    return true;
  } catch (e) {
    return false;
  }
}

// ── Purchase Requests ──

async function getPurchaseRequests(businessId, filters = {}) {
  const where = { businessId };
  if (filters.status) where.status = filters.status;
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.supplierId) where.supplierId = filters.supplierId;

  return prisma.purchaseRequest.findMany({
    where,
    include: { supplier: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function getPurchaseRequestById(id) {
  return prisma.purchaseRequest.findUnique({
    where: { id },
    include: { supplier: true },
  });
}

async function createPurchaseRequest(data) {
  return prisma.purchaseRequest.create({ data });
}

async function updatePurchaseRequest(id, patch) {
  return prisma.purchaseRequest.update({
    where: { id },
    data: patch,
  });
}

// ── Purchase Orders ──

async function getPurchaseOrders(businessId, filters = {}) {
  const where = { businessId };
  if (filters.status) where.status = filters.status;
  if (filters.supplierId) where.supplierId = filters.supplierId;
  if (filters.locationId) where.locationId = filters.locationId;

  return prisma.purchaseOrder.findMany({
    where,
    include: { supplier: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function getPurchaseOrderById(id) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      statusHistory: { orderBy: { createdAt: 'desc' } },
      goodsReceipts: { orderBy: { createdAt: 'desc' } },
    },
  });
}

async function createPurchaseOrder(data) {
  return prisma.purchaseOrder.create({ data });
}

async function updatePurchaseOrder(id, patch) {
  return prisma.purchaseOrder.update({
    where: { id },
    data: patch,
  });
}

/**
 * Atomically update PO status and create a history record in one transaction.
 */
async function changePOStatusWithHistory(poId, statusFields, historyRecord) {
  return prisma.$transaction(async (tx) => {
    const updatedPO = await tx.purchaseOrder.update({
      where: { id: poId },
      data: statusFields,
    });

    await tx.purchaseOrderStatusHistory.create({
      data: historyRecord,
    });

    return updatedPO;
  });
}

async function getPOStatusHistory(poId) {
  return prisma.purchaseOrderStatusHistory.findMany({
    where: { purchaseOrderId: poId },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Goods Receipts ──

async function getGoodsReceipts(businessId) {
  return prisma.goodsReceipt.findMany({
    where: { businessId },
    include: { purchaseOrder: { include: { supplier: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function getGoodsReceiptById(id) {
  return prisma.goodsReceipt.findUnique({
    where: { id },
    include: { purchaseOrder: { include: { supplier: true } } },
  });
}

async function createGoodsReceipt(data) {
  return prisma.goodsReceipt.create({ data });
}

async function updateGoodsReceipt(id, patch) {
  return prisma.goodsReceipt.update({
    where: { id },
    data: patch,
  });
}

async function getGoodsReceiptsByPO(purchaseOrderId) {
  return prisma.goodsReceipt.findMany({
    where: { purchaseOrderId },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = {
  // Suppliers
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  countSuppliers,
  // Supplier Products
  getSupplierProducts,
  upsertSupplierProduct,
  updateSupplierProduct,
  deleteSupplierProduct,
  // Purchase Requests
  getPurchaseRequests,
  getPurchaseRequestById,
  createPurchaseRequest,
  updatePurchaseRequest,
  // Purchase Orders
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  changePOStatusWithHistory,
  getPOStatusHistory,
  // Goods Receipts
  getGoodsReceipts,
  getGoodsReceiptById,
  createGoodsReceipt,
  updateGoodsReceipt,
  getGoodsReceiptsByPO,
};
