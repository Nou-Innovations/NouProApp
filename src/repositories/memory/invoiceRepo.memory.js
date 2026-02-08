/**
 * Invoice Repository - Memory Implementation
 */
const { invoices } = require('../../data/memoryStore');

async function list() {
  return invoices;
}

async function getById(id) {
  return invoices.find(i => i.id === id) || null;
}

async function getByBusinessId(businessId) {
  return invoices.filter(i => i.businessId === businessId);
}

async function getByLocationId(locationId) {
  return invoices.filter(i => i.issuedByLocationId === locationId);
}

async function create(data) {
  const newInvoice = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  invoices.push(newInvoice);
  return newInvoice;
}

async function update(id, patch) {
  const idx = invoices.findIndex(i => i.id === id);
  if (idx === -1) return null;
  
  invoices[idx] = { 
    ...invoices[idx], 
    ...patch, 
    updatedAt: new Date().toISOString() 
  };
  return invoices[idx];
}

async function remove(id) {
  const idx = invoices.findIndex(i => i.id === id);
  if (idx === -1) return false;
  invoices.splice(idx, 1);
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

