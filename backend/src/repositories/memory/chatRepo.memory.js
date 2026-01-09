/**
 * Chat Repository - Memory Implementation
 */
const { chats, messages } = require('../../data/memoryStore');

async function list() {
  return chats.map(mapToBusinessId);
}

async function getById(id) {
  const chat = chats.find(c => c.id === id);
  return chat ? mapToBusinessId(chat) : null;
}

async function getByBusinessId(businessId) {
  return chats
    .filter(c => c.companyId === businessId)
    .map(mapToBusinessId);
}

async function getByLocationId(locationId) {
  return chats
    .filter(c => c.locationId === locationId)
    .map(mapToBusinessId);
}

async function create(data) {
  const { businessId, ...rest } = data;
  const newChat = {
    ...rest,
    companyId: businessId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  chats.push(newChat);
  
  // Initialize empty messages array for new chat
  if (!messages[newChat.id]) {
    messages[newChat.id] = [];
  }
  
  return mapToBusinessId(newChat);
}

async function update(id, patch) {
  const idx = chats.findIndex(c => c.id === id);
  if (idx === -1) return null;
  
  const { businessId, ...restPatch } = patch;
  const storePatch = businessId ? { ...restPatch, companyId: businessId } : restPatch;
  
  chats[idx] = { 
    ...chats[idx], 
    ...storePatch, 
    updatedAt: new Date().toISOString() 
  };
  return mapToBusinessId(chats[idx]);
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

// Helper to map companyId -> businessId
function mapToBusinessId(chat) {
  const { companyId, ...rest } = chat;
  return { ...rest, businessId: companyId };
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

