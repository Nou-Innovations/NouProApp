/**
 * Stock Repository Interface
 */

const StockRepository = {
  list: async () => {},
  getById: async (id) => {},
  getByBusinessId: async (businessId) => {},
  getByLocationId: async (locationId) => {},
  getByLocationAndProduct: async (locationId, productId) => {},
  create: async (data) => {},
  update: async (id, patch) => {},
  upsert: async (locationId, productId, qtyOnHand) => {},
  delete: async (id) => {},
};

module.exports = StockRepository;

