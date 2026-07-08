/**
 * Business Tab Navigator (Pro Mode)
 * Navigation for Business Profile mode
 *
 * Tab structure (visible order):
 * - Inbox: Conversation list / messaging
 * - Notifications: mode-aware NotificationsScreen (shows the unread badge)
 * - Analytics (route BusinessHome): Dashboard (KPIs, priority queue, quick actions, recent activity)
 * - Explore: B2B discovery (businesses, products, suppliers, opportunities, events)
 * - Profile: Business profile, settings, staff, subscription
 *
 * Note: The full Activities timeline opens as the RootStack `AllActivity` screen
 * (via "See all" on the Home screen), not a tab.
 * Deliveries / Products / Invoices live in the sidebar (opened as RootStack screens).
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  ChartColumn,
  Compass,
  Mail,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { useNotifications } from '@/shared/context/NotificationContext';
import theme from '@/shared/theme';
import { CountBadge } from '@/shared/components/ui';
import { BusinessTabParamList } from '@/shared/types/navigation';

// Import screens
import { BusinessHomeScreen, BusinessExploreScreen } from '@/modes/business/screens';
import BusinessProfileOwnScreen from '@/modes/business/screens/BusinessProfileOwnScreen';
import BusinessInboxScreen from '@/modes/business/screens/BusinessInboxScreen';
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';

// Workspace pages opened from the sidebar. Registered here as hidden tabs (no button
// in the bottom bar via `tabBarButton: () => null`) so they keep the bottom nav bar
// visible and show the hamburger at their tab root. Their detail/create screens stay
// in the RootStack (App.tsx) and still push over everything with a back button.
import DeliveryScreen from '@/features/deliveries/screens/DeliveryScreen';
import DeliveriesAnalyticsScreen from '@/features/deliveries/screens/DeliveriesAnalyticsScreen';
import MyDeliveriesScreen from '@/features/deliveries/screens/MyDeliveriesScreen';
import LogisticsOverviewScreen from '@/features/logistics/screens/LogisticsOverviewScreen';
import IssuesScreen from '@/features/issues/screens/IssuesScreen';
import ReturnsScreen from '@/features/returns/screens/ReturnsScreen';
import RoutesScreen from '@/features/routes/screens/RoutesScreen';
import TransfersScreen from '@/features/transfers/screens/TransfersScreen';
import ProductsScreen from '@/features/products/screens/ProductsScreen';
import CategoriesScreen from '@/features/products/screens/CategoriesScreen';
import BrandsScreen from '@/features/brands/screens/BrandsScreen';
import { CollectionsScreen } from '@/features/collections';
import { CustomersScreen } from '@/features/customers';
import { DiscountsScreen } from '@/features/discounts';
import { BusinessAnalyticsScreen, VarianceScreen } from '@/features/analytics';
import { RecipesScreen } from '@/features/recipes';
import StockScreen from '@/features/products/screens/StockScreen';
import ProductVisibilityScreen from '@/features/products/screens/ProductVisibilityScreen';
import PriceListsScreen from '@/features/pricing/screens/PriceListsScreen';
import InvoicesScreen from '@/features/invoices/screens/InvoicesScreen';
import OrdersScreen from '@/features/orders/screens/OrdersScreen';
import TeamManagementScreen from '@/features/team/screens/TeamManagementScreen';
import LocationsScreen from '@/features/locations/screens/LocationsScreen';
import CompanySettingsScreen from '@/features/company/screens/CompanySettingsScreen';
import { SubscriptionPlansScreen } from '@/features/subscription';
import BottomSheetGalleryScreen from '@/features/designsystem/screens/BottomSheetGalleryScreen';
import MessageGalleryScreen from '@/features/designsystem/screens/MessageGalleryScreen';
import ButtonGalleryScreen from '@/features/designsystem/screens/ButtonGalleryScreen';
import ProductGalleryScreen from '@/features/designsystem/screens/ProductGalleryScreen';

const Tab = createBottomTabNavigator<BusinessTabParamList>();

// Hide a tab's button from the bottom bar while keeping it as a real tab route
// (so the bottom nav bar stays visible and `canGoBack()` is false at its root).
const hiddenTabOptions = { tabBarButton: () => null } as const;

/**
 * Business Tab Navigator Component
 */
export function BusinessTabNavigator() {
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const { unreadCount } = useNotifications();

  /**
   * Render business logo or fallback icon (24x24px, border radius 4px)
   */
  const renderBusinessIcon = (color: string, focused: boolean) => {
    if (activeBusiness?.logo_url) {
      return (
        <View style={styles.profileIconContainer}>
          <Image
            source={{ uri: activeBusiness.logo_url }}
            style={styles.profileIcon}
          />
        </View>
      );
    }
    // Fallback to placeholder with business initial
    return (
      <View style={[styles.profileIconContainer, styles.profileIconPlaceholder]}>
        <Text style={styles.profileIconInitial}>
          {activeBusiness?.name?.charAt(0)?.toUpperCase() || 'B'}
        </Text>
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: appTheme.colors.primary,
        tabBarInactiveTintColor: appTheme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: appTheme.colors.background,
          borderTopColor: appTheme.colors.borderColor,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      {/* Inbox Tab - Dashboard with Activity + Chats (first position) */}
      <Tab.Screen
        name="BusinessInbox"
        component={BusinessInboxScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: theme.fontSize.xs,
              fontFamily: focused ? theme.fonts.primary.extraBold : theme.fonts.primary.medium,
              color,
            }}>
              Inbox
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Mail size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* Notifications Tab - mode-aware NotificationsScreen (replaces the old header bell) */}
      <Tab.Screen
        name="BusinessNotifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: theme.fontSize.xs,
              fontFamily: focused ? theme.fonts.primary.extraBold : theme.fonts.primary.medium,
              color,
            }}>
              Notifications
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <Bell size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
              <CountBadge count={unreadCount} overlay />
            </View>
          ),
        }}
      />

      {/* Analytics Tab - Dashboard (KPIs, priority queue, quick actions, recent activity) */}
      <Tab.Screen
        name="BusinessHome"
        component={BusinessHomeScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: theme.fontSize.xs,
              fontFamily: focused ? theme.fonts.primary.extraBold : theme.fonts.primary.medium,
              color,
            }}>
              Analytics
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <ChartColumn size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* Explore Tab - B2B discovery */}
      <Tab.Screen
        name="BusinessExplore"
        component={BusinessExploreScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: theme.fontSize.xs,
              fontFamily: focused ? theme.fonts.primary.extraBold : theme.fonts.primary.medium,
              color,
            }}>
              Explore
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Compass size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* Business Profile Tab */}
      <Tab.Screen
        name="BusinessProfile"
        component={BusinessProfileOwnScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: theme.fontSize.xs,
              fontFamily: focused ? theme.fonts.primary.extraBold : theme.fonts.primary.medium,
              color,
            }}>
              Profile
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => renderBusinessIcon(color, focused),
        }}
      />

      {/* ===== Hidden workspace tabs (opened from the sidebar; no bottom-bar button) ===== */}
      {/* Logistics */}
      <Tab.Screen name="LogisticsOverview" component={LogisticsOverviewScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Deliveries" component={DeliveryScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Transfers" component={TransfersScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={hiddenTabOptions} />
      <Tab.Screen name="MyDeliveries" component={MyDeliveriesScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Routes" component={RoutesScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Issues" component={IssuesScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Returns" component={ReturnsScreen} options={hiddenTabOptions} />
      <Tab.Screen name="DeliveriesAnalytics" component={DeliveriesAnalyticsScreen} options={hiddenTabOptions} />

      {/* Products */}
      <Tab.Screen name="Products" component={ProductsScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Brands" component={BrandsScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Collections" component={CollectionsScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Customers" component={CustomersScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Discounts" component={DiscountsScreen} options={hiddenTabOptions} />
      <Tab.Screen name="BusinessAnalytics" component={BusinessAnalyticsScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Variance" component={VarianceScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Stock" component={StockScreen} options={hiddenTabOptions} />
      <Tab.Screen name="ProductVisibility" component={ProductVisibilityScreen} options={hiddenTabOptions} />
      <Tab.Screen name="PriceLists" component={PriceListsScreen} options={hiddenTabOptions} />

      {/* Accounting */}
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={hiddenTabOptions} />

      {/* Business settings */}
      <Tab.Screen name="TeamManagement" component={TeamManagementScreen} options={hiddenTabOptions} />
      <Tab.Screen name="Locations" component={LocationsScreen} options={hiddenTabOptions} />
      <Tab.Screen name="CompanySettings" component={CompanySettingsScreen} options={hiddenTabOptions} />
      {/* Sidebar-only alias of SubscriptionPlansScreen (shell version with hamburger).
          The RootStack `SubscriptionPlans` route stays for the in-app "Upgrade" buttons. */}
      <Tab.Screen name="SubscriptionHub" component={SubscriptionPlansScreen} options={hiddenTabOptions} />

      {/* Design System */}
      <Tab.Screen name="BottomSheetGallery" component={BottomSheetGalleryScreen} options={hiddenTabOptions} />
      <Tab.Screen name="MessageGallery" component={MessageGalleryScreen} options={hiddenTabOptions} />
      <Tab.Screen name="ButtonGallery" component={ButtonGalleryScreen} options={hiddenTabOptions} />
      <Tab.Screen name="ProductGallery" component={ProductGalleryScreen} options={hiddenTabOptions} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  profileIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 4,
    overflow: 'hidden',
  },
  profileIcon: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileIconPlaceholder: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconInitial: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.bold,
    color: '#FFFFFF',
  },
});

export default BusinessTabNavigator;
