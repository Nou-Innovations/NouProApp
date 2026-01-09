/**
 * Repository Factory
 * 
 * Returns the appropriate repository implementations based on the DATA_SOURCE
 * environment variable. This allows switching between memory (in-memory arrays)
 * and prisma (PostgreSQL) persistence without changing route handlers.
 * 
 * Usage:
 *   const { getRepos } = require('./src/repositories');
 *   const repos = getRepos();
 *   
 *   // In routes:
 *   const businesses = await repos.businessRepo.list();
 */

const dataSource = process.env.DATA_SOURCE || 'memory';

let cachedRepos = null;

function getRepos() {
  // Return cached repos if already loaded
  if (cachedRepos) {
    return cachedRepos;
  }

  if (dataSource === 'prisma') {
    cachedRepos = {
      businessRepo: require('./prisma/businessRepo.prisma'),
      locationRepo: require('./prisma/locationRepo.prisma'),
      productRepo: require('./prisma/productRepo.prisma'),
      orderRepo: require('./prisma/orderRepo.prisma'),
      invoiceRepo: require('./prisma/invoiceRepo.prisma'),
      chatRepo: require('./prisma/chatRepo.prisma'),
      memberRepo: require('./prisma/memberRepo.prisma'),
      deliveryRepo: require('./prisma/deliveryRepo.prisma'),
      stockRepo: require('./prisma/stockRepo.prisma'),
      userRepo: require('./prisma/userRepo.prisma'),
    };
  } else {
    cachedRepos = {
      businessRepo: require('./memory/businessRepo.memory'),
      locationRepo: require('./memory/locationRepo.memory'),
      productRepo: require('./memory/productRepo.memory'),
      orderRepo: require('./memory/orderRepo.memory'),
      invoiceRepo: require('./memory/invoiceRepo.memory'),
      chatRepo: require('./memory/chatRepo.memory'),
      memberRepo: require('./memory/memberRepo.memory'),
      deliveryRepo: require('./memory/deliveryRepo.memory'),
      stockRepo: require('./memory/stockRepo.memory'),
      userRepo: require('./memory/userRepo.memory'),
    };
  }

  return cachedRepos;
}

// Export data source for debugging
function getDataSource() {
  return dataSource;
}

module.exports = { getRepos, getDataSource };

