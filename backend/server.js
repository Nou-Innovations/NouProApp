const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// IPv6-safe helper for custom keyGenerators that fall back to the client IP.
// express-rate-limit v8 throws ERR_ERL_KEY_GEN_IPV6 if a raw IPv6 address is used directly.
const { ipKeyGenerator } = rateLimit;
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const { Server: SocketIOServer } = require('socket.io');
const { Expo } = require('expo-server-sdk');
const { z } = require('zod');

// Load environment variables (create a .env file in backend/ if needed)
require('dotenv').config();

// Leveled logger — silences debug/info in production, always keeps warn/error.
const logger = require('./src/utils/logger');

// ============================================================================
// ENVIRONMENT VALIDATION — fail fast on missing critical vars
// ============================================================================
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'DIRECT_URL'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  logger.error(`\n[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  logger.error('Create a .env file in backend/ — see .env.example for reference.\n');
  process.exit(1);
}

// ============================================================================
// ERROR MONITORING (Sentry) — enabled only when SENTRY_DSN is configured.
// No-op (and zero overhead) when the DSN is absent, e.g. in local dev.
// ============================================================================
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  logger.debug('[Sentry] Error monitoring enabled');

  // Capture crashes that escape route-level try/catch blocks.
  process.on('unhandledRejection', (reason) => {
    Sentry.captureException(reason);
    logger.error('[unhandledRejection]', reason);
  });
  process.on('uncaughtException', (err) => {
    Sentry.captureException(err);
    logger.error('[uncaughtException]', err);
  });
}

if (process.env.JWT_SECRET === 'your-secret-here-generate-with-openssl-rand-base64-48') {
  logger.error('\n[FATAL] JWT_SECRET is still the placeholder value from .env.example.');
  logger.error('Generate a real secret: openssl rand -base64 48\n');
  process.exit(1);
}

// ============================================================================
// EMAIL SERVICE - Nodemailer for transactional emails
// ============================================================================
const nodemailer = require('nodemailer');

let emailTransporter = null;

function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    logger.warn('[Email] Email not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env');
    return null;
  }

  emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return emailTransporter;
}

async function sendPasswordResetEmail(toEmail, resetToken) {
  const transporter = getEmailTransporter();
  const appUrl = process.env.APP_BASE_URL || 'https://nouproapp.onrender.com';
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      // Fail loudly: in production a missing transporter means real users who
      // request a reset never receive an email. Surface it to logs + Sentry
      // instead of silently returning "success".
      logger.error('[Email] Password reset email NOT sent — email transporter is not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD.');
      Sentry.captureMessage('Password reset email could not be sent: email transporter not configured', 'error');
    } else {
      logger.debug('[Email] Would send password reset email to:', toEmail);
      logger.debug('[Email] Reset link:', resetLink);
    }
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'NouPro <noreply@noupro.app>',
    to: toEmail,
    subject: 'Reset your NouPro password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000;">Reset your password</h2>
        <p>You requested a password reset for your NouPro account.</p>
        <p>This link expires in 15 minutes.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
          Reset Password
        </a>
        <p style="margin-top:24px;color:#666;font-size:14px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// Expo push notification client
const expo = new Expo();

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
const { prisma } = require('./src/db/prisma');

// Services
const { orderStatus: orderStatusService, eventMessages, pushService, storageService, stockService } = require('./src/services');

// Authentication middleware
const { requireAuth, optionalAuth, generateToken, verifyToken } = require('./src/middleware/auth');

// ---------------------------------------------------------------------------
// Extracted helper modules (Phase 1 modularization).
// Previously defined inline below; moved out to shrink server.js. Identifiers
// are kept IDENTICAL so every existing call site keeps working unchanged.
// `repos` (line above) and `prisma` are already constructed, so the
// repos/prisma-dependent factories can be invoked here.
// ---------------------------------------------------------------------------
const { successResponse, errorResponse, paywallResponse, sendError } = require('./src/utils/response');
const { deriveCapabilities, isLocationPublicEffective, getPublicDisabledReason, hasCapability } = require('./src/domain/capabilities');
const { applyPricePrivacy, applyPricePrivacyBatch } = require('./src/domain/pricePrivacy')(repos, prisma);
const { resolvePriceListForBuyer, applyPriceList, resolveUnitPrice, repriceLineItems, attachYourPrice } = require('./src/domain/priceResolution')(repos, prisma);
const { normalizeLastMessage, otherParticipantId, applyViewerDisplay, serializeChatsForViewer, serializeChatForViewer } = require('./src/domain/chatSerializers')(repos);
const requireAutomationAuth = require('./src/middleware/automationAuth')(errorResponse);

// Password hashing
const bcrypt = require('bcryptjs');

logger.debug(`📦 Data source: ${getDataSource()}`);

// Import pure enum constants (no entity data)
const {
  SUBSCRIPTION_TIERS: TIERS_FROM_STORE,
  LOCATION_MODES: MODES_FROM_STORE,
  ORDER_STATUS: ORDER_STATUS_FROM_STORE,
  ORDER_SCOPE: ORDER_SCOPE_FROM_STORE,
  INVOICE_SCOPE: INVOICE_SCOPE_FROM_STORE,
  MEMBER_ROLES: MEMBER_ROLES_FROM_STORE,
  MEMBER_STATUS: MEMBER_STATUS_FROM_STORE
} = require('./src/constants');
const LOCATION_MODES = MODES_FROM_STORE;
const ORDER_SCOPE = ORDER_SCOPE_FROM_STORE;
const MEMBER_ROLES = MEMBER_ROLES_FROM_STORE;
const MEMBER_STATUS = MEMBER_STATUS_FROM_STORE;

// ---------------------------------------------------------------------------
// Cross-entity sync loop guard
// Prevents infinite loops when Order <-> Delivery sync triggers reverse sync.
// Before syncing, add the orderId to the set; after syncing, remove it.
// If the orderId is already in the set, skip the sync.
// ---------------------------------------------------------------------------
const _orderDeliverySyncInProgress = new Set();

// ---------------------------------------------------------------------------
// Delivery Status State Machine
// Now lives in ./src/services/deliveryStatus (single source of truth).
// Re-bound here so existing references keep working.
// ---------------------------------------------------------------------------
const deliveryStatusService = require('./src/services/deliveryStatus');
const transferStatusService = require('./src/services/transferStatus');
const returnService = require('./src/services/returnService');
const recurringService = require('./src/services/recurringService');
const { DELIVERY_STATUS_TRANSITIONS, isValidDeliveryTransition } = deliveryStatusService;
// Named delivery-status constants — use DS.X instead of raw string literals so the
// status-enum remodel is a single-source change.
const DS = deliveryStatusService.DELIVERY_STATUS;
const ACTIVE_DELIVERY_STATUSES = [DS.NOT_ASSIGNED, DS.ASSIGNED, DS.PACKED, DS.OUT_FOR_DELIVERY];

const app = express();
const server = http.createServer(app);

// Configuration from environment variables with sensible defaults
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for LAN access

// CORS Configuration - whitelist-based for security (must be before Socket.IO init)
const corsRaw = process.env.CORS_ORIGIN || '';
const corsAllowlist = corsRaw.split(',').map(s => s.trim()).filter(Boolean);

const io = new SocketIOServer(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      if (corsAllowlist.length === 0) return callback(new Error('CORS_NOT_CONFIGURED'), false);
      if (corsAllowlist.includes(origin)) return callback(null, true);
      return callback(new Error('CORS_BLOCKED'), false);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// Middleware
// Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, etc.).
// crossOriginResourcePolicy is relaxed to 'cross-origin' so statically served
// images under /uploads remain embeddable from other origins (e.g. the app /
// expo web), which the default 'same-origin' policy would block.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // If no allowlist configured, block all cross-origin requests in production
    if (corsAllowlist.length === 0) {
      logger.warn('[CORS] No CORS_ORIGIN configured - blocking cross-origin request from:', origin);
      return callback(new Error('CORS_NOT_CONFIGURED'), false);
    }
    
    // Check if origin is in allowlist
    if (corsAllowlist.includes(origin)) {
      return callback(null, true);
    }
    
    // Log and block unknown origins
    logger.warn('[CORS] Blocked request from unknown origin:', origin);
    return callback(new Error('CORS_BLOCKED'), false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
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

// Rate limiter for join requests (10 per 15 minutes per user — prevents notification spam)
const joinRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
  skip: (req) => !req.user,
  message: { success: false, error: 'Too many join requests, please try again later' },
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

// Rate limiter for authenticated 2FA management endpoints (setup/verify-setup/disable).
// Keyed by user id (applied AFTER requireAuth) — 10 attempts / 15 minutes / user.
const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
  message: { success: false, error: 'Too many 2FA attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// Allowed community-feedback category ids (server-side source of truth; mirrors the
// frontend FEEDBACK_CATEGORIES). Categories are validated against this list, not a DB
// enum, so adding one later needs no migration.
const FEEDBACK_CATEGORY_IDS = ['interface', 'add', 'modify', 'ideas', 'other'];

// Rate limiter for suggestion creation (anti-spam): 5 per 10 minutes per user.
// Applied AFTER requireAuth, so req.user.id is available.
const suggestionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
  message: { success: false, error: 'Too many suggestions, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// File upload setup with security hardening.
//
// Storage engine is chosen by configuration:
//   - Supabase Storage configured  → memoryStorage (buffer is streamed to the
//     bucket in the upload handler so files persist across deploys).
//   - Not configured (local dev)   → diskStorage → ./uploads (same as before).
// Render's filesystem is ephemeral, so disk storage MUST NOT be relied on in prod.
const useSupabaseStorage = storageService.isConfigured();
if (!useSupabaseStorage) {
  logger.warn(
    '[Storage] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — file uploads fall back to ' +
    'LOCAL DISK (./uploads). This is fine for local dev but EPHEMERAL on Render: uploaded ' +
    'images will be wiped on every redeploy. Set the Supabase Storage env vars in production.'
  );
}

const storage = useSupabaseStorage
  ? multer.memoryStorage()
  : multer.diskStorage({
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

// LOCATION_MODES already imported from constants at line 117

// deriveCapabilities(), isLocationPublicEffective(), getPublicDisabledReason()
// → moved to src/domain/capabilities.js (imported at top of file).

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
async function getUserFromRequest(req) {
  // Only use JWT-authenticated user from middleware
  if (req.user?.id) {
    return await repos.userRepo.getById(req.user.id);
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
    logger.error('Membership check failed:', err);
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

// hasCapability() → moved to src/domain/capabilities.js (imported at top of file).

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

// sendError() → moved to src/utils/response.js (imported at top of file).

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
  const isListed = product.isListed ?? product.is_listed ?? product.isDisplayable ?? false;
  return {
    ...product,
    ownerBusinessId,
    isListed,
    isPublic: isListed,
  };
}

// SECURITY (P0-4): Remove internal/sensitive business fields before returning to
// anonymous callers or non-members. Keeps all public-facing profile fields.
function stripSensitiveBusinessFields(business) {
  if (!business) return business;
  const {
    subscriptionTier, settings, billingPeriod, currentPeriodEnd,
    peachCustomerId, peachCardRegistrationId, ...safe
  } = business;
  return safe;
}

// applyPricePrivacy(), applyPricePrivacyBatch()
// → moved to src/domain/pricePrivacy.js (imported at top of file).

// ============================================================================
// MEMBERSHIP ENFORCEMENT MIDDLEWARE
// ============================================================================

// Require user to be a member of the business
async function requireBusinessMembership(req, res, businessId) {
  const user = await getUserFromRequest(req);
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
  const user = await getUserFromRequest(req);
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
  const user = await getUserFromRequest(req);
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

// Valid ORDER_STATUS values: NEW, ACCEPTED, ONGOING, PENDING, IN_REVIEW, DONE, CANCELED, REJECTED

const VALID_MESSAGE_TYPES = new Set([
  'text', 'image', 'pdf', 'location', 'voice',
  'video_call', 'invoice', 'estimate', 'delivery', 'event',
  'profile',
]);

const MAX_MESSAGE_LENGTH = 10000; // 10k characters

// successResponse(), errorResponse(), paywallResponse()
// → moved to src/utils/response.js (imported at top of file).

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  unit: z.string().max(50).optional(),
  price: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  minOrderQty: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  isAvailable: z.boolean().optional(),
  isListed: z.boolean().optional(),
  is_listed: z.boolean().optional(),
  isDisplayable: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  category: z.string().max(100).optional(),
  variants: z.array(z.object({
    name: z.string(),
    price: z.number().min(0).optional(),
    sku: z.string().optional(),
  })).optional(),
}).strict();

const createOrderSchema = z.object({
  customerName: z.string().max(200).optional(),
  customerAddress: z.string().max(500).optional(),
  customerPhone: z.string().max(50).optional(),
  items: z.array(z.object({
    productId: z.string().optional(),
    product_id: z.string().optional(),
    name: z.string().optional(),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0).optional(),
    unit_price: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
    unit: z.string().optional(),
  })).min(1),
  totalAmount: z.number().min(0),
  notes: z.string().max(2000).optional().nullable(),
  fulfillmentLocationId: z.string().optional().nullable(),
  buyerBusinessId: z.string().optional().nullable(),
  buyerBusinessName: z.string().max(200).optional().nullable(),
  createdBy: z.string().optional().nullable(),
  // Optional: seller manually applies one of their price lists (manual/guest orders).
  manualPriceListId: z.string().optional().nullable(),
});

// Price list create/update (customer-specific pricing).
const createPriceListSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  currency: z.string().max(10).optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

// Validates req.body against a zod schema, returns parsed data or sends 400
function validateBody(schema, req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    const path = firstError.path.join('.');
    res.status(400).json(errorResponse(
      `Validation error: ${path ? path + ' — ' : ''}${firstError.message}`,
      'VALIDATION_ERROR'
    ));
    return null;
  }
  return result.data;
}

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
    logger.warn(`[Socket] Auth failed for userId=${userId}: ${result.error}`);
    return next(new Error('Invalid token'));
  }
  if (result.user.id !== userId) {
    return next(new Error('userId mismatch'));
  }

  socket.userId = userId;
  // Store user name for typing indicators (from JWT claims)
  socket.userName = result.user.name || result.user.email || 'Someone';
  next();
});

io.on('connection', (socket) => {
  logger.debug(`[Socket] User connected: ${socket.userId}`);

  // Auto-join user-level room so we can send events (chat_created, etc.) to a user
  // regardless of which chat rooms they're currently in
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }

  socket.on('join_chat', async (chatId) => {
    try {
      const chat = await repos.chatRepo.getById(chatId);
      if (!chat) return;

      // Check membership: either a direct participant or a company/location member
      const isParticipant = Array.isArray(chat.participants) && chat.participants.includes(socket.userId);
      let isCompanyMember = false;
      if (!isParticipant && chat.companyId) {
        const member = await findBusinessMember(chat.companyId, socket.userId);
        if (member) {
          isCompanyMember = true;
          // If chat is scoped to a location, verify location access (unless super_admin)
          if (chat.locationId && member.role !== 'super_admin') {
            const locationMembers = await repos.memberRepo.listLocationMembers(chat.locationId);
            const hasLocationAccess = locationMembers.some(
              lm => lm.userId === socket.userId && lm.status === 'accepted'
            );
            if (!hasLocationAccess) {
              isCompanyMember = false;
            }
          }
        }
      }

      if (!isParticipant && !isCompanyMember) {
        logger.warn(`[Socket] ${socket.userId} denied join to chat:${chatId} (not a member)`);
        return;
      }

      socket.join(`chat:${chatId}`);
      logger.debug(`[Socket] ${socket.userId} joined chat:${chatId}`);
    } catch (err) {
      logger.error(`[Socket] Error in join_chat:`, err);
    }
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat:${chatId}`);
    logger.debug(`[Socket] ${socket.userId} left chat:${chatId}`);
  });

  // Typing indicators
  socket.on('typing_start', ({ chatId }) => {
    if (!chatId) return;
    socket.to(`chat:${chatId}`).emit('typing', {
      chatId,
      userId: socket.userId,
      userName: socket.userName || 'Someone',
    });
  });

  socket.on('typing_stop', ({ chatId }) => {
    if (!chatId) return;
    socket.to(`chat:${chatId}`).emit('typing_stop', {
      chatId,
      userId: socket.userId,
    });
  });

  socket.on('disconnect', () => {
    logger.debug(`[Socket] User disconnected: ${socket.userId}`);
  });
});

// Shared password validation (used by register, change-password, reset-password)
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
  if (!/\d/.test(password)) errors.push('one number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('one special character');
  return errors;
}

// Track failed login attempts per email for account lockout
const failedLoginAttempts = new Map(); // email -> { count, lastAttempt }
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Auth Routes
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json(errorResponse('Email and password are required'));
    }
    
    // Check for account lockout
    const attempts = failedLoginAttempts.get(email?.toLowerCase());
    if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const timeSinceLock = Date.now() - attempts.lastAttempt;
      if (timeSinceLock < LOCKOUT_DURATION_MS) {
        const minutesLeft = Math.ceil((LOCKOUT_DURATION_MS - timeSinceLock) / 60000);
        return res.status(429).json(errorResponse(`Account temporarily locked. Try again in ${minutesLeft} minutes.`));
      }
      // Lockout expired, reset
      failedLoginAttempts.delete(email?.toLowerCase());
    }

    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[Login] Received:', { email, passwordLength: password?.length });
    }

    // Look up user from database
    const dbUser = await repos.userRepo.getByEmail(email);
    if (!dbUser) {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('[Login] User not found:', email);
      }
      return res.status(401).json(errorResponse('Invalid credentials'));
    }
    
    // Verify password
    if (!dbUser.passwordHash) {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('[Login] No password hash set for:', email);
      }
      return res.status(401).json(errorResponse('Invalid credentials'));
    }
    const passwordValid = await bcrypt.compare(password, dbUser.passwordHash);
    
    if (!passwordValid) {
      // Track failed attempt
      const key = email.toLowerCase();
      const current = failedLoginAttempts.get(key) || { count: 0, lastAttempt: 0 };
      failedLoginAttempts.set(key, { count: current.count + 1, lastAttempt: Date.now() });
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('[Login] Invalid password for:', email);
      }
      return res.status(401).json(errorResponse('Invalid credentials'));
    }

    // Clear failed attempts on successful login
    failedLoginAttempts.delete(email.toLowerCase());

    // Check if 2FA is enabled
    if (dbUser.twoFactorEnabled) {
      const tempToken = generateToken({
        sub: dbUser.id,
        type: '2fa_pending',
      }, { expiresIn: '5m' });

      return res.json(successResponse({
        requiresTwoFactor: true,
        tempToken,
      }, 'Two-factor authentication required'));
    }

    // Get user's businesses from database (parallel fetch to avoid N+1)
    const memberships = await repos.memberRepo.getByUserId(dbUser.id);
    const acceptedMemberships = memberships.filter(m => m.status === 'accepted');
    const businesses = await Promise.all(acceptedMemberships.map(m => repos.businessRepo.getById(m.businessId)));
    const userBusinesses = acceptedMemberships
      .map((m, i) => {
        const business = businesses[i];
        if (!business) return null;
        return {
          business: { ...business, capabilities: deriveCapabilities(business) },
          role: m.role,
          staff_entry: {
            id: m.id,
            status: m.status,
            role_type: m.roleType || null,
            joinedAt: m.createdAt,
          },
        };
      })
      .filter(Boolean);
    
    // Generate real JWT tokens
    const token = generateToken({ 
      sub: dbUser.id, 
      email: dbUser.email,
      name: dbUser.name 
    });
    const refreshToken = generateToken({ 
      sub: dbUser.id,
      type: 'refresh',
      tv: dbUser.tokenVersion ?? 0
    }, { expiresIn: '30d' });
    
    // Update lastLoginAt
    await repos.userRepo.update(dbUser.id, { lastLoginAt: new Date() }).catch(err => {
      logger.warn('[Login] Failed to update lastLoginAt:', err.message);
    });
    
    // Build user response (exclude sensitive fields, match register shape)
    const { passwordHash: _pw, twoFactorSecret: _ts, twoFactorBackupCodes: _tbc, ...safeDbUser } = dbUser;
    const nameParts = (dbUser.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const userResponse = {
      ...safeDbUser,
      firstName,
      lastName,
      profilePicture: dbUser.avatar,
    };
    
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[Login] Generated JWT for user:', dbUser.id);
    }
    
    res.json(successResponse({
      user: userResponse,
      token,
      refreshToken,
      businesses: userBusinesses
    }));
  } catch (err) {
    logger.error('[Login] Error:', err);
    res.status(500).json(errorResponse('Login failed. Please try again.'));
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  // Invalidate all refresh tokens for this user by bumping their token version.
  // Existing access tokens remain valid until they expire (max 30 min), but no
  // new access token can be minted from an old refresh token.
  try {
    await repos.userRepo.update(req.user.id, { tokenVersion: { increment: 1 } });
  } catch (err) {
    logger.error('[Logout] Failed to bump token version:', err.message);
  }
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('[Logout] User logged out:', req.user.id);
  }
  res.json(successResponse(null, 'Logged out successfully'));
});

// Request password reset (sends reset email/link)
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(errorResponse('Email is required'));
    }

    // If email delivery isn't configured at all, fail loudly rather than
    // telling the user a reset link "has been sent". This check is
    // account-independent (it fires for every request regardless of whether
    // the account exists), so it leaks no information about account existence.
    if (process.env.NODE_ENV === 'production' && !getEmailTransporter()) {
      logger.error('[ForgotPassword] Email transporter not configured — cannot send reset emails.');
      Sentry.captureMessage('forgot-password requested but email transporter is not configured', 'error');
      return res.status(503).json(errorResponse('Email service is temporarily unavailable. Please try again later.', 'EMAIL_UNAVAILABLE'));
    }

    // Look up user
    const dbUser = await repos.userRepo.getByEmail(email);

    // Always return success to prevent email enumeration
    if (!dbUser) {
      return res.json(successResponse(null, 'If an account with that email exists, a reset link has been sent.'));
    }

    // Generate a short-lived reset token (15 minutes)
    const resetToken = generateToken({
      sub: dbUser.id,
      type: 'password_reset',
      email: dbUser.email
    }, { expiresIn: '15m' });

    // A transient send failure (transporter exists but SMTP errored) is logged
    // to Sentry, but we still return the uniform success message so the response
    // doesn't reveal whether the account exists.
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (sendErr) {
      logger.error('[ForgotPassword] Failed to send reset email:', sendErr);
      Sentry.captureException(sendErr);
    }

    res.json(successResponse(null, 'If an account with that email exists, a reset link has been sent.'));
  } catch (err) {
    logger.error('[ForgotPassword] Error:', err);
    res.status(500).json(errorResponse('Failed to process password reset request'));
  }
});

// Reset password with token
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json(errorResponse('Token and new password are required'));
    }

    if (newPassword.length > 128) {
      return res.status(400).json(errorResponse('Password must be 128 characters or less'));
    }

    // Validate password strength
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json(errorResponse(`Password must contain: ${passwordErrors.join(', ')}`));
    }

    // Verify the reset token
    const result = verifyToken(`Bearer ${token}`);
    if (result.error) {
      return res.status(401).json(errorResponse('Invalid or expired reset link. Please request a new one.'));
    }

    if (result.user.claims.type !== 'password_reset') {
      return res.status(401).json(errorResponse('Invalid token type'));
    }

    // Look up user
    const dbUser = await repos.userRepo.getById(result.user.id);
    if (!dbUser) {
      return res.status(404).json(errorResponse('User not found'));
    }

    // Hash and store new password, and invalidate all existing sessions
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await repos.userRepo.update(dbUser.id, { passwordHash, tokenVersion: { increment: 1 } });

    logger.debug('[ResetPassword] Password reset for user:', dbUser.id);

    res.json(successResponse(null, 'Password has been reset successfully. You can now log in with your new password.'));
  } catch (err) {
    logger.error('[ResetPassword] Error:', err);
    res.status(500).json(errorResponse('Failed to reset password'));
  }
});

// Refresh access token
app.post('/api/auth/refresh', authLimiter, async (req, res) => {
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

    // Reject refresh tokens issued before the user's current token version
    // (bumped on logout / password change). Missing claim is treated as 0 for
    // backwards compatibility with tokens issued before this feature.
    if ((result.user.claims.tv ?? 0) !== (dbUser.tokenVersion ?? 0)) {
      return res.status(401).json(errorResponse('Session has been revoked. Please log in again.'));
    }

    // Generate a new access token
    const newToken = generateToken({ 
      sub: dbUser.id, 
      email: dbUser.email,
      name: dbUser.name 
    });
    
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[Refresh] Generated new token for user:', dbUser.id);
    }
    
    // Generate a new refresh token (rotation)
    const newRefreshToken = generateToken({
      sub: dbUser.id,
      type: 'refresh',
      tv: dbUser.tokenVersion ?? 0
    }, { expiresIn: '30d' });

    res.json(successResponse({
      token: newToken,
      refreshToken: newRefreshToken,
    }));
  } catch (err) {
    logger.error('[Refresh] Error:', err);
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
    
    if (password.length > 128) {
      return res.status(400).json(errorResponse('Password must be 128 characters or less'));
    }

    // Validate password strength
    const passwordErrors = validatePassword(password);
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
    let dbUser;
    try {
      dbUser = await repos.userRepo.create({
        id: userId,
        name: `${firstName} ${lastName}`,
        email: email || null,
        phone: fullPhone,
        avatar: profilePicture || null,
        passwordHash,
      });
    } catch (createErr) {
      if (createErr.code === 'P2002') {
        return res.status(409).json(errorResponse('A user with these details already exists. Please try logging in.'));
      }
      throw createErr;
    }

    // Build user response object (exclude passwordHash)
    const { passwordHash: _ph, ...safeNewUser } = dbUser;
    const newUser = {
      ...safeNewUser,
      firstName,
      lastName,
      profilePicture: dbUser.avatar,
    };
    
    // Generate real JWT tokens
    const token = generateToken({ 
      sub: dbUser.id, 
      email: dbUser.email,
      name: dbUser.name 
    });
    const refreshToken = generateToken({ 
      sub: dbUser.id,
      type: 'refresh',
      tv: dbUser.tokenVersion ?? 0
    }, { expiresIn: '30d' });
    
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[Register] Created user:', dbUser.id, dbUser.email);
    }
    
    res.status(201).json(successResponse({
      user: newUser,
      token,
      refreshToken,
      businesses: [] // New user has no businesses yet
    }, 'Account created successfully'));
  } catch (err) {
    logger.error('[Register] Error:', err);
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
    
    if (newPassword.length > 128) {
      return res.status(400).json(errorResponse('Password must be 128 characters or less'));
    }

    // Validate new password strength (same rules as register)
    const passwordErrors = validatePassword(newPassword);
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
    
    // Hash and store new password, and invalidate all existing sessions
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await repos.userRepo.update(dbUser.id, { passwordHash: newPasswordHash, tokenVersion: { increment: 1 } });
    
    logger.debug('[ChangePassword] Password updated for user:', dbUser.id);
    
    res.json(successResponse({ message: 'Password changed successfully' }, 'Password changed successfully'));
  } catch (err) {
    logger.error('[ChangePassword] Error:', err);
    res.status(500).json(errorResponse('Failed to change password. Please try again.'));
  }
});

// ============================================================================
// Phone & Email OTP Verification (Twilio Verify)
// ============================================================================

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!sid || !token || !serviceSid) {
    logger.warn('[Twilio] Not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID in .env');
    return null;
  }

  twilioClient = require('twilio')(sid, token);
  return twilioClient;
}

// Send phone OTP via SMS
app.post('/api/auth/send-phone-otp', authLimiter, async (req, res) => {
  try {
    const { phone, countryCode } = req.body;

    if (!phone || !countryCode) {
      return res.status(400).json(errorResponse('Phone number and country code are required'));
    }

    const client = getTwilioClient();
    if (!client) {
      return res.status(503).json(errorResponse('SMS service is not configured'));
    }

    const fullNumber = countryCode + phone;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    await client.verify.v2.services(serviceSid)
      .verifications
      .create({ to: fullNumber, channel: 'sms' });

    logger.debug('[OTP] Phone verification sent to:', fullNumber);
    res.json(successResponse({ message: 'Verification code sent' }));
  } catch (err) {
    logger.error('[OTP] Send phone OTP error:', err.message);
    if (err.code === 60200) {
      return res.status(400).json(errorResponse('Invalid phone number'));
    }
    res.status(500).json(errorResponse('Failed to send verification code'));
  }
});

// Verify phone OTP
app.post('/api/auth/verify-phone', authLimiter, async (req, res) => {
  try {
    const { phone, countryCode, code } = req.body;

    if (!phone || !countryCode || !code) {
      return res.status(400).json(errorResponse('Phone, country code, and verification code are required'));
    }

    const client = getTwilioClient();
    if (!client) {
      return res.status(503).json(errorResponse('SMS service is not configured'));
    }

    const fullNumber = countryCode + phone;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    const check = await client.verify.v2.services(serviceSid)
      .verificationChecks
      .create({ to: fullNumber, code });

    if (check.status === 'approved') {
      logger.debug('[OTP] Phone verified:', fullNumber);
      res.json(successResponse(null, 'Phone number verified successfully'));
    } else {
      res.status(400).json(errorResponse('Incorrect verification code'));
    }
  } catch (err) {
    logger.error('[OTP] Verify phone error:', err.message);
    if (err.code === 60200) {
      return res.status(400).json(errorResponse('Invalid verification code'));
    }
    res.status(500).json(errorResponse('Verification failed'));
  }
});

// Send email OTP
app.post('/api/auth/send-email-otp', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(errorResponse('Email is required'));
    }

    const client = getTwilioClient();
    if (!client) {
      return res.status(503).json(errorResponse('Verification service is not configured'));
    }

    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    await client.verify.v2.services(serviceSid)
      .verifications
      .create({ to: email, channel: 'email' });

    logger.debug('[OTP] Email verification sent to:', email);
    res.json(successResponse({ message: 'Verification code sent to email' }));
  } catch (err) {
    logger.error('[OTP] Send email OTP error:', err.message);
    res.status(500).json(errorResponse('Failed to send verification code'));
  }
});

// Verify email OTP
app.post('/api/auth/verify-email', authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json(errorResponse('Email and verification code are required'));
    }

    const client = getTwilioClient();
    if (!client) {
      return res.status(503).json(errorResponse('Verification service is not configured'));
    }

    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    const check = await client.verify.v2.services(serviceSid)
      .verificationChecks
      .create({ to: email, code });

    if (check.status === 'approved') {
      logger.debug('[OTP] Email verified:', email);
      res.json(successResponse(null, 'Email verified successfully'));
    } else {
      res.status(400).json(errorResponse('Incorrect verification code'));
    }
  } catch (err) {
    logger.error('[OTP] Verify email error:', err.message);
    res.status(500).json(errorResponse('Verification failed'));
  }
});

// ============================================================================
// Two-Factor Authentication (2FA / TOTP)
// ============================================================================

// Begin 2FA setup - generate TOTP secret
app.post('/api/auth/2fa/setup', requireAuth, twoFactorLimiter, async (req, res) => {
  try {
    const { authenticator } = require('otplib');

    const dbUser = await repos.userRepo.getById(req.user.id);
    if (!dbUser) return res.status(404).json(errorResponse('User not found'));

    if (dbUser.twoFactorEnabled) {
      return res.status(400).json(errorResponse('Two-factor authentication is already enabled'));
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate otpauth URI for QR code
    const otpauthUrl = authenticator.keyuri(
      dbUser.email || dbUser.phone || dbUser.id,
      'NouPro',
      secret
    );

    // Store secret temporarily (not yet enabled)
    await repos.userRepo.update(req.user.id, { twoFactorSecret: secret });

    // Format secret for display (groups of 4)
    const formattedSecret = secret.match(/.{1,4}/g)?.join('-') || secret;

    res.json(successResponse({ secret: formattedSecret, otpauthUrl }));
  } catch (err) {
    logger.error('[2FA Setup] Error:', err);
    res.status(500).json(errorResponse('Failed to set up two-factor authentication'));
  }
});

// Verify setup code and enable 2FA
app.post('/api/auth/2fa/verify-setup', requireAuth, twoFactorLimiter, async (req, res) => {
  try {
    const { authenticator } = require('otplib');
    const crypto = require('crypto');
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json(errorResponse('A valid 6-digit code is required'));
    }

    const dbUser = await repos.userRepo.getById(req.user.id);
    if (!dbUser || !dbUser.twoFactorSecret) {
      return res.status(400).json(errorResponse('2FA setup not initiated'));
    }

    // Verify the TOTP code (allow 1 window tolerance)
    authenticator.options = { window: 1 };
    const isValid = authenticator.verify({ token: code, secret: dbUser.twoFactorSecret });
    if (!isValid) {
      return res.status(400).json(errorResponse('Invalid verification code. Please try again.'));
    }

    // Generate 8 backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex')
    );

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(c => bcrypt.hash(c, 10))
    );

    // Enable 2FA
    await repos.userRepo.update(req.user.id, {
      twoFactorEnabled: true,
      twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
    });

    logger.debug('[2FA] Enabled for user:', req.user.id);

    res.json(successResponse({
      backupCodes,
      message: 'Two-factor authentication enabled successfully',
    }));
  } catch (err) {
    logger.error('[2FA Verify Setup] Error:', err);
    res.status(500).json(errorResponse('Failed to verify two-factor code'));
  }
});

// Disable 2FA (requires password)
app.post('/api/auth/2fa/disable', requireAuth, twoFactorLimiter, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json(errorResponse('Password is required to disable 2FA'));
    }

    const dbUser = await repos.userRepo.getById(req.user.id);
    if (!dbUser) return res.status(404).json(errorResponse('User not found'));

    const valid = await bcrypt.compare(password, dbUser.passwordHash);
    if (!valid) {
      return res.status(401).json(errorResponse('Invalid password'));
    }

    await repos.userRepo.update(req.user.id, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    });

    logger.debug('[2FA] Disabled for user:', req.user.id);

    res.json(successResponse(null, 'Two-factor authentication disabled'));
  } catch (err) {
    logger.error('[2FA Disable] Error:', err);
    res.status(500).json(errorResponse('Failed to disable two-factor authentication'));
  }
});

// Verify 2FA code during login
app.post('/api/auth/2fa/verify', authLimiter, async (req, res) => {
  try {
    const { authenticator } = require('otplib');
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json(errorResponse('Temporary token and code are required'));
    }

    // Verify the temp token
    const result = verifyToken(`Bearer ${tempToken}`);
    if (result.error) {
      return res.status(401).json(errorResponse('Invalid or expired session'));
    }

    if (result.user.claims.type !== '2fa_pending') {
      return res.status(401).json(errorResponse('Invalid token type'));
    }

    const dbUser = await repos.userRepo.getById(result.user.id);
    if (!dbUser || !dbUser.twoFactorSecret) {
      return res.status(400).json(errorResponse('2FA not configured'));
    }

    // Try TOTP code first (allow 1 window tolerance)
    authenticator.options = { window: 1 };
    let isValid = authenticator.verify({ token: code, secret: dbUser.twoFactorSecret });

    // If TOTP fails, try backup codes
    if (!isValid && dbUser.twoFactorBackupCodes) {
      const hashedCodes = JSON.parse(dbUser.twoFactorBackupCodes);
      for (let i = 0; i < hashedCodes.length; i++) {
        const match = await bcrypt.compare(code, hashedCodes[i]);
        if (match) {
          isValid = true;
          hashedCodes.splice(i, 1);
          await repos.userRepo.update(dbUser.id, {
            twoFactorBackupCodes: JSON.stringify(hashedCodes),
          });
          break;
        }
      }
    }

    if (!isValid) {
      return res.status(400).json(errorResponse('Invalid verification code'));
    }

    // Issue real tokens (same as login success)
    const memberships = await repos.memberRepo.getByUserId(dbUser.id);
    const acceptedMs = memberships.filter(m => m.status === 'accepted');
    const bizResults = await Promise.all(acceptedMs.map(m => repos.businessRepo.getById(m.businessId)));
    const userBusinesses = acceptedMs
      .map((m, i) => {
        const business = bizResults[i];
        if (!business) return null;
        return {
          business: { ...business, capabilities: deriveCapabilities(business) },
          role: m.role,
          staff_entry: { id: m.id, status: m.status, role_type: m.roleType || null, joinedAt: m.createdAt },
        };
      })
      .filter(Boolean);

    const token = generateToken({
      sub: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
    });
    const refreshToken = generateToken({
      sub: dbUser.id,
      type: 'refresh',
      tv: dbUser.tokenVersion ?? 0,
    }, { expiresIn: '30d' });

    await repos.userRepo.update(dbUser.id, { lastLoginAt: new Date() }).catch(() => {});

    const { passwordHash: _pw, twoFactorSecret: _ts, twoFactorBackupCodes: _tbc, ...safeDbUser } = dbUser;
    const nameParts = (dbUser.name || '').split(' ');

    const userResponse = {
      ...safeDbUser,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      profilePicture: dbUser.avatar,
    };

    logger.debug('[2FA Verify] Login completed for user:', dbUser.id);

    res.json(successResponse({
      user: userResponse,
      token,
      refreshToken,
      businesses: userBusinesses,
    }));
  } catch (err) {
    logger.error('[2FA Verify] Error:', err);
    res.status(500).json(errorResponse('Failed to verify two-factor code'));
  }
});

// Update current user profile (requires authentication)
app.patch('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { avatar, name, jobTitle, description, address, language, privacySettings, phone, email, headline, bio, industry, coverPhoto, profileSlug } = req.body;

    // Build update payload with only allowed fields
    const updateData = {};
    if (avatar !== undefined) updateData.avatar = avatar;
    if (name !== undefined) updateData.name = name;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (language !== undefined) updateData.language = language;
    if (privacySettings !== undefined) updateData.privacySettings = privacySettings;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (headline !== undefined) updateData.headline = headline;
    if (bio !== undefined) updateData.bio = bio;
    if (industry !== undefined) updateData.industry = industry;
    if (coverPhoto !== undefined) updateData.coverPhoto = coverPhoto;
    if (profileSlug !== undefined) {
      // Uniqueness check for profile slug
      const { prisma } = require('./src/db/prisma');
      const existing = await prisma.user.findFirst({
        where: { profileSlug, NOT: { id: req.user.id } },
      });
      if (existing) {
        return res.status(409).json(errorResponse('This profile URL is already taken'));
      }
      updateData.profileSlug = profileSlug;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(errorResponse('No fields to update'));
    }

    const updatedUser = await repos.userRepo.update(req.user.id, updateData);

    // Strip sensitive fields from response
    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safeUser } = updatedUser;

    logger.debug('[UpdateProfile] Updated user:', req.user.id, Object.keys(updateData));

    res.json(successResponse(safeUser, 'Profile updated successfully'));
  } catch (err) {
    logger.error('[UpdateProfile] Error:', err);
    res.status(500).json(errorResponse('Failed to update profile'));
  }
});

// Get current user
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    // Use Prisma instead of in-memory array
    const user = await repos.userRepo.getById(req.user.id);
    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    // Strip sensitive fields from response
    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safeUser } = user;

    // Get businesses from Prisma (parallel fetch)
    const memberships = await repos.memberRepo.getByUserId(user.id);
    const acceptedMs = memberships.filter(m => m.status === 'accepted');
    const bizResults = await Promise.all(acceptedMs.map(m => repos.businessRepo.getById(m.businessId)));
    const userBusinesses = acceptedMs
      .map((m, i) => {
        const business = bizResults[i];
        if (!business) return null;
        return {
          business: { ...business, capabilities: deriveCapabilities(business) },
          role: m.role,
          staff_entry: { id: m.id, status: m.status, role_type: m.roleType || null, joinedAt: m.createdAt },
        };
      })
      .filter(Boolean);

    // Get connection count
    const connectionsCount = await repos.connectionRepo.countByUserId(user.id);

    res.json(successResponse({
      user: { ...safeUser, connectionsCount },
      businesses: userBusinesses,
    }));
  } catch (err) {
    logger.error('[GetMe] Error:', err);
    res.status(500).json(errorResponse('Failed to get user profile'));
  }
});

// Search users by name or email (for inviting staff, etc.)
// GET /api/users/search?q=
app.get('/api/users/search', requireAuth, async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) {
      return res.json(successResponse([]));
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
        NOT: { id: req.user.id },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    return res.json(successResponse(users));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get another user's profile by ID
app.get('/api/users/:userId', requireAuth, async (req, res) => {
  try {
    const user = await repos.userRepo.getById(req.params.userId);
    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safeUser } = user;

    // Check privacy: if not connected, strip private fields
    const isSelf = req.user.id === req.params.userId;
    const isConnected = isSelf ? true : await repos.connectionRepo.areConnected(req.user.id, req.params.userId);
    const privacy = user.privacySettings || {};

    if (!isSelf && !isConnected) {
      if (!privacy.show_email_publicly) delete safeUser.email;
      if (!privacy.show_phone_publicly) delete safeUser.phone;
      if (!privacy.show_address_publicly) delete safeUser.address;
    }

    // Get connection count
    const connectionsCount = await repos.connectionRepo.countByUserId(req.params.userId);

    // Get connection status with requester
    const connectionStatus = isSelf ? null : await repos.connectionRepo.getStatus(req.user.id, req.params.userId);

    // Get user's businesses (public info for experience section, parallel fetch)
    const memberships = await repos.memberRepo.getByUserId(req.params.userId);
    const acceptedMs = memberships.filter(m => m.status === 'accepted');
    const bizResults = await Promise.all(acceptedMs.map(m => repos.businessRepo.getById(m.businessId)));
    const experiences = acceptedMs
      .map((m, i) => {
        const biz = bizResults[i];
        if (!biz) return null;
        return {
          business_id: biz.id,
          business_name: biz.name,
          business_logo: biz.logoUrl,
          role: m.role,
          started_at: m.createdAt,
        };
      })
      .filter(Boolean);

    res.json(successResponse({
      ...safeUser,
      connectionsCount,
      connectionStatus,
      experiences,
    }));
  } catch (err) {
    logger.error('[GetUser] Error:', err);
    res.status(500).json(errorResponse('Failed to get user profile'));
  }
});

// ============================================================================
// BUSINESS ROUTES (with capabilities)
// ============================================================================

// Industry mapping from frontend registration types to backend industry values
const FRONTEND_TYPE_TO_INDUSTRY = {
  'Bookstore': 'general_retail',
  'Dealers & Resellers': 'general_retail',
  'Distributors & Wholesalers': 'general_retail',
  'Franchise & Chain Businesses': 'general_retail',
  'Hardware Store': 'general_retail',
  'Importers & Exporters': 'general_retail',
  'Library': 'services',
  'Manufacturers & Producers': 'production',
  'Others': 'other',
  'Pharmacy': 'cosmetics',
  'Restaurant': 'food_beverage',
  'Retailers': 'general_retail',
  'Showrooms': 'general_retail',
  'Supply Chain & Logistics': 'services',
  'Wholesalers & Cash and Carry': 'general_retail',
};

// Create a new business
app.post('/api/companies', requireAuth, async (req, res) => {
  try {
    const user = await repos.userRepo.getById(req.user.id);
    if (!user) {
      return res.status(404).json(errorResponse('User not found', 'USER_NOT_FOUND'));
    }

    const { name, type, industry, category, phone, email, website, address, latitude, longitude, businessHours, logoUrl } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json(errorResponse('Business name is required'));
    }
    if (name.trim().length > 100) {
      return res.status(400).json(errorResponse('Business name must be 100 characters or less'));
    }
    if (email && !email.includes('@')) {
      return res.status(400).json(errorResponse('Invalid email format'));
    }
    if (phone && phone.length > 30) {
      return res.status(400).json(errorResponse('Phone number must be 30 characters or less'));
    }
    if (latitude != null && (latitude < -90 || latitude > 90)) {
      return res.status(400).json(errorResponse('Latitude must be between -90 and 90'));
    }
    if (longitude != null && (longitude < -180 || longitude > 180)) {
      return res.status(400).json(errorResponse('Longitude must be between -180 and 180'));
    }

    // Resolve industry from frontend type or direct industry value
    const VALID_INDUSTRIES = ['food_beverage', 'general_retail', 'production', 'services', 'cosmetics', 'electronics', 'other'];
    const resolvedIndustry = (industry && VALID_INDUSTRIES.includes(industry))
      ? industry
      : (FRONTEND_TYPE_TO_INDUSTRY[type] || 'other');

    // Store business hours in settings JSON
    const settings = {};
    if (businessHours && Array.isArray(businessHours)) {
      settings.businessHours = businessHours;
    }

    // Create the business
    const businessId = uuidv4();
    const newBusiness = await repos.businessRepo.create({
      id: businessId,
      name: name.trim(),
      industry: resolvedIndustry,
      category: category || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      address: address || null,
      logoUrl: logoUrl || null,
      isPublished: false,
      subscriptionTier: 'FREE',
      settings,
    });

    // Create primary location if coordinates provided
    if (latitude != null && longitude != null) {
      const locationPayload = {
        id: 'loc-' + uuidv4().slice(0, 8),
        name: name.trim() + ' - Main',
        address: address || null,
        latitude,
        longitude,
        operatingMode: 'DEPENDENT',
        isPublic: false,
        isPrimary: true,
      };
      await repos.locationRepo.create(businessId, locationPayload);
    }

    // Create BusinessMember record for the creator as super_admin
    const memberId = uuidv4();
    const member = await repos.memberRepo.addBusinessMember({
      id: memberId,
      businessId,
      userId: user.id,
      role: 'super_admin',
      status: 'accepted',
    });

    const capabilities = deriveCapabilities(newBusiness);

    res.status(201).json(successResponse({
      business: { ...newBusiness, capabilities },
      role: 'super_admin',
      staff_entry: {
        id: member.id,
        status: 'accepted',
        role_type: null,
        joinedAt: member.createdAt,
      },
    }, 'Business created successfully'));
  } catch (err) {
    logger.error('[Create Business] Error:', err);
    res.status(500).json(errorResponse('Failed to create business. Please try again.'));
  }
});

// Get all businesses (for search/discovery)
app.get('/api/businesses', requireAuth, async (req, res) => {
  const businesses = await repos.businessRepo.list();
  // SECURITY (P0-4): strip internal/sensitive fields before returning
  const businessesWithCaps = businesses.map(b => ({
    ...stripSensitiveBusinessFields(b),
    capabilities: deriveCapabilities(b),
  }));
  res.json(successResponse(businessesWithCaps));
});

// Search published companies by name or industry
// GET /api/companies/search?q=&page=1&limit=20
app.get('/api/companies/search', requireAuth, async (req, res) => {
  try {
    const { q = '', page = '1', limit = '20', category = '', city = '' } = req.query;
    const take = Math.min(parseInt(limit) || 20, 50);
    const skip = ((parseInt(page) || 1) - 1) * take;

    const businesses = await prisma.business.findMany({
      where: {
        isPublished: true,
        ...(q.trim() ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { industry: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
        // Explore filters: by category and by city/region (matched against the address string,
        // since there is no dedicated city column).
        ...(typeof category === 'string' && category.trim()
          ? { category: { contains: category, mode: 'insensitive' } }
          : {}),
        ...(typeof city === 'string' && city.trim()
          ? { address: { contains: city, mode: 'insensitive' } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        industry: true,
        category: true,
        description: true,
        address: true,
        isVerified: true,
        _count: { select: { products: { where: { isListed: true } } } },
      },
      take,
      skip,
      orderBy: { name: 'asc' },
    });

    // Flatten the listed-product count so the client gets a plain `productsCount`.
    const result = businesses.map(({ _count, ...rest }) => ({
      ...rest,
      productsCount: _count?.products ?? 0,
    }));

    return res.json(successResponse(result));
  } catch (err) {
    return sendError(res, err);
  }
});

// ============================================================================
// OPPORTUNITY ROUTES (B2B requests / "looking for")
// ============================================================================

// Discovery list of open opportunities (optionally filtered; excludes the viewer's own business).
app.get('/api/opportunities', requireAuth, async (req, res) => {
  try {
    const { type, category, locationText, viewerBusinessId, page = '1', limit = '50' } = req.query;
    const take = Math.min(parseInt(limit) || 50, 100);
    const skip = ((parseInt(page) || 1) - 1) * take;
    const items = await repos.opportunityRepo.listDiscovery({
      type: type || undefined,
      category: category || undefined,
      locationText: locationText || undefined,
      excludeBusinessId: viewerBusinessId || undefined,
      take,
      skip,
    });
    const result = items.map(({ _count, ...rest }) => ({ ...rest, responseCount: _count?.responses ?? 0 }));
    return res.json(successResponse(result));
  } catch (err) {
    return sendError(res, err);
  }
});

// My business's opportunities (all statuses). NOTE: declared before /:id so "mine" isn't treated as an id.
app.get('/api/opportunities/mine', requireAuth, async (req, res) => {
  try {
    const businessId = req.query.businessId;
    if (!businessId) return res.status(400).json(errorResponse('businessId is required'));
    if (!(await requireBusinessMembership(req, res, businessId))) return;
    const items = await repos.opportunityRepo.getByBusinessId(businessId);
    const result = items.map(({ _count, ...rest }) => ({ ...rest, responseCount: _count?.responses ?? 0 }));
    return res.json(successResponse(result));
  } catch (err) {
    return sendError(res, err);
  }
});

// Single opportunity.
app.get('/api/opportunities/:id', requireAuth, async (req, res) => {
  try {
    const opp = await repos.opportunityRepo.getById(req.params.id);
    if (!opp) return res.status(404).json(errorResponse('Opportunity not found'));
    const { _count, ...rest } = opp;
    return res.json(successResponse({ ...rest, responseCount: _count?.responses ?? 0 }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Create an opportunity (paid tiers only).
app.post('/api/opportunities', requireAuth, async (req, res) => {
  try {
    const { businessId, title, description, type, category, budgetMin, budgetMax, currency, locationText, expiresAt } = req.body;
    if (!businessId) return res.status(400).json(errorResponse('businessId is required'));
    if (!(await requireBusinessMembership(req, res, businessId))) return;
    if (!title || !title.trim()) return res.status(400).json(errorResponse('Title is required'));

    const business = await repos.businessRepo.getById(businessId);
    if (!business) return res.status(404).json(errorResponse('Business not found'));
    if (!deriveCapabilities(business).canPostOpportunities) {
      return res.status(403).json(paywallResponse('Upgrade your plan to post opportunities', 'post_opportunity', 'pro'));
    }

    const created = await repos.opportunityRepo.create({
      businessId,
      title: title.trim(),
      description: description || null,
      type: type || 'buying',
      category: category || null,
      budgetMin: budgetMin != null && budgetMin !== '' ? Number(budgetMin) : null,
      budgetMax: budgetMax != null && budgetMax !== '' ? Number(budgetMax) : null,
      currency: currency || 'MUR',
      locationText: locationText || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdByUserId: req.user.id,
    });
    return res.status(201).json(successResponse(created, 'Opportunity created'));
  } catch (err) {
    return sendError(res, err);
  }
});

// Update / close an opportunity.
app.patch('/api/opportunities/:id', requireAuth, async (req, res) => {
  try {
    const opp = await repos.opportunityRepo.getById(req.params.id);
    if (!opp) return res.status(404).json(errorResponse('Opportunity not found'));
    if (!(await requireBusinessMembership(req, res, opp.businessId))) return;

    const { title, description, type, category, budgetMin, budgetMax, currency, locationText, status, expiresAt } = req.body;
    const patch = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(category !== undefined && { category }),
      ...(budgetMin !== undefined && { budgetMin: budgetMin != null && budgetMin !== '' ? Number(budgetMin) : null }),
      ...(budgetMax !== undefined && { budgetMax: budgetMax != null && budgetMax !== '' ? Number(budgetMax) : null }),
      ...(currency !== undefined && { currency }),
      ...(locationText !== undefined && { locationText }),
      ...(status !== undefined && { status }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    };
    const updated = await repos.opportunityRepo.update(req.params.id, patch);
    return res.json(successResponse(updated, 'Opportunity updated'));
  } catch (err) {
    return sendError(res, err);
  }
});

// Delete an opportunity.
app.delete('/api/opportunities/:id', requireAuth, async (req, res) => {
  try {
    const opp = await repos.opportunityRepo.getById(req.params.id);
    if (!opp) return res.status(404).json(errorResponse('Opportunity not found'));
    if (!(await requireBusinessMembership(req, res, opp.businessId))) return;
    await repos.opportunityRepo.delete(req.params.id);
    return res.json(successResponse(null, 'Opportunity deleted'));
  } catch (err) {
    return sendError(res, err);
  }
});

// Respond to an opportunity (any member business, once).
app.post('/api/opportunities/:id/respond', requireAuth, async (req, res) => {
  try {
    const opp = await repos.opportunityRepo.getById(req.params.id);
    if (!opp) return res.status(404).json(errorResponse('Opportunity not found'));
    const { responderBusinessId, message } = req.body;
    if (!responderBusinessId) return res.status(400).json(errorResponse('responderBusinessId is required'));
    if (!(await requireBusinessMembership(req, res, responderBusinessId))) return;
    if (responderBusinessId === opp.businessId) {
      return res.status(400).json(errorResponse('You cannot respond to your own opportunity'));
    }
    try {
      const created = await repos.opportunityRepo.createResponse({
        opportunityId: opp.id,
        responderBusinessId,
        message: message || null,
        createdByUserId: req.user.id,
      });
      return res.status(201).json(successResponse(created, 'Response sent'));
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(409).json(errorResponse('Your business has already responded'));
      }
      throw e;
    }
  } catch (err) {
    return sendError(res, err);
  }
});

// List responses to an opportunity (owner business only).
app.get('/api/opportunities/:id/responses', requireAuth, async (req, res) => {
  try {
    const opp = await repos.opportunityRepo.getById(req.params.id);
    if (!opp) return res.status(404).json(errorResponse('Opportunity not found'));
    if (!(await requireBusinessMembership(req, res, opp.businessId))) return;
    const responses = await repos.opportunityRepo.listResponses(opp.id);
    return res.json(successResponse(responses));
  } catch (err) {
    return sendError(res, err);
  }
});

// ============================================================================
// EVENT ROUTES (B2B networking / workshops / conferences)
// ============================================================================

// Upcoming events (optionally filtered).
app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const { type, locationText, isOnline, page = '1', limit = '50' } = req.query;
    const take = Math.min(parseInt(limit) || 50, 100);
    const skip = ((parseInt(page) || 1) - 1) * take;
    const items = await repos.eventRepo.listUpcoming({
      type: type || undefined,
      locationText: locationText || undefined,
      isOnline: isOnline === undefined ? undefined : isOnline === 'true',
      take,
      skip,
    });
    const result = items.map(({ _count, ...rest }) => ({ ...rest, rsvpCount: _count?.rsvps ?? 0 }));
    return res.json(successResponse(result));
  } catch (err) {
    return sendError(res, err);
  }
});

// Events organized by my business. NOTE: declared before /:id so "mine" isn't treated as an id.
app.get('/api/events/mine', requireAuth, async (req, res) => {
  try {
    const businessId = req.query.businessId;
    if (!businessId) return res.status(400).json(errorResponse('businessId is required'));
    if (!(await requireBusinessMembership(req, res, businessId))) return;
    const items = await repos.eventRepo.getByBusinessId(businessId);
    const result = items.map(({ _count, ...rest }) => ({ ...rest, rsvpCount: _count?.rsvps ?? 0 }));
    return res.json(successResponse(result));
  } catch (err) {
    return sendError(res, err);
  }
});

// Single event.
app.get('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const ev = await repos.eventRepo.getById(req.params.id);
    if (!ev) return res.status(404).json(errorResponse('Event not found'));
    const { _count, ...rest } = ev;
    return res.json(successResponse({ ...rest, rsvpCount: _count?.rsvps ?? 0 }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Create an event (paid tiers only).
app.post('/api/events', requireAuth, async (req, res) => {
  try {
    const { businessId, title, description, type, startAt, endAt, locationText, isOnline, onlineUrl, coverImageUrl, capacity } = req.body;
    if (!businessId) return res.status(400).json(errorResponse('businessId is required'));
    if (!(await requireBusinessMembership(req, res, businessId))) return;
    if (!title || !title.trim()) return res.status(400).json(errorResponse('Title is required'));
    if (!startAt) return res.status(400).json(errorResponse('Start date/time is required'));

    const business = await repos.businessRepo.getById(businessId);
    if (!business) return res.status(404).json(errorResponse('Business not found'));
    if (!deriveCapabilities(business).canHostEvents) {
      return res.status(403).json(paywallResponse('Upgrade your plan to host events', 'host_event', 'pro'));
    }

    const created = await repos.eventRepo.create({
      businessId,
      title: title.trim(),
      description: description || null,
      type: type || 'networking',
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      locationText: locationText || null,
      isOnline: !!isOnline,
      onlineUrl: onlineUrl || null,
      coverImageUrl: coverImageUrl || null,
      capacity: capacity != null && capacity !== '' ? parseInt(capacity) : null,
      createdByUserId: req.user.id,
    });
    return res.status(201).json(successResponse(created, 'Event created'));
  } catch (err) {
    return sendError(res, err);
  }
});

// Update / cancel an event.
app.patch('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const ev = await repos.eventRepo.getById(req.params.id);
    if (!ev) return res.status(404).json(errorResponse('Event not found'));
    if (!(await requireBusinessMembership(req, res, ev.businessId))) return;

    const { title, description, type, startAt, endAt, locationText, isOnline, onlineUrl, coverImageUrl, capacity, status } = req.body;
    const patch = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(startAt !== undefined && { startAt: new Date(startAt) }),
      ...(endAt !== undefined && { endAt: endAt ? new Date(endAt) : null }),
      ...(locationText !== undefined && { locationText }),
      ...(isOnline !== undefined && { isOnline: !!isOnline }),
      ...(onlineUrl !== undefined && { onlineUrl }),
      ...(coverImageUrl !== undefined && { coverImageUrl }),
      ...(capacity !== undefined && { capacity: capacity != null && capacity !== '' ? parseInt(capacity) : null }),
      ...(status !== undefined && { status }),
    };
    const updated = await repos.eventRepo.update(req.params.id, patch);
    return res.json(successResponse(updated, 'Event updated'));
  } catch (err) {
    return sendError(res, err);
  }
});

// Delete an event.
app.delete('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const ev = await repos.eventRepo.getById(req.params.id);
    if (!ev) return res.status(404).json(errorResponse('Event not found'));
    if (!(await requireBusinessMembership(req, res, ev.businessId))) return;
    await repos.eventRepo.delete(req.params.id);
    return res.json(successResponse(null, 'Event deleted'));
  } catch (err) {
    return sendError(res, err);
  }
});

// RSVP to an event (upsert; one per business).
app.post('/api/events/:id/rsvp', requireAuth, async (req, res) => {
  try {
    const ev = await repos.eventRepo.getById(req.params.id);
    if (!ev) return res.status(404).json(errorResponse('Event not found'));
    const { businessId, status } = req.body;
    if (!businessId) return res.status(400).json(errorResponse('businessId is required'));
    if (!(await requireBusinessMembership(req, res, businessId))) return;
    const rsvp = await repos.eventRepo.upsertRsvp({
      eventId: ev.id,
      businessId,
      userId: req.user.id,
      status: status || 'going',
    });
    return res.json(successResponse(rsvp, 'RSVP saved'));
  } catch (err) {
    return sendError(res, err);
  }
});

// List RSVPs for an event (organizer business only).
app.get('/api/events/:id/rsvps', requireAuth, async (req, res) => {
  try {
    const ev = await repos.eventRepo.getById(req.params.id);
    if (!ev) return res.status(404).json(errorResponse('Event not found'));
    if (!(await requireBusinessMembership(req, res, ev.businessId))) return;
    const rsvps = await repos.eventRepo.listRsvps(ev.id);
    return res.json(successResponse(rsvps));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get single business with capabilities
app.get('/api/companies/:companyId', optionalAuth, async (req, res) => {
  const business = await repos.businessRepo.getById(req.params.companyId);
  if (!business) {
    return res.status(404).json(errorResponse('Business not found'));
  }

  const businessLocations = await repos.locationRepo.getByBusinessId(business.id);
  const capabilities = deriveCapabilities(business);

  // Follow data + people preview
  const viewerUserId = req.user?.id;
  const [followersCount, isFollowedByViewer, peoplePreview] = await Promise.all([
    prisma.businessFollow.count({ where: { businessId: business.id } }),
    viewerUserId
      ? prisma.businessFollow.findUnique({
          where: { userId_businessId: { userId: viewerUserId, businessId: business.id } },
        }).then(f => !!f)
      : Promise.resolve(false),
    prisma.businessMember.findMany({
      where: { businessId: business.id, status: 'accepted' },
      include: { user: { select: { id: true, name: true, avatar: true, jobTitle: true } } },
      orderBy: { createdAt: 'asc' },
      take: 5,
    }).then(members => members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      avatar: m.user.avatar,
      jobTitle: m.user.jobTitle,
      role: m.role,
    }))),
  ]);

  // Business-to-business connection status (only when the viewer is acting as a business).
  // Lets the frontend render Connect / Pending / Accept / Connected on the OTHER_BUSINESS screen.
  let businessConnectionStatus = null;
  const viewerBusinessId = req.query.viewerBusinessId;
  if (viewerBusinessId && viewerUserId && viewerBusinessId !== business.id) {
    const viewerMember = await findBusinessMember(viewerBusinessId, viewerUserId);
    if (viewerMember) {
      businessConnectionStatus = await repos.connectionRepo.getBusinessConnectionStatus(
        viewerBusinessId,
        business.id,
      );
    }
  }

  // SECURITY (P0-4): only ACCEPTED members of this business may see internal/sensitive fields
  // (subscriptionTier, settings, billing + payment IDs). Strip them for everyone else.
  // isBusinessMember enforces status === 'accepted' (pending invites are not members).
  const isMember = viewerUserId ? await isBusinessMember(business.id, viewerUserId) : false;
  const baseBusiness = isMember ? business : stripSensitiveBusinessFields(business);

  res.json(successResponse({
    ...baseBusiness,
    capabilities,
    locations: businessLocations,
    followersCount,
    isFollowedByViewer,
    businessConnectionStatus,
    peoplePreview,
  }));
});

// Update business
app.patch('/api/companies/:companyId', requireAuth, async (req, res) => {
  // SECURITY: Require business admin (settings, profile changes are admin-only)
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  const existing = await repos.businessRepo.getById(req.params.companyId);
  if (!existing) {
    return res.status(404).json(errorResponse('Business not found'));
  }

  // Don't allow changing subscription tier or publish status via this endpoint
  const { subscriptionTier, billingPeriod: _bp, currentPeriodEnd: _cpe, isPublished: _ip, ...allowedUpdates } = req.body;

  // SECURITY: If isPublished is being set, verify plan allows it
  if (req.body.isPublished !== undefined) {
    const capabilities = deriveCapabilities(existing);
    if (req.body.isPublished === true && !capabilities.canPublishBusinessPage) {
      return res.status(403).json(paywallResponse('Upgrade your plan to publish your business page', 'publish_business_page', 'pro'));
    }
    allowedUpdates.isPublished = req.body.isPublished;
  }

  // Input validation
  if (allowedUpdates.name !== undefined) {
    if (typeof allowedUpdates.name !== 'string' || !allowedUpdates.name.trim()) {
      return res.status(400).json(errorResponse('Business name cannot be empty'));
    }
    if (allowedUpdates.name.trim().length > 100) {
      return res.status(400).json(errorResponse('Business name must be 100 characters or less'));
    }
    allowedUpdates.name = allowedUpdates.name.trim();
  }
  if (allowedUpdates.email !== undefined && allowedUpdates.email !== null && allowedUpdates.email !== '') {
    if (!allowedUpdates.email.includes('@')) {
      return res.status(400).json(errorResponse('Invalid email format'));
    }
  }
  if (allowedUpdates.website !== undefined && allowedUpdates.website !== null && allowedUpdates.website !== '') {
    if (!allowedUpdates.website.startsWith('http://') && !allowedUpdates.website.startsWith('https://')) {
      return res.status(400).json(errorResponse('Website must start with http:// or https://'));
    }
  }
  if (allowedUpdates.description !== undefined && allowedUpdates.description !== null) {
    if (typeof allowedUpdates.description === 'string' && allowedUpdates.description.length > 2000) {
      return res.status(400).json(errorResponse('Description must be 2000 characters or less'));
    }
  }
  if (allowedUpdates.phone !== undefined && allowedUpdates.phone !== null && allowedUpdates.phone !== '') {
    if (allowedUpdates.phone.length > 30) {
      return res.status(400).json(errorResponse('Phone number must be 30 characters or less'));
    }
  }

  // Merge settings instead of overwriting
  if (allowedUpdates.settings) {
    // SECURITY: Check plan capability before enabling price privacy
    if (allowedUpdates.settings.pricePrivacyEnabled === true) {
      const capabilities = deriveCapabilities(existing);
      if (!capabilities.canEnablePricePrivacy) {
        return res.status(403).json(paywallResponse('Upgrade to Business for price privacy', 'price_privacy', 'business'));
      }
    }
    allowedUpdates.settings = {
      ...(existing.settings || {}),
      ...allowedUpdates.settings,
    };
  }

  const updated = await repos.businessRepo.update(req.params.companyId, allowedUpdates);

  res.json(successResponse({
    ...updated,
    capabilities: deriveCapabilities(updated),
  }));
});

// Update business subscription
app.patch('/api/companies/:companyId/subscription', requireAuth, async (req, res) => {
  // SECURITY: Require business admin (super_admin only should change subscription)
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  // Verify caller is super_admin specifically
  const userId = req.user?.id;
  const membership = await findBusinessMember(req.params.companyId, userId);
  if (!membership || membership.role !== 'super_admin') {
    return res.status(403).json(errorResponse('Only the business owner (super admin) can change the subscription', 'PERMISSION_DENIED'));
  }

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
  // SECURITY (P0-4): Strip internal/sensitive fields (incl. billing + payment IDs) from public listing
  const publicBusinesses = businesses.map(stripSensitiveBusinessFields);
  res.json(successResponse(publicBusinesses));
});

// PUT /api/companies/:id -- legacy route used by businessStore
app.put('/api/companies/:id', requireAuth, async (req, res) => {
  // SECURITY: Require business admin
  if (!(await requireBusinessAdmin(req, res, req.params.id))) return;

  const existing = await repos.businessRepo.getById(req.params.id);
  if (!existing) {
    return res.status(404).json(errorResponse('Company not found'));
  }

  // SECURITY: Whitelist allowed fields -- prevent mass assignment
  const { name, description, email, phone, address, logoUrl, coverUrl, website,
          industry, businessType, tagline } = req.body;
  const safeUpdates = {};
  if (name !== undefined) safeUpdates.name = name;
  if (description !== undefined) safeUpdates.description = description;
  if (email !== undefined) safeUpdates.email = email;
  if (phone !== undefined) safeUpdates.phone = phone;
  if (address !== undefined) safeUpdates.address = address;
  if (logoUrl !== undefined) safeUpdates.logoUrl = logoUrl;
  if (coverUrl !== undefined) safeUpdates.coverUrl = coverUrl;
  if (website !== undefined) safeUpdates.website = website;
  if (industry !== undefined) safeUpdates.industry = industry;
  if (businessType !== undefined) safeUpdates.businessType = businessType;
  if (tagline !== undefined) safeUpdates.tagline = tagline;

  const updated = await repos.businessRepo.update(req.params.id, safeUpdates);

    res.json(successResponse({
    ...updated,
    capabilities: deriveCapabilities(updated),
    }));
});

// ============================================================================
// CONNECTION ROUTES (user-to-user and business-to-business)
// ============================================================================

// Send a connection request
app.post('/api/connections/request', requireAuth, async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) {
      return res.status(400).json(errorResponse('receiverId is required'));
    }
    if (receiverId === req.user.id) {
      return res.status(400).json(errorResponse('Cannot connect with yourself'));
    }

    // Check receiver exists
    const receiver = await repos.userRepo.getById(receiverId);
    if (!receiver) {
      return res.status(404).json(errorResponse('User not found'));
    }

    // Refuse if either side has blocked the other.
    if (await repos.blockRepo.isBlocked(req.user.id, receiverId)) {
      return res.status(403).json(errorResponse('You cannot connect with this user'));
    }

    // Check for existing connection
    const existing = await repos.connectionRepo.findExisting(req.user.id, receiverId);
    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json(errorResponse('Already connected'));
      }
      if (existing.status === 'pending') {
        return res.status(409).json(errorResponse('Connection request already pending'));
      }
      // If rejected, allow re-request by removing old one
      await repos.connectionRepo.removeConnection(existing.id);
    }

    const connection = await repos.connectionRepo.sendRequest(req.user.id, receiverId);
    res.status(201).json(successResponse(connection, 'Connection request sent'));
  } catch (err) {
    logger.error('[ConnectionRequest] Error:', err);
    res.status(500).json(errorResponse('Failed to send connection request'));
  }
});

// Accept a connection request
app.patch('/api/connections/:id/accept', requireAuth, async (req, res) => {
  try {
    const connection = await repos.connectionRepo.getById(req.params.id);
    if (!connection) {
      return res.status(404).json(errorResponse('Connection not found'));
    }
    if (connection.receiverId !== req.user.id) {
      return res.status(403).json(errorResponse('Only the receiver can accept'));
    }
    if (connection.status !== 'pending') {
      return res.status(400).json(errorResponse('Connection is not pending'));
    }

    const updated = await repos.connectionRepo.acceptRequest(req.params.id);
    res.json(successResponse(updated, 'Connection accepted'));
  } catch (err) {
    logger.error('[ConnectionAccept] Error:', err);
    res.status(500).json(errorResponse('Failed to accept connection'));
  }
});

// Reject a connection request
app.patch('/api/connections/:id/reject', requireAuth, async (req, res) => {
  try {
    const connection = await repos.connectionRepo.getById(req.params.id);
    if (!connection) {
      return res.status(404).json(errorResponse('Connection not found'));
    }
    if (connection.receiverId !== req.user.id) {
      return res.status(403).json(errorResponse('Only the receiver can reject'));
    }
    if (connection.status !== 'pending') {
      return res.status(400).json(errorResponse('Connection is not pending'));
    }

    const updated = await repos.connectionRepo.rejectRequest(req.params.id);
    res.json(successResponse(updated, 'Connection rejected'));
  } catch (err) {
    logger.error('[ConnectionReject] Error:', err);
    res.status(500).json(errorResponse('Failed to reject connection'));
  }
});

// Remove a connection
app.delete('/api/connections/:id', requireAuth, async (req, res) => {
  try {
    const connection = await repos.connectionRepo.getById(req.params.id);
    if (!connection) {
      return res.status(404).json(errorResponse('Connection not found'));
    }
    // Either party can remove the connection
    if (connection.senderId !== req.user.id && connection.receiverId !== req.user.id) {
      return res.status(403).json(errorResponse('Not your connection'));
    }

    await repos.connectionRepo.removeConnection(req.params.id);
    res.json(successResponse(null, 'Connection removed'));
  } catch (err) {
    logger.error('[ConnectionRemove] Error:', err);
    res.status(500).json(errorResponse('Failed to remove connection'));
  }
});

// List user's accepted connections
app.get('/api/connections', requireAuth, async (req, res) => {
  try {
    const connections = await repos.connectionRepo.listByUserId(req.user.id, 'accepted');
    // Hide any connection with a blocked user (either direction) as a safety net.
    const blockedIds = new Set(await repos.blockRepo.getBlockedIds(req.user.id));
    // Map to return the other user in each connection
    const result = connections
      .filter(conn => {
        const otherId = conn.senderId === req.user.id ? conn.receiverId : conn.senderId;
        return !blockedIds.has(otherId);
      })
      .map(conn => {
        const otherUser = conn.senderId === req.user.id ? conn.receiver : conn.sender;
        const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safeUser } = otherUser;
        return {
          connectionId: conn.id,
          user: safeUser,
          connectedAt: conn.updatedAt,
        };
      });
    res.json(successResponse(result));
  } catch (err) {
    logger.error('[ConnectionsList] Error:', err);
    res.status(500).json(errorResponse('Failed to list connections'));
  }
});

// List pending connection requests (received)
app.get('/api/connections/pending', requireAuth, async (req, res) => {
  try {
    const pending = await repos.connectionRepo.listPending(req.user.id);
    const result = pending.map(conn => {
      const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safeSender } = conn.sender;
      return {
        connectionId: conn.id,
        sender: safeSender,
        requestedAt: conn.createdAt,
      };
    });
    res.json(successResponse(result));
  } catch (err) {
    logger.error('[ConnectionsPending] Error:', err);
    res.status(500).json(errorResponse('Failed to list pending connections'));
  }
});

// ============================================================================
// REPORTS (generic content moderation for users & businesses;
// products keep their own /api/products/:productId/report route)
// ============================================================================
const REPORT_REASONS = ['inappropriate', 'spam', 'harassment', 'impersonation', 'scam', 'other'];
const REPORTABLE_TYPES = ['user', 'business'];

app.post('/api/reports', requireAuth, suggestionLimiter, async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body || {};

    if (!REPORTABLE_TYPES.includes(targetType)) {
      return res.status(400).json(errorResponse('A valid targetType is required'));
    }
    if (!targetId) {
      return res.status(400).json(errorResponse('targetId is required'));
    }
    if (!reason || !REPORT_REASONS.includes(reason)) {
      return res.status(400).json(errorResponse('A valid reason is required'));
    }

    // Verify the target exists and prevent self-reporting.
    if (targetType === 'user') {
      if (targetId === req.user.id) {
        return res.status(400).json(errorResponse('You cannot report yourself'));
      }
      const target = await repos.userRepo.getById(targetId);
      if (!target) return res.status(404).json(errorResponse('User not found'));
    } else {
      const target = await repos.businessRepo.getById(targetId);
      if (!target) return res.status(404).json(errorResponse('Business not found'));
    }

    const report = await prisma.report.create({
      data: {
        id: uuidv4(),
        targetType,
        targetId,
        reason,
        details: details ? String(details).slice(0, 1000) : null,
        reportedByUserId: req.user?.id || null,
        status: 'open',
      },
    });

    logger.info('[report] entity reported', { targetType, targetId, reason, by: req.user?.id });
    res.status(201).json(successResponse({ id: report.id }, 'Report submitted'));
  } catch (e) {
    logger.error('Error submitting report:', e);
    res.status(500).json(errorResponse('Failed to submit report'));
  }
});

// ============================================================================
// USER BLOCKS (a block in either direction is treated as mutual — see blockRepo.isBlocked)
// ============================================================================

// Block a user. Also removes any connection between the two so they drop off each
// other's connection lists; chat lists hide their 1:1 thread (see chat endpoints).
app.post('/api/users/:userId/block', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json(errorResponse('You cannot block yourself'));
    }
    const target = await repos.userRepo.getById(userId);
    if (!target) {
      return res.status(404).json(errorResponse('User not found'));
    }

    await repos.blockRepo.blockUser(req.user.id, userId);

    // Remove any existing connection (pending or accepted) between the two.
    const existing = await repos.connectionRepo.findExisting(req.user.id, userId);
    if (existing) {
      await repos.connectionRepo.removeConnection(existing.id);
    }

    res.status(201).json(successResponse(null, 'User blocked'));
  } catch (err) {
    logger.error('[BlockUser] Error:', err);
    res.status(500).json(errorResponse('Failed to block user'));
  }
});

// Unblock a user
app.delete('/api/users/:userId/block', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    await repos.blockRepo.unblockUser(req.user.id, userId);
    res.json(successResponse(null, 'User unblocked'));
  } catch (err) {
    logger.error('[UnblockUser] Error:', err);
    res.status(500).json(errorResponse('Failed to unblock user'));
  }
});

// List users the current user has blocked. (Path is /api/blocks to avoid colliding
// with the /api/users/:userId param route.)
app.get('/api/blocks', requireAuth, async (req, res) => {
  try {
    const blocks = await repos.blockRepo.listBlocked(req.user.id);
    const result = blocks.map((b) => {
      const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...safeUser } = b.blocked;
      return { blockedAt: b.createdAt, user: safeUser };
    });
    res.json(successResponse(result));
  } catch (err) {
    logger.error('[BlocksList] Error:', err);
    res.status(500).json(errorResponse('Failed to list blocked users'));
  }
});

// ============================================================================
// BUSINESS CONNECTION ROUTES
// ============================================================================

// Send a business connection request
app.post('/api/business-connections/request', requireAuth, async (req, res) => {
  try {
    const { requesterBusinessId, targetBusinessId } = req.body;
    if (!requesterBusinessId || !targetBusinessId) {
      return res.status(400).json(errorResponse('requesterBusinessId and targetBusinessId are required'));
    }
    if (requesterBusinessId === targetBusinessId) {
      return res.status(400).json(errorResponse('Cannot connect with yourself'));
    }

    // Verify membership in requester business
    if (!(await requireBusinessMembership(req, res, requesterBusinessId))) return;

    // Check target exists
    const target = await repos.businessRepo.getById(targetBusinessId);
    if (!target) {
      return res.status(404).json(errorResponse('Target business not found'));
    }

    // Check for existing
    const existing = await repos.connectionRepo.findExistingBusinessConnection(requesterBusinessId, targetBusinessId);
    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json(errorResponse('Already connected'));
      }
      if (existing.status === 'pending') {
        return res.status(409).json(errorResponse('Connection request already pending'));
      }
      await repos.connectionRepo.removeBusinessConnection(existing.id);
    }

    const connection = await repos.connectionRepo.sendBusinessRequest(requesterBusinessId, targetBusinessId);
    res.status(201).json(successResponse(connection, 'Business connection request sent'));
  } catch (err) {
    logger.error('[BizConnectionRequest] Error:', err);
    res.status(500).json(errorResponse('Failed to send business connection request'));
  }
});

// Accept a business connection request
app.patch('/api/business-connections/:id/accept', requireAuth, async (req, res) => {
  try {
    const connection = await repos.connectionRepo.getBusinessConnectionById(req.params.id);
    if (!connection) {
      return res.status(404).json(errorResponse('Connection not found'));
    }
    // Verify membership in target business
    if (!(await requireBusinessMembership(req, res, connection.targetBusinessId))) return;
    if (connection.status !== 'pending') {
      return res.status(400).json(errorResponse('Connection is not pending'));
    }

    const updated = await repos.connectionRepo.acceptBusinessRequest(req.params.id);
    res.json(successResponse(updated, 'Business connection accepted'));
  } catch (err) {
    logger.error('[BizConnectionAccept] Error:', err);
    res.status(500).json(errorResponse('Failed to accept business connection'));
  }
});

// Reject a business connection request
app.patch('/api/business-connections/:id/reject', requireAuth, async (req, res) => {
  try {
    const connection = await repos.connectionRepo.getBusinessConnectionById(req.params.id);
    if (!connection) {
      return res.status(404).json(errorResponse('Connection not found'));
    }
    if (!(await requireBusinessMembership(req, res, connection.targetBusinessId))) return;
    if (connection.status !== 'pending') {
      return res.status(400).json(errorResponse('Connection is not pending'));
    }

    const updated = await repos.connectionRepo.rejectBusinessRequest(req.params.id);
    res.json(successResponse(updated, 'Business connection rejected'));
  } catch (err) {
    logger.error('[BizConnectionReject] Error:', err);
    res.status(500).json(errorResponse('Failed to reject business connection'));
  }
});

// Remove a business connection
app.delete('/api/business-connections/:id', requireAuth, async (req, res) => {
  try {
    const connection = await repos.connectionRepo.getBusinessConnectionById(req.params.id);
    if (!connection) {
      return res.status(404).json(errorResponse('Connection not found'));
    }
    // Either party can remove
    const isMemberOfRequester = await repos.memberRepo.isBusinessMember(connection.requesterBusinessId, req.user.id);
    const isMemberOfTarget = await repos.memberRepo.isBusinessMember(connection.targetBusinessId, req.user.id);
    if (!isMemberOfRequester && !isMemberOfTarget) {
      return res.status(403).json(errorResponse('Not your connection'));
    }

    await repos.connectionRepo.removeBusinessConnection(req.params.id);
    res.json(successResponse(null, 'Business connection removed'));
  } catch (err) {
    logger.error('[BizConnectionRemove] Error:', err);
    res.status(500).json(errorResponse('Failed to remove business connection'));
  }
});

// List business connections
app.get('/api/business-connections/:businessId', requireAuth, async (req, res) => {
  try {
    if (!(await requireBusinessMembership(req, res, req.params.businessId))) return;

    const connections = await repos.connectionRepo.listBusinessConnections(req.params.businessId, 'accepted');
    const result = connections.map(conn => {
      const otherBiz = conn.requesterBusinessId === req.params.businessId
        ? conn.targetBusiness
        : conn.requesterBusiness;
      return {
        connectionId: conn.id,
        // SECURITY (P0-4): strip the other company's internal/sensitive fields
        business: stripSensitiveBusinessFields(otherBiz),
        connectedAt: conn.updatedAt,
      };
    });
    res.json(successResponse(result));
  } catch (err) {
    logger.error('[BizConnectionsList] Error:', err);
    res.status(500).json(errorResponse('Failed to list business connections'));
  }
});

// List pending business connection requests
app.get('/api/business-connections/:businessId/pending', requireAuth, async (req, res) => {
  try {
    if (!(await requireBusinessMembership(req, res, req.params.businessId))) return;

    const pending = await repos.connectionRepo.listPendingBusinessRequests(req.params.businessId);
    const result = pending.map(conn => ({
      connectionId: conn.id,
      // SECURITY (P0-4): strip the requesting company's internal/sensitive fields
      requesterBusiness: stripSensitiveBusinessFields(conn.requesterBusiness),
      requestedAt: conn.createdAt,
    }));
    res.json(successResponse(result));
  } catch (err) {
    logger.error('[BizConnectionsPending] Error:', err);
    res.status(500).json(errorResponse('Failed to list pending business connections'));
  }
});

// ============================================================================
// BUSINESS FOLLOW ROUTES
// ============================================================================

// Follow a business
app.post('/api/businesses/:businessId/follow', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessId } = req.params;

    const business = await repos.businessRepo.getById(businessId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found'));
    }

    // Check if already following
    const existing = await prisma.businessFollow.findUnique({
      where: { userId_businessId: { userId, businessId } },
    });
    if (existing) {
      return res.status(409).json(errorResponse('Already following this business'));
    }

    const follow = await prisma.businessFollow.create({
      data: { userId, businessId },
    });

    const followersCount = await prisma.businessFollow.count({ where: { businessId } });

    res.status(201).json(successResponse({ follow, followersCount }));
  } catch (err) {
    logger.error('[FollowBusiness] Error:', err);
    res.status(500).json(errorResponse('Failed to follow business'));
  }
});

// Unfollow a business
app.delete('/api/businesses/:businessId/follow', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessId } = req.params;

    const existing = await prisma.businessFollow.findUnique({
      where: { userId_businessId: { userId, businessId } },
    });
    if (!existing) {
      return res.status(404).json(errorResponse('Not following this business'));
    }

    await prisma.businessFollow.delete({
      where: { userId_businessId: { userId, businessId } },
    });

    const followersCount = await prisma.businessFollow.count({ where: { businessId } });

    res.json(successResponse({ followersCount }));
  } catch (err) {
    logger.error('[UnfollowBusiness] Error:', err);
    res.status(500).json(errorResponse('Failed to unfollow business'));
  }
});

// Get followers for a business
app.get('/api/businesses/:businessId/followers', requireAuth, async (req, res) => {
  try {
    const { businessId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const [followers, count] = await Promise.all([
      prisma.businessFollow.findMany({
        where: { businessId },
        include: { user: { select: { id: true, name: true, avatar: true, jobTitle: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.businessFollow.count({ where: { businessId } }),
    ]);

    res.json(successResponse({
      followers: followers.map(f => f.user),
      followersCount: count,
      hasMore: offset + limit < count,
    }));
  } catch (err) {
    logger.error('[GetFollowers] Error:', err);
    res.status(500).json(errorResponse('Failed to get followers'));
  }
});

// Check follow status
app.get('/api/businesses/:businessId/follow-status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessId } = req.params;

    const [existing, count] = await Promise.all([
      prisma.businessFollow.findUnique({
        where: { userId_businessId: { userId, businessId } },
      }),
      prisma.businessFollow.count({ where: { businessId } }),
    ]);

    res.json(successResponse({
      isFollowing: !!existing,
      followersCount: count,
    }));
  } catch (err) {
    logger.error('[FollowStatus] Error:', err);
    res.status(500).json(errorResponse('Failed to check follow status'));
  }
});

// ============================================================================
// BUSINESS PEOPLE ROUTE
// ============================================================================

// Get public team members for a business
app.get('/api/businesses/:businessId/people', requireAuth, async (req, res) => {
  try {
    const { businessId } = req.params;

    const members = await prisma.businessMember.findMany({
      where: { businessId, status: 'accepted' },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, jobTitle: true, headline: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const people = members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      avatar: m.user.avatar,
      jobTitle: m.user.jobTitle,
      headline: m.user.headline,
      role: m.role,
    }));

    res.json(successResponse(people));
  } catch (err) {
    logger.error('[BusinessPeople] Error:', err);
    res.status(500).json(errorResponse('Failed to get business people'));
  }
});

// ============================================================================
// LOCATION ROUTES (with mode enforcement)
// ============================================================================

// Get locations for a business
app.get('/api/companies/:companyId/locations', requireAuth, async (req, res) => {
  const business = await repos.businessRepo.getById(req.params.companyId);
  const businessLocations = await repos.locationRepo.getByBusinessId(req.params.companyId);

  // SECURITY (P0-4): publicDisabledReason is an internal hint (e.g. "Enterprise plan required")
  // that can reveal the owner's subscription tier. Only expose it to accepted members.
  const isMember = req.user?.id ? await isBusinessMember(req.params.companyId, req.user.id) : false;

  const enrichedLocations = businessLocations.map(location => {
    const publicEffective = business ? isLocationPublicEffective(business, location) : false;
    const publicDisabledReason = isMember && business ? getPublicDisabledReason(business, location) : null;
    return { ...location, publicEffective, publicDisabledReason };
  });

  res.json(successResponse(enrichedLocations));
});

// Create location with mode enforcement
app.post('/api/companies/:companyId/locations', requireAuth, async (req, res) => {
  // SECURITY: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  const business = await repos.businessRepo.getById(req.params.companyId);
  if (!business) {
    return res.status(404).json(errorResponse('Business not found'));
  }

  const capabilities = deriveCapabilities(business);
  // SECURITY: Extract only allowed fields to prevent mass assignment
  let { operatingMode, locationType, name, address, phone, email, latitude, longitude } = req.body;

  // INPUT VALIDATION
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json(errorResponse('Location name is required'));
  }
  if (name.length > 100) {
    return res.status(400).json(errorResponse('Location name must be 100 characters or less'));
  }
  if (phone && phone.length > 30) {
    return res.status(400).json(errorResponse('Phone number must be 30 characters or less'));
  }
  if (email && typeof email === 'string' && email.length > 0) {
    if (!email.includes('@')) {
      return res.status(400).json(errorResponse('Invalid email format'));
    }
  }
  if (latitude != null && (latitude < -90 || latitude > 90)) {
    return res.status(400).json(errorResponse('Latitude must be between -90 and 90'));
  }
  if (longitude != null && (longitude < -180 || longitude > 180)) {
    return res.status(400).json(errorResponse('Longitude must be between -180 and 180'));
  }

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
    return res.status(403).json(paywallResponse(
      `Location limit reached (${capabilities.maxLocations}). Upgrade your subscription to add more locations.`,
      'location_limit_reached',
      capabilities.maxLocations >= 7 ? 'enterprise' : 'business'
    ));
  }

  const safeData = {};
  if (name !== undefined) safeData.name = name.trim();
  if (address !== undefined) safeData.address = address;
  if (phone !== undefined) safeData.phone = phone;
  if (email !== undefined) safeData.email = email;
  if (latitude !== undefined) safeData.latitude = latitude;
  if (longitude !== undefined) safeData.longitude = longitude;

  const newLocationPayload = {
    id: 'loc-' + uuidv4().slice(0, 8),
    operatingMode: operatingMode || LOCATION_MODES.DEPENDENT,
    isPublic: operatingMode === LOCATION_MODES.INDEPENDENT ? (req.body.isPublic ?? false) : false,
    locationType: locationType || null,
    ...safeData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const created = await repos.locationRepo.create(req.params.companyId, newLocationPayload);
  res.json(successResponse(created));
});

// Get single location
app.get('/api/locations/:locationId', requireAuth, async (req, res) => {
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
  // SECURITY: Extract only allowed fields to prevent mass assignment
  let { operatingMode, name, address, phone, email, latitude, longitude, isPublic, locationType } = req.body;

  // INPUT VALIDATION on update fields
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json(errorResponse('Location name cannot be empty'));
    }
    if (name.length > 100) {
      return res.status(400).json(errorResponse('Location name must be 100 characters or less'));
    }
  }
  if (phone !== undefined && phone && phone.length > 30) {
    return res.status(400).json(errorResponse('Phone number must be 30 characters or less'));
  }
  if (email !== undefined && email && typeof email === 'string') {
    if (email.length > 0 && !email.includes('@')) {
      return res.status(400).json(errorResponse('Invalid email format'));
    }
  }
  if (latitude != null && (latitude < -90 || latitude > 90)) {
    return res.status(400).json(errorResponse('Latitude must be between -90 and 90'));
  }
  if (longitude != null && (longitude < -180 || longitude > 180)) {
    return res.status(400).json(errorResponse('Longitude must be between -180 and 180'));
  }

  // Build safe updates object from whitelisted fields only
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (latitude !== undefined) updates.latitude = latitude;
  if (longitude !== undefined) updates.longitude = longitude;
  if (isPublic !== undefined) updates.isPublic = isPublic;
  if (locationType !== undefined) updates.locationType = locationType;

  // MODE CHANGE ENFORCEMENT with grandfathering policy
  if (operatingMode && operatingMode !== location.operatingMode) {
    // Trying to switch DEPENDENT → INDEPENDENT
    if (location.operatingMode === LOCATION_MODES.DEPENDENT && operatingMode === LOCATION_MODES.INDEPENDENT) {
      if (!capabilities.canChooseLocationMode || !capabilities.canHaveIndependentLocations) {
        return res.status(403).json(paywallResponse(
          'Switching to Independent mode requires an Enterprise subscription.',
          'independent_locations',
          'enterprise'
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
  // SECURITY: Verify ownership before deleting
  const location = await repos.locationRepo.getById(req.params.locationId);
  if (!location) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  const locationBusinessId = location.businessId || location.companyId;
  if (!(await requireBusinessAdmin(req, res, locationBusinessId))) return;

  const ok = await repos.locationRepo.delete(req.params.locationId);
  if (!ok) {
    return res.status(404).json(errorResponse('Location not found'));
  }
  res.json(successResponse(null, 'Location deleted successfully'));
});

app.put('/api/companies/:companyId/locations/:locationId', requireAuth, async (req, res) => {
  // SECURITY: Require business admin (not just membership)
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  const location = await repos.locationRepo.getById(req.params.locationId);
  const businessId = location?.businessId || location?.companyId;

  if (!location || businessId !== req.params.companyId) {
    return res.status(404).json(errorResponse('Location not found'));
  }

  // SECURITY: Whitelist allowed fields — prevent mass assignment
  const { name, address, phone, email, latitude, longitude, locationType,
          isPublic, operatingMode } = req.body;
  const safeUpdates = {};
  if (name !== undefined) safeUpdates.name = name;
  if (address !== undefined) safeUpdates.address = address;
  if (phone !== undefined) safeUpdates.phone = phone;
  if (email !== undefined) safeUpdates.email = email;
  if (latitude !== undefined) safeUpdates.latitude = latitude;
  if (longitude !== undefined) safeUpdates.longitude = longitude;
  if (locationType !== undefined) safeUpdates.locationType = locationType;

  // Plan-gated fields: check capabilities before allowing
  if (operatingMode !== undefined) {
    const business = await repos.businessRepo.getById(req.params.companyId);
    const capabilities = deriveCapabilities(business);
    if (operatingMode === 'INDEPENDENT' && !capabilities.canHaveIndependentLocations) {
      return res.status(403).json(paywallResponse('Upgrade to Enterprise for independent locations', 'independent_location', 'enterprise'));
    }
    safeUpdates.operatingMode = operatingMode;
  }
  if (isPublic !== undefined) {
    const business = await repos.businessRepo.getById(req.params.companyId);
    const capabilities = deriveCapabilities(business);
    if (isPublic === true && !capabilities.canEnablePublicLocationPages) {
      return res.status(403).json(paywallResponse('Upgrade to Enterprise for public location pages', 'public_location_page', 'enterprise'));
    }
    safeUpdates.isPublic = isPublic;
  }

  safeUpdates.updatedAt = new Date().toISOString();

  const updated = await repos.locationRepo.update(req.params.locationId, safeUpdates);
  res.json(successResponse(updated));
});

app.delete('/api/companies/:companyId/locations/:locationId', requireAuth, async (req, res) => {
  // SECURITY: Require business admin
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  const location = await repos.locationRepo.getById(req.params.locationId);
  const businessId = location?.businessId || location?.companyId;

  if (!location || businessId !== req.params.companyId) {
    return res.status(404).json(errorResponse('Location not found'));
  }

  await repos.locationRepo.delete(req.params.locationId);
  res.json(successResponse(null, 'Location deleted successfully'));
});

// Product Routes
app.get('/api/companies/:companyId/products', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { locationId, category, search, status, viewType } = req.query;

    // Repo returns products for this businessId (companyId maps to businessId)
    let companyProducts = await repos.productRepo.getByBusinessId(companyId);

    // Filter by location if specified (via LocationProduct or Stock tables)
    if (locationId) {
      try {
        const locationStocks = await repos.stockRepo.getByLocationId(locationId);
        const locationProductIds = new Set(locationStocks.map(s => s.productId));
        companyProducts = companyProducts.filter(p => locationProductIds.has(p.id));
      } catch {
        // If stock repo doesn't support this, skip location filtering
      }
    }

    // Apply filters
    if (category) {
      companyProducts = companyProducts.filter(p =>
        p.category?.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (status && status !== 'All') {
      const statusLower = status.toLowerCase();
      companyProducts = companyProducts.filter(p =>
        (p.status || '').toLowerCase() === statusLower
      );
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

    // Enrich products with aggregated stock data (batch-fetch to avoid N+1)
    const allStocks = await repos.stockRepo.getByBusinessId(companyId);
    const stockByProduct = new Map();
    for (const s of allStocks) {
      if (!stockByProduct.has(s.productId)) stockByProduct.set(s.productId, []);
      stockByProduct.get(s.productId).push(s);
    }
    const enrichedProducts = companyProducts.map(product => {
      const stocks = stockByProduct.get(product.id) || [];
      const totalStock = stocks.reduce((sum, s) => sum + (s.qtyOnHand || 0), 0);
      return { ...product, stockQuantity: totalStock, locationStocks: stocks };
    });

    // SECURITY (P0-4): enforce price privacy. A caller who belongs to companyId sees their own
    // prices/costs; anyone else is an outside viewer (prices hidden unless connected).
    // viewerBusinessId is derived from membership, never trusted from query params.
    let viewerBusinessId = null;
    if (req.user?.id) {
      const ownerMember = await findBusinessMember(companyId, req.user.id);
      if (ownerMember && ownerMember.status === 'accepted') {
        viewerBusinessId = companyId;
      } else if (req.query.viewerBusinessId) {
        const viewerMember = await findBusinessMember(req.query.viewerBusinessId, req.user.id);
        if (viewerMember && viewerMember.status === 'accepted') {
          viewerBusinessId = req.query.viewerBusinessId;
        }
      }
    }
    const privacyProducts = await applyPricePrivacyBatch(enrichedProducts, viewerBusinessId);

    // Price lists: attach the viewing buyer's effective price (yourPrice/basePrice/
    // priceListId/priceSource) without overwriting `price`. No-op when the viewer is
    // the owner or no list applies.
    const withYourPrice = (viewerBusinessId && viewerBusinessId !== companyId)
      ? await attachYourPrice(privacyProducts, companyId, viewerBusinessId)
      : privacyProducts;

    res.json(successResponse(withYourPrice));
  } catch (e) {
    logger.error('Error fetching products:', e);
    res.status(500).json(errorResponse('Failed to load products'));
  }
});

app.get('/api/companies/:companyId/products/:productId', requireAuth, async (req, res) => {
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

    // SECURITY (P0-4): enforce price privacy. The URL companyId is the product's owner
    // business; a caller who belongs to it sees their own prices, anyone else is treated
    // as an outside viewer (prices hidden unless connected). viewerBusinessId is derived
    // from membership, never trusted from query params.
    let viewerBusinessId = null;
    if (req.user?.id) {
      const ownerMember = await findBusinessMember(companyId, req.user.id);
      if (ownerMember && ownerMember.status === 'accepted') {
        viewerBusinessId = companyId;
      } else if (req.query.viewerBusinessId) {
        const viewerMember = await findBusinessMember(req.query.viewerBusinessId, req.user.id);
        if (viewerMember && viewerMember.status === 'accepted') {
          viewerBusinessId = req.query.viewerBusinessId;
        }
      }
    }
    const result = await applyPricePrivacy(product, viewerBusinessId);

    // Price lists: attach the viewing buyer's effective price (no-op for owner / no list).
    const withYourPrice = (viewerBusinessId && viewerBusinessId !== companyId)
      ? (await attachYourPrice([result], companyId, viewerBusinessId))[0]
      : result;

    res.json(successResponse(withYourPrice));
  } catch (e) {
    logger.error('Error fetching product:', e);
    res.status(500).json(errorResponse('Failed to load product'));
  }
});

// Create a new product
app.post('/api/companies/:companyId/products', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    // SECURITY: Require business membership
    if (!(await requireBusinessMembership(req, res, companyId))) return;

    const productData = validateBody(createProductSchema, req, res);
    if (!productData) return;

    // Verify business exists
    const business = await repos.businessRepo.getById(companyId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found'));
    }

    // Enforce listed product limit when creating a listed product
    if (productData.isListed === true || productData.is_listed === true) {
      const capabilities = deriveCapabilities(business);
      const allProducts = await repos.productRepo.getByBusinessId(companyId);
      const currentListedCount = allProducts.filter(p => p.isListed === true || p.is_listed === true).length;

      if (currentListedCount >= capabilities.maxListedProducts) {
        const requiredPlan = capabilities.maxListedProducts >= 150 ? 'enterprise' : (capabilities.maxListedProducts >= 50 ? 'business' : 'pro');
        return res.status(403).json(paywallResponse(
          `Listed product limit reached (${capabilities.maxListedProducts}). Upgrade your plan to list more products.`,
          `listed_limit_reached_${requiredPlan === 'enterprise' ? 'business' : (requiredPlan === 'business' ? 'pro' : 'free')}`,
          requiredPlan
        ));
      }
    }

    // Create the product (generate ID if not provided)
    const newProduct = await repos.productRepo.create({
      ...productData,
      id: productData.id || uuidv4(),
      businessId: companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.status(201).json(successResponse(newProduct));
  } catch (e) {
    logger.error('Error creating product:', e);
    res.status(500).json(errorResponse('Failed to create product'));
  }
});

// Carry another business's product into your own store. Creates a linked copy
// (sourceProductId → the original) that the client owns and can stock / list /
// reorder. Idempotent: returns the existing copy if one already exists.
app.post('/api/companies/:companyId/products/carry', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!(await requireBusinessMembership(req, res, companyId))) return;

    const sourceProductId = req.body?.sourceProductId;
    if (!sourceProductId || typeof sourceProductId !== 'string') {
      return res.status(400).json(errorResponse('sourceProductId is required'));
    }

    const source = await repos.productRepo.getById(sourceProductId);
    if (!source) {
      return res.status(404).json(errorResponse('Source product not found'));
    }
    if (source.businessId === companyId) {
      return res.status(400).json(errorResponse('You already own this product'));
    }

    // Idempotent — return the existing carried copy if one exists.
    const existing = await repos.productRepo.getCarriedCopy(companyId, sourceProductId);
    if (existing) {
      return res.json(successResponse(existing));
    }

    const now = new Date().toISOString();
    const copy = await repos.productRepo.create({
      id: uuidv4(),
      businessId: companyId,
      sourceProductId: source.id,
      name: source.name,
      brand: source.brand || null,
      brandLogo: source.brandLogo || null,
      productPicture: source.productPicture || null,
      description: source.description || null,
      unit: source.unit || null,
      category: source.category || null,
      barcode: source.barcode || null,
      price: source.price ?? null,
      stockQuantity: 0,
      isListed: false, // unlisted by default — the client opts in
      isImported: true,
      isCreatedByUser: false,
      status: 'Available',
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json(successResponse(copy));
  } catch (e) {
    logger.error('Error carrying product:', e);
    res.status(500).json(errorResponse('Failed to add product to your store'));
  }
});

// Update a product
app.patch('/api/companies/:companyId/products/:productId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId, productId } = req.params;
    const { name, description, unit, price, taxRate, minOrderQty, stock, sku, barcode, isAvailable, images, categoryId, subcategoryId } = req.body;
    const patch = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(unit !== undefined && { unit }),
      ...(price !== undefined && { price }),
      ...(taxRate !== undefined && { taxRate }),
      ...(minOrderQty !== undefined && { minOrderQty }),
      ...(stock !== undefined && { stock }),
      ...(sku !== undefined && { sku }),
      ...(barcode !== undefined && { barcode }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(images !== undefined && { images }),
      ...(categoryId !== undefined && { categoryId }),
      ...(subcategoryId !== undefined && { subcategoryId }),
    };

    const product = await repos.productRepo.getById(productId);
    if (!product) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    // Safety check: ensure product belongs to the business
    const productBusinessId = product.businessId || product.companyId;
    if (productBusinessId !== companyId) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    // Check listed product limit when listing a product
    const isListingProduct = (patch.isListed === true || patch.is_listed === true) &&
      !(product.isListed === true || product.is_listed === true);
    if (isListingProduct) {
      const business = await repos.businessRepo.getById(companyId);
      const capabilities = deriveCapabilities(business);
      const allProducts = await repos.productRepo.getByBusinessId(companyId);
      const currentListedCount = allProducts.filter(p => p.isListed === true || p.is_listed === true).length;

      if (currentListedCount >= capabilities.maxListedProducts) {
        const requiredPlan = capabilities.maxListedProducts >= 150 ? 'enterprise' : (capabilities.maxListedProducts >= 50 ? 'business' : 'pro');
        return res.status(403).json(paywallResponse(
          `Listed product limit reached (${capabilities.maxListedProducts}). Upgrade your plan to list more products.`,
          `listed_limit_reached_${requiredPlan === 'enterprise' ? 'business' : (requiredPlan === 'business' ? 'pro' : 'free')}`,
          requiredPlan
        ));
      }
    }

    const updatedProduct = await repos.productRepo.update(productId, {
      ...patch,
      updatedAt: new Date(),
    });

    res.json(successResponse(updatedProduct));
  } catch (e) {
    logger.error('Error updating product:', e);
    res.status(500).json(errorResponse('Failed to update product'));
  }
});

// Delete a product
app.delete('/api/companies/:companyId/products/:productId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
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
    logger.error('Error deleting product:', e);
    res.status(500).json(errorResponse('Failed to delete product'));
  }
});

// GET products with supplier pricing (for "Supplier Pricing" view)
app.get('/api/companies/:companyId/products/with-supplier-pricing', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canManageSuppliers) {
      return res.status(403).json(paywallResponse('Supplier pricing requires Pro plan or higher.', 'create_procurement', 'pro'));
    }

    // Find all SupplierProduct records for this business's suppliers, with product + supplier details
    const supplierProducts = await prisma.supplierProduct.findMany({
      where: {
        supplier: { businessId: req.params.companyId },
      },
      include: {
        product: true,
        supplier: { select: { id: true, name: true, contactName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by product and attach supplierPricing array
    const productMap = new Map();
    for (const sp of supplierProducts) {
      if (!sp.product) continue;
      if (!productMap.has(sp.productId)) {
        productMap.set(sp.productId, {
          ...sp.product,
          supplierPricing: [],
        });
      }
      productMap.get(sp.productId).supplierPricing.push({
        supplierId: sp.supplier.id,
        supplierName: sp.supplier.name,
        supplierPrice: sp.supplierPrice,
        minOrderQty: sp.minOrderQty,
        bulkPrice: sp.bulkPrice,
        bulkMinQty: sp.bulkMinQty,
        leadTimeDays: sp.leadTimeDays,
        supplierSKU: sp.supplierSKU,
      });
    }

    res.json(successResponse(Array.from(productMap.values())));
  } catch (e) {
    logger.error('Error fetching products with supplier pricing:', e);
    res.status(500).json(errorResponse('Failed to fetch products with supplier pricing'));
  }
});

// GET suppliers for a specific product (for "Reorder" button)
app.get('/api/companies/:companyId/products/:productId/suppliers', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const supplierProducts = await prisma.supplierProduct.findMany({
      where: {
        productId: req.params.productId,
        supplier: { businessId: req.params.companyId },
      },
      include: {
        supplier: { select: { id: true, name: true, contactName: true, email: true, phone: true } },
      },
    });

    const result = supplierProducts.map((sp) => ({
      supplierId: sp.supplier.id,
      supplierName: sp.supplier.name,
      contactName: sp.supplier.contactName,
      email: sp.supplier.email,
      phone: sp.supplier.phone,
      supplierPrice: sp.supplierPrice,
      minOrderQty: sp.minOrderQty,
      bulkPrice: sp.bulkPrice,
      bulkMinQty: sp.bulkMinQty,
      leadTimeDays: sp.leadTimeDays,
      supplierSKU: sp.supplierSKU,
    }));

    res.json(successResponse(result));
  } catch (e) {
    logger.error('Error fetching suppliers for product:', e);
    res.status(500).json(errorResponse('Failed to fetch suppliers for product'));
  }
});

// ============================================================================
// BRAND ROUTES
// ============================================================================

// List brands for a company
app.get('/api/companies/:companyId/brands', requireAuth, async (req, res) => {
  try {
    // SECURITY: Derive viewerBusinessId from caller's membership, not query params
    let viewerBusinessId = null;
    if (req.query.viewerBusinessId && req.user?.id) {
      const viewerMember = await findBusinessMember(req.query.viewerBusinessId, req.user.id);
      if (viewerMember && viewerMember.status === 'accepted') {
        viewerBusinessId = req.query.viewerBusinessId;
      }
    }
    const brands = await repos.brandRepo.getByBusinessId(req.params.companyId);

    // Apply price privacy to products within each brand
    const brandsWithPrivacy = await Promise.all(brands.map(async (brand) => {
      if (!brand.products || brand.products.length === 0) return brand;
      const privacyProducts = await applyPricePrivacyBatch(brand.products, viewerBusinessId);
      return { ...brand, products: privacyProducts };
    }));

    res.json(successResponse(brandsWithPrivacy));
  } catch (e) {
    logger.error('Error fetching brands:', e);
    res.status(500).json(errorResponse('Failed to fetch brands'));
  }
});

// Create a brand
app.post('/api/companies/:companyId/brands', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    // SECURITY: Require business membership
    if (!(await requireBusinessMembership(req, res, companyId))) return;
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
    logger.error('Error creating brand:', e);
    res.status(500).json(errorResponse('Failed to create brand'));
  }
});

// Update a brand
app.patch('/api/companies/:companyId/brands/:brandId', requireAuth, async (req, res) => {
  try {
    const { companyId, brandId } = req.params;
    // SECURITY: Require business membership
    if (!(await requireBusinessMembership(req, res, companyId))) return;

    const brand = await repos.brandRepo.getById(brandId);

    if (!brand || brand.businessId !== companyId) {
      return res.status(404).json(errorResponse('Brand not found'));
    }

    const { name, description, logoUrl, website, country, categories } = req.body;
    const updated = await repos.brandRepo.update(brandId, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(website !== undefined && { website }),
      ...(country !== undefined && { country }),
      ...(categories !== undefined && { categories }),
      updatedAt: new Date(),
    });

    res.json(successResponse(updated));
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json(errorResponse('A brand with this name already exists'));
    }
    logger.error('Error updating brand:', e);
    res.status(500).json(errorResponse('Failed to update brand'));
  }
});

// Delete a brand
app.delete('/api/companies/:companyId/brands/:brandId', requireAuth, async (req, res) => {
  try {
    const { companyId, brandId } = req.params;
    // SECURITY: Require business admin to delete brands
    if (!(await requireBusinessAdmin(req, res, companyId))) return;

    const brand = await repos.brandRepo.getById(brandId);

    if (!brand || brand.businessId !== companyId) {
      return res.status(404).json(errorResponse('Brand not found'));
    }

    await repos.brandRepo.delete(brandId);
    res.json(successResponse(null, 'Brand deleted successfully'));
  } catch (e) {
    logger.error('Error deleting brand:', e);
    res.status(500).json(errorResponse('Failed to delete brand'));
  }
});

// ============================================================================
// PRICE LIST ROUTES (customer-specific pricing)
// Gated by canUseBusinessSpecificPricing (Business+). The seller owns the lists;
// they are applied to customer businesses via assignment or manual selection.
// ============================================================================

// Membership + Business-plan capability gate for price-list writes.
// Returns the seller business on success, or null (response already sent) on failure.
async function requirePricingCapability(req, res, companyId) {
  if (!(await requireBusinessMembership(req, res, companyId))) return null;
  const business = await repos.businessRepo.getById(companyId);
  if (!business) {
    res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    return null;
  }
  if (!deriveCapabilities(business).canUseBusinessSpecificPricing) {
    res.status(403).json(paywallResponse(
      'Custom price lists require a Business plan.',
      'business_specific_pricing',
      'business'
    ));
    return null;
  }
  return business;
}

// List all price lists for a business (with item + assignment counts).
app.get('/api/companies/:companyId/price-lists', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!(await requireBusinessMembership(req, res, companyId))) return;
    const lists = await repos.priceListRepo.getByBusinessId(companyId);
    res.json(successResponse(lists));
  } catch (e) {
    logger.error('Error fetching price lists:', e);
    res.status(500).json(errorResponse('Failed to fetch price lists'));
  }
});

// Resolve the effective price for a buyer/product (preview for the order/invoice UI).
// NOTE: must be declared BEFORE '/price-lists/:listId' so it isn't captured as an id.
app.get('/api/companies/:companyId/price-lists/resolve', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!(await requireBusinessMembership(req, res, companyId))) return;
    const { buyerBusinessId, productId, qty, unit, manualPriceListId } = req.query;
    if (!productId) return res.status(400).json(errorResponse('productId is required'));
    const product = await repos.productRepo.getById(productId);
    if (!product || product.businessId !== companyId) {
      return res.status(404).json(errorResponse('Product not found'));
    }
    const list = await resolvePriceListForBuyer(companyId, buyerBusinessId || null, {
      manualPriceListId: manualPriceListId || null,
    });
    const { unitPrice, source } = applyPriceList(list, product, Number(qty) || 1, { unit: unit || 'unit' });
    res.json(successResponse({
      priceListId: list ? list.id : null,
      priceListName: list ? list.name : null,
      unitPrice,
      basePrice: ((unit === 'carton' ? product.pricePerCarton : product.price) ?? null),
      priceSource: source,
    }));
  } catch (e) {
    logger.error('Error resolving price:', e);
    res.status(500).json(errorResponse('Failed to resolve price'));
  }
});

// Create a price list.
app.post('/api/companies/:companyId/price-lists', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!(await requirePricingCapability(req, res, companyId))) return;
    const data = validateBody(createPriceListSchema, req, res);
    if (!data) return;
    const created = await repos.priceListRepo.create({
      id: 'plist-' + uuidv4().slice(0, 8),
      businessId: companyId,
      name: data.name.trim(),
      description: data.description || null,
      discountPercent: data.discountPercent ?? null,
      currency: data.currency || null,
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
    });
    res.status(201).json(successResponse(created));
  } catch (e) {
    logger.error('Error creating price list:', e);
    res.status(500).json(errorResponse('Failed to create price list'));
  }
});

// Get a single price list (with items + assignments).
app.get('/api/companies/:companyId/price-lists/:listId', requireAuth, async (req, res) => {
  try {
    const { companyId, listId } = req.params;
    if (!(await requireBusinessMembership(req, res, companyId))) return;
    const list = await repos.priceListRepo.getById(listId);
    if (!list || list.businessId !== companyId) {
      return res.status(404).json(errorResponse('Price list not found'));
    }
    res.json(successResponse(list));
  } catch (e) {
    logger.error('Error fetching price list:', e);
    res.status(500).json(errorResponse('Failed to fetch price list'));
  }
});

// Update a price list.
app.patch('/api/companies/:companyId/price-lists/:listId', requireAuth, async (req, res) => {
  try {
    const { companyId, listId } = req.params;
    if (!(await requirePricingCapability(req, res, companyId))) return;
    const existing = await repos.priceListRepo.getById(listId);
    if (!existing || existing.businessId !== companyId) {
      return res.status(404).json(errorResponse('Price list not found'));
    }
    const { name, description, discountPercent, currency, isActive, isDefault } = req.body;
    const updated = await repos.priceListRepo.update(listId, {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(description !== undefined && { description }),
      ...(discountPercent !== undefined && { discountPercent }),
      ...(currency !== undefined && { currency }),
      ...(isActive !== undefined && { isActive }),
      ...(isDefault !== undefined && { isDefault }),
      updatedAt: new Date(),
    });
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating price list:', e);
    res.status(500).json(errorResponse('Failed to update price list'));
  }
});

// Delete a price list (admin only).
app.delete('/api/companies/:companyId/price-lists/:listId', requireAuth, async (req, res) => {
  try {
    const { companyId, listId } = req.params;
    if (!(await requireBusinessAdmin(req, res, companyId))) return;
    const existing = await repos.priceListRepo.getById(listId);
    if (!existing || existing.businessId !== companyId) {
      return res.status(404).json(errorResponse('Price list not found'));
    }
    await repos.priceListRepo.delete(listId);
    res.json(successResponse(null, 'Price list deleted successfully'));
  } catch (e) {
    logger.error('Error deleting price list:', e);
    res.status(500).json(errorResponse('Failed to delete price list'));
  }
});

// Add or update a per-product override (upsert on productId).
app.post('/api/companies/:companyId/price-lists/:listId/items', requireAuth, async (req, res) => {
  try {
    const { companyId, listId } = req.params;
    if (!(await requirePricingCapability(req, res, companyId))) return;
    const existing = await repos.priceListRepo.getById(listId);
    if (!existing || existing.businessId !== companyId) {
      return res.status(404).json(errorResponse('Price list not found'));
    }
    const { productId, fixedPrice, fixedPricePerCarton } = req.body;
    if (!productId) return res.status(400).json(errorResponse('productId is required'));
    if ((fixedPrice === undefined || fixedPrice === null) &&
        (fixedPricePerCarton === undefined || fixedPricePerCarton === null)) {
      return res.status(400).json(errorResponse('Provide fixedPrice and/or fixedPricePerCarton'));
    }
    const product = await repos.productRepo.getById(productId);
    if (!product || product.businessId !== companyId) {
      return res.status(404).json(errorResponse('Product not found'));
    }
    const item = await repos.priceListRepo.upsertItem({
      id: 'plitem-' + uuidv4().slice(0, 8),
      priceListId: listId,
      productId,
      fixedPrice: fixedPrice ?? null,
      fixedPricePerCarton: fixedPricePerCarton ?? null,
    });
    res.status(201).json(successResponse(item));
  } catch (e) {
    logger.error('Error adding price list item:', e);
    res.status(500).json(errorResponse('Failed to add price list item'));
  }
});

// Remove a per-product override.
app.delete('/api/companies/:companyId/price-lists/:listId/items/:itemId', requireAuth, async (req, res) => {
  try {
    const { companyId, listId, itemId } = req.params;
    if (!(await requirePricingCapability(req, res, companyId))) return;
    const existing = await repos.priceListRepo.getById(listId);
    if (!existing || existing.businessId !== companyId) {
      return res.status(404).json(errorResponse('Price list not found'));
    }
    const ok = await repos.priceListRepo.removeItem(itemId);
    if (!ok) return res.status(404).json(errorResponse('Item not found'));
    res.json(successResponse(null, 'Item removed'));
  } catch (e) {
    logger.error('Error removing price list item:', e);
    res.status(500).json(errorResponse('Failed to remove price list item'));
  }
});

// Assign (or move) a customer business to this list. One list per customer per seller.
app.put('/api/companies/:companyId/price-lists/:listId/assignments', requireAuth, async (req, res) => {
  try {
    const { companyId, listId } = req.params;
    if (!(await requirePricingCapability(req, res, companyId))) return;
    const existing = await repos.priceListRepo.getById(listId);
    if (!existing || existing.businessId !== companyId) {
      return res.status(404).json(errorResponse('Price list not found'));
    }
    const { buyerBusinessId } = req.body;
    if (!buyerBusinessId) return res.status(400).json(errorResponse('buyerBusinessId is required'));
    if (buyerBusinessId === companyId) {
      return res.status(400).json(errorResponse('Cannot assign a price list to your own business'));
    }
    const assignment = await repos.priceListRepo.upsertAssignment({
      id: 'plasn-' + uuidv4().slice(0, 8),
      priceListId: listId,
      sellerBusinessId: companyId,
      buyerBusinessId,
    });
    res.json(successResponse(assignment));
  } catch (e) {
    logger.error('Error assigning price list:', e);
    res.status(500).json(errorResponse('Failed to assign price list'));
  }
});

// Unassign a customer business from this list.
app.delete('/api/companies/:companyId/price-lists/:listId/assignments/:buyerBusinessId', requireAuth, async (req, res) => {
  try {
    const { companyId, listId, buyerBusinessId } = req.params;
    if (!(await requirePricingCapability(req, res, companyId))) return;
    const existing = await repos.priceListRepo.getById(listId);
    if (!existing || existing.businessId !== companyId) {
      return res.status(404).json(errorResponse('Price list not found'));
    }
    const current = await repos.priceListRepo.getAssignmentForBuyer(companyId, buyerBusinessId);
    if (!current || current.priceListId !== listId) {
      return res.status(404).json(errorResponse('Assignment not found'));
    }
    await repos.priceListRepo.removeAssignment(companyId, buyerBusinessId);
    res.json(successResponse(null, 'Assignment removed'));
  } catch (e) {
    logger.error('Error removing assignment:', e);
    res.status(500).json(errorResponse('Failed to remove assignment'));
  }
});

// ============================================================================
// TRANSPORT / FLEET ROUTES
// ============================================================================

// Helper: map Prisma camelCase transport to snake_case for frontend
function mapTransportToResponse(t) {
  return {
    id: t.id,
    business_id: t.businessId,
    name: t.name,
    vehicle_type: t.vehicleType,
    license_plate: t.licensePlate || null,
    capacity: t.capacity || null,
    status: t.status,
    assigned_staff_id: t.assignedStaffId || null,
    assigned_staff_name: t._staffName || null,
    assigned_staff_avatar: t._staffAvatar || null,
    notes: t.notes || null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

// List transports for a company
app.get('/api/companies/:companyId/transports', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const transports = await repos.transportRepo.getByBusinessId(req.params.companyId);

    // Enrich with staff info
    for (const t of transports) {
      if (t.assignedStaffId) {
        const user = await repos.userRepo.getById(t.assignedStaffId);
        t._staffName = user?.name || null;
        t._staffAvatar = user?.avatar || null;
      }
    }

    res.json(successResponse(transports.map(mapTransportToResponse)));
  } catch (e) {
    logger.error('Error fetching transports:', e);
    res.status(500).json(errorResponse('Failed to fetch transports'));
  }
});

// Create a transport
app.post('/api/companies/:companyId/transports', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId } = req.params;
    const business = await repos.businessRepo.getById(companyId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found'));
    }

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canAssignTransport) {
      return res.status(403).json(errorResponse(
        'Upgrade to Pro to manage transports',
        'PAYWALL'
      ));
    }

    const { name, vehicle_type, license_plate, capacity, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json(errorResponse('Transport name is required'));
    }

    const validTypes = ['bicycle', 'motorcycle', 'scooter', 'car', 'van', 'pickup', 'truck', 'lorry', 'other'];
    if (vehicle_type && !validTypes.includes(vehicle_type)) {
      return res.status(400).json(errorResponse('Invalid vehicle type'));
    }

    const created = await repos.transportRepo.create({
      id: 'trn-' + uuidv4().slice(0, 8),
      businessId: companyId,
      name: name.trim(),
      vehicleType: vehicle_type || 'other',
      licensePlate: license_plate || null,
      capacity: capacity || null,
      status: 'available',
      notes: notes || null,
    });

    res.status(201).json(successResponse(mapTransportToResponse(created)));
  } catch (e) {
    logger.error('Error creating transport:', e);
    res.status(500).json(errorResponse('Failed to create transport'));
  }
});

// Update a transport
app.patch('/api/companies/:companyId/transports/:transportId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId, transportId } = req.params;
    const transport = await repos.transportRepo.getById(transportId);

    if (!transport || transport.businessId !== companyId) {
      return res.status(404).json(errorResponse('Transport not found'));
    }

    const business = await repos.businessRepo.getById(companyId);
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canAssignTransport) {
      return res.status(403).json(errorResponse('Upgrade to Pro to manage transports', 'PAYWALL'));
    }

    // Whitelist allowed fields (map snake_case from frontend to camelCase for Prisma)
    const patch = {};
    if (req.body.name !== undefined) patch.name = req.body.name;
    if (req.body.vehicle_type !== undefined) patch.vehicleType = req.body.vehicle_type;
    if (req.body.license_plate !== undefined) patch.licensePlate = req.body.license_plate;
    if (req.body.capacity !== undefined) patch.capacity = req.body.capacity;
    if (req.body.status !== undefined) patch.status = req.body.status;
    if (req.body.assigned_staff_id !== undefined) patch.assignedStaffId = req.body.assigned_staff_id;
    if (req.body.notes !== undefined) patch.notes = req.body.notes;

    // Validate assignedStaffId if provided
    if (patch.assignedStaffId) {
      const allMembers = await repos.memberRepo.listBusinessMembers(companyId);
      const staffMember = allMembers.find(
        m => m.userId === patch.assignedStaffId && m.status === 'accepted'
      );
      if (!staffMember) {
        return res.status(400).json(errorResponse('assigned_staff_id must be an accepted business member'));
      }
    }

    const updated = await repos.transportRepo.update(transportId, {
      ...patch,
      updatedAt: new Date(),
    });

    // Enrich with staff info
    if (updated.assignedStaffId) {
      const user = await repos.userRepo.getById(updated.assignedStaffId);
      updated._staffName = user?.name || null;
      updated._staffAvatar = user?.avatar || null;
    }

    res.json(successResponse(mapTransportToResponse(updated)));
  } catch (e) {
    logger.error('Error updating transport:', e);
    res.status(500).json(errorResponse('Failed to update transport'));
  }
});

// Delete a transport
app.delete('/api/companies/:companyId/transports/:transportId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId, transportId } = req.params;
    const transport = await repos.transportRepo.getById(transportId);

    if (!transport || transport.businessId !== companyId) {
      return res.status(404).json(errorResponse('Transport not found'));
    }

    const business = await repos.businessRepo.getById(companyId);
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canAssignTransport) {
      return res.status(403).json(errorResponse('Upgrade to Pro to manage transports', 'PAYWALL'));
    }

    await repos.transportRepo.delete(transportId);
    res.json(successResponse(null, 'Transport deleted successfully'));
  } catch (e) {
    logger.error('Error deleting transport:', e);
    res.status(500).json(errorResponse('Failed to delete transport'));
  }
});

// ============================================================================
// PROFESSIONAL PROFILE ROUTES
// ============================================================================

// --- Work Experience ---

// List user's work experiences (public)
app.get('/api/users/:userId/experiences', requireAuth, async (req, res) => {
  try {
    const experiences = await repos.workExperienceRepo.getByUserId(req.params.userId);
    res.json(successResponse(experiences));
  } catch (e) {
    logger.error('Error fetching experiences:', e);
    res.status(500).json(errorResponse('Failed to fetch work experiences'));
  }
});

// Add work experience
app.post('/api/users/me/experiences', requireAuth, async (req, res) => {
  try {
    const { companyName, companyLogo, position, description, industry, location, startDate, endDate, isCurrent, linkedBusinessId } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json(errorResponse('Company name is required'));
    }
    if (!position || !position.trim()) {
      return res.status(400).json(errorResponse('Position is required'));
    }
    if (!startDate) {
      return res.status(400).json(errorResponse('Start date is required'));
    }

    const created = await repos.workExperienceRepo.create({
      userId: req.user.id,
      companyName: companyName.trim(),
      companyLogo: companyLogo || null,
      position: position.trim(),
      description: description || null,
      industry: industry || null,
      location: location || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isCurrent: isCurrent || false,
      linkedBusinessId: linkedBusinessId || null,
    });

    res.status(201).json(successResponse(created));
  } catch (e) {
    logger.error('Error creating work experience:', e);
    res.status(500).json(errorResponse('Failed to create work experience'));
  }
});

// Update work experience
app.patch('/api/users/me/experiences/:id', requireAuth, async (req, res) => {
  try {
    const experience = await repos.workExperienceRepo.getById(req.params.id);
    if (!experience || experience.userId !== req.user.id) {
      return res.status(404).json(errorResponse('Work experience not found'));
    }

    const { companyName, companyLogo, position, description, industry, location, startDate, endDate, isCurrent, linkedBusinessId } = req.body;
    const patch = {
      ...(companyName !== undefined && { companyName: companyName.trim() }),
      ...(companyLogo !== undefined && { companyLogo }),
      ...(position !== undefined && { position: position.trim() }),
      ...(description !== undefined && { description }),
      ...(industry !== undefined && { industry }),
      ...(location !== undefined && { location }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(isCurrent !== undefined && { isCurrent }),
      ...(linkedBusinessId !== undefined && { linkedBusinessId }),
    };

    const updated = await repos.workExperienceRepo.update(req.params.id, patch);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating work experience:', e);
    res.status(500).json(errorResponse('Failed to update work experience'));
  }
});

// Delete work experience
app.delete('/api/users/me/experiences/:id', requireAuth, async (req, res) => {
  try {
    const experience = await repos.workExperienceRepo.getById(req.params.id);
    if (!experience || experience.userId !== req.user.id) {
      return res.status(404).json(errorResponse('Work experience not found'));
    }

    await repos.workExperienceRepo.delete(req.params.id);
    res.json(successResponse(null, 'Work experience deleted'));
  } catch (e) {
    logger.error('Error deleting work experience:', e);
    res.status(500).json(errorResponse('Failed to delete work experience'));
  }
});

// --- Education ---

// List user's education
app.get('/api/users/:userId/education', requireAuth, async (req, res) => {
  try {
    const education = await repos.educationRepo.getByUserId(req.params.userId);
    res.json(successResponse(education));
  } catch (e) {
    logger.error('Error fetching education:', e);
    res.status(500).json(errorResponse('Failed to fetch education'));
  }
});

// Add education
app.post('/api/users/me/education', requireAuth, async (req, res) => {
  try {
    const { institution, degree, fieldOfStudy, description, startDate, endDate, isCurrent } = req.body;

    if (!institution || !institution.trim()) {
      return res.status(400).json(errorResponse('Institution is required'));
    }

    const created = await repos.educationRepo.create({
      userId: req.user.id,
      institution: institution.trim(),
      degree: degree || null,
      fieldOfStudy: fieldOfStudy || null,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isCurrent: isCurrent || false,
    });

    res.status(201).json(successResponse(created));
  } catch (e) {
    logger.error('Error creating education:', e);
    res.status(500).json(errorResponse('Failed to create education'));
  }
});

// Update education
app.patch('/api/users/me/education/:id', requireAuth, async (req, res) => {
  try {
    const education = await repos.educationRepo.getById(req.params.id);
    if (!education || education.userId !== req.user.id) {
      return res.status(404).json(errorResponse('Education not found'));
    }

    const { institution, degree, fieldOfStudy, description, startDate, endDate, isCurrent } = req.body;
    const patch = {
      ...(institution !== undefined && { institution: institution.trim() }),
      ...(degree !== undefined && { degree }),
      ...(fieldOfStudy !== undefined && { fieldOfStudy }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(isCurrent !== undefined && { isCurrent }),
    };

    const updated = await repos.educationRepo.update(req.params.id, patch);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating education:', e);
    res.status(500).json(errorResponse('Failed to update education'));
  }
});

// Delete education
app.delete('/api/users/me/education/:id', requireAuth, async (req, res) => {
  try {
    const education = await repos.educationRepo.getById(req.params.id);
    if (!education || education.userId !== req.user.id) {
      return res.status(404).json(errorResponse('Education not found'));
    }

    await repos.educationRepo.delete(req.params.id);
    res.json(successResponse(null, 'Education deleted'));
  } catch (e) {
    logger.error('Error deleting education:', e);
    res.status(500).json(errorResponse('Failed to delete education'));
  }
});

// --- Certifications ---

// List user's certifications
app.get('/api/users/:userId/certifications', requireAuth, async (req, res) => {
  try {
    const certifications = await repos.certificationRepo.getByUserId(req.params.userId);
    res.json(successResponse(certifications));
  } catch (e) {
    logger.error('Error fetching certifications:', e);
    res.status(500).json(errorResponse('Failed to fetch certifications'));
  }
});

// Add certification
app.post('/api/users/me/certifications', requireAuth, async (req, res) => {
  try {
    const { name, issuingOrganization, issueDate, expirationDate, credentialId, credentialUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json(errorResponse('Certification name is required'));
    }
    if (!issuingOrganization || !issuingOrganization.trim()) {
      return res.status(400).json(errorResponse('Issuing organization is required'));
    }

    const created = await repos.certificationRepo.create({
      userId: req.user.id,
      name: name.trim(),
      issuingOrganization: issuingOrganization.trim(),
      issueDate: issueDate ? new Date(issueDate) : null,
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      credentialId: credentialId || null,
      credentialUrl: credentialUrl || null,
    });

    res.status(201).json(successResponse(created));
  } catch (e) {
    logger.error('Error creating certification:', e);
    res.status(500).json(errorResponse('Failed to create certification'));
  }
});

// Update certification
app.patch('/api/users/me/certifications/:id', requireAuth, async (req, res) => {
  try {
    const certification = await repos.certificationRepo.getById(req.params.id);
    if (!certification || certification.userId !== req.user.id) {
      return res.status(404).json(errorResponse('Certification not found'));
    }

    const { name, issuingOrganization, issueDate, expirationDate, credentialId, credentialUrl } = req.body;
    const patch = {
      ...(name !== undefined && { name: name.trim() }),
      ...(issuingOrganization !== undefined && { issuingOrganization: issuingOrganization.trim() }),
      ...(issueDate !== undefined && { issueDate: issueDate ? new Date(issueDate) : null }),
      ...(expirationDate !== undefined && { expirationDate: expirationDate ? new Date(expirationDate) : null }),
      ...(credentialId !== undefined && { credentialId }),
      ...(credentialUrl !== undefined && { credentialUrl }),
    };

    const updated = await repos.certificationRepo.update(req.params.id, patch);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating certification:', e);
    res.status(500).json(errorResponse('Failed to update certification'));
  }
});

// Delete certification
app.delete('/api/users/me/certifications/:id', requireAuth, async (req, res) => {
  try {
    const certification = await repos.certificationRepo.getById(req.params.id);
    if (!certification || certification.userId !== req.user.id) {
      return res.status(404).json(errorResponse('Certification not found'));
    }

    await repos.certificationRepo.delete(req.params.id);
    res.json(successResponse(null, 'Certification deleted'));
  } catch (e) {
    logger.error('Error deleting certification:', e);
    res.status(500).json(errorResponse('Failed to delete certification'));
  }
});

// --- Skills ---

// Search skills (autocomplete)
app.get('/api/skills/search', requireAuth, async (req, res) => {
  try {
    const query = req.query.q || '';
    const skills = await repos.skillRepo.search(query, 20);
    res.json(successResponse(skills));
  } catch (e) {
    logger.error('Error searching skills:', e);
    res.status(500).json(errorResponse('Failed to search skills'));
  }
});

// List user's skills
app.get('/api/users/:userId/skills', requireAuth, async (req, res) => {
  try {
    const userSkills = await repos.skillRepo.getUserSkills(req.params.userId);
    res.json(successResponse(userSkills));
  } catch (e) {
    logger.error('Error fetching user skills:', e);
    res.status(500).json(errorResponse('Failed to fetch skills'));
  }
});

// Add skill to profile
app.post('/api/users/me/skills', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json(errorResponse('Skill name is required'));
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return res.status(400).json(errorResponse('Skill name must be 100 characters or less'));
    }

    // Check max skills limit
    const currentCount = await repos.skillRepo.countUserSkills(req.user.id);
    if (currentCount >= 50) {
      return res.status(400).json(errorResponse('Maximum 50 skills allowed'));
    }

    // Find or create skill in master table
    let skill = await repos.skillRepo.getByName(trimmedName);
    if (!skill) {
      skill = await repos.skillRepo.create({
        name: trimmedName.toLowerCase(),
      });
    }

    // Add to user's skills
    const userSkill = await repos.skillRepo.addUserSkill({
      userId: req.user.id,
      skillId: skill.id,
      displayOrder: currentCount,
    });

    res.status(201).json(successResponse(userSkill));
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json(errorResponse('You already have this skill'));
    }
    logger.error('Error adding skill:', e);
    res.status(500).json(errorResponse('Failed to add skill'));
  }
});

// Remove skill from profile
app.delete('/api/users/me/skills/:skillId', requireAuth, async (req, res) => {
  try {
    await repos.skillRepo.removeUserSkill(req.user.id, req.params.skillId);
    res.json(successResponse(null, 'Skill removed'));
  } catch (e) {
    logger.error('Error removing skill:', e);
    res.status(500).json(errorResponse('Failed to remove skill'));
  }
});

// Reorder skills
app.patch('/api/users/me/skills/reorder', requireAuth, async (req, res) => {
  try {
    const { skillIds } = req.body;
    if (!Array.isArray(skillIds)) {
      return res.status(400).json(errorResponse('skillIds must be an array'));
    }

    await repos.skillRepo.reorderUserSkills(req.user.id, skillIds);
    res.json(successResponse(null, 'Skills reordered'));
  } catch (e) {
    logger.error('Error reordering skills:', e);
    res.status(500).json(errorResponse('Failed to reorder skills'));
  }
});

// --- Public Profile & Completeness ---

// Get public profile by slug
app.get('/api/profile/:slug', optionalAuth, async (req, res) => {
  try {
    const { prisma } = require('./src/db/prisma');
    const profile = await prisma.user.findUnique({
      where: { profileSlug: req.params.slug },
      include: {
        workExperiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
        userSkills: {
          include: { skill: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!profile) {
      return res.status(404).json(errorResponse('Profile not found'));
    }

    // Strip sensitive fields
    const { passwordHash, twoFactorSecret, twoFactorBackupCodes, twoFactorEnabled, ...safeProfile } = profile;
    res.json(successResponse(safeProfile));
  } catch (e) {
    logger.error('Error fetching public profile:', e);
    res.status(500).json(errorResponse('Failed to fetch profile'));
  }
});

// Get profile completeness
app.get('/api/users/me/profile-completeness', requireAuth, async (req, res) => {
  try {
    const { prisma } = require('./src/db/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        _count: {
          select: {
            workExperiences: true,
            education: true,
            certifications: true,
            userSkills: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    const sections = {
      photo: { weight: 10, done: !!user.avatar },
      cover: { weight: 5, done: !!user.coverPhoto },
      headline: { weight: 15, done: !!user.headline },
      bio: { weight: 10, done: !!user.bio && user.bio.length > 20 },
      industry: { weight: 5, done: !!user.industry },
      experience: { weight: 20, done: user._count.workExperiences > 0 },
      education: { weight: 15, done: user._count.education > 0 },
      skills: { weight: 10, done: user._count.userSkills > 0 },
      certification: { weight: 10, done: user._count.certifications > 0 },
    };

    let percentage = 0;
    const completed = [];
    const missing = [];

    for (const [key, section] of Object.entries(sections)) {
      if (section.done) {
        percentage += section.weight;
        completed.push(key);
      } else {
        missing.push(key);
      }
    }

    res.json(successResponse({ percentage, completed, missing }));
  } catch (e) {
    logger.error('Error calculating profile completeness:', e);
    res.status(500).json(errorResponse('Failed to calculate profile completeness'));
  }
});

// ============================================================================
// TASK ROUTES
// ============================================================================

const TASK_STATUS_TRANSITIONS = {
  TODO: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'TODO'],
  COMPLETED: ['TODO'],
  CANCELLED: ['TODO'],
};

// List tasks for a business
app.get('/api/companies/:companyId/tasks', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.assignedToUserId) filters.assignedToUserId = req.query.assignedToUserId;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.type) filters.type = req.query.type;

    const tasks = await repos.taskRepo.getByBusinessId(req.params.companyId, filters);

    // Enrich with assignee user info
    const { prisma } = require('./src/db/prisma');
    const userIds = [...new Set(tasks.map(t => t.assignedToUserId).filter(Boolean))];
    let usersMap = {};
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, avatar: true },
      });
      usersMap = Object.fromEntries(users.map(u => [u.id, u]));
    }

    const enrichedTasks = tasks.map(task => ({
      ...task,
      assignedToUserName: usersMap[task.assignedToUserId]?.name || null,
      assignedToUserAvatar: usersMap[task.assignedToUserId]?.avatar || null,
    }));

    res.json(successResponse(enrichedTasks));
  } catch (e) {
    logger.error('Error fetching tasks:', e);
    res.status(500).json(errorResponse('Failed to fetch tasks'));
  }
});

// Get single task
app.get('/api/companies/:companyId/tasks/:taskId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const task = await repos.taskRepo.getById(req.params.taskId);
    if (!task || task.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Task not found'));
    }

    // Enrich with user info
    const { prisma } = require('./src/db/prisma');
    const userIds = [task.assignedToUserId, task.assignedByUserId, task.createdByUserId].filter(Boolean);
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, avatar: true } })
      : [];
    const usersMap = Object.fromEntries(users.map(u => [u.id, u]));

    res.json(successResponse({
      ...task,
      assignedToUserName: usersMap[task.assignedToUserId]?.name || null,
      assignedToUserAvatar: usersMap[task.assignedToUserId]?.avatar || null,
      assignedByUserName: usersMap[task.assignedByUserId]?.name || null,
      createdByUserName: usersMap[task.createdByUserId]?.name || null,
    }));
  } catch (e) {
    logger.error('Error fetching task:', e);
    res.status(500).json(errorResponse('Failed to fetch task'));
  }
});

// Create task
app.post('/api/companies/:companyId/tasks', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { title, description, type, priority, assignedToUserId, assignedByUserId, dueDate, locationId, linkedOrderId, linkedDeliveryId, linkedInvoiceId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json(errorResponse('Task title is required'));
    }

    const created = await repos.taskRepo.create({
      id: 'task-' + uuidv4().slice(0, 8),
      businessId: req.params.companyId,
      title: title.trim(),
      description: description || null,
      type: type || 'GENERAL',
      status: 'TODO',
      priority: priority || 'NORMAL',
      assignedToUserId: assignedToUserId || null,
      assignedByUserId: assignedByUserId || req.user.id,
      createdByUserId: req.user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
      locationId: locationId || null,
      linkedOrderId: linkedOrderId || null,
      linkedDeliveryId: linkedDeliveryId || null,
      linkedInvoiceId: linkedInvoiceId || null,
    });

    res.status(201).json(successResponse(created));
  } catch (e) {
    logger.error('Error creating task:', e);
    res.status(500).json(errorResponse('Failed to create task'));
  }
});

// Update task (general fields, not status)
app.patch('/api/companies/:companyId/tasks/:taskId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const task = await repos.taskRepo.getById(req.params.taskId);
    if (!task || task.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Task not found'));
    }

    const { title, description, type, priority, assignedToUserId, assignedByUserId, dueDate, locationId, linkedOrderId, linkedDeliveryId, linkedInvoiceId } = req.body;
    const patch = {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(priority !== undefined && { priority }),
      ...(assignedToUserId !== undefined && { assignedToUserId }),
      ...(assignedByUserId !== undefined && { assignedByUserId }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(locationId !== undefined && { locationId }),
      ...(linkedOrderId !== undefined && { linkedOrderId }),
      ...(linkedDeliveryId !== undefined && { linkedDeliveryId }),
      ...(linkedInvoiceId !== undefined && { linkedInvoiceId }),
    };

    const updated = await repos.taskRepo.update(req.params.taskId, patch);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating task:', e);
    res.status(500).json(errorResponse('Failed to update task'));
  }
});

// Change task status
app.patch('/api/companies/:companyId/tasks/:taskId/status', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const task = await repos.taskRepo.getById(req.params.taskId);
    if (!task || task.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Task not found'));
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json(errorResponse('Status is required'));
    }

    const allowed = TASK_STATUS_TRANSITIONS[task.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json(errorResponse(`Cannot transition from ${task.status} to ${status}`));
    }

    const patch = { status };
    if (status === 'COMPLETED') {
      patch.completedAt = new Date();
    } else if (task.status === 'COMPLETED' && status === 'TODO') {
      patch.completedAt = null;
    }

    const updated = await repos.taskRepo.update(req.params.taskId, patch);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error changing task status:', e);
    res.status(500).json(errorResponse('Failed to change task status'));
  }
});

// Delete task
app.delete('/api/companies/:companyId/tasks/:taskId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const task = await repos.taskRepo.getById(req.params.taskId);
    if (!task || task.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Task not found'));
    }

    await repos.taskRepo.delete(req.params.taskId);
    res.json(successResponse(null, 'Task deleted'));
  } catch (e) {
    logger.error('Error deleting task:', e);
    res.status(500).json(errorResponse('Failed to delete task'));
  }
});

// Get tasks assigned to current user (cross-business)
app.get('/api/users/me/tasks', requireAuth, async (req, res) => {
  try {
    const tasks = await repos.taskRepo.getByAssignedUserId(req.user.id);
    res.json(successResponse(tasks));
  } catch (e) {
    logger.error('Error fetching personal tasks:', e);
    res.status(500).json(errorResponse('Failed to fetch tasks'));
  }
});

// ============================================================================
// COMMUNITY FEEDBACK ROUTES (suggestions + voting)
// Global community board — scoped by the authenticated user, not by company.
// ============================================================================

// List suggestions. Optional ?categoryId= filter (validated) and ?sort=top|new (default top).
app.get('/api/suggestions', requireAuth, async (req, res) => {
  try {
    const { categoryId, sort } = req.query;
    const safeCategory = FEEDBACK_CATEGORY_IDS.includes(categoryId) ? categoryId : undefined;
    const safeSort = sort === 'new' ? 'new' : 'top';
    const suggestions = await repos.suggestionRepo.list({
      userId: req.user.id,
      categoryId: safeCategory,
      sort: safeSort,
    });
    res.json(successResponse(suggestions));
  } catch (e) {
    logger.error('Error fetching suggestions:', e);
    res.status(500).json(errorResponse('Failed to fetch suggestions'));
  }
});

// Create a suggestion (rate-limited to curb spam).
app.post('/api/suggestions', requireAuth, suggestionLimiter, async (req, res) => {
  try {
    const text = (req.body?.text ?? '').trim();
    const { categoryId } = req.body ?? {};
    if (!text) {
      return res.status(400).json(errorResponse('Suggestion text is required'));
    }
    if (text.length > 1000) {
      return res.status(400).json(errorResponse('Suggestion is too long (max 1000 characters)'));
    }
    if (!FEEDBACK_CATEGORY_IDS.includes(categoryId)) {
      return res.status(400).json(errorResponse('Invalid category'));
    }
    const created = await repos.suggestionRepo.create({
      userId: req.user.id,
      categoryId,
      text,
    });
    res.status(201).json(successResponse(created, 'Suggestion submitted'));
  } catch (e) {
    logger.error('Error creating suggestion:', e);
    res.status(500).json(errorResponse('Failed to submit suggestion'));
  }
});

// Toggle the current user's vote on a suggestion. Returns the fresh { hasVoted, votes }.
app.post('/api/suggestions/:id/vote', requireAuth, async (req, res) => {
  try {
    const suggestion = await repos.suggestionRepo.getById(req.params.id);
    if (!suggestion) {
      return res.status(404).json(errorResponse('Suggestion not found'));
    }
    const result = await repos.suggestionRepo.toggleVote({
      userId: req.user.id,
      suggestionId: req.params.id,
    });
    res.json(successResponse(result, 'Vote updated'));
  } catch (e) {
    logger.error('Error toggling suggestion vote:', e);
    res.status(500).json(errorResponse('Failed to update vote'));
  }
});

// ============================================================================
// BUSINESS CONNECTION ROUTES
// ============================================================================

// Send a connection request
app.post('/api/companies/:companyId/connections', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { targetBusinessId } = req.body;
    if (!targetBusinessId) {
      return res.status(400).json(errorResponse('targetBusinessId is required'));
    }
    if (targetBusinessId === req.params.companyId) {
      return res.status(400).json(errorResponse('Cannot connect to your own business'));
    }
    const targetBusiness = await repos.businessRepo.getById(targetBusinessId);
    if (!targetBusiness) {
      return res.status(404).json(errorResponse('Target business not found'));
    }
    const connection = await prisma.businessConnection.create({
      data: {
        requesterBusinessId: req.params.companyId,
        targetBusinessId,
      },
    });
    res.status(201).json(successResponse(connection));
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json(errorResponse('Connection request already exists'));
    }
    logger.error('Error creating connection:', e);
    res.status(500).json(errorResponse('Failed to create connection'));
  }
});

// List connections for a business
app.get('/api/companies/:companyId/connections', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { status } = req.query;
    const where = {
      OR: [
        { requesterBusinessId: req.params.companyId },
        { targetBusinessId: req.params.companyId },
      ],
    };
    if (status) where.status = status;

    const connections = await prisma.businessConnection.findMany({
      where,
      include: {
        requesterBusiness: { select: { id: true, name: true, logoUrl: true } },
        targetBusiness: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(successResponse(connections));
  } catch (e) {
    logger.error('Error fetching connections:', e);
    res.status(500).json(errorResponse('Failed to fetch connections'));
  }
});

// Accept or reject a connection request
app.patch('/api/companies/:companyId/connections/:connectionId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json(errorResponse('Status must be "accepted" or "rejected"'));
    }
    const connection = await prisma.businessConnection.findUnique({
      where: { id: req.params.connectionId },
    });
    if (!connection || connection.targetBusinessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Connection request not found'));
    }
    if (connection.status !== 'pending') {
      return res.status(400).json(errorResponse('Connection request already responded to'));
    }
    const updated = await prisma.businessConnection.update({
      where: { id: req.params.connectionId },
      data: { status },
    });
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating connection:', e);
    res.status(500).json(errorResponse('Failed to update connection'));
  }
});

// Remove a connection
app.delete('/api/companies/:companyId/connections/:connectionId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const connection = await prisma.businessConnection.findUnique({
      where: { id: req.params.connectionId },
    });
    if (!connection ||
      (connection.requesterBusinessId !== req.params.companyId &&
       connection.targetBusinessId !== req.params.companyId)) {
      return res.status(404).json(errorResponse('Connection not found'));
    }
    await prisma.businessConnection.delete({ where: { id: req.params.connectionId } });
    res.json(successResponse(null, 'Connection removed'));
  } catch (e) {
    logger.error('Error deleting connection:', e);
    res.status(500).json(errorResponse('Failed to delete connection'));
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
    // Filtering, sorting and pagination are pushed into SQL (see orderRepo).
    const { status, scope, soldByScope, soldByLocationId, fulfillmentLocationId, search, limit, offset } = req.query;

    const businessOrders = await repos.orderRepo.getByBusinessId(req.params.companyId, {
      status,
      soldByScope: scope || soldByScope,
      soldByLocationId,
      fulfillmentLocationId,
      search,
      limit: limit || 200,
      offset,
    });

    res.json(successResponse(businessOrders, 'Orders retrieved successfully'));
  } catch (err) {
    logger.error('Error fetching business orders:', err);
    res.status(500).json(errorResponse('Failed to retrieve orders', 'FETCH_ERROR'));
  }
});

// Get orders placed BY this business to other businesses (buyer's outgoing view)
// Returns orders where buyerBusinessId matches the requesting business
app.get('/api/companies/:companyId/placed-orders', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    // Filtering, sorting and pagination are pushed into SQL (see orderRepo).
    const { status, search, limit, offset } = req.query;

    const placedOrders = await repos.orderRepo.getByBuyerBusinessId(req.params.companyId, {
      status,
      search,
      limit: limit || 200,
      offset,
    });

    res.json(successResponse(placedOrders, 'Placed orders retrieved successfully'));
  } catch (err) {
    logger.error('Error fetching placed orders:', err);
    res.status(500).json(errorResponse('Failed to retrieve placed orders', 'FETCH_ERROR'));
  }
});

// Create order at Parent level (always allowed for paid plans)
app.post('/api/companies/:companyId/orders', requireAuth, async (req, res) => {
  try {
    // Validate the body first: we need to know whether this is a B2B buyer
    // order (placed BY a buyer company AT a supplier) or a seller-created
    // order (B2C / manual entry by the selling company). The two cases have
    // different authorization rules.
    const orderData = validateBody(createOrderSchema, req, res);
    if (!orderData) return;

    const {
      customerName, customerAddress, customerPhone,
      items, totalAmount, notes, fulfillmentLocationId,
      buyerBusinessId, buyerBusinessName, createdBy, manualPriceListId
    } = orderData;

    const isB2B = !!buyerBusinessId;

    // AUTHORIZATION — only business accounts can place orders:
    //  - B2B buyer order: the authenticated user must be a member of the BUYER
    //    business placing the order. They do NOT need to belong to the supplier,
    //    which is what lets a company order from a different supplier.
    //  - Seller-created order (no buyer business): the user must be a member of
    //    the selling company (companyId), as before.
    // A personal account belongs to neither, so it is rejected with 403.
    if (isB2B) {
      if (!(await requireBusinessMembership(req, res, buyerBusinessId))) return;
    } else {
      if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
    }

    // The selling company must exist and have selling enabled (paid plan).
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    }

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canCreateSellingOrders) {
      return res.status(403).json(paywallResponse(
        'This supplier is not set up to receive orders (requires a paid subscription).',
        'create_selling_order',
        'pro'
      ));
    }

    // PRICE AUTHORITY (price lists): resolve the buyer's effective prices server-side.
    //  - B2B buyer-placed orders: fully authoritative — the buyer can't forge a price.
    //    Auto-assignment governs; product lines are repriced to base when no list applies.
    //  - Seller-created (manual/guest) orders: the seller may set custom prices, so only
    //    a manually-selected (or default) list overrides; otherwise client prices are kept.
    const resolvedList = await resolvePriceListForBuyer(
      req.params.companyId,
      isB2B ? buyerBusinessId : null,
      { manualPriceListId: isB2B ? null : (manualPriceListId || null) }
    );
    const priced = await repriceLineItems(resolvedList, items, req.params.companyId, { forceBase: isB2B });
    if (priced.changed) {
      logger.info(`[priceList] order repriced for seller ${req.params.companyId}` +
        `${resolvedList ? ` via list ${resolvedList.id}` : ''} (client total ${totalAmount} → ${priced.totalAmount})`);
    }

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
      items: priced.items,
      totalAmount: priced.totalAmount,
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
      logger.error('Failed to create order event message:', msgErr);
      // Don't fail the order creation if message creation fails
    }

    res.status(201).json(successResponse(created, 'Order created successfully'));
  } catch (err) {
    logger.error('Error creating business order:', err);
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
        if (linkedDelivery && linkedDelivery.deliveryStatus === DS.NOT_ASSIGNED) {
          await repos.deliveryRepo.update(linkedDelivery.id, { deliveryStatus: DS.ASSIGNED });
        }
      } catch (syncErr) {
        logger.warn('Failed to sync order assign to delivery:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(req.params.orderId);
      }
    }

    res.json(successResponse(updated, 'Order assigned successfully'));
  } catch (err) {
    logger.error('Error assigning order:', err);
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
    logger.error('Error fetching order:', err);
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
          logger.warn('Failed to sync order paymentStatus to delivery:', syncErr.message);
        } finally {
          _orderDeliverySyncInProgress.delete(req.params.orderId);
        }
      }
    }

    res.json(successResponse(updated, 'Order updated successfully'));
  } catch (err) {
    logger.error('Error updating order:', err);
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
          const deliveryStatus = status === 'DONE' ? DS.DELIVERED : DS.CANCELED;
          await repos.deliveryRepo.update(linkedDelivery.id, { deliveryStatus });
        }
      } catch (syncErr) {
        logger.warn('Failed to sync order status to delivery:', syncErr.message);
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
      logger.error('Failed to create status update message:', msgErr);
      // Don't fail the status update if message creation fails
    }

    // Push notification for order status change (non-blocking)
    if (updated.createdBy && updated.createdBy !== req.user?.id) {
      pushService.sendToUsers({
        userIds: [updated.createdBy],
        title: 'Order Update',
        body: `Order status changed to ${status}`,
        category: 'orders',
        data: { type: 'order_status', orderId: updated.id, status },
      }, repos).catch((err) => logger.error('[Push] Order status push error:', err));
    }

    res.json(successResponse(updated, 'Order status updated successfully'));
  } catch (err) {
    logger.error('Error changing order status:', err);
    
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
    const allowedStatuses = new Set(Object.values(DS));

    if (!allowedStatuses.has(deliveryStatus)) {
      return res.status(400).json(errorResponse(
        `Invalid delivery status. Allowed values: ${Array.from(allowedStatuses).join(', ')}`,
        'INVALID_DELIVERY_STATUS'
      ));
    }

    // Validate state machine transition
    const currentDeliveryStatus = order.deliveryStatus || DS.NOT_ASSIGNED;
    if (!isValidDeliveryTransition(currentDeliveryStatus, deliveryStatus)) {
      return res.status(400).json(errorResponse(
        `Invalid delivery status transition from ${currentDeliveryStatus} to ${deliveryStatus}`,
        'INVALID_STATUS_TRANSITION'
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
        logger.warn('Failed to sync delivery status to delivery record:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(req.params.orderId);
      }
    }

    res.json(successResponse(updated, 'Delivery status updated successfully'));
  } catch (err) {
    logger.error('Error updating delivery status:', err);
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
    logger.error('Error fetching order status history:', err);
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
    logger.error('Error fetching valid transitions:', err);
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
// [location-mode] Not yet called by the app -- kept for the planned DEPENDENT/INDEPENDENT-location feature (AUDIT.md P3).
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
    logger.error('Error fetching location orders:', err);
    res.status(500).json(errorResponse('Failed to retrieve orders', 'FETCH_ERROR'));
  }
});

// Create order at Location level (INDEPENDENT locations only) - INTERNAL USE
// For customer-facing orders, use /api/public/locations/:locationId/orders
// [location-mode] Not yet called by the app -- kept for the planned DEPENDENT/INDEPENDENT-location feature (AUDIT.md P3).
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
      return res.status(403).json(paywallResponse('Creating orders from independent locations requires an Enterprise subscription.', 'independent_locations', 'enterprise'));
    }

    if (!capabilities.canCreateSellingOrders) {
      return res.status(403).json(paywallResponse(
        'Creating orders requires a paid subscription.',
        'create_selling_order',
        'pro'
      ));
    }

    // Validate request body with Zod schema (same as company-level order create)
    const orderData = validateBody(createOrderSchema, req, res);
    if (!orderData) return;

    const { customerName, customerAddress, customerPhone, items, totalAmount, notes,
            buyerBusinessId, buyerBusinessName, createdBy } = orderData;

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
      logger.error('Failed to create order event message:', msgErr);
      // Don't fail the order creation if message creation fails
    }

    res.status(201).json(successResponse(created, 'Order created successfully'));
  } catch (err) {
    logger.error('Error creating location order:', err);
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
            const deliveryStatus = newStatus === 'DONE' ? DS.DELIVERED : DS.CANCELED;
            await repos.deliveryRepo.update(linkedDelivery.id, { deliveryStatus });
          }
        } catch (syncErr) {
          logger.warn('Failed to sync location order status to delivery:', syncErr.message);
        } finally {
          _orderDeliverySyncInProgress.delete(req.params.orderId);
        }
      }
    } else {
      updated = await repos.orderRepo.update(req.params.orderId, updates);
    }

    res.json(successResponse(updated, 'Order updated successfully'));
  } catch (err) {
    logger.error('Error updating location order:', err);
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
    logger.error('Error fetching location order:', err);
    res.status(500).json(errorResponse('Failed to retrieve order', 'FETCH_ERROR'));
  }
});

// ============================================================================
// STOCK ROUTES (location-level inventory)
// ============================================================================

// Get stock for a location
// [location-mode] Not yet called by the app -- kept for the planned DEPENDENT/INDEPENDENT-location feature (AUDIT.md P3).
app.get('/api/locations/:locationId/stock', requireAuth, async (req, res) => {
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
    logger.error('Error fetching location stock:', e);
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

    // Set absolute on-hand via stockService so the change is ledgered
    // (records the delta as a manual_adjust movement).
    const updated = await stockService.setOnHand({
      businessId: locationBusinessId,
      locationId,
      productId,
      qtyOnHand,
      createdBy: req.user?.id || null,
    });

    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating stock:', e);
    res.status(500).json(errorResponse('Failed to update stock'));
  }
});

// Get stock for a business (all locations)
// [location-mode] Not yet called by the app -- kept for the planned DEPENDENT/INDEPENDENT-location feature (AUDIT.md P3).
app.get('/api/companies/:companyId/stock', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId } = req.params;

    const businessStock = await repos.stockRepo.getByBusinessId(companyId);

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
    logger.error('Error fetching business stock:', e);
    res.status(500).json(errorResponse('Failed to load business stock'));
  }
});

// ============================================================================
// PROCUREMENT ROUTES
// ============================================================================

const purchaseOrderStatusService = require('./src/services/purchaseOrderStatus');

// Rate limiter for procurement write operations (20 per minute per user)
const procurementLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: { success: false, message: 'Too many procurement requests, please slow down' },
  validate: { xForwardedForHeader: false },
});

// ── Supplier CRUD ──

// GET /api/companies/:companyId/suppliers — list suppliers
app.get('/api/companies/:companyId/suppliers', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canViewSuppliers) {
      return res.status(403).json(paywallResponse('Viewing suppliers requires a paid subscription.', 'create_procurement', 'pro'));
    }

    const suppliers = await repos.procurementRepo.getSuppliers(req.params.companyId);
    res.json(successResponse(suppliers));
  } catch (e) {
    logger.error('Error fetching suppliers:', e);
    res.status(500).json(errorResponse('Failed to load suppliers'));
  }
});

// POST /api/companies/:companyId/suppliers — create supplier
app.post('/api/companies/:companyId/suppliers', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canManageSuppliers) {
      return res.status(403).json(paywallResponse('Managing suppliers requires a paid subscription.', 'create_procurement', 'pro'));
    }

    // Check supplier limit
    const currentCount = await repos.procurementRepo.countSuppliers(req.params.companyId);
    if (currentCount >= capabilities.maxSuppliers) {
      return res.status(403).json(errorResponse(
        `Supplier limit reached (${capabilities.maxSuppliers}). Upgrade your plan for more.`,
        'LIMIT_REACHED'
      ));
    }

    const { name, contactName, email, phone, address, paymentTerms, leadTimeDays, creditLimit, notes, supplierBusinessId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json(errorResponse('Supplier name is required', 'VALIDATION_ERROR'));
    }

    const supplier = await repos.procurementRepo.createSupplier({
      id: 'SUP-' + uuidv4().slice(0, 8).toUpperCase(),
      businessId: req.params.companyId,
      name: name.trim(),
      contactName: contactName || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      paymentTerms: paymentTerms || null,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : null,
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      notes: notes || null,
      supplierBusinessId: supplierBusinessId || null,
    });

    res.status(201).json(successResponse(supplier, 'Supplier created'));
  } catch (e) {
    logger.error('Error creating supplier:', e);
    if (e.code === 'P2002') {
      return res.status(409).json(errorResponse('This business is already linked as a supplier', 'DUPLICATE'));
    }
    res.status(500).json(errorResponse('Failed to create supplier'));
  }
});

// GET /api/companies/:companyId/suppliers/:supplierId — get supplier detail
app.get('/api/companies/:companyId/suppliers/:supplierId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const supplier = await repos.procurementRepo.getSupplierById(req.params.supplierId);
    if (!supplier || supplier.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Supplier not found', 'NOT_FOUND'));
    }
    res.json(successResponse(supplier));
  } catch (e) {
    logger.error('Error fetching supplier:', e);
    res.status(500).json(errorResponse('Failed to load supplier'));
  }
});

// PATCH /api/companies/:companyId/suppliers/:supplierId — update supplier
app.patch('/api/companies/:companyId/suppliers/:supplierId', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const supplier = await repos.procurementRepo.getSupplierById(req.params.supplierId);
    if (!supplier || supplier.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Supplier not found', 'NOT_FOUND'));
    }

    const allowedFields = ['name', 'contactName', 'email', 'phone', 'address', 'paymentTerms', 'leadTimeDays', 'creditLimit', 'rating', 'status', 'notes'];
    const patch = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.leadTimeDays) patch.leadTimeDays = parseInt(patch.leadTimeDays, 10);
    if (patch.creditLimit) patch.creditLimit = parseFloat(patch.creditLimit);
    if (patch.rating) patch.rating = parseFloat(patch.rating);

    const updated = await repos.procurementRepo.updateSupplier(req.params.supplierId, patch);
    res.json(successResponse(updated, 'Supplier updated'));
  } catch (e) {
    logger.error('Error updating supplier:', e);
    res.status(500).json(errorResponse('Failed to update supplier'));
  }
});

// DELETE /api/companies/:companyId/suppliers/:supplierId — delete supplier
app.delete('/api/companies/:companyId/suppliers/:supplierId', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canManageSuppliers) {
      return res.status(403).json(paywallResponse('Managing suppliers requires a paid subscription.', 'create_procurement', 'pro'));
    }

    const supplier = await repos.procurementRepo.getSupplierById(req.params.supplierId);
    if (!supplier || supplier.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Supplier not found', 'NOT_FOUND'));
    }

    await repos.procurementRepo.deleteSupplier(req.params.supplierId);
    res.json(successResponse(null, 'Supplier deleted'));
  } catch (e) {
    logger.error('Error deleting supplier:', e);
    res.status(500).json(errorResponse('Failed to delete supplier'));
  }
});

// ── Supplier Products ──

// GET /api/companies/:companyId/suppliers/:supplierId/products
app.get('/api/companies/:companyId/suppliers/:supplierId/products', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const supplier = await repos.procurementRepo.getSupplierById(req.params.supplierId);
    if (!supplier || supplier.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Supplier not found', 'NOT_FOUND'));
    }

    const products = await repos.procurementRepo.getSupplierProducts(req.params.supplierId);
    res.json(successResponse(products));
  } catch (e) {
    logger.error('Error fetching supplier products:', e);
    res.status(500).json(errorResponse('Failed to load supplier products'));
  }
});

// POST /api/companies/:companyId/suppliers/:supplierId/products
app.post('/api/companies/:companyId/suppliers/:supplierId/products', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const supplier = await repos.procurementRepo.getSupplierById(req.params.supplierId);
    if (!supplier || supplier.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Supplier not found', 'NOT_FOUND'));
    }

    const { productId, supplierPrice, minOrderQty, bulkPrice, bulkMinQty, supplierSKU, leadTimeDays } = req.body;

    if (!productId) return res.status(400).json(errorResponse('productId is required', 'VALIDATION_ERROR'));
    if (supplierPrice === undefined || supplierPrice === null) {
      return res.status(400).json(errorResponse('supplierPrice is required', 'VALIDATION_ERROR'));
    }

    const result = await repos.procurementRepo.upsertSupplierProduct({
      supplierId: req.params.supplierId,
      productId,
      supplierPrice: parseFloat(supplierPrice),
      minOrderQty: minOrderQty ? parseInt(minOrderQty, 10) : null,
      bulkPrice: bulkPrice ? parseFloat(bulkPrice) : null,
      bulkMinQty: bulkMinQty ? parseInt(bulkMinQty, 10) : null,
      supplierSKU: supplierSKU || null,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : null,
    });

    res.status(201).json(successResponse(result, 'Supplier product saved'));
  } catch (e) {
    logger.error('Error saving supplier product:', e);
    res.status(500).json(errorResponse('Failed to save supplier product'));
  }
});

// PATCH /api/companies/:companyId/suppliers/:supplierId/products/:spId
app.patch('/api/companies/:companyId/suppliers/:supplierId/products/:spId', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    // Validate supplier belongs to this business
    const supplier = await repos.procurementRepo.getSupplierById(req.params.supplierId);
    if (!supplier || supplier.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Supplier not found', 'NOT_FOUND'));
    }

    const { supplierPrice, minOrderQty, bulkPrice, bulkMinQty, supplierSKU, leadTimeDays } = req.body;
    const patch = {};
    if (supplierPrice !== undefined) patch.supplierPrice = parseFloat(supplierPrice);
    if (minOrderQty !== undefined) patch.minOrderQty = minOrderQty ? parseInt(minOrderQty, 10) : null;
    if (bulkPrice !== undefined) patch.bulkPrice = bulkPrice ? parseFloat(bulkPrice) : null;
    if (bulkMinQty !== undefined) patch.bulkMinQty = bulkMinQty ? parseInt(bulkMinQty, 10) : null;
    if (supplierSKU !== undefined) patch.supplierSKU = supplierSKU || null;
    if (leadTimeDays !== undefined) patch.leadTimeDays = leadTimeDays ? parseInt(leadTimeDays, 10) : null;

    const updated = await repos.procurementRepo.updateSupplierProduct(req.params.spId, patch);
    res.json(successResponse(updated, 'Supplier product updated'));
  } catch (e) {
    logger.error('Error updating supplier product:', e);
    res.status(500).json(errorResponse('Failed to update supplier product'));
  }
});

// DELETE /api/companies/:companyId/suppliers/:supplierId/products/:spId
app.delete('/api/companies/:companyId/suppliers/:supplierId/products/:spId', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    await repos.procurementRepo.deleteSupplierProduct(req.params.spId);
    res.json(successResponse(null, 'Supplier product removed'));
  } catch (e) {
    logger.error('Error deleting supplier product:', e);
    res.status(500).json(errorResponse('Failed to delete supplier product'));
  }
});

// ── Purchase Requests ──

// GET /api/companies/:companyId/purchase-requests
app.get('/api/companies/:companyId/purchase-requests', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canCreatePurchaseRequests) {
      return res.status(403).json(paywallResponse('Purchase requests require a paid subscription.', 'create_procurement', 'pro'));
    }

    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.locationId) filters.locationId = req.query.locationId;
    if (req.query.supplierId) filters.supplierId = req.query.supplierId;

    const requests = await repos.procurementRepo.getPurchaseRequests(req.params.companyId, filters);
    res.json(successResponse(requests));
  } catch (e) {
    logger.error('Error fetching purchase requests:', e);
    res.status(500).json(errorResponse('Failed to load purchase requests'));
  }
});

// POST /api/companies/:companyId/purchase-requests — create PR
app.post('/api/companies/:companyId/purchase-requests', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canCreatePurchaseRequests) {
      return res.status(403).json(paywallResponse('Purchase requests require a paid subscription.', 'create_procurement', 'pro'));
    }

    const { supplierId, locationId, items, totalAmount, notes, priority, requiredByDate } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(errorResponse('Items array is required', 'VALIDATION_ERROR'));
    }

    const pr = await repos.procurementRepo.createPurchaseRequest({
      id: 'PR-' + uuidv4().slice(0, 8).toUpperCase(),
      businessId: req.params.companyId,
      supplierId: supplierId || null,
      locationId: locationId || null,
      requestedBy: req.user?.id,
      priority: priority || 'NORMAL',
      status: 'DRAFT',
      items,
      totalAmount: totalAmount ? parseFloat(totalAmount) : null,
      notes: notes || null,
      requiredByDate: requiredByDate ? new Date(requiredByDate) : null,
    });

    // Activity event (non-blocking)
    try {
      const eventMessages = require('./src/services/eventMessages');
      await eventMessages.createEventMessage({
        type: 'purchase_request_created',
        fromBusinessId: req.params.companyId,
        toBusinessId: null,
        entityId: pr.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Staff',
        metadata: { status: pr.status, priority: pr.priority },
      });
    } catch (_) {}

    res.status(201).json(successResponse(pr, 'Purchase request created'));
  } catch (e) {
    logger.error('Error creating purchase request:', e);
    res.status(500).json(errorResponse('Failed to create purchase request'));
  }
});

// GET /api/companies/:companyId/purchase-requests/:prId
app.get('/api/companies/:companyId/purchase-requests/:prId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const pr = await repos.procurementRepo.getPurchaseRequestById(req.params.prId);
    if (!pr || pr.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase request not found', 'NOT_FOUND'));
    }
    res.json(successResponse(pr));
  } catch (e) {
    logger.error('Error fetching purchase request:', e);
    res.status(500).json(errorResponse('Failed to load purchase request'));
  }
});

// PATCH /api/companies/:companyId/purchase-requests/:prId — update PR (only if DRAFT)
app.patch('/api/companies/:companyId/purchase-requests/:prId', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const pr = await repos.procurementRepo.getPurchaseRequestById(req.params.prId);
    if (!pr || pr.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase request not found', 'NOT_FOUND'));
    }
    if (pr.status !== 'DRAFT') {
      return res.status(400).json(errorResponse('Only draft purchase requests can be edited', 'INVALID_STATE'));
    }

    const allowedFields = ['supplierId', 'locationId', 'items', 'totalAmount', 'notes', 'priority', 'requiredByDate'];
    const patch = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.totalAmount) patch.totalAmount = parseFloat(patch.totalAmount);
    if (patch.requiredByDate) patch.requiredByDate = new Date(patch.requiredByDate);

    const updated = await repos.procurementRepo.updatePurchaseRequest(req.params.prId, patch);
    res.json(successResponse(updated, 'Purchase request updated'));
  } catch (e) {
    logger.error('Error updating purchase request:', e);
    res.status(500).json(errorResponse('Failed to update purchase request'));
  }
});

// POST /api/companies/:companyId/purchase-requests/:prId/submit — DRAFT → SUBMITTED
app.post('/api/companies/:companyId/purchase-requests/:prId/submit', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const pr = await repos.procurementRepo.getPurchaseRequestById(req.params.prId);
    if (!pr || pr.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase request not found', 'NOT_FOUND'));
    }
    if (pr.status !== 'DRAFT') {
      return res.status(400).json(errorResponse('Only draft requests can be submitted', 'INVALID_STATE'));
    }

    const updated = await repos.procurementRepo.updatePurchaseRequest(req.params.prId, { status: 'SUBMITTED' });

    // Activity event (non-blocking)
    try {
      const eventMessages = require('./src/services/eventMessages');
      await eventMessages.createEventMessage({
        type: 'purchase_request_submitted',
        fromBusinessId: req.params.companyId,
        toBusinessId: null,
        entityId: pr.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Staff',
        metadata: { status: 'SUBMITTED', priority: pr.priority },
      });
    } catch (_) {}

    res.json(successResponse(updated, 'Purchase request submitted'));
  } catch (e) {
    logger.error('Error submitting purchase request:', e);
    res.status(500).json(errorResponse('Failed to submit purchase request'));
  }
});

// POST /api/companies/:companyId/purchase-requests/:prId/approve
app.post('/api/companies/:companyId/purchase-requests/:prId/approve', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canApprovePurchaseRequests) {
      return res.status(403).json(paywallResponse('Approving purchase requests requires Business plan or higher.', 'approve_procurement', 'business'));
    }

    const pr = await repos.procurementRepo.getPurchaseRequestById(req.params.prId);
    if (!pr || pr.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase request not found', 'NOT_FOUND'));
    }
    if (pr.status !== 'SUBMITTED') {
      return res.status(400).json(errorResponse('Only submitted requests can be approved', 'INVALID_STATE'));
    }

    const updated = await repos.procurementRepo.updatePurchaseRequest(req.params.prId, {
      status: 'APPROVED',
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    });

    // Activity event (non-blocking)
    try {
      const eventMessages = require('./src/services/eventMessages');
      await eventMessages.createEventMessage({
        type: 'purchase_request_approved',
        fromBusinessId: req.params.companyId,
        toBusinessId: null,
        entityId: pr.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Admin',
        metadata: { status: 'APPROVED' },
      });
    } catch (_) {}

    res.json(successResponse(updated, 'Purchase request approved'));
  } catch (e) {
    logger.error('Error approving purchase request:', e);
    res.status(500).json(errorResponse('Failed to approve purchase request'));
  }
});

// POST /api/companies/:companyId/purchase-requests/:prId/reject
app.post('/api/companies/:companyId/purchase-requests/:prId/reject', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canApprovePurchaseRequests) {
      return res.status(403).json(paywallResponse('Rejecting purchase requests requires Business plan or higher.', 'approve_procurement', 'business'));
    }

    const pr = await repos.procurementRepo.getPurchaseRequestById(req.params.prId);
    if (!pr || pr.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase request not found', 'NOT_FOUND'));
    }
    if (pr.status !== 'SUBMITTED') {
      return res.status(400).json(errorResponse('Only submitted requests can be rejected', 'INVALID_STATE'));
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length < 2) {
      return res.status(400).json(errorResponse('A rejection reason is required', 'VALIDATION_ERROR'));
    }

    const updated = await repos.procurementRepo.updatePurchaseRequest(req.params.prId, {
      status: 'REJECTED',
      rejectionReason: reason.trim(),
    });

    // Activity event (non-blocking)
    try {
      const eventMessages = require('./src/services/eventMessages');
      await eventMessages.createEventMessage({
        type: 'purchase_request_rejected',
        fromBusinessId: req.params.companyId,
        toBusinessId: null,
        entityId: pr.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Admin',
        metadata: { status: 'REJECTED', reason: reason.trim() },
      });
    } catch (_) {}

    res.json(successResponse(updated, 'Purchase request rejected'));
  } catch (e) {
    logger.error('Error rejecting purchase request:', e);
    res.status(500).json(errorResponse('Failed to reject purchase request'));
  }
});

// POST /api/companies/:companyId/purchase-requests/:prId/convert — APPROVED → CONVERTED, creates PO
app.post('/api/companies/:companyId/purchase-requests/:prId/convert', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const pr = await repos.procurementRepo.getPurchaseRequestById(req.params.prId);
    if (!pr || pr.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase request not found', 'NOT_FOUND'));
    }
    if (pr.status !== 'APPROVED') {
      return res.status(400).json(errorResponse('Only approved requests can be converted to a purchase order', 'INVALID_STATE'));
    }
    if (!pr.supplierId) {
      return res.status(400).json(errorResponse('A supplier must be assigned before converting', 'VALIDATION_ERROR'));
    }

    // Create PO from PR
    const poId = 'PO-' + uuidv4().slice(0, 8).toUpperCase();
    const po = await repos.procurementRepo.createPurchaseOrder({
      id: poId,
      businessId: req.params.companyId,
      supplierId: pr.supplierId,
      purchaseRequestId: pr.id,
      locationId: pr.locationId,
      items: pr.items,
      totalAmount: pr.totalAmount,
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      createdBy: req.user?.id,
    });

    // Mark PR as converted
    await repos.procurementRepo.updatePurchaseRequest(pr.id, {
      status: 'CONVERTED',
      purchaseOrderId: poId,
    });

    res.status(201).json(successResponse(po, 'Purchase request converted to purchase order'));
  } catch (e) {
    logger.error('Error converting purchase request:', e);
    res.status(500).json(errorResponse('Failed to convert purchase request'));
  }
});

// ── Purchase Orders ──

// GET /api/companies/:companyId/purchase-orders
app.get('/api/companies/:companyId/purchase-orders', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canCreatePurchaseOrders) {
      return res.status(403).json(paywallResponse('Purchase orders require a paid subscription.', 'create_procurement', 'pro'));
    }

    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.supplierId) filters.supplierId = req.query.supplierId;
    if (req.query.locationId) filters.locationId = req.query.locationId;

    const orders = await repos.procurementRepo.getPurchaseOrders(req.params.companyId, filters);
    res.json(successResponse(orders));
  } catch (e) {
    logger.error('Error fetching purchase orders:', e);
    res.status(500).json(errorResponse('Failed to load purchase orders'));
  }
});

// POST /api/companies/:companyId/purchase-orders — create PO
app.post('/api/companies/:companyId/purchase-orders', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canCreatePurchaseOrders) {
      return res.status(403).json(paywallResponse('Purchase orders require a paid subscription.', 'create_procurement', 'pro'));
    }

    const { supplierId, purchaseRequestId, locationId, items, totalAmount, paymentTerms, expectedDeliveryDate, notes } = req.body;

    if (!supplierId) return res.status(400).json(errorResponse('supplierId is required', 'VALIDATION_ERROR'));
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(errorResponse('Items array is required', 'VALIDATION_ERROR'));
    }

    const poId = 'PO-' + uuidv4().slice(0, 8).toUpperCase();
    const po = await repos.procurementRepo.createPurchaseOrder({
      id: poId,
      businessId: req.params.companyId,
      supplierId,
      purchaseRequestId: purchaseRequestId || null,
      locationId: locationId || null,
      poNumber: poId,
      items,
      totalAmount: totalAmount ? parseFloat(totalAmount) : null,
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      paymentTerms: paymentTerms || null,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      notes: notes || null,
      createdBy: req.user?.id,
    });

    res.status(201).json(successResponse(po, 'Purchase order created'));
  } catch (e) {
    logger.error('Error creating purchase order:', e);
    res.status(500).json(errorResponse('Failed to create purchase order'));
  }
});

// GET /api/companies/:companyId/purchase-orders/:poId
app.get('/api/companies/:companyId/purchase-orders/:poId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const po = await repos.procurementRepo.getPurchaseOrderById(req.params.poId);
    if (!po || po.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase order not found', 'NOT_FOUND'));
    }
    res.json(successResponse(po));
  } catch (e) {
    logger.error('Error fetching purchase order:', e);
    res.status(500).json(errorResponse('Failed to load purchase order'));
  }
});

// PATCH /api/companies/:companyId/purchase-orders/:poId — update PO (only if DRAFT)
app.patch('/api/companies/:companyId/purchase-orders/:poId', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const po = await repos.procurementRepo.getPurchaseOrderById(req.params.poId);
    if (!po || po.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase order not found', 'NOT_FOUND'));
    }
    if (po.status !== 'DRAFT') {
      return res.status(400).json(errorResponse('Only draft purchase orders can be edited', 'INVALID_STATE'));
    }

    const allowedFields = ['supplierId', 'locationId', 'items', 'totalAmount', 'paymentTerms', 'expectedDeliveryDate', 'notes'];
    const patch = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.totalAmount) patch.totalAmount = parseFloat(patch.totalAmount);
    if (patch.expectedDeliveryDate) patch.expectedDeliveryDate = new Date(patch.expectedDeliveryDate);

    const updated = await repos.procurementRepo.updatePurchaseOrder(req.params.poId, patch);
    res.json(successResponse(updated, 'Purchase order updated'));
  } catch (e) {
    logger.error('Error updating purchase order:', e);
    res.status(500).json(errorResponse('Failed to update purchase order'));
  }
});

// PATCH /api/companies/:companyId/purchase-orders/:poId/status — change PO status (state machine)
app.patch('/api/companies/:companyId/purchase-orders/:poId/status', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const po = await repos.procurementRepo.getPurchaseOrderById(req.params.poId);
    if (!po || po.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase order not found', 'NOT_FOUND'));
    }

    const { status: nextStatus, reason } = req.body;
    if (!nextStatus) return res.status(400).json(errorResponse('status is required', 'VALIDATION_ERROR'));

    const updatedPO = await purchaseOrderStatusService.changePurchaseOrderStatus({
      purchaseOrderId: req.params.poId,
      nextStatus,
      reason,
      userId: req.user?.id,
    });

    // Activity event (non-blocking)
    try {
      const eventMessages = require('./src/services/eventMessages');
      const eventType = nextStatus === 'SENT' ? 'purchase_order_sent'
        : nextStatus === 'CONFIRMED' ? 'purchase_order_confirmed'
        : nextStatus === 'RECEIVED' ? 'purchase_order_received'
        : 'purchase_order_status_changed';

      await eventMessages.createEventMessage({
        type: eventType,
        fromBusinessId: req.params.companyId,
        toBusinessId: null,
        entityId: po.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Admin',
        metadata: { fromStatus: po.status, toStatus: nextStatus, reason },
      });
    } catch (_) {}

    // Auto-create incoming delivery when PO is confirmed
    if (nextStatus === 'CONFIRMED') {
      try {
        const fullPO = await repos.procurementRepo.getPurchaseOrderById(req.params.poId);
        // PO can only be confirmed once (SENT → CONFIRMED), but check for duplicate just in case
        const existingDelivery = await repos.deliveryRepo.getByOrderId(fullPO.id);
        if (!existingDelivery) {
          const deliveryItems = (fullPO.items || []).map(item => ({
            productId: item.productId || null,
            name: item.productName || item.name || 'Unknown',
            price: item.unitPrice || 0,
            quantity: item.quantity || 0,
            quantityOrdered: item.quantity || 0,
            status: 'In Stock',
          }));

          await repos.deliveryRepo.create({
            id: uuidv4(),
            businessId: req.params.companyId,
            type: 'delivery',
            direction: 'incoming',
            locationId: fullPO.locationId || null,
            clientCompanyName: fullPO.supplier?.name || null,
            clientAddress: fullPO.supplier?.address || null,
            distributorName: fullPO.supplier?.name || null,
            distributorNotes: `PO:${fullPO.poNumber || fullPO.id}`,
            orderTime: new Date().toISOString(),
            expectedDeliveryDateTime: fullPO.expectedDeliveryDate
              ? fullPO.expectedDeliveryDate.toISOString()
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            items: deliveryItems,
            itemCount: deliveryItems.length,
            totalAmount: fullPO.totalAmount || 0,
            orderId: fullPO.id,
            deliveryStatus: DS.NOT_ASSIGNED,
            paymentStatus: fullPO.paymentStatus || 'UNPAID',
          });
        }
      } catch (deliveryErr) {
        logger.error('Auto-delivery creation failed (non-blocking):', deliveryErr);
      }
    }

    res.json(successResponse(updatedPO, `Purchase order status changed to ${nextStatus}`));
  } catch (e) {
    if (e.code === 'INVALID_STATUS_TRANSITION' || e.code === 'STATUS_REASON_REQUIRED' || e.code === 'INVALID_STATUS') {
      return res.status(400).json(errorResponse(e.message, e.code));
    }
    if (e.code === 'PO_NOT_FOUND') {
      return res.status(404).json(errorResponse(e.message, e.code));
    }
    logger.error('Error changing PO status:', e);
    res.status(500).json(errorResponse('Failed to change purchase order status'));
  }
});

// GET /api/companies/:companyId/purchase-orders/:poId/history
app.get('/api/companies/:companyId/purchase-orders/:poId/history', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const po = await repos.procurementRepo.getPurchaseOrderById(req.params.poId);
    if (!po || po.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase order not found', 'NOT_FOUND'));
    }

    const history = await repos.procurementRepo.getPOStatusHistory(req.params.poId);
    res.json(successResponse(history));
  } catch (e) {
    logger.error('Error fetching PO history:', e);
    res.status(500).json(errorResponse('Failed to load purchase order history'));
  }
});

// ── Goods Receipts ──

// POST /api/companies/:companyId/purchase-orders/:poId/receive — create goods receipt
app.post('/api/companies/:companyId/purchase-orders/:poId/receive', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canReceiveGoods) {
      return res.status(403).json(paywallResponse('Receiving goods requires Business plan or higher.', 'receive_goods', 'business'));
    }

    const po = await repos.procurementRepo.getPurchaseOrderById(req.params.poId);
    if (!po || po.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Purchase order not found', 'NOT_FOUND'));
    }
    if (!['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      return res.status(400).json(errorResponse('Purchase order must be confirmed before receiving goods', 'INVALID_STATE'));
    }

    const { items, notes, locationId } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(errorResponse('Items array is required', 'VALIDATION_ERROR'));
    }

    const receivingLocationId = locationId || po.locationId;

    const grn = await repos.procurementRepo.createGoodsReceipt({
      id: 'GRN-' + uuidv4().slice(0, 8).toUpperCase(),
      businessId: req.params.companyId,
      purchaseOrderId: req.params.poId,
      locationId: receivingLocationId || null,
      receivedBy: req.user?.id,
      items,
      status: 'COMPLETED',
      receivedAt: new Date(),
      notes: notes || null,
    });

    // Increment stock for received items (via stockService — ledgered + idempotent
    // per goods-receipt id, so a retried receipt never double-counts).
    if (receivingLocationId) {
      await stockService.receiveGoods({
        businessId: req.params.companyId,
        locationId: receivingLocationId,
        items,
        refType: 'po',
        refId: grn.id,
        phase: 'receive',
        createdBy: req.user?.id || null,
      });
    }

    // Determine if all items are fully received → RECEIVED, or partial → PARTIALLY_RECEIVED
    const poItems = po.items || [];
    const allGRNs = await repos.procurementRepo.getGoodsReceiptsByPO(req.params.poId);

    // Calculate total received per product across all GRNs
    const totalReceived = {};
    for (const receipt of allGRNs) {
      for (const item of (receipt.items || [])) {
        totalReceived[item.productId] = (totalReceived[item.productId] || 0) + (item.receivedQty || 0);
      }
    }

    const allFullyReceived = poItems.every(poItem => {
      const received = totalReceived[poItem.productId] || 0;
      return received >= (poItem.quantity || 0);
    });

    const newPOStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    if (po.status !== newPOStatus) {
      await purchaseOrderStatusService.changePurchaseOrderStatus({
        purchaseOrderId: req.params.poId,
        nextStatus: newPOStatus,
        userId: req.user?.id,
      });
    }

    // Activity event (non-blocking)
    try {
      const eventMessages = require('./src/services/eventMessages');
      await eventMessages.createEventMessage({
        type: 'goods_received',
        fromBusinessId: req.params.companyId,
        toBusinessId: null,
        entityId: grn.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Staff',
        metadata: { purchaseOrderId: po.id, itemCount: items.length, status: newPOStatus },
      });
    } catch (_) {}

    res.status(201).json(successResponse(grn, 'Goods receipt recorded'));
  } catch (e) {
    if (e.code === 'INVALID_STATUS_TRANSITION') {
      return res.status(400).json(errorResponse(e.message, e.code));
    }
    logger.error('Error creating goods receipt:', e);
    res.status(500).json(errorResponse('Failed to record goods receipt'));
  }
});

// GET /api/companies/:companyId/goods-receipts — list all goods receipts
app.get('/api/companies/:companyId/goods-receipts', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const business = await repos.businessRepo.getById(req.params.companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));

    const capabilities = deriveCapabilities(business);
    if (!capabilities.canReceiveGoods) {
      return res.status(403).json(paywallResponse('Viewing goods receipts requires Business plan or higher.', 'receive_goods', 'business'));
    }

    const receipts = await repos.procurementRepo.getGoodsReceipts(req.params.companyId);
    res.json(successResponse(receipts));
  } catch (e) {
    logger.error('Error fetching goods receipts:', e);
    res.status(500).json(errorResponse('Failed to load goods receipts'));
  }
});

// GET /api/companies/:companyId/goods-receipts/:grnId
app.get('/api/companies/:companyId/goods-receipts/:grnId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const grn = await repos.procurementRepo.getGoodsReceiptById(req.params.grnId);
    if (!grn || grn.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Goods receipt not found', 'NOT_FOUND'));
    }
    res.json(successResponse(grn));
  } catch (e) {
    logger.error('Error fetching goods receipt:', e);
    res.status(500).json(errorResponse('Failed to load goods receipt'));
  }
});

// PATCH /api/companies/:companyId/goods-receipts/:grnId
app.patch('/api/companies/:companyId/goods-receipts/:grnId', requireAuth, procurementLimiter, async (req, res) => {
  if (!(await requireBusinessAdmin(req, res, req.params.companyId))) return;

  try {
    const grn = await repos.procurementRepo.getGoodsReceiptById(req.params.grnId);
    if (!grn || grn.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Goods receipt not found', 'NOT_FOUND'));
    }

    const allowedFields = ['notes', 'status'];
    const patch = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }

    const updated = await repos.procurementRepo.updateGoodsReceipt(req.params.grnId, patch);
    res.json(successResponse(updated, 'Goods receipt updated'));
  } catch (e) {
    logger.error('Error updating goods receipt:', e);
    res.status(500).json(errorResponse('Failed to update goods receipt'));
  }
});

// Delivery Routes
app.get('/api/companies/:companyId/deliveries', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId } = req.params;
    const { locationId, status, assignedTo, direction, type, search } = req.query;

    let items = await repos.deliveryRepo.getByBusinessId(companyId);

    // Cutover (P9): transfers now live in the dedicated Transfer entity — hide any
    // legacy type=transfer Delivery rows from the deliveries list.
    items = items.filter(d => d.type !== 'transfer');

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
    logger.error('Error fetching deliveries:', e);
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
      return res.status(403).json(paywallResponse('Upgrade to Pro to create deliveries', 'create_deliveries', 'pro'));
    }

    const body = req.body;

    // Cutover (P9): transfers now use the dedicated Transfer entity. Reroute any
    // legacy type=transfer create so no new transfer-Delivery rows are produced.
    if (body.type === 'transfer') {
      if (!body.fromLocationId || !body.toLocationId) {
        return res.status(400).json(errorResponse('fromLocationId and toLocationId are required for transfers'));
      }
      const tItems = Array.isArray(body.items) ? body.items : [];
      const created = await repos.transferRepo.create({
        id: uuidv4(),
        businessId: companyId,
        fromLocationId: body.fromLocationId,
        toLocationId: body.toLocationId,
        fromLocationName: body.fromLocation || null,
        toLocationName: body.toLocation || null,
        status: 'Requested',
        requestedBy: req.user?.id || null,
        items: tItems,
        itemCount: body.itemCount != null ? body.itemCount : tItems.length,
        totalAmount: body.totalAmount != null ? body.totalAmount : tItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity ?? it.quantityOrdered) || 0), 0),
        assignedStaffId: body.assignedStaffId || null,
        notes: body.distributorNotes || null,
        priority: body.priority || 'normal',
        orderTime: body.orderTime || new Date().toISOString(),
        expectedAt: body.expectedDeliveryDateTime || null,
      });
      return res.status(201).json(successResponse(created));
    }

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

    // Validate assignedStaffId if provided
    if (body.assignedStaffId) {
      const allMembers = await repos.memberRepo.listBusinessMembers(companyId);
      const staffMember = allMembers.find(
        m => m.userId === body.assignedStaffId && m.status === 'accepted'
      );
      if (!staffMember) {
        return res.status(400).json(errorResponse('assignedStaffId must be an accepted business member'));
      }
      if (body.locationId && staffMember.role !== 'super_admin') {
        const locationMembersResult = await repos.memberRepo.listLocationMembers(body.locationId);
        const hasAccess = locationMembersResult.some(lm =>
          lm.userId === body.assignedStaffId && lm.status === 'accepted'
        );
        if (!hasAccess) {
          return res.status(400).json(errorResponse('Assigned staff member does not have access to the delivery location'));
        }
      }
    }

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
      fromLocationId: body.fromLocationId || null,
      toLocationId: body.toLocationId || null,
      orderTime: body.orderTime || new Date().toISOString(),
      expectedDeliveryDateTime: body.expectedDeliveryDateTime,
      itemCount,
      items: body.items || [],
      totalAmount,
      trackingNumber: body.trackingNumber || null,
      assignedStaffId: body.assignedStaffId || null,
      assignedTo: body.assignedTo || null,
      transportMode: body.transportMode || null,
      // SECURITY: Always default — caller cannot skip lifecycle by setting status at creation
      deliveryStatus: DS.NOT_ASSIGNED,
      paymentStatus: 'UNPAID',
      orderId: body.orderId || null,
    });

    // Handle optional multi-staff assignments
    if (body.staffAssignments && Array.isArray(body.staffAssignments)) {
      for (const sa of body.staffAssignments) {
        if (sa.userId) {
          try {
            await repos.deliveryStaffRepo.assign({
              deliveryId: created.id,
              userId: sa.userId,
              role: sa.role || 'driver',
              assignedBy: req.user?.id || null,
            });
          } catch (staffErr) {
            logger.warn('Failed to assign staff during delivery creation:', staffErr.message);
          }
        }
      }
      // Re-fetch with staff assignments included
      const enriched = await repos.deliveryRepo.getById(created.id);
      return res.status(201).json(successResponse(enriched));
    }

    res.status(201).json(successResponse(created));
  } catch (e) {
    logger.error('Error creating delivery:', e);
    res.status(500).json(errorResponse('Failed to create delivery'));
  }
});

// Deliveries assigned to the current user (driver "My deliveries" view)
// GET /api/companies/:companyId/my-deliveries
app.get('/api/companies/:companyId/my-deliveries', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(errorResponse('Not authenticated'));

    const rows = await repos.deliveryRepo.getByBusinessIdAndStaffId(companyId, userId);
    res.json(successResponse(rows));
  } catch (e) {
    logger.error('Error fetching my deliveries:', e);
    res.status(500).json(errorResponse('Failed to load your deliveries'));
  }
});

// Deliveries analytics — KPIs, status breakdown, weekly trend, per-driver, per-location.
// NOTE: must be registered BEFORE GET /deliveries/:deliveryId so "analytics" isn't
// captured as a delivery id.
// GET /api/companies/:companyId/deliveries/analytics?locationId=&from=&to=
app.get('/api/companies/:companyId/deliveries/analytics', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId } = req.params;
    const { locationId, from, to } = req.query;

    const now = new Date();
    const DAY_MS = 1000 * 60 * 60 * 24;
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 90 * DAY_MS);
    const toDate = to ? new Date(to) : now;
    const locWhere = locationId ? { locationId } : {};
    const baseWhere = { businessId: companyId, ...locWhere, createdAt: { gte: fromDate, lte: toDate } };

    const ACTIVE = ACTIVE_DELIVERY_STATUSES;

    const settle = async (fn, fallback) => {
      try { return await fn(); } catch (e) { logger.error('[DeliveryAnalytics] sub-query failed:', e?.message); return fallback; }
    };

    const [statusGroups, locationGroups, deliveredRows, createdRows, totalCount, lateActiveCount] = await Promise.all([
      settle(() => prisma.delivery.groupBy({ by: ['deliveryStatus'], where: baseWhere, _count: { _all: true } }), []),
      settle(() => prisma.delivery.groupBy({ by: ['locationId'], where: baseWhere, _count: { _all: true } }), []),
      settle(() => prisma.delivery.findMany({
        where: { ...baseWhere, deliveryStatus: DS.DELIVERED },
        select: { id: true, deliveredAt: true, expectedDeliveryDateTime: true, orderTime: true, createdAt: true, assignedStaffId: true },
      }), []),
      settle(() => prisma.delivery.findMany({ where: baseWhere, select: { createdAt: true, deliveredAt: true } }), []),
      settle(() => prisma.delivery.count({ where: baseWhere }), 0),
      settle(() => prisma.delivery.count({ where: { ...baseWhere, deliveryStatus: { in: ACTIVE }, expectedDeliveryDateTime: { lt: now } } }), 0),
    ]);

    // Status breakdown
    const statusBreakdown = statusGroups.map((g) => ({ status: g.deliveryStatus, count: g._count._all }));
    const countOf = (s) => statusBreakdown.filter((x) => x.status === s).reduce((a, b) => a + b.count, 0);
    const delivered = countOf(DS.DELIVERED);
    const failed = countOf(DS.FAILED);
    const canceled = countOf(DS.CANCELED);
    const active = statusBreakdown.filter((x) => ACTIVE.includes(x.status)).reduce((a, b) => a + b.count, 0);

    // On-time rate + average delivery duration (over delivered rows)
    let onTimeCount = 0;
    let durationSumMs = 0;
    let durationN = 0;
    const driverMap = {};
    for (const d of deliveredRows) {
      const eta = d.expectedDeliveryDateTime ? new Date(d.expectedDeliveryDateTime).getTime() : null;
      const del = d.deliveredAt ? new Date(d.deliveredAt).getTime() : null;
      const onTime = eta != null && del != null && del <= eta;
      if (onTime) onTimeCount++;
      const start = d.orderTime ? new Date(d.orderTime).getTime() : (d.createdAt ? new Date(d.createdAt).getTime() : null);
      if (del != null && start != null && del >= start) { durationSumMs += del - start; durationN++; }
      if (d.assignedStaffId) {
        const m = driverMap[d.assignedStaffId] || (driverMap[d.assignedStaffId] = { delivered: 0, onTime: 0 });
        m.delivered++;
        if (onTime) m.onTime++;
      }
    }
    const onTimeRate = deliveredRows.length ? Math.round((onTimeCount / deliveredRows.length) * 100) : 0;
    const avgDeliveryHours = durationN ? Math.round((durationSumMs / durationN / (1000 * 60 * 60)) * 10) / 10 : 0;

    // Per-driver (resolve names)
    const driverIds = Object.keys(driverMap);
    let perDriver = [];
    if (driverIds.length) {
      const users = await settle(() => repos.userRepo.getByIds(driverIds), []);
      const nameById = {};
      (users || []).forEach((u) => { if (u) nameById[u.id] = u.name; });
      perDriver = driverIds
        .map((id) => ({
          userId: id,
          name: nameById[id] || 'Unknown',
          delivered: driverMap[id].delivered,
          onTimeRate: driverMap[id].delivered ? Math.round((driverMap[id].onTime / driverMap[id].delivered) * 100) : 0,
        }))
        .sort((a, b) => b.delivered - a.delivered);
    }

    // Per-location (resolve names)
    let perLocation = [];
    if (locationGroups.length) {
      const locs = await settle(() => repos.locationRepo.getByBusinessId(companyId), []);
      const locName = {};
      (locs || []).forEach((l) => { locName[l.id] = l.name; });
      perLocation = locationGroups
        .map((g) => ({
          locationId: g.locationId,
          name: g.locationId ? (locName[g.locationId] || 'Unknown') : 'Unassigned',
          total: g._count._all,
        }))
        .sort((a, b) => b.total - a.total);
    }

    // Weekly trend — bucket created/delivered counts by ISO week (Monday start), last 12 weeks
    const weekKey = (ts) => {
      const d = new Date(ts);
      const dow = (d.getDay() + 6) % 7; // Monday = 0
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - dow);
      return d.getTime();
    };
    const trendMap = {};
    for (const r of createdRows) {
      if (r.createdAt) {
        const k = weekKey(r.createdAt);
        (trendMap[k] || (trendMap[k] = { created: 0, delivered: 0 })).created++;
      }
      if (r.deliveredAt) {
        const k = weekKey(r.deliveredAt);
        (trendMap[k] || (trendMap[k] = { created: 0, delivered: 0 })).delivered++;
      }
    }
    const weeklyTrend = Object.keys(trendMap)
      .map((k) => ({ weekStart: new Date(Number(k)).toISOString(), created: trendMap[k].created, delivered: trendMap[k].delivered }))
      .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
      .slice(-12);

    res.json(successResponse({
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      summary: { total: totalCount, delivered, active, failed, canceled, onTimeRate, avgDeliveryHours, lateActiveCount },
      statusBreakdown,
      weeklyTrend,
      perDriver,
      perLocation,
    }));
  } catch (e) {
    logger.error('Error building delivery analytics:', e);
    res.status(500).json(errorResponse('Failed to load delivery analytics'));
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
    logger.error('Error fetching delivery:', e);
    res.status(500).json(errorResponse('Failed to load delivery'));
  }
});

// Delivery status-change audit trail (newest first)
// GET /api/companies/:companyId/deliveries/:deliveryId/history
app.get('/api/companies/:companyId/deliveries/:deliveryId/history', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

  try {
    const { companyId, deliveryId } = req.params;
    const delivery = await repos.deliveryRepo.getById(deliveryId);

    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    const history = await deliveryStatusService.getDeliveryStatusHistory(deliveryId);
    res.json(successResponse(history));
  } catch (e) {
    logger.error('Error fetching delivery history:', e);
    res.status(500).json(errorResponse('Failed to load delivery history'));
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

    // Whitelist allowed NON-STATUS update fields. Status changes are routed
    // through deliveryStatusService (validation + audit history + DELIVERED
    // side-effects). POD fields ride along on the DELIVERED status change.
    const allowedDeliveryFields = ['paymentStatus', 'assignedStaffId',
      'assignedTo', 'transportMode', 'distributorNotes', 'clientNotes',
      'trackingNumber', 'expectedDeliveryDateTime', 'items',
      'clientCompanyName', 'clientAddress', 'clientEmail', 'clientPhone',
      'fromLocationId', 'toLocationId'];
    const updateData = {};
    for (const key of allowedDeliveryFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const nextStatus = req.body.deliveryStatus;
    const isStatusChange = !!nextStatus && nextStatus !== delivery.deliveryStatus;

    let updated;
    try {
      // Apply non-status field updates first (so a stock-moving transfer sees
      // the latest items/locations when its status flips to DELIVERED).
      if (Object.keys(updateData).length > 0) {
        updated = await repos.deliveryRepo.update(deliveryId, updateData);
      }

      // Route status changes through the service (validation + history + stock).
      if (isStatusChange) {
        updated = await deliveryStatusService.changeDeliveryStatus({
          deliveryId,
          nextStatus,
          changedBy: req.user?.id || null,
          reason: req.body.statusReason || null,
          pod: { podPhotoUrl: req.body.podPhotoUrl, podSignatureUrl: req.body.podSignatureUrl },
        });
      } else if (!updated) {
        updated = await repos.deliveryRepo.getById(deliveryId);
      }
    } catch (err) {
      if (err.code === 'INVALID_STATUS_TRANSITION' || err.code === 'INVALID_STATUS') {
        return res.status(400).json(errorResponse(err.message, err.code));
      }
      throw err;
    }

    // Sync delivery changes to linked order (with loop guard)
    if (delivery.orderId && !_orderDeliverySyncInProgress.has(delivery.orderId)) {
      _orderDeliverySyncInProgress.add(delivery.orderId);
      try {
        // Sync deliveryStatus to order
        if (isStatusChange) {
          await repos.orderRepo.update(delivery.orderId, { deliveryStatus: nextStatus });
        }

        // If delivery becomes DELIVERED, move order to DONE
        if (isStatusChange && nextStatus === DS.DELIVERED) {
          try {
            await orderStatusService.changeOrderStatus({
              orderId: delivery.orderId,
              nextStatus: 'DONE',
              changedBy: req.user?.id || null,
              note: 'Auto-completed: delivery marked as delivered',
            });
          } catch (statusErr) {
            logger.warn('Failed to auto-complete order on DELIVERED:', statusErr.message);
          }
        }

        // Sync paymentStatus to order if changed
        if (updateData.paymentStatus) {
          await repos.orderRepo.update(delivery.orderId, { paymentStatus: updateData.paymentStatus });
        }
      } catch (syncErr) {
        logger.warn('Failed to sync delivery changes to order:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(delivery.orderId);
      }
    }

    // Push notification for delivery status change (non-blocking)
    if (isStatusChange && delivery.assignedStaffId && delivery.assignedStaffId !== req.user?.id) {
      pushService.sendToUsers({
        userIds: [delivery.assignedStaffId],
        title: 'Delivery Update',
        body: `Delivery status changed to ${nextStatus.replace(/_/g, ' ')}`,
        category: 'deliveries',
        data: { type: 'delivery_status', deliveryId: delivery.id, status: nextStatus },
      }, repos).catch((err) => logger.error('[Push] Delivery status push error:', err));
    }

    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating delivery:', e);
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
    logger.error('Error deleting delivery:', e);
    res.status(500).json(errorResponse('Failed to delete delivery'));
  }
});

// Create delivery from an order (order-to-delivery linkage)
// POST /api/companies/:companyId/orders/:orderId/create-delivery
// ===========================================================================
// Transfers (Logistics v2 — dedicated Transfer entity, P5).
// Internal stock movement between the business's own locations, with an
// approval lifecycle. Additive: the frontend switches to these in P9.
// ===========================================================================

// List transfers
app.get('/api/companies/:companyId/transfers', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { status } = req.query;
    const rows = await repos.transferRepo.getByBusinessId(req.params.companyId, { status: status || undefined });
    res.json(successResponse(rows));
  } catch (e) {
    logger.error('Error listing transfers:', e);
    res.status(500).json(errorResponse('Failed to load transfers'));
  }
});

// Get single transfer
app.get('/api/companies/:companyId/transfers/:transferId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const transfer = await repos.transferRepo.getById(req.params.transferId);
    if (!transfer || transfer.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Transfer not found'));
    }
    res.json(successResponse(transfer));
  } catch (e) {
    logger.error('Error fetching transfer:', e);
    res.status(500).json(errorResponse('Failed to load transfer'));
  }
});

// Transfer status-change history
app.get('/api/companies/:companyId/transfers/:transferId/history', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const transfer = await repos.transferRepo.getById(req.params.transferId);
    if (!transfer || transfer.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Transfer not found'));
    }
    const history = await transferStatusService.getTransferStatusHistory(req.params.transferId);
    res.json(successResponse(history));
  } catch (e) {
    logger.error('Error fetching transfer history:', e);
    res.status(500).json(errorResponse('Failed to load transfer history'));
  }
});

// Create a transfer (starts in Requested)
app.post('/api/companies/:companyId/transfers', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const b = req.body || {};
    if (!b.fromLocationId || !b.toLocationId) {
      return res.status(400).json(errorResponse('fromLocationId and toLocationId are required'));
    }
    const items = Array.isArray(b.items) ? b.items : [];
    const itemCount = b.itemCount != null ? b.itemCount : items.length;
    const totalAmount = b.totalAmount != null
      ? b.totalAmount
      : items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity ?? it.quantityOrdered) || 0), 0);

    const created = await repos.transferRepo.create({
      id: uuidv4(),
      businessId: req.params.companyId,
      fromLocationId: b.fromLocationId,
      toLocationId: b.toLocationId,
      fromLocationName: b.fromLocationName || null,
      toLocationName: b.toLocationName || null,
      status: 'Requested',
      requestedBy: req.user?.id || null,
      items,
      itemCount,
      totalAmount,
      assignedStaffId: b.assignedStaffId || null,
      transportId: b.transportId || null,
      notes: b.notes || null,
      priority: b.priority || 'normal',
      orderTime: b.orderTime || new Date().toISOString(),
      expectedAt: b.expectedAt || null,
    });
    res.status(201).json(successResponse(created));
  } catch (e) {
    logger.error('Error creating transfer:', e);
    res.status(500).json(errorResponse('Failed to create transfer'));
  }
});

// Update non-status transfer fields
app.patch('/api/companies/:companyId/transfers/:transferId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const transfer = await repos.transferRepo.getById(req.params.transferId);
    if (!transfer || transfer.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Transfer not found'));
    }
    const allowed = ['items', 'itemCount', 'totalAmount', 'assignedStaffId', 'transportId',
      'trackingNumber', 'notes', 'priority', 'expectedAt', 'fromLocationName', 'toLocationName'];
    const updateData = {};
    for (const k of allowed) if (req.body[k] !== undefined) updateData[k] = req.body[k];
    const updated = await repos.transferRepo.update(req.params.transferId, updateData);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating transfer:', e);
    res.status(500).json(errorResponse('Failed to update transfer'));
  }
});

// Change transfer status (approval lifecycle + stock moves)
app.patch('/api/companies/:companyId/transfers/:transferId/status', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const transfer = await repos.transferRepo.getById(req.params.transferId);
    if (!transfer || transfer.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Transfer not found'));
    }
    let updated;
    try {
      updated = await transferStatusService.changeTransferStatus({
        transferId: req.params.transferId,
        nextStatus: req.body.status,
        changedBy: req.user?.id || null,
        reason: req.body.reason || null,
      });
    } catch (err) {
      if (err.code === 'INVALID_STATUS_TRANSITION' || err.code === 'INVALID_STATUS') {
        return res.status(400).json(errorResponse(err.message, err.code));
      }
      throw err;
    }
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error changing transfer status:', e);
    res.status(500).json(errorResponse('Failed to change transfer status'));
  }
});

// Receive a transfer with per-item received quantities (partial receiving).
// body: { items: [{ productId, quantityReceived, quantityDamaged? }] }
app.patch('/api/companies/:companyId/transfers/:transferId/receive', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId, transferId } = req.params;
    const transfer = await repos.transferRepo.getById(transferId);
    if (!transfer || transfer.businessId !== companyId) {
      return res.status(404).json(errorResponse('Transfer not found'));
    }

    // Merge received/damaged quantities into the transfer items.
    const received = Array.isArray(req.body.items) ? req.body.items : [];
    const byProduct = new Map(received.map((r) => [r.productId, r]));
    const mergedItems = (Array.isArray(transfer.items) ? transfer.items : []).map((it) => {
      const r = byProduct.get(it.productId);
      if (!r) return it;
      return {
        ...it,
        quantityReceived: r.quantityReceived != null ? Number(r.quantityReceived) : Number(it.quantity ?? it.quantityOrdered ?? 0),
        quantityDamaged: r.quantityDamaged != null ? Number(r.quantityDamaged) : 0,
      };
    });
    await repos.transferRepo.update(transferId, { items: mergedItems });

    // Move to Received (triggers the source clear + destination receive of the
    // actual received quantities).
    let updated;
    try {
      updated = await transferStatusService.changeTransferStatus({
        transferId,
        nextStatus: 'Received',
        changedBy: req.user?.id || null,
      });
    } catch (err) {
      if (err.code === 'INVALID_STATUS_TRANSITION' || err.code === 'INVALID_STATUS') {
        return res.status(400).json(errorResponse(err.message, err.code));
      }
      throw err;
    }

    // File issues for shortfalls / damage (non-blocking).
    for (const it of mergedItems) {
      const shipped = Number(it.quantity ?? it.quantityOrdered) || 0;
      const recv = Number(it.quantityReceived) || 0;
      const dmg = Number(it.quantityDamaged) || 0;
      try {
        if (recv < shipped) {
          await repos.issueRepo.create({
            businessId: companyId, entityType: 'transfer', entityId: transferId,
            type: 'missing', status: 'open', priority: 'normal',
            note: `${shipped - recv} × ${it.name || it.productId} missing on receipt`,
            reportedBy: req.user?.id || null,
          });
        }
        if (dmg > 0) {
          await repos.issueRepo.create({
            businessId: companyId, entityType: 'transfer', entityId: transferId,
            type: 'damaged', status: 'open', priority: 'normal',
            note: `${dmg} × ${it.name || it.productId} received damaged`,
            reportedBy: req.user?.id || null,
          });
        }
      } catch (issueErr) {
        logger.warn('[transfer receive] failed to create discrepancy issue:', issueErr.message);
      }
    }

    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error receiving transfer:', e);
    res.status(500).json(errorResponse('Failed to receive transfer'));
  }
});

// Delete a transfer
app.delete('/api/companies/:companyId/transfers/:transferId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const transfer = await repos.transferRepo.getById(req.params.transferId);
    if (!transfer || transfer.businessId !== req.params.companyId) {
      return res.status(404).json(errorResponse('Transfer not found'));
    }
    await repos.transferRepo.delete(req.params.transferId);
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    logger.error('Error deleting transfer:', e);
    res.status(500).json(errorResponse('Failed to delete transfer'));
  }
});

// ===========================================================================
// Issues (Logistics v2 — P6). Problems reported against a delivery/transfer/route.
// ===========================================================================
app.get('/api/companies/:companyId/issues', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const rows = await repos.issueRepo.getByBusinessId(req.params.companyId, { status: req.query.status || undefined });
    res.json(successResponse(rows));
  } catch (e) {
    logger.error('Error listing issues:', e);
    res.status(500).json(errorResponse('Failed to load issues'));
  }
});

app.get('/api/companies/:companyId/issues/:issueId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const issue = await repos.issueRepo.getById(req.params.issueId);
    if (!issue || issue.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Issue not found'));
    res.json(successResponse(issue));
  } catch (e) {
    logger.error('Error fetching issue:', e);
    res.status(500).json(errorResponse('Failed to load issue'));
  }
});

app.post('/api/companies/:companyId/issues', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const b = req.body || {};
    if (!b.entityType || !b.entityId || !b.type) {
      return res.status(400).json(errorResponse('entityType, entityId and type are required'));
    }
    const issue = await repos.issueRepo.create({
      businessId: req.params.companyId,
      entityType: b.entityType,
      entityId: b.entityId,
      type: b.type,
      priority: b.priority || 'normal',
      status: 'open',
      photoUrl: b.photoUrl || null,
      note: b.note || null,
      reportedBy: req.user?.id || null,
      assignedTo: b.assignedTo || null,
    });
    // Notify the assignee (non-blocking)
    if (issue.assignedTo && issue.assignedTo !== req.user?.id) {
      pushService.sendToUsers({
        userIds: [issue.assignedTo],
        title: 'New issue reported',
        body: `${(b.type || '').replace(/_/g, ' ')} on ${b.entityType} ${b.entityId}`,
        category: 'deliveries',
        data: { type: 'issue', issueId: issue.id },
      }, repos).catch((err) => logger.error('[Push] Issue push error:', err));
    }
    res.status(201).json(successResponse(issue));
  } catch (e) {
    logger.error('Error creating issue:', e);
    res.status(500).json(errorResponse('Failed to create issue'));
  }
});

app.patch('/api/companies/:companyId/issues/:issueId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const issue = await repos.issueRepo.getById(req.params.issueId);
    if (!issue || issue.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Issue not found'));
    const allowed = ['status', 'priority', 'assignedTo', 'note', 'resolution', 'photoUrl'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    if (patch.status === 'resolved') patch.resolvedAt = new Date();
    const updated = await repos.issueRepo.update(req.params.issueId, patch);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating issue:', e);
    res.status(500).json(errorResponse('Failed to update issue'));
  }
});

app.delete('/api/companies/:companyId/issues/:issueId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const issue = await repos.issueRepo.getById(req.params.issueId);
    if (!issue || issue.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Issue not found'));
    await repos.issueRepo.delete(req.params.issueId);
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    logger.error('Error deleting issue:', e);
    res.status(500).json(errorResponse('Failed to delete issue'));
  }
});

// ===========================================================================
// Returns / RMA (Logistics v2 — P7).
// ===========================================================================
app.get('/api/companies/:companyId/returns', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const rows = await repos.returnRepo.getByBusinessId(req.params.companyId, { status: req.query.status || undefined });
    res.json(successResponse(rows));
  } catch (e) {
    logger.error('Error listing returns:', e);
    res.status(500).json(errorResponse('Failed to load returns'));
  }
});

app.get('/api/companies/:companyId/returns/:returnId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const ret = await repos.returnRepo.getById(req.params.returnId);
    if (!ret || ret.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Return not found'));
    res.json(successResponse(ret));
  } catch (e) {
    logger.error('Error fetching return:', e);
    res.status(500).json(errorResponse('Failed to load return'));
  }
});

app.post('/api/companies/:companyId/returns', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const b = req.body || {};
    const ret = await repos.returnRepo.create({
      businessId: req.params.companyId,
      orderId: b.orderId || null,
      customerId: b.customerId || null,
      customerName: b.customerName || null,
      locationId: b.locationId || null,
      status: 'Requested',
      reason: b.reason || null,
      items: Array.isArray(b.items) ? b.items : [],
    });
    res.status(201).json(successResponse(ret));
  } catch (e) {
    logger.error('Error creating return:', e);
    res.status(500).json(errorResponse('Failed to create return'));
  }
});

app.patch('/api/companies/:companyId/returns/:returnId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const ret = await repos.returnRepo.getById(req.params.returnId);
    if (!ret || ret.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Return not found'));
    const allowed = ['items', 'reason', 'locationId', 'customerName', 'creditNoteId'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const updated = await repos.returnRepo.update(req.params.returnId, patch);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating return:', e);
    res.status(500).json(errorResponse('Failed to update return'));
  }
});

app.patch('/api/companies/:companyId/returns/:returnId/status', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const ret = await repos.returnRepo.getById(req.params.returnId);
    if (!ret || ret.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Return not found'));
    let updated;
    try {
      updated = await returnService.changeReturnStatus({
        returnId: req.params.returnId,
        nextStatus: req.body.status,
        changedBy: req.user?.id || null,
        reason: req.body.reason || null,
      });
    } catch (err) {
      if (err.code === 'INVALID_STATUS_TRANSITION' || err.code === 'INVALID_STATUS') {
        return res.status(400).json(errorResponse(err.message, err.code));
      }
      throw err;
    }
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error changing return status:', e);
    res.status(500).json(errorResponse('Failed to change return status'));
  }
});

app.delete('/api/companies/:companyId/returns/:returnId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const ret = await repos.returnRepo.getById(req.params.returnId);
    if (!ret || ret.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Return not found'));
    await repos.returnRepo.delete(req.params.returnId);
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    logger.error('Error deleting return:', e);
    res.status(500).json(errorResponse('Failed to delete return'));
  }
});

// ===========================================================================
// Recurring schedules (Logistics v2 — P12). Auto-mint deliveries/transfers.
// ===========================================================================
app.get('/api/companies/:companyId/recurring-schedules', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const rows = await repos.recurringRepo.getByBusinessId(req.params.companyId);
    res.json(successResponse(rows));
  } catch (e) {
    logger.error('Error listing recurring schedules:', e);
    res.status(500).json(errorResponse('Failed to load recurring schedules'));
  }
});

app.post('/api/companies/:companyId/recurring-schedules', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const b = req.body || {};
    if (!b.kind || !b.frequency || !b.template) {
      return res.status(400).json(errorResponse('kind, frequency and template are required'));
    }
    const created = await repos.recurringRepo.create({
      businessId: req.params.companyId,
      kind: b.kind,
      frequency: b.frequency,
      daysOfWeek: b.daysOfWeek || null,
      template: b.template,
      fromLocationId: b.fromLocationId || null,
      toLocationId: b.toLocationId || null,
      nextRunAt: b.nextRunAt || new Date().toISOString(),
      active: b.active !== false,
    });
    res.status(201).json(successResponse(created));
  } catch (e) {
    logger.error('Error creating recurring schedule:', e);
    res.status(500).json(errorResponse('Failed to create recurring schedule'));
  }
});

app.patch('/api/companies/:companyId/recurring-schedules/:scheduleId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const sched = await repos.recurringRepo.getById(req.params.scheduleId);
    if (!sched || sched.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Schedule not found'));
    const allowed = ['frequency', 'daysOfWeek', 'template', 'fromLocationId', 'toLocationId', 'nextRunAt', 'active'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const updated = await repos.recurringRepo.update(req.params.scheduleId, patch);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating recurring schedule:', e);
    res.status(500).json(errorResponse('Failed to update recurring schedule'));
  }
});

app.delete('/api/companies/:companyId/recurring-schedules/:scheduleId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const sched = await repos.recurringRepo.getById(req.params.scheduleId);
    if (!sched || sched.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Schedule not found'));
    await repos.recurringRepo.delete(req.params.scheduleId);
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    logger.error('Error deleting recurring schedule:', e);
    res.status(500).json(errorResponse('Failed to delete recurring schedule'));
  }
});

// ===========================================================================
// Routes / trips (Logistics v2 — P8). Driver + vehicle + ordered stops.
// ===========================================================================
app.get('/api/companies/:companyId/delivery-routes', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const rows = await repos.routeRepo.getByBusinessId(req.params.companyId, { status: req.query.status || undefined });
    res.json(successResponse(rows));
  } catch (e) {
    logger.error('Error listing routes:', e);
    res.status(500).json(errorResponse('Failed to load routes'));
  }
});

app.get('/api/companies/:companyId/delivery-routes/:routeId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const route = await repos.routeRepo.getById(req.params.routeId);
    if (!route || route.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Route not found'));
    res.json(successResponse(route));
  } catch (e) {
    logger.error('Error fetching route:', e);
    res.status(500).json(errorResponse('Failed to load route'));
  }
});

app.post('/api/companies/:companyId/delivery-routes', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const b = req.body || {};
    const route = await repos.routeRepo.create({
      businessId: req.params.companyId,
      name: b.name || null,
      date: b.date || null,
      driverId: b.driverId || null,
      transportId: b.transportId || null,
      status: b.status || 'Planned',
      stops: Array.isArray(b.stops) ? b.stops : [],
    });
    res.status(201).json(successResponse(route));
  } catch (e) {
    logger.error('Error creating route:', e);
    res.status(500).json(errorResponse('Failed to create route'));
  }
});

app.patch('/api/companies/:companyId/delivery-routes/:routeId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const route = await repos.routeRepo.getById(req.params.routeId);
    if (!route || route.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Route not found'));
    const allowed = ['name', 'date', 'driverId', 'transportId', 'status', 'stops'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const updated = await repos.routeRepo.update(req.params.routeId, patch);
    res.json(successResponse(updated));
  } catch (e) {
    logger.error('Error updating route:', e);
    res.status(500).json(errorResponse('Failed to update route'));
  }
});

app.delete('/api/companies/:companyId/delivery-routes/:routeId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const route = await repos.routeRepo.getById(req.params.routeId);
    if (!route || route.businessId !== req.params.companyId) return res.status(404).json(errorResponse('Route not found'));
    await repos.routeRepo.delete(req.params.routeId);
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    logger.error('Error deleting route:', e);
    res.status(500).json(errorResponse('Failed to delete route'));
  }
});

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
      return res.status(403).json(paywallResponse('Upgrade to Pro to create deliveries', 'create_deliveries', 'pro'));
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
      deliveryStatus: DS.NOT_ASSIGNED,
      paymentStatus: order.paymentStatus || 'UNPAID',
    });

    // Sync Order.deliveryStatus to reflect that a delivery now exists (with loop guard)
    if (!_orderDeliverySyncInProgress.has(orderId)) {
      _orderDeliverySyncInProgress.add(orderId);
      try {
        await repos.orderRepo.update(orderId, { deliveryStatus: DS.NOT_ASSIGNED });
      } catch (syncErr) {
        logger.warn('Failed to sync order deliveryStatus:', syncErr.message);
      } finally {
        _orderDeliverySyncInProgress.delete(orderId);
      }
    }

    res.status(201).json(successResponse(delivery));
  } catch (e) {
    logger.error('Error creating delivery from order:', e);
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
    logger.error('Error fetching business invoices:', err);
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
    logger.error('Error fetching invoice:', err);
    res.status(500).json(errorResponse('Failed to retrieve invoice', 'FETCH_ERROR'));
  }
});

// Builds the rich `details` block attached to invoice/estimate chat messages so the
// chat card can show item count, a few line items, and the total (see ChatLineItem /
// InvoiceCardDetails on the frontend). All fields are best-effort/optional.
function buildInvoiceCardDetails(inv, currency) {
  const rawItems = Array.isArray(inv.items) ? inv.items : [];
  const items = rawItems.slice(0, 3).map((it) => ({
    name: it.description || it.name || 'Item',
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice) || 0,
  }));
  const num = (v) => (v == null ? undefined : Number(v));
  return {
    number: inv.invoiceNumber || undefined,
    currency,
    status: inv.status || undefined,
    itemCount: rawItems.length,
    items,
    subtotal: num(inv.amount),
    total: num(inv.totalAmount != null ? inv.totalAmount : inv.total),
  };
}

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
      return res.status(403).json(paywallResponse(
        'Cannot create invoices',
        'send_invoice',
        'pro'
      ));
    }
    
    // If trying to create as SENT directly, check canSendInvoice (Pro+ only)
    if (req.body.status === 'SENT' && !capabilities.canSendInvoice) {
      return res.status(403).json(paywallResponse('Upgrade to Pro to send invoices', 'send_invoice', 'pro'));
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

    // PRICE AUTHORITY (price lists): if a price list applies to this client,
    // reprice product-backed invoice lines and recompute the money fields.
    // Free-text lines (no productId) keep their entered price. With no applicable
    // list this is a no-op (existing client-supplied amounts are kept).
    try {
      const invList = await resolvePriceListForBuyer(
        req.params.companyId,
        req.body.clientBusinessId || null,
        { manualPriceListId: req.body.manualPriceListId || null }
      );
      const hasProductLine = Array.isArray(req.body.items) &&
        req.body.items.some((it) => it && (it.productId || it.product_id));
      if (invList && hasProductLine) {
        const priced = await repriceLineItems(invList, req.body.items, req.params.companyId, { forceBase: false });
        const newSubtotal = priced.totalAmount;
        const tr = Number(req.body.taxRate) || 0;
        const disc = Number(req.body.discountAmount) || 0;
        const newTax = Math.round(newSubtotal * (tr / 100) * 100) / 100;
        req.body.items = priced.items;
        req.body.subtotal = newSubtotal;
        req.body.taxAmount = newTax;
        req.body.totalAmount = Math.round((newSubtotal + newTax - disc) * 100) / 100;
        if (priced.changed) {
          logger.info(`[priceList] invoice repriced for seller ${req.params.companyId} via list ${invList.id}`);
        }
      }
    } catch (priceErr) {
      logger.error('[priceList] invoice repricing failed (keeping client amounts):', priceErr.message);
    }

    // Generate invoice number with retry to handle concurrent requests
    // The @@unique([businessId, invoiceNumber]) constraint prevents duplicates
    const MAX_RETRIES = 3;
    let created;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const prefix = business.settings?.invoicePrefix || 'INV';
      // Efficient: only scan recent invoices for the highest number suffix
      const recentInvoices = await prisma.invoice.findMany({
        where: { businessId: req.params.companyId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
        take: 50,
      });
      const maxNum = recentInvoices.reduce((max, inv) => {
        const match = (inv.invoiceNumber || '').match(/-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(maxNum + 1).padStart(3, '0')}`;

      // SECURITY: Extract only allowed fields from req.body to prevent mass assignment
      const { clientName, clientEmail, clientPhone, clientAddress, clientBusinessId,
              items, notes, currency, taxRate, discountAmount, dueDate, type: invoiceType,
              totalAmount, subtotal, taxAmount } = req.body;
      const safeBody = { clientName, clientEmail, clientPhone, clientAddress, clientBusinessId,
                         items, notes, currency, taxRate, discountAmount, dueDate,
                         totalAmount, subtotal, taxAmount };
      // Remove undefined keys
      Object.keys(safeBody).forEach(k => safeBody[k] === undefined && delete safeBody[k]);

      const newInvoice = {
        ...safeBody,
        id: 'inv-' + uuidv4().slice(0, 8),
        businessId: req.params.companyId,
        issuedByScope: INVOICE_SCOPE_FROM_STORE.PARENT,
        issuedByLocationId: null,
        invoiceNumber,
        status: 'DRAFT',
        type: invoiceType || 'invoice',
      };

      try {
        created = await repos.invoiceRepo.create(newInvoice);
        break; // Success — exit retry loop
      } catch (createErr) {
        // P2002 = Unique constraint violation (Prisma error code)
        const isUniqueViolation = createErr.code === 'P2002' || (createErr.message && createErr.message.includes('Unique constraint'));
        if (isUniqueViolation && attempt < MAX_RETRIES) {
          logger.warn(`[Invoice] Duplicate invoice number "${invoiceNumber}" on attempt ${attempt}, retrying...`);
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
            details: buildInvoiceCardDetails(created, business.settings?.currency || 'EUR'),
          }
        });
      } catch (msgErr) {
        logger.error('Failed to create invoice event message:', msgErr);
      }
    }

    res.status(201).json(successResponse(created, 'Invoice created successfully'));
  } catch (err) {
    logger.error('Error creating business invoice:', err);
    res.status(500).json(errorResponse('Failed to create invoice', 'CREATE_ERROR'));
  }
});

// Get invoices for a location
// [location-mode] Not yet called by the app -- kept for the planned DEPENDENT/INDEPENDENT-location feature (AUDIT.md P3).
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
    logger.error('Error fetching location invoices:', err);
    res.status(500).json(errorResponse('Failed to retrieve invoices', 'FETCH_ERROR'));
  }
});

// Create invoice at Location level (INDEPENDENT only) - INTERNAL USE
// [location-mode] Not yet called by the app -- kept for the planned DEPENDENT/INDEPENDENT-location feature (AUDIT.md P3).
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
      return res.status(403).json(paywallResponse('Creating invoices from independent locations requires an Enterprise subscription.', 'independent_locations', 'enterprise'));
    }

    // Allow all tiers to create invoice drafts
    if (!capabilities.canCreateInvoiceDraft) {
      return res.status(403).json(paywallResponse(
        'Cannot create invoices',
        'send_invoice',
        'pro'
      ));
    }
    
    // If trying to create as SENT directly, check canSendInvoice (Pro+ only)
    if (req.body.status === 'SENT' && !capabilities.canSendInvoice) {
      return res.status(403).json(paywallResponse('Upgrade to Pro to send invoices', 'send_invoice', 'pro'));
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
      const locationInvoices = await prisma.invoice.findMany({
        where: { issuedByLocationId: location.id },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
        take: 50,
      });
      const maxLocNum = locationInvoices.reduce((max, inv) => {
        const match = (inv.invoiceNumber || '').match(/-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(maxLocNum + 1).padStart(3, '0')}`;

      // SECURITY: Extract only allowed fields from req.body to prevent mass assignment
      const { clientName, clientEmail, clientPhone, clientAddress, clientBusinessId,
              items, notes, currency, taxRate, discountAmount, dueDate, type: invoiceType,
              totalAmount, subtotal, taxAmount, issueDate } = req.body;
      const safeBody = { clientName, clientEmail, clientPhone, clientAddress, clientBusinessId,
                         items, notes, currency, taxRate, discountAmount, dueDate,
                         totalAmount, subtotal, taxAmount };
      if (issueDate) safeBody.issueDate = new Date(issueDate);
      if (dueDate && typeof dueDate === 'string') safeBody.dueDate = new Date(dueDate);
      Object.keys(safeBody).forEach(k => safeBody[k] === undefined && delete safeBody[k]);

      const newInvoice = {
        ...safeBody,
        id: 'inv-' + uuidv4().slice(0, 8),
        businessId,
        issuedByScope: INVOICE_SCOPE_FROM_STORE.LOCATION,
        issuedByLocationId: location.id,
        invoiceNumber,
        status: req.body.status === 'SENT' ? 'SENT' : 'DRAFT',
        type: invoiceType || 'invoice',
      };

      try {
        created = await repos.invoiceRepo.create(newInvoice);
        break; // Success — exit retry loop
      } catch (createErr) {
        const isUniqueViolation = createErr.code === 'P2002' || (createErr.message && createErr.message.includes('Unique constraint'));
        if (isUniqueViolation && attempt < MAX_RETRIES) {
          logger.warn(`[Invoice] Duplicate location invoice number "${invoiceNumber}" on attempt ${attempt}, retrying...`);
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
            locationId: location.id,
            invoiceId: created.type === 'invoice' ? created.id : undefined,
            estimateId: created.type === 'estimate' ? created.id : undefined,
            details: buildInvoiceCardDetails(created, business.settings?.currency || 'EUR'),
          }
        });
      } catch (msgErr) {
        logger.error('Failed to create invoice event message:', msgErr);
      }
    }

    res.status(201).json(successResponse(created, 'Invoice created successfully'));
  } catch (err) {
    logger.error('Error creating location invoice:', err);
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
          return res.status(403).json(paywallResponse('Upgrade to Pro to send invoices', 'send_invoice', 'pro'));
        }
      }
    }

    // SECURITY: Whitelist allowed fields — prevent mass assignment
    const { clientName, clientEmail, clientPhone, clientAddress, clientBusinessId,
            items, notes, currency, taxRate, discountAmount, dueDate, issueDate,
            totalAmount, subtotal, taxAmount, paidAmount, status: newStat, type,
            discount, shipping } = req.body;
    const updatePayload = { clientName, clientEmail, clientPhone, clientAddress, clientBusinessId,
                            items, notes, currency, taxRate, discountAmount, dueDate, issueDate,
                            totalAmount, subtotal, taxAmount, paidAmount, status: newStat, type,
                            discount, shipping };
    Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);

    // Parse date strings to Date objects for DateTime columns
    if (updatePayload.issueDate && typeof updatePayload.issueDate === 'string') {
      updatePayload.issueDate = new Date(updatePayload.issueDate);
    }
    if (updatePayload.dueDate && typeof updatePayload.dueDate === 'string') {
      updatePayload.dueDate = new Date(updatePayload.dueDate);
    }

    const updated = await repos.invoiceRepo.update(req.params.invoiceId, updatePayload);

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
        logger.error('Failed to create estimate_confirmed event:', msgErr);
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
            details: buildInvoiceCardDetails(updated, updated.currency || 'EUR'),
          }
        });
      } catch (msgErr) {
        logger.error('Failed to create invoice sent event message:', msgErr);
      }
    }

    res.json(successResponse(updated, 'Invoice updated successfully'));
  } catch (err) {
    logger.error('Error updating invoice:', err);
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
    logger.error('Error deleting invoice:', err);
    res.status(500).json(errorResponse('Failed to delete invoice', 'DELETE_ERROR'));
  }
});

// Accept estimate (convert to invoice) - admin/super_admin only
// [location-mode] Not yet called by the app -- kept for the planned DEPENDENT/INDEPENDENT-location feature (AUDIT.md P3).
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
    // SECURITY: Check caller is admin/super_admin of the INVOICE'S business specifically (not any business)
    const userId = req.user?.id;
    const membership = await findBusinessMember(invoice.businessId, userId);
    if (!membership || membership.status !== 'accepted' || (membership.role !== 'admin' && membership.role !== 'super_admin')) {
      return res.status(403).json(errorResponse('Only admin or super admin of this business can accept estimates', 'PERMISSION_DENIED'));
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
      logger.error('Failed to create estimate_confirmed event:', msgErr);
    }
    res.json(successResponse(updated, 'Estimate accepted and converted to invoice'));
  } catch (err) {
    logger.error('Error accepting estimate:', err);
    res.status(500).json(errorResponse('Failed to accept estimate', 'ACCEPT_ERROR'));
  }
});

// Chat Routes

// Create a new chat
app.post('/api/companies/:companyId/chats', requireAuth, requireCompanyMember, chatCreationLimiter, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type, name, participants, partnerId, partnerType, locationId, avatar } = req.body;

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
      avatar: avatar || null,
      lastMessage: null
    });

    // Notify all participants about the new chat via socket.
    // Resolve the display per-recipient so a 1:1 chat shows the OTHER person.
    const chatParticipants = newChat.participants || participants || [];
    if (Array.isArray(chatParticipants)) {
      for (const pid of chatParticipants) {
        if (typeof pid !== 'string') continue;
        const viewerChat = await serializeChatForViewer(newChat, pid);
        io.to(`user:${pid}`).emit('chat_created', viewerChat);
      }
    }

    res.status(201).json(successResponse(newChat));
  } catch (e) {
    logger.error('Error creating chat:', e);
    res.status(500).json(errorResponse('Failed to create chat'));
  }
});

// normalizeLastMessage(), otherParticipantId(), applyViewerDisplay(),
// serializeChatsForViewer(), serializeChatForViewer()
// → moved to src/domain/chatSerializers.js (imported at top of file).

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

    // Normalize lastMessage + resolve per-viewer name/avatar for direct chats
    companyChats = await serializeChatsForViewer(companyChats, requestingUserId);

    res.json({ success: true, data: companyChats, nextCursor: useSearch ? null : nextCursor });
  } catch (e) {
    logger.error('Error fetching chats:', e);
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
    logger.error('Error fetching messages:', e);
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
    logger.error('Error marking chat as read:', e);
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
      if (metadata?.mentions) newMessage.mentions = metadata.mentions;
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
    } else if (type === 'voice') {
      newMessage.content = content;
      newMessage.audioUrl = attachmentUrl || metadata?.audioUrl;
      newMessage.durationSeconds = metadata?.durationSeconds;
    } else if (type === 'profile') {
      newMessage.content = content;
      newMessage.profileId = metadata?.profileId;
      newMessage.profileName = metadata?.profileName;
      newMessage.profileAvatar = metadata?.profileAvatar;
      newMessage.profileType = metadata?.profileType || 'user';
    } else {
      // Fallback for other valid types (invoice, estimate, delivery, event, video_call)
      newMessage.content = content;
      if (metadata) newMessage.meta = metadata;
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

    // Send push notifications to offline participants
    sendPushToOfflineParticipants(chatId, senderName, created.text || created.content || 'New message', senderId);

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
      logger.warn(`[Chat] No participants found for chat ${chatId}, skipping chat_update emit`);
    }

    // Send push notifications to other participants
    const otherParticipantIds = participantCounts
      .map((p) => p.userId)
      .filter((id) => id !== senderId);
    if (otherParticipantIds.length > 0) {
      pushService.sendToUsers({
        userIds: otherParticipantIds,
        title: senderName || 'New Message',
        body: created.content || 'Sent a message',
        category: 'messages',
        data: { type: 'chat_message', chatId },
      }, repos).catch((err) => logger.error('[Push] Chat message push error:', err));
    }

    res.json(successResponse(created));
  } catch (e) {
    logger.error('Error sending message:', e);
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
    logger.error('Error deleting message:', e);
    res.status(500).json(errorResponse('Failed to delete message'));
  }
});

// Edit a message (business mode)
app.patch('/api/companies/:companyId/chats/:chatId/messages/:messageId', requireAuth, requireCompanyMember, async (req, res) => {
  try {
    const { companyId, chatId, messageId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json(errorResponse('Content is required'));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || chat.companyId !== companyId) {
      return res.status(404).json(errorResponse('Chat not found'));
    }

    const message = await repos.chatRepo.getMessage(chatId, messageId);
    if (!message) {
      return res.status(404).json(errorResponse('Message not found'));
    }

    // Only the sender can edit
    if (message.sender?.id !== req.user?.id) {
      return res.status(403).json(errorResponse('You can only edit your own messages'));
    }

    // Only text messages can be edited
    const msgType = message.type || (message.meta?.type) || 'text';
    if (msgType !== 'text') {
      return res.status(400).json(errorResponse('Only text messages can be edited'));
    }

    // Must be within 24 hours
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > 24 * 60 * 60 * 1000) {
      return res.status(400).json(errorResponse('Messages can only be edited within 24 hours'));
    }

    const edited = await repos.chatRepo.editMessage(chatId, messageId, content.trim());
    const editedAt = edited.meta?.editedAt || new Date().toISOString();

    // Notify all participants
    io.to(`chat:${chatId}`).emit('message_edited', {
      chatId,
      messageId,
      content: content.trim(),
      editedAt,
    });

    res.json(successResponse(edited));
  } catch (e) {
    logger.error('Error editing message:', e);
    res.status(500).json(errorResponse('Failed to edit message'));
  }
});


// Forward a message to another chat (business mode)
app.post('/api/companies/:companyId/chats/:chatId/messages/:messageId/forward', requireAuth, requireCompanyMember, async (req, res) => {
  try {
    const { companyId, chatId, messageId } = req.params;
    const { targetChatId } = req.body;
    const userId = req.user?.id;

    if (!targetChatId) {
      return res.status(400).json(errorResponse('targetChatId is required'));
    }

    // Verify source chat exists and belongs to company
    const sourceChat = await repos.chatRepo.getById(chatId);
    if (!sourceChat || sourceChat.companyId !== companyId) {
      return res.status(404).json(errorResponse('Source chat not found'));
    }

    // Verify target chat exists and belongs to same company
    const targetChat = await repos.chatRepo.getById(targetChatId);
    if (!targetChat || targetChat.companyId !== companyId) {
      return res.status(404).json(errorResponse('Target chat not found'));
    }

    // Verify user is a participant in the target chat
    const isTargetParticipant = Array.isArray(targetChat.participants) && targetChat.participants.includes(userId);
    if (!isTargetParticipant) {
      return res.status(403).json(errorResponse('You are not a member of the target chat'));
    }

    // Get the original message
    const originalMessage = await repos.chatRepo.getMessage(chatId, messageId);
    if (!originalMessage) {
      return res.status(404).json(errorResponse('Message not found'));
    }

    // Look up sender name
    const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const senderName = senderUser?.name || 'Someone';

    // Build forwarded message
    const forwardedMsg = {
      id: `msg-${uuidv4()}`,
      type: originalMessage.type || 'text',
      content: originalMessage.text || originalMessage.content || '',
      text: originalMessage.text || '',
      sender: { id: userId, name: senderName, avatar: '', role: 'business' },
      status: 'sent',
      isOutgoing: false,
      forwardedFrom: { chatId, senderName: originalMessage.sender?.name || 'Unknown' },
      // Copy type-specific fields
      ...(originalMessage.imageUrl && { imageUrl: originalMessage.imageUrl }),
      ...(originalMessage.fileUrl && { fileUrl: originalMessage.fileUrl }),
      ...(originalMessage.fileName && { fileName: originalMessage.fileName }),
      ...(originalMessage.audioUrl && { audioUrl: originalMessage.audioUrl }),
      ...(originalMessage.durationSeconds != null && { durationSeconds: originalMessage.durationSeconds }),
      ...(originalMessage.profileId && { profileId: originalMessage.profileId }),
      ...(originalMessage.profileName && { profileName: originalMessage.profileName }),
      ...(originalMessage.profileAvatar && { profileAvatar: originalMessage.profileAvatar }),
      ...(originalMessage.profileType && { profileType: originalMessage.profileType }),
      ...(originalMessage.latitude != null && { latitude: originalMessage.latitude }),
      ...(originalMessage.longitude != null && { longitude: originalMessage.longitude }),
      ...(originalMessage.address && { address: originalMessage.address }),
      ...(originalMessage.locationName && { locationName: originalMessage.locationName }),
    };

    const { message: savedMessage, participantCounts } = await repos.chatRepo.addMessage(targetChatId, forwardedMsg);

    // Emit to target chat room
    io.to(`chat:${targetChatId}`).emit('message', savedMessage);

    // Per-participant unread counts
    if (participantCounts) {
      for (const pc of participantCounts) {
        if (pc.userId !== userId) {
          io.to(`user:${pc.userId}`).emit('unread_update', { chatId: targetChatId, unreadCount: pc.unreadCount });
        }
      }
    }

    // Push notifications to offline participants
    if (typeof sendPushToOfflineParticipants === 'function') {
      sendPushToOfflineParticipants(targetChatId, senderName, savedMessage.text || savedMessage.content || 'New message', userId).catch(() => {});
    }

    res.json(successResponse(savedMessage));
  } catch (e) {
    logger.error('Error forwarding message:', e);
    res.status(500).json(errorResponse('Failed to forward message'));
  }
});

// Leave a group chat (business mode)
app.post('/api/companies/:companyId/chats/:chatId/leave', requireAuth, requireCompanyMember, async (req, res) => {
  try {
    const { companyId, chatId } = req.params;
    const userId = req.user?.id;

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || chat.companyId !== companyId) {
      return res.status(404).json(errorResponse('Chat not found'));
    }

    // Look up user name for the system message
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const userName = user?.name || 'Someone';

    // Remove participant from the chat
    const updatedChat = await repos.chatRepo.removeParticipant(chatId, userId);

    // Send a system event message to the chat
    const eventMessage = {
      id: `msg-${uuidv4()}`,
      type: 'event',
      content: `${userName} left the group`,
      event: `${userName} left the group`,
      sender: { id: 'system', name: 'System', avatar: '', role: 'system' },
      status: 'sent',
      isOutgoing: false,
    };
    await repos.chatRepo.addMessage(chatId, eventMessage, { incrementUnread: true });
    io.to(`chat:${chatId}`).emit('message', eventMessage);

    // Notify remaining participants
    const remainingParticipants = updatedChat.participants || [];
    for (const pid of remainingParticipants) {
      if (typeof pid === 'string') {
        io.to(`user:${pid}`).emit('chat_update', { id: chatId, participants: remainingParticipants });
      }
    }

    res.json(successResponse({ message: 'Left group successfully' }));
  } catch (e) {
    logger.error('Error leaving chat:', e);
    res.status(500).json(errorResponse('Failed to leave group'));
  }
});

// Remove a participant from a group chat (business mode)
app.post('/api/companies/:companyId/chats/:chatId/remove-participant', requireAuth, requireCompanyMember, async (req, res) => {
  try {
    const { companyId, chatId } = req.params;
    const { userId: targetUserId } = req.body;
    const requesterId = req.user?.id;

    if (!targetUserId) {
      return res.status(400).json(errorResponse('userId is required'));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat || chat.companyId !== companyId) {
      return res.status(404).json(errorResponse('Chat not found'));
    }

    // Look up names for the system message
    const [requester, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: requesterId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } }),
    ]);
    const requesterName = requester?.name || 'Someone';
    const targetName = target?.name || 'a member';

    // Remove participant
    const updatedChat = await repos.chatRepo.removeParticipant(chatId, targetUserId);

    // Send system event message
    const eventMessage = {
      id: `msg-${uuidv4()}`,
      type: 'event',
      content: `${requesterName} removed ${targetName} from the group`,
      event: `${requesterName} removed ${targetName} from the group`,
      sender: { id: 'system', name: 'System', avatar: '', role: 'system' },
      status: 'sent',
      isOutgoing: false,
    };
    await repos.chatRepo.addMessage(chatId, eventMessage, { incrementUnread: true });
    io.to(`chat:${chatId}`).emit('message', eventMessage);

    // Notify the removed user
    io.to(`user:${targetUserId}`).emit('chat_update', { id: chatId, removed: true });

    // Notify remaining participants
    const remainingParticipants = updatedChat.participants || [];
    for (const pid of remainingParticipants) {
      if (typeof pid === 'string') {
        io.to(`user:${pid}`).emit('chat_update', { id: chatId, participants: remainingParticipants });
      }
    }

    res.json(successResponse({ message: 'Participant removed successfully' }));
  } catch (e) {
    logger.error('Error removing participant:', e);
    res.status(500).json(errorResponse('Failed to remove participant'));
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

    // Hide 1:1 chats with blocked users (either direction).
    const blockedIds = new Set(await repos.blockRepo.getBlockedIds(userId));
    if (blockedIds.size > 0) {
      userChats = userChats.filter(c => {
        if (c.type !== 'direct' || !Array.isArray(c.participants)) return true;
        const other = c.participants.find(p => p !== userId);
        return !(other && blockedIds.has(other));
      });
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

    // Normalize lastMessage + resolve per-viewer name/avatar for direct chats
    userChats = await serializeChatsForViewer(userChats, requestingUserId);

    res.json({ success: true, data: userChats, nextCursor: useSearch ? null : nextCursor });
  } catch (e) {
    logger.error('Error fetching user chats:', e);
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

    const { type, name, participants, avatar } = req.body;

    if (!name) {
      return res.status(400).json(errorResponse('Chat name is required'));
    }

    // Ensure the creator is always included in participants
    const allParticipants = Array.isArray(participants) ? [...participants] : [];
    if (!allParticipants.includes(userId)) {
      allParticipants.push(userId);
    }

    // Block enforcement: can't start a chat with someone blocked (either direction).
    for (const other of allParticipants.filter(p => p !== userId)) {
      if (await repos.blockRepo.isBlocked(userId, other)) {
        return res.status(403).json(errorResponse('You cannot start a chat with this user'));
      }
    }

    const newChat = await repos.chatRepo.create({
      id: uuidv4(),
      companyId: null, // Personal chat — no company
      type: type || 'direct',
      name,
      participants: allParticipants,
      unreadCount: 0,
      avatar: avatar || null,
      lastMessage: null
    });

    // Notify all participants about the new chat via socket.
    // Resolve the display per-recipient so a 1:1 chat shows the OTHER person.
    for (const pid of allParticipants) {
      if (typeof pid !== 'string') continue;
      const viewerChat = await serializeChatForViewer(newChat, pid);
      io.to(`user:${pid}`).emit('chat_created', viewerChat);
    }

    res.status(201).json(successResponse(newChat));
  } catch (e) {
    logger.error('Error creating user chat:', e);
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
    logger.error('Error fetching user chat messages:', e);
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
    logger.error('Error marking user chat as read:', e);
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

    // Block enforcement: refuse to message into a 1:1 chat with a blocked user (either direction).
    if (chat.type === 'direct' && Array.isArray(chat.participants)) {
      const other = chat.participants.find(p => p !== userId);
      if (other && await repos.blockRepo.isBlocked(userId, other)) {
        return res.status(403).json(errorResponse('You cannot message this user'));
      }
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
      if (metadata?.mentions) newMessage.mentions = metadata.mentions;
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
      newMessage.audioUrl = attachmentUrl || metadata?.audioUrl;
      newMessage.durationSeconds = metadata?.durationSeconds;
    } else if (resolvedType === 'video_call') {
      newMessage.content = content;
      newMessage.durationSeconds = metadata?.durationSeconds;
    } else if (resolvedType === 'invoice') {
      newMessage.content = content;
      newMessage.invoiceId = metadata?.invoiceId;
      if (metadata?.details) newMessage.details = metadata.details;
    } else if (resolvedType === 'estimate') {
      newMessage.content = content;
      newMessage.estimateId = metadata?.estimateId;
      if (metadata?.details) newMessage.details = metadata.details;
    } else if (resolvedType === 'delivery') {
      newMessage.content = content;
      newMessage.meta = metadata;
    } else if (resolvedType === 'event') {
      newMessage.content = content;
      newMessage.meta = metadata;
    } else if (resolvedType === 'profile') {
      newMessage.content = content;
      newMessage.profileId = metadata?.profileId;
      newMessage.profileName = metadata?.profileName;
      newMessage.profileAvatar = metadata?.profileAvatar;
      newMessage.profileType = metadata?.profileType || 'user';
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

    // Send push notifications to offline participants
    sendPushToOfflineParticipants(chatId, senderName, created.text || created.content || 'New message', senderId);

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
      logger.warn(`[Chat] No participants found for chat ${chatId}, skipping chat_update emit`);
    }

    res.json(successResponse(created));
  } catch (e) {
    logger.error('Error sending user message:', e);
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
    logger.error('Error deleting user message:', e);
    res.status(500).json(errorResponse('Failed to delete message'));
  }
});

// Edit a message (personal mode)
app.patch('/api/users/:userId/chats/:chatId/messages/:messageId', requireAuth, async (req, res) => {
  try {
    const { userId, chatId, messageId } = req.params;
    const { content } = req.body;

    if (req.user?.id && req.user.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json(errorResponse('Content is required'));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat) {
      return res.status(404).json(errorResponse('Chat not found'));
    }

    const isParticipant = Array.isArray(chat.participants) && chat.participants.includes(userId);
    if (!isParticipant) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const message = await repos.chatRepo.getMessage(chatId, messageId);
    if (!message) {
      return res.status(404).json(errorResponse('Message not found'));
    }

    if (message.sender?.id !== userId) {
      return res.status(403).json(errorResponse('You can only edit your own messages'));
    }

    const msgType = message.type || (message.meta?.type) || 'text';
    if (msgType !== 'text') {
      return res.status(400).json(errorResponse('Only text messages can be edited'));
    }

    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > 24 * 60 * 60 * 1000) {
      return res.status(400).json(errorResponse('Messages can only be edited within 24 hours'));
    }

    const edited = await repos.chatRepo.editMessage(chatId, messageId, content.trim());
    const editedAt = edited.meta?.editedAt || new Date().toISOString();

    io.to(`chat:${chatId}`).emit('message_edited', {
      chatId,
      messageId,
      content: content.trim(),
      editedAt,
    });

    res.json(successResponse(edited));
  } catch (e) {
    logger.error('Error editing user message:', e);
    res.status(500).json(errorResponse('Failed to edit message'));
  }
});


// Forward a message to another chat (personal mode)
app.post('/api/users/:userId/chats/:chatId/messages/:messageId/forward', requireAuth, async (req, res) => {
  try {
    const { userId, chatId, messageId } = req.params;
    const { targetChatId } = req.body;
    if (req.user?.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    if (!targetChatId) {
      return res.status(400).json(errorResponse('targetChatId is required'));
    }

    // Verify source chat
    const sourceChat = await repos.chatRepo.getById(chatId);
    if (!sourceChat) {
      return res.status(404).json(errorResponse('Source chat not found'));
    }
    const isSourceParticipant = Array.isArray(sourceChat.participants) && sourceChat.participants.includes(userId);
    if (!isSourceParticipant) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Verify target chat
    const targetChat = await repos.chatRepo.getById(targetChatId);
    if (!targetChat) {
      return res.status(404).json(errorResponse('Target chat not found'));
    }
    const isTargetParticipant = Array.isArray(targetChat.participants) && targetChat.participants.includes(userId);
    if (!isTargetParticipant) {
      return res.status(403).json(errorResponse('You are not a member of the target chat'));
    }

    // Get original message
    const originalMessage = await repos.chatRepo.getMessage(chatId, messageId);
    if (!originalMessage) {
      return res.status(404).json(errorResponse('Message not found'));
    }

    // Look up sender name
    const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const senderName = senderUser?.name || 'Someone';

    // Build forwarded message
    const forwardedMsg = {
      id: `msg-${uuidv4()}`,
      type: originalMessage.type || 'text',
      content: originalMessage.text || originalMessage.content || '',
      text: originalMessage.text || '',
      sender: { id: userId, name: senderName, avatar: '', role: 'user' },
      status: 'sent',
      isOutgoing: false,
      forwardedFrom: { chatId, senderName: originalMessage.sender?.name || 'Unknown' },
      ...(originalMessage.imageUrl && { imageUrl: originalMessage.imageUrl }),
      ...(originalMessage.fileUrl && { fileUrl: originalMessage.fileUrl }),
      ...(originalMessage.fileName && { fileName: originalMessage.fileName }),
      ...(originalMessage.audioUrl && { audioUrl: originalMessage.audioUrl }),
      ...(originalMessage.durationSeconds != null && { durationSeconds: originalMessage.durationSeconds }),
      ...(originalMessage.profileId && { profileId: originalMessage.profileId }),
      ...(originalMessage.profileName && { profileName: originalMessage.profileName }),
      ...(originalMessage.profileAvatar && { profileAvatar: originalMessage.profileAvatar }),
      ...(originalMessage.profileType && { profileType: originalMessage.profileType }),
      ...(originalMessage.latitude != null && { latitude: originalMessage.latitude }),
      ...(originalMessage.longitude != null && { longitude: originalMessage.longitude }),
      ...(originalMessage.address && { address: originalMessage.address }),
      ...(originalMessage.locationName && { locationName: originalMessage.locationName }),
    };

    const { message: savedMessage, participantCounts } = await repos.chatRepo.addMessage(targetChatId, forwardedMsg);

    io.to(`chat:${targetChatId}`).emit('message', savedMessage);

    if (participantCounts) {
      for (const pc of participantCounts) {
        if (pc.userId !== userId) {
          io.to(`user:${pc.userId}`).emit('unread_update', { chatId: targetChatId, unreadCount: pc.unreadCount });
        }
      }
    }

    if (typeof sendPushToOfflineParticipants === 'function') {
      sendPushToOfflineParticipants(targetChatId, senderName, savedMessage.text || savedMessage.content || 'New message', userId).catch(() => {});
    }

    res.json(successResponse(savedMessage));
  } catch (e) {
    logger.error('Error forwarding user message:', e);
    res.status(500).json(errorResponse('Failed to forward message'));
  }
});

// Leave a group chat (personal mode)
app.post('/api/users/:userId/chats/:chatId/leave', requireAuth, async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    if (req.user?.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat) return res.status(404).json(errorResponse('Chat not found'));

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const userName = user?.name || 'Someone';

    const updatedChat = await repos.chatRepo.removeParticipant(chatId, userId);

    const eventMessage = {
      id: `msg-${uuidv4()}`,
      type: 'event',
      content: `${userName} left the group`,
      event: `${userName} left the group`,
      sender: { id: 'system', name: 'System', avatar: '', role: 'system' },
      status: 'sent',
      isOutgoing: false,
    };
    await repos.chatRepo.addMessage(chatId, eventMessage, { incrementUnread: true });
    io.to(`chat:${chatId}`).emit('message', eventMessage);

    const remainingParticipants = updatedChat.participants || [];
    for (const pid of remainingParticipants) {
      if (typeof pid === 'string') {
        io.to(`user:${pid}`).emit('chat_update', { id: chatId, participants: remainingParticipants });
      }
    }

    res.json(successResponse({ message: 'Left group successfully' }));
  } catch (e) {
    logger.error('Error leaving user chat:', e);
    res.status(500).json(errorResponse('Failed to leave group'));
  }
});

// Remove a participant from a group chat (personal mode)
app.post('/api/users/:userId/chats/:chatId/remove-participant', requireAuth, async (req, res) => {
  try {
    const { userId, chatId } = req.params;
    const { userId: targetUserId } = req.body;
    if (req.user?.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }
    if (!targetUserId) {
      return res.status(400).json(errorResponse('userId is required'));
    }

    const chat = await repos.chatRepo.getById(chatId);
    if (!chat) return res.status(404).json(errorResponse('Chat not found'));

    const [requester, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } }),
    ]);

    const updatedChat = await repos.chatRepo.removeParticipant(chatId, targetUserId);

    const eventMessage = {
      id: `msg-${uuidv4()}`,
      type: 'event',
      content: `${requester?.name || 'Someone'} removed ${target?.name || 'a member'} from the group`,
      event: `${requester?.name || 'Someone'} removed ${target?.name || 'a member'} from the group`,
      sender: { id: 'system', name: 'System', avatar: '', role: 'system' },
      status: 'sent',
      isOutgoing: false,
    };
    await repos.chatRepo.addMessage(chatId, eventMessage, { incrementUnread: true });
    io.to(`chat:${chatId}`).emit('message', eventMessage);

    io.to(`user:${targetUserId}`).emit('chat_update', { id: chatId, removed: true });

    const remainingParticipants = updatedChat.participants || [];
    for (const pid of remainingParticipants) {
      if (typeof pid === 'string') {
        io.to(`user:${pid}`).emit('chat_update', { id: chatId, participants: remainingParticipants });
      }
    }

    res.json(successResponse({ message: 'Participant removed successfully' }));
  } catch (e) {
    logger.error('Error removing participant from user chat:', e);
    res.status(500).json(errorResponse('Failed to remove participant'));
  }
});

// ============================================================================
// MEMBERSHIP ROUTES
// ============================================================================

// Get business members
app.get('/api/companies/:companyId/members', requireAuth, async (req, res) => {
  try {
    // SECURITY: Require business membership to view member list
    if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;

    const members = await repos.memberRepo.listBusinessMembers(req.params.companyId);
    const enrichedMembers = members.map(m => ({
      ...m,
      user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email, avatar: m.user.avatar } : null
    }));
    res.json(successResponse(enrichedMembers));
  } catch (err) { return sendError(res, err); }
});

// Get location members
app.get('/api/locations/:locationId/members', requireAuth, async (req, res) => {
  try {
    // SECURITY: Verify user belongs to the location's business
    const location = await repos.locationRepo.getById(req.params.locationId);
    if (!location) return res.status(404).json(errorResponse('Location not found'));
    const bizId = location.businessId || location.companyId;
    if (!(await requireBusinessMembership(req, res, bizId))) return;

    const members = await repos.memberRepo.listLocationMembers(req.params.locationId);
    const enrichedMembers = members.map(m => ({
      ...m,
      user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email, avatar: m.user.avatar } : null
    }));
    res.json(successResponse(enrichedMembers));
  } catch (err) { return sendError(res, err); }
});

// Get user's business memberships
app.get('/api/users/:userId/businesses', requireAuth, async (req, res) => {
  try {
    // SECURITY: Only allow users to view their own business memberships
    if (req.user?.id !== req.params.userId) {
      return res.status(403).json(errorResponse('You can only view your own business memberships', 'FORBIDDEN'));
    }

    const userBusinessMembers = await repos.memberRepo.getByUserId(req.params.userId);
    const accepted = userBusinessMembers.filter(m => m.status === MEMBER_STATUS.ACCEPTED);

    const businessesWithRole = (await Promise.all(accepted.map(async m => {
      const business = await repos.businessRepo.getById(m.businessId);
      if (!business) return null;
      return {
        membership: m,
        business: { ...business, capabilities: deriveCapabilities(business) }
      };
    }))).filter(Boolean);

    res.json(successResponse(businessesWithRole));
  } catch (err) { return sendError(res, err); }
});

// Get user's location memberships
app.get('/api/users/:userId/locations', requireAuth, async (req, res) => {
  try {
    // SECURITY: Only allow users to view their own location memberships
    if (req.user?.id !== req.params.userId) {
      return res.status(403).json(errorResponse('You can only view your own location memberships', 'FORBIDDEN'));
    }

    const allLocMembers = await repos.memberRepo.listLocationMembersByUserId(req.params.userId);
    const accepted = allLocMembers.filter(m => m.status === MEMBER_STATUS.ACCEPTED);

    const locationsWithRole = accepted
      .filter(m => m.location)
      .map(m => ({
        membership: { id: m.id, locationId: m.locationId, businessId: m.businessId, userId: m.userId, role: m.role, status: m.status, createdAt: m.createdAt },
        location: m.location,
        business: m.business ? { id: m.business.id, name: m.business.name } : null
      }));

    res.json(successResponse(locationsWithRole));
  } catch (err) { return sendError(res, err); }
});

// Search all users and businesses with connection status for the new chat modal
// A "connection" means the requesting user and target user share at least one business membership,
// or the requesting user is a member of the target business.
// Uses Prisma repos (not in-memory arrays) so newly created data is visible.
app.get('/api/users/:userId/contacts', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { search } = req.query;
    const searchTerm = search ? search.toString().trim() : '';

    // 1) Find all businessIds the requesting user belongs to
    const myMemberships = await repos.memberRepo.getByUserId(userId);
    const acceptedMemberships = myMemberships.filter(m => m.status === 'accepted');
    const userBusinessIds = acceptedMemberships.map(m => m.businessId);

    // Build search filter for Prisma (push filtering to DB instead of loading all records)
    const userWhere = { id: { not: userId } };
    const businessWhere = {};
    if (searchTerm) {
      userWhere.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
      businessWhere.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // 2) Fetch users, businesses, and shared members in parallel (all DB-filtered)
    const [matchedUsers, matchedBusinesses, allMembersInMyBusinesses] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: { id: true, name: true, avatar: true, email: true },
        take: 100,
        orderBy: { name: 'asc' },
      }),
      prisma.business.findMany({
        where: businessWhere,
        select: { id: true, name: true, logoUrl: true, email: true },
        take: 100,
        orderBy: { name: 'asc' },
      }),
      // Single query for all members across user's businesses (replaces N+1 loop)
      userBusinessIds.length > 0
        ? prisma.businessMember.findMany({
            where: { businessId: { in: userBusinessIds }, status: 'accepted', userId: { not: userId } },
            select: { userId: true, businessId: true, role: true },
          })
        : Promise.resolve([]),
    ]);

    // Build a map: userId -> { businessId, role } for connection status
    const sharedMemberMap = new Map();
    for (const m of allMembersInMyBusinesses) {
      if (!sharedMemberMap.has(m.userId)) {
        sharedMemberMap.set(m.userId, { businessId: m.businessId, role: m.role });
      }
    }

    // Map user results with connection info
    const userResults = matchedUsers.map(u => {
      const shared = sharedMemberMap.get(u.id);
      return {
        id: u.id,
        name: u.name || 'Unknown',
        avatar: u.avatar || null,
        email: u.email || null,
        type: 'user',
        is_connected: !!shared,
        role: shared ? shared.role : null,
      };
    });

    // Map business results with membership info
    const userBusinessIdSet = new Set(userBusinessIds);
    const businessResults = matchedBusinesses.map(c => {
      const isMember = userBusinessIdSet.has(c.id);
      const membership = isMember ? acceptedMemberships.find(m => m.businessId === c.id) : null;
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
    logger.error('[Contacts] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

// Legacy User Management Routes — now Prisma-backed
app.get('/api/companies/:companyId/users', requireAuth, async (req, res) => {
  // SECURITY: Require business membership
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
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
    logger.error('[CompanyUsers] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch company users' });
  }
});

// ============================================================================
// STAFF MANAGEMENT - Unified staff list for Team Management screen
// ============================================================================
// Returns merged list of business-level and location-level members with user details
app.get('/api/companies/:companyId/staff', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!(await requireBusinessMembership(req, res, companyId))) return;
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
        const userLocMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, bm.userId);
        const locationIds = userLocMembers.map(lm => lm.locationId);

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
app.get('/api/companies/:companyId/locations/:locationId/staff', requireAuth, async (req, res) => {
  try {
    const { companyId, locationId } = req.params;
    if (!(await requireBusinessMembership(req, res, companyId))) return;
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
          const superLocMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, bm.userId);
          const locationIds = superLocMembers.map(lm => lm.locationId);

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
        const userLocMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, lm.userId);
        const locationIds = userLocMembers.map(lmx => lmx.locationId);

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
app.get('/api/locations/:locationId/staff', requireAuth, async (req, res) => {
  try {
  const { locationId } = req.params;
  const includeBusinessAdmins = req.query.includeBusinessAdmins === 'true';

  const location = await repos.locationRepo.getById(locationId);
  if (!location) return res.status(404).json(errorResponse('Location not found'));

  // Derive companyId from location
  const companyId = location.businessId || location.companyId;
  if (!(await requireBusinessMembership(req, res, companyId))) return;

  // Location-level members for this location
  const allLocMembers = await repos.memberRepo.listLocationMembers(locationId);
  const filteredLocMembers = allLocMembers.filter(m => m.businessId === companyId);
  const locationStaff = (await Promise.all(filteredLocMembers.map(async m => {
      const user = await findUser(m.userId);
      if (!user) return null;

      const userLocMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, m.userId);
      const locationIds = userLocMembers.map(lm => lm.locationId);

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
        locationIds,
        locationName: location.name,
        joinedAt: m.createdAt || null,
      };
    }))).filter(Boolean);

  let businessAdminStaff = [];
  if (includeBusinessAdmins) {
    const allBizMembers = await repos.memberRepo.listBusinessMembers(companyId);
    const adminMembers = allBizMembers.filter(m => m.role === 'super_admin');
    businessAdminStaff = (await Promise.all(adminMembers.map(async m => {
        const user = await findUser(m.userId);
        if (!user) return null;

        const userLocMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, m.userId);
        const locationIds = userLocMembers.map(lm => lm.locationId);

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
          locationIds,
          locationName: location.name,
          joinedAt: m.createdAt || null,
        };
      }))).filter(Boolean);
  }

  const map = new Map();
  businessAdminStaff.forEach(m => map.set(m.id, m));
  locationStaff.forEach(m => map.set(m.id, m));

  return res.json(successResponse(Array.from(map.values())));
  } catch (err) {
    return sendError(res, err);
  }
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
    if (!(await requireBusinessAdmin(req, res, companyId))) return;
    const { userId, role, status = 'accepted' } = req.body || {};

    if (!userId) return res.status(400).json(errorResponse('userId is required'));
    ensureRole(role);
    ensureStatus(status);

    // Check staff limits (paywall)
    const business = await repos.businessRepo.getById(companyId);
    if (business) {
      const capabilities = deriveCapabilities(business);
      if (!capabilities.canHaveStaff) {
        return res.status(403).json(paywallResponse('Upgrade to Pro to add staff members', 'accept_staff', 'pro'));
      }
      const currentCount = await getStaffCount(companyId);
      if (currentCount >= capabilities.maxStaff) {
        const requiredPlan = capabilities.maxStaff >= 9 ? 'enterprise' : (capabilities.maxStaff >= 3 ? 'business' : 'pro');
        return res.status(403).json(paywallResponse(
          `Staff limit reached (${capabilities.maxStaff}). Upgrade your plan to add more staff.`,
          `staff_limit_reached_${requiredPlan === 'enterprise' ? 'business' : (requiredPlan === 'business' ? 'pro' : 'free')}`,
          requiredPlan
        ));
      }
    }

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
      bm = await repos.memberRepo.addBusinessMember({
        id: nextId('bm'),
        businessId: companyId,
        userId,
        role,
        status,
      });
    } else {
      // If already a business member, update business role if it differs
      bm = await repos.memberRepo.updateBusinessMember(bm.id, { role, status });
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
      lm = await repos.memberRepo.addLocationMember({
        id: nextId('lm'),
        businessId: companyId,
        locationId,
        userId,
        role,
        status,
      });
    } else {
      lm = await repos.memberRepo.updateLocationMember(lm.id, { role, status });
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
    if (!(await requireBusinessAdmin(req, res, companyId))) return;

    const location = await findLocation(companyId, locationId);
    if (!location) return res.status(404).json(errorResponse('Location not found for this business'));

    const bm = await findBusinessMember(companyId, userId);
    if (!bm) return res.status(404).json(errorResponse('User is not a member of this business'));

    // If super_admin, we do not delete implicit access
    if (bm.role === 'super_admin') {
      return res.status(400).json(errorResponse('super_admin access is implicit; cannot remove per-location assignment.'));
    }

    const lm = await findLocationMember(companyId, locationId, userId);
    if (!lm) return res.status(404).json(errorResponse('No location assignment found for this user'));

    await repos.memberRepo.removeLocationMember(lm.id);

    return res.json(successResponse({ removed: lm }));
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
    if (!(await requireBusinessAdmin(req, res, companyId))) return;
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
      lm = await repos.memberRepo.addLocationMember({
        id: nextId('lm'),
        businessId: companyId,
        locationId,
        userId,
        role: role || bm.role || 'staff',
        status: status || bm.status || 'accepted',
      });
    } else {
      const lmPatch = {};
      if (role !== undefined) lmPatch.role = role;
      if (status !== undefined) lmPatch.status = status;
      if (Object.keys(lmPatch).length > 0) {
        lm = await repos.memberRepo.updateLocationMember(lm.id, lmPatch);
      }
    }

    // Keep business role aligned with location role where applicable
    const bmPatch = {};
    if (role !== undefined) bmPatch.role = role;
    if (status !== undefined) bmPatch.status = status;
    let updatedBm = bm;
    if (Object.keys(bmPatch).length > 0) {
      updatedBm = await repos.memberRepo.updateBusinessMember(bm.id, bmPatch);
    }

    return res.json(successResponse({ businessMember: updatedBm, locationMember: lm }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Update role/status at the business level (no specific location).
// PATCH /api/companies/:companyId/users/:userId
// Body: { role?, status? }
// This is the fallback used by the team screen when no locationId is supplied,
// so business-level role edits work. Mirrors the location-scoped staff PATCH
// above, minus the per-location assignment logic.
app.patch('/api/companies/:companyId/users/:userId', requireAuth, async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    if (!(await requireBusinessAdmin(req, res, companyId))) return;
    const { role, status } = req.body || {};

    if (role !== undefined) ensureRole(role);
    if (status !== undefined) ensureStatus(status);

    const bm = await findBusinessMember(companyId, userId);
    if (!bm) return res.status(404).json(errorResponse('User is not a member of this business'));

    // Only a super_admin may grant or change a super_admin role, so an admin
    // can't elevate themselves or lock out the owner.
    if (bm.role === 'super_admin' || role === 'super_admin') {
      const requester = await findBusinessMember(companyId, req.user?.id);
      if (!requester || requester.role !== 'super_admin') {
        return res.status(403).json(errorResponse('Only a super_admin can change a super_admin role.', 'FORBIDDEN'));
      }
    }

    const bmPatch = {};
    if (role !== undefined) bmPatch.role = role;
    if (status !== undefined) bmPatch.status = status;

    let updatedBm = bm;
    if (Object.keys(bmPatch).length > 0) {
      updatedBm = await repos.memberRepo.updateBusinessMember(bm.id, bmPatch);
    }

    // Keep this user's existing location assignments aligned with the new
    // business-level role/status (best-effort; never block the main update).
    if (Object.keys(bmPatch).length > 0) {
      try {
        const lms = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, userId);
        for (const lm of lms || []) {
          await repos.memberRepo.updateLocationMember(lm.id, bmPatch);
        }
      } catch (e) {
        logger.warn('[role-update] failed to align location memberships:', e?.message);
      }
    }

    return res.json(successResponse({ businessMember: updatedBm }));
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
app.get('/api/companies/:companyId/access/locations', requireAuth, async (req, res) => {
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
app.get('/api/companies/:companyId/access/capabilities', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const userId = req.query.userId || req.user?.id;
    if (!userId) return res.status(400).json(errorResponse('userId is required'));

    // SECURITY: Only allow querying own capabilities or if requester is admin
    if (userId !== req.user?.id) {
      if (!(await requireBusinessAdmin(req, res, companyId))) return;
    }

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
    if (!(await requireBusinessAdmin(req, res, companyId))) return;
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
        return res.status(403).json(paywallResponse('Upgrade to Pro to invite staff members', 'accept_staff', 'pro'));
      }
      
      // Check staff limit
      const currentStaffCount = await getStaffCount(companyId);
      if (currentStaffCount >= capabilities.maxStaff) {
        const requiredPlan = capabilities.maxStaff >= 9 ? 'enterprise' : (capabilities.maxStaff >= 3 ? 'business' : 'pro');
        return res.status(403).json(paywallResponse(
          `Staff limit reached (${capabilities.maxStaff}). Upgrade your plan to add more staff.`,
          `staff_limit_reached_${requiredPlan === 'enterprise' ? 'business' : (requiredPlan === 'business' ? 'pro' : 'free')}`,
          requiredPlan
        ));
      }
    }

    // Find or create user
    let user = await findUserByEmail(email);
    if (!user) {
      user = await repos.userRepo.create({
        id: nextId('usr'),
        email: String(email).toLowerCase(),
        name: name || email.split('@')[0],
        avatar: '',
      });
    }

    // Create/update business membership
    let bm = await findBusinessMember(companyId, user.id);
    if (!bm) {
      bm = await repos.memberRepo.addBusinessMember({
        id: nextId('bm'),
        businessId: companyId,
        userId: user.id,
        role,
        status, // invited by default
      });
    } else {
      bm = await repos.memberRepo.updateBusinessMember(bm.id, { role, status });
    }

    // Super admin: no locationMembers needed
    let createdLocationMembers = [];
    if (role !== 'super_admin') {
      for (const locId of locIds) {
        let lm = await findLocationMember(companyId, locId, user.id);
        if (!lm) {
          lm = await repos.memberRepo.addLocationMember({
            id: nextId('lm'),
            businessId: companyId,
            locationId: locId,
            userId: user.id,
            role,
            status,
          });
        } else {
          lm = await repos.memberRepo.updateLocationMember(lm.id, { role, status });
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
    const currentUser = await getUserFromRequest(req);
    if (!currentUser || currentUser.id !== userId) {
      return res.status(403).json(errorResponse('You can only accept your own invite', 'ACCESS_DENIED'));
    }

    const bm = await findBusinessMember(companyId, userId);
    if (!bm) return res.status(404).json(errorResponse('Invite not found'));

    // Accept business membership
    const updatedBm = await repos.memberRepo.updateBusinessMember(bm.id, { status: 'accepted' });

    // Accept all location assignments for this business+user
    const locMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, userId);
    for (const lm of locMembers) {
      await repos.memberRepo.updateLocationMember(lm.id, { status: 'accepted' });
    }

    return res.json(successResponse({ businessMember: updatedBm }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Revoke invite (remove memberships)
// DELETE /api/companies/:companyId/users/:userId/invite
app.delete('/api/companies/:companyId/users/:userId/invite', requireAuth, async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    if (!(await requireBusinessAdmin(req, res, companyId))) return;

    // Prevent removing the last admin/super_admin
    const targetBm = await findBusinessMember(companyId, userId);
    if (targetBm && (targetBm.role === 'admin' || targetBm.role === 'super_admin') && targetBm.status === 'accepted') {
      const allMembers = await repos.memberRepo.listBusinessMembers(companyId);
      const remainingAdmins = allMembers.filter(
        m => (m.role === 'admin' || m.role === 'super_admin') && m.status === 'accepted' && m.userId !== userId
      );
      if (remainingAdmins.length === 0) {
        return res.status(400).json(errorResponse('Cannot remove the last admin. Transfer ownership first.', 'LAST_ADMIN'));
      }
    }

    // Remove location assignments
    const locMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, userId);
    for (const lm of locMembers) {
      await repos.memberRepo.removeLocationMember(lm.id);
    }

    // Remove business membership
    const bm = await findBusinessMember(companyId, userId);
    if (bm) {
      await repos.memberRepo.removeBusinessMember(bm.id);
    }

    return res.json(successResponse({ ok: true }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Decline invite
// POST /api/companies/:companyId/users/:userId/decline
app.post('/api/companies/:companyId/users/:userId/decline', requireAuth, async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const currentUser = await getUserFromRequest(req);
    if (!currentUser || currentUser.id !== userId) {
      return res.status(403).json(errorResponse('You can only decline your own invite', 'ACCESS_DENIED'));
    }

    const bm = await findBusinessMember(companyId, userId);
    if (!bm) return res.status(404).json(errorResponse('Invite not found'));

    // Remove location assignments
    const locMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, userId);
    for (const lm of locMembers) {
      await repos.memberRepo.removeLocationMember(lm.id);
    }

    // Remove business membership
    await repos.memberRepo.removeBusinessMember(bm.id);

    return res.json(successResponse({ removed: bm }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Leave company (self-removal for accepted members)
// DELETE /api/companies/:companyId/members/me
app.delete('/api/companies/:companyId/members/me', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json(errorResponse('Authentication required', 'AUTH_REQUIRED'));
    }

    const bm = await findBusinessMember(companyId, currentUser.id);
    if (!bm) return res.status(404).json(errorResponse('You are not a member of this business'));

    if (bm.status !== 'accepted') {
      return res.status(400).json(errorResponse('Only accepted members can leave. Use decline for pending invites.'));
    }

    // Prevent leaving if you are the last admin
    if (bm.role === 'admin' || bm.role === 'super_admin') {
      const allMembers = await repos.memberRepo.listBusinessMembers(companyId);
      const remainingAdmins = allMembers.filter(
        m => (m.role === 'admin' || m.role === 'super_admin') && m.status === 'accepted' && m.userId !== currentUser.id
      );
      if (remainingAdmins.length === 0) {
        return res.status(400).json(errorResponse(
          'You are the last admin. Transfer ownership to another member before leaving.',
          'LAST_ADMIN'
        ));
      }
    }

    // Remove location assignments first
    const locMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(companyId, currentUser.id);
    for (const lm of locMembers) {
      await repos.memberRepo.removeLocationMember(lm.id);
    }

    // Remove business membership
    await repos.memberRepo.removeBusinessMember(bm.id);

    return res.json(successResponse({ ok: true }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Resend invite (mock)
// POST /api/companies/:companyId/users/:userId/resend-invite
app.post('/api/companies/:companyId/users/:userId/resend-invite', requireAuth, async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    if (!(await requireBusinessAdmin(req, res, companyId))) return;
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

// Role requests are now stored in the RoleRequest Prisma model.

// Create role upgrade request (staff only)
// POST /api/companies/:companyId/role-requests
app.post('/api/companies/:companyId/role-requests', requireAuth, async (req, res) => {
  try {
    const businessId = req.params.companyId;
    const { requestedRole = 'admin', message } = req.body;

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
    const existingPending = await repos.roleRequestRepo.getByBusinessAndUser(businessId, userId, 'PENDING');
    if (existingPending) {
      return res.status(400).json(errorResponse('You already have a pending request'));
    }

    // Check cooldown (7 days after rejection)
    const recentRejection = await repos.roleRequestRepo.getByBusinessAndUser(businessId, userId, 'REJECTED');
    if (recentRejection && recentRejection.resolvedAt &&
        new Date(recentRejection.resolvedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      return res.status(400).json(errorResponse('Please wait 7 days after rejection before requesting again'));
    }

    // Create request in DB
    const request = await repos.roleRequestRepo.create({
      businessId,
      userId,
      requestedRole,
      currentRole: 'staff',
      status: 'PENDING',
      message: message || null,
    });

    return res.json(successResponse(request, 'Role upgrade request created'));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get current user's role request (if any)
// GET /api/companies/:companyId/role-requests/me
app.get('/api/companies/:companyId/role-requests/me', requireAuth, async (req, res) => {
  try {
    const businessId = req.params.companyId;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Authentication required'));
    }

    const request = await repos.roleRequestRepo.getByBusinessAndUser(
      businessId, userId, ['PENDING', 'REJECTED']
    );

    return res.json(successResponse(request || null));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get all role requests for a business (admin only)
// GET /api/companies/:companyId/role-requests?status=PENDING
app.get('/api/companies/:companyId/role-requests', requireAuth, async (req, res) => {
  try {
    const businessId = req.params.companyId;
    if (!(await requireBusinessAdmin(req, res, businessId))) return;

    const { status } = req.query;

    const requests = await repos.roleRequestRepo.getByBusinessId(
      businessId, status || null
    );

    return res.json(successResponse({ requests }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Approve or reject role request (admin only)
// PATCH /api/companies/:companyId/role-requests/:requestId
app.patch('/api/companies/:companyId/role-requests/:requestId', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const businessId = req.params.companyId;
    const { status, rejectionReason } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json(errorResponse('status must be APPROVED or REJECTED'));
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('Authentication required'));
    }

    // Verify admin
    const adminMember = await findBusinessMember(businessId, userId);
    if (!adminMember || adminMember.role === 'staff') {
      return res.status(403).json(errorResponse('Only admins can approve requests'));
    }

    // Find request in DB
    const request = await repos.roleRequestRepo.getById(requestId);
    if (!request || request.businessId !== businessId) {
      return res.status(404).json(errorResponse('Request not found'));
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json(errorResponse('Request already resolved'));
    }

    // Build update patch
    const admin = await findUser(userId);
    const updatePatch = {
      status,
      resolvedAt: new Date(),
      resolvedByUserId: userId,
      resolvedByName: admin?.name || null,
    };

    if (status === 'REJECTED' && rejectionReason) {
      updatePatch.rejectionReason = rejectionReason;
    }

    const updated = await repos.roleRequestRepo.update(requestId, updatePatch);

    // If approved, create or upgrade membership
    if (status === 'APPROVED') {
      const bm = await findBusinessMember(businessId, request.userId);

      if (request.currentRole === 'none') {
        // Check staff limits before adding new member (paywall)
        const business = await repos.businessRepo.getById(businessId);
        if (business) {
          const capabilities = deriveCapabilities(business);
          if (!capabilities.canHaveStaff) {
            return res.status(403).json(paywallResponse('Upgrade to Pro to accept join requests', 'accept_staff', 'pro'));
          }
          const currentCount = await getStaffCount(businessId);
          if (currentCount >= capabilities.maxStaff) {
            const requiredPlan = capabilities.maxStaff >= 9 ? 'enterprise' : (capabilities.maxStaff >= 3 ? 'business' : 'pro');
            return res.status(403).json(paywallResponse(
              `Staff limit reached (${capabilities.maxStaff}). Upgrade your plan to accept more members.`,
              `staff_limit_reached_${requiredPlan === 'enterprise' ? 'business' : (requiredPlan === 'business' ? 'pro' : 'free')}`,
              requiredPlan
            ));
          }
        }

        // Join request: user is not yet a member — create BusinessMember
        // Only admin or staff may be assigned via join request (never super_admin)
        const assignedRole = ['admin', 'staff'].includes(req.body.role) ? req.body.role : 'staff';
        if (bm) {
          // Has a pending/invited record, upgrade it to accepted
          await repos.memberRepo.updateBusinessMember(bm.id, { role: assignedRole, status: 'accepted' });
        } else {
          await repos.memberRepo.addBusinessMember({
            id: `bm-${uuidv4()}`,
            businessId,
            userId: request.userId,
            role: assignedRole,
            status: 'accepted',
          });
        }

        // Assign to primary/first location so user has location access
        if (assignedRole !== 'super_admin') {
          const bizLocations = await repos.locationRepo.getByBusinessId(businessId);
          const primaryLoc = bizLocations.find(l => l.isPrimary) || bizLocations[0];
          if (primaryLoc) {
            const existingLm = await findLocationMember(businessId, primaryLoc.id, request.userId);
            if (!existingLm) {
              await repos.memberRepo.addLocationMember({
                id: nextId('lm'),
                businessId,
                locationId: primaryLoc.id,
                userId: request.userId,
                role: assignedRole,
                status: 'accepted',
              });
            }
          }
        }
      } else if (bm) {
        // Role upgrade request: existing member wants admin role
        await repos.memberRepo.updateBusinessMember(bm.id, { role: 'admin' });

        // Update location memberships too (efficient: only this user's memberships)
        const locMembers = await repos.memberRepo.listLocationMembersByBusinessAndUser(businessId, request.userId);
        for (const lm of locMembers) {
          await repos.memberRepo.updateLocationMember(lm.id, { role: 'admin' });
        }
      }
    }

    return res.json(successResponse(updated, 'Role request resolved'));
  } catch (err) {
    return sendError(res, err);
  }
});

// Request to join a company from its profile (for non-members in personal mode)
// POST /api/companies/:companyId/request-membership
app.post('/api/companies/:companyId/request-membership', requireAuth, joinRequestLimiter, async (req, res) => {
  try {
    const businessId = req.params.companyId;
    const userId = req.user?.id;
    const { message } = req.body;

    if (!userId) {
      return res.status(401).json(errorResponse('Authentication required'));
    }

    // Check business exists
    const business = await repos.businessRepo.getById(businessId);
    if (!business) {
      return res.status(404).json(errorResponse('Company not found'));
    }

    // Only allow joining published companies
    if (!business.isPublished) {
      return res.status(403).json(errorResponse('This company is not accepting applications'));
    }

    // Check user is not already a member or invited
    const existingMember = await findBusinessMember(businessId, userId);
    if (existingMember) {
      if (existingMember.status === 'accepted') {
        return res.status(400).json(errorResponse('You are already a member of this company'));
      }
      return res.status(400).json(errorResponse('You already have a pending invitation from this company'));
    }

    // Check for existing pending membership request
    const existingPending = await repos.roleRequestRepo.getByBusinessAndUser(businessId, userId, 'PENDING');
    if (existingPending) {
      return res.status(400).json(errorResponse('You already have a pending request for this company'));
    }

    // Create the join request (currentRole 'none' = non-member requesting to join)
    const request = await repos.roleRequestRepo.create({
      id: `rr-${uuidv4()}`,
      businessId,
      userId,
      requestedRole: 'staff',
      currentRole: 'none',
      status: 'PENDING',
      message: message || null,
    });

    return res.json(successResponse(request, 'Join request sent'));
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
      return res.status(403).json(paywallResponse('Upgrade to Pro to assign transport', 'assign_transport', 'pro'));
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
    if (delivery.deliveryStatus === DS.NOT_ASSIGNED) {
      patch.deliveryStatus = DS.ASSIGNED;
    }

    const updated = await repos.deliveryRepo.update(deliveryId, patch);

    // Bridge: also create DeliveryStaff record for multi-staff system
    try {
      const existingAssignment = await repos.deliveryStaffRepo.getAssignment(deliveryId, userId);
      if (!existingAssignment) {
        await repos.deliveryStaffRepo.assign({
          deliveryId, userId, role: 'driver', assignedBy: req.user?.id || null,
        });
      }
    } catch (staffErr) {
      logger.warn('Failed to create DeliveryStaff record:', staffErr.message);
    }

    // Sync delivery assignment status to linked order (with loop guard)
    if (patch.deliveryStatus && delivery.orderId && !_orderDeliverySyncInProgress.has(delivery.orderId)) {
      _orderDeliverySyncInProgress.add(delivery.orderId);
      try {
        await repos.orderRepo.update(delivery.orderId, { deliveryStatus: patch.deliveryStatus });
      } catch (syncErr) {
        logger.warn('Failed to sync delivery assign to order:', syncErr.message);
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
    if (delivery.deliveryStatus === DS.ASSIGNED) {
      patch.deliveryStatus = DS.NOT_ASSIGNED;
    }

    const updated = await repos.deliveryRepo.update(deliveryId, patch);

    // Bridge: also remove all DeliveryStaff records
    try {
      const allStaff = await repos.deliveryStaffRepo.getByDeliveryId(deliveryId);
      for (const staff of allStaff) {
        await repos.deliveryStaffRepo.unassign(deliveryId, staff.userId);
      }
    } catch (staffErr) {
      logger.warn('Failed to remove DeliveryStaff records:', staffErr.message);
    }

    // Sync delivery unassignment status to linked order (with loop guard)
    if (patch.deliveryStatus && delivery.orderId && !_orderDeliverySyncInProgress.has(delivery.orderId)) {
      _orderDeliverySyncInProgress.add(delivery.orderId);
      try {
        await repos.orderRepo.update(delivery.orderId, { deliveryStatus: patch.deliveryStatus });
      } catch (syncErr) {
        logger.warn('Failed to sync delivery unassign to order:', syncErr.message);
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
// MULTI-STAFF DELIVERY ASSIGNMENT (CRUD)
// ============================================================================

// Assign staff to delivery with role
// POST /api/companies/:companyId/deliveries/:deliveryId/staff
app.post('/api/companies/:companyId/deliveries/:deliveryId/staff', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId, deliveryId } = req.params;
    const { userId, role = 'driver' } = req.body;

    if (!userId) return res.status(400).json(errorResponse('userId is required'));
    if (!['driver', 'teamLeader', 'support'].includes(role)) {
      return res.status(400).json(errorResponse('role must be driver, teamLeader, or support'));
    }

    // Plan capability check
    const business = await repos.businessRepo.getById(companyId);
    if (!business) return res.status(404).json(errorResponse('Business not found'));
    const capabilities = deriveCapabilities(business);
    if (!capabilities.canAssignTransport) {
      return res.status(403).json(paywallResponse('Upgrade to Pro to assign transport', 'assign_transport', 'pro'));
    }

    // Validate delivery exists and belongs to business
    const delivery = await repos.deliveryRepo.getById(deliveryId);
    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    // Validate user is accepted business member
    const members = await repos.memberRepo.listBusinessMembers(companyId);
    const member = members.find(m => m.userId === userId && m.status === 'accepted');
    if (!member) return res.status(403).json(errorResponse('User not accepted in this business'));

    // Enforce location access (unless super_admin)
    if (member.role !== 'super_admin' && delivery.locationId) {
      const locationMembersResult = await repos.memberRepo.listLocationMembers(delivery.locationId);
      const hasAccess = locationMembersResult.some(lm => lm.userId === userId && lm.status === 'accepted');
      if (!hasAccess) return res.status(403).json(errorResponse('User has no access to this delivery location'));
    }

    // Check if already assigned
    const existing = await repos.deliveryStaffRepo.getAssignment(deliveryId, userId);
    if (existing) return res.status(409).json(errorResponse('User already assigned to this delivery'));

    // Create assignment
    const assignment = await repos.deliveryStaffRepo.assign({
      deliveryId, userId, role, assignedBy: req.user?.id || null,
    });

    // Backward compat: update legacy fields with primary driver
    const allStaff = await repos.deliveryStaffRepo.getByDeliveryId(deliveryId);
    const primaryDriver = allStaff.find(s => s.role === 'driver') || allStaff[0];
    const backwardPatch = {
      assignedStaffId: primaryDriver?.userId || null,
      assignedTo: primaryDriver?.user?.name || null,
    };
    if (delivery.deliveryStatus === DS.NOT_ASSIGNED) {
      backwardPatch.deliveryStatus = DS.ASSIGNED;
    }
    await repos.deliveryRepo.update(deliveryId, backwardPatch);

    // Sync to linked order
    if (backwardPatch.deliveryStatus && delivery.orderId && !_orderDeliverySyncInProgress.has(delivery.orderId)) {
      _orderDeliverySyncInProgress.add(delivery.orderId);
      try { await repos.orderRepo.update(delivery.orderId, { deliveryStatus: backwardPatch.deliveryStatus }); }
      catch (syncErr) { logger.warn('Failed to sync:', syncErr.message); }
      finally { _orderDeliverySyncInProgress.delete(delivery.orderId); }
    }

    return res.status(201).json(successResponse(assignment));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message || 'Server error'));
  }
});

// Remove staff from delivery
// DELETE /api/companies/:companyId/deliveries/:deliveryId/staff/:userId
app.delete('/api/companies/:companyId/deliveries/:deliveryId/staff/:userId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId, deliveryId, userId } = req.params;

    const delivery = await repos.deliveryRepo.getById(deliveryId);
    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    const existing = await repos.deliveryStaffRepo.getAssignment(deliveryId, userId);
    if (!existing) return res.status(404).json(errorResponse('Assignment not found'));

    await repos.deliveryStaffRepo.unassign(deliveryId, userId);

    // Backward compat: recalculate legacy fields
    const remainingStaff = await repos.deliveryStaffRepo.getByDeliveryId(deliveryId);
    const primaryDriver = remainingStaff.find(s => s.role === 'driver') || remainingStaff[0];
    const backwardPatch = {
      assignedStaffId: primaryDriver?.userId || null,
      assignedTo: primaryDriver?.user?.name || null,
    };
    if (remainingStaff.length === 0 && delivery.deliveryStatus === DS.ASSIGNED) {
      backwardPatch.deliveryStatus = DS.NOT_ASSIGNED;
    }
    await repos.deliveryRepo.update(deliveryId, backwardPatch);

    // Sync to linked order
    if (backwardPatch.deliveryStatus && delivery.orderId && !_orderDeliverySyncInProgress.has(delivery.orderId)) {
      _orderDeliverySyncInProgress.add(delivery.orderId);
      try { await repos.orderRepo.update(delivery.orderId, { deliveryStatus: backwardPatch.deliveryStatus }); }
      catch (syncErr) { logger.warn('Failed to sync:', syncErr.message); }
      finally { _orderDeliverySyncInProgress.delete(delivery.orderId); }
    }

    return res.json(successResponse(null, 'Staff removed from delivery'));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message || 'Server error'));
  }
});

// List staff assigned to a delivery
// GET /api/companies/:companyId/deliveries/:deliveryId/staff
app.get('/api/companies/:companyId/deliveries/:deliveryId/staff', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId, deliveryId } = req.params;

    const delivery = await repos.deliveryRepo.getById(deliveryId);
    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    const staff = await repos.deliveryStaffRepo.getByDeliveryId(deliveryId);
    return res.json(successResponse(staff));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message || 'Server error'));
  }
});

// Update staff role on a delivery
// PATCH /api/companies/:companyId/deliveries/:deliveryId/staff/:userId
app.patch('/api/companies/:companyId/deliveries/:deliveryId/staff/:userId', requireAuth, async (req, res) => {
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
  try {
    const { companyId, deliveryId, userId } = req.params;
    const { role } = req.body;

    if (!role || !['driver', 'teamLeader', 'support'].includes(role)) {
      return res.status(400).json(errorResponse('role must be driver, teamLeader, or support'));
    }

    const delivery = await repos.deliveryRepo.getById(deliveryId);
    if (!delivery || delivery.businessId !== companyId) {
      return res.status(404).json(errorResponse('Delivery not found'));
    }

    const existing = await repos.deliveryStaffRepo.getAssignment(deliveryId, userId);
    if (!existing) {
      return res.status(404).json(errorResponse('User is not assigned to this delivery'));
    }

    const updated = await repos.deliveryStaffRepo.updateRole(deliveryId, userId, role);

    // Backward compat: recalculate primary driver
    const allStaff = await repos.deliveryStaffRepo.getByDeliveryId(deliveryId);
    const primaryDriver = allStaff.find(s => s.role === 'driver') || allStaff[0];
    await repos.deliveryRepo.update(deliveryId, {
      assignedStaffId: primaryDriver?.userId || null,
      assignedTo: primaryDriver?.user?.name || null,
    });

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
    const currentUser = await getUserFromRequest(req);
    if (!currentUser || currentUser.id !== userId) {
      return res.status(403).json(errorResponse('You can only view your own activities', 'ACCESS_DENIED'));
    }

    const assignedDeliveries = await repos.deliveryRepo.getByAssignedStaffId(userId);

    const activities = assignedDeliveries.map(d => ({
      id: `activity-${d.id}`,
      type: 'delivery',
      createdAt: d.updatedAt || d.createdAt,
      delivery: {
        id: d.id,
        businessId: d.businessId,
        businessName: d.business?.name || d.distributorName || null,
        businessLogo: d.business?.logoUrl || null,
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
  if (!(await requireBusinessMembership(req, res, req.params.companyId))) return;
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
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse('No file uploaded'));
    }

    if (useSupabaseStorage) {
      // Persist to Supabase Storage → returns a permanent public CDN URL that
      // survives deploys (req.file.buffer comes from multer.memoryStorage).
      const url = await storageService.uploadBuffer({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
      return res.json(successResponse({ url }));
    }

    // Local-dev fallback (disk storage): host-derived URL (works with LAN IP).
    // NOTE: ephemeral on Render — for local development only.
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    return res.json(successResponse({ url: fileUrl }));
  } catch (err) {
    // Surface the underlying storage error so misconfig (wrong key, wrong bucket,
    // RLS denial, etc.) is diagnosable from the client instead of a generic message.
    logger.error('[Upload] Error:', err);
    const detail = (err && (err.message || err.error)) || 'Unknown storage error';
    res.status(500).json(errorResponse(`File upload failed: ${detail}`));
  }
});

// Feed Routes (paginated, Prisma-backed)
app.get('/api/feed', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const cursor = req.query.cursor; // post id of the last item (optional)
    // SECURITY: Public endpoint — do not trust viewerBusinessId from query params
    const viewerBusinessId = null;
    const userId = req.user?.id;

    // Get IDs of businesses the user follows (for prioritization)
    let followedBusinessIds = [];
    if (userId) {
      const follows = await prisma.businessFollow.findMany({
        where: { userId },
        select: { businessId: true },
      });
      followedBusinessIds = follows.map(f => f.businessId);
    }

    const allPosts = await prisma.feedPost.findMany({
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        businessId: true,
        type: true,
        timestamp: true,
        data: true,
        createdAt: true,
      },
    });

    const hasMore = allPosts.length > limit;
    const items = hasMore ? allPosts.slice(0, limit) : allPosts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Apply price privacy to embedded products in feed posts
    const privacyPage = await Promise.all(items.map(async (post) => {
      const isFromFollowed = followedBusinessIds.includes(post.businessId);

      if (!post.data?.products || post.data.products.length === 0) {
        return { ...post, isFromFollowed };
      }

      // Determine the owner business ID for this post's products
      const ownerBizId = post.data.distributorId || post.data.businessId;
      if (!ownerBizId) return { ...post, isFromFollowed };

      // Apply price privacy to each product in the post
      const privacyProducts = await applyPricePrivacyBatch(
        post.data.products.map(p => ({ ...p, ownerBusinessId: ownerBizId })),
        viewerBusinessId || null
      );

      return { ...post, data: { ...post.data, products: privacyProducts }, isFromFollowed };
    }));

    // Sort: followed businesses' posts first, then by date
    if (followedBusinessIds.length > 0) {
      privacyPage.sort((a, b) => {
        if (a.isFromFollowed && !b.isFromFollowed) return -1;
        if (!a.isFromFollowed && b.isFromFollowed) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    res.json({
      success: true,
      data: privacyPage,
      nextCursor,
      message: 'Success'
    });
  } catch (err) {
    logger.error('[Feed] Error:', err);
    res.json({ success: true, data: [], nextCursor: null, message: 'Success' });
  }
});

// Aggregate recent invoices, deliveries, orders, POs and PRs into one timeline.
// Shared by the /activity-feed route and the /dashboard route below.
async function buildActivityFeed(companyId, locationId, maxLimit) {
  // Helper to format currency
  const formatCurrency = (amount) => `Rs ${Number(amount).toFixed(2)}`;

  let activities = [];

  // 1. Recent invoices (fetch only what we need via Prisma directly)
  const businessInvoices = await prisma.invoice.findMany({
    where: { businessId: companyId, ...(locationId ? { issuedByLocationId: locationId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const recentInvoices = businessInvoices
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

  // 2. Recent deliveries (fetch only what we need via Prisma directly)
  const businessDeliveries = await prisma.delivery.findMany({
    where: { businessId: companyId, ...(locationId ? { locationId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const recentDeliveries = businessDeliveries
    .map(del => {
      const statusMap = {
        [DS.OUT_FOR_DELIVERY]: 'delivery_started',
        [DS.DELIVERED]: 'delivery_completed',
        [DS.CANCELED]: 'delivery_canceled',
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

  // 3. Recent orders (fetch only what we need via Prisma directly)
  const businessOrders = await prisma.order.findMany({
    where: { businessId: companyId, ...(locationId ? { soldByLocationId: locationId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const recentOrders = businessOrders
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

  // 4. Recent purchase orders
  try {
    const businessPOs = await repos.procurementRepo.getPurchaseOrders(companyId);
    const recentPOs = businessPOs
      .slice(0, 20)
      .map(po => {
        const statusMap = {
          'DRAFT': 'purchase_order_created',
          'SENT': 'purchase_order_sent',
          'CONFIRMED': 'purchase_order_confirmed',
          'PARTIALLY_RECEIVED': 'purchase_order_receiving',
          'RECEIVED': 'purchase_order_received',
          'CANCELED': 'purchase_order_canceled',
        };
        return {
          id: `po-${po.id}`,
          type: statusMap[po.status] || 'purchase_order_created',
          title: `PO ${po.id} ${po.status.toLowerCase().replace('_', ' ')}`,
          description: `${po.supplier?.name || 'Supplier'} - ${formatCurrency(po.totalAmount)}`,
          timestamp: po.updatedAt || po.createdAt,
          entityId: po.id,
          entityType: 'purchase_order',
          metadata: {
            status: po.status,
            amount: po.totalAmount,
            supplierName: po.supplier?.name,
          },
        };
      });
    activities.push(...recentPOs);
  } catch (_) {}

  // 5. Recent purchase requests
  try {
    const businessPRs = await repos.procurementRepo.getPurchaseRequests(companyId);
    const recentPRs = businessPRs
      .slice(0, 20)
      .map(pr => {
        const statusMap = {
          'DRAFT': 'purchase_request_created',
          'SUBMITTED': 'purchase_request_submitted',
          'APPROVED': 'purchase_request_approved',
          'REJECTED': 'purchase_request_rejected',
          'CONVERTED': 'purchase_request_approved',
        };
        return {
          id: `pr-${pr.id}`,
          type: statusMap[pr.status] || 'purchase_request_created',
          title: `Request ${pr.id} ${pr.status.toLowerCase()}`,
          description: `${pr.supplier?.name || 'No supplier'} - ${pr.priority} priority`,
          timestamp: pr.updatedAt || pr.createdAt,
          entityId: pr.id,
          entityType: 'purchase_request',
          metadata: {
            status: pr.status,
            priority: pr.priority,
          },
        };
      });
    activities.push(...recentPRs);
  } catch (_) {}

  // Sort by timestamp (newest first) and limit
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return activities.slice(0, maxLimit);
}

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

    const activities = await buildActivityFeed(companyId, locationId, maxLimit);
    return res.json(successResponse({ activities }));
  } catch (err) {
    logger.error('Error fetching activity feed:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', err.message || 'Failed to fetch activity feed'));
  }
});

// Business Dashboard - summary counts, priority queue and recent activity for the Home screen
// GET /api/companies/:companyId/dashboard?locationId=...
app.get('/api/companies/:companyId/dashboard', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { locationId } = req.query;

    // Verify user has access to this business
    const userId = req.user?.id;
    if (!userId || !(await isBusinessMember(companyId, userId))) {
      return res.status(403).json(errorResponse('ACCESS_DENIED', 'You do not have access to this business'));
    }

    const now = new Date();
    const formatCurrency = (amount) => `Rs ${Number(amount || 0).toFixed(2)}`;
    const orderLoc = locationId ? { soldByLocationId: locationId } : {};
    const deliveryLoc = locationId ? { locationId } : {};
    const invoiceLoc = locationId ? { issuedByLocationId: locationId } : {};
    const taskLoc = locationId ? { locationId } : {};

    // Deliveries that still need action (anything not delivered / failed / canceled)
    const ACTIVE_DELIVERY = ACTIVE_DELIVERY_STATUSES;
    // Invoices that are still owed money
    const UNPAID_INVOICE = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'];
    // Tasks not yet finished
    const OPEN_TASK = ['TODO', 'IN_PROGRESS'];
    const LOW_STOCK_THRESHOLD = 5;
    // Orders that count as "active" (not finished / not killed) and revenue-eligible
    const ACTIVE_ORDER_STATUSES = ['NEW', 'ACCEPTED', 'ONGOING', 'PENDING', 'IN_REVIEW'];
    const SALES_EXCLUDED_STATUSES = ['CANCELED', 'REJECTED'];

    // Date windows for "today" / "yesterday" sales (server local time)
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Run a sub-query but never let one failure take down the whole dashboard
    const settle = async (fn, fallback) => {
      try { return await fn(); } catch (e) { logger.error('[Dashboard] sub-query failed:', e?.message); return fallback; }
    };

    const [
      newOrders,
      pendingDeliveries,
      unpaidInvoices,
      openTasks,
      pendingOrderRows,
      pendingDeliveryRows,
      overdueInvoiceRows,
      lowStockRows,
      recentActivity,
      salesTodayAgg,
      salesYesterdayAgg,
      activeOrders,
      deliveriesToday,
      deliveriesInTransit,
      overdueInvoiceCount,
      lowStockCount,
      outOfStockCount,
      unpaidInvoiceAgg,
    ] = await Promise.all([
      // --- summary counts (KPI chips) ---
      settle(() => prisma.order.count({ where: { businessId: companyId, status: 'NEW', ...orderLoc } }), 0),
      settle(() => prisma.delivery.count({ where: { businessId: companyId, deliveryStatus: { in: ACTIVE_DELIVERY }, ...deliveryLoc } }), 0),
      settle(() => prisma.invoice.count({ where: { businessId: companyId, status: { in: UNPAID_INVOICE }, ...invoiceLoc } }), 0),
      settle(() => prisma.task.count({ where: { businessId: companyId, status: { in: OPEN_TASK }, ...taskLoc } }), 0),
      // --- priority queue source rows ---
      settle(() => prisma.order.findMany({ where: { businessId: companyId, status: 'NEW', ...orderLoc }, orderBy: { createdAt: 'desc' }, take: 10 }), []),
      settle(() => prisma.delivery.findMany({ where: { businessId: companyId, deliveryStatus: DS.NOT_ASSIGNED, ...deliveryLoc }, orderBy: { createdAt: 'desc' }, take: 10 }), []),
      settle(() => prisma.invoice.findMany({ where: { businessId: companyId, OR: [{ status: 'OVERDUE' }, { status: { in: ['SENT', 'PARTIALLY_PAID'] }, dueDate: { lt: now } }], ...invoiceLoc }, orderBy: { dueDate: 'asc' }, take: 10 }), []),
      settle(() => prisma.stock.findMany({ where: { businessId: companyId, qtyOnHand: { lte: LOW_STOCK_THRESHOLD }, ...(locationId ? { locationId } : {}) }, orderBy: { qtyOnHand: 'asc' }, take: 10, include: { product: { select: { name: true } } } }), []),
      // --- recent activity preview ---
      settle(() => buildActivityFeed(companyId, locationId, 8), []),
      // --- KPI cards: today's sales, vs yesterday, active orders, today's deliveries ---
      settle(() => prisma.order.aggregate({ _sum: { totalAmount: true }, where: { businessId: companyId, createdAt: { gte: todayStart, lt: tomorrowStart }, status: { notIn: SALES_EXCLUDED_STATUSES }, ...orderLoc } }), { _sum: { totalAmount: 0 } }),
      settle(() => prisma.order.aggregate({ _sum: { totalAmount: true }, where: { businessId: companyId, createdAt: { gte: yesterdayStart, lt: todayStart }, status: { notIn: SALES_EXCLUDED_STATUSES }, ...orderLoc } }), { _sum: { totalAmount: 0 } }),
      settle(() => prisma.order.count({ where: { businessId: companyId, status: { in: ACTIVE_ORDER_STATUSES }, ...orderLoc } }), 0),
      settle(() => prisma.delivery.count({ where: { businessId: companyId, expectedDeliveryDateTime: { gte: todayStart, lt: tomorrowStart }, ...deliveryLoc } }), 0),
      settle(() => prisma.delivery.count({ where: { businessId: companyId, deliveryStatus: DS.OUT_FOR_DELIVERY, ...deliveryLoc } }), 0),
      // --- accurate counts for health + KPI deltas (not capped by take:10) ---
      settle(() => prisma.invoice.count({ where: { businessId: companyId, OR: [{ status: 'OVERDUE' }, { status: { in: ['SENT', 'PARTIALLY_PAID'] }, dueDate: { lt: now } }], ...invoiceLoc } }), 0),
      settle(() => prisma.stock.count({ where: { businessId: companyId, qtyOnHand: { gt: 0, lte: LOW_STOCK_THRESHOLD }, ...(locationId ? { locationId } : {}) } }), 0),
      settle(() => prisma.stock.count({ where: { businessId: companyId, qtyOnHand: { lte: 0 }, ...(locationId ? { locationId } : {}) } }), 0),
      // Outstanding unpaid amount (Σ totalAmount − Σ paidAmount on unpaid invoices)
      settle(() => prisma.invoice.aggregate({ _sum: { totalAmount: true, paidAmount: true }, where: { businessId: companyId, status: { in: UNPAID_INVOICE }, ...invoiceLoc } }), { _sum: { totalAmount: 0, paidAmount: 0 } }),
    ]);

    // Build the priority queue. Backend supplies the data; the app attaches handlers.
    const priorityItems = [];

    for (const ord of pendingOrderRows) {
      priorityItems.push({
        id: `order-${ord.id}`,
        type: 'order_pending',
        title: `Order #${ord.id}`,
        subtitle: `${ord.customerName || ord.buyerBusinessName || 'Customer'} · ${formatCurrency(ord.totalAmount)}`,
        timestamp: ord.createdAt,
        urgency: 'medium',
        entityType: 'order',
        entityId: ord.id,
      });
    }

    for (const del of pendingDeliveryRows) {
      priorityItems.push({
        id: `delivery-${del.id}`,
        type: 'delivery_pending',
        title: `Delivery #${del.id}`,
        subtitle: `${del.clientCompanyName || 'Unassigned'} · ${del.itemCount || 0} items`,
        timestamp: del.createdAt,
        urgency: 'medium',
        entityType: 'delivery',
        entityId: del.id,
      });
    }

    for (const inv of overdueInvoiceRows) {
      priorityItems.push({
        id: `invoice-${inv.id}`,
        type: 'invoice_overdue',
        title: `Invoice ${inv.invoiceNumber || inv.id}`,
        subtitle: `${inv.clientName || 'Client'} · ${formatCurrency(inv.totalAmount)}`,
        timestamp: inv.dueDate || inv.createdAt,
        urgency: 'high',
        entityType: 'invoice',
        entityId: inv.id,
      });
    }

    for (const st of lowStockRows) {
      priorityItems.push({
        id: `stock-${st.id}`,
        type: 'stock_alert',
        title: st.product?.name || 'Product low on stock',
        subtitle: st.qtyOnHand <= 0 ? 'Out of stock' : `${st.qtyOnHand} left`,
        timestamp: now,
        urgency: st.qtyOnHand <= 0 ? 'high' : 'medium',
        entityType: 'product',
        entityId: st.productId,
      });
    }

    // Most urgent first (high > medium > low), then newest first, capped at 10
    const urgencyRank = { high: 0, medium: 1, low: 2 };
    priorityItems.sort((a, b) => {
      const u = urgencyRank[a.urgency] - urgencyRank[b.urgency];
      if (u !== 0) return u;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const salesToday = salesTodayAgg?._sum?.totalAmount || 0;
    const salesYesterday = salesYesterdayAgg?._sum?.totalAmount || 0;
    const unpaidInvoiceAmount = Math.max(
      0,
      (unpaidInvoiceAgg?._sum?.totalAmount || 0) - (unpaidInvoiceAgg?._sum?.paidAmount || 0)
    );

    // Business health summary (critical > attention > good), with a plain-language reason
    const plural = (n, s, p) => `${n} ${n === 1 ? s : (p || `${s}s`)}`;
    const humanJoin = (arr) =>
      arr.length <= 1 ? (arr[0] || '') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
    let health;
    if (outOfStockCount > 0 || overdueInvoiceCount >= 3) {
      const bits = [];
      if (outOfStockCount > 0) bits.push(`${plural(outOfStockCount, 'product')} out of stock`);
      if (overdueInvoiceCount > 0) bits.push(`${plural(overdueInvoiceCount, 'invoice')} overdue`);
      health = { status: 'critical', reason: `${humanJoin(bits)}.` };
    } else if (newOrders > 0 || lowStockCount > 0 || unpaidInvoices > 0 || pendingDeliveries > 0) {
      const bits = [];
      if (newOrders > 0) bits.push(`${plural(newOrders, 'new order')} to review`);
      if (lowStockCount > 0) bits.push(`${plural(lowStockCount, 'product')} low in stock`);
      if (overdueInvoiceCount > 0) bits.push(`${plural(overdueInvoiceCount, 'invoice')} overdue`);
      else if (unpaidInvoices > 0) bits.push(`${plural(unpaidInvoices, 'unpaid invoice')}`);
      if (pendingDeliveries > 0) bits.push(`${plural(pendingDeliveries, 'delivery', 'deliveries')} pending`);
      health = { status: 'attention', reason: `${humanJoin(bits.slice(0, 2))}.` };
    } else {
      health = { status: 'good', reason: 'Everything looks good. No urgent action needed.' };
    }

    return res.json(successResponse({
      summary: {
        newOrders,
        pendingDeliveries,
        unpaidInvoices,
        unpaidInvoiceAmount,
        openTasks,
        salesToday,
        salesYesterday,
        activeOrders,
        deliveriesToday,
        deliveriesInTransit,
        overdueInvoiceCount,
        lowStockCount,
        outOfStockCount,
      },
      health,
      priorityItems: priorityItems.slice(0, 10),
      recentActivity,
    }));
  } catch (err) {
    logger.error('Error fetching business dashboard:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', err.message || 'Failed to fetch dashboard'));
  }
});

// GET /api/companies/:companyId/dashboard/overview?range=7d|30d&locationId=...
// Business Overview analytics block: revenue trend, orders-by-status, invoice collection.
// Gated server-side: Business+ only; 30d range is Enterprise-only (else clamped to 7d).
app.get('/api/companies/:companyId/dashboard/overview', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { locationId } = req.query;

    const userId = req.user?.id;
    if (!userId || !(await isBusinessMember(companyId, userId))) {
      return res.status(403).json(errorResponse('ACCESS_DENIED', 'You do not have access to this business'));
    }

    // Entitlement: analytics is Business+ ; full (30d) history is Enterprise-only
    const business = await prisma.business.findUnique({
      where: { id: companyId },
      select: { subscriptionTier: true },
    });
    const tier = business?.subscriptionTier || 'FREE';
    const hasAnalytics = tier === 'BUSINESS' || tier === 'ENTERPRISE';
    if (!hasAnalytics) {
      return res.status(403).json(errorResponse('UPGRADE_REQUIRED', 'Analytics is available on the Business plan and above'));
    }
    const allow30d = tier === 'ENTERPRISE';
    const range = (req.query.range === '30d' && allow30d) ? '30d' : '7d';
    const days = range === '30d' ? 30 : 7;

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const rangeStart = new Date(todayStart); rangeStart.setDate(rangeStart.getDate() - (days - 1));
    const SALES_EXCLUDED_STATUSES = ['CANCELED', 'REJECTED'];

    const orderLoc = locationId ? { soldByLocationId: locationId } : {};
    const invoiceLoc = locationId ? { issuedByLocationId: locationId } : {};

    const dayKey = (d) => {
      const x = new Date(d);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    };

    const [revenueRows, ordersGrouped, invoiceRows] = await Promise.all([
      // Daily revenue (orders created in range, excluding canceled/rejected)
      prisma.order.findMany({
        where: { businessId: companyId, createdAt: { gte: rangeStart, lt: tomorrowStart }, status: { notIn: SALES_EXCLUDED_STATUSES }, ...orderLoc },
        select: { createdAt: true, totalAmount: true },
      }),
      // Orders by status over the range
      prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { businessId: companyId, createdAt: { gte: rangeStart, lt: tomorrowStart }, ...orderLoc },
      }),
      // Invoice collection over the range
      prisma.invoice.findMany({
        where: { businessId: companyId, createdAt: { gte: rangeStart, lt: tomorrowStart }, ...invoiceLoc },
        select: { totalAmount: true, paidAmount: true, status: true, dueDate: true },
      }),
    ]);

    // --- revenueTrend: one bucket per day from rangeStart..today ---
    const buckets = {};
    for (const o of revenueRows) {
      const k = dayKey(o.createdAt);
      buckets[k] = (buckets[k] || 0) + (o.totalAmount || 0);
    }
    const revenueTrend = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart); d.setDate(d.getDate() + i);
      const k = dayKey(d);
      revenueTrend.push({ date: k, amount: buckets[k] || 0 });
    }
    const revenueTotal = revenueTrend.reduce((sum, p) => sum + p.amount, 0);

    // --- ordersByStatus: simplified buckets ---
    const ordersByStatus = { New: 0, Active: 0, Pending: 0, Completed: 0, Canceled: 0 };
    for (const g of ordersGrouped) {
      const c = g._count?._all || 0;
      switch (g.status) {
        case 'NEW': ordersByStatus.New += c; break;
        case 'ACCEPTED': case 'ONGOING': ordersByStatus.Active += c; break;
        case 'PENDING': case 'IN_REVIEW': ordersByStatus.Pending += c; break;
        case 'DONE': ordersByStatus.Completed += c; break;
        case 'CANCELED': case 'REJECTED': ordersByStatus.Canceled += c; break;
      }
    }

    // --- invoiceCollection: paid / unpaid / overdue (outstanding amounts) ---
    let paid = 0, unpaid = 0, overdue = 0;
    for (const inv of invoiceRows) {
      const total = inv.totalAmount || 0;
      const paidAmt = inv.paidAmount || 0;
      paid += paidAmt;
      const outstanding = Math.max(0, total - paidAmt);
      const isUnpaid = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status);
      if (isUnpaid) unpaid += outstanding;
      const isOverdue = inv.status === 'OVERDUE'
        || (['SENT', 'PARTIALLY_PAID'].includes(inv.status) && inv.dueDate && new Date(inv.dueDate) < now);
      if (isOverdue) overdue += outstanding;
    }

    return res.json(successResponse({
      range,
      revenueTrend,
      revenueTotal,
      ordersByStatus,
      invoiceCollection: { paid, unpaid, overdue },
    }));
  } catch (err) {
    logger.error('Error fetching dashboard overview:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', err.message || 'Failed to fetch overview'));
  }
});

// Notifications API - Aggregates notifications from multiple sources
// GET /api/users/:userId/notifications?filter=all|unread|requests&mode=business|personal
app.get('/api/users/:userId/notifications', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { filter = 'all', mode = 'business' } = req.query;

    // Verify user is requesting their own notifications
    const requestUserId = req.user?.id;
    if (requestUserId !== userId) {
      return res.status(403).json(errorResponse('ACCESS_DENIED', 'You can only access your own notifications'));
    }

    const formatCurrency = (amount) => `Rs ${Number(amount || 0).toFixed(2)}`;
    const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let notifications = [];

    // =========================================================================
    // BUSINESS MODE — parallelized with DB-level filtering
    // =========================================================================
    if (mode === 'business') {
    const userBusinesses = await repos.memberRepo.getByUserId(userId);
    const allBusinessIds = userBusinesses.map(ub => ub.businessId);
    const adminBusinesses = userBusinesses.filter(ub => ub.role === 'admin' || ub.role === 'super_admin');
    const adminBusinessIds = adminBusinesses.map(ub => ub.businessId);

    // Run all notification fetches in parallel
    const results = await Promise.allSettled([
      // 1. Pending join requests — staff_request (admin only)
      adminBusinessIds.length > 0
        ? prisma.roleRequest.findMany({
            where: { businessId: { in: adminBusinessIds }, status: 'PENDING' },
            include: { user: { select: { name: true, avatar: true, email: true } } },
            take: 50,
          })
        : Promise.resolve([]),

      // 2. Recently approved requests — join_accepted (admin only)
      adminBusinessIds.length > 0
        ? prisma.roleRequest.findMany({
            where: { businessId: { in: adminBusinessIds }, status: 'APPROVED', resolvedAt: { gte: THIRTY_DAYS_AGO } },
            include: { user: { select: { name: true, avatar: true, email: true } } },
            take: 50,
          })
        : Promise.resolve([]),

      // 3. Pending invites — invite_pending (admin only)
      adminBusinessIds.length > 0
        ? prisma.businessMember.findMany({
            where: { businessId: { in: adminBusinessIds }, status: 'invited' },
            include: { user: { select: { email: true } } },
            take: 50,
          })
        : Promise.resolve([]),

      // 4. Business connection requests — company_request (admin only)
      adminBusinessIds.length > 0
        ? (async () => {
            const conns = [];
            for (const bizId of adminBusinessIds) {
              try { conns.push(...await repos.connectionRepo.listPendingBusinessRequests(bizId)); } catch {}
            }
            return conns;
          })()
        : Promise.resolve([]),

      // 5. Recently accepted business connections — connection_accepted (admin only)
      adminBusinessIds.length > 0
        ? (async () => {
            const conns = [];
            for (const bizId of adminBusinessIds) {
              try {
                const accepted = await repos.connectionRepo.listBusinessConnections(bizId, 'accepted');
                conns.push(...accepted.filter(c => c.createdAt && new Date(c.createdAt) > THIRTY_DAYS_AGO).slice(0, 5).map(c => ({ ...c, _sourceBizId: bizId })));
              } catch {}
            }
            return conns;
          })()
        : Promise.resolve([]),

      // 6. Paid invoices — DB-filtered instead of loading all
      allBusinessIds.length > 0
        ? prisma.invoice.findMany({
            where: { businessId: { in: allBusinessIds }, status: 'PAID' },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, totalAmount: true, updatedAt: true, createdAt: true },
            take: 10,
          })
        : Promise.resolve([]),

      // 7. Completed deliveries — DB-filtered
      allBusinessIds.length > 0
        ? prisma.delivery.findMany({
            where: { businessId: { in: allBusinessIds }, deliveryStatus: DS.DELIVERED },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, clientCompanyName: true, businessId: true, updatedAt: true, createdAt: true },
            take: 10,
          })
        : Promise.resolve([]),

      // 8. Low stock alerts — DB-filtered with product join (admin only)
      adminBusinessIds.length > 0
        ? prisma.stock.findMany({
            where: { businessId: { in: adminBusinessIds }, qtyOnHand: { lte: 10 } },
            include: { product: { select: { id: true, name: true, productPicture: true } } },
            take: 20,
          })
        : Promise.resolve([]),

      // 9. Recent order status updates — DB-filtered
      allBusinessIds.length > 0
        ? prisma.order.findMany({
            where: { businessId: { in: allBusinessIds }, status: { in: ['CANCELED', 'REJECTED', 'DONE', 'PENDING', 'ACCEPTED'] } },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, status: true, customerName: true, businessId: true, updatedAt: true, createdAt: true },
            take: 10,
          })
        : Promise.resolve([]),

      // 10. Subscription status — batch-fetch admin businesses
      adminBusinessIds.length > 0
        ? prisma.business.findMany({
            where: { id: { in: adminBusinessIds }, subscriptionTier: { not: 'FREE' }, currentPeriodEnd: { not: null } },
            select: { id: true, name: true, subscriptionTier: true, currentPeriodEnd: true },
          })
        : Promise.resolve([]),
    ]);

    // Extract results (use empty array if any section failed)
    const extract = (i) => results[i].status === 'fulfilled' ? results[i].value : [];

    // 1. Pending join requests
    for (const rr of extract(0)) {
      const isJoinRequest = !rr.currentRole || rr.currentRole === 'none';
      notifications.push({
        id: `req-${rr.id}`, type: 'staff_request',
        title: isJoinRequest ? 'Join request' : 'Role upgrade request',
        description: isJoinRequest
          ? `${rr.user?.name || 'Someone'} wants to join your company`
          : `${rr.user?.name || 'Someone'} is requesting admin access`,
        time: formatRelativeTime(rr.createdAt), timestamp: rr.createdAt, read: false,
        avatar: rr.user?.avatar || null, status: 'pending',
        requestData: { requestId: rr.id, userId: rr.userId, userName: rr.user?.name, userEmail: rr.user?.email, businessId: rr.businessId, currentRole: rr.currentRole },
      });
    }

    // 2. Recently approved requests
    for (const rr of extract(1)) {
      notifications.push({
        id: `join-accepted-${rr.id}`, type: 'join_accepted',
        title: 'Request accepted',
        description: `${rr.user?.name || 'Someone'} joined your company — assign their role`,
        time: formatRelativeTime(rr.resolvedAt), timestamp: rr.resolvedAt, read: false,
        avatar: rr.user?.avatar || null, status: 'accepted',
        requestData: { requestId: rr.id, userId: rr.userId, userName: rr.user?.name, userEmail: rr.user?.email, businessId: rr.businessId },
      });
    }

    // 3. Pending invites
    for (const inv of extract(2)) {
      notifications.push({
        id: `inv-${inv.id}`, type: 'invite_pending',
        title: 'Invite pending',
        description: `Invitation sent to ${inv.email || inv.user?.email || 'unknown'}`,
        time: formatRelativeTime(inv.createdAt), timestamp: inv.createdAt, read: false, avatar: null, status: 'pending',
        requestData: { inviteId: inv.id, email: inv.email || inv.user?.email, role: inv.role, businessId: inv.businessId },
      });
    }

    // 4. Business connection requests
    for (const conn of extract(3)) {
      const requester = conn.requesterBusiness;
      notifications.push({
        id: `biz-conn-req-${conn.id}`, type: 'company_request',
        title: 'Connection request',
        description: `${requester?.name || 'A company'} wants to connect with your business`,
        time: formatRelativeTime(conn.createdAt), timestamp: conn.createdAt, read: false,
        avatar: requester?.logoUrl || null, status: 'pending',
        requestData: { connectionId: conn.id, companyId: requester?.id, companyName: requester?.name, businessId: conn.targetBusinessId },
      });
    }

    // 5. Accepted business connections
    for (const conn of extract(4)) {
      const otherBiz = conn.requesterBusinessId === conn._sourceBizId ? conn.targetBusiness : conn.requesterBusiness;
      notifications.push({
        id: `biz-conn-accepted-${conn.id}`, type: 'connection_accepted',
        title: 'Connection accepted',
        description: `You are now connected with ${otherBiz?.name || 'a company'}`,
        time: formatRelativeTime(conn.createdAt), timestamp: conn.createdAt, read: false,
        avatar: otherBiz?.logoUrl || null,
        requestData: { connectionId: conn.id, companyId: otherBiz?.id, companyName: otherBiz?.name },
      });
    }

    // 6. Paid invoices
    for (const inv of extract(5)) {
      notifications.push({
        id: `inv-paid-${inv.id}`, type: 'invoice',
        title: 'Invoice payment received',
        description: `Payment of ${formatCurrency(inv.totalAmount)} received for invoice #${inv.id}`,
        time: formatRelativeTime(inv.updatedAt || inv.createdAt), timestamp: inv.updatedAt || inv.createdAt, read: false, avatar: null,
      });
    }

    // 7. Completed deliveries
    for (const del of extract(6)) {
      notifications.push({
        id: `del-completed-${del.id}`, type: 'delivery',
        title: 'Delivery completed',
        description: `Delivery #${del.id} to ${del.clientCompanyName || 'client'} completed`,
        time: formatRelativeTime(del.updatedAt || del.createdAt), timestamp: del.updatedAt || del.createdAt, read: false, avatar: null,
        requestData: { deliveryId: del.id, businessId: del.businessId },
      });
    }

    // 8. Low stock alerts (product data already joined via include)
    for (const stock of extract(7)) {
      if (!stock.product) continue;
      const stockTime = new Date(); // Stock model has no timestamps; use current time
      notifications.push({
        id: `stock-low-${stock.id}`, type: 'stock_alert',
        title: 'Low stock alert',
        description: `${stock.product.name} has only ${stock.qtyOnHand} units remaining`,
        time: 'now', timestamp: stockTime, read: false,
        avatar: stock.product.productPicture || null,
        productData: { productId: stock.product.id, productName: stock.product.name, currentStock: stock.qtyOnHand, locationId: stock.locationId },
      });
    }

    // 9. Recent order updates
    for (const order of extract(8)) {
      const statusLabel = { CANCELED: 'Canceled', REJECTED: 'Rejected', DONE: 'Completed', PENDING: 'Pending', ACCEPTED: 'Accepted' }[order.status] || order.status;
      notifications.push({
        id: `order-update-${order.id}`, type: 'order_update',
        title: `Order ${statusLabel.toLowerCase()}`,
        description: `Order #${order.id} is now ${statusLabel.toLowerCase()}${order.customerName ? ` — ${order.customerName}` : ''}`,
        time: formatRelativeTime(order.updatedAt || order.createdAt), timestamp: order.updatedAt || order.createdAt, read: false, avatar: null,
        requestData: { orderId: order.id, businessId: order.businessId },
      });
    }

    // 10. Subscription due/expired
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    for (const business of extract(9)) {
      const periodEnd = new Date(business.currentPeriodEnd);
      if (periodEnd < now) {
        notifications.push({
          id: `sub-expired-${business.id}`, type: 'subscription_due',
          title: 'Subscription expired',
          description: `Your ${business.subscriptionTier} subscription for ${business.name} has expired — renew to keep access`,
          time: formatRelativeTime(periodEnd), timestamp: periodEnd, read: false, avatar: null,
          requestData: { businessId: business.id, severity: 'critical' },
        });
      } else if (periodEnd <= sevenDaysFromNow) {
        notifications.push({
          id: `sub-due-${business.id}`, type: 'subscription_due',
          title: 'Subscription renewing soon',
          description: `Your ${business.subscriptionTier} subscription for ${business.name} renews on ${periodEnd.toLocaleDateString()}`,
          time: formatRelativeTime(periodEnd), timestamp: periodEnd, read: false, avatar: null,
          requestData: { businessId: business.id, severity: 'warning' },
        });
      }
    }
    } // end business mode

    // =========================================================================
    // PERSONAL MODE
    // =========================================================================
    if (mode === 'personal') {
      // 1. Company invites received by this user — invite_received
      try {
        const allMemberships = await repos.memberRepo.getByUserId(userId);
        const receivedInvites = allMemberships.filter(m => m.status === 'invited');
        for (const inv of receivedInvites) {
          const business = inv.business || await repos.businessRepo.getById(inv.businessId).catch(() => null);
          notifications.push({
            id: `invite-received-${inv.id}`,
            type: 'invite_received',
            title: 'Invitation to join a company',
            description: `${business?.name || 'A company'} invited you to join as ${inv.role || 'staff'}`,
            time: formatRelativeTime(inv.createdAt),
            timestamp: inv.createdAt,
            read: false,
            avatar: business?.logoUrl || null,
            status: 'pending',
            requestData: {
              inviteId: inv.id,
              businessId: inv.businessId,
              companyName: business?.name,
              role: inv.role,
            },
          });
        }
      } catch (err) {
        logger.error('Error fetching received invites for personal notifications:', err);
      }

      // 2. User's own join/role requests resolved — join_request_accepted / status_change
      try {
        const myRequests = await repos.roleRequestRepo.getByUserId(userId, ['APPROVED', 'REJECTED']);
        const recentRequests = myRequests.filter(
          rr => rr.resolvedAt && new Date(rr.resolvedAt) > THIRTY_DAYS_AGO
        );
        for (const rr of recentRequests) {
          const business = rr.business || await repos.businessRepo.getById(rr.businessId).catch(() => null);
          const isInitialJoin = !rr.currentRole || rr.currentRole === 'none';
          if (rr.status === 'APPROVED') {
            notifications.push({
              id: `my-req-approved-${rr.id}`,
              type: isInitialJoin ? 'join_request_accepted' : 'status_change',
              title: isInitialJoin ? 'Join request accepted' : 'Role updated',
              description: isInitialJoin
                ? `Your request to join ${business?.name || 'the company'} was accepted`
                : `Your role at ${business?.name || 'the company'} was changed to ${rr.requestedRole}`,
              time: formatRelativeTime(rr.resolvedAt),
              timestamp: rr.resolvedAt,
              read: false,
              avatar: business?.logoUrl || null,
              requestData: {
                requestId: rr.id,
                businessId: rr.businessId,
                companyName: business?.name,
                role: rr.requestedRole,
              },
            });
          } else {
            notifications.push({
              id: `my-req-rejected-${rr.id}`,
              type: isInitialJoin ? 'join_request_rejected' : 'status_change',
              title: isInitialJoin ? 'Join request declined' : 'Role request declined',
              description: isInitialJoin
                ? `Your request to join ${business?.name || 'the company'} was declined`
                : `Your role upgrade at ${business?.name || 'the company'} was declined`,
              time: formatRelativeTime(rr.resolvedAt),
              timestamp: rr.resolvedAt,
              read: false,
              avatar: business?.logoUrl || null,
              requestData: {
                requestId: rr.id,
                businessId: rr.businessId,
                companyName: business?.name,
              },
            });
          }
        }
      } catch (err) {
        logger.error('Error fetching user role requests for personal notifications:', err);
      }

      // 3. Deliveries assigned to this user — delivery_assigned
      try {
        const myAssignments = await repos.deliveryStaffRepo.getByUserId(userId);
        const recentAssignments = myAssignments
          .filter(a => a.assignedAt && new Date(a.assignedAt) > THIRTY_DAYS_AGO)
          .slice(0, 10);
        for (const assignment of recentAssignments) {
          const del = assignment.delivery;
          const biz = del?.business;
          notifications.push({
            id: `delivery-assigned-${assignment.deliveryId}`,
            type: 'delivery_assigned',
            title: 'New job assigned',
            description: `${biz?.name || 'Your company'} assigned you to delivery #${assignment.deliveryId}`,
            time: formatRelativeTime(assignment.assignedAt),
            timestamp: assignment.assignedAt,
            read: false,
            avatar: biz?.logoUrl || null,
            requestData: {
              deliveryId: assignment.deliveryId,
              businessId: del?.businessId,
              companyName: biz?.name,
            },
          });
        }
      } catch (err) {
        logger.error('Error fetching delivery assignments for personal notifications:', err);
      }

      // 4. Pending personal connection requests received — company_request
      try {
        const pendingConns = await repos.connectionRepo.listPending(userId);
        for (const conn of pendingConns) {
          const sender = conn.sender;
          notifications.push({
            id: `conn-req-${conn.id}`,
            type: 'company_request',
            title: 'Connection request',
            description: `${sender?.name || 'Someone'} wants to connect with you`,
            time: formatRelativeTime(conn.createdAt),
            timestamp: conn.createdAt,
            read: false,
            avatar: sender?.avatar || null,
            status: 'pending',
            requestData: {
              connectionId: conn.id,
              userId: sender?.id,
              userName: sender?.name,
            },
          });
        }
      } catch (err) {
        logger.error('Error fetching connection requests for personal notifications:', err);
      }

      // 5. Recently accepted personal connections — connection_accepted
      try {
        const acceptedConns = await repos.connectionRepo.listByUserId(userId, 'accepted');
        const recentAccepted = acceptedConns
          .filter(c => c.createdAt && new Date(c.createdAt) > THIRTY_DAYS_AGO)
          .slice(0, 5);
        for (const conn of recentAccepted) {
          const otherUser = conn.senderId === userId ? conn.receiver : conn.sender;
          notifications.push({
            id: `conn-accepted-${conn.id}`,
            type: 'connection_accepted',
            title: 'Connection accepted',
            description: `You are now connected with ${otherUser?.name || 'someone'}`,
            time: formatRelativeTime(conn.createdAt),
            timestamp: conn.createdAt,
            read: false,
            avatar: otherUser?.avatar || null,
            requestData: {
              connectionId: conn.id,
              userId: otherUser?.id,
              userName: otherUser?.name,
            },
          });
        }
      } catch (err) {
        logger.error('Error fetching accepted connections for personal notifications:', err);
      }
    } // end personal mode

    // Deduplicate by id (a user admin of multiple businesses could get the same notification twice)
    const _seenIds = new Set();
    notifications = notifications.filter(n => {
      if (_seenIds.has(n.id)) return false;
      _seenIds.add(n.id);
      return true;
    });

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
      readAt: readAtMap[n.id] || null,
    }));

    // Apply filters
    if (filter === 'unread') {
      notifications = notifications.filter(n => !n.read);
    } else if (filter === 'requests') {
      notifications = notifications.filter(n =>
        mode === 'personal'
          ? ['invite_received', 'company_request', 'join_request_accepted', 'join_request_rejected'].includes(n.type)
          : ['staff_request', 'join_accepted', 'company_request', 'invite_pending'].includes(n.type)
      );
    } else if (filter === 'deliveries') {
      notifications = notifications.filter(n =>
        n.type === 'delivery' ||
        n.type === 'delivery_assigned' ||
        (mode === 'business' && n.type === 'stock_alert')
      );
    } else if (filter === 'invoices') {
      notifications = notifications.filter(n => n.type === 'invoice');
    } else if (filter === 'orders') {
      notifications = notifications.filter(n =>
        n.type === 'order_update' ||
        (mode === 'business' && n.type === 'subscription_due')
      );
    } else if (filter === 'connections') {
      notifications = notifications.filter(n =>
        n.type === 'company_request' || n.type === 'connection_accepted'
      );
    } else if (filter === 'jobs') {
      notifications = notifications.filter(n =>
        n.type === 'delivery_assigned' ||
        (mode === 'personal' && n.type === 'status_change')
      );
    }

    return res.json(successResponse({ notifications }));
  } catch (err) {
    logger.error('Error fetching notifications:', err);
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
    logger.error('Error marking notification as read:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', err.message || 'Failed to mark notification as read'));
  }
});

// ==================== PUSH TOKENS & NOTIFICATION PREFERENCES ====================

// Register push token
app.post('/api/push-tokens/register', requireAuth, async (req, res) => {
  try {
    const { token, platform, deviceId } = req.body;
    if (!token || !platform) {
      return res.status(400).json(errorResponse('VALIDATION', 'token and platform are required'));
    }
    const record = await repos.pushTokenRepo.upsert(req.user.id, token, platform, deviceId || null);
    return res.json(successResponse(record, 'Push token registered'));
  } catch (err) {
    logger.error('[PushToken] Register error:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', 'Failed to register push token'));
  }
});

// Unregister push token
app.delete('/api/push-tokens/unregister', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json(errorResponse('VALIDATION', 'token is required'));
    }
    await repos.pushTokenRepo.deactivate(req.user.id, token);
    return res.json(successResponse(null, 'Push token unregistered'));
  } catch (err) {
    logger.error('[PushToken] Unregister error:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', 'Failed to unregister push token'));
  }
});

// Get notification preferences
app.get('/api/notification-preferences', requireAuth, async (req, res) => {
  try {
    let prefs = await repos.notificationPreferenceRepo.getByUserId(req.user.id);
    if (!prefs) {
      // Return defaults
      prefs = { messages: true, deliveries: true, invoices: true, orders: true, team: true, system: true };
    }
    return res.json(successResponse(prefs));
  } catch (err) {
    logger.error('[NotifPrefs] Get error:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', 'Failed to get notification preferences'));
  }
});

// Update notification preferences
app.patch('/api/notification-preferences', requireAuth, async (req, res) => {
  try {
    const allowed = ['messages', 'deliveries', 'invoices', 'orders', 'team', 'system'];
    const updates = {};
    for (const key of allowed) {
      if (typeof req.body[key] === 'boolean') {
        updates[key] = req.body[key];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json(errorResponse('VALIDATION', 'No valid preferences to update'));
    }
    const prefs = await repos.notificationPreferenceRepo.upsert(req.user.id, updates);
    return res.json(successResponse(prefs, 'Preferences updated'));
  } catch (err) {
    logger.error('[NotifPrefs] Update error:', err);
    return res.status(500).json(errorResponse('SERVER_ERROR', 'Failed to update notification preferences'));
  }
});

// Public product catalog (scope/visibility filter)
// GET /api/products?scope=public&companyId=...&brand=...&category=...
// GET /api/products?visibility=public (also supported for compatibility)
app.get('/api/products', async (req, res) => {
  try {
    const { scope, visibility, companyId, brand, category } = req.query;
    // SECURITY: Public endpoint — do not trust viewerBusinessId from query params
    const viewerBusinessId = null;
    let catalog = await repos.productRepo.list();

    // "public catalog" — only listed products visible to others
    if (scope === 'public' || visibility === 'public') {
      catalog = catalog.filter(p =>
        p.isListed === true || p.is_listed === true || p.isDisplayable === true || p.isPublic === true
      );

      // ENTITLEMENT (P2 #10): publishing products on the public feed is a
      // Business+ capability (canPublishProductsOnFeed). Hide products owned by
      // businesses without it so FREE/PRO catalogs don't leak into the public
      // Explore feed or the cross-business product search.
      const ownerIds = [...new Set(
        catalog.map(p => p.companyId || p.businessId || p.ownerBusinessId).filter(Boolean)
      )];
      if (ownerIds.length > 0) {
        const owners = await prisma.business.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, subscriptionTier: true, currentPeriodEnd: true },
        });
        const allowedOwnerIds = new Set(
          owners.filter(b => deriveCapabilities(b).canPublishProductsOnFeed).map(b => b.id)
        );
        catalog = catalog.filter(p =>
          allowedOwnerIds.has(p.companyId || p.businessId || p.ownerBusinessId)
        );
      }
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

    // Apply price privacy: hide prices for businesses with pricePrivacyEnabled
    catalog = await applyPricePrivacyBatch(catalog, viewerBusinessId || null);

    return res.json(successResponse(catalog.map(withProductVisibility)));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get single product by ID (public view)
/**
 * Compute the viewer business's own relationship to a product they don't own:
 * whether they've ordered it before (→ the "client-stocked" product-detail view)
 * plus their own stock and last-ordered stats. Returns null when there's no
 * relationship. Reveals only the viewer's OWN data, so it's safe once the caller
 * has validated business membership.
 *
 * NOTE: store-listing management (isListed / clientProductId) needs a client-side
 * product copy, which doesn't exist in the data model yet — left undefined for a
 * future increment. See ~/.claude/plans/rework-on-the-product-wondrous-frost.md.
 */
async function computeViewerStock(productId, viewerBusinessId) {
  if (!viewerBusinessId) return null;

  // The viewer's own "carried" copy of this product (if they added it to their
  // store). The copy is a normal product they own → its stock + listing are theirs.
  let clientProductId;
  let isListed;
  let copyStock;
  try {
    const copy = await repos.productRepo.getCarriedCopy(viewerBusinessId, productId);
    if (copy) {
      clientProductId = copy.id;
      isListed = copy.isListed ?? false;
      copyStock = copy.stockQuantity ?? undefined;
    }
  } catch (e) {
    logger.warn('[viewerStock] carried-copy lookup failed:', e?.message || e);
  }

  // Stock left: prefer the carried copy's own stock; otherwise sum the viewer's
  // Stock rows for this product across their locations.
  let stockQuantity = copyStock;
  if (stockQuantity == null) {
    try {
      const stockRows = (await repos.stockRepo.getByBusinessId(viewerBusinessId)) || [];
      const mine = stockRows.filter((s) => s.productId === productId);
      if (mine.length > 0) {
        stockQuantity = mine.reduce((sum, s) => sum + (s.qtyOnHand || 0), 0);
      }
    } catch (e) {
      logger.warn('[viewerStock] stock lookup failed:', e?.message || e);
    }
  }

  // Has the viewer's business ordered this product before? Scan recent orders'
  // denormalized items (order items are stored as JSON, not a relational table).
  let alreadyOrdered = false;
  let totalOrdered = 0;
  let lastOrderedAt;
  try {
    const orders = (await repos.orderRepo.getByBuyerBusinessId(viewerBusinessId, { limit: 200 })) || [];
    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];
      const match = items.find((it) => (it?.productId || it?.product_id) === productId);
      if (!match) continue;
      alreadyOrdered = true;
      totalOrdered += Number(match.quantity) || 0;
      if (!lastOrderedAt && order.createdAt) lastOrderedAt = order.createdAt;
    }
  } catch (e) {
    logger.warn('[viewerStock] order history lookup failed:', e?.message || e);
  }

  const alreadyStocked = alreadyOrdered || !!clientProductId || (stockQuantity != null && stockQuantity > 0);
  if (!alreadyStocked) return null;

  return {
    alreadyStocked: true,
    stockQuantity,
    lastOrderedAt: lastOrderedAt || undefined,
    totalOrdered: totalOrdered || undefined,
    isListed,
    clientProductId,
  };
}

app.get('/api/products/:productId', optionalAuth, async (req, res) => {
  const { productId } = req.params;
  // SECURITY: never trust viewerBusinessId from the query for PRICE privacy —
  // price visibility stays public/default on this endpoint.
  const viewerBusinessId = null;

  try {
    let foundProduct = null;

    // First check in database via Prisma repo
    const dbProduct = await repos.productRepo.getById(productId);
    if (dbProduct) {
      foundProduct = withProductVisibility(dbProduct);
    }

    if (!foundProduct) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    // Apply price privacy
    const result = await applyPricePrivacy(foundProduct, viewerBusinessId || null);

    // Viewer relationship: attach `viewerStock` only for an AUTHENTICATED member
    // of the claimed business who is NOT the product's owner. Membership is
    // validated, and the payload contains only the viewer's own data — safe.
    const claimedBizId = req.query.viewerBusinessId;
    if (
      claimedBizId &&
      req.user?.id &&
      claimedBizId !== foundProduct.businessId &&
      (await isBusinessMember(claimedBizId, req.user.id))
    ) {
      const viewerStock = await computeViewerStock(productId, claimedBizId);
      if (viewerStock) result.viewerStock = viewerStock;
    }

    return res.json(successResponse(result));
  } catch (e) {
    logger.error('Error fetching product:', e);
    res.status(500).json(errorResponse('Failed to load product'));
  }
});

// Report a product (content moderation). Persists a Report row for review.
const PRODUCT_REPORT_REASONS = ['inappropriate', 'counterfeit', 'wrong_info', 'spam', 'other'];
app.post('/api/products/:productId/report', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { reason, details, reportedByBusinessId } = req.body || {};

    if (!reason || !PRODUCT_REPORT_REASONS.includes(reason)) {
      return res.status(400).json(errorResponse('A valid reason is required'));
    }

    const product = await repos.productRepo.getById(productId);
    if (!product) {
      return res.status(404).json(errorResponse('Product not found'));
    }

    const report = await prisma.report.create({
      data: {
        id: uuidv4(),
        targetType: 'product',
        targetId: productId,
        reason,
        details: details ? String(details).slice(0, 1000) : null,
        reportedByUserId: req.user?.id || null,
        reportedByBusinessId: reportedByBusinessId || null,
        status: 'open',
      },
    });

    logger.info('[report] product reported', { productId, reason, by: req.user?.id });
    res.status(201).json(successResponse({ id: report.id }));
  } catch (e) {
    logger.error('Error reporting product:', e);
    res.status(500).json(errorResponse('Failed to submit report'));
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
app.get('/api/public/locations/:locationId', async (req, res) => {
  try {
    const location = await prisma.location.findUnique({ where: { id: req.params.locationId } });
    if (!location) {
      return res.status(404).json(errorResponse('Location not found'));
    }

    const business = await prisma.business.findUnique({ where: { id: location.businessId } });
    if (!business) {
      return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    }

    if (!isLocationPublicEffective(business, location)) {
      if (location.operatingMode === LOCATION_MODES.INDEPENDENT && location.isPublic) {
        return res.status(403).json(paywallResponse('This location\'s public storefront requires an Enterprise subscription.', 'independent_locations', 'enterprise'));
      }
      return res.status(404).json(errorResponse('This location does not have a public storefront'));
    }

    res.json(successResponse({
      id: location.id,
      name: location.name,
      address: location.address,
      phone: location.phone,
      email: location.email,
      business: { id: business.id, name: business.name, logoUrl: business.logoUrl }
    }));
  } catch (err) {
    return sendError(res, err);
  }
});

// Get products for public storefront - no auth required
app.get('/api/public/locations/:locationId/products', async (req, res) => {
  try {
    // SECURITY: Public endpoint — do not trust viewerBusinessId from query params
    const viewerBusinessId = null;
    const location = await prisma.location.findUnique({ where: { id: req.params.locationId } });
    if (!location) {
      return res.status(404).json(errorResponse('Location not found'));
    }

    const business = await prisma.business.findUnique({ where: { id: location.businessId } });
    if (!business) {
      return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    }

    if (!isLocationPublicEffective(business, location)) {
      if (location.operatingMode === LOCATION_MODES.INDEPENDENT && location.isPublic) {
        return res.status(403).json(paywallResponse('This location\'s public storefront requires an Enterprise subscription.', 'independent_locations', 'enterprise'));
      }
      return res.status(404).json(errorResponse('This location does not have a public storefront'));
    }

    let listedProducts = await prisma.product.findMany({
      where: { businessId: location.businessId, isListed: true },
    });

    listedProducts = await applyPricePrivacyBatch(listedProducts, viewerBusinessId || null);
    res.json(successResponse(listedProducts.map(withProductVisibility)));
  } catch (err) {
    return sendError(res, err);
  }
});

// Create an order from a business's public storefront (no auth — a guest /
// personal-mode customer ordering from a publicly visible location).
// Body: { customerName, customerPhone, customerAddress?, items: [{ productId, quantity }], notes? }
app.post('/api/public/locations/:locationId/orders', async (req, res) => {
  try {
    const location = await prisma.location.findUnique({ where: { id: req.params.locationId } });
    if (!location) {
      return res.status(404).json(errorResponse('Location not found'));
    }

    const business = await prisma.business.findUnique({ where: { id: location.businessId } });
    if (!business) {
      return res.status(404).json(errorResponse('Business not found', 'NOT_FOUND'));
    }

    if (!isLocationPublicEffective(business, location)) {
      if (location.operatingMode === LOCATION_MODES.INDEPENDENT && location.isPublic) {
        return res.status(403).json(paywallResponse('This location\'s public storefront requires an Enterprise subscription.', 'independent_locations', 'enterprise'));
      }
      return res.status(404).json(errorResponse('This location does not accept public orders'));
    }

    const { customerName, customerPhone, customerAddress, items: rawItems, notes } = req.body || {};

    // Guest-contact validation (no account, so we need a way to reach them).
    if (!customerName || !String(customerName).trim()) {
      return res.status(400).json(errorResponse('customerName is required'));
    }
    if (!customerPhone || !String(customerPhone).trim()) {
      return res.status(400).json(errorResponse('customerPhone is required'));
    }
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json(errorResponse('At least one order item is required'));
    }

    // SECURITY: never trust client-supplied prices. Load each product, confirm
    // it belongs to this location's business and is publicly listed, then
    // compute unit prices and totals from the database. A guest has no buyer
    // business, so only the seller's DEFAULT price list (if any) applies; with no
    // default list this is identical to plain base pricing.
    const defaultList = await resolvePriceListForBuyer(location.businessId, null);
    const orderItems = [];
    let totalAmount = 0;
    for (const item of rawItems) {
      const productId = item?.productId;
      const quantity = Number(item?.quantity);
      if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json(errorResponse('Each item needs a valid productId and a quantity greater than 0'));
      }
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product || product.businessId !== location.businessId || !product.isListed) {
        return res.status(400).json(errorResponse(`Product not available: ${productId}`, 'INVALID_PRODUCT'));
      }
      const { unitPrice } = applyPriceList(defaultList, product, quantity, { unit: item?.unit });
      const subtotal = Math.round(unitPrice * quantity * 100) / 100;
      totalAmount += subtotal;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        subtotal,
      });
    }
    totalAmount = Math.round(totalAmount * 100) / 100;

    const newOrder = {
      id: 'ORD-' + uuidv4().slice(0, 8).toUpperCase(),
      businessId: location.businessId,
      soldByScope: ORDER_SCOPE_FROM_STORE.LOCATION,
      soldByLocationId: location.id,
      fulfillmentLocationId: location.id,
      customerId: null,
      customerName: String(customerName).trim(),
      customerAddress: customerAddress ? String(customerAddress).trim() : null,
      customerPhone: String(customerPhone).trim(),
      buyerBusinessId: null,
      buyerBusinessName: null,
      createdBy: null,
      items: orderItems,
      totalAmount,
      // Public orders always start NEW so the seller explicitly accepts them.
      status: ORDER_STATUS_FROM_STORE.NEW,
      paymentStatus: 'UNPAID',
      notes: notes ? String(notes) : null,
    };

    const created = await repos.orderRepo.create(newOrder);

    // Notify the seller (non-blocking).
    try {
      await eventMessages.createEventMessage({
        type: 'order_event',
        fromBusinessId: created.businessId,
        toBusinessId: null,
        entityId: created.id,
        actorId: null,
        actorName: created.customerName || 'Customer',
        metadata: {
          status: created.status,
          orderNumber: created.id,
          customerName: created.customerName,
          totalAmount: created.totalAmount,
          locationId: location.id,
          source: 'public_storefront',
        },
      });
    } catch (msgErr) {
      logger.error('Failed to create public order event message:', msgErr);
    }

    res.status(201).json(successResponse(created, 'Order placed successfully'));
  } catch (err) {
    return sendError(res, err);
  }
});

// ============================================================================
// AUTOMATION ENDPOINTS
// ============================================================================
// These endpoints can be called by cron services (e.g., Render cron jobs)
// They require an API key for security

// requireAutomationAuth() + AUTOMATION_API_KEY
// → moved to src/middleware/automationAuth.js (imported at top of file).

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
    logger.error('Error running order automation:', err);
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
    logger.error('Error previewing order automation:', err);
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

// ============================================================================
// DEVICE TOKENS & PUSH NOTIFICATIONS
// ============================================================================

// Register device token
app.post('/api/users/:userId/device-tokens', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { token, platform } = req.body;

    if (req.user?.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }
    if (!token || !platform) {
      return res.status(400).json(errorResponse('Token and platform are required'));
    }

    // Upsert: create or update
    const deviceToken = await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, updatedAt: new Date() },
      create: { userId, token, platform },
    });

    res.json(successResponse(deviceToken));
  } catch (e) {
    logger.error('Error registering device token:', e);
    res.status(500).json(errorResponse('Failed to register device token'));
  }
});

// Unregister device token
app.delete('/api/users/:userId/device-tokens/:token', requireAuth, async (req, res) => {
  try {
    const { userId, token } = req.params;

    if (req.user?.id !== userId) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    await prisma.deviceToken.deleteMany({
      where: { userId, token: decodeURIComponent(token) },
    });

    res.json(successResponse({ deleted: true }));
  } catch (e) {
    logger.error('Error unregistering device token:', e);
    res.status(500).json(errorResponse('Failed to unregister device token'));
  }
});

/**
 * Send push notifications to chat participants who are NOT currently connected via socket.
 * Called after a new message is emitted via socket.
 */
async function sendPushToOfflineParticipants(chatId, senderName, messagePreview, excludeSenderId) {
  try {
    const chat = await repos.chatRepo.getById(chatId);
    if (!chat) return;

    const participantIds = (Array.isArray(chat.participants) ? chat.participants : [])
      .filter(pid => pid !== excludeSenderId);

    if (participantIds.length === 0) return;

    // Find which participants have active socket connections
    const connectedUserIds = new Set();
    const sockets = await io.fetchSockets();
    for (const s of sockets) {
      if (s.userId) connectedUserIds.add(s.userId);
    }

    // Get tokens for offline participants only
    const offlineParticipantIds = participantIds.filter(pid => !connectedUserIds.has(pid));
    if (offlineParticipantIds.length === 0) return;

    const tokens = await prisma.deviceToken.findMany({
      where: { userId: { in: offlineParticipantIds } },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    // Build push messages
    const messages = [];
    for (const { token } of tokens) {
      if (!Expo.isExpoPushToken(token)) continue;
      messages.push({
        to: token,
        sound: 'default',
        title: senderName || 'New message',
        body: messagePreview || 'You have a new message',
        data: { chatId, chatName: chat.name || senderName },
      });
    }

    if (messages.length === 0) return;

    // Send in chunks
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        logger.error('[Push] Error sending chunk:', err);
      }
    }
  } catch (err) {
    logger.error('[Push] Error in sendPushToOfflineParticipants:', err);
  }
}

// ============================================================================
// PAYMENT ROUTES (Peach Payments)
// ============================================================================

const peachPayments = require('./src/services/peachPayments');

// Subscription plan pricing (MUR) - must match frontend subscription.ts
const PLAN_PRICES = {
  MONTHLY: { PRO: 899, BUSINESS: 2699, ENTERPRISE: 4399 },
  YEARLY: { PRO: 9588, BUSINESS: 28788, ENTERPRISE: 46788 },
};

// Create checkout session for subscription payment
app.post('/api/payments/create-checkout', requireAuth, async (req, res) => {
  try {
    const { businessId, plan, billingPeriod } = req.body;
    if (!businessId || !plan || !billingPeriod) {
      return res.status(400).json(errorResponse('businessId, plan, and billingPeriod are required'));
    }

    // Validate plan and period
    const planUpper = plan.toUpperCase();
    const periodUpper = billingPeriod.toUpperCase();
    if (!PLAN_PRICES[periodUpper] || !PLAN_PRICES[periodUpper][planUpper]) {
      return res.status(400).json(errorResponse('Invalid plan or billing period'));
    }

    // Verify business admin
    if (!(await requireBusinessAdmin(req, res, businessId))) return;

    const amount = PLAN_PRICES[periodUpper][planUpper];
    const orderId = `sub-${businessId}-${Date.now()}`;

    // Create Peach checkout with card tokenization enabled
    const { checkoutId } = await peachPayments.createCheckout({
      amount,
      currency: 'MUR',
      orderId,
      tokenizeCard: true,
    });

    // Create pending payment record
    const payment = await prisma.payment.create({
      data: {
        businessId,
        type: 'SUBSCRIPTION',
        amount,
        currency: 'MUR',
        status: 'PENDING',
        peachCheckoutId: checkoutId,
        description: `${planUpper} plan - ${periodUpper.toLowerCase()}`,
        metadata: { plan: planUpper, billingPeriod: periodUpper, orderId },
      },
    });

    // Generate checkout page URL (served by our backend)
    const checkoutUrl = `${req.protocol}://${req.get('host')}/api/payments/checkout-page/${checkoutId}`;

    res.json(successResponse({ checkoutId, checkoutUrl, paymentId: payment.id }));
  } catch (err) {
    logger.error('[CreateCheckout] Error:', err);
    res.status(500).json(errorResponse('Failed to create checkout'));
  }
});

// Serve the checkout HTML page for WebView rendering
app.get('/api/payments/checkout-page/:checkoutId', (req, res) => {
  const html = peachPayments.generateCheckoutHtml(req.params.checkoutId);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Poll checkout result (backup to webhook)
app.get('/api/payments/checkout-result/:checkoutId', requireAuth, async (req, res) => {
  try {
    const { checkoutId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { peachCheckoutId: checkoutId },
    });
    if (!payment) {
      return res.status(404).json(errorResponse('Payment not found'));
    }

    // If already processed, return stored status
    if (payment.status !== 'PENDING') {
      return res.json(successResponse({ status: payment.status, paymentId: payment.id }));
    }

    // Query Peach for the result
    const result = await peachPayments.getCheckoutResult(checkoutId);
    const resultCode = result.result?.code;

    if (peachPayments.isSuccessResult(resultCode)) {
      // Update payment + subscription
      await processSuccessfulPayment(payment, result);
      return res.json(successResponse({ status: 'SUCCEEDED', paymentId: payment.id }));
    } else if (peachPayments.isPendingResult(resultCode)) {
      return res.json(successResponse({ status: 'PROCESSING', paymentId: payment.id }));
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', peachTransactionId: result.id },
      });
      return res.json(successResponse({ status: 'FAILED', paymentId: payment.id }));
    }
  } catch (err) {
    logger.error('[CheckoutResult] Error:', err);
    res.status(500).json(errorResponse('Failed to get checkout result'));
  }
});

// Peach Payments webhook handler
app.post('/api/webhooks/peach', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    logger.debug('[PeachWebhook] Received:', event.type || 'unknown', event.id || '');

    const checkoutId = event.payload?.checkoutId || event.checkoutId;
    if (!checkoutId) {
      return res.status(200).json({ received: true });
    }

    const payment = await prisma.payment.findUnique({
      where: { peachCheckoutId: checkoutId },
    });
    if (!payment) {
      logger.warn('[PeachWebhook] No payment found for checkoutId:', checkoutId);
      return res.status(200).json({ received: true });
    }

    // Skip if already processed
    if (payment.status === 'SUCCEEDED' || payment.status === 'FAILED') {
      return res.status(200).json({ received: true });
    }

    const resultCode = event.payload?.result?.code || event.result?.code;

    if (peachPayments.isSuccessResult(resultCode)) {
      await processSuccessfulPayment(payment, event.payload || event);
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          peachTransactionId: event.payload?.id || event.id,
        },
      });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('[PeachWebhook] Error:', err);
    res.status(200).json({ received: true }); // Always 200 to avoid retries
  }
});

// Helper: Process a successful payment (update subscription, store card token)
async function processSuccessfulPayment(payment, peachResult) {
  const registrationId = peachResult.registrationId;
  const transactionId = peachResult.id;
  const metadata = payment.metadata || {};

  // Update payment record
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'SUCCEEDED',
      peachTransactionId: transactionId,
    },
  });

  // If this is a subscription payment, update the business
  if (payment.type === 'SUBSCRIPTION' && metadata.plan) {
    const periodDays = metadata.billingPeriod === 'YEARLY' ? 365 : 30;
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + periodDays);

    const updateData = {
      subscriptionTier: metadata.plan,
      billingPeriod: metadata.billingPeriod || 'MONTHLY',
      currentPeriodEnd,
    };

    // Store card token for recurring billing if available
    if (registrationId) {
      updateData.peachCardRegistrationId = registrationId;
    }

    await prisma.business.update({
      where: { id: payment.businessId },
      data: updateData,
    });

    logger.debug(`[Payment] Subscription activated: ${payment.businessId} → ${metadata.plan} (${metadata.billingPeriod})`);
  }

  // If this is an invoice payment, update the invoice
  if (payment.type === 'INVOICE_PAYMENT' && payment.invoiceId) {
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        status: 'PAID',
        paidAmount: payment.amount,
      },
    });
    logger.debug(`[Payment] Invoice paid: ${payment.invoiceId}`);
  }
}

// Get payment history for a business
app.get('/api/businesses/:businessId/payments', requireAuth, async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!(await requireBusinessMembership(req, res, businessId))) return;

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type; // optional filter: SUBSCRIPTION or INVOICE_PAYMENT

    const where = { businessId };
    if (type) where.type = type;

    const [payments, count] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json(successResponse({ payments, total: count, hasMore: offset + limit < count }));
  } catch (err) {
    logger.error('[PaymentHistory] Error:', err);
    res.status(500).json(errorResponse('Failed to get payment history'));
  }
});

// Get subscription status for a business
app.get('/api/businesses/:businessId/subscription-status', requireAuth, async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!(await requireBusinessMembership(req, res, businessId))) return;

    const business = await repos.businessRepo.getById(businessId);
    if (!business) {
      return res.status(404).json(errorResponse('Business not found'));
    }

    const capabilities = deriveCapabilities(business);

    res.json(successResponse({
      plan: business.subscriptionTier,
      billingPeriod: business.billingPeriod,
      currentPeriodEnd: business.currentPeriodEnd,
      hasStoredCard: !!business.peachCardRegistrationId,
      capabilities,
    }));
  } catch (err) {
    logger.error('[SubscriptionStatus] Error:', err);
    res.status(500).json(errorResponse('Failed to get subscription status'));
  }
});

// Create checkout for paying a NouPro invoice
app.post('/api/payments/invoice-checkout', requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.status(400).json(errorResponse('invoiceId is required'));
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      return res.status(404).json(errorResponse('Invoice not found'));
    }
    if (invoice.status === 'PAID') {
      return res.status(400).json(errorResponse('Invoice is already paid'));
    }

    const amount = invoice.totalAmount || invoice.amount || 0;
    if (amount <= 0) {
      return res.status(400).json(errorResponse('Invoice has no payable amount'));
    }

    const orderId = `inv-${invoiceId}-${Date.now()}`;
    const { checkoutId } = await peachPayments.createCheckout({
      amount,
      currency: invoice.currency || 'MUR',
      orderId,
    });

    const payment = await prisma.payment.create({
      data: {
        businessId: invoice.businessId,
        invoiceId: invoice.id,
        type: 'INVOICE_PAYMENT',
        amount,
        currency: invoice.currency || 'MUR',
        status: 'PENDING',
        peachCheckoutId: checkoutId,
        description: `Payment for invoice ${invoice.invoiceNumber || invoiceId}`,
        metadata: { invoiceId, orderId },
      },
    });

    const checkoutUrl = `${req.protocol}://${req.get('host')}/api/payments/checkout-page/${checkoutId}`;

    res.json(successResponse({ checkoutId, checkoutUrl, paymentId: payment.id }));
  } catch (err) {
    logger.error('[InvoiceCheckout] Error:', err);
    res.status(500).json(errorResponse('Failed to create invoice checkout'));
  }
});

// ============================================================================
// GLOBAL ERROR HANDLER — must be the LAST middleware. Reports unhandled
// errors to Sentry (if configured) and returns a safe 500.
// ============================================================================
app.use((err, req, res, next) => {
  // CORS rejections are expected/benign — don't spam Sentry with them.
  const isCors = typeof err?.message === 'string' && err.message.startsWith('CORS_');
  if (process.env.SENTRY_DSN && !isCors) {
    Sentry.captureException(err);
  }
  logger.error('[UnhandledError]', err);
  if (res.headersSent) return next(err);
  res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
});

// Start server (using HTTP server for Socket.IO support)
// Recurring-schedule runner: mint due deliveries/transfers hourly.
// (Single-instance friendly; for multi-instance, move to a dedicated cron worker.)
if (process.env.NODE_ENV !== 'test') {
  const RECURRING_INTERVAL_MS = 60 * 60 * 1000; // hourly
  setInterval(() => {
    recurringService.runDue().catch((err) => logger.error('[recurring] runDue failed:', err.message));
  }, RECURRING_INTERVAL_MS);
}

server.listen(PORT, HOST, () => {
  const lanIP = getNetworkIP();
  logger.debug('');
  logger.debug('🚀 NouPro Backend Server Started (Locations + Modes MVP)');
  logger.debug('=========================================================');
  logger.debug(`📍 Local:   http://localhost:${PORT}`);
  logger.debug(`📍 Network: http://${lanIP}:${PORT}`);
  logger.debug('');
  logger.debug(`🏥 Health:  http://localhost:${PORT}/api/health`);
  logger.debug(`📊 Data source: PRISMA (PostgreSQL)`);
  logger.debug(`🔌 Socket.IO: Enabled (real-time messaging)`);
  logger.debug('');
  logger.debug('📱 For physical device testing, use:');
  logger.debug(`   EXPO_PUBLIC_API_URL=http://${lanIP}:${PORT}/api`);
  logger.debug('');
  logger.debug('🏢 Subscription Tiers:');
  logger.debug('   FREE     - 1 location, DEPENDENT only, no orders/invoices');
  logger.debug('   PRO      - 3 locations, DEPENDENT only, orders/invoices enabled');
  logger.debug('   BUSINESS - Unlimited, INDEPENDENT allowed, full features');
  logger.debug('');
  logger.debug('📍 Location Modes:');
  logger.debug('   DEPENDENT   - Fulfills parent orders only');
  logger.debug('   INDEPENDENT - Own orders, invoices, public page (BUSINESS tier only)');
  logger.debug('');
  logger.debug('Available endpoints:');
  logger.debug('');
  logger.debug('  Auth:');
  logger.debug('    POST /api/auth/login');
  logger.debug('');
  logger.debug('  Business (with capabilities):');
  logger.debug('    GET  /api/businesses');
  logger.debug('    GET  /api/companies/:companyId');
  logger.debug('    PATCH /api/companies/:companyId');
  logger.debug('');
  logger.debug('  Locations (with mode enforcement):');
  logger.debug('    GET  /api/companies/:companyId/locations');
  logger.debug('    POST /api/companies/:companyId/locations');
  logger.debug('    GET  /api/locations/:locationId');
  logger.debug('    PATCH /api/locations/:locationId');
  logger.debug('');
  logger.debug('  Orders (scope: PARENT vs LOCATION):');
  logger.debug('    GET  /api/companies/:companyId/orders');
  logger.debug('    POST /api/companies/:companyId/orders (Parent)');
  logger.debug('    POST /api/companies/:companyId/orders/:orderId/assign');
  logger.debug('    GET  /api/locations/:locationId/orders');
  logger.debug('    POST /api/locations/:locationId/orders (Independent only)');
  logger.debug('');
  logger.debug('  Invoices (scope: PARENT vs LOCATION):');
  logger.debug('    GET  /api/companies/:companyId/invoices');
  logger.debug('    POST /api/companies/:companyId/invoices (Parent)');
  logger.debug('    GET  /api/locations/:locationId/invoices');
  logger.debug('    POST /api/locations/:locationId/invoices (Independent only)');
  logger.debug('');
  logger.debug('  Stock:');
  logger.debug('    GET  /api/companies/:companyId/stock');
  logger.debug('    GET  /api/locations/:locationId/stock');
  logger.debug('    PATCH /api/locations/:locationId/stock/:productId');
  logger.debug('');
  logger.debug('  Membership:');
  logger.debug('    GET  /api/companies/:companyId/members');
  logger.debug('    GET  /api/locations/:locationId/members');
  logger.debug('    GET  /api/users/:userId/businesses');
  logger.debug('    GET  /api/users/:userId/locations');
  logger.debug('');
  logger.debug('  Legacy (backwards compatible):');
  logger.debug('    GET  /api/companies');
  logger.debug('    GET  /api/companies/:companyId/products');
  logger.debug('    GET  /api/companies/:companyId/deliveries');
  logger.debug('    GET  /api/companies/:companyId/invoices');
  logger.debug('    GET  /api/companies/:companyId/chats');
  logger.debug('');
  logger.debug('  Public Storefront (no auth required):');
  logger.debug('    GET  /api/public/locations/:locationId');
  logger.debug('    GET  /api/public/locations/:locationId/products');
  logger.debug('    POST /api/public/locations/:locationId/orders');
  logger.debug('');
  logger.debug('  Other:');
  logger.debug('    GET  /api/feed');
  logger.debug('    POST /api/upload');
  logger.debug('    GET  /api/health');
}); 