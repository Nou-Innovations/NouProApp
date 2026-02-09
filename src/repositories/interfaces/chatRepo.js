/**
 * Chat Repository Interface
 */

const ChatRepository = {
  getById: async (id) => {},
  getByCompanyId: async (companyId, options) => {},
  getByBusinessId: async (businessId, options) => {}, // alias for getByCompanyId
  getByUserId: async (userId, options) => {},
  create: async (data) => {},
  update: async (id, patch) => {},
  delete: async (id) => {},
  
  // Message operations
  getMessages: async (chatId, options) => {},
  addMessage: async (chatId, message, options) => {},
  getMessage: async (chatId, messageId) => {},
  deleteMessage: async (chatId, messageId) => {},
  markMessagesAsRead: async (chatId, userId) => {},
  
  // Per-user unread counts
  getParticipantUnreadCounts: async (chatIds, userId) => {},
  getChatParticipants: async (chatId) => {},
};

module.exports = ChatRepository;

