/**
 * Member Repository Interface
 * Handles both business members and location members
 */

const MemberRepository = {
  // Business members
  listBusinessMembers: async (businessId) => {},
  getBusinessMember: async (businessId, userId) => {},
  addBusinessMember: async (data) => {},
  updateBusinessMember: async (id, patch) => {},
  removeBusinessMember: async (id) => {},
  
  // Location members
  listLocationMembers: async (locationId) => {},
  getLocationMember: async (locationId, userId) => {},
  addLocationMember: async (data) => {},
  updateLocationMember: async (id, patch) => {},
  removeLocationMember: async (id) => {},
  
  // Helper queries
  isBusinessMember: async (businessId, userId) => {},
  isBusinessSuperAdmin: async (businessId, userId) => {},
  isLocationMember: async (locationId, userId) => {},
};

module.exports = MemberRepository;

