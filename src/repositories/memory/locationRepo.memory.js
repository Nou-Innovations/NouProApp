/**
 * Location Repository - Memory Implementation
 * Uses store reference to maintain single source of truth.
 * 
 * Note: The memory store uses `companyId` but routes expect `businessId`.
 * This repo hides that difference so routes remain stable.
 */
const store = require('../../data/memoryStore');

async function list() {
  return store.locations;
}

async function getById(id) {
  return store.locations.find(l => l.id === id) || null;
}

async function getByBusinessId(businessId) {
  // Memory store uses companyId
  return store.locations.filter(l => l.companyId === businessId);
}

async function create(businessId, data) {
  const newLoc = {
    id: data.id,
    companyId: businessId, // Keep legacy field name in memory store
    ...data,
  };
  store.locations.push(newLoc);
  return newLoc;
}

async function update(id, patch) {
  const idx = store.locations.findIndex(l => l.id === id);
  if (idx === -1) return null;

  store.locations[idx] = {
    ...store.locations[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  return store.locations[idx];
}

async function remove(id) {
  const idx = store.locations.findIndex(l => l.id === id);
  if (idx === -1) return false;
  store.locations.splice(idx, 1);
  return true;
}

module.exports = { 
  list,
  getById, 
  getByBusinessId, 
  create, 
  update, 
  delete: remove 
};
