/**
 * Chat Repository Interface
 */

const ChatRepository = {
  list: async () => {},
  getById: async (id) => {},
  getByBusinessId: async (businessId) => {},
  getByLocationId: async (locationId) => {},
  create: async (data) => {},
  update: async (id, patch) => {},
  delete: async (id) => {},
  
  // Message operations
  getMessages: async (chatId) => {},
  addMessage: async (chatId, message) => {},
};

module.exports = ChatRepository;

