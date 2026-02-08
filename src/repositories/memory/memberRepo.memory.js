/**
 * Member Repository - Memory Implementation
 * Handles both business members and location members
 */
const { businessMembers, locationMembers } = require('../../data/memoryStore');

// ============================================================================
// BUSINESS MEMBERS
// ============================================================================

async function listBusinessMembers(businessId) {
  return businessMembers.filter(m => m.businessId === businessId);
}

async function getBusinessMember(businessId, userId) {
  return businessMembers.find(m => 
    m.businessId === businessId && m.userId === userId
  ) || null;
}

async function addBusinessMember(data) {
  const newMember = {
    ...data,
    createdAt: new Date().toISOString()
  };
  businessMembers.push(newMember);
  return newMember;
}

async function updateBusinessMember(id, patch) {
  const idx = businessMembers.findIndex(m => m.id === id);
  if (idx === -1) return null;
  
  businessMembers[idx] = { ...businessMembers[idx], ...patch };
  return businessMembers[idx];
}

async function removeBusinessMember(id) {
  const idx = businessMembers.findIndex(m => m.id === id);
  if (idx === -1) return false;
  businessMembers.splice(idx, 1);
  return true;
}

// ============================================================================
// LOCATION MEMBERS
// ============================================================================

async function listLocationMembers(locationId) {
  return locationMembers.filter(m => m.locationId === locationId);
}

async function getLocationMember(locationId, userId) {
  return locationMembers.find(m => 
    m.locationId === locationId && m.userId === userId
  ) || null;
}

async function addLocationMember(data) {
  const newMember = {
    ...data,
    createdAt: new Date().toISOString()
  };
  locationMembers.push(newMember);
  return newMember;
}

async function updateLocationMember(id, patch) {
  const idx = locationMembers.findIndex(m => m.id === id);
  if (idx === -1) return null;
  
  locationMembers[idx] = { ...locationMembers[idx], ...patch };
  return locationMembers[idx];
}

async function removeLocationMember(id) {
  const idx = locationMembers.findIndex(m => m.id === id);
  if (idx === -1) return false;
  locationMembers.splice(idx, 1);
  return true;
}

// ============================================================================
// HELPER QUERIES
// ============================================================================

async function isBusinessMember(businessId, userId) {
  return businessMembers.some(m => 
    m.businessId === businessId && 
    m.userId === userId && 
    m.status === 'accepted'
  );
}

async function isBusinessSuperAdmin(businessId, userId) {
  return businessMembers.some(m => 
    m.businessId === businessId && 
    m.userId === userId && 
    m.status === 'accepted' && 
    m.role === 'super_admin'
  );
}

async function isLocationMember(locationId, userId) {
  return locationMembers.some(m => 
    m.locationId === locationId && 
    m.userId === userId && 
    m.status === 'accepted'
  );
}

module.exports = {
  // Business members
  listBusinessMembers,
  getBusinessMember,
  addBusinessMember,
  updateBusinessMember,
  removeBusinessMember,
  
  // Location members
  listLocationMembers,
  getLocationMember,
  addLocationMember,
  updateLocationMember,
  removeLocationMember,
  
  // Helper queries
  isBusinessMember,
  isBusinessSuperAdmin,
  isLocationMember
};

