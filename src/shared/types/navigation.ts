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
  businesses?: Array<Record<string, unknown>>;
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
  Activities: undefined;
  PersonalProfile: undefined;
};

// ========== Business Mode Tab Navigator ==========

/**
 * Business mode tabs (Pro Mode)
 * For businesses performing operational tasks
 * Note: Explore (feed) is now an overlay accessed from Inbox header, not a tab
 */
export type BusinessTabParamList = {
  BusinessInbox: undefined; // Business inbox with activity timeline and chats
  Deliveries: undefined;
  Products: undefined;
  Invoices: undefined;
  BusinessProfile: undefined;
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
  
  // Product screens
  CreateProduct: { selectedBrand?: string; selectedBrandId?: string; product?: import('./product').UIProduct };
  ProductDetail: { productId: string };
  
  // Brand screens
  CreateBrand: { selectedProducts?: { id: string; name: string; price: number; brandName: string }[] };
  BrandSelection: { selectedBrand?: string };
  SelectProductsForBrand: { 
    brandName: string;
    selectedProducts?: { id: string; name: string; price: number; brandName: string }[];
  };
  
  // Invoice screens
  CreateInvoice: { type?: 'invoice' | 'estimate'; invoiceId?: string };
  InvoiceDetails: { invoiceId: string };
  ReceivedPayments: { 
    invoiceId: string; 
    totalAmount: number; 
    paidAmount: number;
    currency?: string;
  };
  
  // Delivery screens
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
  FeedbackList: { categoryId: string; categoryTitle: string };
  AddSuggestion: { categoryId: string; categoryTitle: string };
  
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
