/**
 * Bottom Sheet Gallery — registry of every modal / bottom-sheet surface in the app.
 *
 * This is the single source of truth for the Design System "Bottom Sheet Gallery" screen.
 * Each entry describes one real modal/sheet instance found in the codebase (see
 * BOTTOM_SHEET_AUDIT.md), its visual attributes, the proposed standardization direction
 * (`recommendation`), and which demo renderer reproduces it (`demo.kind`).
 *
 * Canonical entries (AppBottomSheet / AppModal) render the REAL shared components.
 * Every other entry renders a faithful, self-contained reproduction driven by `attributes`
 * — no feature data is wired in.
 */

export type SheetAnimation = 'slide' | 'fade' | 'none' | 'custom-spring';

export interface SheetAttributes {
  /** RN Modal entrance animation (canonical uses a custom Animated spring) */
  animationType: SheetAnimation;
  transparent: boolean;
  /** Backdrop color string, e.g. 'rgba(0,0,0,0.5)' */
  backdrop: string;
  /** Top corner radius (sheets) or card radius (dialogs) */
  radius: number;
  dragHandle: boolean;
  closeButton: boolean;
  safeArea: boolean;
  /** Whether the source uses the shared OVERLAY tokens (tokens/overlays.ts) */
  usesOverlayToken: boolean;
}

export type Recommendation =
  | 'canonical'
  | 'migrate-bottomsheet'
  | 'migrate-modal'
  | 'token-align'
  | 'move-to-screen';

export type DemoKind =
  | 'app-bottomsheet'
  | 'app-modal'
  | 'demo-bottomsheet'
  | 'demo-dialog'
  | 'demo-dropdown'
  | 'demo-fullscreen'
  | 'demo-special';

export type GalleryCategory =
  | 'Canonical'
  | 'Legacy bottom sheets'
  | 'Centered dialogs'
  | 'Dropdown / popover'
  | 'Special'
  | 'Fullscreen';

export interface GalleryEntry {
  id: string;
  name: string;
  /** Source location "path:line" for traceability */
  source: string;
  category: GalleryCategory;
  attributes: SheetAttributes;
  recommendation: Recommendation;
  note?: string;
  demo: { kind: DemoKind; variant?: string };
  /** Optional label rendered inside placeholder demos (special / fullscreen) */
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Attribute presets (legacy styles found across the app)
// ---------------------------------------------------------------------------

const CANONICAL_SHEET: SheetAttributes = {
  animationType: 'custom-spring',
  transparent: true,
  backdrop: 'rgba(0,0,0,0.5)',
  radius: 20,
  dragHandle: true,
  closeButton: true,
  safeArea: true,
  usesOverlayToken: true,
};

const CANONICAL_DIALOG: SheetAttributes = {
  animationType: 'custom-spring',
  transparent: true,
  backdrop: 'rgba(0,0,0,0.5)',
  radius: 16,
  dragHandle: false,
  closeButton: false,
  safeArea: true,
  usesOverlayToken: true,
};

const SLIDE_R20: SheetAttributes = {
  animationType: 'slide',
  transparent: true,
  backdrop: 'rgba(0,0,0,0.5)',
  radius: 20,
  dragHandle: false,
  closeButton: true,
  safeArea: false,
  usesOverlayToken: false,
};

const NONE_R20: SheetAttributes = { ...SLIDE_R20, animationType: 'none' };
const FADE_R20: SheetAttributes = { ...SLIDE_R20, animationType: 'fade' };

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const GALLERY_ENTRIES: GalleryEntry[] = [
  // ===== Canonical (render the REAL shared components) =====
  {
    id: 'canon-appbs-list',
    name: 'AppBottomSheet · List mode',
    source: 'shared/components/ui/AppBottomSheet.tsx',
    category: 'Canonical',
    attributes: CANONICAL_SHEET,
    recommendation: 'canonical',
    note: 'The target pattern for option/selection lists. Drag handle, animated spring, OVERLAY tokens.',
    demo: { kind: 'app-bottomsheet', variant: 'list' },
  },
  {
    id: 'canon-appbs-buttons',
    name: 'AppBottomSheet · Buttons mode',
    source: 'shared/components/ui/AppBottomSheet.tsx',
    category: 'Canonical',
    attributes: CANONICAL_SHEET,
    recommendation: 'canonical',
    note: 'Action sheets rendered as stacked outline buttons.',
    demo: { kind: 'app-bottomsheet', variant: 'buttons' },
  },
  {
    id: 'canon-appbs-children',
    name: 'AppBottomSheet · Children mode',
    source: 'shared/components/ui/AppBottomSheet.tsx',
    category: 'Canonical',
    attributes: CANONICAL_SHEET,
    recommendation: 'canonical',
    note: 'Custom content (forms, pickers) inside the canonical sheet chrome.',
    demo: { kind: 'app-bottomsheet', variant: 'children' },
  },
  {
    id: 'canon-appbs-fullheight',
    name: 'AppBottomSheet · Full height',
    source: 'shared/components/ui/AppBottomSheet.tsx',
    category: 'Canonical',
    attributes: CANONICAL_SHEET,
    recommendation: 'canonical',
    note: 'Sticks to the top safe area for long, scrollable lists.',
    demo: { kind: 'app-bottomsheet', variant: 'fullHeight' },
  },
  {
    id: 'canon-appbs-multiselect',
    name: 'AppBottomSheet · Multi-select (checkboxes)',
    source: 'shared/components/ui/AppBottomSheet.tsx',
    category: 'Canonical',
    attributes: CANONICAL_SHEET,
    recommendation: 'canonical',
    note: 'Choose one or more options with a checkbox per row (empty box → filled check). Toggling a row does NOT close the sheet; dismiss to confirm the selection.',
    demo: { kind: 'app-bottomsheet', variant: 'multiSelect' },
  },
  {
    id: 'canon-appmodal-default',
    name: 'AppModal · Default',
    source: 'shared/components/ui/AppModal.tsx',
    category: 'Canonical',
    attributes: CANONICAL_DIALOG,
    recommendation: 'canonical',
    note: 'Centered dialog for general confirmations.',
    demo: { kind: 'app-modal', variant: 'default' },
  },
  {
    id: 'canon-appmodal-delete',
    name: 'AppModal · Delete',
    source: 'shared/components/ui/AppModal.tsx',
    category: 'Canonical',
    attributes: CANONICAL_DIALOG,
    recommendation: 'canonical',
    note: 'Destructive variant (dark red).',
    demo: { kind: 'app-modal', variant: 'delete' },
  },
  {
    id: 'canon-appmodal-confirm',
    name: 'AppModal · Confirm',
    source: 'shared/components/ui/AppModal.tsx',
    category: 'Canonical',
    attributes: CANONICAL_DIALOG,
    recommendation: 'canonical',
    note: 'Confirm-before-action variant (dark green).',
    demo: { kind: 'app-modal', variant: 'confirm' },
  },
  {
    id: 'canon-appmodal-success',
    name: 'AppModal · Success',
    source: 'shared/components/ui/AppModal.tsx',
    category: 'Canonical',
    attributes: CANONICAL_DIALOG,
    recommendation: 'canonical',
    note: 'Post-action success feedback with checkmark.',
    demo: { kind: 'app-modal', variant: 'success' },
  },

  // ===== Legacy bottom sheets (→ AppBottomSheet) =====
  {
    id: 'legacy-transfer-receive',
    name: 'Transfer · Receive',
    source: 'features/transfers/components/TransferReceiveModal.tsx:75',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    note: 'Slide-up form sheet, radius 20, no drag handle, hardcoded backdrop.',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-transfer-create',
    name: 'Transfer · Create',
    source: 'features/transfers/components/TransferCreateModal.tsx:121',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-return-create',
    name: 'Return · Create',
    source: 'features/returns/components/ReturnCreateModal.tsx:74',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-issue-report',
    name: 'Issue · Report',
    source: 'features/issues/components/ReportIssueModal.tsx:56',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-business-edit',
    name: 'Business · Edit',
    source: 'features/profile/components/EditBusinessModal.tsx:68',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    note: 'Hardcoded backdrop, no OVERLAY tokens.',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-team-invite',
    name: 'Team · Invite',
    source: 'features/team/components/InviteTeamModal.tsx:60',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-locations-manage',
    name: 'Locations · Manage',
    source: 'features/company/components/ManageLocationsModal.tsx:214',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-supplier-picker',
    name: 'Procurement · Supplier picker',
    source: 'features/procurement/components/SupplierPickerModal.tsx:104',
    category: 'Legacy bottom sheets',
    attributes: { ...SLIDE_R20, safeArea: true },
    recommendation: 'migrate-bottomsheet',
    note: 'Full-height search picker (uses SafeAreaView). → AppBottomSheet fullHeight.',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-notifications-role',
    name: 'Notifications · Role picker',
    source: 'features/notifications/screens/NotificationsScreen.tsx:642',
    category: 'Legacy bottom sheets',
    attributes: { ...SLIDE_R20, closeButton: false },
    recommendation: 'migrate-bottomsheet',
    note: 'No drag handle and no X — tap-backdrop only.',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-businessprofile-checkout',
    name: 'Business profile · Checkout sheet',
    source: 'features/profile/screens/BusinessProfileScreen.tsx:1136',
    category: 'Legacy bottom sheets',
    attributes: { ...SLIDE_R20, radius: 16 },
    recommendation: 'migrate-bottomsheet',
    note: 'Radius 16 (off from canonical 20).',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-personalsettings-a',
    name: 'Personal settings · Options sheet',
    source: 'modes/personal/screens/PersonalSettingsScreen.tsx:401',
    category: 'Legacy bottom sheets',
    attributes: NONE_R20,
    recommendation: 'migrate-bottomsheet',
    note: 'animationType="none" — pops in with no animation.',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-personalsettings-b',
    name: 'Personal settings · Add options sheet',
    source: 'modes/personal/screens/PersonalSettingsScreen.tsx:608',
    category: 'Legacy bottom sheets',
    attributes: NONE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-personalprofile-a',
    name: 'Personal profile · Options sheet',
    source: 'modes/personal/screens/PersonalProfileScreen.tsx:481',
    category: 'Legacy bottom sheets',
    attributes: NONE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-personalprofile-b',
    name: 'Personal profile · Add options sheet',
    source: 'modes/personal/screens/PersonalProfileScreen.tsx:688',
    category: 'Legacy bottom sheets',
    attributes: NONE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-businessprofileown-a',
    name: 'Business profile (own) · Options sheet',
    source: 'modes/business/screens/BusinessProfileOwnScreen.tsx:588',
    category: 'Legacy bottom sheets',
    attributes: NONE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-businessprofileown-b',
    name: 'Business profile (own) · Add options sheet',
    source: 'modes/business/screens/BusinessProfileOwnScreen.tsx:804',
    category: 'Legacy bottom sheets',
    attributes: NONE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-staffcard-role',
    name: 'Staff card · Role picker',
    source: 'shared/components/ui/StaffCard.tsx:166',
    category: 'Legacy bottom sheets',
    attributes: FADE_R20,
    recommendation: 'migrate-bottomsheet',
    note: 'Fade-in sheet (a sheet that fades rather than slides).',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-location-pill',
    name: 'Location selector pill',
    source: 'modes/business/components/LocationSelectorPill.tsx:51',
    category: 'Legacy bottom sheets',
    attributes: { ...FADE_R20, backdrop: 'rgba(0,0,0,0.4)', closeButton: false },
    recommendation: 'migrate-bottomsheet',
    note: 'Backdrop 0.4 (off from canonical 0.5).',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-profileswitcher-list',
    name: 'Profile switcher · Profile list',
    source: 'features/profile/components/ProfileSwitcher.tsx:414',
    category: 'Legacy bottom sheets',
    attributes: { ...FADE_R20, radius: 24 },
    recommendation: 'migrate-bottomsheet',
    note: 'Radius 24 (off from canonical 20).',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-delivery-self-transport',
    name: 'Delivery (self) · Transport picker',
    source: 'features/deliveries/screens/detail/DeliveryDetailSelfView.tsx:550',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    note: 'Option picker — classic AppBottomSheet "items" case.',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-delivery-self-orderstatus',
    name: 'Delivery (self) · Order status picker',
    source: 'features/deliveries/screens/detail/DeliveryDetailSelfView.tsx:615',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-delivery-self-paymentstatus',
    name: 'Delivery (self) · Payment status picker',
    source: 'features/deliveries/screens/detail/DeliveryDetailSelfView.tsx:682',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-delivery-staff-status',
    name: 'Delivery (staff) · Status picker',
    source: 'features/deliveries/screens/detail/DeliveryDetailStaffView.tsx:332',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-delivery-supplier-transport',
    name: 'Delivery (supplier) · Transport picker',
    source: 'features/deliveries/screens/detail/DeliveryDetailSupplierView.tsx:682',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-delivery-supplier-orderstatus',
    name: 'Delivery (supplier) · Order status picker',
    source: 'features/deliveries/screens/detail/DeliveryDetailSupplierView.tsx:747',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-delivery-supplier-paymentstatus',
    name: 'Delivery (supplier) · Payment status picker',
    source: 'features/deliveries/screens/detail/DeliveryDetailSupplierView.tsx:814',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-delivery-supplier-scheduling',
    name: 'Delivery (supplier) · Scheduling picker',
    source: 'features/deliveries/screens/detail/DeliveryDetailSupplierView.tsx:881',
    category: 'Legacy bottom sheets',
    attributes: SLIDE_R20,
    recommendation: 'migrate-bottomsheet',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-invoice-create-preview',
    name: 'Invoice · Create preview',
    source: 'features/invoices/screens/CreateInvoiceScreen.tsx:1234',
    category: 'Legacy bottom sheets',
    attributes: { ...SLIDE_R20, safeArea: true },
    recommendation: 'migrate-bottomsheet',
    note: 'Full-height preview sheet. → AppBottomSheet fullHeight.',
    demo: { kind: 'demo-bottomsheet' },
  },
  {
    id: 'legacy-invoice-record-payment',
    name: 'Invoice · Record payment',
    source: 'features/invoices/screens/InvoiceDetailsScreen.tsx:869',
    category: 'Legacy bottom sheets',
    attributes: { ...SLIDE_R20, radius: 0 },
    recommendation: 'migrate-bottomsheet',
    note: 'Slides full from bottom with no top radius.',
    demo: { kind: 'demo-bottomsheet' },
  },

  // ===== Centered dialogs (→ AppModal) =====
  {
    id: 'dialog-stock-edit',
    name: 'Stock · Edit dialog',
    source: 'features/products/screens/StockScreen.tsx:152',
    category: 'Centered dialogs',
    attributes: {
      animationType: 'fade',
      transparent: true,
      backdrop: 'rgba(0,0,0,0.4)',
      radius: 16,
      dragHandle: false,
      closeButton: false,
      safeArea: false,
      usesOverlayToken: false,
    },
    recommendation: 'migrate-modal',
    note: 'Backdrop 0.4. Centered data-entry dialog.',
    demo: { kind: 'demo-dialog' },
  },
  {
    id: 'dialog-invoice-download',
    name: 'Invoice · Download PDF dialog',
    source: 'features/invoices/screens/InvoiceDetailsScreen.tsx:989',
    category: 'Centered dialogs',
    attributes: {
      animationType: 'fade',
      transparent: true,
      backdrop: 'rgba(0,0,0,0.5)',
      radius: 16,
      dragHandle: false,
      closeButton: false,
      safeArea: false,
      usesOverlayToken: false,
    },
    recommendation: 'migrate-modal',
    demo: { kind: 'demo-dialog' },
  },
  {
    id: 'dialog-invoice-confirm',
    name: 'Invoice · Confirm dialog',
    source: 'features/invoices/screens/CreateInvoiceScreen.tsx:1202',
    category: 'Centered dialogs',
    attributes: {
      animationType: 'fade',
      transparent: true,
      backdrop: 'rgba(0,0,0,0.5)',
      radius: 12,
      dragHandle: false,
      closeButton: true,
      safeArea: false,
      usesOverlayToken: false,
    },
    recommendation: 'migrate-modal',
    note: 'Radius 12 (off from canonical 16).',
    demo: { kind: 'demo-dialog' },
  },
  {
    id: 'dialog-profileswitcher-access',
    name: 'Profile switcher · Request access dialog',
    source: 'features/profile/components/ProfileSwitcher.tsx:513',
    category: 'Centered dialogs',
    attributes: {
      animationType: 'fade',
      transparent: true,
      backdrop: 'rgba(0,0,0,0.5)',
      radius: 16,
      dragHandle: false,
      closeButton: false,
      safeArea: false,
      usesOverlayToken: false,
    },
    recommendation: 'migrate-modal',
    demo: { kind: 'demo-dialog' },
  },
  {
    id: 'dialog-paywall',
    name: 'Paywall',
    source: 'shared/components/ui/PaywallModal.tsx:136',
    category: 'Centered dialogs',
    attributes: {
      animationType: 'fade',
      transparent: true,
      backdrop: 'rgba(0,0,0,0.5)',
      radius: 16,
      dragHandle: false,
      closeButton: true,
      safeArea: false,
      usesOverlayToken: false,
    },
    recommendation: 'token-align',
    note: 'Rich custom content (plan/pricing) — keep custom but align to OVERLAY tokens.',
    demo: { kind: 'demo-dialog' },
  },

  // ===== Dropdown / popover =====
  {
    id: 'dropdown-company',
    name: 'Company dropdown',
    source: 'features/company/components/CompanyDropdown.tsx:63',
    category: 'Dropdown / popover',
    attributes: {
      animationType: 'fade',
      transparent: true,
      backdrop: 'rgba(0,0,0,0.4)',
      radius: 12,
      dragHandle: false,
      closeButton: false,
      safeArea: false,
      usesOverlayToken: false,
    },
    recommendation: 'migrate-bottomsheet',
    note: 'Anchored popover with FlatList. Backdrop 0.4, radius 12.',
    demo: { kind: 'demo-dropdown' },
  },

  // ===== Special (keep, token-align) =====
  {
    id: 'special-pod-signature',
    name: 'POD · Signature capture',
    source: 'features/deliveries/components/PodCaptureModal.tsx:106',
    category: 'Special',
    attributes: { ...SLIDE_R20 },
    recommendation: 'token-align',
    note: 'Specialized signature pad (PanResponder/SVG). Keep, swap hardcoded values for OVERLAY tokens.',
    demo: { kind: 'demo-special' },
    placeholder: '✍️  Signature pad',
  },
  {
    id: 'special-event-datepicker',
    name: 'Event · Date picker',
    source: 'features/events/screens/CreateEventScreen.tsx:118',
    category: 'Special',
    attributes: { ...SLIDE_R20, closeButton: false },
    recommendation: 'token-align',
    note: 'Wraps a date picker. Could become a shared picker sheet.',
    demo: { kind: 'demo-special' },
    placeholder: '🗓️  Date picker',
  },
  {
    id: 'special-company-timepicker',
    name: 'Company · Time picker',
    source: 'features/company/screens/CompanyEditScreen.tsx:960',
    category: 'Special',
    attributes: { ...FADE_R20, closeButton: false },
    recommendation: 'token-align',
    note: 'Wraps the iOS time picker.',
    demo: { kind: 'demo-special' },
    placeholder: '⏰  Time picker',
  },
  {
    id: 'special-image-viewer',
    name: 'Image viewer (lightbox)',
    source: 'shared/components/ui/ImageViewerModal.tsx',
    category: 'Special',
    attributes: {
      animationType: 'fade',
      transparent: true,
      backdrop: 'rgba(0,0,0,0.8)',
      radius: 0,
      dragHandle: false,
      closeButton: true,
      safeArea: true,
      usesOverlayToken: false,
    },
    recommendation: 'token-align',
    note: 'Backed by react-native-image-viewing. Keep as-is (special case).',
    demo: { kind: 'demo-fullscreen' },
    placeholder: '🖼️  Image lightbox',
  },

  // ===== Fullscreen =====
  {
    id: 'fullscreen-scanner',
    name: 'Scanner (camera)',
    source: 'shared/components/ui/ScannerModal.tsx:39',
    category: 'Fullscreen',
    attributes: {
      animationType: 'slide',
      transparent: false,
      backdrop: '#000000',
      radius: 0,
      dragHandle: false,
      closeButton: true,
      safeArea: true,
      usesOverlayToken: false,
    },
    recommendation: 'token-align',
    note: 'Fullscreen camera — correct as a fullscreen modal.',
    demo: { kind: 'demo-fullscreen' },
    placeholder: '📷  Camera viewport',
  },
  {
    id: 'fullscreen-map-businesslocation',
    name: 'Business location · Map',
    source: 'features/auth/screens/BusinessLocationScreen.tsx:257',
    category: 'Fullscreen',
    attributes: {
      animationType: 'slide',
      transparent: false,
      backdrop: '#000000',
      radius: 0,
      dragHandle: false,
      closeButton: true,
      safeArea: true,
      usesOverlayToken: false,
    },
    recommendation: 'move-to-screen',
    note: 'presentationStyle="fullScreen" map — belongs in the RootStack as a screen, not a Modal.',
    demo: { kind: 'demo-fullscreen' },
    placeholder: '🗺️  Map picker',
  },
  {
    id: 'fullscreen-map-addlocation',
    name: 'Add location · Map',
    source: 'features/locations/screens/AddLocationScreen.tsx:569',
    category: 'Fullscreen',
    attributes: {
      animationType: 'slide',
      transparent: false,
      backdrop: '#000000',
      radius: 0,
      dragHandle: false,
      closeButton: true,
      safeArea: true,
      usesOverlayToken: false,
    },
    recommendation: 'move-to-screen',
    note: 'Fullscreen map modal — move to RootStack screen.',
    demo: { kind: 'demo-fullscreen' },
    placeholder: '🗺️  Map picker',
  },
  {
    id: 'fullscreen-map-editlocation',
    name: 'Edit location · Map',
    source: 'features/locations/screens/EditLocationScreen.tsx:634',
    category: 'Fullscreen',
    attributes: {
      animationType: 'slide',
      transparent: false,
      backdrop: '#000000',
      radius: 0,
      dragHandle: false,
      closeButton: true,
      safeArea: true,
      usesOverlayToken: false,
    },
    recommendation: 'move-to-screen',
    note: 'Fullscreen map modal — move to RootStack screen.',
    demo: { kind: 'demo-fullscreen' },
    placeholder: '🗺️  Map picker',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const CATEGORY_ORDER: GalleryCategory[] = [
  'Canonical',
  'Legacy bottom sheets',
  'Centered dialogs',
  'Dropdown / popover',
  'Special',
  'Fullscreen',
];

export interface RecommendationMeta {
  label: string;
  /** key into theme.colors, or a literal hex for move-to-screen */
  color: string;
}

export const RECOMMENDATION_META: Record<Recommendation, RecommendationMeta> = {
  canonical: { label: 'Canonical', color: 'success' },
  'migrate-bottomsheet': { label: '→ AppBottomSheet', color: 'accent' },
  'migrate-modal': { label: '→ AppModal', color: 'info' },
  'token-align': { label: 'Token-align', color: 'neutral' },
  'move-to-screen': { label: '→ Screen', color: 'purple' },
};
