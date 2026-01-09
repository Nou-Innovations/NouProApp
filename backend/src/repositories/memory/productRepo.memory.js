/**
 * Product Repository - Memory Implementation
 */
const { products } = require('../../data/memoryStore');

async function list() {
  return products.map(mapToBusinessId);
}

async function getById(id) {
  const product = products.find(p => p.id === id);
  return product ? mapToBusinessId(product) : null;
}

async function getByBusinessId(businessId) {
  return products
    .filter(p => p.companyId === businessId)
    .map(mapToBusinessId);
}

async function create(data) {
  const { businessId, ...rest } = data;
  const newProduct = {
    ...rest,
    companyId: businessId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  products.push(newProduct);
  return mapToBusinessId(newProduct);
}

async function update(id, patch) {
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  
  const { businessId, ...restPatch } = patch;
  const storePatch = businessId ? { ...restPatch, companyId: businessId } : restPatch;
  
  products[idx] = { 
    ...products[idx], 
    ...storePatch, 
    updatedAt: new Date().toISOString() 
  };
  return mapToBusinessId(products[idx]);
}

async function remove(id) {
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return false;
  products.splice(idx, 1);
  return true;
}

// Helper to map companyId -> businessId
function mapToBusinessId(product) {
  const { companyId, ...rest } = product;
  return { ...rest, businessId: companyId };
}

module.exports = { 
  list, 
  getById, 
  getByBusinessId, 
  create, 
  update, 
  delete: remove 
};

