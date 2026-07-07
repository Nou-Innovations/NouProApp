/**
 * Event Messages Service
 * 
 * Creates chat messages when business events occur (orders, invoices, etc.)
 * This bridges the gap between business events and the chat system.
 */

const { getRepos } = require('../repositories');

// Realtime deps are injected once from server.js (where `io` and the offline-push
// helper live) so this service can broadcast + push order events without a global.
let deps = { io: null, sendPushToOfflineParticipants: null };
function init(d) {
  deps = { ...deps, ...(d || {}) };
}

/**
 * Creates a message in the appropriate chat when a business event occurs.
 * Finds or creates a conversation between the two parties.
 * 
 * @param {Object} params
 * @param {string} params.type - Message type: 'order_event' | 'invoice' | 'estimate' | 'status_update'
 * @param {string} params.fromBusinessId - Sender business ID
 * @param {string} params.toBusinessId - Recipient business ID (optional for single-party events)
 * @param {string} params.entityId - The entity ID (orderId, invoiceId, etc.)
 * @param {string} params.actorId - User who triggered the event
 * @param {string} params.actorName - Name of the user who triggered the event
 * @param {Object} params.metadata - Additional data (status, amount, etc.)
 * @returns {Promise<Object>} The created message
 */
async function createEventMessage({
  type,
  fromBusinessId,
  toBusinessId,
  entityId,
  actorId,
  actorName,
  metadata = {}
}) {
  const repos = getRepos();
  
  // 1. Find existing chat between businesses (or create one)
  let chat = await findOrCreateChat(fromBusinessId, toBusinessId);
  
  // 2. Generate message content based on type
  const content = generateMessageContent(type, metadata);
  
  // 3. Create the message
  // Note: isOutgoing is NOT set here - it should be computed on the frontend
  // by comparing message.sender.id with the current user's ID
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { message } = await repos.chatRepo.addMessage(chat.id, {
    id: messageId,
    type,
    content,
    sender: { id: actorId, name: actorName },
    status: 'sent',
    meta: { 
      entityId, 
      entityType: getEntityType(type),
      ...metadata 
    }
  });
  
  return message;
}

/**
 * Find or create a chat between two businesses
 */
async function findOrCreateChat(businessA, businessB) {
  const repos = getRepos();
  
  // Find existing chat between these businesses
  const { chats } = await repos.chatRepo.getByBusinessId(businessA);
  
  // Look for a chat that includes businessB as a participant
  // Participants can be plain string IDs or legacy objects with businessId/companyId
  let chat = chats.find(c => {
    if (!c.participants || !Array.isArray(c.participants)) return false;
    return c.participants.some(p =>
      p === businessB || p.businessId === businessB || p.companyId === businessB
    );
  });
  
  // Also search chats owned by businessB that include businessA (bidirectional)
  if (!chat && businessB) {
    const { chats: chatsB } = await repos.chatRepo.getByBusinessId(businessB);
    chat = chatsB.find(c => {
      if (!c.participants || !Array.isArray(c.participants)) return false;
      return c.participants.some(p =>
        p === businessA || p.businessId === businessA || p.companyId === businessA
      );
    });
  }
  
  // If no existing chat found in either direction, create one
  if (!chat && businessB) {
    chat = await repos.chatRepo.create({
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      companyId: businessA,
      type: 'supplier',
      name: 'Business Chat',
      participants: [businessA, businessB],
      unreadCount: 0
    });
  }
  
  // If still no chat (single-party event), create a dedicated activity feed chat
  if (!chat) {
    chat = await repos.chatRepo.create({
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      companyId: businessA,
      type: 'internal',
      name: 'Activity Feed',
      participants: [businessA],
      unreadCount: 0,
    });
  }
  
  return chat;
}

/**
 * Generate human-readable content based on message type
 */
function generateMessageContent(type, metadata) {
  switch (type) {
    case 'order_event':
      return `New order #${metadata.orderNumber || metadata.entityId} created`;
    case 'status_update':
      return `Order status changed from ${metadata.previousStatus} to ${metadata.status}`;
    case 'invoice':
      return `Invoice for ${formatCurrency(metadata.amount, metadata.currency)} sent`;
    case 'estimate':
      return `Estimate for ${formatCurrency(metadata.amount, metadata.currency)} sent`;
    case 'estimate_confirmed':
      return `Estimate confirmed and converted to invoice`;
    case 'stock_alert':
      return `Low stock alert: ${metadata.productName || 'Unknown product'} has only ${metadata.currentStock ?? 0} units remaining`;
    default:
      return `Business event: ${type}`;
  }
}

/**
 * Get entity type from message type
 */
function getEntityType(type) {
  switch (type) {
    case 'order_event':
    case 'status_update':
      return 'order';
    case 'invoice':
      return 'invoice';
    case 'estimate':
    case 'estimate_confirmed':
      return 'estimate';
    case 'stock_alert':
      return 'stock';
    default:
      return 'unknown';
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount, currency = 'EUR') {
  if (!amount) return '€0.00';
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// ============================================================================
// Order events (dedicated path — see CHAT_AUDIT.md Theme A / Phase 2)
// Orders resolve to a canonical buyer<->seller chat with real USER participants,
// carry a full OrderEventPayload the card can render, and broadcast + push live.
// This is intentionally separate from createEventMessage so invoices/procurement
// keep their current behaviour untouched.
// ============================================================================

/** Accepted member USER ids of a business (empty array on any failure). */
async function resolveMemberUserIds(businessId) {
  if (!businessId) return [];
  const repos = getRepos();
  try {
    const members = await repos.memberRepo.listBusinessMembers(businessId);
    return (members || [])
      .filter((m) => m.status === 'accepted' && m.userId)
      .map((m) => m.userId);
  } catch (e) {
    return [];
  }
}

/**
 * Post an order lifecycle event (created / status change) into the canonical
 * buyer<->seller chat, live.
 * @param {object} params
 * @param {object} params.order       - the full order row (has businessId, buyerBusinessId, items, totalAmount, status...)
 * @param {string} params.actorId     - user who triggered the event
 * @param {string} params.actorName   - display name of the actor
 * @param {string} [params.previousStatus] - set for status-change events (drives the text)
 * @returns {Promise<object|null>} the created (mapped) message, or null
 */
async function postOrderEvent({ order, actorId, actorName, previousStatus = null }) {
  const repos = getRepos();
  if (!order || !order.id) return null;

  const sellerBiz = order.businessId;
  const buyerBiz = order.buyerBusinessId || null;
  const isB2B = !!buyerBiz;

  // 1. Resolve real USER participants (business ids are NEVER stored as participants).
  const [sellerUserIds, buyerUserIds] = await Promise.all([
    resolveMemberUserIds(sellerBiz),
    isB2B ? resolveMemberUserIds(buyerBiz) : Promise.resolve([]),
  ]);
  const participantIds = Array.from(new Set([
    ...sellerUserIds,
    ...buyerUserIds,
    ...(order.createdBy ? [order.createdBy] : []),
  ].filter(Boolean)));

  // 2. Canonical, deterministic chat id → same chat regardless of event direction,
  //    and no duplicates (fixes A3/A7). B2B = supplier chat; B2C = seller activity feed.
  const chatId = isB2B
    ? `chat-ord-${[buyerBiz, sellerBiz].sort().join('__')}`
    : `chat-actfeed-${sellerBiz}`;

  // Business records for buyer/seller display on the card (best-effort).
  let sellerBusiness = null;
  let buyerBusiness = null;
  try { sellerBusiness = await repos.businessRepo.getById(sellerBiz); } catch (e) { /* ignore */ }
  if (isB2B) {
    try { buyerBusiness = await repos.businessRepo.getById(buyerBiz); } catch (e) { /* ignore */ }
  }
  const chatName = isB2B
    ? `${sellerBusiness?.name || 'Seller'} ↔ ${buyerBusiness?.name || order.buyerBusinessName || 'Buyer'}`
    : `${sellerBusiness?.name || 'Business'} · Orders`;

  // 3. Find-or-create the chat; reconcile participants if it already exists.
  let chat = await repos.chatRepo.getById(chatId);
  if (!chat) {
    try {
      chat = await repos.chatRepo.create({
        id: chatId,
        companyId: sellerBiz,
        type: isB2B ? 'supplier' : 'internal',
        name: chatName,
        participants: participantIds,
        unreadCount: 0,
      });
    } catch (createErr) {
      // Lost a create race with a concurrent event — reuse the now-existing chat.
      chat = await repos.chatRepo.getById(chatId);
      if (!chat) throw createErr;
    }
  }
  if (chat) {
    const existing = Array.isArray(chat.participants) ? chat.participants : [];
    const missing = participantIds.filter((id) => !existing.includes(id));
    if (missing.length) {
      try { await repos.chatRepo.addParticipants(chatId, missing); } catch (e) { /* ignore */ }
    }
  }

  // 4. Build the OrderEventPayload the card renders (order.status already matches
  //    OrderEventStatus, so it is passed through directly).
  let delivery = { type: 'delivery' };
  try {
    const d = await repos.deliveryRepo.getByOrderId(order.id);
    if (d) delivery = { type: 'delivery', id: d.id, expectedDate: d.scheduledDate || d.expectedDate || undefined };
  } catch (e) { /* ignore */ }

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const itemsPreview = rawItems.slice(0, 20).map((it, i) => ({
    id: String(it.id || it.productId || i),
    name: it.name || it.description || it.productName || 'Item',
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice != null ? it.unitPrice : it.price) || 0,
  }));
  const totalAmount = Number(order.totalAmount) || 0;
  const createdAtIso = order.createdAt instanceof Date
    ? order.createdAt.toISOString()
    : (order.createdAt || new Date().toISOString());

  const payload = {
    orderId: order.id,
    orderRef: order.id,
    buyer: {
      id: buyerBiz || '',
      name: buyerBusiness?.name || order.buyerBusinessName || order.customerName || 'Customer',
      logo: buyerBusiness?.logoUrl || '',
      location: '',
    },
    seller: {
      id: sellerBiz || '',
      name: sellerBusiness?.name || 'Seller',
      logo: sellerBusiness?.logoUrl || '',
      location: '',
    },
    status: order.status || 'NEW',
    paymentStatus: order.paymentStatus || 'UNPAID',
    itemsPreview,
    totalItemsCount: rawItems.length,
    // The order model has no tax/delivery breakdown, so subtotal == total and the
    // rest are 0 (the card renders totals honestly rather than inventing splits).
    subtotal: totalAmount,
    vatAmount: 0,
    vatPercent: 0,
    deliveryFee: 0,
    totalAmount,
    currency: order.currency || 'MUR',
    delivery,
    createdAt: createdAtIso,
    schemaVersion: '1.0',
  };

  const humanText = previousStatus
    ? `Order #${order.id}: ${previousStatus} → ${order.status}`
    : `New order #${order.id}`;

  // 5. Persist.
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { message: created, participantCounts } = await repos.chatRepo.addMessage(chatId, {
    id: messageId,
    type: 'order_event',
    content: humanText,
    sender: { id: actorId, name: actorName },
    status: 'sent',
    meta: { isSystem: true, payload, entityId: order.id, entityType: 'order' },
  }, { incrementUnread: true });

  // 6. Broadcast live + push (mirrors the normal send route). Never break the order flow.
  try {
    if (deps.io) {
      deps.io.to(`chat:${chatId}`).emit('message', created);
      const lastMessagePayload = {
        id: created.id,
        content: humanText,
        type: 'order_event',
        senderId: actorId,
        senderName: actorName || '',
        timestamp: created.timestamp,
      };
      for (const p of participantCounts) {
        deps.io.to(`user:${p.userId}`).emit('chat_update', {
          id: chatId,
          unreadCount: p.unreadCount,
          lastMessage: lastMessagePayload,
        });
      }
    }
    if (deps.sendPushToOfflineParticipants) {
      deps.sendPushToOfflineParticipants(chatId, actorName || 'NouPro', humanText, actorId);
    }
  } catch (emitErr) {
    // realtime/push failure must not fail the order operation
  }

  return created;
}

module.exports = {
  init,
  createEventMessage,
  postOrderEvent,
  findOrCreateChat,
  generateMessageContent
};
