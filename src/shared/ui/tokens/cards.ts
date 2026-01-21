/**
 * Shared card tokens
 * Must be used by ListItemCard and any list-based card components.
 * This ensures visual consistency across all list item cards.
 * 
 * Excludes: CartItemCard, ProductCard, DeliveryCard, InvoiceCard, BrandCard
 * (These have specialized layouts)
 */

import { theme } from "@/shared/theme";

export const LIST_ITEM_CARD = {
  // Container
  paddingHorizontal: 12,
  paddingVertical: 12,
  
  // Gap between title and subtitle
  titleSubtitleGap: 4,
  
  // Avatar
  avatar: {
    size: 48,
    borderRadius: 8,
    marginRight: 12,
    iconSize: 24,
  },
  
  // Typography - Title (Row 1 Left)
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  
  // Typography - Subtitle (Row 2 Left)
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  
  // Typography - Extra Info (Row 3 Left)
  extraInfo: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  
  // Typography - Timestamp (Row 1 Right)
  timestamp: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  
  // Options Button (3 dots)
  optionsButton: {
    size: 40,
    iconSize: 20,
    hitSlop: 10,
  },
  
  // Checkmark (for selections)
  checkmark: {
    size: 32,
    iconSize: 24,
    borderRadius: 8,
  },
  
  // Divider
  divider: {
    height: 1,
    marginHorizontal: 8,
  },
  
  // Selection border variant
  selectionBorder: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
} as const;
