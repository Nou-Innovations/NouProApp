/**
 * NouPro App - Main Entry Point
 * 
 * Implements:
 * - Animated 5-stage launch screen
 * - Auth flow (Login/Register)
 * - Dual-mode navigation (Personal/Business)
 */

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './tailwind.css';
import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer, Theme, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, useDrawerProgress } from '@react-navigation/drawer';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, SharedValue } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import { View, StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

// Match the Figma design exactly: render text at the exact px we set and do NOT
// let the OS "Text Size" / accessibility setting scale fonts (RN defaults to
// allowFontScaling=true, which makes 14/16px render larger on devices whose text
// size is above default). Set once at module load, before any Text renders.
((RNText as any).defaultProps ||= {}).allowFontScaling = false;
((RNTextInput as any).defaultProps ||= {}).allowFontScaling = false;

// Theme & Context
import theme from '@/shared/theme';
import { ThemeProvider, useTheme } from '@/shared/theme/ThemeProvider';
import { NotificationProvider } from '@/shared/context/NotificationContext';
import ErrorBoundary from '@/shared/components/ui/ErrorBoundary';
import { AppDialogHost } from '@/shared/components/ui';

// Stores
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';

// Navigation
import { PersonalTabNavigator } from '@/navigation/PersonalTabNavigator';
import { BusinessTabNavigator } from '@/navigation/BusinessTabNavigator';
import SidebarContent from '@/navigation/SidebarContent';

// Services
import { userAvatarService } from '@/shared/services/userAvatarService';
import { offlineQueue } from '@/features/inbox/services/offlineQueue';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { authAPI } from '@/shared/services/api';

// Screens - Auth
import LoginScreen from '@/features/auth/screens/LoginScreen';
import CreateAccountScreen from '@/features/auth/screens/CreateAccountScreen';
import PhoneVerificationScreen from '@/features/auth/screens/PhoneVerificationScreen';
import EmailVerificationScreen from '@/features/auth/screens/EmailVerificationScreen';
import CreatePasswordScreen from '@/features/auth/screens/CreatePasswordScreen';
import UploadProfilePictureScreen from '@/features/auth/screens/UploadProfilePictureScreen';
import ChoosePathScreen from '@/features/auth/screens/ChoosePathScreen';
import SelectCompanyScreen from '@/features/auth/screens/SelectCompanyScreen';
import BusinessBasicInfoScreen from '@/features/auth/screens/BusinessBasicInfoScreen';
import BusinessLocationScreen from '@/features/auth/screens/BusinessLocationScreen';
import BusinessHoursScreen from '@/features/auth/screens/BusinessHoursScreen';
import UploadBusinessLogoScreen from '@/features/auth/screens/UploadBusinessLogoScreen';
import ForgotPasswordScreen from '@/features/auth/screens/ForgotPasswordScreen';
import TwoFactorVerifyScreen from '@/features/auth/screens/TwoFactorVerifyScreen';
import TermsScreen from '@/features/auth/screens/TermsScreen';
import PrivacyScreen from '@/features/auth/screens/PrivacyScreen';
import LaunchScreenWrapper from '@/features/auth/screens/LaunchScreenWrapper';

// Screens - Inbox
import ChatScreen from '@/features/inbox/screens/ChatScreen';
import InboxOverlayScreen from '@/features/inbox/screens/InboxOverlayScreen';
import CreateGroupChatScreen from '@/features/inbox/screens/CreateGroupChatScreen';

// Screens - Invoices
import CreateInvoiceScreen from '@/features/invoices/screens/CreateInvoiceScreen';
import InvoiceDetailsScreen from '@/features/invoices/screens/InvoiceDetailsScreen';
import ReceivedPaymentsScreen from '@/features/invoices/screens/ReceivedPaymentsScreen';

// Screens - Orders & Cart (OrdersScreen is a hidden tab in BusinessTabNavigator)
import OrderDetailsScreen from '@/features/orders/screens/OrderDetailsScreen';
import CartScreen from '@/features/orders/screens/CartScreen';
import PlaceOrderScreen from '@/features/orders/screens/PlaceOrderScreen';

// Screens - Profile
import BusinessProfileScreen from '@/features/profile/screens/BusinessProfileScreen';
import UserProfileScreen from '@/features/profile/screens/UserProfileScreen';

// Screens - Pricing (price lists)
import CreatePriceListScreen from '@/features/pricing/screens/CreatePriceListScreen';
import AssignCustomersScreen from '@/features/pricing/screens/AssignCustomersScreen';
// Screens - Collections
import { CreateCollectionScreen } from '@/features/collections';
// Screens - Customers
import { CustomerDetailScreen, AddCustomerScreen } from '@/features/customers';
// Screens - Brands
import CreateBrandScreen from '@/features/brands/screens/CreateBrandScreen';
import BrandSelectionScreen from '@/features/brands/screens/BrandSelectionScreen';
import SelectProductsForBrandScreen from '@/features/brands/screens/SelectProductsForBrandScreen';

// Screens - Products
import CreateProductScreen from '@/features/products/screens/CreateProductScreen';
import ProductDetailScreen from '@/features/products/screens/ProductDetailScreen';
import ProductDetailShowcaseScreen from '@/features/products/screens/ProductDetailShowcaseScreen';
import ProductsSearchScreen from '@/features/products/screens/ProductsSearchScreen';

// Screens - Company & Search
import CompanySearchScreen from '@/features/company/screens/CompanySearchScreen';
import UserSearchScreen from '@/features/search/screens/UserSearchScreen';
import CompanyEditScreen from '@/features/company/screens/CompanyEditScreen';

// Screens - Deliveries
import DeliveryDetailScreen from '@/features/deliveries/screens/DeliveryDetailScreen';
import CreateDeliveryScreen from '@/features/deliveries/screens/CreateDeliveryScreen';

// Screens - Procurement
import ProcurementDashboardScreen from '@/features/procurement/screens/ProcurementDashboardScreen';
import SuppliersScreen from '@/features/procurement/screens/SuppliersScreen';
import AddSupplierScreen from '@/features/procurement/screens/AddSupplierScreen';
import SupplierDetailScreen from '@/features/procurement/screens/SupplierDetailScreen';
import SupplierProductsScreen from '@/features/procurement/screens/SupplierProductsScreen';
import PurchaseRequestsScreen from '@/features/procurement/screens/PurchaseRequestsScreen';
import CreatePurchaseRequestScreen from '@/features/procurement/screens/CreatePurchaseRequestScreen';
import PurchaseRequestDetailScreen from '@/features/procurement/screens/PurchaseRequestDetailScreen';
import PurchaseOrdersScreen from '@/features/procurement/screens/PurchaseOrdersScreen';
import CreatePurchaseOrderScreen from '@/features/procurement/screens/CreatePurchaseOrderScreen';
import PurchaseOrderDetailScreen from '@/features/procurement/screens/PurchaseOrderDetailScreen';
import GoodsReceiptScreen from '@/features/procurement/screens/GoodsReceiptScreen';

// Screens - Notifications
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';

// Screens - Shared
import ComingSoonScreen from '@/shared/screens/ComingSoonScreen';

// Screens - Explore (Opportunities)
import { OpportunitiesScreen, OpportunityDetailScreen, CreateOpportunityScreen } from '@/features/opportunities';

// Screens - Explore (Events)
import { EventsScreen, EventDetailScreen, CreateEventScreen } from '@/features/events';

// Screens - Business workspace detail screens (the list pages are now hidden tabs in
// BusinessTabNavigator; only their push-over detail screens remain in the RootStack).
import IssueDetailScreen from '@/features/issues/screens/IssueDetailScreen';
import ReturnDetailScreen from '@/features/returns/screens/ReturnDetailScreen';
import RouteDetailScreen from '@/features/routes/screens/RouteDetailScreen';
import TransferDetailScreen from '@/features/transfers/screens/TransferDetailScreen';

// Screens - Personal (from modes)
import PersonalProfileScreen from '@/modes/personal/screens/PersonalProfileScreen';
import EditPersonalProfileScreen from '@/modes/personal/screens/EditPersonalProfileScreen';
import AddWorkExperienceScreen from '@/modes/personal/screens/AddWorkExperienceScreen';
import EditWorkExperienceScreen from '@/modes/personal/screens/EditWorkExperienceScreen';
import PersonalSettingsScreen from '@/modes/personal/screens/PersonalSettingsScreen';
import PersonalDeliveryDetailScreen from '@/modes/personal/screens/PersonalDeliveryDetailScreen';

// Screens - Professional Profile & Tasks
import AddEducationScreen from '@/features/profile/screens/AddEducationScreen';
import EditEducationScreen from '@/features/profile/screens/EditEducationScreen';
import AddCertificationScreen from '@/features/profile/screens/AddCertificationScreen';
import EditCertificationScreen from '@/features/profile/screens/EditCertificationScreen';
import SkillsManagementScreen from '@/features/profile/screens/SkillsManagementScreen';
import TasksScreen from '@/features/tasks/screens/TasksScreen';
import CreateTaskScreen from '@/features/tasks/screens/CreateTaskScreen';
import TaskDetailScreen from '@/features/tasks/screens/TaskDetailScreen';

// Screens - Settings
import ChangePasswordScreen from '@/features/settings/screens/ChangePasswordScreen';
import SecuritySettingsScreen from '@/features/settings/screens/SecuritySettingsScreen';
import DeleteAccountScreen from '@/features/settings/screens/DeleteAccountScreen';
import ProfileSettingsScreen from '@/features/settings/screens/ProfileSettingsScreen';
import PersonalProfileSettingsScreen from '@/features/settings/screens/PersonalProfileSettingsScreen';
import TwoFactorAuthScreen from '@/features/settings/screens/TwoFactorAuthScreen';
import BiometricLoginScreen from '@/features/settings/screens/BiometricLoginScreen';
import NotificationPreferencesScreen from '@/features/notifications/screens/NotificationPreferencesScreen';

// Screens - Business Activity & Explore
import { AllActivityScreen, BusinessExploreScreen } from '@/modes/business/screens';

// Screens - Subscription
import { SubscriptionPlansScreen } from '@/features/subscription';
import { CheckoutScreen, PaymentHistoryScreen } from '@/features/payments';

// Screens - Feedback
import { FeedbackCategoriesScreen, AddSuggestionScreen } from '@/features/feedback';

// Screens - Business/Team (TeamManagement is a hidden tab in BusinessTabNavigator)
import InviteStaffScreen from '@/features/team/screens/InviteStaffScreen';
import RoleRequestsScreen from '@/features/team/screens/RoleRequestsScreen';

// Screens - Locations & Transports (Locations is a hidden tab in BusinessTabNavigator)
import AddLocationScreen from '@/features/locations/screens/AddLocationScreen';
import EditLocationScreen from '@/features/locations/screens/EditLocationScreen';
import TransportsScreen from '@/features/transports/screens/TransportsScreen';
import AddTransportScreen from '@/features/transports/screens/AddTransportScreen';

// Screens - Connections
import ConnectionsScreen from '@/features/connections/screens/ConnectionsScreen';

// Types
import { RootStackParamList, AuthStackParamList } from '@/shared/types/navigation';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Reloading the app might trigger some race conditions, ignore them */
});

// ========== Constants ==========

/** Launch screen background color - must match app.json splash backgroundColor */
const LAUNCH_BACKGROUND = '#1A1714';

// ========== Stack Navigators ==========

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// ========== Navigation Theme ==========

const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: '#FF7A00',
    background: '#1A1714',
    card: '#1A1714',
    text: '#FFFFFF',
    border: '#332E2A',
    notification: '#FF7A00',
  },
};

// ========== Navigators ==========

/**
 * Main Tab Navigator - Renders either Personal or Business tabs based on active mode
 */
function MainTabNavigator() {
  const activeMode = useProfileStore((state) => state.activeMode);
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const switchToPersonal = useProfileStore((state) => state.switchToPersonal);
  
  useEffect(() => {
    if (activeMode === 'business' && currentUserRole === 'staff') {
      switchToPersonal();
    }
  }, [activeMode, currentUserRole, switchToPersonal]);
  
  if (activeMode === 'business' && currentUserRole !== 'staff') {
    return <BusinessTabNavigator />;
  }

  return <PersonalTabNavigator />;
}

/**
 * AnimatedTabs - Threads-style scene wrapper.
 * As the drawer opens, the screen slides aside (handled by drawerType: 'back')
 * while this wrapper scales it down into a rounded, shadowed card that reveals
 * the sidebar sitting behind it.
 */
function AnimatedTabs() {
  const { theme: appTheme } = useTheme();
  const progress = useDrawerProgress() as SharedValue<number>;

  const cardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [{ scale: interpolate(p, [0, 1], [1, 0.92], Extrapolation.CLAMP) }],
      borderRadius: interpolate(p, [0, 1], [0, 28], Extrapolation.CLAMP),
    };
  });

  const clipStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(progress.value, [0, 1], [0, 28], Extrapolation.CLAMP),
  }));

  return (
    // Surface-colored backdrop sits behind the card so the gaps revealed as it scales match the sidebar.
    <View style={{ flex: 1, backgroundColor: appTheme.colors.surface }}>
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: appTheme.colors.background,
            transformOrigin: 'left center',
          },
          cardStyle,
        ]}
      >
        <Animated.View style={[{ flex: 1, overflow: 'hidden' }, clipStyle]}>
          <MainTabNavigator />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * Main Drawer Navigator - wraps the tab navigator in a sidebar drawer.
 * The drawer is opened by the hamburger icon on the home headers or by an
 * edge-swipe gesture. Its content is rendered by SidebarContent.
 */
const MainDrawer = createDrawerNavigator();
function MainDrawerNavigator() {
  return (
    <MainDrawer.Navigator
      drawerContent={(props) => <SidebarContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'back', // screen slides aside to reveal the sidebar behind it (Threads-style)
        drawerPosition: 'left',
        swipeEnabled: true,
        swipeEdgeWidth: 60, // edge-swipe only — avoids conflicts with horizontal content
        drawerStyle: { width: '80%', backgroundColor: '#FAF8F5' },
        overlayColor: 'transparent', // don't darken the home screen as the drawer opens
      }}
    >
      <MainDrawer.Screen name="Tabs" component={AnimatedTabs} />
    </MainDrawer.Navigator>
  );
}

/**
 * Auth Navigator - Launch/Login/Register flow
 */
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Launch"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {/* Launch Screen */}
      <AuthStack.Screen 
        name="Launch" 
        component={LaunchScreenWrapper}
        options={{
          animation: 'none', // No animation for initial screen
        }}
      />
      
      {/* Login */}
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="TwoFactorVerify" component={TwoFactorVerifyScreen} />
      
      {/* Personal Registration Flow */}
      <AuthStack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <AuthStack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
      <AuthStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <AuthStack.Screen name="CreatePassword" component={CreatePasswordScreen} />
      <AuthStack.Screen name="UploadProfilePicture" component={UploadProfilePictureScreen} />
      <AuthStack.Screen name="ChoosePath" component={ChoosePathScreen} />
      
      {/* Join Company Flow */}
      <AuthStack.Screen name="SelectCompany" component={SelectCompanyScreen} />
      
      {/* Business Registration Flow */}
      <AuthStack.Screen name="BusinessBasicInfo" component={BusinessBasicInfoScreen} />
      <AuthStack.Screen name="BusinessLocation" component={BusinessLocationScreen} />
      <AuthStack.Screen name="BusinessHours" component={BusinessHoursScreen} />
      <AuthStack.Screen name="UploadBusinessLogo" component={UploadBusinessLogoScreen} />

      {/* Legal */}
      <AuthStack.Screen name="Terms" component={TermsScreen} />
      <AuthStack.Screen name="Privacy" component={PrivacyScreen} />
    </AuthStack.Navigator>
  );
}

/**
 * Main App Navigator - Contains all authenticated screens
 */
function AppNavigator() {
  const { isDarkMode, theme: appTheme } = useTheme();
  
  const navTheme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      background: appTheme.colors.background,
      card: appTheme.colors.background,
    },
  };

  // Deep-linking: resolves noupro:// links (and the production https base) to
  // the relevant in-app screens. Matches the "scheme" declared in app.json.
  const linking = {
    prefixes: ['noupro://', 'https://nouproapp.onrender.com'],
    config: {
      screens: {
        OrderDetails: 'orders/:orderId',
        InvoiceDetails: 'invoices/:invoiceId',
      },
    },
  };

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <RootStack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        {/* Main Tab Navigator (wrapped in sidebar drawer) */}
        <RootStack.Screen name="MainTabs" component={MainDrawerNavigator} />
        
        {/* Chat Screen */}
        <RootStack.Screen 
          name="Chat" 
          component={ChatScreen} 
          options={{ headerShown: false }}
        />
        
        {/* Overlay Screens */}
        <RootStack.Screen 
          name="InboxOverlay" 
          component={InboxOverlayScreen} 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />
        <RootStack.Screen 
          name="ExploreOverlay" 
          component={BusinessExploreScreen} 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />
        <RootStack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />
        
        {/* Profile Screens */}
        <RootStack.Screen name="ViewBusinessProfile" component={BusinessProfileScreen} />
        <RootStack.Screen name="ViewUserProfile" component={UserProfileScreen} />
        {/* Own personal profile, reachable as a standalone push (the tab version lives in PersonalTabNavigator) */}
        <RootStack.Screen name="MyProfile" component={PersonalProfileScreen} />
        <RootStack.Screen name="EditPersonalProfile" component={EditPersonalProfileScreen} />
        <RootStack.Screen name="AddWorkExperience" component={AddWorkExperienceScreen} />
        <RootStack.Screen name="EditWorkExperience" component={EditWorkExperienceScreen} />
        <RootStack.Screen name="AddEducation" component={AddEducationScreen} />
        <RootStack.Screen name="EditEducation" component={EditEducationScreen} />
        <RootStack.Screen name="AddCertification" component={AddCertificationScreen} />
        <RootStack.Screen name="EditCertification" component={EditCertificationScreen} />
        <RootStack.Screen name="SkillsManagement" component={SkillsManagementScreen} />
        <RootStack.Screen name="Tasks" component={TasksScreen} />
        <RootStack.Screen name="CreateTask" component={CreateTaskScreen} />
        <RootStack.Screen name="TaskDetail" component={TaskDetailScreen} />

        {/* Invoice Screens */}
        <RootStack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
        <RootStack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
        <RootStack.Screen name="ReceivedPayments" component={ReceivedPaymentsScreen} />

        {/* Orders & Cart Screens (Orders list is a hidden tab in BusinessTabNavigator) */}
        <RootStack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        <RootStack.Screen name="Cart" component={CartScreen} />
        <RootStack.Screen name="PlaceOrder" component={PlaceOrderScreen} />
        
        {/* Product Screens */}
        <RootStack.Screen name="CreatePriceList" component={CreatePriceListScreen} />
        <RootStack.Screen name="AssignCustomers" component={AssignCustomersScreen} />
        <RootStack.Screen name="CreateBrand" component={CreateBrandScreen} />
        <RootStack.Screen name="CreateCollection" component={CreateCollectionScreen} />
        <RootStack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
        <RootStack.Screen name="AddCustomer" component={AddCustomerScreen} />
        <RootStack.Screen name="CreateProduct" component={CreateProductScreen} />
        <RootStack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <RootStack.Screen name="ProductDetailShowcase" component={ProductDetailShowcaseScreen} />
        <RootStack.Screen name="ProductsSearch" component={ProductsSearchScreen} />
        <RootStack.Screen name="BrandSelection" component={BrandSelectionScreen} />
        <RootStack.Screen name="SelectProductsForBrand" component={SelectProductsForBrandScreen} />
        
        {/* Search Screens */}
        <RootStack.Screen name="CompanySearch" component={CompanySearchScreen} />
        <RootStack.Screen name="UserSearch" component={UserSearchScreen} />
        
        {/* Group Chat Creation */}
        <RootStack.Screen name="CreateGroupChat" component={CreateGroupChatScreen} />
        
        {/* Delivery Screens */}
        <RootStack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
        <RootStack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />

        {/* Procurement Screens */}
        <RootStack.Screen name="ProcurementDashboard" component={ProcurementDashboardScreen} />
        <RootStack.Screen name="Suppliers" component={SuppliersScreen} />
        <RootStack.Screen name="AddSupplier" component={AddSupplierScreen} />
        <RootStack.Screen name="SupplierDetail" component={SupplierDetailScreen} />
        <RootStack.Screen name="SupplierProducts" component={SupplierProductsScreen} />
        <RootStack.Screen name="PurchaseRequests" component={PurchaseRequestsScreen} />
        <RootStack.Screen name="CreatePurchaseRequest" component={CreatePurchaseRequestScreen} />
        <RootStack.Screen name="PurchaseRequestDetail" component={PurchaseRequestDetailScreen} />
        <RootStack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} />
        <RootStack.Screen name="CreatePurchaseOrder" component={CreatePurchaseOrderScreen} />
        <RootStack.Screen name="PurchaseOrderDetail" component={PurchaseOrderDetailScreen} />
        <RootStack.Screen name="GoodsReceipt" component={GoodsReceiptScreen} />

        {/* Settings Screens */}
        <RootStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <RootStack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
        <RootStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        <RootStack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
        <RootStack.Screen name="BiometricLogin" component={BiometricLoginScreen} />
        <RootStack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
        <RootStack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
        <RootStack.Screen name="PersonalProfileSettings" component={PersonalProfileSettingsScreen} />
        <RootStack.Screen name="PersonalSettings" component={PersonalSettingsScreen} />
        <RootStack.Screen name="PersonalDeliveryDetail" component={PersonalDeliveryDetailScreen} />
        {/* CompanySettings is a hidden tab in BusinessTabNavigator (sidebar shell) */}
        <RootStack.Screen name="EditBusiness" component={CompanyEditScreen} />
        
        {/* Team Management (TeamManagement list is a hidden tab in BusinessTabNavigator) */}
        <RootStack.Screen name="InviteStaff" component={InviteStaffScreen} />
        <RootStack.Screen name="RoleRequests" component={RoleRequestsScreen} />
        
        {/* Locations & Transports (Locations list is a hidden tab in BusinessTabNavigator) */}
        <RootStack.Screen name="AddLocation" component={AddLocationScreen} />
        <RootStack.Screen name="EditLocation" component={EditLocationScreen} />
        <RootStack.Screen name="Transports" component={TransportsScreen} />
        <RootStack.Screen name="AddTransport" component={AddTransportScreen} />
        
        {/* Social Screens */}
        <RootStack.Screen name="Connections" component={ConnectionsScreen} />
        
        {/* Business Activity */}
        <RootStack.Screen name="AllActivity" component={AllActivityScreen} />

        {/* Coming soon placeholder (not-yet-built features) */}
        <RootStack.Screen name="ComingSoon" component={ComingSoonScreen} />

        {/* Explore — Opportunities */}
        <RootStack.Screen name="Opportunities" component={OpportunitiesScreen} />
        <RootStack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} />
        <RootStack.Screen name="CreateOpportunity" component={CreateOpportunityScreen} />

        {/* Explore — Events */}
        <RootStack.Screen name="Events" component={EventsScreen} />
        <RootStack.Screen name="EventDetail" component={EventDetailScreen} />
        <RootStack.Screen name="CreateEvent" component={CreateEventScreen} />

        {/* Logistics / Products / Accounting list pages now live as hidden tabs in
            BusinessTabNavigator (opened from the sidebar with the bottom bar + hamburger).
            Their detail screens stay here as RootStack push screens (back button). */}
        <RootStack.Screen name="IssueDetail" component={IssueDetailScreen} />
        <RootStack.Screen name="ReturnDetail" component={ReturnDetailScreen} />
        <RootStack.Screen name="RouteDetail" component={RouteDetailScreen} />
        <RootStack.Screen name="TransferDetail" component={TransferDetailScreen} />

        {/* Subscription */}
        <RootStack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} />

        {/* Payments */}
        <RootStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        <RootStack.Screen name="CheckoutScreen" component={CheckoutScreen} options={{ presentation: 'modal' }} />
        
        {/* Feedback */}
        <RootStack.Screen name="FeedbackCategories" component={FeedbackCategoriesScreen} />
        <RootStack.Screen name="AddSuggestion" component={AddSuggestionScreen} />
        
        {/* Business Registration (from ProfileSwitcher) */}
        <RootStack.Screen name="BusinessBasicInfo" component={BusinessBasicInfoScreen} />
        <RootStack.Screen name="BusinessLocation" component={BusinessLocationScreen} />
        <RootStack.Screen name="BusinessHours" component={BusinessHoursScreen} />
        <RootStack.Screen name="UploadBusinessLogo" component={UploadBusinessLogoScreen} />
        
        {/* Join Company (for onboarding from main app) */}
        <RootStack.Screen name="SelectCompany" component={SelectCompanyScreen} />
      </RootStack.Navigator>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </NavigationContainer>
  );
}

/**
 * Auth Navigator with NavigationContainer
 */
function AuthNavigatorWithContainer() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <AuthNavigator />
    </NavigationContainer>
  );
}

// ========== Store Initializers ==========

/**
 * Initialize company store and locations
 * 
 * Location Selection Logic:
 * - Fetches business locations when a business is active
 * - If business has only one location (main/primary), auto-selects it
 * - If business has multiple locations, shows "All Locations" option
 * - Location dropdown is disabled when there's only one location
 */
function CompanyStoreInitializer({ children }: { children: React.ReactNode }) {
  const fetchCompanies = useBusinessStore((state) => state.fetchCompanies);
  const fetchLocations = useBusinessStore((state) => state.fetchLocations);
  const locations = useBusinessStore((state) => state.locations);
  const currentLocation = useBusinessStore((state) => state.currentLocation);
  const setLocation = useBusinessStore((state) => state.setLocation);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch locations when business changes
  useEffect(() => {
    if (activeBusiness?.id) {
      fetchLocations(activeBusiness.id);
    }
  }, [activeBusiness?.id, fetchLocations]);

  // Auto-select primary location if business has only one location
  useEffect(() => {
    if (locations.length === 1 && !currentLocation) {
      // Single location - auto-select it
      const primaryLocation = locations[0];
      setLocation(primaryLocation);
    }
  }, [locations, currentLocation, setLocation]);

  return <>{children}</>;
}

/**
 * Initialize profile store with user data
 */
function ProfileStoreInitializer({ children }: { children: React.ReactNode }) {
  const setCurrentUser = useProfileStore((state) => state.setCurrentUser);
  const setUserBusinesses = useProfileStore((state) => state.setUserBusinesses);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);
  const isInitialized = useProfileStore((state) => state.isInitialized);
  const activeMode = useProfileStore((state) => state.activeMode);
  const activeBusinessId = useProfileStore((state) => state.activeBusinessId);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);

  useEffect(() => {
    // Initialize with mock data in dev mode
    // TEMPORARILY DISABLED to test real backend login
    // if (!isInitialized && __DEV__) {
    //   console.log('[Dev] Loading mock seed data...');
        // }
  }, [isInitialized, setCurrentUser, setUserBusinesses]);

  // Restore active business if we were in business mode
  useEffect(() => {
    if (activeMode === 'business' && activeBusinessId && !activeBusiness) {
      switchToBusiness(activeBusinessId);
    }
  }, [activeMode, activeBusinessId, activeBusiness, switchToBusiness]);

  return <>{children}</>;
}

// ========== App State Types ==========

type AppScreen = 'auth' | 'main';

// ========== Main App Component ==========

/**
 * Main App Component with Theme
 * 
 * Flow:
 * 1. Native splash appears instantly
 * 2. JS loads, fonts/assets prepared
 * 3. Native splash hidden, LaunchScreen animation plays
 * 4. If not signed in: show CTA → navigate to auth
 * 5. If signed in: show progress → navigate to main app
 */
const AppWithTheme = () => {
  // State
  const [resourcesReady, setResourcesReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('auth'); // Start with auth (includes launch)
  
  // Auth state from store
  const currentUser = useProfileStore((state) => state.currentUser);
  const accessToken = useProfileStore((state) => state.accessToken);
  const login = useProfileStore((state) => state.login);
  const logout = useProfileStore((state) => state.logout);
  const biometricEnabled = useProfileStore((state) => state.biometricEnabled);
  const staySignedIn = useProfileStore((state) => state.staySignedIn);
  const isRehydrated = useProfileStore((state) => state.isRehydrated);

  // Force logout removed - JWT auth is now properly implemented

  // Determine if user is signed in
  const isSignedIn = Boolean(accessToken && currentUser);

  // Biometric auto-login: prompt biometric auth on app launch if enabled
  useEffect(() => {
    if (!resourcesReady || isSignedIn || !biometricEnabled || !staySignedIn) return;

    const attemptBiometricLogin = async () => {
      try {
        const storedUserId = await SecureStore.getItemAsync('noupro_biometric_user_id');
        if (!storedUserId) return;

        const LocalAuthentication = await import('expo-local-authentication');
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Sign in to NouPro',
          cancelLabel: 'Use Password',
          disableDeviceFallback: false,
        });

        if (result.success) {
          // refreshToken() reads the stored refresh token and sets fresh access token
          await authAPI.refreshToken();
        }
      } catch (error) {
        console.error('Biometric auto-login failed:', error);
      }
    };

    attemptBiometricLogin();
  }, [resourcesReady, isSignedIn, biometricEnabled, staySignedIn]);

  // Push notification initialization: register token when user is signed in with notifications enabled
  useEffect(() => {
    if (!isSignedIn || !currentUser?.notifications_on) return;

    const initPush = async () => {
      try {
        const { registerForPushNotifications, registerTokenWithBackend } = require('@/shared/services/pushNotifications');
        const token = await registerForPushNotifications();
        if (token) {
          await registerTokenWithBackend(token);
        }
      } catch (err) {
        console.error('[App] Push init error:', err);
      }
    };

    initPush();
  }, [isSignedIn, currentUser?.notifications_on]);

  // Load resources (fonts, images, services)
  useEffect(() => {
    async function prepare() {
      try {
        // Initialize user avatar service
        await userAvatarService.initialize();
        
        // Pre-load fonts individually (skip already-registered fonts to avoid
        // CTFontManagerError 104 conflicts with expo-dev-menu in dev builds)
        const fontsToLoad: Record<string, ReturnType<typeof require>> = {
          ...Ionicons.font,
          'InterCustom-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'InterCustom-Medium': require('./assets/fonts/Inter-Medium.ttf'),
          'InterCustom-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
          'InterCustom-Bold': require('./assets/fonts/Inter-Bold.ttf'),
          'InterCustom-ExtraBold': require('./assets/fonts/Inter-ExtraBold.ttf'),
        };
        for (const [name, source] of Object.entries(fontsToLoad)) {
          if (!Font.isLoaded(name)) {
            try {
              await Font.loadAsync({ [name]: source });
            } catch {
              // Font may already be registered natively (e.g. expo-dev-menu) — safe to skip
            }
          }
        }

        // Pre-load critical images
        await Asset.loadAsync([
          require('./assets/icon.png'),
        ]);
      } catch (e) {
        console.warn('Resource loading error:', e);
      } finally {
        setResourcesReady(true);
      }
    }

    prepare();
  }, []);

  // Offline outbox (D2): register the NetInfo reconnect→flush listener once at boot, so
  // messages composed while offline actually send when connectivity returns. Previously
  // offlineQueue.init() was never called, so the outbox never flushed.
  useEffect(() => {
    offlineQueue.init();
    return () => offlineQueue.destroy();
  }, []);

  // Drain any queued offline messages once the user is authenticated (flush needs a valid
  // token). The reconnect listener above also flushes when connectivity is restored.
  useEffect(() => {
    if (isSignedIn) offlineQueue.flush().catch(() => {});
  }, [isSignedIn]);

  // Hide native splash once resources AND auth tokens are ready
  const appReady = resourcesReady && isRehydrated;
  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Could not hide splash screen:', e);
      }
    }
  }, [appReady]);

  // Watch auth state changes (login / logout / session expiry)
  useEffect(() => {
    if (currentScreen === 'auth' && isSignedIn) {
      // User just signed in, go to main app
      setCurrentScreen('main');
    } else if (currentScreen === 'main' && !isSignedIn) {
      // User logged out or session expired, go back to auth
      setCurrentScreen('auth');
    }
  }, [isSignedIn, currentScreen]);

  // Show nothing while resources/auth load (native splash is visible)
  if (!appReady) {
    return null;
  }

  // Render based on current screen.
  //
  // Auth gate FIRST: whenever there is no signed-in user — fresh launch, logout,
  // or an expired session — render the auth/Launch flow immediately. This is what
  // sends logout back to the splash screen. `currentScreen` is updated by an effect
  // and therefore lags one render behind `isSignedIn`; without this guard, logout
  // re-renders the main app tree once against a now-null user (stores already
  // reset), which left a blank screen instead of returning to Launch.
  const renderScreen = () => {
    if (!isSignedIn) {
      return <AuthNavigatorWithContainer />;
    }

    switch (currentScreen) {
      case 'auth':
        return <AuthNavigatorWithContainer />;

      case 'main':
        return (
          <CompanyStoreInitializer>
            <ProfileStoreInitializer>
              <AppNavigator />
            </ProfileStoreInitializer>
          </CompanyStoreInitializer>
        );
      
      default:
        return null;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <NotificationProvider>
            <View
              style={[styles.container, { backgroundColor: LAUNCH_BACKGROUND }]}
              onLayout={onLayoutRootView}
            >
              <ErrorBoundary>
                {renderScreen()}
              </ErrorBoundary>
            </View>
            {/* App-wide imperative dialogs (AppAlert) render here, above all screens. */}
            <AppDialogHost />
          </NotificationProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

/**
 * Sentry crash/error reporting — enabled only when EXPO_PUBLIC_SENTRY_DSN is set.
 * No-op (zero overhead) in local dev or any build without a DSN.
 */
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_APP_ENV || 'dev',
    tracesSampleRate: 0.1,
  });
}

/**
 * Root App Component
 */
function App() {
  return (
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  );
}

// Wrap with Sentry (error boundary + perf) only when monitoring is enabled.
export default SENTRY_DSN ? Sentry.wrap(App) : App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Export types for use in other files
export type { RootStackParamList } from '@/shared/types/navigation';
