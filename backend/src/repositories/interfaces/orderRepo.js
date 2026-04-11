/**
 * Order Repository Interface
 */

const OrderRepository = {
  list: async () => {},
  getAll: async () => {},
  getById: async (id) => {},
  getByBusinessId: async (businessId) => {},
  getByLocationId: async (locationId) => {},
  getByBuyerBusinessId: async (buyerBusinessId) => {},
  create: async (data) => {},
  update: async (id, patch) => {},
  delete: async (id) => {},
};

module.exports = OrderRepository;

