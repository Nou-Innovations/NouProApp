/**
 * Event Messages Service
 * 
 * Creates chat messages when business events occur (orders, invoices, etc.)
 * This bridges the gap between business events and the chat system.
 */

const { getRepos } = require('../repositories');

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

module.exports = { 
  createEventMessage,
  findOrCreateChat,
  generateMessageContent
};
