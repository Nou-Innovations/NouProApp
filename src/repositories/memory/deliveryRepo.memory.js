/**
 * Delivery Repository - Memory Implementation
 */
const { deliveries } = require('../../data/memoryStore');

async function list() {
  return deliveries.map(mapToBusinessId);
}

async function getById(id) {
  const delivery = deliveries.find(d => d.id === id);
  return delivery ? mapToBusinessId(delivery) : null;
}

async function getByBusinessId(businessId) {
  return deliveries
    .filter(d => d.companyId === businessId)
    .map(mapToBusinessId);
}

async function getByLocationId(locationId) {
  return deliveries
    .filter(d => d.locationId === locationId)
    .map(mapToBusinessId);
}

async function create(data) {
  const { businessId, ...rest } = data;
  const newDelivery = {
    ...rest,
    companyId: businessId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  deliveries.push(newDelivery);
  return mapToBusinessId(newDelivery);
}

async function update(id, patch) {
  const idx = deliveries.findIndex(d => d.id === id);
  if (idx === -1) return null;
  
  const { businessId, ...restPatch } = patch;
  const storePatch = businessId ? { ...restPatch, companyId: businessId } : restPatch;
  
  deliveries[idx] = { 
    ...deliveries[idx], 
    ...storePatch, 
    updatedAt: new Date().toISOString() 
  };
  return mapToBusinessId(deliveries[idx]);
}

async function remove(id) {
  const idx = deliveries.findIndex(d => d.id === id);
  if (idx === -1) return false;
  deliveries.splice(idx, 1);
  return true;
}

// Helper to map companyId -> businessId
function mapToBusinessId(delivery) {
  const { companyId, ...rest } = delivery;
  return { ...rest, businessId: companyId };
}

module.exports = { 
  list, 
  getById, 
  getByBusinessId, 
  getByLocationId, 
  create, 
  update, 
  delete: remove 
};

