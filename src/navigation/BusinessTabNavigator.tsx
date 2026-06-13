/**
 * Business Tab Navigator (Pro Mode)
 * Navigation for Business Profile mode
 *
 * Tab structure:
 * - Home: Dashboard (KPIs, priority queue, quick actions, recent activity). Notifications bell in header.
 * - Explore: B2B discovery (businesses, products, suppliers, opportunities, events).
 * - Inbox: Conversation list / messaging
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
  Home,
  Compass,
  Mail,
} from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import theme from '@/shared/theme';
import { BusinessTabParamList } from '@/shared/types/navigation';

// Import screens
import { BusinessHomeScreen, BusinessExploreScreen } from '@/modes/business/screens';
import BusinessProfileOwnScreen from '@/modes/business/screens/BusinessProfileOwnScreen';
import BusinessInboxScreen from '@/modes/business/screens/BusinessInboxScreen';

const Tab = createBottomTabNavigator<BusinessTabParamList>();

/**
 * Business Tab Navigator Component
 */
export function BusinessTabNavigator() {
  const { theme: appTheme } = useTheme();
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
      {/* Home Tab - Dashboard (KPIs, priority queue, quick actions, recent activity) */}
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
              Home
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Home size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* Explore Tab - B2B discovery (notifications bell lives in this screen's header) */}
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
