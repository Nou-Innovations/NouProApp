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

// ============================================================================
// Business event → chat bridge. Each domain (orders / invoices / procurement)
// has a dedicated post*Event() that resolves a canonical chat with real USER
// participants and broadcasts + pushes live. See CHAT_AUDIT.md Theme A.
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
 * Find (or create) the canonical chat for a seller and an optional counterpart business,
 * with real USER participants. Deterministic id → one shared chat per business pair (so a
 * business's orders + invoices land together), no duplicates. Reconciles participants
 * non-destructively when the chat already exists.
 * @returns {Promise<{ chatId: string, participantIds: string[] }>}
 */
async function resolveBusinessPairChat({ sellerBiz, otherBiz = null, extraUserIds = [], chatName }) {
  const repos = getRepos();
  const isPair = !!otherBiz && otherBiz !== sellerBiz;

  const [sellerUserIds, otherUserIds] = await Promise.all([
    resolveMemberUserIds(sellerBiz),
    isPair ? resolveMemberUserIds(otherBiz) : Promise.resolve([]),
  ]);
  const participantIds = Array.from(new Set([
    ...sellerUserIds, ...otherUserIds, ...extraUserIds,
  ].filter(Boolean)));

  const chatId = isPair
    ? `chat-ord-${[otherBiz, sellerBiz].sort().join('__')}`
    : `chat-actfeed-${sellerBiz}`;

  let chat = await repos.chatRepo.getById(chatId);
  if (!chat) {
    try {
      chat = await repos.chatRepo.create({
        id: chatId,
        companyId: sellerBiz,
        type: isPair ? 'supplier' : 'internal',
        name: chatName || (isPair ? 'Business chat' : 'Activity Feed'),
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
  return { chatId, participantIds };
}

/**
 * Broadcast a just-persisted event message live + push offline participants.
 * Mirrors the normal send route; never throws (realtime failure must not break the op).
 */
function broadcastEventMessage({ chatId, created, participantCounts, humanText, actorId, actorName }) {
  try {
    if (deps.io) {
      deps.io.to(`chat:${chatId}`).emit('message', created);
      const lastMessagePayload = {
        id: created.id,
        content: humanText,
        type: created.type || 'event',
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
    // realtime/push failure must not fail the underlying operation
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

  // Business records for buyer/seller display on the card + the chat name (best-effort).
  let sellerBusiness = null;
  let buyerBusiness = null;
  try { sellerBusiness = await repos.businessRepo.getById(sellerBiz); } catch (e) { /* ignore */ }
  if (isB2B) {
    try { buyerBusiness = await repos.businessRepo.getById(buyerBiz); } catch (e) { /* ignore */ }
  }
  const chatName = isB2B
    ? `${sellerBusiness?.name || 'Seller'} ↔ ${buyerBusiness?.name || order.buyerBusinessName || 'Buyer'}`
    : `${sellerBusiness?.name || 'Business'} · Orders`;

  // Canonical buyer<->seller chat with real user participants (incl. the order creator).
  const { chatId } = await resolveBusinessPairChat({
    sellerBiz,
    otherBiz: buyerBiz,
    extraUserIds: order.createdBy ? [order.createdBy] : [],
    chatName,
  });

  // Build the OrderEventPayload the card renders (order.status already matches
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

  broadcastEventMessage({ chatId, created, participantCounts, humanText, actorId, actorName });
  return created;
}

/**
 * Post an invoice / estimate lifecycle event into the client's chat, live.
 * Recipient business = the invoice's clientBusinessId, else the linked order's buyer.
 * If neither is known, it lands in the seller's activity feed.
 * @param {object} params
 * @param {object} params.invoice   - the full invoice row
 * @param {string} params.actorId   - user who triggered the event
 * @param {string} params.actorName - display name of the actor
 * @param {'invoice'|'estimate'|'estimate_confirmed'} params.kind
 * @param {object|null} [params.details] - card details (from buildInvoiceCardDetails); omit for estimate_confirmed
 * @returns {Promise<object|null>} the created (mapped) message, or null
 */
async function postInvoiceEvent({ invoice, actorId, actorName, kind, details = null }) {
  const repos = getRepos();
  if (!invoice || !invoice.id) return null;

  const sellerBiz = invoice.businessId;

  // Resolve the recipient business: explicit clientBusinessId, else via a linked order's buyer.
  let recipientBiz = invoice.clientBusinessId || null;
  if (!recipientBiz && invoice.orderId) {
    try {
      const order = await repos.orderRepo.getById(invoice.orderId);
      recipientBiz = order?.buyerBusinessId || null;
    } catch (e) { /* ignore */ }
  }
  const isPair = !!recipientBiz && recipientBiz !== sellerBiz;

  // Business records for the chat name (best-effort).
  let sellerBusiness = null;
  let recipientBusiness = null;
  try { sellerBusiness = await repos.businessRepo.getById(sellerBiz); } catch (e) { /* ignore */ }
  if (isPair) {
    try { recipientBusiness = await repos.businessRepo.getById(recipientBiz); } catch (e) { /* ignore */ }
  }
  const chatName = isPair
    ? `${sellerBusiness?.name || 'Seller'} ↔ ${recipientBusiness?.name || invoice.clientName || 'Client'}`
    : `${sellerBusiness?.name || 'Business'} · Orders`;

  const { chatId } = await resolveBusinessPairChat({
    sellerBiz,
    otherBiz: recipientBiz,
    chatName,
  });

  const num = invoice.invoiceNumber || invoice.id;

  // estimate_confirmed → a lightweight system line (no card; avoids duplicating the invoice card).
  // invoice / estimate → a card carrying meta.details (built by the caller) + the entity id.
  let messageType;
  let humanText;
  let meta;
  if (kind === 'estimate_confirmed') {
    messageType = 'event';
    humanText = `Estimate #${num} accepted`;
    meta = { isSystem: true, event: humanText, entityId: invoice.id, entityType: 'invoice' };
  } else {
    messageType = kind === 'estimate' ? 'estimate' : 'invoice';
    humanText = messageType === 'estimate' ? `Estimate #${num} sent` : `Invoice #${num} sent`;
    meta = { isSystem: true, entityId: invoice.id, entityType: messageType };
    if (details) meta.details = details;
    if (messageType === 'invoice') meta.invoiceId = invoice.id;
    else meta.estimateId = invoice.id;
  }

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { message: created, participantCounts } = await repos.chatRepo.addMessage(chatId, {
    id: messageId,
    type: messageType,
    content: humanText,
    sender: { id: actorId, name: actorName },
    status: 'sent',
    meta,
  }, { incrementUnread: true });

  broadcastEventMessage({ chatId, created, participantCounts, humanText, actorId, actorName });
  return created;
}

/** Human-readable line for a procurement / stock event. */
function procurementText(type, metadata = {}) {
  const m = metadata || {};
  switch (type) {
    case 'purchase_request_created':   return 'Purchase request created';
    case 'purchase_request_submitted': return 'Purchase request submitted for approval';
    case 'purchase_request_approved':  return 'Purchase request approved';
    case 'purchase_request_rejected':  return `Purchase request rejected${m.reason ? `: ${m.reason}` : ''}`;
    case 'purchase_order_sent':        return 'Purchase order sent to supplier';
    case 'purchase_order_confirmed':   return 'Purchase order confirmed';
    case 'purchase_order_received':    return 'Purchase order fully received';
    case 'purchase_order_status_changed':
      return `Purchase order: ${m.fromStatus || '—'} → ${m.toStatus || '—'}`;
    case 'goods_received': {
      const n = Number(m.itemCount) || 0;
      return `Goods received (${n} item${n === 1 ? '' : 's'})`;
    }
    case 'stock_alert':
      return `Low stock: ${m.productName || 'a product'} — ${m.currentStock ?? 0} left`;
    default:
      return 'Business update';
  }
}

/**
 * Post an internal procurement / stock event (purchase requests, purchase orders,
 * goods receipts, low-stock alerts) as a live system line into the business's own
 * activity feed (all accepted members). Internal-only — no external counterparty.
 * @returns {Promise<object|null>} the created (mapped) message, or null
 */
async function postProcurementEvent({ businessId, type, entityId, actorId, actorName, metadata = {} }) {
  const repos = getRepos();
  if (!businessId) return null;

  let businessName = null;
  try { businessName = (await repos.businessRepo.getById(businessId))?.name || null; } catch (e) { /* ignore */ }

  const { chatId } = await resolveBusinessPairChat({
    sellerBiz: businessId,
    otherBiz: null,
    chatName: `${businessName || 'Business'} · Activity`,
  });

  const humanText = procurementText(type, metadata);

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { message: created, participantCounts } = await repos.chatRepo.addMessage(chatId, {
    id: messageId,
    type: 'event',
    content: humanText,
    sender: { id: actorId, name: actorName },
    status: 'sent',
    meta: { isSystem: true, event: humanText, entityId, entityType: 'procurement', procurementType: type },
  }, { incrementUnread: true });

  broadcastEventMessage({ chatId, created, participantCounts, humanText, actorId, actorName });
  return created;
}

module.exports = {
  init,
  postOrderEvent,
  postInvoiceEvent,
  postProcurementEvent,
};
