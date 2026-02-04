/**
 * Chat Repository - Prisma Implementation
 * 
 * Note: Prisma schema uses `businessId` but API contract uses `companyId`.
 * This repo maps businessId → companyId in all responses.
 */
const { prisma } = require('../../db/prisma');

/**
 * Map Prisma chat object to API format (businessId → companyId)
 */
function mapChatToApi(chat) {
  if (!chat) return chat;
  const { businessId, ...rest } = chat;
  return { ...rest, companyId: businessId };
}

/**
 * Map array of Prisma chat objects to API format
 */
function mapChatsToApi(chats) {
  return chats.map(mapChatToApi);
}

async function list() {
  const chats = await prisma.chat.findMany({
    orderBy: { updatedAt: 'desc' }
  });
  return mapChatsToApi(chats);
}

async function getById(id) {
  const chat = await prisma.chat.findUnique({
    where: { id }
  });
  return mapChatToApi(chat);
}

/**
 * Get chats by company ID
 * @param {string} companyId - The company ID to filter by
 */
async function getByCompanyId(companyId) {
  const chats = await prisma.chat.findMany({
    where: { businessId: companyId }, // Prisma field is businessId
    orderBy: { updatedAt: 'desc' }
  });
  return mapChatsToApi(chats);
}

async function getByLocationId(locationId) {
  const chats = await prisma.chat.findMany({
    where: { locationId },
    orderBy: { updatedAt: 'desc' }
  });
  return mapChatsToApi(chats);
}

/**
 * Create a new chat
 * @param {object} data - Chat data with companyId (maps to Prisma businessId)
 */
async function create(data) {
  // Map companyId to businessId for Prisma
  const { companyId, ...rest } = data;
  const chat = await prisma.chat.create({
    data: {
      ...rest,
      businessId: companyId, // Map to Prisma field
      participants: data.participants || [],
      lastMessage: data.lastMessage || null
    }
  });
  return mapChatToApi(chat);
}

async function update(id, patch) {
  // If patch contains companyId, map to businessId for Prisma
  const { companyId, ...restPatch } = patch;
  const prismaData = companyId ? { ...restPatch, businessId: companyId } : restPatch;
  
  const chat = await prisma.chat.update({
    where: { id },
    data: prismaData
  });
  return mapChatToApi(chat);
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

// Message operations
async function getMessages(chatId) {
  return prisma.message.findMany({
    where: { chatId },
    orderBy: { timestamp: 'asc' }
  });
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
      meta: message.meta || { sender: message.sender },
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
  
  return newMessage;
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
  if (!msg) return null;
  return {
    ...msg,
    sender: msg.senderId ? { id: msg.senderId, name: msg.senderName } : null,
    text: msg.content
  };
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

  return {
    ...updated,
    sender: updated.senderId ? { id: updated.senderId, name: updated.senderName } : null,
    text: updated.content
  };
}

module.exports = { 
  list, 
  getById, 
  getByCompanyId,
  getByLocationId, 
  create, 
  update, 
  delete: remove,
  getMessages,
  addMessage,
  getMessage,
  deleteMessage
};

