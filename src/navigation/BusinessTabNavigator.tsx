/**
 * Business Tab Navigator (Pro Mode)
 * Navigation for Business Profile mode
 * 
 * Updated navigation structure:
 * - Inbox: Dashboard with Activity Timeline and Chat list
 * - Deliveries: Assign, track, create deliveries and transfers
 * - Products: Product catalog management, stock
 * - Invoices: Invoices, estimates (paid plans only)
 * - Business: Business profile, settings, staff, subscription
 * 
 * Note: Explore (feed) is now accessed via overlay from Inbox header (not a tab)
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { 
  Mail, 
  Car, 
  Package,
  ReceiptText, 
} from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNotifications } from '@/shared/context/NotificationContext';
import { useProfileStore } from '@/shared/store/profileStore';
import theme from '@/shared/theme';
import { BusinessTabParamList } from '@/shared/types/navigation';

// Import screens
import DeliveryScreen from '@/features/deliveries/screens/DeliveryScreen';
import ProductsScreen from '@/features/products/screens/ProductsScreen';
import InvoicesScreen from '@/features/invoices/screens/InvoicesScreen';
// Import business profile from modes
import BusinessProfileOwnScreen from '@/modes/business/screens/BusinessProfileOwnScreen';
// Import Business Inbox Screen
import BusinessInboxScreen from '@/modes/business/screens/BusinessInboxScreen';

const Tab = createBottomTabNavigator<BusinessTabParamList>();

/**
 * Business Tab Navigator Component
 */
export function BusinessTabNavigator() {
  const { theme: appTheme } = useTheme();
  const { deliveriesUnreadCount, invoicesUnreadCount } = useNotifications();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);

  /**
   * Render business logo or fallback icon (24x24px, border radius 4px)
   */
  const renderBusinessIcon = (color: string, focused: boolean) => {
    if (activeBusiness?.logo_url) {
      return (
        <View style={[styles.profileIconContainer, focused && styles.profileIconFocused]}>
          <Image
            source={{ uri: activeBusiness.logo_url }}
            style={styles.profileIcon}
          />
        </View>
      );
    }
    // Fallback to placeholder with business initial
    return (
      <View style={[styles.profileIconContainer, styles.profileIconPlaceholder, focused && styles.profileIconFocused]}>
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
      {/* Inbox Tab - Dashboard with Activity + Chats */}
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
      
      {/* Deliveries Tab */}
      <Tab.Screen
        name="Deliveries"
        component={DeliveryScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: theme.fontSize.xs,
              fontFamily: focused ? theme.fonts.primary.extraBold : theme.fonts.primary.medium,
              color,
            }}>
              Deliveries
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <Car size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
              {deliveriesUnreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {deliveriesUnreadCount > 9 ? '9+' : deliveriesUnreadCount.toString()}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      
      {/* Products Tab */}
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: theme.fontSize.xs,
              fontFamily: focused ? theme.fonts.primary.extraBold : theme.fonts.primary.medium,
              color,
            }}>
              Products
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Package size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      
      {/* Invoices Tab */}
      <Tab.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: theme.fontSize.xs,
              fontFamily: focused ? theme.fonts.primary.extraBold : theme.fonts.primary.medium,
              color,
            }}>
              Invoices
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <ReceiptText size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
              {invoicesUnreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {invoicesUnreadCount > 9 ? '9+' : invoicesUnreadCount.toString()}
                  </Text>
                </View>
              )}
            </View>
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
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    textAlign: 'center',
  },
  profileIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  profileIconFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
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
