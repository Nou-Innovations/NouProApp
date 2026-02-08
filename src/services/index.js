/**
 * Backend Services
 * 
 * Business logic layer that handles complex operations
 * with validation, transactions, and audit logging.
 */

const orderStatus = require('./orderStatus');
const orderAutomation = require('./orderAutomation');
const eventMessages = require('./eventMessages');

module.exports = {
  orderStatus,
  orderAutomation,
  eventMessages,
};
