/**
 * Business Repository Interface
 * 
 * This file documents the expected contract for business repositories.
 * Both memory and prisma implementations should follow this interface.
 */

/**
 * @typedef {Object} Business
 * @property {string} id
 * @property {string} name
 * @property {string} [logoUrl]
 * @property {string} [description]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} subscriptionTier - FREE | PRO | BUSINESS | ENTERPRISE
 * @property {Object} [settings]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @interface BusinessRepository
 */
const BusinessRepository = {
  /**
   * Get all businesses
   * @returns {Promise<Business[]>}
   */
  list: async () => {},

  /**
   * Get a business by ID
   * @param {string} id
   * @returns {Promise<Business|null>}
   */
  getById: async (id) => {},

  /**
   * Create a new business
   * @param {Partial<Business>} data
   * @returns {Promise<Business>}
   */
  create: async (data) => {},

  /**
   * Update a business
   * @param {string} id
   * @param {Partial<Business>} patch
   * @returns {Promise<Business|null>}
   */
  update: async (id, patch) => {},

  /**
   * Delete a business
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  delete: async (id) => {},
};

module.exports = BusinessRepository;

