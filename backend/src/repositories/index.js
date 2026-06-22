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
    transportRepo: require('./prisma/transportRepo.prisma'),
    connectionRepo: require('./prisma/connectionRepo.prisma'),
    pushTokenRepo: require('./prisma/pushTokenRepo.prisma'),
    notificationPreferenceRepo: require('./prisma/notificationPreferenceRepo.prisma'),
    deliveryStaffRepo: require('./prisma/deliveryStaffRepo.prisma'),
    roleRequestRepo: require('./prisma/roleRequestRepo.prisma'),
    procurementRepo: require('./prisma/procurementRepo.prisma'),
    workExperienceRepo: require('./prisma/workExperienceRepo.prisma'),
    educationRepo: require('./prisma/educationRepo.prisma'),
    certificationRepo: require('./prisma/certificationRepo.prisma'),
    skillRepo: require('./prisma/skillRepo.prisma'),
    taskRepo: require('./prisma/taskRepo.prisma'),
    opportunityRepo: require('./prisma/opportunityRepo.prisma'),
    eventRepo: require('./prisma/eventRepo.prisma'),
    issueRepo: require('./prisma/issueRepo.prisma'),
    returnRepo: require('./prisma/returnRepo.prisma'),
    routeRepo: require('./prisma/routeRepo.prisma'),
    recurringRepo: require('./prisma/recurringRepo.prisma'),
    stockMovementRepo: require('./prisma/stockMovementRepo.prisma'),
    transferRepo: require('./prisma/transferRepo.prisma'),
    priceListRepo: require('./prisma/priceListRepo.prisma'),
  };

  return cachedRepos;
}

function getDataSource() {
  return 'prisma';
}

module.exports = { getRepos, getDataSource };
