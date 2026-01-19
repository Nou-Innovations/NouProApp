/**
 * NouPro App - Main Entry Point
 * 
 * Implements:
 * - Animated 5-stage launch screen
 * - Auth flow (Login/Register)
 * - Dual-mode navigation (Personal/Business)
 */

import 'react-native-gesture-handler';
import './tailwind.css';
import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer, Theme, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Theme & Context
import theme from '@/shared/theme';
import { ThemeProvider, useTheme } from '@/shared/theme/ThemeProvider';
import { NotificationProvider } from '@/shared/context/NotificationContext';

// Stores
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';

// Navigation
import { PersonalTabNavigator } from '@/navigation/PersonalTabNavigator';
import { BusinessTabNavigator } from '@/navigation/BusinessTabNavigator';

// Services
import { userAvatarService } from '@/shared/services/userAvatarService';

// Screens - Auth
import LoginScreen from '@/features/auth/screens/LoginScreen';
import RegisterScreen from '@/features/auth/screens/RegisterScreen';
import CreateAccountScreen from '@/features/auth/screens/CreateAccountScreen';
// OTP screens disabled for now - keeping code but not linking to navigation
// import PhoneVerificationScreen from '@/features/auth/screens/PhoneVerificationScreen';
// import EmailVerificationScreen from '@/features/auth/screens/EmailVerificationScreen';
import CreatePasswordScreen from '@/features/auth/screens/CreatePasswordScreen';
import UploadProfilePictureScreen from '@/features/auth/screens/UploadProfilePictureScreen';
import ChoosePathScreen from '@/features/auth/screens/ChoosePathScreen';
import SelectCompanyScreen from '@/features/auth/screens/SelectCompanyScreen';
import BusinessBasicInfoScreen from '@/features/auth/screens/BusinessBasicInfoScreen';
import BusinessLocationScreen from '@/features/auth/screens/BusinessLocationScreen';
import BusinessHoursScreen from '@/features/auth/screens/BusinessHoursScreen';
import UploadBusinessLogoScreen from '@/features/auth/screens/UploadBusinessLogoScreen';
import LaunchScreenWrapper from '@/features/auth/screens/LaunchScreenWrapper';

// Screens - Inbox
import ChatScreen from '@/features/inbox/screens/ChatScreen';
import InboxOverlayScreen from '@/features/inbox/screens/InboxOverlayScreen';

// Screens - Invoices
import CreateInvoiceScreen from '@/features/invoices/screens/CreateInvoiceScreen';
import InvoiceDetailsScreen from '@/features/invoices/screens/InvoiceDetailsScreen';
import ReceivedPaymentsScreen from '@/features/invoices/screens/ReceivedPaymentsScreen';

// Screens - Profile
import BusinessProfileScreen from '@/features/profile/screens/BusinessProfileScreen';
import UserProfileScreen from '@/features/profile/screens/UserProfileScreen';

// Screens - Brands
import CreateBrandScreen from '@/features/brands/screens/CreateBrandScreen';
import BrandSelectionScreen from '@/features/brands/screens/BrandSelectionScreen';
import SelectProductsForBrandScreen from '@/features/brands/screens/SelectProductsForBrandScreen';

// Screens - Products
import CreateProductScreen from '@/features/products/screens/CreateProductScreen';
import ProductDetailScreen from '@/features/products/screens/ProductDetailScreen';

// Screens - Company & Search
import CompanySearchScreen from '@/features/company/screens/CompanySearchScreen';
import UserSearchScreen from '@/features/search/screens/UserSearchScreen';
import CompanySettingsScreen from '@/features/company/screens/CompanySettingsScreen';
import CompanyEditScreen from '@/features/company/screens/CompanyEditScreen';

// Screens - Deliveries
import DeliveryDetailScreen from '@/features/deliveries/screens/DeliveryDetailScreen';
import CreateDeliveryScreen from '@/features/deliveries/screens/CreateDeliveryScreen';

// Screens - Notifications
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';

// Screens - Personal (from modes)
import EditPersonalProfileScreen from '@/modes/personal/screens/EditPersonalProfileScreen';
import AddWorkExperienceScreen from '@/modes/personal/screens/AddWorkExperienceScreen';
import EditWorkExperienceScreen from '@/modes/personal/screens/EditWorkExperienceScreen';
import PersonalSettingsScreen from '@/modes/personal/screens/PersonalSettingsScreen';
import PersonalDeliveryDetailScreen from '@/modes/personal/screens/PersonalDeliveryDetailScreen';

// Screens - Settings
import ChangePasswordScreen from '@/features/settings/screens/ChangePasswordScreen';
import SecuritySettingsScreen from '@/features/settings/screens/SecuritySettingsScreen';
import ProfileSettingsScreen from '@/features/settings/screens/ProfileSettingsScreen';
import PersonalProfileSettingsScreen from '@/features/settings/screens/PersonalProfileSettingsScreen';
import TwoFactorAuthScreen from '@/features/settings/screens/TwoFactorAuthScreen';
import BiometricLoginScreen from '@/features/settings/screens/BiometricLoginScreen';

// Screens - Business Activity
import { AllActivityScreen } from '@/modes/business/screens';

// Screens - Subscription
import { SubscriptionPlansScreen } from '@/features/subscription';

// Screens - Feedback
import { FeedbackCategoriesScreen, FeedbackListScreen, AddSuggestionScreen } from '@/features/feedback';

// Screens - Business/Team
import TeamManagementScreen from '@/features/team/screens/TeamManagementScreen';
import InviteStaffScreen from '@/features/team/screens/InviteStaffScreen';

// Screens - Locations & Transports
import LocationsScreen from '@/features/locations/screens/LocationsScreen';
import AddLocationScreen from '@/features/locations/screens/AddLocationScreen';
import TransportsScreen from '@/features/transports/screens/TransportsScreen';
import AddTransportScreen from '@/features/transports/screens/AddTransportScreen';

// Screens - Connections
import ConnectionsScreen from '@/features/connections/screens/ConnectionsScreen';

// Types
import { RootStackParamList, AuthStackParamList } from '@/shared/types/navigation';

// Dev seed data (only imported in dev mode)
import { initializeDevData } from '@/dev/seed';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Reloading the app might trigger some race conditions, ignore them */
});

// ========== Constants ==========

/** Launch screen background color - must match app.json splash backgroundColor */
const LAUNCH_BACKGROUND = '#000000';

// ========== Stack Navigators ==========

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// ========== Navigation Theme ==========

const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: '#D23030',
    background: '#000000',
    card: '#000000',
    text: '#FFFFFF',
    border: '#1E1E1E',
    notification: '#D23030',
  },
};

// ========== Navigators ==========

/**
 * Main Tab Navigator - Renders either Personal or Business tabs based on active mode
 */
function MainTabNavigator() {
  const activeMode = useProfileStore((state) => state.activeMode);
  
  if (activeMode === 'business') {
    return <BusinessTabNavigator />;
  }
  
  return <PersonalTabNavigator />;
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
      
      {/* Personal Registration Flow */}
      <AuthStack.Screen name="CreateAccount" component={CreateAccountScreen} />
      {/* OTP screens disabled for now - code kept but not linked to navigation */}
      {/* <AuthStack.Screen name="PhoneVerification" component={PhoneVerificationScreen} /> */}
      {/* <AuthStack.Screen name="EmailVerification" component={EmailVerificationScreen} /> */}
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
  
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        {/* Main Tab Navigator */}
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
        
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
        <RootStack.Screen name="EditPersonalProfile" component={EditPersonalProfileScreen} />
        <RootStack.Screen name="AddWorkExperience" component={AddWorkExperienceScreen} />
        <RootStack.Screen name="EditWorkExperience" component={EditWorkExperienceScreen} />
        
        {/* Invoice Screens */}
        <RootStack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
        <RootStack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
        <RootStack.Screen name="ReceivedPayments" component={ReceivedPaymentsScreen} />
        
        {/* Product Screens */}
        <RootStack.Screen name="CreateBrand" component={CreateBrandScreen} />
        <RootStack.Screen name="CreateProduct" component={CreateProductScreen} />
        <RootStack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <RootStack.Screen name="BrandSelection" component={BrandSelectionScreen} />
        <RootStack.Screen name="SelectProductsForBrand" component={SelectProductsForBrandScreen} />
        
        {/* Search Screens */}
        <RootStack.Screen name="CompanySearch" component={CompanySearchScreen} />
        <RootStack.Screen name="UserSearch" component={UserSearchScreen} />
        
        {/* Delivery Screens */}
        <RootStack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
        <RootStack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />

        {/* Settings Screens */}
        <RootStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <RootStack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
        <RootStack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
        <RootStack.Screen name="BiometricLogin" component={BiometricLoginScreen} />
        <RootStack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
        <RootStack.Screen name="PersonalProfileSettings" component={PersonalProfileSettingsScreen} />
        <RootStack.Screen name="PersonalSettings" component={PersonalSettingsScreen} />
        <RootStack.Screen name="PersonalDeliveryDetail" component={PersonalDeliveryDetailScreen} />
        <RootStack.Screen name="CompanySettings" component={CompanySettingsScreen} />
        <RootStack.Screen name="EditBusiness" component={CompanyEditScreen} />
        
        {/* Team Management */}
        <RootStack.Screen name="TeamManagement" component={TeamManagementScreen} />
        <RootStack.Screen name="InviteStaff" component={InviteStaffScreen} />
        
        {/* Locations & Transports */}
        <RootStack.Screen name="Locations" component={LocationsScreen} />
        <RootStack.Screen name="AddLocation" component={AddLocationScreen} />
        <RootStack.Screen name="Transports" component={TransportsScreen} />
        <RootStack.Screen name="AddTransport" component={AddTransportScreen} />
        
        {/* Social Screens */}
        <RootStack.Screen name="Connections" component={ConnectionsScreen} />
        
        {/* Business Activity */}
        <RootStack.Screen name="AllActivity" component={AllActivityScreen} />
        
        {/* Subscription */}
        <RootStack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} />
        
        {/* Feedback */}
        <RootStack.Screen name="FeedbackCategories" component={FeedbackCategoriesScreen} />
        <RootStack.Screen name="FeedbackList" component={FeedbackListScreen} />
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
    if (!isInitialized && __DEV__) {
      console.log('[Dev] Loading mock seed data...');
      initializeDevData(setCurrentUser, setUserBusinesses);
    }
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
  
  // Determine if user is signed in
  const isSignedIn = Boolean(accessToken && currentUser);

  // Load resources (fonts, images, services)
  useEffect(() => {
    async function prepare() {
      try {
        // Initialize user avatar service
        await userAvatarService.initialize();
        
        // Pre-load fonts
        await Font.loadAsync({
          ...Ionicons.font,
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
          'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
          'Inter-ExtraBold': require('./assets/fonts/Inter-ExtraBold.ttf'),
        });

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

  // Hide native splash once resources are ready
  const onLayoutRootView = useCallback(async () => {
    if (resourcesReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Could not hide splash screen:', e);
      }
    }
  }, [resourcesReady]);

  // Watch for successful auth (user logs in)
  useEffect(() => {
    if (currentScreen === 'auth' && isSignedIn) {
      // User just signed in, go to main app
      setCurrentScreen('main');
    }
  }, [isSignedIn, currentScreen]);

  // Show nothing while resources load (native splash is visible)
  if (!resourcesReady) {
    return null;
  }

  // Render based on current screen
  const renderScreen = () => {
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
        <NotificationProvider>
          <View 
            style={[styles.container, { backgroundColor: LAUNCH_BACKGROUND }]} 
            onLayout={onLayoutRootView}
          >
            {renderScreen()}
          </View>
        </NotificationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

/**
 * Root App Component
 */
export default function App() {
  return (
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Export types for use in other files
export type { RootStackParamList } from '@/shared/types/navigation';
