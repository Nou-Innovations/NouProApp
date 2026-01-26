/**
 * Order Event Card Design Tokens
 * 
 * Consistent spacing, colors, and typography for the Order Event Card component.
 * Based on Mixpanel-like neutral system for premium look.
 */

import type { OrderEventStatus } from '@/shared/types/inbox';

// ============================================================================
// Spacing Tokens
// ============================================================================

export const ORDER_EVENT_SPACING = {
  // Card
  cardMarginVertical: 8,
  cardPadding: 16,
  cardRadius: 16,
  cardBorderWidth: 1,
  cardMaxWidthPercent: 0.92,
  cardWidth: 280,
  
  // Header
  headerIconSize: 28,
  headerIconRadius: 8,
  headerIconGap: 10,
  headerBottomMargin: 12,
  
  // Badge
  badgePaddingVertical: 6,
  badgePaddingHorizontal: 10,
  badgeRadius: 999,
  
  // Business block
  businessBlockPadding: 12,
  businessBlockRadius: 12,
  businessBlockMarginBottom: 12,
  businessAvatarSize: 22,
  businessAvatarRadius: 6,
  
  // Order summary
  summaryRowGap: 6,
  summaryMarginBottom: 12,
  
  // Item preview
  itemPreviewMarginBottom: 12,
  
  // Delivery block
  deliveryMarginBottom: 12,
  
  // Timeline
  timelineDotSize: 8,
  timelineLineThickness: 2,
  timelineMarginBottom: 12,
  
  // Action buttons
  buttonHeight: 36,
  buttonRadius: 10,
  buttonPaddingHorizontal: 14,
  buttonGap: 10,
  buttonTopMargin: 4,
} as const;

// ============================================================================
// Typography Tokens
// ============================================================================

export const ORDER_EVENT_TYPOGRAPHY = {
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  orderRef: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  meta: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  body: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 22,
  },
  businessName: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  businessMeta: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  itemQtyPrice: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  moreItems: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  badge: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  button: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
} as const;

// ============================================================================
// Color Tokens - Light Mode
// ============================================================================

export const ORDER_EVENT_COLORS_LIGHT = {
  // Card
  cardBackground: '#FFFFFF',
  cardBorder: '#E6E8EC',
  cardShadow: 'rgba(16, 24, 40, 0.06)',
  
  // Text
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  textLink: '#0075FF',
  
  // Business block
  businessBlockBackground: '#F7F8FA',
  
  // Connector
  connectorColor: '#D1D5DB',
  
  // Timeline
  timelineActive: '#0075FF',
  timelineInactive: '#E6E8EC',
  timelineDotActive: '#0075FF',
  timelineDotInactive: '#D1D5DB',
} as const;

// ============================================================================
// Color Tokens - Dark Mode
// ============================================================================

export const ORDER_EVENT_COLORS_DARK = {
  // Card
  cardBackground: '#0F141A',
  cardBorder: '#202733',
  cardShadow: 'rgba(0, 0, 0, 0.35)',
  
  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9AA4B2',
  textLink: '#60A5FA',
  
  // Business block
  businessBlockBackground: '#151B23',
  
  // Connector
  connectorColor: '#374151',
  
  // Timeline
  timelineActive: '#60A5FA',
  timelineInactive: '#374151',
  timelineDotActive: '#60A5FA',
  timelineDotInactive: '#4B5563',
} as const;

// ============================================================================
// Status Badge Colors
// ============================================================================

export interface StatusBadgeConfig {
  label: string;
  backgroundColor: string;
  textColor: string;
  icon: string;
  title: string;
}

export const ORDER_EVENT_STATUS_CONFIG: Record<OrderEventStatus, StatusBadgeConfig> = {
  NEW: {
    label: 'New',
    backgroundColor: '#E8F1FF',
    textColor: '#1B4DFF',
    icon: 'plus-circle',
    title: 'New Order Placed',
  },
  ONGOING: {
    label: 'Ongoing',
    backgroundColor: '#FFF3E5',
    textColor: '#C2410C',
    icon: 'loader',
    title: 'Order Accepted / Preparing',
  },
  PENDING: {
    label: 'Pending',
    backgroundColor: '#FEF9C3',
    textColor: '#854D0E',
    icon: 'clock',
    title: 'Order Pending',
  },
  DONE: {
    label: 'Done',
    backgroundColor: '#E7F8EE',
    textColor: '#166534',
    icon: 'check-circle',
    title: 'Order Delivered / Completed',
  },
  IN_REVIEW: {
    label: 'In Review',
    backgroundColor: '#F3E8FF',
    textColor: '#6B21A8',
    icon: 'eye',
    title: 'Order In Review',
  },
  CANCELED: {
    label: 'Canceled',
    backgroundColor: '#FEE2E2',
    textColor: '#991B1B',
    icon: 'x-circle',
    title: 'Order Canceled',
  },
} as const;

// Dark mode status colors (adjusted for contrast)
export const ORDER_EVENT_STATUS_CONFIG_DARK: Record<OrderEventStatus, StatusBadgeConfig> = {
  NEW: {
    label: 'New',
    backgroundColor: '#1E3A5F',
    textColor: '#93C5FD',
    icon: 'plus-circle',
    title: 'New Order Placed',
  },
  ONGOING: {
    label: 'Ongoing',
    backgroundColor: '#431407',
    textColor: '#FDBA74',
    icon: 'loader',
    title: 'Order Accepted / Preparing',
  },
  PENDING: {
    label: 'Pending',
    backgroundColor: '#422006',
    textColor: '#FDE047',
    icon: 'clock',
    title: 'Order Pending',
  },
  DONE: {
    label: 'Done',
    backgroundColor: '#052E16',
    textColor: '#86EFAC',
    icon: 'check-circle',
    title: 'Order Delivered / Completed',
  },
  IN_REVIEW: {
    label: 'In Review',
    backgroundColor: '#3B0764',
    textColor: '#D8B4FE',
    icon: 'eye',
    title: 'Order In Review',
  },
  CANCELED: {
    label: 'Canceled',
    backgroundColor: '#450A0A',
    textColor: '#FCA5A5',
    icon: 'x-circle',
    title: 'Order Canceled',
  },
} as const;

// ============================================================================
// Timeline Steps
// ============================================================================

export const ORDER_EVENT_TIMELINE_STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'out', label: 'Out' },
  { key: 'delivered', label: 'Delivered' },
] as const;

// Map status to active timeline step index
export const STATUS_TO_TIMELINE_STEP: Record<OrderEventStatus, number> = {
  NEW: 0,
  PENDING: 0,
  ONGOING: 2,
  IN_REVIEW: 2,
  DONE: 4,
  CANCELED: -1, // Special case - show all inactive
} as const;
