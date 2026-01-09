/**
 * User Repository - Memory Implementation
 */
const { users } = require('../../data/memoryStore');

async function list() {
  return users;
}

async function getById(id) {
  return users.find(u => u.id === id) || null;
}

async function getByEmail(email) {
  return users.find(u => u.email === email) || null;
}

async function create(data) {
  const newUser = {
    ...data,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  return newUser;
}

async function update(id, patch) {
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  
  users[idx] = { ...users[idx], ...patch };
  return users[idx];
}

async function remove(id) {
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  return true;
}

module.exports = { 
  list, 
  getById, 
  getByEmail, 
  create, 
  update, 
  delete: remove 
};

