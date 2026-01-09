/**
 * Stock Repository - Memory Implementation
 */
const { stocks } = require('../../data/memoryStore');

async function list() {
  return stocks;
}

async function getById(id) {
  return stocks.find(s => s.id === id) || null;
}

async function getByBusinessId(businessId) {
  return stocks.filter(s => s.businessId === businessId);
}

async function getByLocationId(locationId) {
  return stocks.filter(s => s.locationId === locationId);
}

async function getByLocationAndProduct(locationId, productId) {
  return stocks.find(s => 
    s.locationId === locationId && s.productId === productId
  ) || null;
}

async function create(data) {
  const newStock = { ...data };
  stocks.push(newStock);
  return newStock;
}

async function update(id, patch) {
  const idx = stocks.findIndex(s => s.id === id);
  if (idx === -1) return null;
  
  stocks[idx] = { ...stocks[idx], ...patch };
  return stocks[idx];
}

async function upsert(locationId, productId, qtyOnHand, businessId) {
  const existing = await getByLocationAndProduct(locationId, productId);
  
  if (existing) {
    return update(existing.id, { qtyOnHand });
  }
  
  return create({
    id: `stk-${Date.now()}`,
    businessId,
    locationId,
    productId,
    qtyOnHand
  });
}

async function remove(id) {
  const idx = stocks.findIndex(s => s.id === id);
  if (idx === -1) return false;
  stocks.splice(idx, 1);
  return true;
}

module.exports = { 
  list, 
  getById, 
  getByBusinessId, 
  getByLocationId, 
  getByLocationAndProduct,
  create, 
  update, 
  upsert,
  delete: remove 
};

