/**
 * Business Repository - Memory Implementation
 * Uses store reference to maintain single source of truth.
 */
const store = require('../../data/memoryStore');

async function list() {
  return store.companies;
}

async function getById(id) {
  return store.companies.find(b => b.id === id) || null;
}

async function create(data) {
  const newBusiness = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  store.companies.push(newBusiness);
  return newBusiness;
}

async function update(id, patch) {
  const idx = store.companies.findIndex(b => b.id === id);
  if (idx === -1) return null;

  store.companies[idx] = {
    ...store.companies[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  return store.companies[idx];
}

async function remove(id) {
  const idx = store.companies.findIndex(b => b.id === id);
  if (idx === -1) return false;
  store.companies.splice(idx, 1);
  return true;
}

module.exports = { 
  list, 
  getById, 
  create, 
  update, 
  delete: remove 
};
