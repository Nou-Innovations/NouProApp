const logger = require('../utils/logger');
/**
 * Order Automation Service
 * 
 * Handles automated order status changes based on business rules:
 * - Auto-cancel NEW orders after inactivity
 * - Flag stuck PENDING orders
 * - Optional: Auto-move DONE to IN_REVIEW
 * 
 * This can be run as a cron job (every 15-60 minutes)
 * 
 * IMPORTANT: This service uses ORDER_STATUS_META from orderStatus.js
 * to make status-aware decisions. All automation rules respect the
 * single source of truth.
 */

// Prisma is the only data source (the legacy "memory" mode was never implemented).
const dataSource = process.env.DATA_SOURCE || 'prisma';
let prisma = null;
if (dataSource === 'prisma') {
  prisma = require('../db/prisma').prisma;
}
const {
  ORDER_STATUS,
  ORDER_STATUS_META,
  changeOrderStatus,
  isFinalStatus,
  requiresReason,
} = require('./orderStatus');
const pushService = require('./pushService');

/**
 * Resolve the accepted admin/super-admin user IDs for a business (the people who
 * should be alerted about stuck orders).
 * @param {string} businessId
 * @returns {Promise<string[]>}
 */
async function getBusinessAdminUserIds(businessId) {
  if (!prisma) return [];
  const admins = await prisma.businessMember.findMany({
    where: { businessId, status: 'accepted', role: { in: ['admin', 'super_admin'] } },
    select: { userId: true },
  });
  return admins.map((m) => m.userId);
}

// ============================================================================
// CONFIGURATION (can be made configurable per business later)
// ============================================================================

/**
 * Default automation settings
 */
const DEFAULT_SETTINGS = {
  // Auto-cancel NEW orders after this many hours of inactivity
  autoCancelNewAfterHours: 48,
  
  // Flag PENDING orders after this many hours (create reminder)
  pendingReminderAfterHours: 72, // 3 days
  
  // Whether to auto-move DONE orders to IN_REVIEW (requires validation)
  requireReviewBeforeDone: false,
  
  // System user ID for automated changes
  systemUserId: 'SYSTEM',
};

// ============================================================================
// AUTOMATION FUNCTIONS
// ============================================================================

/**
 * Get orders that are NEW and have been inactive for too long
 * 
 * @param {number} hoursThreshold - Hours of inactivity before flagging
 * @returns {Promise<Array>} Orders to auto-cancel
 */
async function getStaleNewOrders(hoursThreshold = DEFAULT_SETTINGS.autoCancelNewAfterHours) {
  // Automation only runs in prisma mode (production)
  if (!prisma) {
    logger.debug('[OrderAutomation] Skipping getStaleNewOrders - running in memory mode');
    return [];
  }
  
  const thresholdDate = new Date();
  thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);
  
  return prisma.order.findMany({
    where: {
      status: ORDER_STATUS.NEW,
      lastActivityAt: {
        lt: thresholdDate,
      },
    },
    select: {
      id: true,
      businessId: true,
      customerName: true,
      createdAt: true,
      lastActivityAt: true,
    },
  });
}

/**
 * Get orders that are PENDING and have been stuck for too long
 * 
 * @param {number} hoursThreshold - Hours before flagging as stuck
 * @returns {Promise<Array>} Stuck pending orders
 */
async function getStuckPendingOrders(hoursThreshold = DEFAULT_SETTINGS.pendingReminderAfterHours) {
  // Automation only runs in prisma mode (production)
  if (!prisma) {
    logger.debug('[OrderAutomation] Skipping getStuckPendingOrders - running in memory mode');
    return [];
  }
  
  const thresholdDate = new Date();
  thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);
  
  return prisma.order.findMany({
    where: {
      status: ORDER_STATUS.PENDING,
      statusChangedAt: {
        lt: thresholdDate,
      },
    },
    select: {
      id: true,
      businessId: true,
      customerName: true,
      statusReason: true,
      statusChangedAt: true,
    },
  });
}

/**
 * Auto-cancel stale NEW orders
 * 
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, don't actually cancel, just report
 * @param {number} options.hoursThreshold - Override default threshold
 * @returns {Promise<Object>} Results summary
 */
async function autoCancelStaleOrders({ 
  dryRun = false, 
  hoursThreshold = DEFAULT_SETTINGS.autoCancelNewAfterHours 
} = {}) {
  const staleOrders = await getStaleNewOrders(hoursThreshold);
  
  const results = {
    total: staleOrders.length,
    canceled: 0,
    failed: 0,
    errors: [],
    orders: [],
  };
  
  if (dryRun) {
    results.orders = staleOrders;
    return results;
  }
  
  for (const order of staleOrders) {
    try {
      await changeOrderStatus({
        orderId: order.id,
        nextStatus: ORDER_STATUS.CANCELED,
        reason: `Auto-canceled: No activity for ${hoursThreshold} hours`,
        userId: DEFAULT_SETTINGS.systemUserId,
      });
      results.canceled++;
      results.orders.push({ id: order.id, status: 'canceled' });
    } catch (error) {
      results.failed++;
      results.errors.push({ orderId: order.id, error: error.message });
    }
  }
  
  return results;
}

/**
 * Get stuck PENDING orders for reminder/notification
 * 
 * @param {number} hoursThreshold - Override default threshold
 * @returns {Promise<Object>} Results with stuck orders
 */
async function getStuckPendingReport(hoursThreshold = DEFAULT_SETTINGS.pendingReminderAfterHours) {
  const stuckOrders = await getStuckPendingOrders(hoursThreshold);
  
  // Group by business for notification purposes
  const byBusiness = {};
  for (const order of stuckOrders) {
    if (!byBusiness[order.businessId]) {
      byBusiness[order.businessId] = [];
    }
    byBusiness[order.businessId].push(order);
  }
  
  return {
    total: stuckOrders.length,
    byBusiness,
    orders: stuckOrders,
  };
}

/**
 * Get all non-final statuses (orders that might need attention)
 * Derived from ORDER_STATUS_META.isFinal
 */
function getActiveStatuses() {
  return Object.entries(ORDER_STATUS_META)
    .filter(([_, meta]) => !meta.isFinal)
    .map(([status]) => status);
}

/**
 * Get orders in any active (non-final) status that haven't had activity
 * 
 * @param {number} hoursThreshold - Hours of inactivity
 * @returns {Promise<Array>} Inactive orders grouped by status
 */
async function getInactiveOrdersByStatus(hoursThreshold = 24) {
  // Automation only runs in prisma mode (production)
  if (!prisma) {
    logger.debug('[OrderAutomation] Skipping getInactiveOrdersByStatus - running in memory mode');
    return { total: 0, byStatus: {}, orders: [] };
  }
  
  const thresholdDate = new Date();
  thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);
  
  const activeStatuses = getActiveStatuses();
  
  const orders = await prisma.order.findMany({
    where: {
      status: { in: activeStatuses },
      lastActivityAt: { lt: thresholdDate },
    },
    select: {
      id: true,
      businessId: true,
      status: true,
      customerName: true,
      lastActivityAt: true,
      statusReason: true,
    },
    orderBy: { lastActivityAt: 'asc' },
  });
  
  // Group by status
  const byStatus = {};
  for (const order of orders) {
    if (!byStatus[order.status]) {
      byStatus[order.status] = [];
    }
    byStatus[order.status].push(order);
  }
  
  return {
    total: orders.length,
    byStatus,
    orders,
  };
}

/**
 * Run all automation tasks
 *
 * @param {Object} options
 * @param {boolean} [options.dryRun=false]   - If true, don't make changes / send notifications
 * @param {boolean} [options.autoCancel=true] - If true, auto-cancel stale NEW orders (Task 1).
 *                                               The scheduled run passes false so cancellation
 *                                               stays a manual-only action.
 * @param {boolean} [options.notify=false]    - If true, send stuck-order push alerts (Task 4).
 * @param {Object}  [options.repos=null]      - Repository container, required to send notifications.
 * @returns {Promise<Object>} Combined results
 */
async function runAutomation({ dryRun = false, autoCancel = true, notify = false, repos = null } = {}) {
  logger.debug(`[OrderAutomation] Starting automation run (dryRun: ${dryRun}, autoCancel: ${autoCancel}, notify: ${notify})`);
  const startTime = Date.now();

  const results = {
    timestamp: new Date().toISOString(),
    dryRun,
    autoCancelNewOrders: null,
    stuckPendingOrders: null,
    inactiveOrders: null,
    notificationsSent: null,
    duration: 0,
  };

  try {
    // Task 1: Auto-cancel stale NEW orders (skipped unless explicitly enabled).
    if (autoCancel) {
      results.autoCancelNewOrders = await autoCancelStaleOrders({ dryRun });
      logger.debug(`[OrderAutomation] Auto-cancel: ${results.autoCancelNewOrders.canceled}/${results.autoCancelNewOrders.total} orders`);
    }

    // Task 2: Report stuck PENDING orders (for notifications)
    results.stuckPendingOrders = await getStuckPendingReport();
    logger.debug(`[OrderAutomation] Stuck pending: ${results.stuckPendingOrders.total} orders`);

    // Task 3: Report all inactive orders by status (for dashboard/monitoring)
    results.inactiveOrders = await getInactiveOrdersByStatus(24);
    logger.debug(`[OrderAutomation] Inactive orders (24h): ${results.inactiveOrders.total}`);

    // Task 4: Notify each business's admins about their stuck pending orders.
    if (notify && !dryRun && repos) {
      results.notificationsSent = await notifyStuckPendingOrders(results.stuckPendingOrders, repos);
      logger.debug(`[OrderAutomation] Stuck-order alerts: notified ${results.notificationsSent.businessesNotified} business(es)`);
    }

  } catch (error) {
    logger.error('[OrderAutomation] Error during automation:', error);
    results.error = error.message;
  }

  results.duration = Date.now() - startTime;
  logger.debug(`[OrderAutomation] Completed in ${results.duration}ms`);

  return results;
}

/**
 * Task 4 implementation: send a stuck-order push alert to each affected business's admins.
 * @param {Object} stuckReport - Output of getStuckPendingReport() ({ total, byBusiness })
 * @param {Object} repos - Repository container (needed by pushService)
 * @returns {Promise<{businessesNotified: number}>}
 */
async function notifyStuckPendingOrders(stuckReport, repos) {
  let businessesNotified = 0;
  const thresholdHours = DEFAULT_SETTINGS.pendingReminderAfterHours;
  const byBusiness = stuckReport?.byBusiness || {};

  for (const [businessId, orders] of Object.entries(byBusiness)) {
    try {
      const userIds = await getBusinessAdminUserIds(businessId);
      if (userIds.length === 0) continue;

      const n = orders.length;
      await pushService.sendToUsers({
        userIds,
        title: 'Orders need attention',
        body: `You have ${n} order${n === 1 ? '' : 's'} pending for over ${thresholdHours}h.`,
        category: 'orders',
        data: { type: 'stuck_orders', businessId },
      }, repos);
      businessesNotified++;
    } catch (err) {
      logger.error(`[OrderAutomation] Failed to notify business ${businessId}:`, err.message);
    }
  }

  return { businessesNotified };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Configuration
  DEFAULT_SETTINGS,
  
  // Query functions (status-aware)
  getStaleNewOrders,
  getStuckPendingOrders,
  getActiveStatuses,
  getInactiveOrdersByStatus,
  
  // Action functions
  autoCancelStaleOrders,
  getStuckPendingReport,
  
  // Main runner
  runAutomation,
};
