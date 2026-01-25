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

const { prisma } = require('../db/prisma');
const { 
  ORDER_STATUS, 
  ORDER_STATUS_META,
  changeOrderStatus,
  isFinalStatus,
  requiresReason,
} = require('./orderStatus');

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
 * @param {boolean} options.dryRun - If true, don't make changes
 * @returns {Promise<Object>} Combined results
 */
async function runAutomation({ dryRun = false } = {}) {
  console.log(`[OrderAutomation] Starting automation run (dryRun: ${dryRun})`);
  const startTime = Date.now();
  
  const results = {
    timestamp: new Date().toISOString(),
    dryRun,
    autoCancelNewOrders: null,
    stuckPendingOrders: null,
    inactiveOrders: null,
    duration: 0,
  };
  
  try {
    // Task 1: Auto-cancel stale NEW orders
    results.autoCancelNewOrders = await autoCancelStaleOrders({ dryRun });
    console.log(`[OrderAutomation] Auto-cancel: ${results.autoCancelNewOrders.canceled}/${results.autoCancelNewOrders.total} orders`);
    
    // Task 2: Report stuck PENDING orders (for notifications)
    results.stuckPendingOrders = await getStuckPendingReport();
    console.log(`[OrderAutomation] Stuck pending: ${results.stuckPendingOrders.total} orders`);
    
    // Task 3: Report all inactive orders by status (for dashboard/monitoring)
    results.inactiveOrders = await getInactiveOrdersByStatus(24);
    console.log(`[OrderAutomation] Inactive orders (24h): ${results.inactiveOrders.total}`);
    
    // TODO: Task 4: Send notifications for stuck pending orders
    // This would integrate with your notification system
    
  } catch (error) {
    console.error('[OrderAutomation] Error during automation:', error);
    results.error = error.message;
  }
  
  results.duration = Date.now() - startTime;
  console.log(`[OrderAutomation] Completed in ${results.duration}ms`);
  
  return results;
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
