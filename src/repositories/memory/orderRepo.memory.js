/**
 * Order Repository - Memory Implementation
 */
const { orders } = require('../../data/memoryStore');

async function list() {
  return orders;
}

async function getById(id) {
  return orders.find(o => o.id === id) || null;
}

async function getByBusinessId(businessId) {
  return orders.filter(o => o.businessId === businessId);
}

async function getByLocationId(locationId) {
  return orders.filter(o => 
    o.soldByLocationId === locationId || 
    o.fulfillmentLocationId === locationId
  );
}

async function create(data) {
  const newOrder = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  orders.push(newOrder);
  return newOrder;
}

async function update(id, patch) {
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  
  orders[idx] = { 
    ...orders[idx], 
    ...patch, 
    updatedAt: new Date().toISOString() 
  };
  return orders[idx];
}

async function remove(id) {
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return false;
  orders.splice(idx, 1);
  return true;
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

