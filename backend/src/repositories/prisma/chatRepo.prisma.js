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
function mapMessageToApi(msg, requestingUserId = null) {
  if (!msg) return msg;
  const meta = msg.meta || {};
  const mapped = {
    id: msg.id,
    chatId: msg.chatId,
    type: msg.type || 'text',
    sender: {
      id: meta.sender?.id || msg.senderId || 'unknown',
      name: meta.sender?.name || msg.senderName || 'Unknown',
      avatar: meta.sender?.avatar || '',
      role: meta.sender?.role || 'personal',
    },
    timestamp: msg.timestamp,
    status: msg.status || 'sent',
    // Compute isOutgoing per-viewer when requestingUserId is available;
    // fall back to stored value for backwards compatibility (socket emit, etc.)
    isOutgoing: requestingUserId
      ? (msg.senderId === requestingUserId)
      : (msg.isOutgoing || false),
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
    mapped.audioUrl = meta.audioUrl;
    mapped.durationSeconds = meta.durationSeconds;
  } else if (msg.type === 'profile') {
    mapped.profileId = meta.profileId;
    mapped.profileName = meta.profileName;
    mapped.profileAvatar = meta.profileAvatar;
    mapped.profileType = meta.profileType || 'user';
  } else if (msg.type === 'contact') {
    mapped.contactName = meta.contactName || msg.content;
    mapped.contactPhone = meta.contactPhone;
    mapped.contactAvatar = meta.contactAvatar;
    mapped.contactId = meta.contactId;
  } else if (msg.type === 'invoice') {
    mapped.invoiceId = meta.invoiceId;
    if (meta.details) mapped.details = meta.details;
  } else if (msg.type === 'estimate') {
    mapped.estimateId = meta.estimateId;
    if (meta.details) mapped.details = meta.details;
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

  // Forwarded from context
  if (meta.forwardedFrom) {
    mapped.forwardedFrom = meta.forwardedFrom;
  }

  // Mentions
  if (meta.mentions) {
    mapped.mentions = meta.mentions;
  }

  // Edited at
  if (meta.editedAt) {
    mapped.editedAt = meta.editedAt;
  }

  return mapped;
}

// ============================================================================
// Chat operations
// ============================================================================

async function getById(id) {
  return prisma.chat.findUnique({
    where: { id }
  });
}

/**
 * Get chats by company ID (supports cursor-based pagination)
 * @param {string} companyId - The company ID to filter by
 * @param {object} [options] - Pagination options
 * @param {number} [options.limit] - Max chats to return. Omit to return all.
 * @param {string} [options.cursor] - Chat ID to start after (cursor-based pagination)
 * @returns {{ chats: Array, nextCursor: string|null }}
 */
async function getByCompanyId(companyId, { limit, cursor } = {}) {
  if (!companyId) return { chats: [], nextCursor: null };

  const query = {
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
  };

  if (limit) {
    query.take = limit + 1;
    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }
  }

  const chats = await prisma.chat.findMany(query);

  let nextCursor = null;
  if (limit && chats.length > limit) {
    chats.pop();
    nextCursor = chats[chats.length - 1].id;
  }

  return { chats, nextCursor };
}

/**
 * Get chats by user ID (for personal mode, supports cursor-based pagination)
 * Queries via the ChatParticipant join table for efficient, indexed lookup.
 * @param {string} userId - The user ID to filter by
 * @param {object} [options] - Pagination options
 * @param {number} [options.limit] - Max chats to return. Omit to return all.
 * @param {string} [options.cursor] - Chat ID to start after (cursor-based pagination)
 * @returns {{ chats: Array, nextCursor: string|null }}
 */
async function getByUserId(userId, { limit, cursor } = {}) {
  // Use Prisma relation filter to query chats directly via the ChatParticipant relation.
  // This avoids the two-step fetch (all chatIds then paginate) which broke cursor semantics
  // when a chat's updatedAt changed between page fetches.
  const query = {
    where: {
      chatParticipants: { some: { userId } },
    },
    orderBy: { updatedAt: 'desc' },
  };

  if (limit) {
    query.take = limit + 1;
    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }
  }

  const chats = await prisma.chat.findMany(query);

  let nextCursor = null;
  if (limit && chats.length > limit) {
    chats.pop();
    nextCursor = chats[chats.length - 1].id;
  }

  return { chats, nextCursor };
}

/**
 * Create a new chat
 * Also creates ChatParticipant records for indexed participant lookups.
 * @param {object} data - Chat data with companyId
 */
async function create(data) {
  const participants = data.participants || [];

  // Use a transaction to ensure Chat and ChatParticipant rows are created atomically
  return prisma.$transaction(async (tx) => {
    const chat = await tx.chat.create({
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
      await tx.chatParticipant.createMany({
        data: participants.map(userId => ({ chatId: chat.id, userId })),
        skipDuplicates: true,
      });
    }

    return chat;
  });
}

async function update(id, patch) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.chat.update({
      where: { id },
      data: patch,
    });

    // Sync ChatParticipant rows when participants list changes
    if (patch.participants && Array.isArray(patch.participants)) {
      await tx.chatParticipant.deleteMany({ where: { chatId: id } });
      if (patch.participants.length > 0) {
        await tx.chatParticipant.createMany({
          data: patch.participants.map(userId => ({ chatId: id, userId })),
          skipDuplicates: true,
        });
      }
    }

    return updated;
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
 * @param {object} opts - { limit, cursor, requestingUserId }
 */
async function getMessages(chatId, { limit = 50, cursor = null, requestingUserId = null } = {}) {
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
  return msgs.map(msg => mapMessageToApi(msg, requestingUserId));
}

async function addMessage(chatId, message, options = {}) {
  const { incrementUnread = true } = options;
  
  return prisma.$transaction(async (tx) => {
    const newMessage = await tx.message.create({
      data: {
        id: message.id,
        chatId,
        senderId: message.sender?.id,
        senderName: message.sender?.name,
        content: message.text || message.content,
        type: message.type,
        meta: {
          // Spread extra meta first so explicit fields below take precedence
          ...(message.meta || {}),
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
          ...(message.audioUrl && { audioUrl: message.audioUrl }),
          ...(message.invoiceId && { invoiceId: message.invoiceId }),
          ...(message.estimateId && { estimateId: message.estimateId }),
          ...(message.details && { details: message.details }),
          ...(message.event && { event: message.event }),
          ...(message.profileId && { profileId: message.profileId }),
          ...(message.profileName && { profileName: message.profileName }),
          ...(message.profileAvatar && { profileAvatar: message.profileAvatar }),
          ...(message.profileType && { profileType: message.profileType }),
          ...(message.contactName && { contactName: message.contactName }),
          ...(message.contactPhone && { contactPhone: message.contactPhone }),
          ...(message.contactAvatar && { contactAvatar: message.contactAvatar }),
          ...(message.contactId && { contactId: message.contactId }),
          ...(message.forwardedFrom && { forwardedFrom: message.forwardedFrom }),
          ...(message.mentions && { mentions: message.mentions }),
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
    
    await tx.chat.update({
      where: { id: chatId },
      data: updateData
    });

    // Increment per-participant unread counts (everyone except the sender)
    // Then read the updated counts in the same transaction so callers get consistent values
    let participantCounts = [];
    if (incrementUnread) {
      await tx.chatParticipant.updateMany({
        where: {
          chatId,
          userId: { not: message.sender?.id },
        },
        data: { unreadCount: { increment: 1 } },
      });
      participantCounts = await tx.chatParticipant.findMany({
        where: { chatId },
        select: { userId: true, unreadCount: true },
      });
    }
    
    const mappedMessage = mapMessageToApi(newMessage);
    return { message: mappedMessage, participantCounts };
  });
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

  return prisma.$transaction(async (tx) => {
    const updated = await tx.message.update({
      where: { id: messageId },
      data: {
        content: '[deleted]',
        type: 'deleted',
        status: 'deleted',
        meta: { ...(existing.meta || {}), deletedAt: new Date().toISOString() }
      }
    });

    // Decrement unread counts for participants who hadn't read this message yet.
    // A message is "unread" for a participant if they have no ReadReceipt for this chat,
    // or their latest ReadReceipt points to a message older than the deleted one.
    // Guard: if senderId is null (system messages), don't filter by sender
    const senderFilter = existing.senderId
      ? { userId: { not: existing.senderId } }
      : {};
    const participants = await tx.chatParticipant.findMany({
      where: { chatId, ...senderFilter, unreadCount: { gt: 0 } },
    });

    for (const participant of participants) {
      const receipt = await tx.readReceipt.findFirst({
        where: { chatId, userId: participant.userId },
        orderBy: { readAt: 'desc' },
        include: { message: { select: { timestamp: true } } },
      });
      // If no receipt or receipt's message is older than deleted message, decrement
      const wasUnread = !receipt || !receipt.message || receipt.message.timestamp < existing.timestamp;
      if (wasUnread) {
        await tx.chatParticipant.update({
          where: { id: participant.id },
          data: { unreadCount: { decrement: 1 } },
        });
      }
    }

    // If the deleted message was the lastMessage, promote the actual newest non-deleted message
    const chat = await tx.chat.findUnique({ where: { id: chatId } });
    if (chat?.lastMessage?.id === messageId) {
      const newestMsg = await tx.message.findFirst({
        where: { chatId, type: { not: 'deleted' } },
        orderBy: { timestamp: 'desc' },
      });
      if (newestMsg) {
        await tx.chat.update({
          where: { id: chatId },
          data: {
            lastMessage: {
              id: newestMsg.id,
              content: newestMsg.content,
              type: newestMsg.type,
              senderId: newestMsg.senderId,
              senderName: newestMsg.senderName,
              timestamp: newestMsg.timestamp,
              isOutgoing: newestMsg.isOutgoing,
              status: newestMsg.status,
            },
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.chat.update({
          where: { id: chatId },
          data: { lastMessage: null, updatedAt: new Date() },
        });
      }
    }

    // Read the updated chat and participant counts so callers can emit socket events
    const updatedChat = await tx.chat.findUnique({ where: { id: chatId } });
    const allParticipants = await tx.chatParticipant.findMany({
      where: { chatId },
      select: { userId: true, unreadCount: true },
    });

    return {
      message: mapMessageToApi(updated),
      updatedChat,
      participantCounts: allParticipants,
    };
  });
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
  if (!userId) return;

  await prisma.$transaction(async (tx) => {
    // Reset only THIS user's per-participant unread count
    await tx.chatParticipant.updateMany({
      where: { chatId, userId },
      data: { unreadCount: 0 },
    });

    // Upsert a ReadReceipt for the latest message
    const latestMessage = await tx.message.findFirst({
      where: { chatId },
      orderBy: { timestamp: 'desc' },
      select: { id: true },
    });

    if (latestMessage) {
      await tx.readReceipt.upsert({
        where: { chatId_userId: { chatId, userId } },
        create: { chatId, userId, messageId: latestMessage.id },
        update: { messageId: latestMessage.id, readAt: new Date() },
      });
    }
  });
}

/**
 * Get per-user unread counts for a list of chat IDs.
 * Returns a map of chatId -> unreadCount for the specified user.
 */
async function getParticipantUnreadCounts(chatIds, userId) {
  if (!chatIds.length || !userId) return {};
  const participants = await prisma.chatParticipant.findMany({
    where: { chatId: { in: chatIds }, userId },
    select: { chatId: true, unreadCount: true },
  });
  const counts = {};
  for (const p of participants) {
    counts[p.chatId] = p.unreadCount;
  }
  return counts;
}

/**
 * Get all participants and their unread counts for a given chat.
 * Returns an array of { userId, unreadCount }.
 */
async function getChatParticipants(chatId) {
  return prisma.chatParticipant.findMany({
    where: { chatId },
    select: { userId: true, unreadCount: true },
  });
}

/**
 * Remove a participant from a chat.
 * Deletes the ChatParticipant row and removes userId from the Chat.participants JSON array.
 * @param {string} chatId
 * @param {string} userId
 * @returns {object} The updated chat
 */
async function removeParticipant(chatId, userId) {
  return prisma.$transaction(async (tx) => {
    // Delete the ChatParticipant row
    await tx.chatParticipant.deleteMany({
      where: { chatId, userId },
    });

    // Get current chat to update participants JSON
    const chat = await tx.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new Error('Chat not found');

    const currentParticipants = Array.isArray(chat.participants) ? chat.participants : [];
    const updatedParticipants = currentParticipants.filter(pid => pid !== userId);

    const updatedChat = await tx.chat.update({
      where: { id: chatId },
      data: { participants: updatedParticipants },
    });

    return updatedChat;
  });
}

/**
 * Edit a message's content (text only).
 * Updates content field and stores editedAt in meta.
 * @param {string} chatId
 * @param {string} messageId
 * @param {string} newContent
 * @returns {object} The mapped updated message
 */
async function editMessage(chatId, messageId, newContent) {
  const existing = await prisma.message.findFirst({
    where: { id: messageId, chatId },
  });
  if (!existing) return null;

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: newContent,
      meta: {
        ...(existing.meta || {}),
        editedAt: new Date().toISOString(),
      },
    },
  });

  return mapMessageToApi(updated);
}

module.exports = {
  getById,
  getByCompanyId,
  getByBusinessId: getByCompanyId, // Alias for backward compatibility (eventMessages.js)
  getByUserId,
  create,
  update,
  delete: remove,
  getMessages,
  addMessage,
  getMessage,
  deleteMessage,
  markMessagesAsRead,
  getParticipantUnreadCounts,
  getChatParticipants,
  removeParticipant,
  editMessage,
};
