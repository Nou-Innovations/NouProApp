/**
 * UI Components (consolidated)
 * 
 * OVERLAY COMPONENTS:
 * - AppBottomSheet: ONLY bottom sheet for lists/options/selectors
 * - AppModal: ONLY modal for confirmations/info/success/error
 * - ImageViewerModal: Special-case, uses shared overlay tokens
 * 
 * @deprecated The following components are scheduled for removal:
 * - ActionBottomSheet → use AppBottomSheet
 * - DropdownModal → use AppBottomSheet  
 * - ModalList → use AppBottomSheet
 * - ConfirmationDialog → use AppModal
 */

// Canonical overlay components (use these)
export { default as AppBottomSheet } from './AppBottomSheet';
export type { AppBottomSheetProps } from './AppBottomSheet';
export { default as AppModal } from './AppModal';
export type { AppModalProps } from './AppModal';
export { default as ImageViewerModal } from './ImageViewerModal';

// @deprecated - scheduled for removal, migrate to AppBottomSheet/AppModal
export { default as ActionBottomSheet } from './ActionBottomSheet';
export { default as DropdownModal } from './DropdownModal';
export type { DropdownItem } from './DropdownModal';
export { default as ModalList } from './ModalList';
export type { ModalListItem } from './ModalList';
export { default as ConfirmationDialog } from './ConfirmationDialog';
export type { ConfirmationDialogVariant } from './ConfirmationDialog';

// Standard UI components
export { default as AccordionSection } from './AccordionSection';
export { default as ActionButton } from './ActionButton';
export { default as AppButton } from './AppButton';
export { default as AppSearchBar } from './AppSearchBar';
export type { AppSearchBarRef } from './AppSearchBar';
export { default as AppTextField } from './AppTextField';
export { default as Avatar } from './Avatar';
export { default as ColorPicker } from './ColorPicker';
export { default as StaffCard } from './StaffCard';
export type { StaffMember, StaffRole } from './StaffCard';
export { default as IconButton } from './IconButton';
export { default as ImagePlaceholder } from './ImagePlaceholder';
export { default as Pill } from './Pill';
export { default as SplashScreen } from './SplashScreen';

// Typography
export { Text, H1, H2, H3, H4, Caption, ButtonText, Label, BodyBold, BodyMedium } from './Typography';
