/**
 * Pure enum constants extracted from memoryStore.
 * These are value enums only — NOT entity data.
 */

const SUBSCRIPTION_TIERS = {
  FREE: 'FREE',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE'
};

const LOCATION_MODES = {
  DEPENDENT: 'DEPENDENT',
  INDEPENDENT: 'INDEPENDENT'
};

const ORDER_STATUS = {
  NEW: 'NEW',
  ACCEPTED: 'ACCEPTED',
  ONGOING: 'ONGOING',
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CANCELED: 'CANCELED',
  REJECTED: 'REJECTED'
};

const ORDER_SCOPE = {
  PARENT: 'PARENT',
  LOCATION: 'LOCATION'
};

const INVOICE_SCOPE = {
  PARENT: 'PARENT',
  LOCATION: 'LOCATION'
};

const MEMBER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff'
};

const MEMBER_STATUS = {
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  SUSPENDED: 'suspended'
};

module.exports = {
  SUBSCRIPTION_TIERS,
  LOCATION_MODES,
  ORDER_STATUS,
  ORDER_SCOPE,
  INVOICE_SCOPE,
  MEMBER_ROLES,
  MEMBER_STATUS
};
