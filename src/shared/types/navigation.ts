/**
 * Navigation Types
 * Based on app-logic.json navigation structure
 * 
 * Two navigation modes:
 * - Personal Mode: Home, Explore, Inbox, Activity, Profile
 * - Business Mode: Inbox, Deliveries, Products, Invoices, Business
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// ========== Personal Mode Tab Navigator ==========

/**
 * Personal mode tabs
 * For individuals browsing, chatting, and viewing activity
 * Note: Inbox is now an overlay accessed from Home header, not a tab
 */
export type PersonalTabParamList = {
  Home: undefined;
  Explore: undefined;
  Activity: undefined;
  PersonalProfile: undefined;
};

// ========== Business Mode Tab Navigator ==========

/**
 * Business mode tabs (Pro Mode)
 * For businesses performing operational tasks
 * Note: Inbox is now an overlay accessed from Home header, not a tab
 */
export type BusinessTabParamList = {
  BusinessHome: undefined; // NEW - Business dashboard
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
  InboxOverlay: undefined;
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
  CreateProduct: { selectedBrand?: string; product?: import('./product').UIProduct };
  ProductDetail: { productId: string };
  
  // Brand screens
  CreateBrand: undefined;
  BrandSelection: undefined;
  
  // Invoice screens
  CreateInvoice: { type?: 'invoice' | 'estimate' };
  InvoiceDetails: { invoiceId: string };
  
  // Delivery screens
  DeliveryDetail: { deliveryId: string };
  CreateDelivery: { orderId?: string; mode?: 'delivery' | 'transfer' };
  PersonalDeliveryDetail: { taskId: string; businessId: string; hasFullAccess: boolean };
  
  // Search screens
  CompanySearch: { query: string };
  UserSearch: { query: string };
  
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
  SubscriptionSettings: undefined;
  
  // Team management
  TeamManagement: undefined;
  InviteStaff: undefined;
  
  // Locations & Transports
  Locations: undefined;
  AddLocation: undefined;
  Transports: undefined;
  AddTransport: undefined;
  
  // Subscription
  Subscription: undefined;
  SubscriptionPlans: undefined;
  
  // Business creation/editing
  CreateBusiness: undefined;
  EditBusiness: { businessId: string };
  CompanySettings: undefined;
  CompanyEdit: undefined;
  
  // Profile editing
  EditPersonalProfile: undefined;
  AddWorkExperience: undefined;
  EditWorkExperience: { businessId: string };
  
  // Social screens (Connections)
  Connections: { userId: string };
  
  // Business Activity
  AllActivity: undefined;
  
  // Feedback screens
  FeedbackCategories: undefined;
  FeedbackList: { categoryId: string; categoryTitle: string };
  AddSuggestion: { categoryId: string; categoryTitle: string };
  
  // Auth screens (if needed)
  Auth: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// ========== Auth Stack Navigator ==========

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
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
