const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const { Server: SocketIOServer } = require('socket.io');

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

// Services
const { orderStatus: orderStatusService, eventMessages } = require('./src/services');

// Authentication middleware
const { requireAuth, optionalAuth, generateToken, verifyToken } = require('./src/middleware/auth');

// Password hashing
const bcrypt = require('bcryptjs');

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
// notificationReads now accessed via repos.notificationReadRepo

// ---------------------------------------------------------------------------
// Cross-entity sync loop guard
// Prevents infinite loops when Order <-> Delivery sync triggers reverse sync.
// Before syncing, add the orderId to the set; after syncing, remove it.
// If the orderId is already in the set, skip the sync.
// ---------------------------------------------------------------------------
const _orderDeliverySyncInProgress = new Set();

// ---------------------------------------------------------------------------
// Delivery Status State Machine
// Defines valid transitions for delivery statuses.
// Terminal states (DELIVERED, CANCELED) have no outgoing transitions.
// ---------------------------------------------------------------------------
const DELIVERY_STATUS_TRANSITIONS = {
  NOT_ASSIGNED: ['ASSIGNED', 'CANCELED'],
  ASSIGNED:     ['PACKED', 'OUT_FOR_DELIVERY', 'NOT_ASSIGNED', 'CANCELED'],
  PACKED:       ['OUT_FOR_DELIVERY', 'CANCELED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  DELIVERED:    [], // terminal
  FAILED:       ['NOT_ASSIGNED', 'CANCELED'],
  CANCELED:     [], // terminal
};

function isValidDeliveryTransition(currentStatus, nextStatus) {
  const allowed = DELIVERY_STATUS_TRANSITIONS[currentStatus];
  if (!allowed) return false; // unknown current status
  return allowed.includes(nextStatus);
}

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Configuration from environment variables with sensible defaults
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for LAN access

// CORS Configuration - whitelist-based for security
const corsRaw = process.env.CORS_ORIGIN || '';
const corsAllowlist = corsRaw.split(',').map(s => s.trim()).filter(Boolean);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // If no allowlist configured, block all cross-origin requests in production
    if (corsAllowlist.length === 0) {
      console.warn('[CORS] No CORS_ORIGIN configured - blocking cross-origin request from:', origin);
      return callback(new Error('CORS_NOT_CONFIGURED'), false);
    }
    
    // Check if origin is in allowlist
    if (corsAllowlist.includes(origin)) {
      return callback(null, true);
    }
    
    // Log and block unknown origins
    console.warn('[CORS] Blocked request from unknown origin:', origin);
    return callback(new Error('CORS_BLOCKED'), false);
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Rate limiter for message-sending endpoints (30 msgs / minute / user)
// Applied after requireAuth, so req.user.id is always available
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: { success: false, message: 'Too many messages, please slow down' },
  validate: { xForwardedForHeader: false },
});

// Rate limiter for chat creation endpoints (10 chats / minute / user)
const chatCreationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: { success: false, message: 'Too many chats created, please slow down' },
  validate: { xForwardedForHeader: false },
});

// Rate limiter for auth endpoints (15 attempts / 15 minutes / IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                    // 15 attempts per window
  message: { success: false, error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// File upload setup with security hardening
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Sanitize filename and add unique prefix
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + sanitized);
  }
});

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5, // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      // Reject file with error
      return cb(new Error('INVALID_FILE_TYPE: Only images (PNG, JPEG, GIF, WebP) and PDFs are allowed'));
    }
    cb(null, true);
  },
});

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
  const isBusiness = tier === SUBSCRIPTION_TIERS.BUSINESS;
  const isPaidTier = tier !== SUBSCRIPTION_TIERS.FREE;
  
  return {
    // Enterprise-only capabilities
    canChooseLocationMode: isEnterprise,
    canHaveIndependentLocations: isEnterprise,
    canEnablePublicLocationPages: isEnterprise,
    canUseAdvancedPermissions: isEnterprise,
    canUseAPI: isEnterprise,
    
    // Business & Enterprise capabilities
    canUseBusinessSpecificPricing: isBusiness || isEnterprise,
    
    // Order capabilities (granular)
    canReceiveOrders: true, // All tiers can receive B2B order requests
    canRequestOrders: true, // All tiers can create purchase order requests
    canCreateSellingOrders: isPaidTier, // Only paid tiers can create selling orders
    
    // Invoice capabilities (granular)
    canCreateInvoiceDraft: true, // All tiers can create drafts
    canSendInvoice: isPaidTier, // Only paid tiers can send invoices
    canExportInvoicePDF: isPaidTier, // Only paid tiers can export PDFs
    canCreateInvoices: isPaidTier, // Full invoice capability (legacy, use granular instead)
    
    // Delivery capabilities
    canCreateDeliveries: isPaidTier,
    canAssignTransport: isPaidTier,
    
    // Staff capabilities
    canInviteStaff: isPaidTier,
    canHaveStaff: isPaidTier,
    
    // Other paid tier capabilities
    canPublishBusinessPage: isPaidTier,
    
    // Analytics
    analyticsType: tier === SUBSCRIPTION_TIERS.FREE ? 'none' :
                   tier === SUBSCRIPTION_TIERS.PRO ? 'none' :
                   tier === SUBSCRIPTION_TIERS.BUSINESS ? 'basic_7day' : 'full',
    
    // Branding
    showNouProBranding: tier === SUBSCRIPTION_TIERS.FREE,
    canRemoveBranding: isPaidTier,
    
    // Tier-based limits
    maxLocations: tier === SUBSCRIPTION_TIERS.FREE ? 1 : 
                  tier === SUBSCRIPTION_TIERS.PRO ? 1 : 
                  tier === SUBSCRIPTION_TIERS.BUSINESS ? 7 : 999,
    maxStaff: tier === SUBSCRIPTION_TIERS.FREE ? 1 : 
              tier === SUBSCRIPTION_TIERS.PRO ? 3 : 
              tier === SUBSCRIPTION_TIERS.BUSINESS ? 9 : 999,
    maxProducts: tier === SUBSCRIPTION_TIERS.FREE ? 20 :
                 tier === SUBSCRIPTION_TIERS.PRO ? 500 :
                 tier === SUBSCRIPTION_TIERS.BUSINESS ? 5000 : 999999,
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
// NAMING CONVENTION
// ============================================================================
// 
// Naming Convention:
//   - API routes and frontend code use `companyId` as the canonical identifier
//   - Prisma schema uses `businessId` internally (column name)
//   - Repository layer maps `businessId` (Prisma) ↔ `companyId` (API) transparently
//   - All API routes use `/api/companies/:companyId/...`
// ============================================================================

// ============================================================================
// PERMISSION MIDDLEWARE HELPERS
// ============================================================================

// Get user from request
// Requires JWT authentication - all routes using this should have requireAuth middleware
function getUserFromRequest(req) {
  // Only use JWT-authenticated user from middleware
  if (req.user?.id) {
    return users.find(u => u.id === req.user.id);
  }
  
  // No fallback - authentication required
  return null;
}

// Check if user is a member of business (any role)
// Uses repos.memberRepo for database-backed checks in Prisma mode
async function isBusinessMember(businessId, userId) {
  const member = await repos.memberRepo.getBusinessMember(businessId, userId);
  return !!(member && member.status === 'accepted');
}

// Middleware to require company membership for chat routes
async function requireCompanyMember(req, res, next) {
  try {
    const { companyId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(errorResponse('Unauthorized'));
    const isMember = await isBusinessMember(companyId, userId);
    if (!isMember) {
      return res.status(403).json(errorResponse('You are not a member of this business'));
    }
    next();
  } catch (err) {
    console.error('Membership check failed:', err);
    return res.status(500).json(errorResponse('Internal server error'));
  }
}

// Check if user is a super admin of business (Prisma-backed)
async function isBusinessSuperAdmin(businessId, userId) {
  const member = await repos.memberRepo.getBusinessMember(businessId, userId);
  return member && member.status === 'accepted' && member.role === 'super_admin';
}

// Check if user is a member of location (or super admin of parent business) (Prisma-backed)
async function isLocationMember(locationId, userId) {
  const directMember = await repos.memberRepo.getLocationMember(locationId, userId).catch(() => null);
  if (directMember && directMember.status === 'accepted') return true;
  
  // Super admins of parent business have access to all locations
  const location = await repos.locationRepo.getById(locationId);
  if (location) {
    const bizId = location.companyId || location.businessId;
    return await isBusinessSuperAdmin(bizId, userId);
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
// STAFF ROLE & ACCESS HELPERS
// ============================================================================

// Valid roles and statuses for staff management
const VALID_BUSINESS_ROLES = new Set(['super_admin', 'admin', 'staff']);
const VALID_MEMBER_STATUSES = new Set(['invited', 'accepted', 'suspended']);

// Finder functions (Prisma-backed)
async function findLocation(companyId, locationId) {
  const location = await repos.locationRepo.getById(locationId);
  if (!location) return null;
  const locBizId = location.companyId || location.businessId;
  if (locBizId !== companyId) return null;
  return location;
}

async function findUser(userId) {
  return repos.userRepo.getById(userId);
}

async function findBusinessMember(companyId, userId) {
  return repos.memberRepo.getBusinessMember(companyId, userId);
}

async function findLocationMember(companyId, locationId, userId) {
  const lm = await repos.memberRepo.getLocationMember(locationId, userId).catch(() => null);
  if (!lm) return null;
  // Verify business ownership via location
  const location = await repos.locationRepo.getById(locationId);
  const locBizId = location?.companyId || location?.businessId;
  if (locBizId !== companyId) return null;
  return lm;
}

async function findUserByEmail(email) {
  if (!email) return null;
  return repos.userRepo.getByEmail(String(email).toLowerCase());
}

// Find business by ID (Prisma-backed)
async function findBusiness(companyId) {
  return repos.businessRepo.getById(companyId);
}

// Get staff count for a business (Prisma-backed)
async function getStaffCount(companyId) {
  const members = await repos.memberRepo.listBusinessMembers(companyId);
  return members.filter(m => m.status !== 'suspended').length;
}

// Validation functions (throw on invalid)
function ensureRole(role) {
  if (!VALID_BUSINESS_ROLES.has(role)) {
    const err = new Error(`Invalid role: ${role}`);
    err.status = 400;
    throw err;
  }
}

function ensureStatus(status) {
  if (!VALID_MEMBER_STATUSES.has(status)) {
    const err = new Error(`Invalid status: ${status}`);
    err.status = 400;
    throw err;
  }
}

// Access control for location-scoped actions (Prisma-backed)
async function hasLocationAccess(companyId, userId, locationId) {
  const bm = await findBusinessMember(companyId, userId);
  if (!bm || bm.status === 'suspended') return false;

  // Super admin has access to all locations
  if (bm.role === 'super_admin') return true;

  // Admin/staff need explicit accepted location assignment
  const lm = await repos.memberRepo.getLocationMember(locationId, userId).catch(() => null);
  if (!lm) return false;
  const status = lm.status ?? 'accepted';
  return status === 'accepted';
}

// Normalize locationIds input (handles string, array, or undefined)
function normalizeLocationIds(locationIds) {
  if (!locationIds) return [];
  if (Array.isArray(locationIds)) return locationIds;
  if (typeof locationIds === 'string') return [locationIds];
  return [];
}

// Simple ID generator for mock store
function nextId(prefix) {
  const rand = Math.random().toString(16).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

// Error wrapper for try/catch handlers
function sendError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || 'Server error' });
}

// Convert member data to staff DTO shape
function toStaffDto({ user, role, status, scope, locationId, locationName, joinedAt }) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    phone: user.phone || null,
    role,
    status: status ?? 'accepted',
    scope,
    locationId: locationId || null,
    locationName: locationName || null,
    joinedAt: joinedAt || null,
  };
}

// Normalize product visibility fields for API responses
function withProductVisibility(product) {
  if (!product) return product;
  const ownerBusinessId = product.ownerBusinessId || product.companyId || product.businessId || product.distributorId;
  return {
    ...product,
    ownerBusinessId,
    isPublic: product.isPublic ?? product.isDisplayable ?? product.is_listed ?? false,
  };
}

// ============================================================================
// MEMBERSHIP ENFORCEMENT MIDDLEWARE
// ============================================================================

// Require user to be a member of the business
async function requireBusinessMembership(req, res, businessId) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json(errorResponse('Authentication required', 'AUTH_REQUIRED'));
    return false;
  }
  const isMember = await isBusinessMember(businessId, user.id);
  if (!isMember) {
    res.status(403).json(errorResponse('You do not have access to this business', 'ACCESS_DENIED'));
    return false;
  }
  return true;
}

// Require user to be admin or super_admin of the business (Prisma-backed)
async function requireBusinessAdmin(req, res, businessId) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json(errorResponse('Authentication required', 'AUTH_REQUIRED'));
    return false;
  }
  
  const bm = await findBusinessMember(businessId, user.id);
  if (!bm || bm.status !== 'accepted') {
    res.status(403).json(errorResponse('You do not have access to this business', 'ACCESS_DENIED'));
    return false;
  }
  
  if (bm.role === 'staff') {
    res.status(403).json(errorResponse('Admin access required. Staff members cannot access this resource.', 'ADMIN_REQUIRED'));
    return false;
  }
  
  return true;
}

// Require user to be a member of the location (or super admin of parent business) (Prisma-backed)
async function requireLocationMembership(req, res, locationId) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json(errorResponse('Authentication required', 'AUTH_REQUIRED'));
    return false;
  }
  if (!(await isLocationMember(locationId, user.id))) {
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
// NOTE: ORDER_STATUS is imported from memoryStore as ORDER_STATUS_FROM_STORE
// which aligns with the Prisma enum and orderStatus service.
// Valid statuses: NEW, ACCEPTED, ONGOING, PENDING, IN_REVIEW, DONE, CANCELED, REJECTED

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
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  SUSPENDED: 'suspended'
};

const VALID_MESSAGE_TYPES = new Set([
  'text', 'image', 'pdf', 'location', 'voice',
  'video_call', 'invoice', 'estimate', 'delivery', 'event'
]);

const MAX_MESSAGE_LENGTH = 10000; // 10k characters

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
    deliveryStatus: 'NOT_ASSIGNED',
    paymentStatus: 'UNPAID',
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
    deliveryStatus: 'OUT_FOR_DELIVERY',
    paymentStatus: 'PAID',
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
    deliveryStatus: 'DELIVERED',
    paymentStatus: 'PAID',
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
    deliveryStatus: 'ASSIGNED',
    paymentStatus: 'UNPAID',
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
    deliveryStatus: 'ASSIGNED',
    paymentStatus: 'PAID',
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
    deliveryStatus: 'NOT_ASSIGNED',
    paymentStatus: 'PENDING_CONFIRMATION',
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
    status: 'SENT',
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
    status: 'PAID',
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
    status: 'PAID',
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
      paymentStatus: 'UNPAID',
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

const errorResponse = (message, code = 'ERROR') => ({
  success: false,
  error: { code, message },
  message,
});

// Helper to format timestamp to relative time (e.g., "5 min ago")
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  // Format as date for older items
  return time.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

// ============================================================================
// SOCKET.IO - Real-time messaging
// ============================================================================

io.use((socket, next) => {
  const { userId, token } = socket.handshake.auth;
  if (!userId) return next(new Error('userId required'));
  if (!token) return next(new Error('token required'));

  // Verify JWT token
  const result = verifyToken(`Bearer ${token}`);
  if (result.error) {
    console.warn(`[Socket] Auth failed for userId=${userId}: ${result.error}`);
    return next(new Error('Invalid token'));
  }
  if (result.user.id !== userId) {
    return next(new Error('userId mismatch'));
  }

  socket.userId = userId;
  next();
});

io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.userId}`);

  // Auto-join user-level room so we can send events (chat_created, etc.) to a user
  // regardless of which chat rooms they're currently in
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }

  socket.on('join_chat', async (chatId) => {
    try {
      const chat = await repos.chatRepo.getById(chatId);
      if (!chat) return;

      // Check membership: either a direct participant or a company member
      const isParticipant = Array.isArray(chat.participants) && chat.participants.includes(socket.userId);
      let isCompanyMember = false;
      if (!isParticipant && chat.companyId) {
        const member = await findBusinessMember(chat.companyId, socket.userId);
        isCompanyMember = !!member;
      }

      if (!isParticipant && !isCompanyMember) {
        console.warn(`[Socket] ${socket.userId} denied join to chat:${chatId} (not a member)`);
        return;
      }

      socket.join(`chat:${chatId}`);
      console.log(`[Socket] ${socket.userId} joined chat:${chatId}`);
    } catch (err) {
      console.error(`[Socket] Error in join_chat:`, err);
    }
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat:${chatId}`);
    console.log(`[Socket] ${socket.userId} left chat:${chatId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.userId}`);
  });
});

// Auth Routes
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json(errorResponse('Email and password are required'));
    }
    
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Login] Received:', { email, passwordLength: password?.length });
    }
    
    // Look up user from database
    const dbUser = await repos.userRepo.getByEmail(email);
    if (!dbUser) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Login] User not found:', email);
      }
      return res.status(401).json(errorResponse('Invalid credentials'));
    }
    
    // Verify password
    if (!dbUser.passwordHash) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Login] No password hash set for:', email);
      }
      return res.status(401).json(errorResponse('Invalid credentials'));
    }
    const passwordValid = await bcrypt.compare(password, dbUser.passwordHash);
    
    if (!passwordValid) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Login] Invalid password for:', email);
      }
      return res.status(401).json(errorResponse('Invalid credentials'));
    }
    
    // Get user's businesses (still using in-memory for now)
    const userMemberships = businessMembers.filter(m => 
      m.userId === dbUser.id && m.status === 'accepted'
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
    }).filter(ub => ub.business);
    
    // Generate real JWT tokens
    const token = generateToken({ 
      sub: dbUser.id, 
      email: dbUser.email,
      name: dbUser.name 
    });
    const refreshToken = generateToken({ 
      sub: dbUser.id, 
      type: 'refresh' 
    }, { expiresIn: '30d' });
    
    // Update lastLoginAt
    await repos.userRepo.update(dbUser.id, { lastLoginAt: new Date() }).catch(err => {
      console.warn('[Login] Failed to update lastLoginAt:', err.message);
    });
    
    // Build user response (exclude passwordHash, match register shape)
    const nameParts = (dbUser.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const userResponse = {
      id: dbUser.id,
      firstName,
      lastName,
      name: dbUser.name,
      phone: dbUser.phone,
      email: dbUser.email,
      avatar: dbUser.avatar,
      profilePicture: dbUser.avatar,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Login] Generated JWT for user:', dbUser.id);
    }
    
    res.json(successResponse({
      user: userResponse,
      token,
      refreshToken,
      businesses: userBusinesses
    }));
  } catch (err) {
    console.error('[Login] Error:', err);
    res.status(500).json(errorResponse('Login failed. Please try again.'));
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json(successResponse(null, 'Logged out successfully'));
});

// Refresh access token (no rate limiter -- already protected by requiring a valid refresh token)
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json(errorResponse('Refresh token is required'));
    }
    
    // Verify the refresh token
    const result = verifyToken(`Bearer ${refreshToken}`);
    if (result.error) {
      return res.status(401).json(errorResponse('Invalid or expired refresh token'));
    }
    
    // Check that this is actually a refresh token
    if (result.user.claims.type !== 'refresh') {
      return res.status(401).json(errorResponse('Invalid token type'));
    }
    
    // Look up the user to make sure they still exist
    const dbUser = await repos.userRepo.getById(result.user.id);
    if (!dbUser) {
      return res.status(401).json(errorResponse('User no longer exists'));
    }
    
    // Generate a new access token
    const newToken = generateToken({ 
      sub: dbUser.id, 
      email: dbUser.email,
      name: dbUser.name 
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Refresh] Generated new token for user:', dbUser.id);
    }
    
    res.json(successResponse({
      token: newToken,
      refreshToken, // Return the same refresh token (still valid)
    }));
  } catch (err) {
    console.error('[Refresh] Error:', err);
    res.status(500).json(errorResponse('Token refresh failed'));
  }
});

// Register new user
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { firstName, lastName, phone, countryCode, email, password, profilePicture } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json(errorResponse('Missing required fields: firstName, lastName, phone, password'));
    }
    
    // Validate password strength
    const passwordErrors = [];
    if (password.length < 8) passwordErrors.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) passwordErrors.push('one uppercase letter');
    if (!/[a-z]/.test(password)) passwordErrors.push('one lowercase letter');
    if (!/\d/.test(password)) passwordErrors.push('one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) passwordErrors.push('one special character');
    if (passwordErrors.length > 0) {
      return res.status(400).json(errorResponse(`Password must contain: ${passwordErrors.join(', ')}`));
    }
    
    // Build the full phone number
    const fullPhone = `${countryCode || '+230'}${phone}`;
    
    // Check if user already exists (by phone or email) in the database
    const existingByPhone = await repos.userRepo.getByPhone(fullPhone);
    if (existingByPhone) {
      return res.status(409).json(errorResponse('A user with this phone number already exists'));
    }
    if (email) {
      const existingByEmail = await repos.userRepo.getByEmail(email);
      if (existingByEmail) {
        return res.status(409).json(errorResponse('A user with this email already exists'));
      }
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user in database via Prisma
    const userId = uuidv4();
    const dbUser = await repos.userRepo.create({
      id: userId,
      name: `${firstName} ${lastName}`,
      email: email || null,
      phone: fullPhone,
      avatar: profilePicture || null,
      passwordHash,
    });
    
    // Build user response object (exclude passwordHash)
    const newUser = {
      id: dbUser.id,
      firstName,
      lastName,
      name: dbUser.name,
      phone: dbUser.phone,
      email: dbUser.email,
      avatar: dbUser.avatar,
      profilePicture: dbUser.avatar,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
    
    // Also push to in-memory users array (for non-migrated routes)
    users.push(newUser);
    
    // Generate real JWT tokens
    const token = generateToken({ 
      sub: dbUser.id, 
      email: dbUser.email,
      name: dbUser.name 
    });
    const refreshToken = generateToken({ 
      sub: dbUser.id, 
      type: 'refresh' 
    }, { expiresIn: '30d' });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Register] Created user:', dbUser.id, dbUser.email);
    }
    
    res.status(201).json(successResponse({
      user: newUser,
      token,
      refreshToken,
      businesses: [] // New user has no businesses yet
    }, 'Account created successfully'));
  } catch (err) {
    console.error('[Register] Error:', err);
    res.status(500).json(errorResponse('Failed to create account. Please try again.'));
  }
});

// Change password (requires authentication)
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json(errorResponse('Current password and new password are required'));
    }
    
    // Validate new password strength (same rules as register)
    const passwordErrors = [];
    if (newPassword.length < 8) passwordErrors.push('at least 8 characters');
    if (!/[A-Z]/.test(newPassword)) passwordErrors.push('one uppercase letter');
    if (!/[a-z]/.test(newPassword)) passwordErrors.push('one lowercase letter');
    if (!/\d/.test(newPassword)) passwordErrors.push('one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) passwordErrors.push('one special character');
    if (passwordErrors.length > 0) {
      return res.status(400).json(errorResponse(`New password must contain: ${passwordErrors.join(', ')}`));
    }
    
    // Look up user from database
    const dbUser = await repos.userRepo.getById(req.user.id);
    if (!dbUser) {
      return res.status(404).json(errorResponse('User not found'));
    }
    
    // Verify current password
    if (!dbUser.passwordHash) {
      return res.status(400).json(errorResponse('Password not set for this account'));
    }
    
    const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isCurrentValid) {
      return res.status(401).json(errorResponse('Current password is incorrect'));
    }
    
    // Ensure new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, dbUser.passwordHash);
    if (isSamePassword) {
      return res.status(400).json(errorResponse('New password must be different from current password'));
    }
    
    // Hash and store new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await repos.userRepo.update(dbUser.id, { passwordHash: newPasswordHash });
    
    console.log('[ChangePassword] Password updated for user:', dbUser.id);
    
    res.json(successResponse({ message: 'Password changed successfully' }, 'Password changed successfully'));
  } catch (err) {
    console.error('[ChangePassword] Error:', err);
    res.status(500).json(errorResponse('Failed to change password. Please try again.'));
  }
});

// Update current user profile (requires authentication)
app.patch('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { avatar, name } = req.body;
    
    // Build update payload with only allowed fields
    const updateData = {};
    if (avatar !== undefined) updateData.avatar = avatar;
    if (name !== undefined) updateData.name = name;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(errorResponse('No fields to update'));
    }
    
    const updatedUser = await repos.userRepo.update(req.user.id, updateData);
    
    console.log('[UpdateProfile] Updated user:', req.user.id, Object.keys(updateData));
    
    res.json(successResponse(updatedUser, 'Profile updated successfully'));
  } catch (err) {
    console.error('[UpdateProfile] Error:', err);
    res.status(500).json(errorResponse('Failed to update profile'));
  }
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('Not authenticated'));
  }
  
  // Verify JWT and extract user ID
  const result = verifyToken(authHeader);
  if (result.error) {
    return res.status(401).json(errorResponse(result.error));
  }
  
  // Find user by ID from token
  const user = users.find(u => u.id === result.user.id);
  if (!user) {
    return res.status(404).json(errorResponse('User not found'));
  }
  
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
  }).filter(ub => ub.business);
  
  res.json(successResponse({ user, businesses: userBusinesses }));
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
app.get('/api/companies/:companyId', async (req, res) => {
  const business = await repos.businessRepo.getById(req.params.companyId);
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
app.patch('/api/companies/:companyId', requireAuth, async (req, res) => {
  const existing = await repos.businessRepo.getById(req.params.companyId);
  if (!existing) {
    return res.status(404).json(errorResponse('Business not found'));
  }
  
  // Don't allow changing subscription tier via this endpoint
  const { subscriptionTier, ...allowedUpdates } = req.body;
  
  const updated = await repos.businessRepo.update(req.params.companyId, allowedUpdates);
  
  res.json(successResponse({
    ...updated,
    capabilities: deriveCapabilities(updated),
  }));
});

// Update business subscription
app.patch('/api/companies/:companyId/subscription', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  const existing = await repos.businessRepo.getById(req.params.companyId);
  if (!existing) {
    return res.status(404).json(errorResponse('Business not found'));
  }

  const { subscriptionTier, billingPeriod } = req.body;
  
  // Validate inputs
  const validTiers = ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'];
  const validPeriods = ['MONTHLY', 'YEARLY'];
  
  if (subscriptionTier && !validTiers.includes(subscriptionTier)) {
    return res.status(400).json(errorResponse('Invalid subscription tier'));
  }
  
  if (billingPeriod && !validPeriods.includes(billingPeriod)) {
    return res.status(400).json(errorResponse('Invalid billing period'));
  }
  
  // Calculate period end (simple: +30 days for monthly, +365 for yearly)
  let currentPeriodEnd = null;
  if (billingPeriod) {
    const days = billingPeriod === 'MONTHLY' ? 30 : 365;
    currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  
  // Update business
  const updateData = {};
  if (subscriptionTier) updateData.subscriptionTier = subscriptionTier;
  if (billingPeriod) updateData.billingPeriod = billingPeriod;
  if (currentPeriodEnd) updateData.currentPeriodEnd = currentPeriodEnd;
  
  const updated = await repos.businessRepo.updateSubscription(
    req.params.companyId,
    updateData
  );
  
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

// PUT /api/companies/:id -- legacy route used by businessStore
app.put('/api/companies/:id', requireAuth, async (req, res) => {
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
app.get('/api/companies/:companyId/locations', async (req, res) => {
  const business = await repos.businessRepo.getById(req.params.companyId);
  const businessLocations = await repos.locationRepo.getByBusinessId(req.params.companyId);

  const enrichedLocations = businessLocations.map(location => {
    const publicEffective = business ? isLocationPublicEffective(business, location) : false;
    const publicDisabledReason = business ? getPublicDisabledReason(business, location) : null;
    return { ...location, publicEffective, publicDisabledReason };
  });
  
  res.json(successResponse(enrichedLocations));
});

// Create location with mode enforcement
app.post('/api/companies/:companyId/locations', requireAuth, async (req, res) => {
  const business = await repos.businessRepo.getById(req.params.companyId);
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
  const currentLocations = await repos.locationRepo.getByBusinessId(req.params.companyId);
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
  
  const created = await repos.locationRepo.create(req.params.companyId, newLocationPayload);
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
app.patch('/api/locations/:locationId', requireAuth, async (req, res) => {
  const location = await repos.locationRepo.getById(req.params.locationId);
  if (!location) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  
  const businessId = location.businessId || location.companyId;
  
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, businessId))) return;
  
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
app.delete('/api/locations/:locationId', requireAuth, async (req, res) => {
  const ok = await repos.locationRepo.delete(req.params.locationId);
  if (!ok) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  res.json(successResponse(null, 'Location deleted successfully'));
});

app.put('/api/companies/:companyId/locations/:locationId', requireAuth, async (req, res) => {
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

app.delete('/api/companies/:companyId/locations/:locationId', requireAuth, async (req, res) => {
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

    // Enrich products with aggregated stock data
    const enrichedProducts = await Promise.all(
      companyProducts.map(async (product) => {
        try {
          const stocks = await repos.stockRepo.getByProductId(product.id);
          const totalStock = stocks.reduce((sum, s) => sum + (s.qtyOnHand || 0), 0);
          return { ...product, stockQuantity: totalStock, locationStocks: stocks };
        } catch {
          return product;
        }
      })
    );
    
    res.json(successResponse(enrichedProducts));
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

// Create a new product
app.post('/api/companies/:companyId/products', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const productData = req.body;

    // Get business and check product limit
    const business = await repos.businessRepo.getById(companyId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found'));
    }

    const capabilities = deriveCapabilities(business);
    const currentProducts = await repos.productRepo.getByBusinessId(companyId);
    const currentProductCount = currentProducts.length;

    if (currentProductCount >= capabilities.maxProducts) {
      return res.status(403).json(errorResponse(
        `Product limit reached (${capabilities.maxProducts}). Upgrade your plan to add more products.`
      ));
    }

    // Create the product
    const newProduct = await repos.productRepo.create({
      ...productData,
      businessId: companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.status(201).json(successResponse(newProduct));
  } catch (e) {
    console.error('Error creating product:', e);
    res.status(500).json(errorResponse('Failed to create product'));
  }
});

// Update a product
app.patch('/api/companies/:companyId/products/:productId', requireAuth, async (req, res) => {
  try {
    const { companyId, productId } = req.params;
    const patch = req.body;

    const product = await repos.productRepo.getById(productId);
    if (!product) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    // Safety check: ensure product belongs to the business
    const productBusinessId = product.businessId || product.companyId;
    if (productBusinessId !== companyId) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    const updatedProduct = await repos.productRepo.update(productId, {
      ...patch,
      updatedAt: new Date(),
    });

    res.json(successResponse(updatedProduct));
  } catch (e) {
    console.error('Error updating product:', e);
    res.status(500).json(errorResponse('Failed to update product'));
  }
});

// Delete a product
app.delete('/api/companies/:companyId/products/:productId', requireAuth, async (req, res) => {
  try {
    const { companyId, productId } = req.params;

    const product = await repos.productRepo.getById(productId);
    if (!product) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    // Safety check: ensure product belongs to the business
    const productBusinessId = product.businessId || product.companyId;
    if (productBusinessId !== companyId) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    await repos.productRepo.delete(productId);
    res.json(successResponse(null, 'Product deleted successfully'));
  } catch (e) {
    console.error('Error deleting product:', e);
    res.status(500).json(errorResponse('Failed to delete product'));
  }
});

// ============================================================================
// BRAND ROUTES
// ============================================================================

// List brands for a company
app.get('/api/companies/:companyId/brands', requireAuth, async (req, res) => {
  try {
    const brands = await repos.brandRepo.getByBusinessId(req.params.companyId);
    res.json(successResponse(brands));
  } catch (e) {
    console.error('Error fetching brands:', e);
    res.status(500).json(errorResponse('Failed to fetch brands'));
  }
});

// Create a brand
app.post('/api/companies/:companyId/brands', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, logoUrl, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json(errorResponse('Brand name is required'));
    }

    const newBrand = await repos.brandRepo.create({
      id: 'brand-' + uuidv4().slice(0, 8),
      businessId: companyId,
      name: name.trim(),
      logoUrl: logoUrl || null,
      description: description || null,
    });

    res.status(201).json(successResponse(newBrand));
  } catch (e) {
    // Handle unique constraint violation
    if (e.code === 'P2002') {
      return res.status(409).json(errorResponse('A brand with this name already exists'));
    }
    console.error('Error creating brand:', e);
    res.status(500).json(errorResponse('Failed to create brand'));
  }
});

// Update a brand
app.patch('/api/companies/:companyId/brands/:brandId', requireAuth, async (req, res) => {
  try {
    const { companyId, brandId } = req.params;
    const brand = await repos.brandRepo.getById(brandId);

    if (!brand || brand.businessId !== companyId) {
      return res.status(404).json(errorResponse('Brand not found'));
    }

    const updated = await repos.brandRepo.update(brandId, {
      ...req.body,
      updatedAt: new Date(),
    });

    res.json(successResponse(updated));
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json(errorResponse('A brand with this name already exists'));
    }
    console.error('Error updating brand:', e);
    res.status(500).json(errorResponse('Failed to update brand'));
  }
});

// Delete a brand
app.delete('/api/companies/:companyId/brands/:brandId', requireAuth, async (req, res) => {
  try {
    const { companyId, brandId } = req.params;
    const brand = await repos.brandRepo.getById(brandId);

    if (!brand || brand.businessId !== companyId) {
      return res.status(404).json(errorResponse('Brand not found'));
    }

    await repos.brandRepo.delete(brandId);
    res.json(successResponse(null, 'Brand deleted successfully'));
  } catch (e) {
    console.error('Error deleting brand:', e);
    res.status(500).json(errorResponse('Failed to delete brand'));
  }
});

// ============================================================================
// ORDER ROUTES (with scope: PARENT vs LOCATION)
// ============================================================================

// Get all orders for a business (Parent view)
app.get('/api/companies/:companyId/orders', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    let businessOrders = await repos.orderRepo.getByBusinessId(req.params.companyId);

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

// Get orders placed BY this business to other businesses (buyer's outgoing view)
// Returns orders where buyerBusinessId matches the requesting business
app.get('/api/companies/:companyId/placed-orders', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    // Use the repo method directly - no per-request PrismaClient
    let placedOrders = await repos.orderRepo.getByBuyerBusinessId(req.params.companyId);

    const { status, search } = req.query;
    if (status) placedOrders = placedOrders.filter(o => o.status === status);
    if (search) {
      const s = search.toLowerCase();
      placedOrders = placedOrders.filter(o =>
        (o.customerName || '').toLowerCase().includes(s) ||
        (o.id || '').toLowerCase().includes(s) ||
        (o.buyerBusinessName || '').toLowerCase().includes(s)
      );
    }

    placedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(successResponse(placedOrders, 'Placed orders retrieved successfully'));
  } catch (err) {
    console.error('Error fetching placed orders:', err);
    res.status(500).json(errorResponse('Failed to retrieve placed orders', 'FETCH_ERROR'));
  }
});

// Create order at Parent level (always allowed for paid plans)
app.post('/api/companies/:companyId/orders', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
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

    const { 
      customerName, customerAddress, customerPhone, 
      items, totalAmount, notes, fulfillmentLocationId,
      buyerBusinessId, buyerBusinessName, createdBy
    } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(errorResponse('Items array is required and cannot be empty', 'VALIDATION_ERROR'));
    }
    if (totalAmount === undefined || totalAmount === null || totalAmount < 0) {
      return res.status(400).json(errorResponse('Total amount is required and must be non-negative', 'VALIDATION_ERROR'));
    }
    // Validate each item has required fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId && !item.product_id) {
        return res.status(400).json(errorResponse(`Item at index ${i} is missing productId`, 'VALIDATION_ERROR'));
      }
      if (!item.quantity && item.quantity !== 0) {
        return res.status(400).json(errorResponse(`Item at index ${i} is missing quantity`, 'VALIDATION_ERROR'));
      }
    }

    const isB2B = !!buyerBusinessId;

    const newOrder = {
      id: 'ORD-' + uuidv4().slice(0, 8).toUpperCase(),
      businessId: req.params.companyId,
      soldByScope: ORDER_SCOPE_FROM_STORE.PARENT,
      soldByLocationId: null,
      fulfillmentLocationId: fulfillmentLocationId || null,
      // B2B orders always start as NEW (seller must accept); B2C auto-accept if location assigned
      status: isB2B ? ORDER_STATUS_FROM_STORE.NEW : (fulfillmentLocationId ? ORDER_STATUS_FROM_STORE.ACCEPTED : ORDER_STATUS_FROM_STORE.NEW),
      paymentStatus: 'UNPAID',
      customerId: null,
      customerName: customerName || buyerBusinessName || null,
      customerAddress,
      customerPhone,
      buyerBusinessId: buyerBusinessId || null,
      buyerBusinessName: buyerBusinessName || null,
      createdBy: createdBy || req.user?.id || null,
      items: items || [],
      totalAmount,
      notes: notes || null,
    };

    const created = await repos.orderRepo.create(newOrder);

    // Create event message for the order (non-blocking)
    try {
      await eventMessages.createEventMessage({
        type: 'order_event',
        fromBusinessId: isB2B ? created.buyerBusinessId : created.businessId,
        toBusinessId: isB2B ? created.businessId : null,
        entityId: created.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Staff',
        metadata: { 
          status: created.status, 
          orderNumber: created.id,
          customerName: created.customerName,
          buyerBusinessId: created.buyerBusinessId,
          buyerBusinessName: created.buyerBusinessName,
          totalAmount: created.totalAmount,
          items: created.items,
        }
      });
    } catch (msgErr) {
      console.error('Failed to create order event message:', msgErr);
      // Don't fail the order creation if message creation fails
    }

    res.status(201).json(successResponse(created, 'Order created successfully'));
  } catch (err) {
    console.error('Error creating business order:', err);
    res.status(500).json(errorResponse('Failed to create order', 'CREATE_ERROR'));
  }
});

// Assign order to a location for fulfillment
app.post('/api/companies/:companyId/orders/:orderId/assign', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.companyId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    const { fulfillmentLocationId } = req.body;
    if (!fulfillmentLocationId) {
      return res.status(400).json(errorResponse('fulfillmentLocationId is required'));
    }

    // Verify location belongs to business
    const location = await repos.locationRepo.getById(fulfillmentLocationId);
    const locationBusinessId = location?.businessId || location?.companyId;
    if (!location || locationBusinessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Location not found'));
    }

    // Update fulfillment location first
    await repos.orderRepo.update(req.params.orderId, {
      fulfillmentLocationId: fulfillmentLocationId || null,
    });

    // Use changeOrderStatus for proper transition validation and history tracking
    const updated = await orderStatusService.changeOrderStatus({
      orderId: req.params.orderId,
      nextStatus: 'ACCEPTED',
      reason: null,
      userId: req.user?.id || null,
    });

    // Sync order assignment to linked delivery (with loop guard)
    if (!_orderDeliverySyncInProgress.has(req.params.orderId)) {
      _orderDeliverySyncInProgress.add(req.params.orderId);
      try {
        const linkedDelivery = await repos.deliveryRepo.getByOrderId(req.params.orderId);
        if (linkedDelivery && linkedDelivery.deliveryStatus === 'NOT_ASSIGNED') {
          await repos.deliveryRepo.update(linkedDelivery.id, { deliveryStatus: 'ASSIGNED' });
        }
      } catch (syncErr) {
        console.warn('Failed to sync order assign to delivery:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(req.params.orderId);
      }
    }

    res.json(successResponse(updated, 'Order assigned successfully'));
  } catch (err) {
    console.error('Error assigning order:', err);
    res.status(500).json(errorResponse('Failed to assign order', 'ASSIGN_ERROR'));
  }
});

// Get single order
app.get('/api/companies/:companyId/orders/:orderId', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.companyId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    res.json(successResponse(order, 'Order retrieved successfully'));
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json(errorResponse('Failed to retrieve order', 'FETCH_ERROR'));
  }
});

// Update order (general fields, not status)
app.patch('/api/companies/:companyId/orders/:orderId', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.companyId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    // Block core field edits on terminal-status orders
    const terminalStatuses = ['DONE', 'CANCELED', 'REJECTED'];
    const isTerminal = terminalStatuses.includes(order.status);

    // Fields that can always be updated (even on terminal orders)
    const alwaysAllowedFields = ['notes', 'paymentStatus'];
    // Fields that can only be updated on non-terminal orders
    const editableFields = ['customerName', 'customerAddress', 'customerPhone',
      'totalAmount', 'items', 'fulfillmentLocationId', 'soldByLocationId'];

    const allowedFields = isTerminal ? alwaysAllowedFields : [...alwaysAllowedFields, ...editableFields];

    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    // Warn if client tried to edit blocked fields on a terminal order
    if (isTerminal) {
      const blockedAttempts = editableFields.filter(f => req.body[f] !== undefined);
      if (blockedAttempts.length > 0) {
        return res.status(400).json(errorResponse(
          `Cannot edit ${blockedAttempts.join(', ')} on a ${order.status} order`,
          'TERMINAL_ORDER_EDIT_BLOCKED'
        ));
      }
    }

    const updated = await repos.orderRepo.update(req.params.orderId, updateData);

    // Sync paymentStatus to linked delivery if changed (with loop guard)
    if (updateData.paymentStatus) {
      if (!_orderDeliverySyncInProgress.has(req.params.orderId)) {
        _orderDeliverySyncInProgress.add(req.params.orderId);
        try {
          const linkedDelivery = await repos.deliveryRepo.getByOrderId(req.params.orderId);
          if (linkedDelivery) {
            await repos.deliveryRepo.update(linkedDelivery.id, { paymentStatus: updateData.paymentStatus });
          }
        } catch (syncErr) {
          console.warn('Failed to sync order paymentStatus to delivery:', syncErr.message);
        } finally {
          _orderDeliverySyncInProgress.delete(req.params.orderId);
        }
      }
    }

    res.json(successResponse(updated, 'Order updated successfully'));
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json(errorResponse('Failed to update order', 'UPDATE_ERROR'));
  }
});

// Change order status (with validation and audit)
// This is the preferred endpoint for status changes as it:
// - Validates transition rules (e.g., can't go from DONE to NEW)
// - Requires reason for certain statuses (PENDING, CANCELED, REJECTED)
// - Creates audit history records
app.patch('/api/companies/:companyId/orders/:orderId/status', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.companyId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json(errorResponse('Status is required', 'MISSING_STATUS'));
    }

    // Store previous status for event message
    const previousStatus = order.status;

    // Get user ID from request context (requires JWT auth)
    const userId = req.user?.id || null;

    const updated = await orderStatusService.changeOrderStatus({
      orderId: req.params.orderId,
      nextStatus: status,
      reason,
      userId,
    });

    // Sync terminal/completed order statuses to linked delivery (with loop guard)
    if (['CANCELED', 'REJECTED', 'DONE'].includes(status) && !_orderDeliverySyncInProgress.has(req.params.orderId)) {
      _orderDeliverySyncInProgress.add(req.params.orderId);
      try {
        const linkedDelivery = await repos.deliveryRepo.getByOrderId(req.params.orderId);
        if (linkedDelivery) {
          const deliveryStatus = status === 'DONE' ? 'DELIVERED' : 'CANCELED';
          await repos.deliveryRepo.update(linkedDelivery.id, { deliveryStatus });
        }
      } catch (syncErr) {
        console.warn('Failed to sync order status to delivery:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(req.params.orderId);
      }
    }

    // Create status update event message (non-blocking)
    try {
      await eventMessages.createEventMessage({
        type: 'status_update',
        fromBusinessId: updated.businessId,
        toBusinessId: updated.buyerBusinessId || null,
        entityId: updated.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Staff',
        metadata: { 
          status: status, 
          previousStatus: previousStatus,
          orderNumber: updated.id
        }
      });
    } catch (msgErr) {
      console.error('Failed to create status update message:', msgErr);
      // Don't fail the status update if message creation fails
    }

    res.json(successResponse(updated, 'Order status updated successfully'));
  } catch (err) {
    console.error('Error changing order status:', err);
    
    // Return specific error codes
    if (err.code === 'INVALID_STATUS_TRANSITION') {
      return res.status(400).json(errorResponse(err.message, 'INVALID_TRANSITION'));
    }
    if (err.code === 'STATUS_REASON_REQUIRED') {
      return res.status(400).json(errorResponse(err.message, 'REASON_REQUIRED'));
    }
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json(errorResponse(err.message, 'INVALID_STATUS'));
    }
    
    res.status(500).json(errorResponse('Failed to update order status', 'UPDATE_ERROR'));
  }
});

// Update order delivery status
// PATCH /api/companies/:companyId/orders/:orderId/delivery-status
// Body: { deliveryStatus: string }
// Validates delivery status values and updates the delivery tracking
app.patch('/api/companies/:companyId/orders/:orderId/delivery-status', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.companyId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    const { deliveryStatus } = req.body;
    
    if (!deliveryStatus) {
      return res.status(400).json(errorResponse('Delivery status is required', 'MISSING_DELIVERY_STATUS'));
    }

    // Validate delivery status enum
    const allowedStatuses = new Set([
      'NOT_ASSIGNED',
      'ASSIGNED',
      'PACKED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED',
      'CANCELED',
    ]);

    if (!allowedStatuses.has(deliveryStatus)) {
      return res.status(400).json(errorResponse(
        `Invalid delivery status. Allowed values: ${Array.from(allowedStatuses).join(', ')}`,
        'INVALID_DELIVERY_STATUS'
      ));
    }

    // Update order with new delivery status
    const updated = await repos.orderRepo.update(req.params.orderId, {
      deliveryStatus,
      updatedAt: new Date(),
    });

    // Sync to linked Delivery record (with loop guard)
    if (!_orderDeliverySyncInProgress.has(req.params.orderId)) {
      _orderDeliverySyncInProgress.add(req.params.orderId);
      try {
        const linkedDelivery = await repos.deliveryRepo.getByOrderId(req.params.orderId);
        if (linkedDelivery) {
          await repos.deliveryRepo.update(linkedDelivery.id, { deliveryStatus });
        }
      } catch (syncErr) {
        console.warn('Failed to sync delivery status to delivery record:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(req.params.orderId);
      }
    }

    res.json(successResponse(updated, 'Delivery status updated successfully'));
  } catch (err) {
    console.error('Error updating delivery status:', err);
    res.status(500).json(errorResponse('Failed to update delivery status', 'UPDATE_ERROR'));
  }
});

// Get order status history
app.get('/api/companies/:companyId/orders/:orderId/history', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.companyId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    const history = await orderStatusService.getOrderStatusHistory(req.params.orderId);
    res.json(successResponse(history, 'Order status history retrieved successfully'));
  } catch (err) {
    console.error('Error fetching order status history:', err);
    res.status(500).json(errorResponse('Failed to retrieve status history', 'FETCH_ERROR'));
  }
});

// Get valid next statuses for an order
app.get('/api/companies/:companyId/orders/:orderId/transitions', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const order = await repos.orderRepo.getById(req.params.orderId);
    if (!verifyOrderOwnership(order, req.params.companyId)) {
      return res.status(404).json(errorResponse('Order not found', 'NOT_FOUND'));
    }

    const validTransitions = orderStatusService.getValidNextStatuses(order.status);
    const transitionsWithMeta = validTransitions.map(status => ({
      status,
      ...orderStatusService.getStatusMeta(status),
    }));

    res.json(successResponse({
      currentStatus: order.status,
      currentMeta: orderStatusService.getStatusMeta(order.status),
      isFinal: orderStatusService.isFinalStatus(order.status),
      canEdit: orderStatusService.canEditInStatus(order.status),
      validTransitions: transitionsWithMeta,
    }, 'Valid transitions retrieved successfully'));
  } catch (err) {
    console.error('Error fetching valid transitions:', err);
    res.status(500).json(errorResponse('Failed to retrieve valid transitions', 'FETCH_ERROR'));
  }
});

// Get all order status metadata (SINGLE SOURCE OF TRUTH)
// Frontend should use this to configure UI behavior
app.get('/api/order-status-meta', (req, res) => {
  res.json(successResponse({
    statuses: orderStatusService.ORDER_STATUS,
    meta: orderStatusService.ORDER_STATUS_META,
    transitions: orderStatusService.ALLOWED_TRANSITIONS,
  }, 'Order status metadata retrieved successfully'));
});

// ============================================================================
// LOCATION ORDER ROUTES (Independent locations only)
// ============================================================================

// Get orders for a location (for location staff view)
app.get('/api/locations/:locationId/orders', requireAuth, async (req, res) => {
  // PERMISSION: Require location membership
  if (!(await requireLocationMembership(req, res, req.params.locationId))) return;

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
app.post('/api/locations/:locationId/orders', requireAuth, async (req, res) => {
  // PERMISSION: Require location membership (internal staff creating order)
  if (!(await requireLocationMembership(req, res, req.params.locationId))) return;

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

    const { customerName, customerAddress, customerPhone, items, totalAmount, notes,
            buyerBusinessId, buyerBusinessName, createdBy } = req.body;

    const isB2B = !!buyerBusinessId;

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
      buyerBusinessId: buyerBusinessId || null,
      buyerBusinessName: buyerBusinessName || null,
      createdBy: createdBy || null,
      items: items || [],
      totalAmount,
      status: isB2B ? ORDER_STATUS_FROM_STORE.NEW : ORDER_STATUS_FROM_STORE.ACCEPTED,
      paymentStatus: 'UNPAID',
      notes: notes || null,
    };

    const created = await repos.orderRepo.create(newOrder);

    // Create event message for the order (non-blocking)
    try {
      await eventMessages.createEventMessage({
        type: 'order_event',
        fromBusinessId: isB2B ? created.buyerBusinessId : created.businessId,
        toBusinessId: isB2B ? created.businessId : null,
        entityId: created.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Staff',
        metadata: { 
          status: created.status, 
          orderNumber: created.id,
          customerName: created.customerName,
          locationId: req.params.locationId
        }
      });
    } catch (msgErr) {
      console.error('Failed to create order event message:', msgErr);
      // Don't fail the order creation if message creation fails
    }

    res.status(201).json(successResponse(created, 'Order created successfully'));
  } catch (err) {
    console.error('Error creating location order:', err);
    res.status(500).json(errorResponse('Failed to create order', 'CREATE_ERROR'));
  }
});

// Update order at location level
app.patch('/api/locations/:locationId/orders/:orderId', requireAuth, async (req, res) => {
  // PERMISSION: Require location membership
  if (!(await requireLocationMembership(req, res, req.params.locationId))) return;

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

    // Block core field edits on terminal-status orders
    const terminalStatuses = ['DONE', 'CANCELED', 'REJECTED'];
    const isTerminal = terminalStatuses.includes(order.status);

    if (isTerminal) {
      const coreFields = ['customerName', 'customerAddress', 'customerPhone',
        'items', 'totalAmount', 'fulfillmentLocationId'];
      const blockedAttempts = coreFields.filter(f => req.body[f] !== undefined);
      if (blockedAttempts.length > 0) {
        return res.status(400).json(errorResponse(
          `Cannot edit ${blockedAttempts.join(', ')} on a ${order.status} order`,
          'TERMINAL_ORDER_EDIT_BLOCKED'
        ));
      }
    }

    // Dependent locations can only update limited fields (status workflow)
    const allowedFieldsDependent = ['status', 'paymentStatus', 'notes'];
    // Independent locations can update more fields (explicit whitelist for safety)
    const allowedFieldsIndependent = isTerminal
      ? ['status', 'paymentStatus', 'notes']
      : [
          'status', 'paymentStatus', 'notes', 'customerName',
          'customerAddress', 'customerPhone', 'items', 'totalAmount',
          'fulfillmentLocationId'
        ];

    let updates = {};
    const allowedFields = location.operatingMode === LOCATION_MODES.DEPENDENT
      ? allowedFieldsDependent
      : allowedFieldsIndependent;

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // If status is being changed, route through orderStatusService for
    // proper transition validation, audit history, and cross-entity sync
    let updated;
    if (updates.status) {
      const newStatus = updates.status;
      delete updates.status;

      // Apply non-status field updates first (if any)
      if (Object.keys(updates).length > 0) {
        await repos.orderRepo.update(req.params.orderId, updates);
      }

      // Use orderStatusService for proper validation and history
      updated = await orderStatusService.changeOrderStatus({
        orderId: req.params.orderId,
        nextStatus: newStatus,
        reason: req.body.reason || null,
        userId: req.user?.id || null,
      });

      // Sync terminal order statuses to linked delivery (with loop guard)
      if (['CANCELED', 'REJECTED', 'DONE'].includes(newStatus) && !_orderDeliverySyncInProgress.has(req.params.orderId)) {
        _orderDeliverySyncInProgress.add(req.params.orderId);
        try {
          const linkedDelivery = await repos.deliveryRepo.getByOrderId(req.params.orderId);
          if (linkedDelivery) {
            const deliveryStatus = newStatus === 'DONE' ? 'DELIVERED' : 'CANCELED';
            await repos.deliveryRepo.update(linkedDelivery.id, { deliveryStatus });
          }
        } catch (syncErr) {
          console.warn('Failed to sync location order status to delivery:', syncErr.message);
        } finally {
          _orderDeliverySyncInProgress.delete(req.params.orderId);
        }
      }
    } else {
      updated = await repos.orderRepo.update(req.params.orderId, updates);
    }

    res.json(successResponse(updated, 'Order updated successfully'));
  } catch (err) {
    console.error('Error updating location order:', err);
    res.status(500).json(errorResponse('Failed to update order', 'UPDATE_ERROR'));
  }
});

// Get single order for location
app.get('/api/locations/:locationId/orders/:orderId', requireAuth, async (req, res) => {
  // PERMISSION: Require location membership
  if (!(await requireLocationMembership(req, res, req.params.locationId))) return;

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
    if (!(await requireLocationMembership(req, res, req.params.locationId))) return;

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
app.patch('/api/locations/:locationId/stock/:productId', requireAuth, async (req, res) => {
  try {
    // PERMISSION: Require location membership
    if (!(await requireLocationMembership(req, res, req.params.locationId))) return;

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
app.get('/api/companies/:companyId/stock', async (req, res) => {
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
app.get('/api/companies/:companyId/deliveries', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

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

app.post('/api/companies/:companyId/deliveries', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId } = req.params;

    // Get business to check capabilities
    const business = await repos.businessRepo.getById(companyId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found'));
    }
    
    // Check plan capability
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canCreateDeliveries) {
      return res.status(403).json({
        error: {
          code: 'PAYWALL',
          triggerId: 'create_deliveries',
          requiredPlan: 'pro',
          message: 'Upgrade to Pro to create deliveries'
        }
      });
    }

    const body = req.body;

    // Validate required fields
    if (!body.expectedDeliveryDateTime) {
      return res.status(400).json(errorResponse('expectedDeliveryDateTime is required'));
    }

    // Validate type
    if (body.type && !['delivery', 'transfer'].includes(body.type)) {
      return res.status(400).json(errorResponse('type must be "delivery" or "transfer"'));
    }

    // Validate direction
    if (body.direction && !['outgoing', 'incoming'].includes(body.direction)) {
      return res.status(400).json(errorResponse('direction must be "outgoing" or "incoming"'));
    }

    // For transfers: require fromLocation and toLocation
    if (body.type === 'transfer') {
      if (!body.fromLocation || !body.toLocation) {
        return res.status(400).json(errorResponse('fromLocation and toLocation are required for transfers'));
      }
    }

    // Validate items structure if provided
    if (body.items) {
      if (!Array.isArray(body.items)) {
        return res.status(400).json(errorResponse('items must be an array', 'VALIDATION_ERROR'));
      }
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.name && !item.productName) {
          return res.status(400).json(errorResponse(`Item at index ${i} is missing name`, 'VALIDATION_ERROR'));
        }
      }
    }

    // Auto-set defaults
    const itemCount = body.itemCount || (Array.isArray(body.items) ? body.items.length : 0);
    const totalAmount = body.totalAmount || (Array.isArray(body.items)
      ? body.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
      : 0);

    const created = await repos.deliveryRepo.create({
      id: uuidv4(),
      businessId: companyId,
      type: body.type || 'delivery',
      direction: body.direction || 'outgoing',
      locationId: body.locationId || null,
      clientId: body.clientId || null,
      clientCompanyLogo: body.clientCompanyLogo || null,
      clientCompanyName: body.clientCompanyName || null,
      clientAddress: body.clientAddress || null,
      clientEmail: body.clientEmail || null,
      clientPhone: body.clientPhone || null,
      clientNotes: body.clientNotes || null,
      distributorName: business?.name || null,
      distributorNotes: body.distributorNotes || null,
      fromLocation: body.fromLocation || null,
      toLocation: body.toLocation || null,
      orderTime: body.orderTime || new Date().toISOString(),
      expectedDeliveryDateTime: body.expectedDeliveryDateTime,
      itemCount,
      items: body.items || [],
      totalAmount,
      trackingNumber: body.trackingNumber || null,
      assignedStaffId: body.assignedStaffId || null,
      assignedTo: body.assignedTo || null,
      transportMode: body.transportMode || null,
      deliveryStatus: body.deliveryStatus || 'NOT_ASSIGNED',
      paymentStatus: body.paymentStatus || 'UNPAID',
      orderId: body.orderId || null,
    });

    res.status(201).json(successResponse(created));
  } catch (e) {
    console.error('Error creating delivery:', e);
    res.status(500).json(errorResponse('Failed to create delivery'));
  }
});

// Get single delivery
// GET /api/companies/:companyId/deliveries/:deliveryId
app.get('/api/companies/:companyId/deliveries/:deliveryId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId, deliveryId } = req.params;
    const delivery = await repos.deliveryRepo.getById(deliveryId);
    
    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    res.json(successResponse(delivery));
  } catch (e) {
    console.error('Error fetching delivery:', e);
    res.status(500).json(errorResponse('Failed to load delivery'));
  }
});

// Update delivery
// PATCH /api/companies/:companyId/deliveries/:deliveryId
app.patch('/api/companies/:companyId/deliveries/:deliveryId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId, deliveryId } = req.params;
    const delivery = await repos.deliveryRepo.getById(deliveryId);
    
    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    // Whitelist allowed update fields to prevent overwriting protected fields
    const allowedDeliveryFields = ['deliveryStatus', 'paymentStatus', 'assignedStaffId',
      'assignedTo', 'transportMode', 'distributorNotes', 'clientNotes',
      'trackingNumber', 'expectedDeliveryDateTime', 'items',
      'clientCompanyName', 'clientAddress', 'clientEmail', 'clientPhone'];
    const updateData = {};
    for (const key of allowedDeliveryFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    // Validate delivery status transition if status is being changed
    if (updateData.deliveryStatus && updateData.deliveryStatus !== delivery.deliveryStatus) {
      if (!isValidDeliveryTransition(delivery.deliveryStatus, updateData.deliveryStatus)) {
        return res.status(400).json(errorResponse(
          `Invalid delivery status transition from ${delivery.deliveryStatus} to ${updateData.deliveryStatus}`,
          'INVALID_STATUS_TRANSITION'
        ));
      }
    }

    const updated = await repos.deliveryRepo.update(deliveryId, updateData);

    // Sync delivery changes to linked order (with loop guard)
    if (delivery.orderId && !_orderDeliverySyncInProgress.has(delivery.orderId)) {
      _orderDeliverySyncInProgress.add(delivery.orderId);
      try {
        // Sync deliveryStatus to order
        if (updateData.deliveryStatus) {
          await repos.orderRepo.update(delivery.orderId, { deliveryStatus: updateData.deliveryStatus });
        }

        // If delivery becomes DELIVERED, move order to DONE
        if (updateData.deliveryStatus === 'DELIVERED') {
          try {
            await orderStatusService.changeOrderStatus({
              orderId: delivery.orderId,
              nextStatus: 'DONE',
              changedBy: req.user?.id || null,
              note: 'Auto-completed: delivery marked as delivered',
            });
          } catch (statusErr) {
            console.warn('Failed to auto-complete order on DELIVERED:', statusErr.message);
          }
        }

        // Sync paymentStatus to order if changed
        if (updateData.paymentStatus) {
          await repos.orderRepo.update(delivery.orderId, { paymentStatus: updateData.paymentStatus });
        }
      } catch (syncErr) {
        console.warn('Failed to sync delivery changes to order:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(delivery.orderId);
      }
    }

    res.json(successResponse(updated));
  } catch (e) {
    console.error('Error updating delivery:', e);
    res.status(500).json(errorResponse('Failed to update delivery'));
  }
});

// Delete delivery
// DELETE /api/companies/:companyId/deliveries/:deliveryId
app.delete('/api/companies/:companyId/deliveries/:deliveryId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId, deliveryId } = req.params;
    const delivery = await repos.deliveryRepo.getById(deliveryId);
    
    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    await repos.deliveryRepo.delete(deliveryId);
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    console.error('Error deleting delivery:', e);
    res.status(500).json(errorResponse('Failed to delete delivery'));
  }
});

// Create delivery from an order (order-to-delivery linkage)
// POST /api/companies/:companyId/orders/:orderId/create-delivery
app.post('/api/companies/:companyId/orders/:orderId/create-delivery', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId: businessId, orderId } = req.params;
    const order = await repos.orderRepo.getById(orderId);
    
    if (!order || order.businessId !== businessId) {
      return res.status(404).json(errorResponse('Order not found'));
    }

    // Check if delivery already exists for this order
    const existing = await repos.deliveryRepo.getByOrderId(orderId);
    if (existing) {
      return res.status(409).json(errorResponse('Delivery already exists for this order'));
    }

    // Check plan capability for creating deliveries
    const sellerBusiness = await repos.businessRepo.getById(businessId);
    if (!sellerBusiness) {
      return res.status(404).json(errorResponse('Business not found'));
    }
    const capabilities = deriveCapabilities(sellerBusiness);
    if (!capabilities.canCreateDeliveries) {
      return res.status(403).json({
        error: {
          code: 'PAYWALL',
          triggerId: 'create_deliveries',
          requiredPlan: 'pro',
          message: 'Upgrade to Pro to create deliveries'
        }
      });
    }

    const delivery = await repos.deliveryRepo.create({
      id: uuidv4(),
      businessId,
      orderId,
      type: 'delivery',
      direction: 'outgoing',
      locationId: order.fulfillmentLocationId || order.soldByLocationId || null,
      clientId: order.buyerBusinessId || order.customerId || null,
      clientCompanyName: order.buyerBusinessName || order.customerName || null,
      clientAddress: order.customerAddress || null,
      clientPhone: order.customerPhone || null,
      distributorName: sellerBusiness?.name || null,
      orderTime: new Date().toISOString(),
      expectedDeliveryDateTime: req.body.expectedDeliveryDateTime || null,
      items: order.items || [],
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
      totalAmount: order.totalAmount || 0,
      deliveryStatus: 'NOT_ASSIGNED',
      paymentStatus: order.paymentStatus || 'UNPAID',
    });

    // Sync Order.deliveryStatus to reflect that a delivery now exists (with loop guard)
    if (!_orderDeliverySyncInProgress.has(orderId)) {
      _orderDeliverySyncInProgress.add(orderId);
      try {
        await repos.orderRepo.update(orderId, { deliveryStatus: 'NOT_ASSIGNED' });
      } catch (syncErr) {
        console.warn('Failed to sync order deliveryStatus:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(orderId);
      }
    }

    res.status(201).json(successResponse(delivery));
  } catch (e) {
    console.error('Error creating delivery from order:', e);
    res.status(500).json(errorResponse('Failed to create delivery from order'));
  }
});

// ============================================================================
// INVOICE ROUTES (with scope: PARENT vs LOCATION)
// ============================================================================

// Get all invoices for a business (Parent view)
app.get('/api/companies/:companyId/invoices', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    let businessInvoices = await repos.invoiceRepo.getByBusinessId(req.params.companyId);

    const { status, issuedByScope, issuedByLocationId, search, type, locationId } = req.query;

    if (status) {
      businessInvoices = businessInvoices.filter(i => i.status === status);
    }

    if (issuedByScope) {
      businessInvoices = businessInvoices.filter(i => i.issuedByScope === issuedByScope);
    }

    if (issuedByLocationId) {
      businessInvoices = businessInvoices.filter(i => i.issuedByLocationId === issuedByLocationId);
    }

    // Support frontend's "locationId" param (maps to issuedByLocationId)
    if (locationId && !issuedByLocationId) {
      businessInvoices = businessInvoices.filter(i => i.issuedByLocationId === locationId);
    }

    if (type) {
      businessInvoices = businessInvoices.filter(i => i.type === type);
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

// Get a single invoice by ID (authenticated)
app.get('/api/companies/:companyId/invoices/:invoiceId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const invoice = await repos.invoiceRepo.getById(req.params.invoiceId);
    if (!invoice || invoice.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Invoice not found', 'NOT_FOUND'));
    }
    res.json(successResponse(invoice));
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json(errorResponse('Failed to retrieve invoice', 'FETCH_ERROR'));
  }
});

// Create invoice at Parent level
app.post('/api/companies/:companyId/invoices', requireAuth, async (req, res) => {
  // PERMISSION: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    }

    const capabilities = deriveCapabilities(business);
    
    // Allow all tiers to create invoice drafts
    if (!capabilities.canCreateInvoiceDraft) {
      return res.status(403).json(errorResponse(
        'Cannot create invoices',
        'CAPABILITY_REQUIRED'
      ));
    }
    
    // If trying to create as SENT directly, check canSendInvoice (Pro+ only)
    if (req.body.status === 'SENT' && !capabilities.canSendInvoice) {
      return res.status(403).json(errorResponse(
        { code: 'PAYWALL', triggerId: 'send_invoice', requiredPlan: 'pro' },
        'Upgrade to Pro to send invoices'
      ));
    }

    // ---- Request body validation ----
    const { clientName, items, type, dueDate, clientEmail } = req.body;

    if (!clientName || typeof clientName !== 'string' || !clientName.trim()) {
      return res.status(400).json(errorResponse('clientName is required', 'VALIDATION_ERROR'));
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json(errorResponse('items must be a non-empty array', 'VALIDATION_ERROR'));
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description || typeof item.description !== 'string') {
        return res.status(400).json(errorResponse(`items[${i}].description is required`, 'VALIDATION_ERROR'));
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json(errorResponse(`items[${i}].quantity must be a positive number`, 'VALIDATION_ERROR'));
      }
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        return res.status(400).json(errorResponse(`items[${i}].unitPrice must be a non-negative number`, 'VALIDATION_ERROR'));
      }
    }

    if (type && !['invoice', 'estimate'].includes(type)) {
      return res.status(400).json(errorResponse('type must be "invoice" or "estimate"', 'VALIDATION_ERROR'));
    }

    if (!dueDate || typeof dueDate !== 'string') {
      return res.status(400).json(errorResponse('dueDate is required', 'VALIDATION_ERROR'));
    }

    if (clientEmail && typeof clientEmail === 'string' && clientEmail.trim() && !clientEmail.includes('@')) {
      return res.status(400).json(errorResponse('clientEmail must be a valid email address', 'VALIDATION_ERROR'));
    }

    if (req.body.status && !['DRAFT', 'SENT'].includes(req.body.status)) {
      return res.status(400).json(errorResponse('status must be "DRAFT" or "SENT" when creating', 'VALIDATION_ERROR'));
    }
    // ---- End validation ----

    // Parse date strings to Date objects for DateTime columns
    if (req.body.issueDate && typeof req.body.issueDate === 'string') {
      req.body.issueDate = new Date(req.body.issueDate);
    }
    if (req.body.dueDate && typeof req.body.dueDate === 'string') {
      req.body.dueDate = new Date(req.body.dueDate);
    }

    // Generate invoice number with retry to handle concurrent requests
    // The @@unique([businessId, invoiceNumber]) constraint prevents duplicates
    const MAX_RETRIES = 3;
    let created;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const existingInvoices = await repos.invoiceRepo.getByBusinessId(req.params.companyId);
      const prefix = business.settings?.invoicePrefix || 'INV';
      const maxNum = existingInvoices.reduce((max, inv) => {
        const match = (inv.invoiceNumber || '').match(/-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(maxNum + 1).padStart(3, '0')}`;

      const newInvoice = {
        id: 'inv-' + uuidv4().slice(0, 8),
        businessId: req.params.companyId,
        issuedByScope: INVOICE_SCOPE_FROM_STORE.PARENT,
        issuedByLocationId: null,
        invoiceNumber,
        status: 'DRAFT',
        type: 'invoice',
        ...req.body,
      };

      try {
        created = await repos.invoiceRepo.create(newInvoice);
        break; // Success — exit retry loop
      } catch (createErr) {
        // P2002 = Unique constraint violation (Prisma error code)
        const isUniqueViolation = createErr.code === 'P2002' || (createErr.message && createErr.message.includes('Unique constraint'));
        if (isUniqueViolation && attempt < MAX_RETRIES) {
          console.warn(`[Invoice] Duplicate invoice number "${invoiceNumber}" on attempt ${attempt}, retrying...`);
          continue;
        }
        throw createErr; // Re-throw if not a unique violation or out of retries
      }
    }

    if (!created) {
      return res.status(500).json(errorResponse('Failed to generate unique invoice number after retries', 'CREATE_ERROR'));
    }

    // Create event message if invoice is being sent (not draft)
    if (created.status && created.status !== 'DRAFT') {
      try {
        const messageType = created.type === 'estimate' ? 'estimate' : 'invoice';
        await eventMessages.createEventMessage({
          type: messageType,
          fromBusinessId: created.businessId,
          toBusinessId: null, // B2B invoice messaging requires clientBusinessId field on Invoice model (future enhancement)
          entityId: created.id,
          actorId: req.user?.id,
          actorName: req.user?.name || 'Staff',
          metadata: { 
            amount: created.totalAmount || created.total,
            currency: business.settings?.currency || 'EUR',
            invoiceNumber: created.invoiceNumber,
            clientName: created.clientName,
            invoiceId: created.type === 'invoice' ? created.id : undefined,
            estimateId: created.type === 'estimate' ? created.id : undefined,
          }
        });
      } catch (msgErr) {
        console.error('Failed to create invoice event message:', msgErr);
      }
    }

    res.status(201).json(successResponse(created, 'Invoice created successfully'));
  } catch (err) {
    console.error('Error creating business invoice:', err);
    res.status(500).json(errorResponse('Failed to create invoice', 'CREATE_ERROR'));
  }
});

// Get invoices for a location
app.get('/api/locations/:locationId/invoices', requireAuth, async (req, res) => {
  // PERMISSION: Require location membership
  if (!(await requireLocationMembership(req, res, req.params.locationId))) return;

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
app.post('/api/locations/:locationId/invoices', requireAuth, async (req, res) => {
  // PERMISSION: Require location membership
  if (!(await requireLocationMembership(req, res, req.params.locationId))) return;

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

    // Allow all tiers to create invoice drafts
    if (!capabilities.canCreateInvoiceDraft) {
      return res.status(403).json(errorResponse(
        'Cannot create invoices',
        'CAPABILITY_REQUIRED'
      ));
    }
    
    // If trying to create as SENT directly, check canSendInvoice (Pro+ only)
    if (req.body.status === 'SENT' && !capabilities.canSendInvoice) {
      return res.status(403).json(errorResponse(
        { code: 'PAYWALL', triggerId: 'send_invoice', requiredPlan: 'pro' },
        'Upgrade to Pro to send invoices'
      ));
    }

    // ---- Request body validation (mirrors parent POST route) ----
    const { clientName, items, type: invoiceType, dueDate, clientEmail } = req.body;

    if (!clientName || typeof clientName !== 'string' || !clientName.trim()) {
      return res.status(400).json(errorResponse('clientName is required', 'VALIDATION_ERROR'));
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json(errorResponse('items must be a non-empty array', 'VALIDATION_ERROR'));
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description || typeof item.description !== 'string') {
        return res.status(400).json(errorResponse(`items[${i}].description is required`, 'VALIDATION_ERROR'));
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json(errorResponse(`items[${i}].quantity must be a positive number`, 'VALIDATION_ERROR'));
      }
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        return res.status(400).json(errorResponse(`items[${i}].unitPrice must be a non-negative number`, 'VALIDATION_ERROR'));
      }
    }

    if (invoiceType && !['invoice', 'estimate'].includes(invoiceType)) {
      return res.status(400).json(errorResponse('type must be "invoice" or "estimate"', 'VALIDATION_ERROR'));
    }

    if (!dueDate || typeof dueDate !== 'string') {
      return res.status(400).json(errorResponse('dueDate is required', 'VALIDATION_ERROR'));
    }

    if (clientEmail && typeof clientEmail === 'string' && clientEmail.trim() && !clientEmail.includes('@')) {
      return res.status(400).json(errorResponse('clientEmail must be a valid email address', 'VALIDATION_ERROR'));
    }

    if (req.body.status && !['DRAFT', 'SENT'].includes(req.body.status)) {
      return res.status(400).json(errorResponse('status must be "DRAFT" or "SENT" when creating', 'VALIDATION_ERROR'));
    }
    // ---- End validation ----

    // Parse date strings to Date objects for DateTime columns
    if (req.body.issueDate && typeof req.body.issueDate === 'string') {
      req.body.issueDate = new Date(req.body.issueDate);
    }
    if (req.body.dueDate && typeof req.body.dueDate === 'string') {
      req.body.dueDate = new Date(req.body.dueDate);
    }

    // Generate location-specific invoice number with retry for unique constraint
    const prefix = (location.name || 'LOC').substring(0, 3).toUpperCase();
    const MAX_RETRIES = 3;
    let created;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const locationInvoices = await repos.invoiceRepo.getByLocationId(location.id);
      const maxLocNum = locationInvoices.reduce((max, inv) => {
        const match = (inv.invoiceNumber || '').match(/-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(maxLocNum + 1).padStart(3, '0')}`;

      const newInvoice = {
        id: 'inv-' + uuidv4().slice(0, 8),
        businessId,
        issuedByScope: INVOICE_SCOPE_FROM_STORE.LOCATION,
        issuedByLocationId: location.id,
        invoiceNumber,
        status: 'DRAFT',
        type: 'invoice',
        ...req.body,
      };

      try {
        created = await repos.invoiceRepo.create(newInvoice);
        break; // Success — exit retry loop
      } catch (createErr) {
        const isUniqueViolation = createErr.code === 'P2002' || (createErr.message && createErr.message.includes('Unique constraint'));
        if (isUniqueViolation && attempt < MAX_RETRIES) {
          console.warn(`[Invoice] Duplicate location invoice number "${invoiceNumber}" on attempt ${attempt}, retrying...`);
          continue;
        }
        throw createErr;
      }
    }

    if (!created) {
      return res.status(500).json(errorResponse('Failed to generate unique invoice number after retries', 'CREATE_ERROR'));
    }

    // Create event message if invoice is being sent (not draft)
    if (created.status && created.status !== 'DRAFT') {
      try {
        const messageType = created.type === 'estimate' ? 'estimate' : 'invoice';
        await eventMessages.createEventMessage({
          type: messageType,
          fromBusinessId: created.businessId,
          toBusinessId: null, // B2C invoice
          entityId: created.id,
          actorId: req.user?.id,
          actorName: req.user?.name || 'Staff',
          metadata: { 
            amount: created.totalAmount || created.total,
            currency: business.settings?.currency || 'EUR',
            invoiceNumber: created.invoiceNumber,
            clientName: created.clientName,
            locationId: location.id
          }
        });
      } catch (msgErr) {
        console.error('Failed to create invoice event message:', msgErr);
      }
    }

    res.status(201).json(successResponse(created, 'Invoice created successfully'));
  } catch (err) {
    console.error('Error creating location invoice:', err);
    res.status(500).json(errorResponse('Failed to create invoice', 'CREATE_ERROR'));
  }
});

// Update invoice
app.patch('/api/invoices/:invoiceId', requireAuth, async (req, res) => {
  try {
    const invoice = await repos.invoiceRepo.getById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json(errorResponse('Invoice not found', 'NOT_FOUND'));
    }

    // PERMISSION: Verify user belongs to the invoice's business
    if (!(await requireBusinessMembership(req, res, invoice.businessId))) return;

    // ---- Request body validation ----
    const VALID_STATUSES = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELED', 'VOID', 'REFUNDED'];
    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json(errorResponse(`status must be one of: ${VALID_STATUSES.join(', ')}`, 'VALIDATION_ERROR'));
    }

    if (req.body.type && !['invoice', 'estimate'].includes(req.body.type)) {
      return res.status(400).json(errorResponse('type must be "invoice" or "estimate"', 'VALIDATION_ERROR'));
    }

    const numericFields = ['amount', 'taxAmount', 'totalAmount', 'paidAmount', 'discount', 'shipping'];
    for (const field of numericFields) {
      if (req.body[field] !== undefined && typeof req.body[field] !== 'number') {
        return res.status(400).json(errorResponse(`${field} must be a number`, 'VALIDATION_ERROR'));
      }
    }

    // Prevent overwriting protected fields
    delete req.body.id;
    delete req.body.businessId;
    delete req.body.createdAt;

    // ---- Status transition validation ----
    if (req.body.status && invoice.status) {
      const VALID_TRANSITIONS = {
        'DRAFT': ['SENT', 'CANCELED'],
        'SENT': ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELED', 'VOID'],
        'PARTIALLY_PAID': ['PAID', 'OVERDUE', 'VOID'],
        'OVERDUE': ['PAID', 'PARTIALLY_PAID', 'VOID'],
        'PAID': ['REFUNDED'],
        'CANCELED': [],
        'VOID': [],
        'REFUNDED': [],
      };
      const currentStatus = invoice.status;
      const newStatus = req.body.status;
      const allowed = VALID_TRANSITIONS[currentStatus] || [];
      if (currentStatus !== newStatus && !allowed.includes(newStatus)) {
        return res.status(400).json(errorResponse(
          `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ') || 'none (terminal state)'}`,
          'INVALID_TRANSITION'
        ));
      }
    }

    // Validate paidAmount does not exceed totalAmount
    if (req.body.paidAmount !== undefined) {
      const currentTotal = invoice.totalAmount || 0;
      if (req.body.paidAmount > currentTotal) {
        return res.status(400).json(errorResponse(
          `paidAmount (${req.body.paidAmount}) cannot exceed totalAmount (${currentTotal})`,
          'VALIDATION_ERROR'
        ));
      }
    }
    // ---- End validation ----

    // Track if status is changing to 'SENT'
    const wasNotSent = invoice.status === 'DRAFT' || !invoice.status;
    const isBeingSent = req.body.status === 'SENT';

    // Check plan capability when sending invoice
    if (wasNotSent && isBeingSent) {
      const business = await repos.businessRepo.getById(invoice.businessId);
      if (business) {
        const capabilities = deriveCapabilities(business);
        if (!capabilities.canSendInvoice) {
          return res.status(403).json(errorResponse(
            { code: 'PAYWALL', triggerId: 'send_invoice', requiredPlan: 'pro' },
            'Upgrade to Pro to send invoices'
          ));
        }
      }
    }

    // Parse date strings to Date objects for DateTime columns
    if (req.body.issueDate && typeof req.body.issueDate === 'string') {
      req.body.issueDate = new Date(req.body.issueDate);
    }
    if (req.body.dueDate && typeof req.body.dueDate === 'string') {
      req.body.dueDate = new Date(req.body.dueDate);
    }

    const updated = await repos.invoiceRepo.update(req.params.invoiceId, req.body);

    // Emit estimate_confirmed when type changes from estimate to invoice
    const wasEstimate = (invoice.type || '').toLowerCase() === 'estimate';
    const isNowInvoice = (updated.type || '').toLowerCase() === 'invoice';
    if (wasEstimate && isNowInvoice) {
      try {
        await eventMessages.createEventMessage({
          type: 'estimate_confirmed',
          fromBusinessId: updated.businessId,
          toBusinessId: null, // B2B invoice messaging requires clientBusinessId field on Invoice model (future enhancement)
          entityId: updated.id,
          actorId: req.user?.id,
          actorName: req.user?.name || 'Staff',
          metadata: {
            invoiceId: updated.id,
            invoiceNumber: updated.invoiceNumber,
            amount: updated.totalAmount || updated.total,
            currency: updated.currency || 'EUR',
            clientName: updated.clientName,
          }
        });
      } catch (msgErr) {
        console.error('Failed to create estimate_confirmed event:', msgErr);
      }
    }

    // Create event message when invoice/estimate is sent
    if (wasNotSent && isBeingSent) {
      try {
        const messageType = updated.type === 'estimate' ? 'estimate' : 'invoice';
        await eventMessages.createEventMessage({
          type: messageType,
          fromBusinessId: updated.businessId,
          toBusinessId: null, // B2B invoice messaging requires clientBusinessId field on Invoice model (future enhancement)
          entityId: updated.id,
          actorId: req.user?.id,
          actorName: req.user?.name || 'Staff',
          metadata: { 
            amount: updated.totalAmount || updated.total,
            currency: updated.currency || 'EUR',
            invoiceNumber: updated.invoiceNumber,
            clientName: updated.clientName,
            invoiceId: updated.type === 'invoice' ? updated.id : undefined,
            estimateId: updated.type === 'estimate' ? updated.id : undefined,
          }
        });
      } catch (msgErr) {
        console.error('Failed to create invoice sent event message:', msgErr);
      }
    }

    res.json(successResponse(updated, 'Invoice updated successfully'));
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json(errorResponse('Failed to update invoice', 'UPDATE_ERROR'));
  }
});

// Delete invoice
app.delete('/api/invoices/:invoiceId', requireAuth, async (req, res) => {
  try {
    const invoice = await repos.invoiceRepo.getById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json(errorResponse('Invoice not found', 'NOT_FOUND'));
    }

    // Verify user has access to the invoice's business
    if (!(await requireBusinessMembership(req, res, invoice.businessId))) return;

    // Only allow deletion of DRAFT or CANCELED invoices
    const DELETABLE_STATUSES = ['DRAFT', 'CANCELED'];
    if (invoice.status && !DELETABLE_STATUSES.includes(invoice.status)) {
      return res.status(400).json(errorResponse(
        `Cannot delete an invoice with status "${invoice.status}". Only draft or canceled invoices can be deleted. Consider voiding the invoice instead.`,
        'STATUS_NOT_DELETABLE'
      ));
    }

    const deleted = await repos.invoiceRepo.delete(req.params.invoiceId);
    if (!deleted) {
      return res.status(500).json(errorResponse('Failed to delete invoice', 'DELETE_ERROR'));
    }

    res.json(successResponse(null, 'Invoice deleted successfully'));
  } catch (err) {
    console.error('Error deleting invoice:', err);
    res.status(500).json(errorResponse('Failed to delete invoice', 'DELETE_ERROR'));
  }
});

// Accept estimate (convert to invoice) - admin/super_admin only
app.post('/api/invoices/:invoiceId/accept', requireAuth, async (req, res) => {
  try {
    const invoice = await repos.invoiceRepo.getById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json(errorResponse('Invoice not found', 'NOT_FOUND'));
    }
    // Must be an estimate in SENT status
    if ((invoice.type || '').toLowerCase() !== 'estimate') {
      return res.status(400).json(errorResponse('Only estimates can be accepted', 'VALIDATION_ERROR'));
    }
    if (invoice.status !== 'SENT') {
      return res.status(400).json(errorResponse('Estimate is not in a valid state for acceptance', 'VALIDATION_ERROR'));
    }
    // Check caller is admin/super_admin of ANY business (RBAC)
    const userId = req.user?.id;
    const memberships = await repos.memberRepo.listUserMemberships(userId);
    const isAdminOrSuperAdmin = memberships.some(m =>
      m.status === 'accepted' && (m.role === 'admin' || m.role === 'super_admin')
    );
    if (!isAdminOrSuperAdmin) {
      return res.status(403).json(errorResponse('Only admin or super admin can accept estimates', 'PERMISSION_DENIED'));
    }
    // Convert: change type to invoice
    const updated = await repos.invoiceRepo.update(req.params.invoiceId, { type: 'invoice' });
    // Emit estimate_confirmed event
    try {
      await eventMessages.createEventMessage({
        type: 'estimate_confirmed',
        fromBusinessId: invoice.businessId,
        toBusinessId: null, // B2B invoice messaging requires clientBusinessId field on Invoice model (future enhancement)
        entityId: invoice.id,
        actorId: userId,
        actorName: req.user?.name || 'Client',
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          currency: invoice.currency || 'EUR',
          clientName: invoice.clientName,
        }
      });
    } catch (msgErr) {
      console.error('Failed to create estimate_confirmed event:', msgErr);
    }
    res.json(successResponse(updated, 'Estimate accepted and converted to invoice'));
  } catch (err) {
    console.error('Error accepting estimate:', err);
    res.status(500).json(errorResponse('Failed to accept estimate', 'ACCEPT_ERROR'));
  }
});

// Chat Routes

// Create a new chat
app.post('/api/companies/:companyId/chats', requireAuth, requireCompanyMember, chatCreationLimiter, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type, name, participants, partnerId, partnerType, locationId } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json(errorResponse('Chat name is required'));
    }

    // Ensure the creator is included in participants
    const creatorId = req.user?.id;
    const allParticipants = Array.isArray(participants) ? [...participants] : [];
    if (creatorId && !allParticipants.includes(creatorId)) {
      allParticipants.push(creatorId);
    }

    // Validate that all participants are members of this company
    for (const pid of allParticipants) {
      const member = await findBusinessMember(companyId, pid);
      if (!member) {
        return res.status(400).json(errorResponse(`Participant ${pid} is not a member of this company`));
      }
    }

    const newChat = await repos.chatRepo.create({
      id: uuidv4(),
      companyId, // Canonical field (repos map to businessId internally for Prisma)
      locationId: locationId || null,
      type: type || 'direct',
      name,
      participants: allParticipants,
      partnerId: partnerId || null,
      partnerType: partnerType || null,
      unreadCount: 0,
      avatar: null,
      lastMessage: null
    });

    // Notify all participants about the new chat via socket
    const chatParticipants = newChat.participants || participants || [];
    if (Array.isArray(chatParticipants)) {
      chatParticipants.forEach(pid => {
        if (typeof pid === 'string') {
          io.to(`user:${pid}`).emit('chat_created', newChat);
        }
      });
    }

    res.status(201).json(successResponse(newChat));
  } catch (e) {
    console.error('Error creating chat:', e);
    res.status(500).json(errorResponse('Failed to create chat'));
  }
});

// List chats for a company (supports cursor-based pagination)
app.get('/api/companies/:companyId/chats', requireAuth, requireCompanyMember, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { locationId, type, search, cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);

    // When search is active, fetch all chats for in-memory filtering
    const useSearch = !!search;
    const { chats: rawChats, nextCursor } = await repos.chatRepo.getByCompanyId(
      companyId,
      useSearch ? {} : { limit, cursor }
    );

    let companyChats = rawChats;

    // Apply filters
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

    // Overlay per-user unread counts from ChatParticipant
    const requestingUserId = req.user?.id;
    if (requestingUserId && companyChats.length > 0) {
      const chatIds = companyChats.map(c => c.id);
      const participantCounts = await repos.chatRepo.getParticipantUnreadCounts(chatIds, requestingUserId);
      companyChats = companyChats.map(c => ({
        ...c,
        unreadCount: participantCounts[c.id] ?? 0,
      }));
    }

    res.json({ success: true, data: companyChats, nextCursor: useSearch ? null : nextCursor });
  } catch (e) {
    console.error('Error fetching chats:', e);
    res.status(500).json(errorResponse('Failed to load chats'));
  }
});

// Get messages for a specific chat
app.get('/api/companies/:companyId/chats/:chatId/messages', requireAuth, requireCompanyMember, async (req, res) => {
  try {
    const { companyId, chatId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const cursor = req.query.cursor;

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || chat.companyId !== companyId) {
      return res.status(404).json(errorResponse('Chat not found'));
    }

    // Verify user is a participant in this chat
    const requestingUserId = req.user?.id;
    const isParticipant = Array.isArray(chat.participants) && chat.participants.includes(requestingUserId);
    if (!isParticipant) {
      return res.status(403).json(errorResponse('You are not a participant in this chat'));
    }

    // DB-level cursor pagination (messages returned newest-first)
    const chatMessages = await repos.chatRepo.getMessages(chatId, { limit, cursor, requestingUserId });
    const nextCursor = chatMessages.length === limit ? chatMessages[chatMessages.length - 1].id : null;

    res.json({
      success: true,
      data: chatMessages,
      nextCursor,
      message: 'Success'
    });
  } catch (e) {
    console.error('Error fetching messages:', e);
    res.status(500).json(errorResponse('Failed to load messages'));
  }
});

// Mark chat as read
app.post('/api/companies/:companyId/chats/:chatId/read', requireAuth, requireCompanyMember, async (req, res) => {
  try {
    const { companyId, chatId } = req.params;

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || chat.companyId !== companyId) {
      return res.status(404).json(errorResponse('Chat not found'));
    }

    const userId = req.user?.id;

    // Verify user is a participant in this chat
    const isParticipant = Array.isArray(chat.participants) && chat.participants.includes(userId);
    if (!isParticipant) {
      return res.status(403).json(errorResponse('You are not a participant in this chat'));
    }

    // Mark messages as read (also resets unreadCount and creates ReadReceipt)
    await repos.chatRepo.markMessagesAsRead(chatId, userId);

    // Notify participants about the read receipt
    io.to(`chat:${chatId}`).emit('chat_read', { chatId, userId });

    // Also emit chat_update so other devices of the same user clear the badge
    io.to(`user:${userId}`).emit('chat_update', {
      id: chatId,
      unreadCount: 0,
    });

    res.json(successResponse(chat));
  } catch (e) {
    console.error('Error marking chat as read:', e);
    res.status(500).json(errorResponse('Failed to mark chat as read'));
  }
});

// Send message to chat
app.post('/api/companies/:companyId/chats/:chatId/messages', requireAuth, requireCompanyMember, messageLimiter, async (req, res) => {
  try {
    const { chatId, companyId } = req.params;
    const { type, content, replyToId, attachmentUrl, metadata } = req.body;

    // Validate message content
    if (!content && !attachmentUrl) {
      return res.status(400).json(errorResponse('Message content or attachment is required'));
    }
    if (content && content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json(errorResponse(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`));
    }
    if (type && !VALID_MESSAGE_TYPES.has(type)) {
      return res.status(400).json(errorResponse(`Invalid message type: ${type}`));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || chat.companyId !== companyId) {
      return res.status(404).json(errorResponse('Chat not found'));
    }

    // Create message based on type
    const senderId = req.user?.id;
    const senderName = req.user?.name;
    if (!senderId) {
      return res.status(401).json(errorResponse('User identity required'));
    }
    // Look up sender's actual role in the business
    const senderMember = await findBusinessMember(companyId, senderId);
    const senderRole = senderMember?.role || 'staff';
    const newMessage = {
      id: `msg-${uuidv4()}`,
      chatId,
      type: type || 'text',
      sender: { id: senderId, name: senderName, avatar: '', role: senderRole },
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
    } else if (type === 'location') {
      newMessage.latitude = metadata?.latitude;
      newMessage.longitude = metadata?.longitude;
      newMessage.address = metadata?.address;
      newMessage.locationName = metadata?.locationName;
    }

    // Add reply context if replying (efficient single-message lookup)
    if (replyToId) {
      const replyTo = await repos.chatRepo.getMessage(chatId, replyToId);
      if (replyTo) {
        newMessage.replyingTo = {
          senderName: replyTo.sender?.name || replyTo.senderName,
          messageSnippet: replyTo.text || replyTo.content || replyTo.fileName || replyTo.event || '[Media]',
          messageId: replyTo.id
        };
      }
    }

    // Add message to sender's chat with isOutgoing=true and don't increment unread for sender
    // isOutgoing is computed per-viewer at query time (P2-2), not stored
    // addMessage returns { message, participantCounts } with counts read right after incrementing
    const { message: created, participantCounts } = await repos.chatRepo.addMessage(chatId, {
      ...newMessage,
    }, { incrementUnread: true });

    // Emit full message object to all participants in the chat room
    io.to(`chat:${chatId}`).emit('message', created);

    // Emit per-user chat_update so each user gets their own unreadCount
    const lastMessagePayload = {
      id: created.id,
      content: created.text || created.content || '',
      type: created.type || 'text',
      senderId,
      senderName: senderName || '',
      timestamp: created.timestamp,
    };
    if (participantCounts.length > 0) {
      for (const p of participantCounts) {
        io.to(`user:${p.userId}`).emit('chat_update', {
          id: chatId,
          unreadCount: p.unreadCount,
          lastMessage: lastMessagePayload,
        });
      }
    } else {
      console.warn(`[Chat] No participants found for chat ${chatId}, skipping chat_update emit`);
    }

    res.json(successResponse(created));
  } catch (e) {
    console.error('Error sending message:', e);
    res.status(500).json(errorResponse('Failed to send message'));
  }
});

// Delete a message (soft delete)
app.delete('/api/companies/:companyId/chats/:chatId/messages/:messageId', requireAuth, requireCompanyMember, async (req, res) => {
  try {
    const { companyId, chatId, messageId } = req.params;

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || chat.companyId !== companyId) {
      return res.status(404).json(errorResponse('Chat not found'));
    }

    // Get the message to check ownership
    const message = await repos.chatRepo.getMessage(chatId, messageId);
    if (!message) {
      return res.status(404).json(errorResponse('Message not found'));
    }

    // Check if the user owns the message (optional: admins can delete any)
    const senderId = req.user?.id;
    if (message.sender?.id && message.sender.id !== senderId) {
      return res.status(403).json(errorResponse('You can only delete your own messages'));
    }

    const deleteResult = await repos.chatRepo.deleteMessage(chatId, messageId);
    if (!deleteResult) {
      return res.status(404).json(errorResponse('Message not found'));
    }
    const { message: deletedMessage, updatedChat, participantCounts } = deleteResult;

    // Notify all participants in the chat room about the deletion
    io.to(`chat:${chatId}`).emit('message_deleted', { chatId, messageId });

    // Emit per-user chat_update so each client gets updated lastMessage and unreadCount
    if (updatedChat && participantCounts.length > 0) {
      const lastMessagePayload = updatedChat.lastMessage || null;
      for (const p of participantCounts) {
        io.to(`user:${p.userId}`).emit('chat_update', {
          id: chatId,
          unreadCount: p.unreadCount,
          lastMessage: lastMessagePayload,
        });
      }
    }

    res.json(successResponse(deletedMessage));
  } catch (e) {
    console.error('Error deleting message:', e);
    res.status(500).json(errorResponse('Failed to delete message'));
  }
});


// ============================================================================
// USER CHAT ROUTES (Personal Mode)
// ============================================================================

// Get all chats for a user (personal mode)
app.get('/api/users/:userId/chats', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the requesting user matches the userId
    if (req.user?.id && req.user.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const { type, search, cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);

    // When search is active, fetch all chats for in-memory filtering
    const useSearch = !!search;
    const { chats: rawChats, nextCursor } = await repos.chatRepo.getByUserId(
      userId,
      useSearch ? {} : { limit, cursor }
    );

    let userChats = rawChats;

    // Apply filters
    if (type) {
      userChats = userChats.filter(c => c.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      userChats = userChats.filter(c => 
        (c.name || '').toLowerCase().includes(searchLower) ||
        (c.lastMessage && (c.lastMessage.content || '').toLowerCase().includes(searchLower))
      );
    }

    // Sort by updatedAt (most recent first)
    userChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Overlay per-user unread counts from ChatParticipant
    const requestingUserId = req.user?.id;
    if (requestingUserId && userChats.length > 0) {
      const chatIds = userChats.map(c => c.id);
      const participantCounts = await repos.chatRepo.getParticipantUnreadCounts(chatIds, requestingUserId);
      userChats = userChats.map(c => ({
        ...c,
        unreadCount: participantCounts[c.id] ?? 0,
      }));
    }

    res.json({ success: true, data: userChats, nextCursor: useSearch ? null : nextCursor });
  } catch (e) {
    console.error('Error fetching user chats:', e);
    res.status(500).json(errorResponse('Failed to load chats'));
  }
});

// Create a new user chat (personal mode)
app.post('/api/users/:userId/chats', requireAuth, chatCreationLimiter, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify the requesting user matches the userId
    if (req.user?.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const { type, name, participants } = req.body;

    if (!name) {
      return res.status(400).json(errorResponse('Chat name is required'));
    }

    // Ensure the creator is always included in participants
    const allParticipants = Array.isArray(participants) ? [...participants] : [];
    if (!allParticipants.includes(userId)) {
      allParticipants.push(userId);
    }

    const newChat = await repos.chatRepo.create({
      id: uuidv4(),
      companyId: null, // Personal chat — no company
      type: type || 'direct',
      name,
      participants: allParticipants,
      unreadCount: 0,
      avatar: null,
      lastMessage: null
    });

    // Notify all participants about the new chat via socket
    allParticipants.forEach(pid => {
      io.to(`user:${pid}`).emit('chat_created', newChat);
    });

    res.status(201).json(successResponse(newChat));
  } catch (e) {
    console.error('Error creating user chat:', e);
    res.status(500).json(errorResponse('Failed to create chat'));
  }
});

// Get messages for a specific user chat
app.get('/api/users/:userId/chats/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const cursor = req.query.cursor;

    // Verify the requesting user matches the userId
    if (req.user?.id && req.user.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat) {
      return res.status(404).json(errorResponse('Chat not found'));
    }
    
    // Verify user is a participant in the chat
    const isParticipant = Array.isArray(chat.participants) && chat.participants.includes(userId);
    if (!isParticipant) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    // DB-level cursor pagination (messages returned newest-first)
    const requestingUserId = req.user?.id;
    const chatMessages = await repos.chatRepo.getMessages(chatId, { limit, cursor, requestingUserId });
    const nextCursor = chatMessages.length === limit ? chatMessages[chatMessages.length - 1].id : null;

    res.json({
      success: true,
      data: chatMessages,
      nextCursor,
      message: 'Messages retrieved'
    });
  } catch (e) {
    console.error('Error fetching user chat messages:', e);
    res.status(500).json(errorResponse('Failed to load messages'));
  }
});

// Mark user chat as read
app.post('/api/users/:userId/chats/:chatId/read', requireAuth, async (req, res) => {
  try {
    const { userId, chatId } = req.params;

    // Verify the requesting user matches the userId
    if (req.user?.id && req.user.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat) {
      return res.status(404).json(errorResponse('Chat not found'));
    }
    
    // Verify user is a participant
    const isParticipant = Array.isArray(chat.participants) && chat.participants.includes(userId);
    if (!isParticipant) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Mark messages as read (also resets unreadCount and creates ReadReceipt)
    await repos.chatRepo.markMessagesAsRead(chatId, userId);

    // Notify participants about the read receipt
    io.to(`chat:${chatId}`).emit('chat_read', { chatId, userId });

    // Also emit chat_update so other devices of the same user clear the badge
    io.to(`user:${userId}`).emit('chat_update', {
      id: chatId,
      unreadCount: 0,
    });

    res.json(successResponse(chat));
  } catch (e) {
    console.error('Error marking user chat as read:', e);
    res.status(500).json(errorResponse('Failed to mark chat as read'));
  }
});

// Send message to user chat
app.post('/api/users/:userId/chats/:chatId/messages', requireAuth, messageLimiter, async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    const { type, content, replyToId, attachmentUrl, metadata } = req.body;

    // Validate message content
    if (!content && !attachmentUrl) {
      return res.status(400).json(errorResponse('Message content or attachment is required'));
    }
    if (content && content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json(errorResponse(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`));
    }
    if (type && !VALID_MESSAGE_TYPES.has(type)) {
      return res.status(400).json(errorResponse(`Invalid message type: ${type}`));
    }

    // Verify the requesting user matches the userId
    if (req.user?.id && req.user.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat) {
      return res.status(404).json(errorResponse('Chat not found'));
    }
    
    // Verify user is a participant
    const isParticipant = Array.isArray(chat.participants) && chat.participants.includes(userId);
    if (!isParticipant) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Create message
    const senderId = req.user?.id;
    const senderName = req.user?.name;
    if (!senderId) {
      return res.status(401).json(errorResponse('User identity required'));
    }
    const resolvedType = type || 'text';
    const newMessage = {
      id: `msg-${uuidv4()}`,
      chatId,
      type: resolvedType,
      sender: { id: senderId, name: senderName, avatar: '', role: 'personal' },
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    // Add type-specific fields
    if (resolvedType === 'text') {
      newMessage.text = content;
    } else if (resolvedType === 'pdf') {
      newMessage.fileName = content;
      newMessage.fileUrl = attachmentUrl;
    } else if (resolvedType === 'image') {
      newMessage.imageUrl = attachmentUrl || content;
    } else if (resolvedType === 'location') {
      newMessage.latitude = metadata?.latitude;
      newMessage.longitude = metadata?.longitude;
      newMessage.address = metadata?.address;
      newMessage.locationName = metadata?.locationName;
    } else if (resolvedType === 'voice') {
      newMessage.content = content;
      newMessage.durationSeconds = metadata?.durationSeconds;
    } else if (resolvedType === 'video_call') {
      newMessage.content = content;
      newMessage.durationSeconds = metadata?.durationSeconds;
    } else if (resolvedType === 'invoice') {
      newMessage.content = content;
      newMessage.invoiceId = metadata?.invoiceId;
    } else if (resolvedType === 'estimate') {
      newMessage.content = content;
      newMessage.estimateId = metadata?.estimateId;
    } else if (resolvedType === 'delivery') {
      newMessage.content = content;
      newMessage.meta = metadata;
    } else if (resolvedType === 'event') {
      newMessage.content = content;
      newMessage.meta = metadata;
    }

    // Add reply context if replying (efficient single-message lookup)
    if (replyToId) {
      const replyTo = await repos.chatRepo.getMessage(chatId, replyToId);
      if (replyTo) {
        newMessage.replyingTo = {
          senderName: replyTo.sender?.name || replyTo.senderName,
          messageSnippet: replyTo.text || replyTo.content || replyTo.fileName || replyTo.event || '[Media]',
          messageId: replyTo.id
        };
      }
    }

    // isOutgoing is computed per-viewer at query time (P2-2), not stored
    // addMessage returns { message, participantCounts } with counts read right after incrementing
    const { message: created, participantCounts } = await repos.chatRepo.addMessage(chatId, {
      ...newMessage,
    }, { incrementUnread: true });

    // Emit full message object to all participants in the chat room
    io.to(`chat:${chatId}`).emit('message', created);

    // Emit per-user chat_update so each user gets their own unreadCount
    const lastMessagePayloadUser = {
      id: created.id,
      content: created.text || created.content || '',
      type: created.type || 'text',
      senderId,
      senderName: senderName || '',
      timestamp: created.timestamp,
    };
    if (participantCounts.length > 0) {
      for (const p of participantCounts) {
        io.to(`user:${p.userId}`).emit('chat_update', {
          id: chatId,
          unreadCount: p.unreadCount,
          lastMessage: lastMessagePayloadUser,
        });
      }
    } else {
      console.warn(`[Chat] No participants found for chat ${chatId}, skipping chat_update emit`);
    }

    res.json(successResponse(created));
  } catch (e) {
    console.error('Error sending user message:', e);
    res.status(500).json(errorResponse('Failed to send message'));
  }
});

// Delete a message from user chat (soft delete)
app.delete('/api/users/:userId/chats/:chatId/messages/:messageId', requireAuth, async (req, res) => {
  try {
    const { userId, chatId, messageId } = req.params;

    // Verify the requesting user matches the userId
    if (req.user?.id && req.user.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat) {
      return res.status(404).json(errorResponse('Chat not found'));
    }
    
    // Verify user is a participant
    const isParticipant = Array.isArray(chat.participants) && chat.participants.includes(userId);
    if (!isParticipant) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Get the message to check ownership
    const message = await repos.chatRepo.getMessage(chatId, messageId);
    if (!message) {
      return res.status(404).json(errorResponse('Message not found'));
    }

    // Check if the user owns the message
    if (message.sender?.id && message.sender.id !== userId) {
      return res.status(403).json(errorResponse('You can only delete your own messages'));
    }

    const deleteResult = await repos.chatRepo.deleteMessage(chatId, messageId);
    if (!deleteResult) {
      return res.status(404).json(errorResponse('Message not found'));
    }
    const { message: deletedMessage, updatedChat, participantCounts } = deleteResult;

    // Notify all participants in the chat room about the deletion
    io.to(`chat:${chatId}`).emit('message_deleted', { chatId, messageId });

    // Emit per-user chat_update so each client gets updated lastMessage and unreadCount
    if (updatedChat && participantCounts.length > 0) {
      const lastMessagePayload = updatedChat.lastMessage || null;
      for (const p of participantCounts) {
        io.to(`user:${p.userId}`).emit('chat_update', {
          id: chatId,
          unreadCount: p.unreadCount,
          lastMessage: lastMessagePayload,
        });
      }
    }

    res.json(successResponse(deletedMessage));
  } catch (e) {
    console.error('Error deleting user message:', e);
    res.status(500).json(errorResponse('Failed to delete message'));
  }
});


// ============================================================================
// MEMBERSHIP ROUTES
// ============================================================================

// Get business members
app.get('/api/companies/:companyId/members', (req, res) => {
  const members = businessMembers.filter(m => m.businessId === req.params.companyId);
  
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

// Search all users and businesses with connection status for the new chat modal
// A "connection" means the requesting user and target user share at least one business membership,
// or the requesting user is a member of the target business.
// Uses Prisma repos (not in-memory arrays) so newly created data is visible.
app.get('/api/users/:userId/contacts', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { search } = req.query;
    const searchLower = search ? search.toString().toLowerCase() : '';

    // 1) Find all businessIds the requesting user belongs to (via Prisma)
    const myMemberships = await repos.memberRepo.getByUserId(userId);
    const acceptedMemberships = myMemberships.filter(m => m.status === 'accepted');
    const userBusinessIds = acceptedMemberships.map(m => m.businessId);

    // 2) Get all users from DB
    const allUsers = await repos.userRepo.list();
    const userResults = allUsers
      .filter(u => u.id !== userId) // exclude self
      .filter(u => {
        if (!searchLower) return true;
        return (u.name || '').toLowerCase().includes(searchLower) ||
               (u.email || '').toLowerCase().includes(searchLower);
      })
      .map(u => {
        // Check if this user shares a business with the requesting user
        // We need all memberships for this target user — query inline
        // For efficiency, we batch-check: find any membership row for u.id in one of userBusinessIds
        // Since we already have myMemberships, we check if the target user is also in any of those businesses
        // We'll resolve this after the map with a bulk query below
        return {
          id: u.id,
          name: u.name || 'Unknown',
          avatar: u.avatar || null,
          email: u.email || null,
          type: 'user',
          is_connected: false, // placeholder, resolved below
          role: null,          // placeholder, resolved below
        };
      });

    // Batch-resolve connection status for all user results
    // Get all business members for the businesses the requesting user belongs to
    const allMembersInMyBusinesses = [];
    for (const bizId of userBusinessIds) {
      const members = await repos.memberRepo.listBusinessMembers(bizId);
      allMembersInMyBusinesses.push(...members);
    }

    // Build a map: userId -> { businessId, role } for accepted members in shared businesses
    const sharedMemberMap = new Map();
    for (const m of allMembersInMyBusinesses) {
      if (m.status === 'accepted' && m.userId !== userId) {
        if (!sharedMemberMap.has(m.userId)) {
          sharedMemberMap.set(m.userId, { businessId: m.businessId, role: m.role });
        }
      }
    }

    // Apply connection info to user results
    for (const ur of userResults) {
      const shared = sharedMemberMap.get(ur.id);
      if (shared) {
        ur.is_connected = true;
        ur.role = shared.role;
      }
    }

    // 3) Get all businesses from DB
    const allBusinesses = await repos.businessRepo.list();
    const businessResults = allBusinesses
      .filter(c => {
        if (!searchLower) return true;
        return (c.name || '').toLowerCase().includes(searchLower) ||
               (c.description || '').toLowerCase().includes(searchLower);
      })
      .map(c => {
        const isMember = userBusinessIds.includes(c.id);
        const membership = isMember
          ? acceptedMemberships.find(m => m.businessId === c.id)
          : null;
        return {
          id: c.id,
          name: c.name,
          avatar: c.logoUrl || null,
          email: c.email || null,
          type: 'business',
          is_connected: isMember,
          role: membership ? membership.role : null,
        };
      });

    // Combine, sort alphabetically
    const allResults = [...userResults, ...businessResults].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    res.json(successResponse(allResults));
  } catch (error) {
    console.error('[Contacts] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

// Legacy User Management Routes — now Prisma-backed
app.get('/api/companies/:companyId/users', async (req, res) => {
  try {
    // Get members of this company from Prisma
    const members = await repos.memberRepo.listBusinessMembers(req.params.companyId);
    const acceptedMembers = members.filter(m => m.status === 'accepted');
    
    // listBusinessMembers includes { user } via Prisma include, so extract user objects
    const companyUsers = acceptedMembers
      .map(m => m.user)
      .filter(Boolean);
    
    res.json(successResponse(companyUsers));
  } catch (error) {
    console.error('[CompanyUsers] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch company users' });
  }
});

// ============================================================================
// STAFF MANAGEMENT - Unified staff list for Team Management screen
// ============================================================================
// Returns merged list of business-level and location-level members with user details
app.get('/api/companies/:companyId/staff', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status = 'accepted', locationId } = req.query;

    // Validate status
    const allowed = new Set(['accepted', 'invited', 'suspended', 'all']);
    if (!allowed.has(String(status))) {
      return res.status(400).json(errorResponse('Invalid status filter. Use accepted|invited|suspended|all'));
    }

    // 1) Pull business-level memberships for this business
    const allMembers = await repos.memberRepo.listBusinessMembers(companyId);
    let members = allMembers;

    // 2) Status filter
    if (status !== 'all') {
      members = members.filter(m => (m.status ?? 'accepted') === status);
    }

    // 3) If locationId is provided:
    //    - super_admin stays included (implicit access)
    //    - admin/staff must have a locationMember row for that location
    if (locationId) {
      const loc = await findLocation(companyId, String(locationId));
      if (!loc) return res.status(404).json(errorResponse('Location not found for this business'));

      const allLocMembers = await repos.memberRepo.listLocationMembers(String(locationId));
      members = members.filter(bm => {
        const bmStatus = bm.status ?? 'accepted';
        if (bmStatus === 'suspended') return false;

        if (bm.role === 'super_admin') return true;

        const lm = allLocMembers.find(x =>
          x.businessId === companyId &&
          x.userId === bm.userId
        );
        if (!lm) return false;

        // If status filter is set, match location assignment status too
        if (status === 'all') return true;

        const lmStatus = lm.status ?? bmStatus ?? 'accepted';
        return lmStatus === status;
      });
    }

    // 4) Enrich & normalize into stable DTO
    const staff = (await Promise.all(members.map(async bm => {
        const user = await findUser(bm.userId);
        if (!user) return null;

        // Collect all locationIds for this user
        const locationIds = locationMembers
          .filter(lm => lm.businessId === companyId && lm.userId === bm.userId)
          .map(lm => lm.locationId);

        // If location filter is active and non-super_admin, attach locationName
        let locName = null;
        let scope = 'business';
        if (locationId && bm.role !== 'super_admin') {
          scope = 'location';
          const loc = await findLocation(companyId, String(locationId));
          locName = loc?.name || null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          phone: user.phone || null,
          role: bm.role,
          status: bm.status ?? 'accepted',
          scope,
          locationId: locationId ? String(locationId) : null,
          locationIds,
          locationName: locName,
          joinedAt: bm.createdAt || null,
        };
      }))).filter(Boolean);

    return res.json(successResponse(staff));
  } catch (err) {
    return sendError(res, err);
  }
});

// ============================================================================
// LOCATION-FILTERED STAFF ENDPOINTS
// ============================================================================

// Get staff for a specific location (with status filter)
// GET /api/companies/:companyId/locations/:locationId/staff?status=accepted|invited|suspended|all&includeBusinessAdmins=true
app.get('/api/companies/:companyId/locations/:locationId/staff', async (req, res) => {
  try {
    const { companyId, locationId } = req.params;
    const { status = 'accepted', includeBusinessAdmins = 'true' } = req.query;

    // Validate status
    const allowed = new Set(['accepted', 'invited', 'suspended', 'all']);
    if (!allowed.has(String(status))) {
      return res.status(400).json(errorResponse('Invalid status filter. Use accepted|invited|suspended|all'));
    }

    const loc = await findLocation(companyId, String(locationId));
    if (!loc) return res.status(404).json(errorResponse('Location not found for this business'));

    // Super admins (business-level) are implicitly included if requested
    let superAdmins = [];
    if (includeBusinessAdmins === 'true') {
      const allBizMembers = await repos.memberRepo.listBusinessMembers(companyId);
      superAdmins = allBizMembers
        .filter(m => m.role === 'super_admin')
        .filter(m => status === 'all' ? true : (m.status ?? 'accepted') === status);
    }

    // Explicit location members (admin/staff)
    const allLocMembers = await repos.memberRepo.listLocationMembers(String(locationId));
    let locMembers = allLocMembers
      .filter(m => m.businessId === companyId);

    if (status !== 'all') {
      locMembers = locMembers.filter(m => (m.status ?? 'accepted') === status);
    }

    const merged = [
      ...superAdmins.map(bm => ({ type: 'super', bm })),
      ...locMembers.map(lm => ({ type: 'loc', lm })),
    ];

    const staff = (await Promise.all(merged.map(async item => {
        if (item.type === 'super') {
          const bm = item.bm;
          const user = await findUser(bm.userId);
          if (!user) return null;
          
          // Collect all locationIds for this user
          const locationIds = locationMembers
            .filter(lm => lm.businessId === companyId && lm.userId === bm.userId)
            .map(lm => lm.locationId);
          
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || null,
            phone: user.phone || null,
            role: bm.role,
            status: bm.status ?? 'accepted',
            scope: 'business',
            locationId: String(locationId),
            locationIds,
            locationName: loc.name || null,
            joinedAt: bm.createdAt || null,
          };
        }

        const lm = item.lm;
        const user = await findUser(lm.userId);
        if (!user) return null;

        // Keep role aligned with business membership if present
        const bm = await findBusinessMember(companyId, lm.userId);
        const effectiveRole = bm?.role || lm.role || 'staff';
        const effectiveStatus = lm.status ?? bm?.status ?? 'accepted';

        // Collect all locationIds for this user
        const locationIds = locationMembers
          .filter(lmx => lmx.businessId === companyId && lmx.userId === lm.userId)
          .map(lmx => lmx.locationId);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          phone: user.phone || null,
          role: effectiveRole,
          status: effectiveStatus,
          scope: 'location',
          locationId: String(locationId),
          locationIds,
          locationName: loc.name || null,
          joinedAt: lm.createdAt || bm?.createdAt || null,
        };
      }))).filter(Boolean);

    return res.json(successResponse(staff));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get staff for a location without company prefix (convenience)
// GET /api/locations/:locationId/staff
app.get('/api/locations/:locationId/staff', async (req, res) => {
  const { locationId } = req.params;
  const includeBusinessAdmins = req.query.includeBusinessAdmins === 'true';

  const location = await repos.locationRepo.getById(locationId);
  if (!location) return res.status(404).json(errorResponse('Location not found'));

  // Derive companyId from location
  const companyId = location.businessId || location.companyId;

  // Location-level members for this location
  const allLocMembers = await repos.memberRepo.listLocationMembers(locationId);
  const filteredLocMembers = allLocMembers.filter(m => m.businessId === companyId);
  const locationStaff = (await Promise.all(filteredLocMembers.map(async m => {
      const user = await findUser(m.userId);
      if (!user) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        phone: user.phone || null,
        role: m.role,
        status: m.status ?? 'accepted',
        scope: 'location',
        locationId,
        locationName: location.name,
        joinedAt: m.createdAt || null,
      };
    }))).filter(Boolean);

  let businessAdminStaff = [];
  if (includeBusinessAdmins) {
    const allBizMembers = await repos.memberRepo.listBusinessMembers(companyId);
    const adminMembers = allBizMembers.filter(m => m.role === 'super_admin' || m.role === 'admin');
    businessAdminStaff = (await Promise.all(adminMembers.map(async m => {
        const user = await findUser(m.userId);
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          phone: user.phone || null,
          role: m.role,
          status: m.status ?? 'accepted',
          scope: 'business',
          locationId,
          locationName: location.name,
          joinedAt: m.createdAt || null,
        };
      }))).filter(Boolean);
  }

  const map = new Map();
  businessAdminStaff.forEach(m => map.set(m.id, m));
  locationStaff.forEach(m => map.set(m.id, m));

  return res.json(successResponse(Array.from(map.values())));
});

// ============================================================================
// LOCATION STAFF ASSIGNMENT (POST/DELETE/PATCH)
// ============================================================================

// Assign staff/admin to a location
// POST /api/companies/:companyId/locations/:locationId/staff
// Body: { userId, role, status? }
app.post('/api/companies/:companyId/locations/:locationId/staff', requireAuth, async (req, res) => {
  try {
    const { companyId, locationId } = req.params;
    const { userId, role, status = 'accepted' } = req.body || {};

    if (!userId) return res.status(400).json(errorResponse('userId is required'));
    ensureRole(role);
    ensureStatus(status);

    // Validate location belongs to business
    const location = await findLocation(companyId, locationId);
    if (!location) return res.status(404).json(errorResponse('Location not found for this business'));

    // Validate user exists
    const user = await findUser(userId);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    // Ensure user is a business member first (business role must exist)
    let bm = await findBusinessMember(companyId, userId);

    // If not business member, create it
    if (!bm) {
      bm = {
        id: nextId('bm'),
        businessId: companyId,
        userId,
        role,
        status,
        createdAt: new Date().toISOString(),
      };
      businessMembers.push(bm);
    } else {
      // If already a business member, update business role if it differs
      bm.role = role;
      bm.status = status;
    }

    // Super admin has implicit access to all locations; no need to create locationMember
    if (role === 'super_admin') {
      return res.json(successResponse({
        message: 'Super admin has access to all locations; no explicit location assignment required.',
        businessMember: bm,
      }));
    }

    // For admin/staff we create/update a locationMember record
    let lm = await findLocationMember(companyId, locationId, userId);
    if (!lm) {
      lm = {
        id: nextId('lm'),
        businessId: companyId,
        locationId,
        userId,
        role,
        status,
        createdAt: new Date().toISOString(),
      };
      locationMembers.push(lm);
    } else {
      lm.role = role;
      lm.status = status;
    }

    return res.json(successResponse({
      businessMember: bm,
      locationMember: lm,
    }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Remove staff assignment from a location
// DELETE /api/companies/:companyId/locations/:locationId/staff/:userId
app.delete('/api/companies/:companyId/locations/:locationId/staff/:userId', requireAuth, async (req, res) => {
  try {
    const { companyId, locationId, userId } = req.params;

    const location = await findLocation(companyId, locationId);
    if (!location) return res.status(404).json(errorResponse('Location not found for this business'));

    const bm = await findBusinessMember(companyId, userId);
    if (!bm) return res.status(404).json(errorResponse('User is not a member of this business'));

    // If super_admin, we do not delete implicit access
    if (bm.role === 'super_admin') {
      return res.status(400).json(errorResponse('super_admin access is implicit; cannot remove per-location assignment.'));
    }

    const idx = locationMembers.findIndex(m => m.businessId === companyId && m.locationId === locationId && m.userId === userId);
    if (idx === -1) return res.status(404).json(errorResponse('No location assignment found for this user'));

    const removed = locationMembers.splice(idx, 1)[0];

    return res.json(successResponse({ removed }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Update role/status for a location assignment
// PATCH /api/companies/:companyId/locations/:locationId/staff/:userId
// Body: { role?, status? }
app.patch('/api/companies/:companyId/locations/:locationId/staff/:userId', requireAuth, async (req, res) => {
  try {
    const { companyId, locationId, userId } = req.params;
    const { role, status } = req.body || {};

    if (role !== undefined) ensureRole(role);
    if (status !== undefined) ensureStatus(status);

    const location = await findLocation(companyId, locationId);
    if (!location) return res.status(404).json(errorResponse('Location not found for this business'));

    const bm = await findBusinessMember(companyId, userId);
    if (!bm) return res.status(404).json(errorResponse('User is not a member of this business'));

    // Super admin is business-level only; location-level patch not allowed
    if (bm.role === 'super_admin' || role === 'super_admin') {
      return res.status(400).json(errorResponse('super_admin is business-level only and has implicit access to all locations.'));
    }

    let lm = await findLocationMember(companyId, locationId, userId);
    if (!lm) {
      // If not assigned yet, create assignment on patch (useful UX)
      lm = {
        id: nextId('lm'),
        businessId: companyId,
        locationId,
        userId,
        role: role || bm.role || 'staff',
        status: status || bm.status || 'accepted',
        createdAt: new Date().toISOString(),
      };
      locationMembers.push(lm);
    } else {
      if (role !== undefined) lm.role = role;
      if (status !== undefined) lm.status = status;
    }

    // Keep business role aligned with location role where applicable
    if (role !== undefined) bm.role = role;
    if (status !== undefined) bm.status = status;

    return res.json(successResponse({ businessMember: bm, locationMember: lm }));
  } catch (err) {
    return sendError(res, err);
  }
});

// ============================================================================
// ACCESS CONTROL ENDPOINTS
// ============================================================================

// Get accessible locations for a user in a business
// GET /api/companies/:companyId/access/locations?userId=usr-002
// Returns: { role, locations[] }
app.get('/api/companies/:companyId/access/locations', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { userId } = req.query;

    if (!userId) return res.status(400).json(errorResponse('userId is required'));

    const bm = await findBusinessMember(companyId, userId);
    if (!bm) return res.status(404).json(errorResponse('User not member of this business'));

    // Super admin has access to all locations
    if (bm.role === 'super_admin') {
      const all = await repos.locationRepo.getByBusinessId(companyId);
      return res.json(successResponse({ role: bm.role, locations: all }));
    }

    // Admin/staff: only assigned locations where not suspended
    const allBizLocations = await repos.locationRepo.getByBusinessId(companyId);
    const allLocMemberships = await Promise.all(
      allBizLocations.map(async loc => {
        const lm = await repos.memberRepo.getLocationMember(loc.id, userId);
        return lm && lm.status !== 'suspended' ? loc : null;
      })
    );
    const assigned = allLocMemberships.filter(Boolean);
    
    return res.json(successResponse({ role: bm.role, locations: assigned }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get capabilities for a user (for frontend Pro vs Personal mode gating)
// GET /api/companies/:companyId/access/capabilities?userId=usr-004
// Returns: { role, canAccessBusinessProfile, canAccessAllLocations }
app.get('/api/companies/:companyId/access/capabilities', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { userId } = req.query;
    if (!userId) return res.status(400).json(errorResponse('userId is required'));

    const bm = await repos.memberRepo.getBusinessMember(companyId, userId);
    if (!bm || bm.status !== 'accepted') {
      return res.status(404).json(errorResponse('Not a business member'));
    }

    return res.json(successResponse({
      role: bm.role,
      canAccessBusinessProfile: bm.role !== 'staff',
      canAccessAllLocations: bm.role === 'super_admin',
    }));
  } catch (err) {
    return sendError(res, err);
  }
});

// ============================================================================
// STAFF INVITE WORKFLOW
// ============================================================================

// Invite a new staff member
// POST /api/companies/:companyId/users/invite
// Body: { email, name?, role, locationIds[], status? }
app.post('/api/companies/:companyId/users/invite', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { email, name, role, locationIds, status = 'invited' } = req.body || {};

    if (!email) return res.status(400).json(errorResponse('email is required'));
    if (!role) return res.status(400).json(errorResponse('role is required'));

    ensureRole(role);
    ensureStatus(status);

    const locIds = normalizeLocationIds(locationIds);

    // Business rules
    if (role === 'staff' || role === 'admin') {
      if (locIds.length === 0) {
        return res.status(400).json(errorResponse(`${role} must be assigned to at least one location`));
      }
    }
    if (role === 'super_admin' && locIds.length > 0) {
      return res.status(400).json(errorResponse('super_admin has implicit access; do not pass locationIds'));
    }

    // Validate locations belong to business
    for (const locId of locIds) {
      const loc = await findLocation(companyId, locId);
      if (!loc) return res.status(404).json(errorResponse(`Location not found for this business: ${locId}`));
    }

    // Check plan capability and staff limit
    const business = await findBusiness(companyId);
    if (business) {
      const capabilities = deriveCapabilities(business);
      
      // Check if plan allows inviting staff
      if (!capabilities.canInviteStaff) {
        return res.status(403).json({
          error: {
            code: 'PAYWALL',
            triggerId: 'accept_staff',
            requiredPlan: 'pro',
            message: 'Upgrade to Pro to invite staff members'
          }
        });
      }
      
      // Check staff limit
      const currentStaffCount = await getStaffCount(companyId);
      if (currentStaffCount >= capabilities.maxStaff) {
        return res.status(403).json(errorResponse(
          `Staff limit reached (${capabilities.maxStaff}). Upgrade your plan to add more staff.`
        ));
      }
    }

    // Find or create user
    let user = await findUserByEmail(email);
    if (!user) {
      user = {
        id: nextId('usr'),
        email: String(email).toLowerCase(),
        name: name || email.split('@')[0],
        avatar: '',
        createdAt: new Date().toISOString(),
      };
      users.push(user);
    }

    // Create/update business membership
    let bm = await findBusinessMember(companyId, user.id);
    if (!bm) {
      bm = {
        id: nextId('bm'),
        businessId: companyId,
        userId: user.id,
        role,
        status, // invited by default
        createdAt: new Date().toISOString(),
      };
      businessMembers.push(bm);
    } else {
      bm.role = role;
      bm.status = status;
    }

    // Super admin: no locationMembers needed
    let createdLocationMembers = [];
    if (role !== 'super_admin') {
      for (const locId of locIds) {
        let lm = await findLocationMember(companyId, locId, user.id);
        if (!lm) {
          lm = {
            id: nextId('lm'),
            businessId: companyId,
            locationId: locId,
            userId: user.id,
            role,
            status,
            createdAt: new Date().toISOString(),
          };
          locationMembers.push(lm);
        } else {
          lm.role = role;
          lm.status = status;
        }
        createdLocationMembers.push(lm);
      }
    }

    // Mock invite token/link (in production: email + JWT invite token)
    const inviteToken = nextId('invite');
    const inviteLink = `/invite?companyId=${companyId}&userId=${user.id}&token=${inviteToken}`;

    return res.json(successResponse({
      user,
      businessMember: bm,
      locationMembers: createdLocationMembers,
      invite: { token: inviteToken, link: inviteLink },
    }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Accept invite
// POST /api/companies/:companyId/users/:userId/accept
app.post('/api/companies/:companyId/users/:userId/accept', requireAuth, async (req, res) => {
  try {
    const { companyId, userId } = req.params;

    const bm = await findBusinessMember(companyId, userId);
    if (!bm) return res.status(404).json(errorResponse('Invite not found'));

    // Accept business membership
    bm.status = 'accepted';

    // Accept all location assignments for this business+user
    locationMembers
      .filter(m => m.businessId === companyId && m.userId === userId)
      .forEach(m => { m.status = 'accepted'; });

    return res.json(successResponse({ businessMember: bm }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Revoke invite (remove memberships)
// DELETE /api/companies/:companyId/users/:userId/invite
app.delete('/api/companies/:companyId/users/:userId/invite', requireAuth, (req, res) => {
  try {
    const { companyId, userId } = req.params;

    // Remove location assignments
    for (let i = locationMembers.length - 1; i >= 0; i--) {
      const lm = locationMembers[i];
      if (lm.businessId === companyId && lm.userId === userId) locationMembers.splice(i, 1);
    }

    // Remove business membership
    for (let i = businessMembers.length - 1; i >= 0; i--) {
      const bm = businessMembers[i];
      if (bm.businessId === companyId && bm.userId === userId) businessMembers.splice(i, 1);
    }

    return res.json(successResponse({ ok: true }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Decline invite
// POST /api/companies/:companyId/users/:userId/decline
app.post('/api/companies/:companyId/users/:userId/decline', requireAuth, (req, res) => {
  try {
    const { companyId, userId } = req.params;

    const bmIndex = businessMembers.findIndex(m => m.businessId === companyId && m.userId === userId);
    if (bmIndex === -1) return res.status(404).json(errorResponse('Invite not found'));

    const bm = businessMembers[bmIndex];

    // Remove location assignments
    for (let i = locationMembers.length - 1; i >= 0; i--) {
      const lm = locationMembers[i];
      if (lm.businessId === companyId && lm.userId === userId) locationMembers.splice(i, 1);
    }

    // Remove business membership
    businessMembers.splice(bmIndex, 1);

    return res.json(successResponse({ removed: bm }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Resend invite (mock)
// POST /api/companies/:companyId/users/:userId/resend-invite
app.post('/api/companies/:companyId/users/:userId/resend-invite', requireAuth, async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const bm = await findBusinessMember(companyId, userId);
    if (!bm) return res.status(404).json(errorResponse('Invite not found'));

    if (bm.status !== 'invited') {
      return res.status(400).json(errorResponse('User is not in invited status'));
    }

    const inviteToken = nextId('invite');
    const inviteLink = `/invite?companyId=${companyId}&userId=${userId}&token=${inviteToken}`;

    return res.json(successResponse({ invite: { token: inviteToken, link: inviteLink } }));
  } catch (err) {
    return sendError(res, err);
  }
});

// ============================================================================
// ROLE UPGRADE REQUESTS (staff → admin)
// ============================================================================

// Mock storage for role requests (in production: use DB table)
let roleRequests = [];

// Create role upgrade request (staff only)
// POST /api/companies/:companyId/role-requests
app.post('/api/companies/:companyId/role-requests', requireAuth, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { requestedRole = 'admin', message } = req.body;
    
    // Get user from request (requires JWT auth)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Authentication required'));
    }
    
    // Verify user is a staff member
    const bm = await findBusinessMember(businessId, userId);
    if (!bm) {
      return res.status(404).json(errorResponse('Not a member of this business'));
    }
    
    if (bm.role !== 'staff') {
      return res.status(400).json(errorResponse('Only staff can request upgrades'));
    }
    
    if (bm.status !== 'accepted') {
      return res.status(400).json(errorResponse('You must be an accepted member first'));
    }
    
    // Check for existing pending request
    const existingPending = roleRequests.find(r => 
      r.businessId === businessId && 
      r.userId === userId && 
      r.status === 'PENDING'
    );
    
    if (existingPending) {
      return res.status(400).json(errorResponse('You already have a pending request'));
    }
    
    // Check cooldown (7 days after rejection)
    const recentRejection = roleRequests.find(r =>
      r.businessId === businessId &&
      r.userId === userId &&
      r.status === 'REJECTED' &&
      new Date(r.resolvedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentRejection) {
      return res.status(400).json(errorResponse('Please wait 7 days after rejection before requesting again'));
    }
    
    // Create request
    const user = await findUser(userId);
    const request = {
      id: `rr-${Date.now()}`,
      businessId,
      userId,
      userName: user?.name || '',
      userEmail: user?.email || '',
      userAvatar: user?.avatar || null,
      requestedRole,
      currentRole: 'staff',
      status: 'PENDING',
      message: message || null,
      createdAt: new Date().toISOString(),
    };
    
    roleRequests.push(request);
    
    return res.json(successResponse(request, 'Role upgrade request created'));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get current user's role request (if any)
// GET /api/companies/:companyId/role-requests/me
app.get('/api/companies/:companyId/role-requests/me', (req, res) => {
  try {
    const { businessId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Authentication required'));
    }
    
    const request = roleRequests.find(r =>
      r.businessId === businessId &&
      r.userId === userId &&
      (r.status === 'PENDING' || r.status === 'REJECTED')
    );
    
    return res.json(successResponse(request || null));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get all role requests for a business (admin only)
// GET /api/companies/:companyId/role-requests?status=PENDING
app.get('/api/companies/:companyId/role-requests', (req, res) => {
  try {
    const { businessId } = req.params;
    const { status } = req.query;
    
    // TODO: Add admin check
    
    let allRequests = roleRequests.filter(r => r.businessId === businessId);
    
    if (status) {
      allRequests = allRequests.filter(r => r.status === status);
    }
    
    // Enrich with full user details for frontend display
    const enhancedRequests = allRequests.map(req => {
      const user = users.find(u => u.id === req.userId);
      return {
        ...req,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar_url,
          phone: user.phone,
        } : null,
        // Also add direct properties for easier access in frontend
        userName: user?.name,
        userEmail: user?.email,
        userAvatar: user?.avatar_url,
      };
    });
    
    return res.json(successResponse({ requests: enhancedRequests }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Approve or reject role request (admin only)
// PATCH /api/companies/:companyId/role-requests/:requestId
app.patch('/api/companies/:companyId/role-requests/:requestId', requireAuth, async (req, res) => {
  try {
    const { businessId, requestId } = req.params;
    const { status, rejectionReason } = req.body;
    
    // Get user from request (requires JWT auth)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Authentication required'));
    }
    
    // Verify admin
    const adminMember = await findBusinessMember(businessId, userId);
    if (!adminMember || adminMember.role === 'staff') {
      return res.status(403).json(errorResponse('Only admins can approve requests'));
    }
    
    // Find request
    const request = roleRequests.find(r => r.id === requestId);
    if (!request || request.businessId !== businessId) {
      return res.status(404).json(errorResponse('Request not found'));
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json(errorResponse('Request already resolved'));
    }
    
    // Update request
    request.status = status;
    request.resolvedAt = new Date().toISOString();
    request.resolvedByUserId = userId;
    
    const admin = await findUser(userId);
    request.resolvedByName = admin?.name || null;
    
    if (status === 'REJECTED' && rejectionReason) {
      request.rejectionReason = rejectionReason;
    }
    
    // If approved, upgrade the user's role
    if (status === 'APPROVED') {
      const bm = await findBusinessMember(businessId, request.userId);
      if (bm) {
        bm.role = 'admin';
        
        // Update location memberships too
        locationMembers
          .filter(lm => lm.businessId === businessId && lm.userId === request.userId)
          .forEach(lm => { lm.role = 'admin'; });
      }
    }
    
    return res.json(successResponse(request, 'Role request resolved'));
  } catch (err) {
    return sendError(res, err);
  }
});

// ============================================================================
// DELIVERY ASSIGNMENT ENDPOINTS
// ============================================================================

// Assign a delivery to a user (staff/admin)
// PATCH /api/companies/:companyId/deliveries/:deliveryId/assign
// Body: { userId }
app.patch('/api/companies/:companyId/deliveries/:deliveryId/assign', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId, deliveryId } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json(errorResponse('userId is required'));
    }

    // Check plan capability for assigning transport
    const business = await repos.businessRepo.getById(companyId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found'));
    }
    
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canAssignTransport) {
      return res.status(403).json({
        error: {
          code: 'PAYWALL',
          triggerId: 'assign_transport',
          requiredPlan: 'pro',
          message: 'Upgrade to Pro to assign transport'
        }
      });
    }

    // Use repository instead of raw array access
    const delivery = await repos.deliveryRepo.getById(deliveryId);
    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    // Check membership via repo
    const members = await repos.memberRepo.listBusinessMembers(companyId);
    const member = members.find(
      m => m.userId === userId && m.status === 'accepted'
    );
    if (!member) {
      return res.status(403).json(errorResponse('User not accepted in this business'));
    }

    // Enforce location access (unless super_admin)
    if (member.role !== 'super_admin' && delivery.locationId) {
      const locationMembersResult = await repos.memberRepo.listLocationMembers(delivery.locationId);
      const hasAccess = locationMembersResult.some(lm =>
        lm.userId === userId && lm.status === 'accepted'
      );

      if (!hasAccess) {
        return res.status(403).json(errorResponse('User has no access to this delivery location'));
      }
    }

    // Look up user name
    const user = await repos.userRepo.getById(userId);

    // Build update patch with UPPERCASE status values
    const patch = {
      assignedStaffId: userId,
      assignedTo: user?.name || null,
    };

    // Only auto-advance status if currently NOT_ASSIGNED
    if (delivery.deliveryStatus === 'NOT_ASSIGNED') {
      patch.deliveryStatus = 'ASSIGNED';
    }

    const updated = await repos.deliveryRepo.update(deliveryId, patch);

    // Sync delivery assignment status to linked order (with loop guard)
    if (patch.deliveryStatus && delivery.orderId && !_orderDeliverySyncInProgress.has(delivery.orderId)) {
      _orderDeliverySyncInProgress.add(delivery.orderId);
      try {
        await repos.orderRepo.update(delivery.orderId, { deliveryStatus: patch.deliveryStatus });
      } catch (syncErr) {
        console.warn('Failed to sync delivery assign to order:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(delivery.orderId);
      }
    }

    return res.json(successResponse(updated));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message || 'Server error'));
  }
});

// Unassign a delivery
// PATCH /api/companies/:companyId/deliveries/:deliveryId/unassign
app.patch('/api/companies/:companyId/deliveries/:deliveryId/unassign', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId, deliveryId } = req.params;

    // Use repository instead of raw array access
    const delivery = await repos.deliveryRepo.getById(deliveryId);
    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    // Build update patch with UPPERCASE status values
    const patch = {
      assignedStaffId: null,
      assignedTo: null,
    };

    // Only revert status if currently ASSIGNED
    if (delivery.deliveryStatus === 'ASSIGNED') {
      patch.deliveryStatus = 'NOT_ASSIGNED';
    }

    const updated = await repos.deliveryRepo.update(deliveryId, patch);

    // Sync delivery unassignment status to linked order (with loop guard)
    if (patch.deliveryStatus && delivery.orderId && !_orderDeliverySyncInProgress.has(delivery.orderId)) {
      _orderDeliverySyncInProgress.add(delivery.orderId);
      try {
        await repos.orderRepo.update(delivery.orderId, { deliveryStatus: patch.deliveryStatus });
      } catch (syncErr) {
        console.warn('Failed to sync delivery unassign to order:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(delivery.orderId);
      }
    }

    return res.json(successResponse(updated));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message || 'Server error'));
  }
});

// ============================================================================
// PERSONAL MODE ACTIVITIES ENDPOINTS
// ============================================================================

// Get Activities for a user (Personal Mode)
// GET /api/users/:userId/activities
// Returns delivery tasks assigned to the user across all businesses
app.get('/api/users/:userId/activities', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const assignedDeliveries = await repos.deliveryRepo.getByAssignedStaffId(userId);

    const activities = assignedDeliveries.map(d => ({
      id: `activity-${d.id}`,
      type: 'delivery',
      createdAt: d.updatedAt || d.createdAt,
      delivery: {
        id: d.id,
        businessId: d.businessId,
        locationId: d.locationId,
        clientName: d.clientCompanyName,
        clientAddress: d.clientAddress,
        itemCount: d.itemCount,
        totalAmount: d.totalAmount,
        deliveryStatus: d.deliveryStatus,
        expectedDeliveryDateTime: d.expectedDeliveryDateTime,
        transportMode: d.transportMode,
      }
    }));

    return res.json(successResponse({ activities }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message || 'Server error'));
  }
});

// Get Activities for a user scoped to a specific business
// GET /api/companies/:companyId/users/:userId/activities
app.get('/api/companies/:companyId/users/:userId/activities', requireAuth, async (req, res) => {
  try {
    const { companyId, userId } = req.params;

    const bm = await findBusinessMember(companyId, userId);
    if (!bm || bm.status !== 'accepted') return res.status(404).json(errorResponse('User not accepted in this business'));

    const assignedDeliveries = await repos.deliveryRepo.getByBusinessIdAndStaffId(companyId, userId);

    const activities = assignedDeliveries.map(d => ({
      id: `activity-${d.id}`,
      type: 'delivery',
      createdAt: d.updatedAt || d.createdAt,
      delivery: {
        id: d.id,
        businessId: d.businessId,
        locationId: d.locationId,
        clientName: d.clientCompanyName,
        clientAddress: d.clientAddress,
        itemCount: d.itemCount,
        totalAmount: d.totalAmount,
        deliveryStatus: d.deliveryStatus,
        expectedDeliveryDateTime: d.expectedDeliveryDateTime,
        transportMode: d.transportMode,
      },
    }));

    return res.json(successResponse({ activities }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message || 'Server error'));
  }
});

// File Upload Route
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
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

// Activity Feed - Aggregates invoices, deliveries, orders for business timeline
// GET /api/companies/:companyId/activity-feed?locationId=...&limit=50
app.get('/api/companies/:companyId/activity-feed', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { locationId, limit = 50 } = req.query;
    const maxLimit = Math.min(parseInt(limit, 10), 100);
    
    // Verify user has access to this business
    const userId = req.user?.id;
    if (!userId || !(await isBusinessMember(companyId, userId))) {
      return res.status(403).json(errorResponse('ACCESS_DENIED', 'You do not have access to this business'));
    }
    
    // Helper to format currency
    const formatCurrency = (amount) => `Rs ${Number(amount).toFixed(2)}`;
    
    let activities = [];
    
    // 1. Recent invoices
    const businessInvoices = await repos.invoiceRepo.getByBusinessId(companyId);
    const recentInvoices = businessInvoices
      .filter(inv => locationId ? inv.issuedByLocationId === locationId : true)
      .slice(0, 20)
      .map(inv => ({
        id: `inv-${inv.id}`,
        type: 'invoice_sent',
        title: `Invoice ${inv.id} sent`,
        description: `${inv.clientName} - ${formatCurrency(inv.totalAmount)}`,
        timestamp: inv.createdAt,
        entityId: inv.id,
        entityType: 'invoice',
        metadata: {
          status: inv.status,
          amount: inv.totalAmount,
          clientName: inv.clientName,
        },
      }));
    activities.push(...recentInvoices);
    
    // 2. Recent deliveries
    const businessDeliveries = await repos.deliveryRepo.getByBusinessId(companyId);
    const recentDeliveries = businessDeliveries
      .filter(del => locationId ? del.locationId === locationId : true)
      .slice(0, 20)
      .map(del => {
        const statusMap = {
          'PENDING': 'delivery_pending',
          'IN_TRANSIT': 'delivery_started',
          'DELIVERED': 'delivery_completed',
          'CANCELED': 'delivery_canceled',
        };
        const activityType = statusMap[del.deliveryStatus] || 'delivery_started';
        
        return {
          id: `del-${del.id}`,
          type: activityType,
          title: `Delivery #${del.id} ${del.deliveryStatus.toLowerCase().replace('_', ' ')}`,
          description: `${del.clientCompanyName} - ${del.itemCount} items`,
          timestamp: del.updatedAt || del.createdAt,
          entityId: del.id,
          entityType: 'delivery',
          metadata: {
            status: del.deliveryStatus,
            clientName: del.clientCompanyName,
            itemCount: del.itemCount,
          },
        };
      });
    activities.push(...recentDeliveries);
    
    // 3. Recent orders (if separate from deliveries)
    const businessOrders = await repos.orderRepo.getByBusinessId(companyId);
    const recentOrders = businessOrders
      .filter(ord => locationId ? ord.locationId === locationId : true)
      .slice(0, 20)
      .map(ord => ({
        id: `ord-${ord.id}`,
        type: 'order_created',
        title: `Order #${ord.id} created`,
        description: `${ord.clientName || 'Client'} - ${formatCurrency(ord.totalAmount)}`,
        timestamp: ord.createdAt,
        entityId: ord.id,
        entityType: 'order',
        metadata: {
          status: ord.status,
          amount: ord.totalAmount,
        },
      }));
    activities.push(...recentOrders);
    
    // Sort by timestamp (newest first) and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    activities = activities.slice(0, maxLimit);
    
    return res.json(successResponse({ activities }));
  } catch (err) {
    console.error('Error fetching activity feed:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', err.message || 'Failed to fetch activity feed'));
  }
});

// Notifications API - Aggregates notifications from multiple sources
// GET /api/users/:userId/notifications?filter=all|unread|requests
app.get('/api/users/:userId/notifications', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { filter = 'all' } = req.query;
    
    // Verify user is requesting their own notifications
    const requestUserId = req.user?.id;
    if (requestUserId !== userId) {
      return res.status(403).json(errorResponse('ACCESS_DENIED', 'You can only access your own notifications'));
    }
    
    // Helper to format currency
    const formatCurrency = (amount) => `Rs ${Number(amount || 0).toFixed(2)}`;
    
    let notifications = [];
    
    // Get user's businesses for team-related notifications
    const userBusinesses = await repos.memberRepo.getByUserId(userId);
    
    // 1. Join requests (for admins)
    for (const ub of userBusinesses) {
      if (ub.role === 'admin' || ub.role === 'super_admin') {
        const pendingRequests = roleRequests.filter(
          rr => rr.businessId === ub.businessId && rr.status === 'PENDING'
        );
        
        for (const rr of pendingRequests) {
          const user = users.find(u => u.id === rr.userId);
          notifications.push({
            id: `req-${rr.id}`,
            type: 'staff_request',
            title: 'Join request',
            description: `${user?.name || 'Someone'} wants to join your company`,
            time: formatRelativeTime(rr.createdAt),
            timestamp: rr.createdAt,
            read: false,
            avatar: user?.avatar_url || null,
            status: 'pending',
            requestData: {
              requestId: rr.id,
              userId: rr.userId,
              userName: user?.name,
              userEmail: user?.email,
              businessId: rr.businessId,
            },
          });
        }
      }
    }
    
    // 2. Pending invites (sent by user's business) - informational, not actionable
    for (const ub of userBusinesses) {
      if (ub.role === 'admin' || ub.role === 'super_admin') {
        const pendingInvites = businessMembers.filter(
          m => m.businessId === ub.businessId && m.status === 'invited'
        );
        
        for (const inv of pendingInvites) {
          notifications.push({
            id: `inv-${inv.id}`,
            type: 'invite_pending',
            title: 'Invite pending',
            description: `Invitation sent to ${inv.email}`,
            time: formatRelativeTime(inv.createdAt),
            timestamp: inv.createdAt,
            read: false,
            avatar: null,
            status: 'pending',
            requestData: {
              inviteId: inv.id,
              email: inv.email,
              role: inv.role,
              businessId: ub.businessId,
            },
          });
        }
      }
    }
    
    // 3. Recent invoice notifications (payments received)
    for (const ub of userBusinesses) {
      try {
        const allInvoices = await repos.invoiceRepo.getByBusinessId(ub.businessId);
        const paidInvoices = allInvoices
          .filter(inv => inv.status === 'PAID')
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
          .slice(0, 5);
        
        for (const inv of paidInvoices) {
          notifications.push({
            id: `inv-paid-${inv.id}`,
            type: 'invoice',
            title: 'Invoice payment received',
            description: `Payment of ${formatCurrency(inv.totalAmount)} received for invoice #${inv.id}`,
            time: formatRelativeTime(inv.updatedAt || inv.createdAt),
            timestamp: inv.updatedAt || inv.createdAt,
            read: false,
            avatar: null,
          });
        }
      } catch (err) {
        console.error('Error fetching invoices for notifications:', err);
      }
    }
    
    // 4. Recent delivery notifications (completed deliveries)
    for (const ub of userBusinesses) {
      try {
        const allDeliveries = await repos.deliveryRepo.getByBusinessId(ub.businessId);
        const completedDeliveries = allDeliveries
          .filter(del => del.deliveryStatus === 'DELIVERED')
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
          .slice(0, 3);
        
        for (const del of completedDeliveries) {
          notifications.push({
            id: `del-completed-${del.id}`,
            type: 'delivery',
            title: 'Delivery completed',
            description: `Delivery #${del.id} to ${del.clientCompanyName || 'client'} completed`,
            time: formatRelativeTime(del.updatedAt || del.createdAt),
            timestamp: del.updatedAt || del.createdAt,
            read: false,
            avatar: null,
          });
        }
      } catch (err) {
        console.error('Error fetching deliveries for notifications:', err);
      }
    }
    
    // 5. Low stock alerts
    for (const ub of userBusinesses) {
      if (ub.role === 'admin' || ub.role === 'super_admin') {
        try {
          const allStocks = await repos.stockRepo.getByBusinessId(ub.businessId);
          const LOW_STOCK_THRESHOLD = 10;
          const lowStocks = allStocks.filter(s => (s.qtyOnHand || 0) <= LOW_STOCK_THRESHOLD);

          for (const stock of lowStocks.slice(0, 10)) {
            const product = await repos.productRepo.getById(stock.productId);
            if (!product) continue;

            notifications.push({
              id: `stock-low-${stock.id}`,
              type: 'stock_alert',
              title: 'Low stock alert',
              description: `${product.name} has only ${stock.qtyOnHand} units remaining`,
              time: formatRelativeTime(stock.updatedAt || stock.createdAt),
              timestamp: stock.updatedAt || stock.createdAt,
              read: false,
              avatar: product.productPicture || null,
              productData: {
                productId: product.id,
                productName: product.name,
                currentStock: stock.qtyOnHand,
                locationId: stock.locationId,
              },
            });
          }
        } catch (err) {
          console.error('Error fetching low stock alerts for notifications:', err);
        }
      }
    }
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply read state from notificationReadRepo
    const notificationKeys = notifications.map(n => n.id);
    const readStates = await repos.notificationReadRepo.getReadStates(userId, notificationKeys);
    const readRecords = await repos.notificationReadRepo.getByUserId(userId);
    const readAtMap = {};
    for (const record of readRecords) {
      readAtMap[record.notificationKey] = record.readAt;
    }
    
    notifications = notifications.map(n => ({
      ...n,
      read: !!readStates[n.id],
      readAt: readAtMap[n.id] || null
    }));
    
    // Apply filters
    if (filter === 'unread') {
      notifications = notifications.filter(n => !n.read);
    } else if (filter === 'requests') {
      notifications = notifications.filter(n => 
        n.type === 'staff_request' || n.type === 'company_request' || n.type === 'invite_pending'
      );
    }
    
    return res.json(successResponse({ notifications }));
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', err.message || 'Failed to fetch notifications'));
  }
});

// Mark notification as read
// POST /api/users/:userId/notifications/:notificationId/read
app.post('/api/users/:userId/notifications/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    
    // Verify user is updating their own notification
    const requestUserId = req.user?.id;
    if (requestUserId !== userId) {
      return res.status(403).json(errorResponse('ACCESS_DENIED', 'You can only update your own notifications'));
    }
    
    // Persist read state using notificationReadRepo
    const record = await repos.notificationReadRepo.upsert({
      userId,
      notificationKey: notificationId,
      readAt: new Date().toISOString()
    });
    
    return res.json(successResponse({ 
      success: true, 
      message: 'Notification marked as read',
      readAt: record.readAt
    }));
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', err.message || 'Failed to mark notification as read'));
  }
});

// Public product catalog (scope/visibility filter)
// GET /api/products?scope=public&companyId=...&brand=...&category=...
// GET /api/products?visibility=public (also supported for compatibility)
app.get('/api/products', async (req, res) => {
  try {
    const { scope, visibility, companyId, brand, category } = req.query;
    let catalog = await repos.productRepo.list();

    // "public catalog" for personal mode + ordering other products
    if (scope === 'public' || visibility === 'public') {
      catalog = catalog.filter(p => 
        (p.is_listed === true || p.isPublic === true) && 
        (p.isDisplayable === true || p.isPublic === true)
      );
    }

    // Optional filters for product-details suggestions carousels
    if (companyId) {
      catalog = catalog.filter(p => 
        (p.companyId || p.businessId || p.ownerBusinessId) === companyId
      );
    }
    if (brand) {
      catalog = catalog.filter(p => 
        (p.brand || '').toLowerCase() === String(brand).toLowerCase()
      );
    }
    if (category) {
      catalog = catalog.filter(p => 
        (p.category || '').toLowerCase() === String(category).toLowerCase()
      );
    }

    return res.json(successResponse(catalog.map(withProductVisibility)));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get single product by ID (public view)
app.get('/api/products/:productId', async (req, res) => {
  const { productId } = req.params;
  
  try {
    // First check in database via Prisma repo
    const dbProduct = await repos.productRepo.getById(productId);
    if (dbProduct) {
      return res.json(successResponse(withProductVisibility(dbProduct)));
    }

    // Fallback: check in-memory products array
    const memProduct = products.find(p => p.id === productId);
    if (memProduct) {
      return res.json(successResponse(withProductVisibility(memProduct)));
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
            ownerBusinessId: post.data.distributorId,
            isPublic: true,
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
            ownerBusinessId: post.data.businessId,
            isPublic: true,
          }));
        }
      }
    }
    
    res.status(404).json(errorResponse('Product not found'));
  } catch (e) {
    console.error('Error fetching product:', e);
    res.status(500).json(errorResponse('Failed to load product'));
  }
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
  
  res.json(successResponse(locationProducts.map(withProductVisibility)));
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

// ============================================================================
// AUTOMATION ENDPOINTS
// ============================================================================
// These endpoints can be called by cron services (e.g., Render cron jobs)
// They require an API key for security

const AUTOMATION_API_KEY = process.env.AUTOMATION_API_KEY || 'dev-automation-key';

function requireAutomationAuth(req, res) {
  const apiKey = req.headers['x-automation-key'] || req.query.key;
  if (apiKey !== AUTOMATION_API_KEY) {
    res.status(401).json(errorResponse('Unauthorized', 'UNAUTHORIZED'));
    return false;
  }
  return true;
}

// Run order automation (auto-cancel stale orders, report stuck pending)
// Can be called via: curl -H "x-automation-key: your-key" http://localhost:3000/api/automation/orders
app.post('/api/automation/orders', async (req, res) => {
  if (!requireAutomationAuth(req, res)) return;

  try {
    const dryRun = req.query.dryRun === 'true' || req.body.dryRun === true;
    const { orderAutomation } = require('./src/services');
    const results = await orderAutomation.runAutomation({ dryRun });
    res.json(successResponse(results, 'Automation completed'));
  } catch (err) {
    console.error('Error running order automation:', err);
    res.status(500).json(errorResponse('Automation failed', 'AUTOMATION_ERROR'));
  }
});

// Get automation status/preview (dry run)
app.get('/api/automation/orders/preview', async (req, res) => {
  if (!requireAutomationAuth(req, res)) return;

  try {
    const { orderAutomation } = require('./src/services');
    const results = await orderAutomation.runAutomation({ dryRun: true });
    res.json(successResponse(results, 'Automation preview'));
  } catch (err) {
    console.error('Error previewing order automation:', err);
    res.status(500).json(errorResponse('Automation preview failed', 'AUTOMATION_ERROR'));
  }
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

// Start server (using HTTP server for Socket.IO support)
server.listen(PORT, HOST, () => {
  const lanIP = getNetworkIP();
  console.log('');
  console.log('🚀 NouPro Backend Server Started (Locations + Modes MVP)');
  console.log('=========================================================');
  console.log(`📍 Local:   http://localhost:${PORT}`);
  console.log(`📍 Network: http://${lanIP}:${PORT}`);
  console.log('');
  console.log(`🏥 Health:  http://localhost:${PORT}/api/health`);
  console.log(`📊 Data source: PRISMA (PostgreSQL)`);
  console.log(`🔌 Socket.IO: Enabled (real-time messaging)`);
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
  console.log('    GET  /api/companies/:companyId');
  console.log('    PATCH /api/companies/:companyId');
  console.log('');
  console.log('  Locations (with mode enforcement):');
  console.log('    GET  /api/companies/:companyId/locations');
  console.log('    POST /api/companies/:companyId/locations');
  console.log('    GET  /api/locations/:locationId');
  console.log('    PATCH /api/locations/:locationId');
  console.log('');
  console.log('  Orders (scope: PARENT vs LOCATION):');
  console.log('    GET  /api/companies/:companyId/orders');
  console.log('    POST /api/companies/:companyId/orders (Parent)');
  console.log('    POST /api/companies/:companyId/orders/:orderId/assign');
  console.log('    GET  /api/locations/:locationId/orders');
  console.log('    POST /api/locations/:locationId/orders (Independent only)');
  console.log('');
  console.log('  Invoices (scope: PARENT vs LOCATION):');
  console.log('    GET  /api/companies/:companyId/invoices');
  console.log('    POST /api/companies/:companyId/invoices (Parent)');
  console.log('    GET  /api/locations/:locationId/invoices');
  console.log('    POST /api/locations/:locationId/invoices (Independent only)');
  console.log('');
  console.log('  Stock:');
  console.log('    GET  /api/companies/:companyId/stock');
  console.log('    GET  /api/locations/:locationId/stock');
  console.log('    PATCH /api/locations/:locationId/stock/:productId');
  console.log('');
  console.log('  Membership:');
  console.log('    GET  /api/companies/:companyId/members');
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