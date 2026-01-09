/**
 * Chat Repository - Prisma Implementation
 */
const { prisma } = require('../../db/prisma');

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

async function getByBusinessId(businessId) {
  return prisma.chat.findMany({
    where: { businessId },
    orderBy: { updatedAt: 'desc' }
  });
}

async function getByLocationId(locationId) {
  return prisma.chat.findMany({
    where: { locationId },
    orderBy: { updatedAt: 'desc' }
  });
}

async function create(data) {
  return prisma.chat.create({
    data: {
      ...data,
      participants: data.participants || [],
      lastMessage: data.lastMessage || null
    }
  });
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

// Message operations
async function getMessages(chatId) {
  return prisma.message.findMany({
    where: { chatId },
    orderBy: { timestamp: 'asc' }
  });
}

async function addMessage(chatId, message) {
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
  
  // Update chat's lastMessage
  await prisma.chat.update({
    where: { id: chatId },
    data: {
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
    }
  });
  
  return newMessage;
}

module.exports = { 
  list, 
  getById, 
  getByBusinessId, 
  getByLocationId, 
  create, 
  update, 
  delete: remove,
  getMessages,
  addMessage
};

