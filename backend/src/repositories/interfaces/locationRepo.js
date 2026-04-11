/**
 * Location Repository Interface
 */

/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {string} businessId (mapped from companyId in memory store)
 * @property {string} name
 * @property {string} [address]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {number} [latitude]
 * @property {number} [longitude]
 * @property {string} operatingMode - DEPENDENT | INDEPENDENT
 * @property {boolean} isPublic
 * @property {string} createdAt
 * @property {string} updatedAt
 */

const LocationRepository = {
  list: async () => {},
  getById: async (id) => {},
  getByBusinessId: async (businessId) => {},
  create: async (data) => {},
  update: async (id, patch) => {},
  delete: async (id) => {},
};

module.exports = LocationRepository;

