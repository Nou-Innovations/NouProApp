/**
 * Mock factory for all 19 repository implementations.
 * Returns an object matching the shape of getRepos() with every method stubbed as jest.fn().
 */
function createMockRepos() {
  return {
    businessRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    locationRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getByBusinessId: jest.fn(),
    },
    productRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getByBusinessId: jest.fn(),
    },
    orderRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      changeStatusWithHistory: jest.fn(),
      getStatusHistory: jest.fn(),
      getByBusinessId: jest.fn(),
    },
    invoiceRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getByBusinessId: jest.fn(),
    },
    chatRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      getByBusinessId: jest.fn(),
      addMessage: jest.fn(),
      getMessages: jest.fn(),
    },
    memberRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getByBusinessId: jest.fn(),
      getByUserId: jest.fn(),
      getByBusinessAndUserId: jest.fn(),
      getBusinessMember: jest.fn(),
    },
    deliveryRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getByBusinessId: jest.fn(),
    },
    stockRepo: {
      getByLocationAndProduct: jest.fn(),
      upsert: jest.fn(),
      list: jest.fn(),
    },
    userRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      getByEmail: jest.fn(),
      getByPhone: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    notificationReadRepo: {
      getByUserId: jest.fn(),
      markAsRead: jest.fn(),
    },
    brandRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
    },
    transportRepo: {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
    },
    connectionRepo: {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      countByUserId: jest.fn(),
    },
    pushTokenRepo: {
      getActiveByUserId: jest.fn(),
      register: jest.fn(),
      unregister: jest.fn(),
    },
    notificationPreferenceRepo: {
      getByUserId: jest.fn(),
      upsert: jest.fn(),
    },
    deliveryStaffRepo: {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    roleRequestRepo: {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    procurementRepo: {
      getSuppliers: jest.fn(),
      createSupplier: jest.fn(),
      getPurchaseRequests: jest.fn(),
      createPurchaseRequest: jest.fn(),
      getPurchaseOrders: jest.fn(),
      createPurchaseOrder: jest.fn(),
      getGoodsReceipts: jest.fn(),
    },
  };
}

module.exports = { createMockRepos };
