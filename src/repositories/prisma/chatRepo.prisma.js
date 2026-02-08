/**
 * Chat Repository - Prisma Implementation
 * 
 * Prisma schema uses companyId (mapped to DB column businessId via @map).
 * No manual mapping needed — Prisma Client returns companyId directly.
 */
const { prisma } = require('../../db/prisma');

/**
 * Map Prisma message row to frontend-expected API shape.
 * Prisma stores flat fields (senderId, senderName, content, meta).
 * Frontend expects nested shape (sender: { id, name, avatar, role }, text, imageUrl, etc.).
 */
function mapMessageToApi(msg) {
  if (!msg) return msg;
  const meta = msg.meta || {};
  const mapped = {
    id: msg.id,
    chatId: msg.chatId,
    type: msg.type || 'text',
    sender: meta.sender || {
      id: msg.senderId || 'unknown',
      name: msg.senderName || 'Unknown',
      avatar: '',
      role: 'business'
    },
    timestamp: msg.timestamp,
    status: msg.status || 'sent',
    isOutgoing: msg.isOutgoing || false,
    isRead: msg.isRead || false,
  };

  // Type-specific field extraction
  if (msg.type === 'text') {
    mapped.text = msg.content || '';
  } else if (msg.type === 'image') {
    mapped.imageUrl = meta.imageUrl || msg.content;
  } else if (msg.type === 'pdf') {
    mapped.fileName = meta.fileName || msg.content;
    mapped.fileUrl = meta.fileUrl;
  } else if (msg.type === 'location') {
    mapped.latitude = meta.latitude;
    mapped.longitude = meta.longitude;
    mapped.address = meta.address;
    mapped.locationName = meta.locationName;
  } else if (msg.type === 'voice') {
    mapped.durationSeconds = meta.durationSeconds;
  } else if (msg.type === 'invoice') {
    mapped.invoiceId = meta.invoiceId;
  } else if (msg.type === 'estimate') {
    mapped.estimateId = meta.estimateId;
  } else if (msg.type === 'event') {
    mapped.event = msg.content || meta.event;
  } else if (msg.type === 'deleted') {
    // No extra fields needed
  } else if (msg.type === 'order_event') {
    mapped.isSystem = meta.isSystem || false;
    mapped.payload = meta.payload;
  } else {
    // Fallback: put content into text
    mapped.text = msg.content || '';
  }

  // Reply context
  if (meta.replyingTo) {
    mapped.replyingTo = meta.replyingTo;
  }

  return mapped;
}

// ============================================================================
// Chat operations
// ============================================================================

async function list() {
  return prisma.chat.findMany({
    orderBy: { updatedAt: 'desc' }
  });
}

async function getById(id) {
  return prisma.chat.findUnique({
    where: { id }
  });
}

/**
 * Get chats by company ID
 * @param {string} companyId - The company ID to filter by
 */
async function getByCompanyId(companyId) {
  if (!companyId) return [];
  return prisma.chat.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' }
  });
}

/**
 * Get chats by user ID (for personal mode)
 * Queries via the ChatParticipant join table for efficient, indexed lookup.
 * @param {string} userId - The user ID to filter by
 */
async function getByUserId(userId) {
  const participations = await prisma.chatParticipant.findMany({
    where: { userId },
    select: { chatId: true }
  });
  const chatIds = participations.map(p => p.chatId);
  if (chatIds.length === 0) return [];
  return prisma.chat.findMany({
    where: { id: { in: chatIds } },
    orderBy: { updatedAt: 'desc' }
  });
}

async function getByLocationId(locationId) {
  return prisma.chat.findMany({
    where: { locationId },
    orderBy: { updatedAt: 'desc' }
  });
}

/**
 * Create a new chat
 * Also creates ChatParticipant records for indexed participant lookups.
 * @param {object} data - Chat data with companyId
 */
async function create(data) {
  const participants = data.participants || [];

  const chat = await prisma.chat.create({
    data: {
      id: data.id,
      companyId: data.companyId || null, // null for personal chats
      locationId: data.locationId || null,
      type: data.type || 'direct',
      name: data.name,
      participants,
      lastMessage: data.lastMessage || null,
      unreadCount: data.unreadCount || 0,
      avatar: data.avatar || null,
    }
  });

  // Create ChatParticipant rows in bulk
  if (participants.length > 0) {
    await prisma.chatParticipant.createMany({
      data: participants.map(userId => ({ chatId: chat.id, userId })),
      skipDuplicates: true,
    });
  }

  return chat;
}

async function update(id, patch) {
  return prisma.chat.update({
    where: { id },
    data: patch
  });
}

async function remove(id) {
  try {
    // Messages will be deleted by cascade
    await prisma.chat.delete({
      where: { id }
    });
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// Message operations
// ============================================================================

/**
 * Get messages for a chat with cursor-based pagination (DB-level).
 * Returns messages in descending order (newest first) for pagination,
 * but the caller can reverse for display.
 * @param {string} chatId
 * @param {object} opts - { limit, cursor }
 */
async function getMessages(chatId, { limit = 50, cursor = null } = {}) {
  const query = {
    where: { chatId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  };

  if (cursor) {
    query.cursor = { id: cursor };
    query.skip = 1; // Skip the cursor message itself
  }

  const msgs = await prisma.message.findMany(query);
  return msgs.map(mapMessageToApi);
}

async function addMessage(chatId, message, options = {}) {
  const { incrementUnread = true } = options;
  
  const newMessage = await prisma.message.create({
    data: {
      id: message.id,
      chatId,
      senderId: message.sender?.id,
      senderName: message.sender?.name,
      content: message.text || message.content,
      type: message.type,
      meta: {
        sender: message.sender,
        ...(message.imageUrl && { imageUrl: message.imageUrl }),
        ...(message.fileUrl && { fileUrl: message.fileUrl }),
        ...(message.fileName && { fileName: message.fileName }),
        ...(message.replyingTo && { replyingTo: message.replyingTo }),
        ...(message.latitude != null && { latitude: message.latitude }),
        ...(message.longitude != null && { longitude: message.longitude }),
        ...(message.address && { address: message.address }),
        ...(message.locationName && { locationName: message.locationName }),
        ...(message.durationSeconds != null && { durationSeconds: message.durationSeconds }),
        ...(message.invoiceId && { invoiceId: message.invoiceId }),
        ...(message.estimateId && { estimateId: message.estimateId }),
        ...(message.event && { event: message.event }),
        ...(message.meta || {}),
      },
      status: message.status || 'sent',
      isRead: message.isRead || false,
      isOutgoing: message.isOutgoing || false
    }
  });
  
  // Update chat's lastMessage and optionally increment unread count
  const updateData = {
    lastMessage: {
      id: newMessage.id,
      content: newMessage.content,
      type: newMessage.type,
      senderId: newMessage.senderId,
      senderName: newMessage.senderName,
      timestamp: newMessage.timestamp,
      isOutgoing: newMessage.isOutgoing,
      status: newMessage.status
    },
    updatedAt: new Date()
  };
  
  // Increment unread count (for recipients to see)
  if (incrementUnread) {
    updateData.unreadCount = { increment: 1 };
  }
  
  await prisma.chat.update({
    where: { id: chatId },
    data: updateData
  });
  
  return mapMessageToApi(newMessage);
}

/**
 * Get a specific message by ID
 * @param {string} chatId - The chat ID
 * @param {string} messageId - The message ID
 * @returns {object|null} The message or null if not found
 */
async function getMessage(chatId, messageId) {
  const msg = await prisma.message.findFirst({
    where: { id: messageId, chatId }
  });
  return mapMessageToApi(msg);
}

/**
 * Soft delete a message (mark as deleted)
 * @param {string} chatId - The chat ID
 * @param {string} messageId - The message ID to delete
 * @returns {object|null} The updated message or null if not found
 */
async function deleteMessage(chatId, messageId) {
  const existing = await prisma.message.findFirst({
    where: { id: messageId, chatId }
  });
  if (!existing) return null;

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: '[deleted]',
      type: 'deleted',
      status: 'deleted',
      meta: { ...(existing.meta || {}), deletedAt: new Date().toISOString() }
    }
  });

  // Update chat.lastMessage if this was the last message
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (chat?.lastMessage?.id === messageId) {
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessage: { ...chat.lastMessage, content: '[deleted]', type: 'deleted' },
        updatedAt: new Date()
      }
    });
  }

  return mapMessageToApi(updated);
}

/**
 * Mark chat as read for a specific user.
 * - Upserts a ReadReceipt linking this user to the latest message in the chat.
 * - Resets the chat-level unreadCount to 0 (simple MVP, works for DMs).
 * - Still bulk-marks messages isRead for backwards compat with existing queries.
 * @param {string} chatId - The chat ID
 * @param {string} userId - The user ID marking as read (optional for backward compat)
 */
async function markMessagesAsRead(chatId, userId) {
  // Bulk-mark messages isRead for backward compatibility
  await prisma.message.updateMany({
    where: { chatId, isRead: false },
    data: { isRead: true }
  });

  // Reset chat-level unread count
  await prisma.chat.update({
    where: { id: chatId },
    data: { unreadCount: 0 }
  });

  // If userId provided, create a per-user ReadReceipt for the latest message
  if (userId) {
    const latestMessage = await prisma.message.findFirst({
      where: { chatId },
      orderBy: { timestamp: 'desc' },
      select: { id: true }
    });

    if (latestMessage) {
      await prisma.readReceipt.upsert({
        where: { chatId_userId: { chatId, userId } },
        create: { chatId, userId, messageId: latestMessage.id },
        update: { messageId: latestMessage.id, readAt: new Date() },
      });
    }
  }
}

module.exports = { 
  list, 
  getById, 
  getByCompanyId,
  getByUserId,
  getByLocationId, 
  create, 
  update, 
  delete: remove,
  getMessages,
  addMessage,
  getMessage,
  deleteMessage,
  markMessagesAsRead
};
