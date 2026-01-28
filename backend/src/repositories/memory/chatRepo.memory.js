/**
 * Chat Repository - Memory Implementation
 * 
 * Note: Uses companyId consistently to match frontend Chat type.
 * The getByCompanyId function accepts companyId directly.
 */
const { chats, messages } = require('../../data/memoryStore');

async function list() {
  return [...chats];
}

async function getById(id) {
  const chat = chats.find(c => c.id === id);
  return chat || null;
}

/**
 * Get chats by company ID
 * @param {string} companyId - The company ID to filter by
 */
async function getByCompanyId(companyId) {
  return chats.filter(c => c.companyId === companyId);
}

// Legacy alias for backwards compatibility
async function getByBusinessId(businessId) {
  return getByCompanyId(businessId);
}

async function getByLocationId(locationId) {
  return chats.filter(c => c.locationId === locationId);
}

/**
 * Get chats by user ID (for personal mode)
 * Returns chats where the user is a participant
 * @param {string} userId - The user ID to filter by
 */
async function getByUserId(userId) {
  return chats.filter(c => 
    c.userId === userId || 
    (c.participants && c.participants.includes(userId))
  );
}

async function create(data) {
  // Accept both companyId and businessId for backwards compatibility
  const companyId = data.companyId || data.businessId;
  const { businessId: _, ...rest } = data;
  
  const newChat = {
    ...rest,
    companyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  chats.push(newChat);
  
  // Initialize empty messages array for new chat
  if (!messages[newChat.id]) {
    messages[newChat.id] = [];
  }
  
  return newChat;
}

async function update(id, patch) {
  const idx = chats.findIndex(c => c.id === id);
  if (idx === -1) return null;
  
  // Accept both companyId and businessId for backwards compatibility
  const { businessId, ...restPatch } = patch;
  const storePatch = businessId ? { ...restPatch, companyId: businessId } : restPatch;
  
  chats[idx] = { 
    ...chats[idx], 
    ...storePatch, 
    updatedAt: new Date().toISOString() 
  };
  return chats[idx];
}

async function remove(id) {
  const idx = chats.findIndex(c => c.id === id);
  if (idx === -1) return false;
  chats.splice(idx, 1);
  delete messages[id];
  return true;
}

// Message operations
async function getMessages(chatId) {
  return messages[chatId] || [];
}

async function addMessage(chatId, message) {
  if (!messages[chatId]) {
    messages[chatId] = [];
  }
  
  const newMessage = {
    ...message,
    chatId,
    timestamp: new Date().toISOString()
  };
  messages[chatId].push(newMessage);
  
  // Update chat's lastMessage
  const chatIdx = chats.findIndex(c => c.id === chatId);
  if (chatIdx !== -1) {
    chats[chatIdx].lastMessage = {
      id: newMessage.id,
      content: newMessage.text || newMessage.content,
      type: newMessage.type,
      senderId: newMessage.sender?.id,
      senderName: newMessage.sender?.name,
      timestamp: newMessage.timestamp,
      isOutgoing: newMessage.isOutgoing,
      status: newMessage.status || 'sent'
    };
    chats[chatIdx].updatedAt = newMessage.timestamp;
  }
  
  return newMessage;
}

/**
 * Soft delete a message (mark as deleted)
 * @param {string} chatId - The chat ID
 * @param {string} messageId - The message ID to delete
 * @returns {object|null} The updated message or null if not found
 */
async function deleteMessage(chatId, messageId) {
  if (!messages[chatId]) return null;
  
  const msgIdx = messages[chatId].findIndex(m => m.id === messageId);
  if (msgIdx === -1) return null;
  
  // Soft delete: change type to 'deleted' and clear content
  const originalMessage = messages[chatId][msgIdx];
  const deletedMessage = {
    id: originalMessage.id,
    chatId: originalMessage.chatId,
    type: 'deleted',
    isOutgoing: originalMessage.isOutgoing,
    sender: originalMessage.sender,
    timestamp: originalMessage.timestamp,
    status: originalMessage.status,
    deletedAt: new Date().toISOString(),
  };
  
  messages[chatId][msgIdx] = deletedMessage;
  return deletedMessage;
}

/**
 * Get a specific message by ID
 * @param {string} chatId - The chat ID
 * @param {string} messageId - The message ID
 * @returns {object|null} The message or null if not found
 */
async function getMessage(chatId, messageId) {
  if (!messages[chatId]) return null;
  return messages[chatId].find(m => m.id === messageId) || null;
}

module.exports = { 
  list, 
  getById, 
  getByCompanyId,
  getByBusinessId, // Legacy alias
  getByUserId,
  getByLocationId, 
  create, 
  update, 
  delete: remove,
  getMessages,
  getMessage,
  addMessage,
  deleteMessage,
};

