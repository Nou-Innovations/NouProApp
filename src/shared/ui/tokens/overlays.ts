/**
 * Shared overlay tokens
 * Must be used by AppBottomSheet, AppModal, and any special-case modals (e.g., ImageViewerModal)
 * This ensures visual consistency across all overlay components.
 */

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
    fontSize: 16, 
    fontWeight: '700' as const,
  },
  body: { 
    fontSize: 14, 
    fontWeight: '500' as const, 
    lineHeight: 18,
  },
} as const;
