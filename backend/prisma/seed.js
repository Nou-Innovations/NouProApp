/**
 * Database Seed Script (Self-Contained)
 *
 * Wipe-and-reseed strategy: deletes all data in reverse FK order,
 * then creates fresh data from the seed-data-* files.
 *
 * Run with: npm run prisma:seed
 */

// Safety: refuse to wipe/seed a production database (defense-in-depth — also runs
// when `prisma migrate reset` auto-invokes this file). See scripts/guard-not-prod.js.
require('../scripts/guard-not-prod')();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Import seed data from split files
const { businesses, users, locations, businessMembers, locationMembers } = require('./seed-data-part1');
const { brands } = require('./seed-data-part2');
const { products } = require('./seed-data-products');
const { orders, deliveries, invoices } = require('./seed-data-part3');
const { chats, messages, feedPosts, userConnections, businessConnections } = require('./seed-data-part4');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed (wipe-and-reseed)...\n');

  // ================================================================
  // PHASE 1: Delete all data in reverse FK order
  // ================================================================
  console.log('Phase 1: Wiping existing data...');

  const deleteOps = [
    prisma.deviceToken.deleteMany(),
    prisma.pushToken.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.notificationRead.deleteMany(),
    prisma.goodsReceipt.deleteMany(),
    prisma.purchaseOrderStatusHistory.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.purchaseRequest.deleteMany(),
    prisma.supplierProduct.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.roleRequest.deleteMany(),
    prisma.readReceipt.deleteMany(),
    prisma.message.deleteMany(),
    prisma.chatParticipant.deleteMany(),
    prisma.chat.deleteMany(),
    prisma.feedPost.deleteMany(),
    prisma.businessConnection.deleteMany(),
    prisma.userConnection.deleteMany(),
    prisma.orderStatusHistory.deleteMany(),
    prisma.deliveryStaff.deleteMany(),
    prisma.delivery.deleteMany(),
    prisma.order.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.stock.deleteMany(),
    prisma.locationProduct.deleteMany(),
    prisma.product.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.transport.deleteMany(),
    prisma.locationMember.deleteMany(),
    prisma.businessMember.deleteMany(),
    prisma.location.deleteMany(),
    prisma.user.deleteMany(),
    prisma.business.deleteMany(),
  ];

  // Execute sequentially to respect FK order
  for (const op of deleteOps) {
    await op;
  }
  console.log('  ✓ All tables cleared\n');

  // ================================================================
  // PHASE 2: Create data in FK-safe order
  // ================================================================

  // Hash password once for all users
  const devPasswordHash = await bcrypt.hash('password', 12);
  console.log('  Generated dev password hash\n');

  // 1) Businesses
  console.log('Creating businesses...');
  for (const b of businesses) {
    await prisma.business.create({
      data: {
        id: b.id,
        name: b.name,
        logoUrl: b.logoUrl,
        bannerUrl: b.bannerUrl || null,
        description: b.description,
        industry: b.industry,
        category: b.category,
        phone: b.phone,
        email: b.email,
        address: b.address,
        website: b.website,
        isPublished: b.isPublished,
        subscriptionTier: b.subscriptionTier,
        settings: b.settings,
      },
    });
  }
  console.log(`  ✓ ${businesses.length} businesses\n`);

  // 2) Users
  console.log('Creating users...');
  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        passwordHash: devPasswordHash,
        jobTitle: u.jobTitle || null,
        description: u.description || null,
      },
    });
  }
  console.log(`  ✓ ${users.length} users\n`);

  // 3) Locations
  console.log('Creating locations...');
  for (const l of locations) {
    await prisma.location.create({
      data: {
        id: l.id,
        businessId: l.businessId,
        name: l.name,
        address: l.address,
        phone: l.phone,
        email: l.email,
        locationType: l.locationType,
        latitude: l.latitude,
        longitude: l.longitude,
        operatingMode: l.operatingMode,
        isPublic: l.isPublic,
        isPrimary: l.isPrimary,
      },
    });
  }
  console.log(`  ✓ ${locations.length} locations\n`);

  // 4) Business Members
  console.log('Creating business members...');
  for (const bm of businessMembers) {
    await prisma.businessMember.create({
      data: {
        id: bm.id,
        businessId: bm.businessId,
        userId: bm.userId,
        role: bm.role,
        status: bm.status,
      },
    });
  }
  console.log(`  ✓ ${businessMembers.length} business members\n`);

  // 5) Location Members
  console.log('Creating location members...');
  for (const lm of locationMembers) {
    await prisma.locationMember.create({
      data: {
        id: lm.id,
        locationId: lm.locationId,
        businessId: lm.businessId,
        userId: lm.userId,
        role: lm.role,
        status: lm.status,
        permissions: lm.permissions || [],
      },
    });
  }
  console.log(`  ✓ ${locationMembers.length} location members\n`);

  // 6) Brands
  console.log('Creating brands...');
  for (const br of brands) {
    await prisma.brand.create({
      data: {
        id: br.id,
        businessId: br.businessId,
        name: br.name,
        logoUrl: br.logoUrl,
        description: br.description,
      },
    });
  }
  console.log(`  ✓ ${brands.length} brands\n`);

  // 7) Products
  console.log('Creating products...');
  for (const pr of products) {
    await prisma.product.create({
      data: {
        id: pr.id,
        businessId: pr.businessId,
        name: pr.name,
        brand: pr.brand,
        brandLogo: pr.brandLogo,
        brandId: pr.brandId,
        productPicture: pr.productPicture,
        price: pr.price,
        costPrice: pr.costPrice,
        salePrice: pr.salePrice,
        category: pr.category,
        unit: pr.unit,
        status: pr.status,
        isListed: pr.isListed,
        isDisplayable: pr.isDisplayable,
        isCreatedByUser: pr.isCreatedByUser,
        taxRate: pr.taxRate,
        sku: pr.sku,
        barcode: pr.barcode,
        description: pr.description,
      },
    });
  }
  console.log(`  ✓ ${products.length} products\n`);

  // 8) Orders
  console.log('Creating orders...');
  for (const o of orders) {
    await prisma.order.create({
      data: {
        id: o.id,
        businessId: o.businessId,
        soldByScope: o.soldByScope,
        soldByLocationId: o.soldByLocationId,
        fulfillmentLocationId: o.fulfillmentLocationId,
        customerId: o.customerId,
        customerName: o.customerName,
        customerAddress: o.customerAddress,
        customerPhone: o.customerPhone,
        buyerBusinessId: o.buyerBusinessId,
        buyerBusinessName: o.buyerBusinessName,
        items: o.items,
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        notes: o.notes,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${orders.length} orders\n`);

  // 9) Deliveries
  console.log('Creating deliveries...');
  for (const d of deliveries) {
    await prisma.delivery.create({
      data: {
        id: d.id,
        businessId: d.businessId,
        locationId: d.locationId,
        direction: d.direction,
        type: d.type,
        clientId: d.clientId,
        clientCompanyLogo: d.clientCompanyLogo,
        clientCompanyName: d.clientCompanyName,
        clientAddress: d.clientAddress,
        clientEmail: d.clientEmail,
        clientPhone: d.clientPhone,
        clientNotes: d.clientNotes,
        distributorNotes: d.distributorNotes,
        fromLocation: d.fromLocation || null,
        toLocation: d.toLocation || null,
        orderTime: d.orderTime ? new Date(d.orderTime) : null,
        expectedDeliveryDateTime: d.expectedDeliveryDateTime ? new Date(d.expectedDeliveryDateTime) : null,
        itemCount: d.itemCount,
        items: d.items,
        totalAmount: d.totalAmount,
        deliveryStatus: d.deliveryStatus,
        paymentStatus: d.paymentStatus,
        assignedStaffId: d.assignedStaffId,
        assignedTo: d.assignedTo,
        transportMode: d.transportMode,
        orderId: d.orderId,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${deliveries.length} deliveries\n`);

  // 10) Invoices
  console.log('Creating invoices...');
  for (const inv of invoices) {
    await prisma.invoice.create({
      data: {
        id: inv.id,
        businessId: inv.businessId,
        issuedByScope: inv.issuedByScope,
        issuedByLocationId: inv.issuedByLocationId,
        orderId: inv.orderId,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        clientEmail: inv.clientEmail,
        clientPhone: inv.clientPhone,
        clientAddress: inv.clientAddress,
        amount: inv.amount,
        taxAmount: inv.taxAmount,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        discount: inv.discount,
        shipping: inv.shipping,
        currency: inv.currency,
        type: inv.type,
        status: inv.status,
        issueDate: inv.issueDate ? new Date(inv.issueDate) : null,
        dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
        items: inv.items,
        notes: inv.notes,
        terms: inv.terms,
        createdAt: new Date(inv.createdAt),
        updatedAt: new Date(inv.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${invoices.length} invoices\n`);

  // 11) Chats + Chat Participants
  console.log('Creating chats...');
  for (const chat of chats) {
    await prisma.chat.create({
      data: {
        id: chat.id,
        companyId: chat.companyId || null,
        locationId: chat.locationId || null,
        type: chat.type,
        name: chat.name,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        unreadCount: chat.unreadCount,
        avatar: chat.avatar,
      },
    });

    // Create ChatParticipant entries (auto-generated UUIDs)
    for (const userId of chat.participants) {
      await prisma.chatParticipant.create({
        data: { chatId: chat.id, userId },
      });
    }
  }
  console.log(`  ✓ ${chats.length} chats\n`);

  // 12) Messages
  console.log('Creating messages...');
  let msgCount = 0;
  for (const chatId of Object.keys(messages)) {
    for (const msg of messages[chatId]) {
      await prisma.message.create({
        data: {
          id: msg.id,
          chatId: chatId,
          senderId: msg.senderId,
          senderName: msg.senderName,
          content: msg.content,
          type: msg.type,
          timestamp: new Date(msg.timestamp),
          meta: { sender: { id: msg.senderId, name: msg.senderName } },
          status: msg.status,
          isRead: msg.isRead,
          isOutgoing: msg.isOutgoing,
        },
      });
      msgCount++;
    }
  }
  console.log(`  ✓ ${msgCount} messages\n`);

  // 13) Feed Posts
  console.log('Creating feed posts...');
  for (const post of feedPosts) {
    await prisma.feedPost.create({
      data: {
        id: post.id,
        businessId: post.businessId,
        type: post.type,
        timestamp: post.timestamp,
        data: post.data,
        createdAt: new Date(post.createdAt),
      },
    });
  }
  console.log(`  ✓ ${feedPosts.length} feed posts\n`);

  // 14) Connections
  console.log('Creating connections...');
  for (const uc of userConnections) {
    await prisma.userConnection.create({
      data: {
        senderId: uc.senderId,
        receiverId: uc.receiverId,
        status: uc.status,
      },
    });
  }
  for (const bc of businessConnections) {
    await prisma.businessConnection.create({
      data: {
        requesterBusinessId: bc.requesterBusinessId,
        targetBusinessId: bc.targetBusinessId,
        status: bc.status,
      },
    });
  }
  console.log(`  ✓ ${userConnections.length} user connections, ${businessConnections.length} business connections\n`);

  // ================================================================
  // Summary
  // ================================================================
  console.log('✅ Database seed completed successfully!');
  console.log(`   ${businesses.length} businesses, ${users.length} users, ${locations.length} locations`);
  console.log(`   ${brands.length} brands, ${products.length} products`);
  console.log(`   ${orders.length} orders, ${deliveries.length} deliveries, ${invoices.length} invoices`);
  console.log(`   ${chats.length} chats, ${msgCount} messages, ${feedPosts.length} feed posts`);
  console.log(`   Login: admin@noupro.com / password`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
