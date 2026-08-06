/**
 * Backend Services
 * 
 * Business logic layer that handles complex operations
 * with validation, transactions, and audit logging.
 */

const orderStatus = require('./orderStatus');
const orderAutomation = require('./orderAutomation');
const eventMessages = require('./eventMessages');
const pushService = require('./pushService');
const storageService = require('./storageService');
const stockService = require('./stockService');
const transferStatus = require('./transferStatus');
const paymentService = require('./paymentService');
const subscriptionRenewal = require('./subscriptionRenewal');
const otpService = require('./otpService');

module.exports = {
  orderStatus,
  orderAutomation,
  eventMessages,
  pushService,
  storageService,
  stockService,
  transferStatus,
  paymentService,
  subscriptionRenewal,
  otpService,
};
