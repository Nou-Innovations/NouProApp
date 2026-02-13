/**
 * Repository Factory
 * 
 * Returns Prisma-backed repository implementations for all data operations.
 * All data goes through PostgreSQL via Prisma ORM.
 * 
 * Usage:
 *   const { getRepos } = require('./src/repositories');
 *   const repos = getRepos();
 *   
 *   // In routes:
 *   const businesses = await repos.businessRepo.list();
 */

let cachedRepos = null;

function getRepos() {
  if (cachedRepos) {
    return cachedRepos;
  }

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
    notificationReadRepo: require('./prisma/notificationReadRepo.prisma'),
    brandRepo: require('./prisma/brandRepo.prisma'),
    connectionRepo: require('./prisma/connectionRepo.prisma'),
  };

  return cachedRepos;
}

function getDataSource() {
  return 'prisma';
}

module.exports = { getRepos, getDataSource };
