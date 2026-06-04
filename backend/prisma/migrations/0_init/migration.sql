-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "LocationMode" AS ENUM ('DEPENDENT', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('super_admin', 'admin', 'staff');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('pending', 'accepted', 'rejected', 'locked');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'ACCEPTED', 'ONGOING', 'PENDING', 'IN_REVIEW', 'DONE', 'CANCELED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderScope" AS ENUM ('PARENT', 'LOCATION');

-- CreateEnum
CREATE TYPE "InvoiceScope" AS ENUM ('PARENT', 'LOCATION');

-- CreateEnum
CREATE TYPE "DeliveryDirection" AS ENUM ('outgoing', 'incoming');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('delivery', 'transfer');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('NOT_ASSIGNED', 'ASSIGNED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELED', 'VOID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'PAYMENT_PENDING', 'PENDING_CONFIRMATION', 'PROCESSING', 'OVERDUE', 'DUE_TODAY', 'FAILED', 'CANCELED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DeliveryStaffRole" AS ENUM ('driver', 'teamLeader', 'support');

-- CreateEnum
CREATE TYPE "RoleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

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

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('GENERAL', 'DELIVERY', 'ORDER', 'INVOICE', 'INVENTORY');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SUBSCRIPTION', 'INVOICE_PAYMENT');

-- CreateEnum
CREATE TYPE "PaymentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "avatar" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorBackupCodes" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "jobTitle" TEXT,
    "description" TEXT,
    "address" TEXT,
    "language" TEXT DEFAULT 'EN',
    "privacySettings" JSONB,
    "lastLoginAt" TIMESTAMP(3),
    "headline" TEXT,
    "bio" TEXT,
    "industry" TEXT,
    "coverPhoto" TEXT,
    "profileSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "category" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "website" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "size" TEXT,
    "foundedYear" INTEGER,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodEnd" TIMESTAMP(3),
    "peachCustomerId" TEXT,
    "peachCardRegistrationId" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "locationType" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "operatingMode" "LocationMode" NOT NULL DEFAULT 'DEPENDENT',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyLogo" TEXT,
    "position" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "linkedBusinessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "fieldOfStudy" TEXT,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuingOrganization" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transport" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "licensePlate" TEXT,
    "capacity" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "assignedStaffId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "brandLogo" TEXT,
    "brandId" TEXT,
    "productPicture" TEXT,
    "price" DOUBLE PRECISION,
    "category" TEXT,
    "status" TEXT,
    "variants" JSONB,
    "unit" TEXT,
    "stockQuantity" INTEGER,
    "is_listed" BOOLEAN,
    "isCreatedByUser" BOOLEAN,
    "isDisplayable" BOOLEAN,
    "isImported" BOOLEAN,
    "description" TEXT,
    "costPrice" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "sku" TEXT,
    "barcode" TEXT,
    "taxRate" DOUBLE PRECISION,
    "supplier" TEXT,
    "hasCarton" BOOLEAN DEFAULT false,
    "unitsPerCarton" INTEGER,
    "pricePerCarton" DOUBLE PRECISION,
    "hasRetailPriceLimit" BOOLEAN DEFAULT false,
    "retailPriceLimit" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationProduct" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceOverride" DOUBLE PRECISION,
    "taxOverride" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qtyOnHand" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "soldByScope" "OrderScope" NOT NULL DEFAULT 'PARENT',
    "soldByLocationId" TEXT,
    "fulfillmentLocationId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerAddress" TEXT,
    "customerPhone" TEXT,
    "buyerBusinessId" TEXT,
    "buyerBusinessName" TEXT,
    "createdBy" TEXT,
    "items" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveryStatus" "DeliveryStatus" DEFAULT 'NOT_ASSIGNED',
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedBy" TEXT,
    "statusReason" TEXT,
    "lastActivityAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "from" "OrderStatus" NOT NULL,
    "to" "OrderStatus" NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "issuedByScope" "InvoiceScope" NOT NULL DEFAULT 'PARENT',
    "issuedByLocationId" TEXT,
    "orderId" TEXT,
    "invoiceNumber" TEXT,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "clientAddress" TEXT,
    "amount" DOUBLE PRECISION,
    "taxAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "paidAmount" DOUBLE PRECISION DEFAULT 0,
    "discount" DOUBLE PRECISION DEFAULT 0,
    "shipping" DOUBLE PRECISION DEFAULT 0,
    "currency" TEXT DEFAULT 'EUR',
    "type" TEXT,
    "issueDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "referenceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" DEFAULT 'DRAFT',

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "locationId" TEXT,
    "type" TEXT,
    "name" TEXT,
    "participants" JSONB,
    "lastMessage" JSONB,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT,
    "content" TEXT,
    "type" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,
    "status" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isOutgoing" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadReceipt" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationMember" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'pending',
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "direction" "DeliveryDirection",
    "type" "DeliveryType",
    "clientId" TEXT,
    "clientCompanyLogo" TEXT,
    "clientCompanyName" TEXT,
    "clientAddress" TEXT,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "clientNotes" TEXT,
    "distributorName" TEXT,
    "distributorNotes" TEXT,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "orderTime" TIMESTAMP(3),
    "expectedDeliveryDateTime" TIMESTAMP(3),
    "itemCount" INTEGER,
    "items" JSONB,
    "totalAmount" DOUBLE PRECISION,
    "trackingNumber" TEXT,
    "assignedStaffId" TEXT,
    "assignedTo" TEXT,
    "transportMode" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveryStatus" "DeliveryStatus" DEFAULT 'NOT_ASSIGNED',
    "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID',

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryStaff" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "DeliveryStaffRole" NOT NULL DEFAULT 'driver',
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL DEFAULT 'admin',
    "currentRole" TEXT NOT NULL DEFAULT 'staff',
    "status" "RoleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "rejectionReason" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolvedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "type" TEXT NOT NULL,
    "timestamp" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "deliveries" BOOLEAN NOT NULL DEFAULT true,
    "invoices" BOOLEAN NOT NULL DEFAULT true,
    "orders" BOOLEAN NOT NULL DEFAULT true,
    "team" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'GENERAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedToUserId" TEXT,
    "assignedByUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "linkedOrderId" TEXT,
    "linkedDeliveryId" TEXT,
    "linkedInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "UserConnection" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessConnection" (
    "id" TEXT NOT NULL,
    "requesterBusinessId" TEXT NOT NULL,
    "targetBusinessId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" "PaymentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MUR',
    "status" "PaymentProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "peachCheckoutId" TEXT,
    "peachTransactionId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_profileSlug_key" ON "User"("profileSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Business_peachCustomerId_key" ON "Business"("peachCustomerId");

-- CreateIndex
CREATE INDEX "Location_businessId_idx" ON "Location"("businessId");

-- CreateIndex
CREATE INDEX "WorkExperience_userId_idx" ON "WorkExperience"("userId");

-- CreateIndex
CREATE INDEX "Education_userId_idx" ON "Education"("userId");

-- CreateIndex
CREATE INDEX "Certification_userId_idx" ON "Certification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");

-- CreateIndex
CREATE INDEX "Brand_businessId_idx" ON "Brand"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_businessId_name_key" ON "Brand"("businessId", "name");

-- CreateIndex
CREATE INDEX "Transport_businessId_idx" ON "Transport"("businessId");

-- CreateIndex
CREATE INDEX "Product_businessId_idx" ON "Product"("businessId");

-- CreateIndex
CREATE INDEX "Product_businessId_category_idx" ON "Product"("businessId", "category");

-- CreateIndex
CREATE INDEX "Product_businessId_is_listed_idx" ON "Product"("businessId", "is_listed");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "LocationProduct_businessId_idx" ON "LocationProduct"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationProduct_locationId_productId_key" ON "LocationProduct"("locationId", "productId");

-- CreateIndex
CREATE INDEX "Stock_businessId_idx" ON "Stock"("businessId");

-- CreateIndex
CREATE INDEX "Stock_productId_idx" ON "Stock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_locationId_productId_key" ON "Stock"("locationId", "productId");

-- CreateIndex
CREATE INDEX "Order_businessId_idx" ON "Order"("businessId");

-- CreateIndex
CREATE INDEX "Order_businessId_status_idx" ON "Order"("businessId", "status");

-- CreateIndex
CREATE INDEX "Order_businessId_createdAt_idx" ON "Order"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_soldByLocationId_idx" ON "Order"("soldByLocationId");

-- CreateIndex
CREATE INDEX "Order_fulfillmentLocationId_idx" ON "Order"("fulfillmentLocationId");

-- CreateIndex
CREATE INDEX "Order_buyerBusinessId_idx" ON "Order"("buyerBusinessId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_businessId_idx" ON "Invoice"("businessId");

-- CreateIndex
CREATE INDEX "Invoice_businessId_status_idx" ON "Invoice"("businessId", "status");

-- CreateIndex
CREATE INDEX "Invoice_issuedByLocationId_idx" ON "Invoice"("issuedByLocationId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_businessId_invoiceNumber_key" ON "Invoice"("businessId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "Chat_businessId_idx" ON "Chat"("businessId");

-- CreateIndex
CREATE INDEX "Chat_locationId_idx" ON "Chat"("locationId");

-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE INDEX "Message_chatId_timestamp_idx" ON "Message"("chatId", "timestamp");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_idx" ON "ChatParticipant"("userId");

-- CreateIndex
CREATE INDEX "ChatParticipant_chatId_idx" ON "ChatParticipant"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_chatId_userId_key" ON "ChatParticipant"("chatId", "userId");

-- CreateIndex
CREATE INDEX "ReadReceipt_chatId_idx" ON "ReadReceipt"("chatId");

-- CreateIndex
CREATE INDEX "ReadReceipt_userId_idx" ON "ReadReceipt"("userId");

-- CreateIndex
CREATE INDEX "ReadReceipt_messageId_idx" ON "ReadReceipt"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadReceipt_chatId_userId_key" ON "ReadReceipt"("chatId", "userId");

-- CreateIndex
CREATE INDEX "BusinessMember_businessId_idx" ON "BusinessMember"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");

-- CreateIndex
CREATE INDEX "LocationMember_locationId_idx" ON "LocationMember"("locationId");

-- CreateIndex
CREATE INDEX "LocationMember_businessId_idx" ON "LocationMember"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationMember_locationId_userId_key" ON "LocationMember"("locationId", "userId");

-- CreateIndex
CREATE INDEX "Delivery_businessId_idx" ON "Delivery"("businessId");

-- CreateIndex
CREATE INDEX "Delivery_businessId_deliveryStatus_idx" ON "Delivery"("businessId", "deliveryStatus");

-- CreateIndex
CREATE INDEX "Delivery_businessId_paymentStatus_idx" ON "Delivery"("businessId", "paymentStatus");

-- CreateIndex
CREATE INDEX "Delivery_businessId_createdAt_idx" ON "Delivery"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Delivery_locationId_idx" ON "Delivery"("locationId");

-- CreateIndex
CREATE INDEX "Delivery_orderId_idx" ON "Delivery"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryStaff_deliveryId_idx" ON "DeliveryStaff"("deliveryId");

-- CreateIndex
CREATE INDEX "DeliveryStaff_userId_idx" ON "DeliveryStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryStaff_deliveryId_userId_key" ON "DeliveryStaff"("deliveryId", "userId");

-- CreateIndex
CREATE INDEX "RoleRequest_businessId_idx" ON "RoleRequest"("businessId");

-- CreateIndex
CREATE INDEX "RoleRequest_userId_idx" ON "RoleRequest"("userId");

-- CreateIndex
CREATE INDEX "RoleRequest_businessId_userId_status_idx" ON "RoleRequest"("businessId", "userId", "status");

-- CreateIndex
CREATE INDEX "FeedPost_businessId_idx" ON "FeedPost"("businessId");

-- CreateIndex
CREATE INDEX "FeedPost_type_idx" ON "FeedPost"("type");

-- CreateIndex
CREATE INDEX "NotificationRead_userId_idx" ON "NotificationRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_userId_notificationKey_key" ON "NotificationRead"("userId", "notificationKey");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_userId_token_key" ON "PushToken"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "Task_businessId_status_idx" ON "Task"("businessId", "status");

-- CreateIndex
CREATE INDEX "Task_businessId_assignedToUserId_idx" ON "Task"("businessId", "assignedToUserId");

-- CreateIndex
CREATE INDEX "Task_assignedToUserId_idx" ON "Task"("assignedToUserId");

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
CREATE INDEX "PurchaseOrder_businessId_paymentStatus_idx" ON "PurchaseOrder"("businessId", "paymentStatus");

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

-- CreateIndex
CREATE INDEX "UserConnection_senderId_idx" ON "UserConnection"("senderId");

-- CreateIndex
CREATE INDEX "UserConnection_receiverId_idx" ON "UserConnection"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConnection_senderId_receiverId_key" ON "UserConnection"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "BusinessConnection_requesterBusinessId_idx" ON "BusinessConnection"("requesterBusinessId");

-- CreateIndex
CREATE INDEX "BusinessConnection_targetBusinessId_idx" ON "BusinessConnection"("targetBusinessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessConnection_requesterBusinessId_targetBusinessId_key" ON "BusinessConnection"("requesterBusinessId", "targetBusinessId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "BusinessFollow_userId_idx" ON "BusinessFollow"("userId");

-- CreateIndex
CREATE INDEX "BusinessFollow_businessId_idx" ON "BusinessFollow"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessFollow_userId_businessId_key" ON "BusinessFollow"("userId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_peachCheckoutId_key" ON "Payment"("peachCheckoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_peachTransactionId_key" ON "Payment"("peachTransactionId");

-- CreateIndex
CREATE INDEX "Payment_businessId_idx" ON "Payment"("businessId");

-- CreateIndex
CREATE INDEX "Payment_businessId_type_idx" ON "Payment"("businessId", "type");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_peachCheckoutId_idx" ON "Payment"("peachCheckoutId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationProduct" ADD CONSTRAINT "LocationProduct_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationProduct" ADD CONSTRAINT "LocationProduct_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationProduct" ADD CONSTRAINT "LocationProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_fulfillmentLocationId_fkey" FOREIGN KEY ("fulfillmentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_soldByLocationId_fkey" FOREIGN KEY ("soldByLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuedByLocationId_fkey" FOREIGN KEY ("issuedByLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD CONSTRAINT "ReadReceipt_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD CONSTRAINT "ReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationMember" ADD CONSTRAINT "LocationMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationMember" ADD CONSTRAINT "LocationMember_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationMember" ADD CONSTRAINT "LocationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStaff" ADD CONSTRAINT "DeliveryStaff_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStaff" ADD CONSTRAINT "DeliveryStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleRequest" ADD CONSTRAINT "RoleRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleRequest" ADD CONSTRAINT "RoleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessConnection" ADD CONSTRAINT "BusinessConnection_requesterBusinessId_fkey" FOREIGN KEY ("requesterBusinessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessConnection" ADD CONSTRAINT "BusinessConnection_targetBusinessId_fkey" FOREIGN KEY ("targetBusinessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFollow" ADD CONSTRAINT "BusinessFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFollow" ADD CONSTRAINT "BusinessFollow_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

