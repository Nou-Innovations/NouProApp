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
  cardBorder: '#ECE6DF',
  cardShadow: 'rgba(28, 25, 23, 0.06)',

  // Text
  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  textLink: '#2A75E6',

  // Business block
  businessBlockBackground: '#FAF8F5',

  // Connector
  connectorColor: '#ECE6DF',

  // Timeline
  timelineActive: '#2A75E6',
  timelineInactive: '#ECE6DF',
  timelineDotActive: '#2A75E6',
  timelineDotInactive: '#ECE6DF',
} as const;

// ============================================================================
// Color Tokens - Dark Mode
// ============================================================================

export const ORDER_EVENT_COLORS_DARK = {
  // Card
  cardBackground: '#232020',
  cardBorder: '#332E2A',
  cardShadow: 'rgba(0, 0, 0, 0.35)',

  // Text
  textPrimary: '#FAFAF9',
  textSecondary: '#D6D3D1',
  textMuted: '#A8A29E',
  textLink: '#2A75E6',

  // Business block
  businessBlockBackground: '#2A2622',

  // Connector
  connectorColor: '#44403C',

  // Timeline
  timelineActive: '#2A75E6',
  timelineInactive: '#44403C',
  timelineDotActive: '#2A75E6',
  timelineDotInactive: '#57534E',
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
    backgroundColor: '#DBEAFE',
    textColor: '#2A75E6',
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
