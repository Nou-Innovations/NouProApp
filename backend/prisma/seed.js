/**
 * Database Seed Script
 * 
 * Loads data from the memory store into the PostgreSQL database.
 * Run with: npm run prisma:seed
 */

const { PrismaClient } = require('@prisma/client');
const store = require('../src/data/memoryStore');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // 1) Users (must be created first for foreign key relationships)
  console.log('Creating users...');
  for (const u of store.users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        phone: u.phone,
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
        createdAt: new Date(u.createdAt),
      },
      update: {
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        phone: u.phone,
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
      },
    });
  }
  console.log(`  ✓ ${store.users.length} users\n`);

  // 2) Businesses
  console.log('Creating businesses...');
  for (const c of store.companies) {
    await prisma.business.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        name: c.name,
        logoUrl: c.logoUrl,
        description: c.description,
        phone: c.phone,
        email: c.email,
        subscriptionTier: c.subscriptionTier,
        settings: c.settings,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
      update: {
        name: c.name,
        logoUrl: c.logoUrl,
        description: c.description,
        phone: c.phone,
        email: c.email,
        subscriptionTier: c.subscriptionTier,
        settings: c.settings,
      },
    });
  }
  console.log(`  ✓ ${store.companies.length} businesses\n`);

  // 3) Locations (map companyId -> businessId)
  console.log('Creating locations...');
  for (const l of store.locations) {
    await prisma.location.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        businessId: l.companyId, // Map to businessId
        name: l.name,
        address: l.address,
        phone: l.phone,
        email: l.email,
        latitude: l.latitude,
        longitude: l.longitude,
        operatingMode: l.operatingMode,
        isPublic: l.isPublic,
        createdAt: new Date(l.createdAt),
        updatedAt: new Date(l.updatedAt),
      },
      update: {
        businessId: l.companyId,
        name: l.name,
        address: l.address,
        phone: l.phone,
        email: l.email,
        latitude: l.latitude,
        longitude: l.longitude,
        operatingMode: l.operatingMode,
        isPublic: l.isPublic,
      },
    });
  }
  console.log(`  ✓ ${store.locations.length} locations\n`);

  // 4) Products (map companyId -> businessId)
  console.log('Creating products...');
  for (const p of store.products) {
    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        businessId: p.companyId, // Map to businessId
        name: p.name,
        brand: p.brand,
        brandLogo: p.brandLogo,
        productPicture: p.productPicture,
        price: p.price,
        category: p.category,
        status: p.status,
        variants: p.variants || null,
        unit: p.unit,
        stockQuantity: p.stockQuantity,
        is_listed: p.is_listed,
        isCreatedByUser: p.isCreatedByUser,
        isDisplayable: p.isDisplayable,
        isImported: p.isImported,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
      update: {
        businessId: p.companyId,
        name: p.name,
        brand: p.brand,
        brandLogo: p.brandLogo,
        productPicture: p.productPicture,
        price: p.price,
        category: p.category,
        status: p.status,
        variants: p.variants || null,
        unit: p.unit,
        stockQuantity: p.stockQuantity,
        is_listed: p.is_listed,
        isCreatedByUser: p.isCreatedByUser,
        isDisplayable: p.isDisplayable,
        isImported: p.isImported,
      },
    });
  }
  console.log(`  ✓ ${store.products.length} products\n`);

  // 5) Location Products (price overrides)
  console.log('Creating location products...');
  for (const lp of store.locationProducts) {
    await prisma.locationProduct.upsert({
      where: { id: lp.id },
      create: {
        id: lp.id,
        businessId: lp.businessId,
        locationId: lp.locationId,
        productId: lp.productId,
        priceOverride: lp.priceOverride,
        taxOverride: lp.taxOverride,
        isActive: lp.isActive,
        createdAt: new Date(lp.createdAt),
      },
      update: {
        priceOverride: lp.priceOverride,
        taxOverride: lp.taxOverride,
        isActive: lp.isActive,
      },
    });
  }
  console.log(`  ✓ ${store.locationProducts.length} location products\n`);

  // 6) Stocks
  console.log('Creating stocks...');
  for (const s of store.stocks) {
    await prisma.stock.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        businessId: s.businessId,
        locationId: s.locationId,
        productId: s.productId,
        qtyOnHand: s.qtyOnHand,
      },
      update: {
        qtyOnHand: s.qtyOnHand,
      },
    });
  }
  console.log(`  ✓ ${store.stocks.length} stocks\n`);

  // 7) Business Members
  console.log('Creating business members...');
  for (const bm of store.businessMembers) {
    await prisma.businessMember.upsert({
      where: { id: bm.id },
      create: {
        id: bm.id,
        businessId: bm.businessId,
        userId: bm.userId,
        role: bm.role,
        status: bm.status,
        createdAt: new Date(bm.createdAt),
      },
      update: {
        role: bm.role,
        status: bm.status,
      },
    });
  }
  console.log(`  ✓ ${store.businessMembers.length} business members\n`);

  // 8) Location Members
  console.log('Creating location members...');
  for (const lm of store.locationMembers) {
    await prisma.locationMember.upsert({
      where: { id: lm.id },
      create: {
        id: lm.id,
        locationId: lm.locationId,
        businessId: lm.businessId,
        userId: lm.userId,
        role: lm.role,
        status: lm.status,
        permissions: lm.permissions || [],
        createdAt: new Date(lm.createdAt),
      },
      update: {
        role: lm.role,
        status: lm.status,
        permissions: lm.permissions || [],
      },
    });
  }
  console.log(`  ✓ ${store.locationMembers.length} location members\n`);

  // 9) Orders
  console.log('Creating orders...');
  for (const o of store.orders) {
    await prisma.order.upsert({
      where: { id: o.id },
      create: {
        id: o.id,
        businessId: o.businessId,
        soldByScope: o.soldByScope,
        soldByLocationId: o.soldByLocationId,
        fulfillmentLocationId: o.fulfillmentLocationId,
        customerId: o.customerId,
        customerName: o.customerName,
        customerAddress: o.customerAddress,
        customerPhone: o.customerPhone,
        items: o.items || [],
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        notes: o.notes,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
      },
      update: {
        soldByScope: o.soldByScope,
        soldByLocationId: o.soldByLocationId,
        fulfillmentLocationId: o.fulfillmentLocationId,
        customerName: o.customerName,
        customerAddress: o.customerAddress,
        customerPhone: o.customerPhone,
        items: o.items || [],
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        notes: o.notes,
      },
    });
  }
  console.log(`  ✓ ${store.orders.length} orders\n`);

  // 10) Invoices
  console.log('Creating invoices...');
  for (const inv of store.invoices) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      create: {
        id: inv.id,
        businessId: inv.businessId,
        issuedByScope: inv.issuedByScope,
        issuedByLocationId: inv.issuedByLocationId,
        orderId: inv.orderId,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        clientEmail: inv.clientEmail,
        amount: inv.amount,
        taxAmount: inv.taxAmount,
        totalAmount: inv.totalAmount,
        status: inv.status,
        type: inv.type,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        items: inv.items || [],
        notes: inv.notes,
        createdAt: new Date(inv.createdAt),
        updatedAt: new Date(inv.updatedAt),
      },
      update: {
        issuedByScope: inv.issuedByScope,
        issuedByLocationId: inv.issuedByLocationId,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        clientEmail: inv.clientEmail,
        amount: inv.amount,
        taxAmount: inv.taxAmount,
        totalAmount: inv.totalAmount,
        status: inv.status,
        type: inv.type,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        items: inv.items || [],
        notes: inv.notes,
      },
    });
  }
  console.log(`  ✓ ${store.invoices.length} invoices\n`);

  // 11) Deliveries (map companyId -> businessId)
  console.log('Creating deliveries...');
  for (const d of store.deliveries) {
    await prisma.delivery.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        businessId: d.companyId, // Map to businessId
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
        fromLocation: d.fromLocation,
        toLocation: d.toLocation,
        orderTime: d.orderTime ? new Date(d.orderTime) : null,
        expectedDeliveryDateTime: d.expectedDeliveryDateTime 
          ? new Date(d.expectedDeliveryDateTime) 
          : null,
        itemCount: d.itemCount,
        items: d.items || null,
        totalAmount: d.totalAmount,
        trackingNumber: d.trackingNumber,
        deliveryStatus: d.deliveryStatus,
        paymentStatus: d.paymentStatus,
        assignedStaffId: d.assignedStaffId,
        assignedTo: d.assignedTo,
        transportMode: d.transportMode,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      },
      update: {
        businessId: d.companyId,
        locationId: d.locationId,
        direction: d.direction,
        type: d.type,
        clientCompanyName: d.clientCompanyName,
        clientAddress: d.clientAddress,
        deliveryStatus: d.deliveryStatus,
        paymentStatus: d.paymentStatus,
        assignedTo: d.assignedTo,
        transportMode: d.transportMode,
      },
    });
  }
  console.log(`  ✓ ${store.deliveries.length} deliveries\n`);

  // 12) Chats (map companyId -> businessId)
  console.log('Creating chats...');
  for (const chat of store.chats) {
    await prisma.chat.upsert({
      where: { id: chat.id },
      create: {
        id: chat.id,
        businessId: chat.companyId, // Map to businessId
        locationId: chat.locationId,
        type: chat.type,
        name: chat.name,
        participants: chat.participants || [],
        lastMessage: chat.lastMessage || null,
        unreadCount: chat.unreadCount,
        avatar: chat.avatar,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
      },
      update: {
        businessId: chat.companyId,
        locationId: chat.locationId,
        type: chat.type,
        name: chat.name,
        participants: chat.participants || [],
        lastMessage: chat.lastMessage || null,
        unreadCount: chat.unreadCount,
        avatar: chat.avatar,
      },
    });
  }
  console.log(`  ✓ ${store.chats.length} chats\n`);

  // 13) Messages
  console.log('Creating messages...');
  let messageCount = 0;
  for (const chatId of Object.keys(store.messages)) {
    const chatMessages = store.messages[chatId];
    for (const msg of chatMessages) {
      await prisma.message.upsert({
        where: { id: msg.id },
        create: {
          id: msg.id,
          chatId: chatId,
          senderId: msg.sender?.id,
          senderName: msg.sender?.name,
          content: msg.text || msg.content || msg.event,
          type: msg.type,
          timestamp: new Date(msg.timestamp),
          meta: { sender: msg.sender },
          status: msg.status,
          isRead: msg.isRead || false,
          isOutgoing: msg.isOutgoing || false,
        },
        update: {
          content: msg.text || msg.content || msg.event,
          type: msg.type,
          status: msg.status,
          isRead: msg.isRead || false,
        },
      });
      messageCount++;
    }
  }
  console.log(`  ✓ ${messageCount} messages\n`);

  // 14) Feed Posts
  console.log('Creating feed posts...');
  for (const post of store.feedPosts) {
    await prisma.feedPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        businessId: post.data?.distributorId || post.data?.businessId || null,
        type: post.type,
        timestamp: post.timestamp,
        data: post.data,
        createdAt: new Date(post.createdAt),
      },
      update: {
        type: post.type,
        timestamp: post.timestamp,
        data: post.data,
      },
    });
  }
  console.log(`  ✓ ${store.feedPosts.length} feed posts\n`);

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

