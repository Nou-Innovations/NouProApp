/**
 * Shared overlay tokens
 * Must be used by AppBottomSheet, AppModal, and any special-case modals (e.g., ImageViewerModal)
 * This ensures visual consistency across all overlay components.
 */

import { theme } from "@/shared/theme";

export const OVERLAY = {
  /** Backdrop color for all overlays */
  backdrop: 'rgba(0,0,0,0.5)',
  /** Border radius for bottom sheets */
  sheetRadius: 20,
  /** Border radius for centered modals */
  modalRadius: 16,
} as const;

export const MODAL_TYPOGRAPHY = {
  title: { 
    fontSize: 24, 
    fontFamily: theme.fonts.primary.bold,
  },
  body: { 
    fontSize: 16, 
    fontFamily: 'InterCustom-Medium',
    lineHeight: 24,
  },
} as const;
