const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

// Load environment variables (create a .env file in backend/ if needed)
require('dotenv').config();

// ============================================================================
// REPOSITORY LAYER - Import repositories for data access
// ============================================================================
// The repository factory returns either memory or prisma repositories
// based on the DATA_SOURCE environment variable.
// 
// Usage in routes:
//   const business = await repos.businessRepo.getById(id);
//   const locations = await repos.locationRepo.getByBusinessId(businessId);
//
// To switch from memory to Prisma:
// 1. Update .env: DATA_SOURCE=prisma
// 2. Run: npx prisma migrate dev && npm run prisma:seed
// ============================================================================
const { getRepos, getDataSource } = require('./src/repositories');
const repos = getRepos();

console.log(`📦 Data source: ${getDataSource()}`);

// Import constants from memory store (used by both memory and prisma modes)
const { 
  SUBSCRIPTION_TIERS: TIERS_FROM_STORE,
  LOCATION_MODES: MODES_FROM_STORE,
  ORDER_STATUS: ORDER_STATUS_FROM_STORE,
  ORDER_SCOPE: ORDER_SCOPE_FROM_STORE,
  INVOICE_SCOPE: INVOICE_SCOPE_FROM_STORE,
  MEMBER_ROLES: MEMBER_ROLES_FROM_STORE,
  MEMBER_STATUS: MEMBER_STATUS_FROM_STORE
} = require('./src/data/memoryStore');

// ---------------------------------------------------------------------------
// IMPORTANT: Single source of truth for in-memory data
// This prevents "split-brain" between repos (memoryStore) and routes.
// When DATA_SOURCE=memory, both repos and direct array access use the same data.
// ---------------------------------------------------------------------------
const store = require('./src/data/memoryStore');

// Keep existing variable names to avoid large refactors in routes not yet migrated
let companies = store.companies;
let locations = store.locations;
let users = store.users;
let businessMembers = store.businessMembers;
let locationMembers = store.locationMembers;
let products = store.products;
let stocks = store.stocks;
let orders = store.orders;
let invoices = store.invoices;
let chats = store.chats;
let messages = store.messages;
let deliveries = store.deliveries;
let locationProducts = store.locationProducts;
let feedPosts = store.feedPosts;

const app = express();

// Configuration from environment variables with sensible defaults
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for LAN access

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// File upload setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ============================================================================
// SUBSCRIPTION TIERS & CAPABILITY DERIVATION
// ============================================================================

const SUBSCRIPTION_TIERS = {
  FREE: 'FREE',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE' // Top tier - can have independent locations + public pages
};

const LOCATION_MODES = {
  DEPENDENT: 'DEPENDENT',   // Orders created by parent only
  INDEPENDENT: 'INDEPENDENT' // Can create own orders, has public page
};

// Derive capabilities from subscription tier (centralized logic)
// RULE: Only ENTERPRISE can have independent locations with public pages
function deriveCapabilities(business) {
  const tier = business.subscriptionTier || SUBSCRIPTION_TIERS.FREE;
  const isEnterprise = tier === SUBSCRIPTION_TIERS.ENTERPRISE;
  const isPaidTier = tier !== SUBSCRIPTION_TIERS.FREE;
  
  return {
    // Enterprise-only capabilities
    canChooseLocationMode: isEnterprise,
    canHaveIndependentLocations: isEnterprise,
    canEnablePublicLocationPages: isEnterprise,
    
    // Paid tier capabilities
    canCreateOrders: isPaidTier,
    canCreateInvoices: isPaidTier,
    canPublishBusinessPage: isPaidTier,
    canHaveStaff: isPaidTier,
    
    // Tier-based limits
    maxLocations: tier === SUBSCRIPTION_TIERS.FREE ? 1 : 
                  tier === SUBSCRIPTION_TIERS.PRO ? 3 : 
                  tier === SUBSCRIPTION_TIERS.BUSINESS ? 10 : 999,
    maxStaff: tier === SUBSCRIPTION_TIERS.FREE ? 0 : 
              tier === SUBSCRIPTION_TIERS.PRO ? 3 : 
              tier === SUBSCRIPTION_TIERS.BUSINESS ? 20 : 999,
  };
}

// ============================================================================
// EFFECTIVE PUBLIC STATUS (computed, not stored)
// ============================================================================
// On downgrade, location.isPublic stays true but effective public becomes false.
// This allows instant re-enable on upgrade and preserves audit trail.

function isLocationPublicEffective(business, location) {
  const caps = deriveCapabilities(business);
  return (
    location.operatingMode === LOCATION_MODES.INDEPENDENT &&
    location.isPublic === true &&
    caps.canEnablePublicLocationPages === true
  );
}

// Get public disabled reason for UI display
function getPublicDisabledReason(business, location) {
  if (location.operatingMode !== LOCATION_MODES.INDEPENDENT) {
    return 'Only independent locations can have public pages';
  }
  if (!location.isPublic) {
    return null; // Not marked public, so no "disabled" reason
  }
  const caps = deriveCapabilities(business);
  if (!caps.canEnablePublicLocationPages) {
    return 'Enterprise plan required';
  }
  return null;
}

// ============================================================================
// TODO: NAMING NORMALIZATION (before DB migration)
// ============================================================================
// 
// IMPORTANT: We have inconsistent naming between `companyId` and `businessId`.
// Before migrating to MongoDB/Prisma, normalize ALL entities to use `businessId`.
// 
// Current state:
//   - locations[].companyId → should be businessId
//   - products[].companyId → should be businessId  
//   - deliveries[].companyId → should be businessId
//   - chats[].companyId → should be businessId
//   - Legacy routes use /api/companies/* → migrate to /api/businesses/*
//
// Rule: ALL NEW CODE should use `businessId`. Legacy code will be batch-migrated.
// ============================================================================

// ============================================================================
// PERMISSION MIDDLEWARE HELPERS
// ============================================================================

// Get user from request (mock auth via header)
// In production, replace with JWT verification
function getUserFromRequest(req) {
  const userId = req.headers['x-user-id'] || 'user-1'; // Default to user-1 for testing
  return users.find(u => u.id === userId);
}

// Check if user is a member of business (any role)
function isBusinessMember(businessId, userId) {
  return businessMembers.some(m => 
    m.businessId === businessId && m.userId === userId && m.status === 'accepted'
  );
}

// Check if user is a super admin of business
function isBusinessSuperAdmin(businessId, userId) {
  return businessMembers.some(m => 
    m.businessId === businessId && m.userId === userId && 
    m.status === 'accepted' && m.role === 'super_admin'
  );
}

// Check if user is a member of location (or super admin of parent business)
function isLocationMember(locationId, userId) {
  const directMember = locationMembers.some(m => 
    m.locationId === locationId && m.userId === userId && m.status === 'accepted'
  );
  if (directMember) return true;
  
  // Super admins of parent business have access to all locations
  const location = locations.find(l => l.id === locationId);
  if (location) {
    return isBusinessSuperAdmin(location.companyId, userId);
  }
  return false;
}

// Check business capability
function hasCapability(business, capabilityName) {
  const caps = deriveCapabilities(business);
  return caps[capabilityName] === true;
}

// Check location operating mode
function checkLocationMode(location, requiredMode) {
  return location.operatingMode === requiredMode;
}

// ============================================================================
// MEMBERSHIP ENFORCEMENT MIDDLEWARE
// ============================================================================

// Require user to be a member of the business
function requireBusinessMembership(req, res, businessId) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json(errorResponse('Authentication required', 'AUTH_REQUIRED'));
    return false;
  }
  if (!isBusinessMember(businessId, user.id)) {
    res.status(403).json(errorResponse('You do not have access to this business', 'ACCESS_DENIED'));
    return false;
  }
  return true;
}

// Require user to be a member of the location (or super admin of parent business)
function requireLocationMembership(req, res, locationId) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json(errorResponse('Authentication required', 'AUTH_REQUIRED'));
    return false;
  }
  if (!isLocationMember(locationId, user.id)) {
    res.status(403).json(errorResponse('You do not have access to this location', 'ACCESS_DENIED'));
    return false;
  }
  return true;
}

// Verify order belongs to business
function verifyOrderOwnership(order, businessId) {
  return order && order.businessId === businessId;
}

// Verify order is accessible from location (assigned or created by)
function verifyOrderLocationAccess(order, locationId, location) {
  if (!order || !location) return false;

  // Support both memory shape (companyId) and prisma shape (businessId)
  const locationBusinessId = location.businessId || location.companyId;

  // Order must belong to same business as the location
  if (order.businessId !== locationBusinessId) return false;

  // Order must be either created by or assigned to this location
  return (
    order.soldByLocationId === locationId ||
    order.fulfillmentLocationId === locationId
  );
}

// ============================================================================
// DOWNGRADE POLICY: Grandfathering Independent Locations
// ============================================================================
//
// When a business downgrades from ENTERPRISE → lower tier:
//
// DATA PRESERVATION:
// - EXISTING independent locations remain independent (grandfathered)
// - location.isPublic stays true in data (not overwritten)
// - All location data is preserved for instant re-enable on upgrade
//
// CAPABILITY BLOCKING:
// - Public storefront routes return PLAN_REQUIRED (403), not 404
// - Direct ordering at location level blocked (PLAN_REQUIRED)
// - Direct invoicing at location level blocked (PLAN_REQUIRED)
// - NEW independent locations cannot be created
// - Switching DEPENDENT → INDEPENDENT is blocked
// - Switching INDEPENDENT → DEPENDENT is always allowed (one-way)
//
// EFFECTIVE STATUS:
// - Use isLocationPublicEffective() to check real-time public status
// - UI shows publicDisabledReason: "Enterprise plan required"
// - Customer deep links show friendly "Storefront unavailable" page
//
// This prevents breaking live businesses while enforcing tier limits.
// ============================================================================

// ============================================================================
// MOCK DATABASE - Data is now sourced from memoryStore (see store import above)
// The `companies`, `locations`, etc. variables reference store arrays.
// ============================================================================

// Products, locationProducts, stocks data sourced from memoryStore (see store import above)

// ============================================================================
// MOCK DATABASE - ORDERS (with scope: PARENT vs LOCATION)
// ============================================================================

const ORDER_STATUS = {
  NEW: 'NEW',
  ASSIGNED: 'ASSIGNED',
  PACKED: 'PACKED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

const ORDER_SCOPE = {
  PARENT: 'PARENT',    // Created by parent business
  LOCATION: 'LOCATION' // Created by independent location
};

// Orders data sourced from memoryStore (see store import above)

// ============================================================================
// MOCK DATABASE - MEMBERSHIP (business & location level)
// ============================================================================

const MEMBER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff'
};

const MEMBER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  LOCKED: 'locked'
};

// Membership data (businessMembers, locationMembers) sourced from memoryStore
// Deliveries data sourced from memoryStore

// DUPLICATE REMOVED - using store.deliveries instead
const _deliveries_removed = [
  {
    id: 'DEL-001',
    companyId: 'comp-1',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'loc-1',
    clientId: 'client-1',
    clientCompanyLogo: 'https://picsum.photos/seed/grocerymart/100/100',
    clientCompanyName: 'Grocery Mart Ltd',
    clientAddress: '123 Main Street, Port Louis',
    clientEmail: 'orders@grocerymart.mu',
    clientPhone: '+230 5123 4567',
    clientNotes: 'Please call before delivery',
    distributorNotes: '',
    orderTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    itemCount: 5,
    items: [
      { id: 'I001', productId: 'P001', name: 'Coca-Cola 0.5L x10', image: 'https://picsum.photos/seed/product1/100/100', price: 25.99, quantityOrdered: 3, isLoaded: false, status: 'In Stock' },
      { id: 'I002', productId: 'P002', name: 'Fanta Orange 1L x6', image: 'https://picsum.photos/seed/product2/100/100', price: 19.50, quantityOrdered: 2, isLoaded: false, status: 'Available' }
    ],
    totalAmount: 116.97,
    trackingNumber: 'TRK-001-2025',
    deliveryStatus: 'new',
    paymentStatus: 'Unpaid',
    assignedStaffId: null,
    assignedTo: null,
    transportMode: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'DEL-002',
    companyId: 'comp-1',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'loc-1',
    clientId: 'client-2',
    clientCompanyLogo: 'https://picsum.photos/seed/superstore/100/100',
    clientCompanyName: 'Super Store Express',
    clientAddress: '456 Commerce Ave, Curepipe',
    clientEmail: 'purchasing@superstore.mu',
    clientPhone: '+230 5234 5678',
    clientNotes: 'Delivery dock at back entrance',
    distributorNotes: 'High priority customer',
    orderTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    itemCount: 8,
    items: [
      { id: 'I003', productId: 'P003', name: 'Sprite 2L x4', image: 'https://picsum.photos/seed/product3/100/100', price: 16.75, quantityOrdered: 4, isLoaded: true, status: 'Available' },
      { id: 'I004', productId: 'P004', name: 'Juice Box x12', image: 'https://picsum.photos/seed/product4/100/100', price: 35.00, quantityOrdered: 4, isLoaded: true, status: 'In Stock' }
    ],
    totalAmount: 207.00,
    trackingNumber: 'TRK-002-2025',
    deliveryStatus: 'ongoing',
    paymentStatus: 'Paid',
    assignedStaffId: 'S001',
    assignedTo: 'John Doe',
    transportMode: 'Truck',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'DEL-003',
    companyId: 'comp-1',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'loc-2',
    clientId: 'client-3',
    clientCompanyLogo: 'https://picsum.photos/seed/minimart/100/100',
    clientCompanyName: 'Mini Mart Plus',
    clientAddress: '789 Industrial Rd, Vacoas',
    clientEmail: 'orders@minimart.mu',
    clientPhone: '+230 5345 6789',
    clientNotes: '',
    distributorNotes: '',
    orderTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    itemCount: 3,
    totalAmount: 89.50,
    trackingNumber: 'TRK-003-2025',
    deliveryStatus: 'delivered',
    paymentStatus: 'Paid',
    assignedStaffId: 'S002',
    assignedTo: 'Jane Smith',
    transportMode: 'Van',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'DEL-004',
    companyId: 'comp-1',
    type: 'delivery',
    direction: 'incoming',
    locationId: 'loc-1',
    clientId: 'supplier-1',
    clientCompanyLogo: 'https://picsum.photos/seed/supplier/100/100',
    clientCompanyName: 'Phoenix Beverages Ltd',
    clientAddress: 'Industrial Zone, Phoenix',
    clientEmail: 'orders@phoenix.mu',
    clientPhone: '+230 5456 7890',
    clientNotes: 'Receiving at warehouse dock A',
    distributorNotes: '',
    orderTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    itemCount: 50,
    totalAmount: 2500.00,
    trackingNumber: 'TRK-004-2025',
    deliveryStatus: 'pending',
    paymentStatus: 'Unpaid',
    assignedStaffId: null,
    assignedTo: null,
    transportMode: null,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'DEL-005',
    companyId: 'comp-1',
    type: 'transfer',
    direction: 'outgoing',
    locationId: 'loc-1',
    fromLocation: 'Warehouse A - Port Louis',
    toLocation: 'Warehouse B - Curepipe',
    clientCompanyName: 'Internal Transfer',
    clientAddress: 'Warehouse B, Industrial Zone, Curepipe',
    clientNotes: 'Stock replenishment',
    distributorNotes: '',
    orderTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    itemCount: 20,
    totalAmount: 0,
    deliveryStatus: 'pending',
    paymentStatus: 'Paid',
    assignedStaffId: 'S003',
    assignedTo: 'Bob Johnson',
    transportMode: 'Truck',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'DEL-006',
    companyId: 'comp-1',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'loc-2',
    clientId: 'client-4',
    clientCompanyLogo: 'https://picsum.photos/seed/freshmart/100/100',
    clientCompanyName: 'Fresh Mart Central',
    clientAddress: '321 Market Street, Quatre Bornes',
    clientEmail: 'supply@freshmart.mu',
    clientPhone: '+230 5567 8901',
    clientNotes: 'Urgent - Low stock alert',
    distributorNotes: 'Express delivery requested',
    orderTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    itemCount: 12,
    totalAmount: 345.75,
    trackingNumber: 'TRK-006-2025',
    deliveryStatus: 'new',
    paymentStatus: 'Pending Confirmation',
    assignedStaffId: null,
    assignedTo: null,
    transportMode: null,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  }
];

// ============================================================================
// MOCK DATABASE - INVOICES (with scope: PARENT vs LOCATION)
// ============================================================================

const INVOICE_SCOPE = {
  PARENT: 'PARENT',    // Issued by parent business
  LOCATION: 'LOCATION' // Issued by independent location
};

// DUPLICATE REMOVED - using store.invoices instead
const _invoices_removed = [
  {
    id: 'inv-1',
    businessId: 'comp-1',
    issuedByScope: INVOICE_SCOPE.PARENT,
    issuedByLocationId: null,
    orderId: 'ORD-001',
    invoiceNumber: 'INV-2025-001',
    clientName: 'Grocery Mart Ltd',
    clientEmail: 'orders@grocerymart.mu',
    amount: 116.97,
    taxAmount: 17.55,
    totalAmount: 134.52,
    status: 'sent',
    type: 'invoice',
    issueDate: '2025-01-15',
    dueDate: '2025-02-14',
    items: [
      { productId: 'PRD-001', description: 'Coca-Cola 0.5L x10', quantity: 3, unitPrice: 25.99, totalPrice: 77.97 },
      { productId: 'PRD-002', description: 'Fanta Orange 1L x6', quantity: 2, unitPrice: 19.50, totalPrice: 39.00 }
    ],
    notes: 'Payment terms: Net 30',
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: '2025-01-15T09:00:00Z'
  },
  {
    id: 'inv-2',
    businessId: 'comp-1',
    issuedByScope: INVOICE_SCOPE.LOCATION,
    issuedByLocationId: 'loc-1',
    orderId: 'ORD-002',
    invoiceNumber: 'WHA-2025-001',
    clientName: 'Super Store Express',
    clientEmail: 'purchasing@superstore.mu',
    amount: 450.00,
    taxAmount: 67.50,
    totalAmount: 517.50,
    status: 'paid',
    type: 'invoice',
    issueDate: '2025-01-14',
    dueDate: '2025-02-13',
    items: [
      { productId: 'PRD-004', description: 'Rice Premium 5kg', quantity: 10, unitPrice: 45.00, totalPrice: 450.00 }
    ],
    notes: '',
    createdAt: '2025-01-14T10:00:00Z',
    updatedAt: '2025-01-14T14:00:00Z'
  },
  {
    id: 'inv-3',
    businessId: 'comp-1',
    issuedByScope: INVOICE_SCOPE.LOCATION,
    issuedByLocationId: 'loc-3',
    orderId: 'ORD-004',
    invoiceNumber: 'DIS-2025-001',
    clientName: 'Fresh Mart Central',
    clientEmail: 'supply@freshmart.mu',
    amount: 249.50,
    taxAmount: 37.43,
    totalAmount: 286.93,
    status: 'paid',
    type: 'invoice',
    issueDate: '2025-01-06',
    dueDate: '2025-02-05',
    items: [
      { productId: 'PRD-007', description: 'Fresh Milk 1L', quantity: 50, unitPrice: 4.99, totalPrice: 249.50 }
    ],
    notes: '',
    createdAt: '2025-01-06T08:00:00Z',
    updatedAt: '2025-01-07T10:00:00Z'
  }
];

// DUPLICATE REMOVED - using store.chats instead
const _chats_removed = [
  {
    id: 'chat-1',
    companyId: 'comp-1',
    locationId: null,
    type: 'client',
    name: '📋 Message Types Showcase',
    participants: ['user-1', 'demo-1'],
    lastMessage: {
      id: 'msg-showcase',
      content: 'View all chat bubble types here',
      type: 'text',
      senderId: 'demo-1',
      senderName: 'Demo Contact',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'delivered'
    },
    unreadCount: 10,
    avatar: 'https://picsum.photos/seed/showcase/40/40',
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-2',
    companyId: 'comp-1',
    locationId: null,
    type: 'client',
    name: 'Sarah Johnson',
    participants: ['user-1', 'sarah-1'],
    lastMessage: {
      id: 'msg-sarah',
      content: 'Photo',
      type: 'photo',
      senderId: 'sarah-1',
      senderName: 'Sarah Johnson',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'delivered'
    },
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/sarah/40/40',
    createdAt: '2025-01-14T10:00:00Z',
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-3',
    companyId: 'comp-1',
    locationId: null,
    type: 'supplier',
    name: 'XYZ Suppliers',
    participants: ['user-1', 'xyz-1'],
    lastMessage: {
      id: 'msg-xyz',
      content: 'New_Products_Catalog.pdf',
      type: 'pdf',
      senderId: 'xyz-1',
      senderName: 'XYZ Suppliers',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'seen'
    },
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/xyz/40/40',
    createdAt: '2025-01-13T14:00:00Z',
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-4',
    companyId: 'comp-1',
    locationId: null,
    type: 'client',
    name: 'Mike Chen',
    participants: ['user-1', 'mike-1'],
    lastMessage: {
      id: 'msg-mike',
      content: 'Video call ended (15 min)',
      type: 'video_call',
      senderId: 'user-1',
      senderName: 'You',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      isOutgoing: true,
      status: 'delivered'
    },
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/mike/40/40',
    createdAt: '2025-01-12T09:00:00Z',
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-5',
    companyId: 'comp-1',
    locationId: 'loc-1',
    type: 'internal',
    name: 'Warehouse A Team',
    participants: ['user-1', 'john-1', 'maria-1'],
    lastMessage: {
      id: 'msg-warehouse',
      content: 'Inventory_Report_Jan2025.pdf',
      type: 'pdf',
      senderId: 'user-1',
      senderName: 'You',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      isOutgoing: true,
      status: 'sent'
    },
    unreadCount: 0,
    avatar: null,
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-6',
    companyId: 'comp-1',
    locationId: null,
    type: 'client',
    name: 'Tech Solutions Inc',
    participants: ['user-1', 'tech-1'],
    lastMessage: {
      id: 'msg-tech',
      content: 'Invoice #INV-2025-001',
      type: 'invoice',
      senderId: 'user-1',
      senderName: 'You',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: true,
      status: 'delivered'
    },
    unreadCount: 3,
    avatar: 'https://picsum.photos/seed/tech/40/40',
    createdAt: '2025-01-08T11:00:00Z',
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-7',
    companyId: 'comp-1',
    locationId: null,
    type: 'client',
    name: 'Global Distributors',
    participants: ['user-1', 'global-1'],
    lastMessage: {
      id: 'msg-global',
      content: 'Voice Note',
      type: 'voice_note',
      senderId: 'global-1',
      senderName: 'Global Distributors',
      timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'sent'
    },
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/global/40/40',
    createdAt: '2025-01-05T15:00:00Z',
    updatedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-8',
    companyId: 'comp-1',
    locationId: null,
    type: 'client',
    name: 'Premium Foods Ltd',
    participants: ['user-1', 'premium-1'],
    lastMessage: {
      id: 'msg-premium',
      content: 'Payment completed! Looking forward to our next order.',
      type: 'text',
      senderId: 'premium-1',
      senderName: 'Premium Foods Ltd',
      timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      isOutgoing: false,
      status: 'seen'
    },
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/premium/40/40',
    createdAt: '2025-01-03T10:00:00Z',
    updatedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-9',
    companyId: 'comp-1',
    locationId: 'loc-3',
    type: 'internal',
    name: 'Distribution Center Updates',
    participants: ['user-1', 'alex-1'],
    lastMessage: {
      id: 'msg-dist',
      content: 'Delivery #DEL-001 completed ✓',
      type: 'delivery',
      senderId: 'user-1',
      senderName: 'You',
      timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      isOutgoing: true,
      status: 'seen',
      deliveryStatus: 'order_done'
    },
    unreadCount: 0,
    avatar: null,
    createdAt: '2025-01-02T08:00:00Z',
    updatedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-10',
    companyId: 'comp-1',
    locationId: 'loc-2',
    type: 'internal',
    name: 'Logistics Team',
    participants: ['user-1', 'alex-1', 'maria-1'],
    lastMessage: {
      id: 'msg-logistics',
      content: 'Pickup Location',
      type: 'location',
      senderId: 'alex-1',
      senderName: 'Alex',
      timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'delivered',
      deliveryStatus: 'order_ongoing'
    },
    unreadCount: 2,
    avatar: null,
    createdAt: '2025-01-01T09:00:00Z',
    updatedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-11',
    companyId: 'comp-1',
    locationId: 'loc-1',
    type: 'internal',
    name: 'Warehouse B Team',
    participants: ['user-1', 'maria-1'],
    lastMessage: {
      id: 'msg-warehouseb',
      content: 'New delivery order received',
      type: 'delivery',
      senderId: 'user-1',
      senderName: 'You',
      timestamp: new Date(Date.now() - 32 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: true,
      status: 'sent',
      deliveryStatus: 'new_order_received'
    },
    unreadCount: 1,
    avatar: null,
    createdAt: '2024-12-28T08:00:00Z',
    updatedAt: new Date(Date.now() - 32 * 60 * 60 * 1000).toISOString()
  }
];

// Mock messages for each chat
// DUPLICATE REMOVED - using store.messages instead
const _messages_removed = {
  'chat-1': [
    {
      id: 'msg-1-1',
      chatId: 'chat-1',
      type: 'event',
      event: 'Conversation started',
      isOutgoing: false,
      sender: { id: 'system', name: 'System', avatar: '', role: 'system' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-1-2',
      chatId: 'chat-1',
      type: 'text',
      text: '📝 TEXT MESSAGE (Incoming)\nThis is a regular text message received from another user.',
      isOutgoing: false,
      sender: { id: 'demo-1', name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-1-3',
      chatId: 'chat-1',
      type: 'text',
      text: '📝 TEXT MESSAGE (Outgoing)\nThis is a text message you sent.',
      isOutgoing: true,
      sender: { id: 'user-1', name: 'You', avatar: '', role: 'business' },
      timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg-1-4',
      chatId: 'chat-1',
      type: 'pdf',
      fileName: 'Product_Catalog_2025.pdf',
      isOutgoing: false,
      sender: { id: 'demo-1', name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 80 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-1-5',
      chatId: 'chat-1',
      type: 'order',
      orderId: 'ORD-NEW-001',
      itemCount: 5,
      totalAmount: 150.00,
      orderStatus: 'New',
      paymentStatus: 'Unpaid',
      isOutgoing: false,
      sender: { id: 'demo-1', name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 70 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-1-6',
      chatId: 'chat-1',
      type: 'invoice',
      invoiceId: 'INV-2025-DEMO',
      isOutgoing: true,
      sender: { id: 'user-1', name: 'You', avatar: '', role: 'business' },
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      status: 'delivered'
    },
    {
      id: 'msg-1-7',
      chatId: 'chat-1',
      type: 'text',
      text: 'View all chat bubble types here',
      isOutgoing: false,
      sender: { id: 'demo-1', name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ],
  'chat-2': [
    {
      id: 'msg-2-1',
      chatId: 'chat-2',
      type: 'text',
      text: 'Hi! I wanted to share some photos of the product issue.',
      isOutgoing: false,
      sender: { id: 'sarah-1', name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-2-2',
      chatId: 'chat-2',
      type: 'image',
      imageUrl: 'https://picsum.photos/seed/product1/300/200',
      isOutgoing: false,
      sender: { id: 'sarah-1', name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-2-3',
      chatId: 'chat-2',
      type: 'text',
      text: 'The packaging was damaged. Can we get a replacement?',
      isOutgoing: false,
      sender: { id: 'sarah-1', name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-2-4',
      chatId: 'chat-2',
      type: 'text',
      text: "I apologize for the inconvenience. We'll send a replacement immediately.",
      isOutgoing: true,
      sender: { id: 'user-1', name: 'You', avatar: '', role: 'business' },
      timestamp: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg-2-5',
      chatId: 'chat-2',
      type: 'image',
      imageUrl: 'https://picsum.photos/seed/product2/300/200',
      isOutgoing: false,
      sender: { id: 'sarah-1', name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    }
  ],
  'chat-3': [
    {
      id: 'msg-3-1',
      chatId: 'chat-3',
      type: 'text',
      text: 'Hi! We have new products available for order.',
      isOutgoing: false,
      sender: { id: 'xyz-1', name: 'XYZ Suppliers', avatar: 'https://picsum.photos/seed/xyz/40/40', role: 'supplier' },
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-3-2',
      chatId: 'chat-3',
      type: 'pdf',
      fileName: 'New_Products_Catalog.pdf',
      isOutgoing: false,
      sender: { id: 'xyz-1', name: 'XYZ Suppliers', avatar: 'https://picsum.photos/seed/xyz/40/40', role: 'supplier' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
  ]
};

// ============================================================================
// MOCK DATABASE - USERS
// ============================================================================

// DUPLICATE REMOVED - using store.users instead
const _users_removed = [
  {
    id: 'user-1',
    email: 'admin@noupro.com',
    name: 'Admin User',
    avatar: 'https://picsum.photos/seed/admin/100/100',
    phone: '+230-5123-4567',
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2025-01-15T08:00:00Z'
  },
  {
    id: 'user-2',
    email: 'manager@noupro.com',
    name: 'Marie Manager',
    avatar: 'https://picsum.photos/seed/marie/100/100',
    phone: '+230-5234-5678',
    createdAt: '2024-03-01T00:00:00Z',
    lastLoginAt: '2025-01-14T09:00:00Z'
  },
  {
    id: 'user-3',
    email: 'owner@globalsupply.mu',
    name: 'Global Owner',
    avatar: 'https://picsum.photos/seed/global/100/100',
    phone: '+230-5345-6789',
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2025-01-15T07:00:00Z'
  },
  {
    id: 'user-4',
    email: 'driver@noupro.com',
    name: 'John Driver',
    avatar: 'https://picsum.photos/seed/driver/100/100',
    phone: '+230-5456-7890',
    createdAt: '2024-06-01T00:00:00Z',
    lastLoginAt: '2025-01-15T06:00:00Z'
  }
];

// Feed posts (3 types: brand_presentation, company_presentation, new_products)
// Using real brand logos where possible
// DUPLICATE REMOVED - using store.feedPosts instead
const _feedPosts_removed = [
  {
    id: 'post-1',
    type: 'brand_presentation',
    timestamp: '2h ago',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    data: {
      brandId: 'brand-001',
      brandName: 'Tropicana',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Tropicana_Logo.svg/512px-Tropicana_Logo.svg.png',
      distributorName: 'NouPro Distribution',
      distributorId: 'comp-1',
      products: [
        { id: 'prod-1', name: 'Premium Orange Juice', unit: '1L', price: 125.00, image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400', isNew: true },
        { id: 'prod-2', name: 'Tropical Mango Smoothie', unit: '500ml', price: 145.00, image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', isNew: false },
        { id: 'prod-3', name: 'Coconut Water', unit: '500ml', price: 85.00, image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400', isNew: false },
        { id: 'prod-4', name: 'Passion Fruit Nectar', unit: '750ml', price: 110.00, image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400', isNew: true },
      ],
    },
  },
  {
    id: 'post-2',
    type: 'company_presentation',
    timestamp: '4h ago',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    data: {
      companyId: 'comp-2',
      companyName: 'Phoenix Beverages',
      companyLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Phoenix_Beverages_Limited_logo.svg/512px-Phoenix_Beverages_Limited_logo.svg.png',
      location: 'Port Louis, Mauritius',
      isConnected: false,
      brands: [
        { id: 'brand-101', name: 'Phoenix Beer', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Phoenix_Beverages_Limited_logo.svg/200px-Phoenix_Beverages_Limited_logo.svg.png', productsCount: 24 },
        { id: 'brand-102', name: 'Coca-Cola', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/512px-Coca-Cola_logo.svg.png', productsCount: 18 },
        { id: 'brand-103', name: 'Schweppes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Schweppes_logo.svg/512px-Schweppes_logo.svg.png', productsCount: 32 },
        { id: 'brand-104', name: 'Sprite', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Sprite_2019.svg/512px-Sprite_2019.svg.png', productsCount: 15 },
      ],
    },
  },
  {
    id: 'post-3',
    type: 'new_products',
    timestamp: '6h ago',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    data: {
      postType: 'distributor_added',
      businessId: 'comp-1',
      businessName: 'Fresh Farms Mauritius',
      businessLogo: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=200',
      products: [
        { id: 'new-1', name: 'Organic Honey', unit: '500g', price: 350.00, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400', brandName: 'Bee Natural' },
        { id: 'new-2', name: 'Fresh Avocados', unit: 'Pack of 4', price: 180.00, image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400', brandName: 'Green Valley' },
        { id: 'new-3', name: 'Premium Coffee Beans', unit: '250g', price: 450.00, image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400', brandName: 'Island Roast' },
        { id: 'new-4', name: 'Vanilla Extract', unit: '100ml', price: 275.00, image: 'https://images.unsplash.com/photo-1631207464094-5c88e2c4e7e3?w=400', brandName: 'Pure Essence' },
      ],
    },
  },
  {
    id: 'post-4',
    type: 'brand_presentation',
    timestamp: '8h ago',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    data: {
      brandId: 'brand-lays',
      brandName: "Lay's",
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Lays_brand_logo.png/512px-Lays_brand_logo.png',
      distributorName: 'Snack Masters Ltd',
      distributorId: 'comp-3',
      products: [
        { id: 'lays-1', name: "Lay's Classic", unit: '150g', price: 85.00, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400', isNew: false },
        { id: 'lays-2', name: "Lay's Sour Cream & Onion", unit: '150g', price: 95.00, image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400', isNew: true },
        { id: 'lays-3', name: "Lay's BBQ", unit: '150g', price: 95.00, image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400', isNew: false },
        { id: 'lays-4', name: "Lay's Salt & Vinegar", unit: '150g', price: 95.00, image: 'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400', isNew: true },
      ],
    },
  },
  {
    id: 'post-5',
    type: 'new_products',
    timestamp: '12h ago',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    data: {
      postType: 'business_received',
      businessId: 'comp-2',
      businessName: 'QuickMart Superstore',
      businessLogo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200',
      products: [
        { id: 'recv-1', name: 'Sparkling Water', unit: '6-Pack', price: 240.00, image: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400', brandName: 'Perrier' },
        { id: 'recv-2', name: 'Organic Pasta', unit: '500g', price: 95.00, image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400', brandName: 'Barilla' },
      ],
    },
  },
  {
    id: 'post-6',
    type: 'company_presentation',
    timestamp: '1d ago',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    data: {
      companyId: 'comp-3',
      companyName: 'Innodis Ltd',
      companyLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200',
      location: 'Quatre Bornes, Mauritius',
      isConnected: true,
      brands: [
        { id: 'brand-201', name: 'Fairy', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Fairy_logo.svg/512px-Fairy_logo.svg.png', productsCount: 42 },
        { id: 'brand-202', name: 'Ariel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Ariel_logo.svg/512px-Ariel_logo.svg.png', productsCount: 28 },
        { id: 'brand-203', name: 'Tide', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Tide_logo.svg/512px-Tide_logo.svg.png', productsCount: 35 },
      ],
    },
  },
  {
    id: 'post-7',
    type: 'brand_presentation',
    timestamp: '1d ago',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    data: {
      brandId: 'brand-schweppes',
      brandName: 'Schweppes',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Schweppes_logo.svg/512px-Schweppes_logo.svg.png',
      distributorName: 'Phoenix Beverages',
      distributorId: 'comp-2',
      products: [
        { id: 'schw-1', name: 'Schweppes Tonic Water', unit: '1L', price: 75.00, image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400', isNew: false },
        { id: 'schw-2', name: 'Schweppes Ginger Ale', unit: '1L', price: 75.00, image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400', isNew: true },
        { id: 'schw-3', name: 'Schweppes Soda Water', unit: '1L', price: 65.00, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', isNew: false },
      ],
    },
  },
  {
    id: 'post-8',
    type: 'company_presentation',
    timestamp: '2d ago',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    data: {
      companyId: 'comp-4',
      companyName: 'Snack Masters Ltd',
      companyLogo: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200',
      location: 'Ebene, Mauritius',
      isConnected: false,
      brands: [
        { id: 'brand-lays', name: "Lay's", logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Lays_brand_logo.png/512px-Lays_brand_logo.png', productsCount: 18 },
        { id: 'brand-doritos', name: 'Doritos', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Doritos_logo_%282013%29.svg/512px-Doritos_logo_%282013%29.svg.png', productsCount: 12 },
        { id: 'brand-pringles', name: 'Pringles', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Pringles.svg/512px-Pringles.svg.png', productsCount: 15 },
        { id: 'brand-cheetos', name: 'Cheetos', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/ab/Cheetos_Logo.svg/512px-Cheetos_Logo.svg.png', productsCount: 10 },
      ],
    },
  },
  {
    id: 'post-9',
    type: 'brand_presentation',
    timestamp: '2d ago',
    createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    data: {
      brandId: 'brand-fanta',
      brandName: 'Fanta',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Fanta_logo_%282023%29.svg/512px-Fanta_logo_%282023%29.svg.png',
      distributorName: 'Phoenix Beverages',
      distributorId: 'comp-2',
      products: [
        { id: 'fanta-1', name: 'Fanta Orange', unit: '1.5L', price: 65.00, image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400', isNew: false },
        { id: 'fanta-2', name: 'Fanta Grape', unit: '1.5L', price: 65.00, image: 'https://images.unsplash.com/photo-1632818924360-68d4994cfdb2?w=400', isNew: true },
        { id: 'fanta-3', name: 'Fanta Pineapple', unit: '1.5L', price: 65.00, image: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400', isNew: false },
        { id: 'fanta-4', name: 'Fanta Strawberry', unit: '1.5L', price: 65.00, image: 'https://images.unsplash.com/photo-1622766815178-641bef2b4630?w=400', isNew: true },
      ],
    },
  },
  {
    id: 'post-10',
    type: 'new_products',
    timestamp: '3d ago',
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    data: {
      postType: 'distributor_added',
      businessId: 'comp-4',
      businessName: 'Snack Masters Ltd',
      businessLogo: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200',
      products: [
        { id: 'doritos-1', name: 'Doritos Nacho Cheese', unit: '180g', price: 115.00, image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400', brandName: 'Doritos' },
        { id: 'doritos-2', name: 'Doritos Cool Ranch', unit: '180g', price: 115.00, image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400', brandName: 'Doritos' },
        { id: 'pringles-1', name: 'Pringles Original', unit: '150g', price: 135.00, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400', brandName: 'Pringles' },
      ],
    },
  },
];

// Helper functions
const successResponse = (data, message = 'Success') => ({
  success: true,
  data,
  message
});

const errorResponse = (error, message = 'Error') => ({
  success: false,
  error,
  message
});

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Debug logging
  console.log('[Login] Received:', { email, passwordLength: password?.length, body: req.body });
  
  // Simple mock authentication
  const user = users.find(u => u.email === email);
  console.log('[Login] User found:', user ? user.email : 'NOT FOUND');
  
  if (user && password === 'password') {
    // Get user's businesses
    const userMemberships = businessMembers.filter(m => 
      m.userId === user.id && m.status === 'accepted'
    );
    
    const userBusinesses = userMemberships.map(membership => {
      const business = companies.find(c => c.id === membership.businessId);
      return {
        business,
        role: membership.role,
        staff_entry: {
          id: membership.id,
          status: membership.status,
          role_type: membership.roleType || null,
          joinedAt: membership.joinedAt,
        }
      };
    }).filter(ub => ub.business); // Filter out any null businesses
    
    res.json(successResponse({
      user,
      token: 'mock-jwt-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      businesses: userBusinesses
    }));
  } else {
    res.status(401).json(errorResponse('Invalid credentials'));
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json(successResponse(null, 'Logged out successfully'));
});

// Register new user
app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, phone, countryCode, email, password, profilePicture } = req.body;
  
  // Validate required fields
  if (!firstName || !lastName || !phone || !password) {
    return res.status(400).json(errorResponse('Missing required fields: firstName, lastName, phone, password'));
  }
  
  // Check if user already exists (by phone or email)
  const existingUser = users.find(u => 
    u.phone === phone || (email && u.email === email)
  );
  if (existingUser) {
    return res.status(409).json(errorResponse('User with this phone or email already exists'));
  }
  
  // Create new user
  const newUser = {
    id: uuidv4(),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    phone: `${countryCode || '+230'}${phone}`,
    email: email || null,
    profilePicture: profilePicture || null,
    avatar: profilePicture || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Add to users array
  users.push(newUser);
  
  // Generate token
  const token = 'mock-jwt-token-' + Date.now();
  
  res.status(201).json(successResponse({
    user: newUser,
    token,
    refreshToken: 'mock-refresh-token-' + Date.now(),
    businesses: [] // New user has no businesses yet
  }, 'Account created successfully'));
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  // In a real app, extract user ID from JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('Not authenticated'));
  }
  
  // For mock purposes, return the first user or a default
  // In production, decode JWT and find the user by ID
  const user = users[0];
  if (!user) {
    return res.status(404).json(errorResponse('User not found'));
  }
  
  res.json(successResponse({ user }));
});

// ============================================================================
// BUSINESS ROUTES (with capabilities)
// ============================================================================

// Get all businesses (for search/discovery)
app.get('/api/businesses', async (req, res) => {
  const businesses = await repos.businessRepo.list();
  const businessesWithCaps = businesses.map(b => ({
    ...b,
    capabilities: deriveCapabilities(b),
  }));
  res.json(successResponse(businessesWithCaps));
});

// Get single business with capabilities
app.get('/api/businesses/:businessId', async (req, res) => {
  const business = await repos.businessRepo.getById(req.params.businessId);
  if (!business) {
    return res.status(404).json(errorResponse('Business not found'));
  }
  
  const businessLocations = await repos.locationRepo.getByBusinessId(business.id);
  const capabilities = deriveCapabilities(business);
  
  res.json(successResponse({ 
    ...business, 
    capabilities,
    locations: businessLocations,
  }));
});

// Update business
app.patch('/api/businesses/:businessId', async (req, res) => {
  const existing = await repos.businessRepo.getById(req.params.businessId);
  if (!existing) {
    return res.status(404).json(errorResponse('Business not found'));
  }
  
  // Don't allow changing subscription tier via this endpoint
  const { subscriptionTier, ...allowedUpdates } = req.body;
  
  const updated = await repos.businessRepo.update(req.params.businessId, allowedUpdates);
  
  res.json(successResponse({
    ...updated,
    capabilities: deriveCapabilities(updated),
  }));
});

// Legacy company routes (for backwards compatibility)
app.get('/api/companies', async (req, res) => {
  const businesses = await repos.businessRepo.list();
  const businessesWithCaps = businesses.map(b => ({
    ...b,
    capabilities: deriveCapabilities(b),
  }));
  res.json(successResponse(businessesWithCaps));
});

app.get('/api/companies/:id', async (req, res) => {
  const company = await repos.businessRepo.getById(req.params.id);
  if (!company) {
    return res.status(404).json(errorResponse('Company not found'));
  }

  const companyLocations = await repos.locationRepo.getByBusinessId(company.id);

    res.json(successResponse({ 
      ...company, 
      capabilities: deriveCapabilities(company),
    locations: companyLocations,
  }));
});

app.put('/api/companies/:id', async (req, res) => {
  const existing = await repos.businessRepo.getById(req.params.id);
  if (!existing) {
    return res.status(404).json(errorResponse('Company not found'));
  }

  const updated = await repos.businessRepo.update(req.params.id, req.body);

    res.json(successResponse({
    ...updated,
    capabilities: deriveCapabilities(updated),
    }));
});

// ============================================================================
// LOCATION ROUTES (with mode enforcement)
// ============================================================================

// Get locations for a business
app.get('/api/businesses/:businessId/locations', async (req, res) => {
  const business = await repos.businessRepo.getById(req.params.businessId);
  const businessLocations = await repos.locationRepo.getByBusinessId(req.params.businessId);

  const enrichedLocations = businessLocations.map(location => {
    const publicEffective = business ? isLocationPublicEffective(business, location) : false;
    const publicDisabledReason = business ? getPublicDisabledReason(business, location) : null;
    return { ...location, publicEffective, publicDisabledReason };
  });
  
  res.json(successResponse(enrichedLocations));
});

// Create location with mode enforcement
app.post('/api/businesses/:businessId/locations', async (req, res) => {
  const business = await repos.businessRepo.getById(req.params.businessId);
  if (!business) {
    return res.status(404).json(errorResponse('Business not found'));
  }
  
  const capabilities = deriveCapabilities(business);
  let { operatingMode, ...locationData } = req.body;
  
  // ENFORCE: Non-top-tier businesses can only have DEPENDENT locations
  if (!capabilities.canChooseLocationMode) {
    operatingMode = LOCATION_MODES.DEPENDENT;
  }
  
  // ENFORCE: If mode is INDEPENDENT but not allowed, force to DEPENDENT
  if (operatingMode === LOCATION_MODES.INDEPENDENT && !capabilities.canHaveIndependentLocations) {
    operatingMode = LOCATION_MODES.DEPENDENT;
  }
  
  // Check max locations limit
  const currentLocations = await repos.locationRepo.getByBusinessId(req.params.businessId);
  if (currentLocations.length >= capabilities.maxLocations) {
    return res.status(403).json(errorResponse(
      `Location limit reached (${capabilities.maxLocations}). Upgrade your subscription to add more locations.`,
      'LOCATION_LIMIT_REACHED'
    ));
  }
  
  const newLocationPayload = {
    id: 'loc-' + uuidv4().slice(0, 8),
    operatingMode: operatingMode || LOCATION_MODES.DEPENDENT,
    isPublic: operatingMode === LOCATION_MODES.INDEPENDENT ? (req.body.isPublic ?? false) : false,
    ...locationData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const created = await repos.locationRepo.create(req.params.businessId, newLocationPayload);
  res.json(successResponse(created));
});

// Get single location
app.get('/api/locations/:locationId', async (req, res) => {
  const location = await repos.locationRepo.getById(req.params.locationId);
  if (!location) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  
  // In memory, location has companyId; in DB it has businessId.
  const businessId = location.businessId || location.companyId;

  const business = await repos.businessRepo.getById(businessId);
  const capabilities = business ? deriveCapabilities(business) : {};
  
  const publicEffective = business ? isLocationPublicEffective(business, location) : false;
  const publicDisabledReason = business ? getPublicDisabledReason(business, location) : null;
  
  res.json(successResponse({
    ...location,
    publicEffective,
    publicDisabledReason,
    business: business ? { id: business.id, name: business.name, capabilities } : null,
  }));
});

// Update location (with mode change enforcement + grandfathering policy)
app.patch('/api/locations/:locationId', async (req, res) => {
  const location = await repos.locationRepo.getById(req.params.locationId);
  if (!location) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  
  const businessId = location.businessId || location.companyId;
  
  // PERMISSION: Require business membership
  if (!requireBusinessMembership(req, res, businessId)) return;
  
  const business = await repos.businessRepo.getById(businessId);
  if (!business) {
    return res.status(404).json(errorResponse('Business not found'));
  }
  
  const capabilities = deriveCapabilities(business);
  let { operatingMode, ...updates } = req.body;
  
  // MODE CHANGE ENFORCEMENT with grandfathering policy
  if (operatingMode && operatingMode !== location.operatingMode) {
    // Trying to switch DEPENDENT → INDEPENDENT
    if (location.operatingMode === LOCATION_MODES.DEPENDENT && operatingMode === LOCATION_MODES.INDEPENDENT) {
      if (!capabilities.canChooseLocationMode || !capabilities.canHaveIndependentLocations) {
        return res.status(403).json(errorResponse(
          'Switching to Independent mode requires an Enterprise subscription.',
          'CAPABILITY_REQUIRED'
        ));
      }
    }
  }
  
  // If switching to DEPENDENT, isPublic must be false
  if (operatingMode === LOCATION_MODES.DEPENDENT) {
    updates.isPublic = false;
  }
  
  const updated = await repos.locationRepo.update(req.params.locationId, {
    ...updates,
    operatingMode: operatingMode || location.operatingMode,
    updatedAt: new Date().toISOString(),
  });
  
  res.json(successResponse(updated));
});

// Delete location
app.delete('/api/locations/:locationId', async (req, res) => {
  const ok = await repos.locationRepo.delete(req.params.locationId);
  if (!ok) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  res.json(successResponse(null, 'Location deleted successfully'));
});

// Legacy location routes (for backwards compatibility)
app.get('/api/companies/:companyId/locations', async (req, res) => {
  const companyLocations = await repos.locationRepo.getByBusinessId(req.params.companyId);
  res.json(successResponse(companyLocations));
});

app.post('/api/companies/:companyId/locations', async (req, res) => {
  const business = await repos.businessRepo.getById(req.params.companyId);
  const capabilities = business ? deriveCapabilities(business) : {};
  
  let operatingMode = req.body.operatingMode || LOCATION_MODES.DEPENDENT;
  if (!capabilities.canChooseLocationMode) {
    operatingMode = LOCATION_MODES.DEPENDENT;
  }
  
  const newLocationPayload = {
    id: 'loc-' + uuidv4().slice(0, 8),
    operatingMode,
    isPublic: operatingMode === LOCATION_MODES.INDEPENDENT ? (req.body.isPublic ?? false) : false,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const created = await repos.locationRepo.create(req.params.companyId, newLocationPayload);
  res.json(successResponse(created));
});

app.put('/api/companies/:companyId/locations/:locationId', async (req, res) => {
  const location = await repos.locationRepo.getById(req.params.locationId);
  const businessId = location?.businessId || location?.companyId;
  
  if (!location || businessId !== req.params.companyId) {
    return res.status(404).json(errorResponse('Location not found'));
  }

  const updated = await repos.locationRepo.update(req.params.locationId, {
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
  res.json(successResponse(updated));
});

app.delete('/api/companies/:companyId/locations/:locationId', async (req, res) => {
  const location = await repos.locationRepo.getById(req.params.locationId);
  const businessId = location?.businessId || location?.companyId;
  
  if (!location || businessId !== req.params.companyId) {
    return res.status(404).json(errorResponse('Location not found'));
  }

  await repos.locationRepo.delete(req.params.locationId);
  res.json(successResponse(null, 'Location deleted successfully'));
});

// Product Routes
app.get('/api/companies/:companyId/products', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { locationId, category, search, status, viewType } = req.query;

    // Repo returns products for this businessId (companyId maps to businessId)
    let companyProducts = await repos.productRepo.getByBusinessId(companyId);

    // Apply filters
    if (category) {
      companyProducts = companyProducts.filter(p => 
        p.category?.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    if (status && status !== 'All') {
      companyProducts = companyProducts.filter(p => p.status === status);
    }
    
    if (viewType) {
      switch (viewType) {
        case 'My Products':
          companyProducts = companyProducts.filter(p => p.isCreatedByUser);
          break;
        case 'Imported':
          companyProducts = companyProducts.filter(p => p.isImported);
          break;
        case 'Display':
          companyProducts = companyProducts.filter(p => p.isDisplayable);
          break;
        // 'All Products' shows everything
      }
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      companyProducts = companyProducts.filter(p => 
        (p.name || '').toLowerCase().includes(searchLower) ||
        (p.brand || '').toLowerCase().includes(searchLower) ||
        (p.category || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by brand name, then product name
    companyProducts.sort((a, b) => {
      const brandCompare = (a.brand || '').localeCompare(b.brand || '');
      if (brandCompare !== 0) return brandCompare;
      return (a.name || '').localeCompare(b.name || '');
    });
    
    res.json(successResponse(companyProducts));
  } catch (e) {
    console.error('Error fetching products:', e);
    res.status(500).json(errorResponse('Failed to load products'));
  }
});

app.get('/api/companies/:companyId/products/:productId', async (req, res) => {
  try {
    const { companyId, productId } = req.params;

    const product = await repos.productRepo.getById(productId);
    if (!product) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    // Safety check: ensure product belongs to the business (support both companyId and businessId)
    const productBusinessId = product.businessId || product.companyId;
    if (productBusinessId !== companyId) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    res.json(successResponse(product));
  } catch (e) {
    console.error('Error fetching product:', e);
    res.status(500).json(errorResponse('Failed to load product'));
  }
});

// ============================================================================
// ORDER ROUTES (with scope: PARENT vs LOCATION)
// ============================================================================

// Get all orders for a business (Parent view)
app.get('/api/businesses/:businessId/orders', async (req, res) => {
  // PERMISSION: Require business membership
  if (!requireBusinessMembership(req, res, req.params.businessId)) return;

  try {
    let businessOrders = await repos.orderRepo.getByBusinessId(req.params.businessId);

    // Optional filters
    const { status, scope, soldByLocationId, fulfillmentLocationId, soldByScope, search } = req.query;

    if (status) businessOrders = businessOrders.filter(o => o.status === status);
    if (scope || soldByScope) businessOrders = businessOrders.filter(o => o.soldByScope === (scope || soldByScope));
    if (soldByLocationId) businessOrders = businessOrders.filter(o => o.soldByLocationId === soldByLocationId);
    if (fulfillmentLocationId) businessOrders = businessOrders.filter(o => o.fulfillmentLocationId === fulfillmentLocationId);

    if (search) {
      const searchLower = search.toLowerCase();
      businessOrders = businessOrders.filter(o => 
        (o.customerName || '').toLowerCase().includes(searchLower) ||
        (o.id || '').toLowerCase().includes(searchLower)
      );
    }

    businessOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(successResponse(businessOrders, 'Orders retrieved successfully'));
  } catch (err) {
    console.error('Error fetching business orders:', err);
    res.status(500).json(errorResponse('Failed to retrieve orders', 'FETCH_ERROR'));
  }
});

// Create order at Parent level (always allowed for paid plans)
app.post('/api/businesses/:businessId/orders', async (req, res) => {
  // PERMISSION: Require business membership
  if (!requireBusinessMembership(req, res, req.params.businessId)) return;

  try {
    const business = await repos.businessRepo.getById(req.params.businessId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    }

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canCreateOrders) {
      return res.status(403).json(errorResponse(
        'Creating orders requires a paid subscription.',
        'CAPABILITY_REQUIRED'
      ));
    }

    const { customerName, customerAddress, customerPhone, items, totalAmount, notes, fulfillmentLocationId } = req.body;

    const newOrder = {
      id: 'ORD-' + uuidv4().slice(0, 8).toUpperCase(),
      businessId: req.params.businessId,
      soldByScope: ORDER_SCOPE_FROM_STORE.PARENT,
      soldByLocationId: null,
      fulfillmentLocationId: fulfillmentLocationId || null,
      status: fulfillmentLocationId ? ORDER_STATUS_FROM_STORE.ASSIGNED : ORDER_STATUS_FROM_STORE.NEW,
      paymentStatus: 'Unpaid',
      customerId: null,
      customerName,
      customerAddress,
      customerPhone,
      items: items || [],
      totalAmount,
      notes: notes || null,
    };

    const created = await repos.orderRepo.create(newOrder);

    res.status(201).json(successResponse(created, 'Order created successfully'));
  } catch (err) {
    console.error('Error creating business order:', err);
    res.status(500).json(errorResponse('Failed to create order', 'CREATE_ERROR'));
  }
});

// Assign order to a location for fulfillment
app.post('/api/businesses/:businessId/orders/:orderId/assign', async (req, res) => {
  // PERMISSION: Require business membership
  if (!requireBusinessMembership(req, res, req.params.businessId)) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.businessId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    const { fulfillmentLocationId, assignedStaffId, assignedTo } = req.body;
    if (!fulfillmentLocationId) {
      return res.status(400).json(errorResponse('fulfillmentLocationId is required'));
    }

    // Verify location belongs to business
    const location = await repos.locationRepo.getById(fulfillmentLocationId);
    const locationBusinessId = location?.businessId || location?.companyId;
    if (!location || locationBusinessId !== req.params.businessId) {
      return res.status(404).json(errorResponse('Location not found'));
    }

    const updated = await repos.orderRepo.update(req.params.orderId, {
      fulfillmentLocationId: fulfillmentLocationId || null,
      assignedStaffId: assignedStaffId || null,
      assignedTo: assignedTo || null,
      status: ORDER_STATUS_FROM_STORE.ASSIGNED,
    });

    res.json(successResponse(updated, 'Order assigned successfully'));
  } catch (err) {
    console.error('Error assigning order:', err);
    res.status(500).json(errorResponse('Failed to assign order', 'ASSIGN_ERROR'));
  }
});

// Get single order
app.get('/api/businesses/:businessId/orders/:orderId', async (req, res) => {
  // PERMISSION: Require business membership
  if (!requireBusinessMembership(req, res, req.params.businessId)) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.businessId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    res.json(successResponse(order, 'Order retrieved successfully'));
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json(errorResponse('Failed to retrieve order', 'FETCH_ERROR'));
  }
});

// Update order status
app.patch('/api/businesses/:businessId/orders/:orderId', async (req, res) => {
  // PERMISSION: Require business membership
  if (!requireBusinessMembership(req, res, req.params.businessId)) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.businessId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    const updated = await repos.orderRepo.update(req.params.orderId, req.body);
    res.json(successResponse(updated, 'Order updated successfully'));
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json(errorResponse('Failed to update order', 'UPDATE_ERROR'));
  }
});

// ============================================================================
// LOCATION ORDER ROUTES (Independent locations only)
// ============================================================================

// Get orders for a location (for location staff view)
app.get('/api/locations/:locationId/orders', async (req, res) => {
  // PERMISSION: Require location membership
  if (!requireLocationMembership(req, res, req.params.locationId)) return;

  try {
    const location = await repos.locationRepo.getById(req.params.locationId);
    if (!location) {
      return res.status(404).json(errorResponse('Location not found', 'NOT_FOUND'));
    }

    const businessId = location.businessId || location.companyId;

    let locationOrders = await repos.orderRepo.getByBusinessId(businessId);

    // Location can only see orders that are sold-by or fulfilled-by this location
    locationOrders = locationOrders.filter(o => verifyOrderLocationAccess(o, req.params.locationId, location));

    const { status, search } = req.query;
    if (status) locationOrders = locationOrders.filter(o => o.status === status);

    if (search) {
      const searchLower = search.toLowerCase();
      locationOrders = locationOrders.filter(o => 
        (o.customerName || '').toLowerCase().includes(searchLower) ||
        (o.id || '').toLowerCase().includes(searchLower)
      );
    }

    locationOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(successResponse(locationOrders, 'Location orders retrieved successfully'));
  } catch (err) {
    console.error('Error fetching location orders:', err);
    res.status(500).json(errorResponse('Failed to retrieve orders', 'FETCH_ERROR'));
  }
});

// Create order at Location level (INDEPENDENT locations only) - INTERNAL USE
// For customer-facing orders, use /api/public/locations/:locationId/orders
app.post('/api/locations/:locationId/orders', async (req, res) => {
  // PERMISSION: Require location membership (internal staff creating order)
  if (!requireLocationMembership(req, res, req.params.locationId)) return;

  try {
    const location = await repos.locationRepo.getById(req.params.locationId);
    if (!location) {
      return res.status(404).json(errorResponse('Location not found', 'NOT_FOUND'));
    }

    const businessId = location.businessId || location.companyId;

    const business = await repos.businessRepo.getById(businessId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    }

    const capabilities = deriveCapabilities(business);

    // ENFORCE: Only INDEPENDENT locations can create their own orders
    if (location.operatingMode !== LOCATION_MODES.INDEPENDENT) {
      return res.status(403).json(errorResponse(
        'Only independent locations can create their own orders. This location operates in DEPENDENT mode.',
        'LOCATION_MODE_REQUIRED'
      ));
    }

    // ENFORCE: Business must have Enterprise capability for location-scoped orders
    if (!capabilities.canHaveIndependentLocations) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_REQUIRED',
          message: 'Creating orders from independent locations requires an Enterprise subscription.'
        }
      });
    }

    if (!capabilities.canCreateOrders) {
      return res.status(403).json(errorResponse(
        'Creating orders requires a paid subscription.',
        'CAPABILITY_REQUIRED'
      ));
    }

    const { customerName, customerAddress, customerPhone, items, totalAmount, notes } = req.body;

    const newOrder = {
      id: 'ORD-' + uuidv4().slice(0, 8).toUpperCase(),
      businessId,
      soldByScope: ORDER_SCOPE_FROM_STORE.LOCATION,
      soldByLocationId: req.params.locationId,
      fulfillmentLocationId: req.params.locationId,
      customerId: null,
      customerName,
      customerAddress,
      customerPhone,
      items: items || [],
      totalAmount,
      status: ORDER_STATUS_FROM_STORE.NEW,
      paymentStatus: 'Unpaid',
      notes: notes || null,
    };

    const created = await repos.orderRepo.create(newOrder);

    res.status(201).json(successResponse(created, 'Order created successfully'));
  } catch (err) {
    console.error('Error creating location order:', err);
    res.status(500).json(errorResponse('Failed to create order', 'CREATE_ERROR'));
  }
});

// Update order at location level
app.patch('/api/locations/:locationId/orders/:orderId', async (req, res) => {
  // PERMISSION: Require location membership
  if (!requireLocationMembership(req, res, req.params.locationId)) return;

  try {
    const location = await repos.locationRepo.getById(req.params.locationId);
    if (!location) {
      return res.status(404).json(errorResponse('Location not found', 'NOT_FOUND'));
    }

    const order = await repos.orderRepo.getById(req.params.orderId);

    // OWNERSHIP CHECK: Ensure order belongs to same business as location
    const locationBusinessId = location.businessId || location.companyId;
    if (!order || order.businessId !== locationBusinessId) {
      return res.status(404).json(errorResponse('Order not found'));
    }

    // ACCESS CHECK: Ensure order is accessible from this location
    if (!verifyOrderLocationAccess(order, req.params.locationId, location)) {
      return res.status(403).json(errorResponse(
        'This order is not accessible from this location',
        'ACCESS_DENIED'
      ));
    }

    // Dependent locations can only update limited fields (status workflow)
    const allowedFieldsDependent = ['status', 'paymentStatus', 'notes'];
    // Independent locations can update more fields but not change ownership
    const protectedFields = ['id', 'businessId', 'soldByScope', 'soldByLocationId', 'createdAt'];

    let updates = {};

    if (location.operatingMode === LOCATION_MODES.DEPENDENT) {
      allowedFieldsDependent.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
    } else {
      // INDEPENDENT locations can update more fields, but protected fields are stripped
      updates = { ...req.body };
      protectedFields.forEach(field => delete updates[field]);
    }

    const updated = await repos.orderRepo.update(req.params.orderId, updates);

    res.json(successResponse(updated, 'Order updated successfully'));
  } catch (err) {
    console.error('Error updating location order:', err);
    res.status(500).json(errorResponse('Failed to update order', 'UPDATE_ERROR'));
  }
});

// Get single order for location
app.get('/api/locations/:locationId/orders/:orderId', async (req, res) => {
  // PERMISSION: Require location membership
  if (!requireLocationMembership(req, res, req.params.locationId)) return;

  try {
    const location = await repos.locationRepo.getById(req.params.locationId);
    if (!location) {
      return res.status(404).json(errorResponse('Location not found', 'NOT_FOUND'));
    }

    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderLocationAccess(order, req.params.locationId, location)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    res.json(successResponse(order, 'Order retrieved successfully'));
  } catch (err) {
    console.error('Error fetching location order:', err);
    res.status(500).json(errorResponse('Failed to retrieve order', 'FETCH_ERROR'));
  }
});

// ============================================================================
// STOCK ROUTES (location-level inventory)
// ============================================================================

// Get stock for a location
app.get('/api/locations/:locationId/stock', async (req, res) => {
  try {
    // PERMISSION: Require location membership
    if (!requireLocationMembership(req, res, req.params.locationId)) return;

    const locationId = req.params.locationId;

    const locationStock = await repos.stockRepo.getByLocationId(locationId);

    // Enrich with product data
    const productIds = [...new Set(locationStock.map(s => s.productId))];
    const products = await Promise.all(productIds.map(id => repos.productRepo.getById(id)));
    const productMap = new Map(products.filter(Boolean).map(p => [p.id, p]));

    const enriched = locationStock.map(s => ({
      ...s,
      product: productMap.get(s.productId) || null,
    }));

    res.json(successResponse(enriched));
  } catch (e) {
    console.error('Error fetching location stock:', e);
    res.status(500).json(errorResponse('Failed to load stock'));
  }
});

// Update stock at location
app.patch('/api/locations/:locationId/stock/:productId', async (req, res) => {
  try {
    // PERMISSION: Require location membership
    if (!requireLocationMembership(req, res, req.params.locationId)) return;

    const locationId = req.params.locationId;
    const productId = req.params.productId;
    const qtyOnHand = Number(req.body.qtyOnHand ?? 0);

    const location = await repos.locationRepo.getById(locationId);
    if (!location) {
      return res.status(404).json(errorResponse('Location not found'));
    }

    const locationBusinessId = location.businessId || location.companyId;

    const updated = await repos.stockRepo.upsert(
      locationId,
      productId,
      qtyOnHand,
      locationBusinessId
    );

    res.json(successResponse(updated));
  } catch (e) {
    console.error('Error updating stock:', e);
    res.status(500).json(errorResponse('Failed to update stock'));
  }
});

// Get stock for a business (all locations)
app.get('/api/businesses/:businessId/stock', async (req, res) => {
  try {
    const { businessId } = req.params;

    const businessStock = await repos.stockRepo.getByBusinessId(businessId);

    // Enrich with product + location
    const productIds = [...new Set(businessStock.map(s => s.productId))];
    const locationIds = [...new Set(businessStock.map(s => s.locationId))];

    const [productsResult, locationsResult] = await Promise.all([
      Promise.all(productIds.map(id => repos.productRepo.getById(id))),
      Promise.all(locationIds.map(id => repos.locationRepo.getById(id))),
    ]);

    const productMap = new Map(productsResult.filter(Boolean).map(p => [p.id, p]));
    const locationMap = new Map(locationsResult.filter(Boolean).map(l => [l.id, l]));

    const enriched = businessStock.map(s => ({
      ...s,
      product: productMap.get(s.productId) || null,
      location: locationMap.get(s.locationId) ? { id: s.locationId, name: locationMap.get(s.locationId).name } : null
    }));

    res.json(successResponse(enriched));
  } catch (e) {
    console.error('Error fetching business stock:', e);
    res.status(500).json(errorResponse('Failed to load business stock'));
  }
});

// Delivery Routes
app.get('/api/companies/:companyId/deliveries', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { locationId, status, assignedTo, direction, type, search } = req.query;

    let items = await repos.deliveryRepo.getByBusinessId(companyId);

    if (locationId) items = items.filter(d => d.locationId === locationId);
    if (status && status !== 'all') items = items.filter(d => d.deliveryStatus === status);
    if (direction) items = items.filter(d => d.direction === direction);
    if (type) items = items.filter(d => d.type === type);
    if (assignedTo) items = items.filter(d => (d.assignedTo || '').toLowerCase().includes(String(assignedTo).toLowerCase()));

    if (search) {
      const q = String(search).toLowerCase();
      items = items.filter(d =>
        (d.clientCompanyName || '').toLowerCase().includes(q) ||
        (d.id || '').toLowerCase().includes(q) ||
        (d.clientAddress || '').toLowerCase().includes(q)
      );
    }

    // Sort by orderTime (newest first)
    items.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));

    res.json(successResponse(items));
  } catch (e) {
    console.error('Error fetching deliveries:', e);
    res.status(500).json(errorResponse('Failed to load deliveries'));
  }
});

app.post('/api/companies/:companyId/deliveries', async (req, res) => {
  try {
    const { companyId } = req.params;

    const created = await repos.deliveryRepo.create({
      id: uuidv4(),
      businessId: companyId,
      ...req.body,
    });

    res.json(successResponse(created));
  } catch (e) {
    console.error('Error creating delivery:', e);
    res.status(500).json(errorResponse('Failed to create delivery'));
  }
});

// ============================================================================
// INVOICE ROUTES (with scope: PARENT vs LOCATION)
// ============================================================================

// Get all invoices for a business (Parent view)
app.get('/api/businesses/:businessId/invoices', async (req, res) => {
  // PERMISSION: Require business membership
  if (!requireBusinessMembership(req, res, req.params.businessId)) return;

  try {
    let businessInvoices = await repos.invoiceRepo.getByBusinessId(req.params.businessId);

    const { status, issuedByScope, issuedByLocationId, search } = req.query;

    if (status) {
      businessInvoices = businessInvoices.filter(i => i.status === status);
    }

    if (issuedByScope) {
      businessInvoices = businessInvoices.filter(i => i.issuedByScope === issuedByScope);
    }

    if (issuedByLocationId) {
      businessInvoices = businessInvoices.filter(i => i.issuedByLocationId === issuedByLocationId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      businessInvoices = businessInvoices.filter(i => 
        (i.clientName || '').toLowerCase().includes(searchLower) ||
        (i.invoiceNumber || '').toLowerCase().includes(searchLower)
      );
    }

    businessInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(successResponse(businessInvoices, 'Invoices retrieved successfully'));
  } catch (err) {
    console.error('Error fetching business invoices:', err);
    res.status(500).json(errorResponse('Failed to retrieve invoices', 'FETCH_ERROR'));
  }
});

// Create invoice at Parent level
app.post('/api/businesses/:businessId/invoices', async (req, res) => {
  // PERMISSION: Require business membership
  if (!requireBusinessMembership(req, res, req.params.businessId)) return;

  try {
    const business = await repos.businessRepo.getById(req.params.businessId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    }

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canCreateInvoices) {
      return res.status(403).json(errorResponse(
        'Creating invoices requires a paid subscription.',
        'CAPABILITY_REQUIRED'
      ));
    }

    // Get existing invoice count for numbering
    const existingInvoices = await repos.invoiceRepo.getByBusinessId(req.params.businessId);
    const invoiceCount = existingInvoices.length;
    const invoiceNumber = `${business.settings?.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;

    const newInvoice = {
      id: 'inv-' + uuidv4().slice(0, 8),
      businessId: req.params.businessId,
      issuedByScope: INVOICE_SCOPE_FROM_STORE.PARENT,
      issuedByLocationId: null,
      invoiceNumber,
      status: 'draft',
      type: 'invoice',
      ...req.body,
    };

    const created = await repos.invoiceRepo.create(newInvoice);

    res.status(201).json(successResponse(created, 'Invoice created successfully'));
  } catch (err) {
    console.error('Error creating business invoice:', err);
    res.status(500).json(errorResponse('Failed to create invoice', 'CREATE_ERROR'));
  }
});

// Get invoices for a location
app.get('/api/locations/:locationId/invoices', async (req, res) => {
  // PERMISSION: Require location membership
  if (!requireLocationMembership(req, res, req.params.locationId)) return;

  try {
    const location = await repos.locationRepo.getById(req.params.locationId);
    if (!location) {
      return res.status(404).json(errorResponse('Location not found', 'NOT_FOUND'));
    }

    // Get invoices issued by this location (for INDEPENDENT) or linked orders
    let locationInvoices = await repos.invoiceRepo.getByLocationId(req.params.locationId);

    const { status, search } = req.query;

    if (status) {
      locationInvoices = locationInvoices.filter(i => i.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      locationInvoices = locationInvoices.filter(i => 
        (i.clientName || '').toLowerCase().includes(searchLower) ||
        (i.invoiceNumber || '').toLowerCase().includes(searchLower)
      );
    }

    locationInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(successResponse(locationInvoices, 'Location invoices retrieved successfully'));
  } catch (err) {
    console.error('Error fetching location invoices:', err);
    res.status(500).json(errorResponse('Failed to retrieve invoices', 'FETCH_ERROR'));
  }
});

// Create invoice at Location level (INDEPENDENT only) - INTERNAL USE
app.post('/api/locations/:locationId/invoices', async (req, res) => {
  // PERMISSION: Require location membership
  if (!requireLocationMembership(req, res, req.params.locationId)) return;

  try {
    const location = await repos.locationRepo.getById(req.params.locationId);
    if (!location) {
      return res.status(404).json(errorResponse('Location not found', 'NOT_FOUND'));
    }

    const businessId = location.businessId || location.companyId;
    const business = await repos.businessRepo.getById(businessId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    }

    const capabilities = deriveCapabilities(business);

    // ENFORCE: Only INDEPENDENT locations can create their own invoices
    if (location.operatingMode !== LOCATION_MODES.INDEPENDENT) {
      return res.status(403).json(errorResponse(
        'Only independent locations can create their own invoices. This location operates in DEPENDENT mode.',
        'LOCATION_MODE_REQUIRED'
      ));
    }

    // ENFORCE: Business must have Enterprise capability for location-scoped invoices
    if (!capabilities.canHaveIndependentLocations) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_REQUIRED',
          message: 'Creating invoices from independent locations requires an Enterprise subscription.'
        }
      });
    }

    if (!capabilities.canCreateInvoices) {
      return res.status(403).json(errorResponse(
        'Creating invoices requires a paid subscription.',
        'CAPABILITY_REQUIRED'
      ));
    }

    // Generate location-specific invoice number
    const locationInvoices = await repos.invoiceRepo.getByLocationId(location.id);
    const prefix = (location.name || 'LOC').substring(0, 3).toUpperCase();
    const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(locationInvoices.length + 1).padStart(3, '0')}`;

    const newInvoice = {
      id: 'inv-' + uuidv4().slice(0, 8),
      businessId,
      issuedByScope: INVOICE_SCOPE_FROM_STORE.LOCATION,
      issuedByLocationId: location.id,
      invoiceNumber,
      status: 'draft',
      type: 'invoice',
      ...req.body,
    };

    const created = await repos.invoiceRepo.create(newInvoice);

    res.status(201).json(successResponse(created, 'Invoice created successfully'));
  } catch (err) {
    console.error('Error creating location invoice:', err);
    res.status(500).json(errorResponse('Failed to create invoice', 'CREATE_ERROR'));
  }
});

// Update invoice
app.patch('/api/invoices/:invoiceId', async (req, res) => {
  try {
    const invoice = await repos.invoiceRepo.getById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json(errorResponse('Invoice not found', 'NOT_FOUND'));
    }

    const updated = await repos.invoiceRepo.update(req.params.invoiceId, req.body);

    res.json(successResponse(updated, 'Invoice updated successfully'));
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json(errorResponse('Failed to update invoice', 'UPDATE_ERROR'));
  }
});

// Legacy Invoice Routes (for backwards compatibility)
app.get('/api/companies/:companyId/invoices', async (req, res) => {
  try {
    let companyInvoices = await repos.invoiceRepo.getByBusinessId(req.params.companyId);

    const { locationId, status, type } = req.query;

    if (locationId) {
      companyInvoices = companyInvoices.filter(i => i.issuedByLocationId === locationId);
    }

    if (status) {
      companyInvoices = companyInvoices.filter(i => i.status === status);
    }

    if (type) {
      companyInvoices = companyInvoices.filter(i => i.type === type);
    }

    res.json(successResponse(companyInvoices));
  } catch (err) {
    console.error('Error fetching company invoices:', err);
    res.status(500).json(errorResponse('Failed to retrieve invoices', 'FETCH_ERROR'));
  }
});

// Get single invoice by ID
app.get('/api/companies/:companyId/invoices/:invoiceId', async (req, res) => {
  try {
    const { companyId, invoiceId } = req.params;
    const invoice = await repos.invoiceRepo.getById(invoiceId);

    if (!invoice) {
      return res.status(404).json(errorResponse('Invoice not found', 'NOT_FOUND'));
    }

    // Verify the invoice belongs to the company
    if (invoice.businessId !== companyId) {
      return res.status(404).json(errorResponse('Invoice not found', 'NOT_FOUND'));
    }

    res.json(successResponse(invoice));
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json(errorResponse('Failed to retrieve invoice', 'FETCH_ERROR'));
  }
});

// Chat Routes
app.get('/api/companies/:companyId/chats', async (req, res) => {
  try {
    const { companyId } = req.params;
    let companyChats = await repos.chatRepo.getByBusinessId(companyId);

    // Apply filters
    const { locationId, type, search } = req.query;

    if (locationId) {
      companyChats = companyChats.filter(c => c.locationId === locationId || c.locationId === null);
    }

    if (type) {
      companyChats = companyChats.filter(c => c.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      companyChats = companyChats.filter(c => 
        (c.name || '').toLowerCase().includes(searchLower) ||
        (c.lastMessage && (c.lastMessage.content || '').toLowerCase().includes(searchLower))
      );
    }

    // Sort by updatedAt (most recent first)
    companyChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(successResponse(companyChats));
  } catch (e) {
    console.error('Error fetching chats:', e);
    res.status(500).json(errorResponse('Failed to load chats'));
  }
});

// Get messages for a specific chat
app.get('/api/companies/:companyId/chats/:chatId/messages', async (req, res) => {
  try {
    const { companyId, chatId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const cursor = req.query.cursor;

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || (chat.businessId !== companyId && chat.companyId !== companyId)) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    let chatMessages = await repos.chatRepo.getMessages(chatId);

    // Sort by timestamp (newest first for inverted list)
    chatMessages = [...chatMessages].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Apply cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const idx = chatMessages.findIndex(m => m.id === cursor);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }

    const page = chatMessages.slice(startIndex, startIndex + limit);
    const nextCursor = page.length ? page[page.length - 1].id : null;
    const hasMore = (startIndex + limit) < chatMessages.length;

    res.json({
      success: true,
      data: page,
      nextCursor: hasMore ? nextCursor : null,
      message: 'Success'
    });
  } catch (e) {
    console.error('Error fetching messages:', e);
    res.status(500).json(errorResponse('Failed to load messages'));
  }
});

// Mark chat as read
app.post('/api/companies/:companyId/chats/:chatId/read', async (req, res) => {
  try {
    const { companyId, chatId } = req.params;

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || (chat.businessId !== companyId && chat.companyId !== companyId)) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    const updatedChat = await repos.chatRepo.update(chatId, {
      unreadCount: 0,
      lastMessage: chat.lastMessage ? { ...chat.lastMessage, isRead: true } : null
    });

    res.json(successResponse(updatedChat));
  } catch (e) {
    console.error('Error marking chat as read:', e);
    res.status(500).json(errorResponse('Failed to mark chat as read'));
  }
});

// Send message to chat
app.post('/api/companies/:companyId/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId, companyId } = req.params;
    const { type, content, replyToId, attachmentUrl, metadata } = req.body;

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || (chat.businessId !== companyId && chat.companyId !== companyId)) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Create message based on type
    const newMessage = {
      id: `msg-${Date.now()}`,
      chatId,
      type: type || 'text',
      isOutgoing: true,
      sender: { id: 'user-1', name: 'You', avatar: '', role: 'business' },
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    // Add type-specific fields
    if (type === 'text') {
      newMessage.text = content;
    } else if (type === 'pdf') {
      newMessage.fileName = content;
      newMessage.fileUrl = attachmentUrl;
    } else if (type === 'image') {
      newMessage.imageUrl = attachmentUrl || content;
    }

    // Add reply context if replying (for Prisma mode, we'd need to fetch from repo)
    if (replyToId) {
      const chatMsgs = await repos.chatRepo.getMessages(chatId);
      const replyTo = chatMsgs.find(m => m.id === replyToId);
      if (replyTo) {
        newMessage.replyingTo = {
          senderName: replyTo.sender?.name || replyTo.senderName,
          messageSnippet: replyTo.text || replyTo.content || replyTo.fileName || replyTo.event || '[Media]',
          messageId: replyTo.id
        };
      }
    }

    const created = await repos.chatRepo.addMessage(chatId, newMessage);

    // Update chat's last message is handled by chatRepo.addMessage
    res.json(successResponse(created));
  } catch (e) {
    console.error('Error sending message:', e);
    res.status(500).json(errorResponse('Failed to send message'));
  }
});


// ============================================================================
// MEMBERSHIP ROUTES
// ============================================================================

// Get business members
app.get('/api/businesses/:businessId/members', (req, res) => {
  const members = businessMembers.filter(m => m.businessId === req.params.businessId);
  
  // Enrich with user data
  const enrichedMembers = members.map(m => {
    const user = users.find(u => u.id === m.userId);
    return {
      ...m,
      user: user ? { id: user.id, name: user.name, email: user.email, avatar: user.avatar } : null
    };
  });
  
  res.json(successResponse(enrichedMembers));
});

// Get location members
app.get('/api/locations/:locationId/members', (req, res) => {
  const members = locationMembers.filter(m => m.locationId === req.params.locationId);
  
  const enrichedMembers = members.map(m => {
    const user = users.find(u => u.id === m.userId);
    return {
      ...m,
      user: user ? { id: user.id, name: user.name, email: user.email, avatar: user.avatar } : null
    };
  });
  
  res.json(successResponse(enrichedMembers));
});

// Get user's business memberships
app.get('/api/users/:userId/businesses', (req, res) => {
  const userBusinessMembers = businessMembers.filter(m => 
    m.userId === req.params.userId && m.status === MEMBER_STATUS.ACCEPTED
  );
  
  const businessesWithRole = userBusinessMembers.map(m => {
    const business = companies.find(c => c.id === m.businessId);
    return {
      membership: m,
      business: business ? { ...business, capabilities: deriveCapabilities(business) } : null
    };
  }).filter(b => b.business !== null);
  
  res.json(successResponse(businessesWithRole));
});

// Get user's location memberships
app.get('/api/users/:userId/locations', (req, res) => {
  const userLocationMembers = locationMembers.filter(m => 
    m.userId === req.params.userId && m.status === MEMBER_STATUS.ACCEPTED
  );
  
  const locationsWithRole = userLocationMembers.map(m => {
    const location = locations.find(l => l.id === m.locationId);
    const business = location ? companies.find(c => c.id === location.companyId) : null;
    return {
      membership: m,
      location: location || null,
      business: business ? { id: business.id, name: business.name } : null
    };
  }).filter(l => l.location !== null);
  
  res.json(successResponse(locationsWithRole));
});

// Legacy User Management Routes
app.get('/api/companies/:companyId/users', (req, res) => {
  // Get users who are members of this company
  const memberUserIds = businessMembers
    .filter(m => m.businessId === req.params.companyId && m.status === MEMBER_STATUS.ACCEPTED)
    .map(m => m.userId);
  
  const companyUsers = users.filter(u => memberUserIds.includes(u.id));
  res.json(successResponse(companyUsers));
});

// File Upload Route
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (req.file) {
    // Use request host for dynamic URL (works with LAN IP)
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.json(successResponse({ url: fileUrl }));
  } else {
    res.status(400).json(errorResponse('No file uploaded'));
  }
});

// Feed Routes (paginated)
app.get('/api/feed', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
  const cursor = req.query.cursor; // post id of the last item (optional)

  let startIndex = 0;
  if (cursor) {
    const idx = feedPosts.findIndex(p => p.id === cursor);
    startIndex = idx >= 0 ? idx + 1 : 0;
  }

  const page = feedPosts.slice(startIndex, startIndex + limit);
  const nextCursor = page.length ? page[page.length - 1].id : null;
  const hasMore = (startIndex + limit) < feedPosts.length;

  res.json({
    success: true,
    data: page,
    nextCursor: hasMore ? nextCursor : null,
    message: 'Success'
  });
});

// Get single product by ID (public view)
app.get('/api/products/:productId', (req, res) => {
  const { productId } = req.params;
  
  // First check in products array
  const product = products.find(p => p.id === productId);
  if (product) {
    return res.json(successResponse(product));
  }
  
  // Then check in feed posts (products from feed)
  for (const post of feedPosts) {
    if (post.type === 'brand_presentation' && post.data.products) {
      const feedProduct = post.data.products.find(p => p.id === productId);
      if (feedProduct) {
        return res.json(successResponse({
          ...feedProduct,
          brandName: post.data.brandName,
          brandLogo: post.data.brandLogo,
          distributorName: post.data.distributorName,
          distributorId: post.data.distributorId,
        }));
      }
    }
    if (post.type === 'new_products' && post.data.products) {
      const feedProduct = post.data.products.find(p => p.id === productId);
      if (feedProduct) {
        return res.json(successResponse({
          ...feedProduct,
          businessName: post.data.businessName,
          businessLogo: post.data.businessLogo,
          businessId: post.data.businessId,
        }));
      }
    }
  }
  
  res.status(404).json(errorResponse('Product not found'));
});

// ============================================================================
// PUBLIC STOREFRONT ENDPOINTS (for customer-facing orders)
// ============================================================================
//
// These endpoints are for external customers ordering from public storefronts.
// Different from internal /api/locations/:id/orders which requires staff auth.
//
// Future implementation will add:
// - Rate limiting
// - CAPTCHA for order submission
// - Different validation rules
// - No x-user-id header (customer identity from order payload)
//

// Get public location storefront (products, info) - no auth required
app.get('/api/public/locations/:locationId', (req, res) => {
  const location = locations.find(l => l.id === req.params.locationId);
  
  if (!location) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  
  const business = companies.find(c => c.id === location.companyId);
  
  // Check effective public status (accounts for subscription tier)
  if (!isLocationPublicEffective(business, location)) {
    // Distinguish between "not public" and "plan required"
    if (location.operatingMode === LOCATION_MODES.INDEPENDENT && location.isPublic) {
      // Location is marked public but Enterprise plan is required
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_REQUIRED',
          message: 'This location\'s public storefront requires an Enterprise subscription.'
        }
      });
    }
    // Location is genuinely not public
    return res.status(404).json(errorResponse('This location does not have a public storefront'));
  }
  
  // Return public info only (no sensitive business data)
  res.json(successResponse({
    id: location.id,
    name: location.name,
    address: location.address,
    phone: location.phone,
    email: location.email,
    business: business ? {
      id: business.id,
      name: business.name,
      logoUrl: business.logoUrl
    } : null
  }));
});

// Get products for public storefront - no auth required
app.get('/api/public/locations/:locationId/products', (req, res) => {
  const location = locations.find(l => l.id === req.params.locationId);
  
  if (!location) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  
  const business = companies.find(c => c.id === location.companyId);
  
  // Check effective public status (accounts for subscription tier)
  if (!isLocationPublicEffective(business, location)) {
    if (location.operatingMode === LOCATION_MODES.INDEPENDENT && location.isPublic) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_REQUIRED',
          message: 'This location\'s public storefront requires an Enterprise subscription.'
        }
      });
    }
    return res.status(404).json(errorResponse('This location does not have a public storefront'));
  }
  
  // Get products from parent business that are listed
  let locationProducts = products.filter(p => 
    p.companyId === location.companyId && p.is_listed === true
  );
  
  // TODO: Apply location-specific price overrides from locationProducts table
  
  res.json(successResponse(locationProducts));
});

// Create order from public storefront - STUB (not yet implemented)
// This is reserved for customer-facing order creation
app.post('/api/public/locations/:locationId/orders', (req, res) => {
  const location = locations.find(l => l.id === req.params.locationId);
  
  if (!location) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  
  const business = companies.find(c => c.id === location.companyId);
  
  // Check effective public status (accounts for subscription tier)
  if (!isLocationPublicEffective(business, location)) {
    if (location.operatingMode === LOCATION_MODES.INDEPENDENT && location.isPublic) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_REQUIRED',
          message: 'This location\'s public storefront requires an Enterprise subscription.'
        }
      });
    }
    return res.status(404).json(errorResponse('This location does not accept public orders'));
  }
  
  // TODO: Implement customer order creation
  // - Validate customer info from req.body (no x-user-id)
  // - Rate limit by IP
  // - CAPTCHA validation
  // - Create order with customerSource: 'PUBLIC_STOREFRONT'
  
  return res.status(501).json(errorResponse(
    'Public order creation is not yet implemented. Use internal endpoints for now.',
    'NOT_IMPLEMENTED'
  ));
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json(successResponse({ status: 'OK', timestamp: new Date().toISOString() }));
});

// Get local network IP for mobile device testing
const getNetworkIP = () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

// Start server
app.listen(PORT, HOST, () => {
  const lanIP = getNetworkIP();
  console.log('');
  console.log('🚀 NouPro Backend Server Started (Locations + Modes MVP)');
  console.log('=========================================================');
  console.log(`📍 Local:   http://localhost:${PORT}`);
  console.log(`📍 Network: http://${lanIP}:${PORT}`);
  console.log('');
  console.log(`🏥 Health:  http://localhost:${PORT}/api/health`);
  console.log(`📊 Data source: ${getDataSource().toUpperCase()}`);
  console.log('   (Set DATA_SOURCE=prisma in .env to use PostgreSQL)');
  console.log('');
  console.log('📱 For physical device testing, use:');
  console.log(`   EXPO_PUBLIC_API_URL=http://${lanIP}:${PORT}/api`);
  console.log('');
  console.log('🏢 Subscription Tiers:');
  console.log('   FREE     - 1 location, DEPENDENT only, no orders/invoices');
  console.log('   PRO      - 3 locations, DEPENDENT only, orders/invoices enabled');
  console.log('   BUSINESS - Unlimited, INDEPENDENT allowed, full features');
  console.log('');
  console.log('📍 Location Modes:');
  console.log('   DEPENDENT   - Fulfills parent orders only');
  console.log('   INDEPENDENT - Own orders, invoices, public page (BUSINESS tier only)');
  console.log('');
  console.log('Available endpoints:');
  console.log('');
  console.log('  Auth:');
  console.log('    POST /api/auth/login');
  console.log('');
  console.log('  Business (with capabilities):');
  console.log('    GET  /api/businesses');
  console.log('    GET  /api/businesses/:businessId');
  console.log('    PATCH /api/businesses/:businessId');
  console.log('');
  console.log('  Locations (with mode enforcement):');
  console.log('    GET  /api/businesses/:businessId/locations');
  console.log('    POST /api/businesses/:businessId/locations');
  console.log('    GET  /api/locations/:locationId');
  console.log('    PATCH /api/locations/:locationId');
  console.log('');
  console.log('  Orders (scope: PARENT vs LOCATION):');
  console.log('    GET  /api/businesses/:businessId/orders');
  console.log('    POST /api/businesses/:businessId/orders (Parent)');
  console.log('    POST /api/businesses/:businessId/orders/:orderId/assign');
  console.log('    GET  /api/locations/:locationId/orders');
  console.log('    POST /api/locations/:locationId/orders (Independent only)');
  console.log('');
  console.log('  Invoices (scope: PARENT vs LOCATION):');
  console.log('    GET  /api/businesses/:businessId/invoices');
  console.log('    POST /api/businesses/:businessId/invoices (Parent)');
  console.log('    GET  /api/locations/:locationId/invoices');
  console.log('    POST /api/locations/:locationId/invoices (Independent only)');
  console.log('');
  console.log('  Stock:');
  console.log('    GET  /api/businesses/:businessId/stock');
  console.log('    GET  /api/locations/:locationId/stock');
  console.log('    PATCH /api/locations/:locationId/stock/:productId');
  console.log('');
  console.log('  Membership:');
  console.log('    GET  /api/businesses/:businessId/members');
  console.log('    GET  /api/locations/:locationId/members');
  console.log('    GET  /api/users/:userId/businesses');
  console.log('    GET  /api/users/:userId/locations');
  console.log('');
  console.log('  Legacy (backwards compatible):');
  console.log('    GET  /api/companies');
  console.log('    GET  /api/companies/:companyId/products');
  console.log('    GET  /api/companies/:companyId/deliveries');
  console.log('    GET  /api/companies/:companyId/invoices');
  console.log('    GET  /api/companies/:companyId/chats');
  console.log('');
  console.log('  Public Storefront (no auth required):');
  console.log('    GET  /api/public/locations/:locationId');
  console.log('    GET  /api/public/locations/:locationId/products');
  console.log('    POST /api/public/locations/:locationId/orders (STUB)');
  console.log('');
  console.log('  Other:');
  console.log('    GET  /api/feed');
  console.log('    POST /api/upload');
  console.log('    GET  /api/health');
}); 