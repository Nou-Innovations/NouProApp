-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "PurchaseRequestPriority" AS ENUM ('LOW', 'NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELED');

-- CreateEnum
CREATE TYPE "GoodsReceiptStatus" AS ENUM ('PENDING', 'COMPLETED', 'DISPUTED');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "supplierBusinessId" TEXT,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT,
    "leadTimeDays" INTEGER,
    "creditLimit" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierPrice" DOUBLE PRECISION NOT NULL,
    "minOrderQty" INTEGER,
    "bulkPrice" DOUBLE PRECISION,
    "bulkMinQty" INTEGER,
    "supplierSKU" TEXT,
    "leadTimeDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "supplierId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "priority" "PurchaseRequestPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "items" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "requiredByDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "purchaseOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseRequestId" TEXT,
    "locationId" TEXT,
    "poNumber" TEXT,
    "items" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID',
    "paymentTerms" TEXT,
    "expectedDeliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedBy" TEXT,
    "statusReason" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderStatusHistory" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "from" "PurchaseOrderStatus" NOT NULL,
    "to" "PurchaseOrderStatus" NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "locationId" TEXT,
    "receivedBy" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "status" "GoodsReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_businessId_idx" ON "Supplier"("businessId");

-- CreateIndex
CREATE INDEX "Supplier_supplierBusinessId_idx" ON "Supplier"("supplierBusinessId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_businessId_supplierBusinessId_key" ON "Supplier"("businessId", "supplierBusinessId");

-- CreateIndex
CREATE INDEX "SupplierProduct_productId_idx" ON "SupplierProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_productId_key" ON "SupplierProduct"("supplierId", "productId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_businessId_idx" ON "PurchaseRequest"("businessId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_businessId_idx" ON "PurchaseOrder"("businessId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_businessId_poNumber_key" ON "PurchaseOrder"("businessId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderStatusHistory_purchaseOrderId_idx" ON "PurchaseOrderStatusHistory"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_businessId_idx" ON "GoodsReceipt"("businessId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_purchaseOrderId_idx" ON "GoodsReceipt"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_supplierBusinessId_fkey" FOREIGN KEY ("supplierBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderStatusHistory" ADD CONSTRAINT "PurchaseOrderStatusHistory_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

