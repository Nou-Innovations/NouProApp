/**
 * Status color mappings for various entity states
 * All colors reference the theme to maintain consistency
 */

import { theme } from '@/shared/theme';

export type StatusColorPair = {
  bg: string;
  text: string;
};

// ============================================
// Product Status Colors
// ============================================
export const productStatusColors: Record<string, StatusColorPair> = {
  available: {
    bg: theme.colors.success,
    text: '#FFFFFF',
  },
  out_of_stock: {
    bg: theme.colors.accent,
    text: '#FFFFFF',
  },
  discontinued: {
    bg: theme.colors.statusDiscontinuedBg,
    text: theme.colors.accent,
  },
  in_production: {
    bg: theme.colors.warning,
    text: theme.colors.error,
  },
  inactive: {
    bg: theme.colors.statusInactive,
    text: theme.colors.textMuted,
  },
  low_stock: {
    bg: theme.colors.statusLowStock,
    text: theme.colors.statusLowStockText,
  },
};

// ============================================
// Delivery Status Colors
// ============================================
export const deliveryStatusColors: Record<string, StatusColorPair> = {
  new_order: {
    bg: theme.colors.statusNewOrder,
    text: '#FFFFFF',
  },
  ongoing: {
    bg: theme.colors.info,
    text: '#FFFFFF',
  },
  done: {
    bg: theme.colors.success,
    text: '#FFFFFF',
  },
  in_review: {
    bg: theme.colors.statusInReview,
    text: '#FFFFFF',
  },
  pending: {
    bg: theme.colors.warning,
    text: '#FFFFFF',
  },
  canceled: {
    bg: theme.colors.accent,
    text: '#FFFFFF',
  },
};

// ============================================
// Payment Status Colors
// ============================================
export const paymentStatusColors: Record<string, StatusColorPair> = {
  unpaid: {
    bg: theme.colors.error,
    text: '#FFFFFF',
  },
  paid: {
    bg: theme.colors.success,
    text: theme.colors.statusPaidText,
  },
};

// ============================================
// Transaction Direction Colors (Import/Export, Send/Receive)
// ============================================
export const transactionDirectionColors: Record<string, StatusColorPair> = {
  import: {
    bg: theme.colors.statusImport,
    text: '#FFFFFF',
  },
  received: {
    bg: theme.colors.statusImport,
    text: '#FFFFFF',
  },
  export: {
    bg: theme.colors.statusExport,
    text: '#FFFFFF',
  },
  sent: {
    bg: theme.colors.statusExport,
    text: '#FFFFFF',
  },
};

// ============================================
// Helper Functions
// ============================================

type StatusType = 'product' | 'delivery' | 'payment' | 'transaction';

const statusMaps: Record<StatusType, Record<string, StatusColorPair>> = {
  product: productStatusColors,
  delivery: deliveryStatusColors,
  payment: paymentStatusColors,
  transaction: transactionDirectionColors,
};

/**
 * Get status colors for a given status and type
 * Returns a fallback neutral color if status is not found
 */
export const getStatusColors = (
  status: string,
  type: StatusType
): StatusColorPair => {
  const fallback: StatusColorPair = { 
    bg: theme.colors.neutral, 
    text: '#FFFFFF' 
  };
  
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return statusMaps[type]?.[normalizedStatus] ?? fallback;
};

/**
 * Get product status colors
 */
export const getProductStatusColors = (status: string): StatusColorPair => {
  return getStatusColors(status, 'product');
};

/**
 * Get delivery status colors
 */
export const getDeliveryStatusColors = (status: string): StatusColorPair => {
  return getStatusColors(status, 'delivery');
};

/**
 * Get payment status colors
 */
export const getPaymentStatusColors = (status: string): StatusColorPair => {
  return getStatusColors(status, 'payment');
};

/**
 * Get transaction direction colors
 */
export const getTransactionDirectionColors = (direction: string): StatusColorPair => {
  return getStatusColors(direction, 'transaction');
};
