/**
 * Navigation Types
 * Based on app-logic.json navigation structure
 * 
 * Two navigation modes:
 * - Personal Mode: Home, Activity, Profile (Inbox via overlay)
 * - Business Mode: Inbox, Deliveries, Products, Invoices, Profile (Explore via overlay)
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { DeliveryViewType } from './delivery';

// ========== Delivery Detail View Types ==========

/**
 * View type for DeliveryDetailScreen routing
 * - client: Business that made the order (read-only view)
 * - supplier: Business fulfilling the order (full control)
 * - self: Manual order for self-delivery (full control, no other party)
 * - staff: Staff assigned to the delivery (limited operational view)
 */
export type DeliveryDetailViewType = 'client' | 'supplier' | 'self' | 'staff';

// ========== Shared Types for Registration Flow ==========

/**
 * Registration user data passed between screens
 */
export interface RegistrationUserData {
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
  email?: string;
}

/**
 * Business basic data for registration
 */
export interface BusinessBasicData {
  name: string;
  type: string;
  category?: string;
  phone: string;
  countryCode: string;
  email?: string;
  website?: string;
}

/**
 * Business location data
 */
export interface BusinessLocationData {
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Full business data for final step
 */
export interface FullBusinessData extends BusinessBasicData {
  location: BusinessLocationData;
  businessHours: {
    day: string;
    isOpen: boolean;
    timeSlots: { open: string; close: string }[];
  }[];
}

/**
 * Auth data passed after registration (before final login)
 */
export interface PendingAuthData {
  user: Record<string, unknown>;
  token: string;
  refreshToken: string;
  businesses?: Record<string, unknown>[];
}

// ========== Personal Mode Tab Navigator ==========

/**
 * Personal mode tabs
 * For individuals browsing, chatting, and viewing activity
 * Note: Inbox is now an overlay accessed from Home header, not a tab
 */
export type PersonalTabParamList = {
  Home: undefined;
  Inbox: undefined;
  PersonalNotifications: undefined; // Notifications tab (mode-aware NotificationsScreen)
  Activities: undefined;
  PersonalProfile: undefined;
};

// ========== Business Mode Tab Navigator ==========

/**
 * Business mode tabs (Pro Mode)
 * Tabs: Home (dashboard) · Explore (feed) · Inbox · Profile.
 * The full Activities timeline opens as the RootStack `AllActivity` screen
 * (reached via "See all" on the Home screen).
 * Deliveries / Products / Invoices live in the sidebar and open as RootStack screens.
 * Visible tab order: Inbox · Notifications · Analytics (BusinessHome) · Explore · Profile.
 */
export type BusinessTabParamList = {
  BusinessInbox: undefined; // Business inbox with activity timeline and chats
  BusinessNotifications: undefined; // Notifications tab (mode-aware NotificationsScreen)
  BusinessHome: undefined; // "Analytics" — dashboard: KPIs, priority queue, quick actions, recent activity
  BusinessExplore: undefined; // Feed / discovery
  BusinessProfile: undefined;

  // Workspace pages opened from the sidebar — registered here as hidden tabs
  // (no button in the bottom bar) so they keep the bottom nav bar visible and
  // show the hamburger (not a back button) at their tab root. Their detail/create
  // screens stay in RootStackParamList. These route names are intentionally also
  // present in RootStackParamList so existing `navigate('X')` call sites keep
  // type-checking against the global RootParamList.
  Deliveries: { segment?: DeliveryViewType } | undefined;
  DeliveriesAnalytics: { locationId?: string } | undefined;
  MyDeliveries: undefined;
  LogisticsOverview: undefined;
  Issues: undefined;
  Returns: undefined;
  Routes: undefined;
  Transfers: { segment?: string } | undefined;
  Products: undefined;
  Categories: undefined;
  Brands: undefined;
  Collections: undefined;
  Customers: undefined;
  Discounts: undefined;
  Stock: undefined;
  ProductVisibility: undefined;
  PriceLists: undefined;
  Invoices: { initialTab?: 'invoices' | 'estimates' } | undefined;
  Orders: { initialTab?: 'incoming' | 'outgoing' } | undefined;

  // Settings pages that also live in the shell (sidebar → hamburger + bottom bar)
  TeamManagement: { businessId: string } | undefined;
  Locations: undefined;
  CompanySettings: undefined;
  // Sidebar-only alias of SubscriptionPlansScreen so the page shows the shell
  // (bottom bar + hamburger) when opened from the sidebar, while the RootStack
  // `SubscriptionPlans` route keeps a back button for the in-app "Upgrade" buttons.
  SubscriptionHub: undefined;
  // Design System showroom — catalogs every modal/bottom-sheet surface (sidebar).
  BottomSheetGallery: undefined;
  // Design System showroom — catalogs every chat message bubble type (sidebar).
  MessageGallery: undefined;
  // Design System showroom — live showcase of every button/control (sidebar).
  ButtonGallery: undefined;
  // Design System showroom — gallery of the app's product screens / states (sidebar).
  ProductGallery: undefined;
};

// ========== Root Stack Navigator ==========

/**
 * Root stack contains all screens including:
 * - Tab navigators (Personal and Business)
 * - Shared screens accessible from both modes
 * - Modal screens
 */
export type RootStackParamList = {
  // Main Tab Navigator (handles mode switching internally)
  MainTabs: undefined;
  
  // Overlay Screens (slide from right, no tab bar)
  InboxOverlay: undefined; // Personal mode: chat list
  ExploreOverlay: undefined; // Business mode: feed/explore content
  Notifications: undefined;

  // Business workspace list screens (opened from the sidebar; previously bottom tabs)
  Deliveries: { segment?: DeliveryViewType } | undefined;
  DeliveriesAnalytics: { locationId?: string } | undefined;
  MyDeliveries: undefined;
  LogisticsOverview: undefined;
  Issues: undefined;
  IssueDetail: { issueId: string };
  Returns: undefined;
  ReturnDetail: { returnId: string };
  Routes: undefined;
  RouteDetail: { routeId: string };
  TransferDetail: { transferId: string };
  Products: undefined;
  Invoices: { initialTab?: 'invoices' | 'estimates' } | undefined;
  
  // Chat screens
  Chat: {
    id: string;
    name: string;
    isGroup: boolean;
    avatar?: string;
    partnerId: string;
    partnerType: 'user' | 'business' | 'group';
    highlightMessage?: boolean;
    searchQuery?: string;
    scrollToMessage?: boolean;
    unreadCount?: number;
  };
  
  // Business profile (viewing others)
  ViewBusinessProfile: { businessId: string; expandBrandId?: string };
  
  // User profile (viewing others)
  ViewUserProfile: { userId: string };

  // Own personal profile (standalone push; tab version lives in PersonalTabNavigator)
  MyProfile: undefined;
  
  // Product screens
  CreateProduct: { selectedBrand?: string; selectedBrandId?: string; product?: import('./product').UIProduct };
  ProductDetail: { productId: string };
  // Design System: static showcase of a new premium product-detail UI (from Figma).
  ProductDetailShowcase: undefined;
  ProductsSearch: { query?: string; filter?: 'myProducts' | 'myBrands' | 'allProducts' | 'allBrands'; category?: string };
  Categories: undefined;
  Stock: undefined;
  ProductVisibility: undefined;

  // Price list screens (customer-specific pricing)
  PriceLists: undefined;
  CreatePriceList: { manage?: boolean; listId?: string } | undefined;
  AssignCustomers: { listId: string };

  // Collection screens (internal product groupings)
  Collections: undefined;
  CreateCollection: { manage?: boolean; collectionId?: string } | undefined;

  // Customer screens (sell-side CRM directory)
  Customers: undefined;
  CustomerDetail: { customerId: string };
  AddCustomer: { customerId?: string } | undefined;

  // Discount screens (promotions + coupon codes)
  Discounts: undefined;
  CreateDiscount: { discountId?: string } | undefined;

  // Brand screens
  Brands: undefined;
  CreateBrand: {
    selectedProducts?: { id: string; name: string; price: number; brandName: string }[];
    brand?: { id: string; name: string; logoUrl?: string | null; description?: string | null };
    manage?: boolean;
  };
  BrandSelection: { selectedBrand?: string };
  SelectProductsForBrand: { 
    brandName: string;
    selectedProducts?: { id: string; name: string; price: number; brandName: string }[];
  };
  
  // Orders & Cart screens (B2B ordering)
  Orders: { initialTab?: 'incoming' | 'outgoing' } | undefined;
  OrderDetails: { orderId: string };
  Cart: { businessId: string; businessName?: string };
  PlaceOrder: { businessId: string; businessName: string };

  // Invoice screens
  CreateInvoice: { type?: 'invoice' | 'estimate'; invoiceId?: string; presetCustomer?: { id: string; name: string; email?: string | null; phone?: string | null; address?: string | null; customerBusinessId?: string | null } };
  InvoiceDetails: { invoiceId: string };
  ReceivedPayments: { 
    invoiceId: string; 
    totalAmount: number; 
    paidAmount: number;
    currency?: string;
  };
  
  // Delivery screens
  // Transfers is now a first-class screen on the dedicated Transfer entity
  Transfers: { segment?: string } | undefined;
  DeliveryDetail: {
    deliveryId: string;
    /** Optional override for view type detection */
    viewAs?: 'client' | 'supplier' | 'self' | 'staff';
    /** If true, shows Accept/Reject buttons for pending order requests */
    requireAccept?: boolean;
  };
  CreateDelivery: { orderId?: string; mode?: 'delivery' | 'transfer' };
  PersonalDeliveryDetail: { taskId: string; businessId: string; hasFullAccess: boolean };
  
  // Search screens
  CompanySearch: { query: string };
  UserSearch: { query: string };
  
  // Group chat creation
  CreateGroupChat: {
    selectedContactIds: string[];
    companyId?: string;
  };
  
  // Settings screens
  Settings: undefined;
  PersonalSettings: undefined;
  BusinessSettings: undefined;
  ChangePassword: undefined;
  SecuritySettings: undefined;
  DeleteAccount: undefined;
  ProfileSettings: undefined;
  PersonalProfileSettings: undefined;
  TwoFactorAuth: undefined;
  BiometricLogin: undefined;
  NotificationPreferences: undefined;
  SubscriptionSettings: undefined;
  
  // Team management
  TeamManagement: { businessId: string } | undefined;
  InviteStaff: undefined;
  RoleRequests: undefined;
  
  // Locations & Transports
  Locations: undefined;
  AddLocation: undefined;
  EditLocation: { locationId: string };
  Transports: undefined;
  AddTransport: undefined;
  
  // Subscription
  Subscription: undefined;
  SubscriptionPlans: undefined;

  // Payments
  PaymentHistory: undefined;
  CheckoutScreen: { checkoutUrl: string; paymentType: 'SUBSCRIPTION' | 'INVOICE_PAYMENT'; checkoutId: string };
  
  // Business creation/editing
  CreateBusiness: undefined;
  EditBusiness: { businessId: string };
  CompanySettings: undefined;
  CompanyEdit: undefined;
  
  // Profile editing
  EditPersonalProfile: undefined;
  AddWorkExperience: undefined;
  EditWorkExperience: { experienceId: string };
  AddEducation: undefined;
  EditEducation: { educationId: string };
  AddCertification: undefined;
  EditCertification: { certificationId: string };
  SkillsManagement: undefined;
  PublicProfile: { slug: string };

  // Tasks
  Tasks: undefined;
  CreateTask: { businessId: string; linkedOrderId?: string; linkedDeliveryId?: string; linkedInvoiceId?: string };
  EditTask: { taskId: string; businessId: string };
  TaskDetail: { taskId: string; businessId: string };
  
  // Social screens (Connections)
  Connections: { userId: string };
  
  // Business Activity
  AllActivity: undefined;

  // Explore — Opportunities (B2B requests / "looking for")
  Opportunities: undefined;
  OpportunityDetail: { opportunityId: string };
  CreateOpportunity: { businessId: string };

  // Explore — Events
  Events: undefined;
  EventDetail: { eventId: string };
  CreateEvent: { businessId: string };

  // Reusable "Coming soon" placeholder for not-yet-built features
  ComingSoon: { title: string };

  // Procurement screens
  ProcurementDashboard: undefined;
  Suppliers: undefined;
  AddSupplier: { supplierBusinessId?: string; supplierId?: string };
  SupplierDetail: { supplierId: string };
  SupplierProducts: { supplierId: string; supplierName?: string };
  PurchaseRequests: undefined;
  CreatePurchaseRequest: { supplierId?: string; productId?: string; supplierName?: string };
  PurchaseRequestDetail: { requestId: string };
  PurchaseOrders: undefined;
  CreatePurchaseOrder: { purchaseRequestId?: string; supplierId?: string; supplierName?: string; productId?: string };
  PurchaseOrderDetail: { orderId: string };
  GoodsReceipt: { purchaseOrderId: string };
  
  // Feedback screens
  FeedbackCategories: undefined;
  AddSuggestion: { defaultCategoryId?: string } | undefined;
  
  // Auth screens (if needed)
  Auth: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Business Registration (accessible from ProfileSwitcher)
  BusinessBasicInfo: { fromProfileSwitcher?: boolean };
  
  // Join Company (accessible from onboarding notifications)
  SelectCompany: { fromOnboarding?: boolean; pendingAuth?: PendingAuthData };
  BusinessLocation: { 
    businessData: BusinessBasicData;
    fromProfileSwitcher?: boolean;
  };
  BusinessHours: { 
    businessData: BusinessBasicData;
    location: BusinessLocationData;
    fromProfileSwitcher?: boolean;
  };
  UploadBusinessLogo: { 
    businessData: FullBusinessData;
    fromProfileSwitcher?: boolean;
  };
};

// ========== Auth Stack Navigator ==========

export type AuthStackParamList = {
  // Launch screen
  Launch: undefined;
  
  // Login
  Login: undefined;
  ForgotPassword: undefined;
  TwoFactorVerify: { tempToken: string };
  
  // Personal Registration Flow
  CreateAccount: undefined;
  PhoneVerification: { 
    userData: RegistrationUserData;
    verificationMethod: 'phone';
  };
  EmailVerification: { 
    userData: RegistrationUserData;
    verificationMethod: 'email';
  };
  CreatePassword: { 
    userData: RegistrationUserData;
  };
  UploadProfilePicture: {
    userData: RegistrationUserData;
  };
  ChoosePath: {
    pendingAuth: import('./navigation').PendingAuthData;
  };
  
  // Join Company Flow
  SelectCompany: { 
    pendingAuth?: import('./navigation').PendingAuthData;
    fromOnboarding?: boolean;
  };
  
  // Business Registration Flow
  BusinessBasicInfo: { 
    fromProfileSwitcher?: boolean;
    pendingAuth?: import('./navigation').PendingAuthData;
  };
  BusinessLocation: { 
    businessData: BusinessBasicData;
    fromProfileSwitcher?: boolean;
    pendingAuth?: import('./navigation').PendingAuthData;
  };
  BusinessHours: { 
    businessData: BusinessBasicData;
    location: BusinessLocationData;
    fromProfileSwitcher?: boolean;
    pendingAuth?: import('./navigation').PendingAuthData;
  };
  UploadBusinessLogo: {
    businessData: FullBusinessData;
    fromProfileSwitcher?: boolean;
    pendingAuth?: import('./navigation').PendingAuthData;
  };

  // Legal
  Terms: undefined;
  Privacy: undefined;
};

// ========== Screen Props Types ==========

// Root Stack screen props
export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

// Personal Tab screen props
export type PersonalTabScreenProps<T extends keyof PersonalTabParamList> = 
  CompositeScreenProps<
    BottomTabScreenProps<PersonalTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

// Business Tab screen props
export type BusinessTabScreenProps<T extends keyof BusinessTabParamList> = 
  CompositeScreenProps<
    BottomTabScreenProps<BusinessTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

// Auth Stack screen props
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = 
  NativeStackScreenProps<AuthStackParamList, T>;

// ========== Navigation Type Helpers ==========

/**
 * Use this to get typed navigation in components
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
