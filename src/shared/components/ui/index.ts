/**
 * UI Components (consolidated)
 * 
 * OVERLAY COMPONENTS:
 * - AppBottomSheet: ONLY bottom sheet for lists/options/selectors
 *   - Supports children mode (custom content) or items mode (auto ListItemCard rendering)
 *   - Use items prop with AppBottomSheetItem[] for automatic list rendering
 * - AppModal: Modal for confirmations/info/success/error with 4 variants:
 *   - 'default': Theme-aware background, general purpose
 *   - 'delete': Dark red, destructive actions
 *   - 'confirm': Dark green, confirmation prompts
 *   - 'success': Dark green with checkmark, success feedback
 * - ImageViewerModal: Special-case, uses shared overlay tokens
 */

// Overlay components
export { default as AppBottomSheet } from './AppBottomSheet';
export type { AppBottomSheetProps, AppBottomSheetItem } from './AppBottomSheet';
export { default as AppModal } from './AppModal';
export type { AppModalProps, AppModalVariant } from './AppModal';
export { default as ImageViewerModal } from './ImageViewerModal';

// Standard UI components
export { default as AccordionSection } from './AccordionSection';
export { default as ActionButton } from './ActionButton';
export { default as AppButton } from './AppButton';
export { default as AppSearchBar } from './AppSearchBar';
export type { AppSearchBarRef } from './AppSearchBar';
export { default as AppTextField } from './AppTextField';
export { default as Avatar } from './Avatar';
export { default as CodeInput } from './CodeInput';
export { default as ColorPicker } from './ColorPicker';
export { default as ImageUploadField } from './ImageUploadField';
export { default as PhoneNumberField } from './PhoneNumberField';
export { default as StaffCard } from './StaffCard';
export type { StaffMember, StaffCardRole } from './StaffCard';
export { default as IconButton } from './IconButton';
export { default as ImagePlaceholder } from './ImagePlaceholder';
export { default as Pill } from './Pill';
export { default as ExploreChips } from './ExploreChips';
export { default as ListItemCard } from './ListItemCard';
export { OrderStatusBadge, OrderStatusPill } from './OrderStatusBadge';
export type { ListItemCardProps, ListItemCardAvatarProps, ListItemCardRightRow1Props } from './ListItemCard';
export { DemoModeBadge } from './DemoModeBadge';

// Typography
export { Text, H1, H2, H3, H4, Caption, ButtonText, Label, BodyBold, BodyMedium } from './Typography';

// Date & Time Selectors
export { default as TimeSelector } from './TimeSelector';
export type { TimeSelectorProps } from './TimeSelector';
export { default as DateSelector } from './DateSelector';
export type { DateSelectorProps } from './DateSelector';

// Empty State
export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// Skeleton Loading
export { 
  default as Skeleton, 
  SkeletonCircle, 
  SkeletonRow, 
  SkeletonColumn, 
  SkeletonListItem, 
  SkeletonCard 
} from './Skeleton';
