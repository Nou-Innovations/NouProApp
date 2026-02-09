/**
 * Delivery Repository Interface
 */

const DeliveryRepository = {
  list: async () => {},
  getById: async (id) => {},
  getByBusinessId: async (businessId) => {},
  getByLocationId: async (locationId) => {},
  getByOrderId: async (orderId) => {},
  create: async (data) => {},
  update: async (id, patch) => {},
  delete: async (id) => {},
};

module.exports = DeliveryRepository;

