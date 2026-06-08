/**
 * Business Tab Navigator (Pro Mode)
 * Navigation for Business Profile mode
 *
 * Tab structure:
 * - Explore: B2B discovery (businesses, products, suppliers, opportunities, events). Notifications bell in header.
 * - Inbox: Dashboard with Activity Timeline and Chat list
 * - Activities: Business timeline / log
 * - Profile: Business profile, settings, staff, subscription
 *
 * Note: Deliveries / Products / Invoices moved to the sidebar (opened as RootStack screens).
 * Notifications are reached via the bell in the Explore header (not a tab).
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Compass,
  Mail,
  List,
} from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import theme from '@/shared/theme';
import { BusinessTabParamList } from '@/shared/types/navigation';

// Import screens
import { BusinessExploreScreen, AllActivityScreen } from '@/modes/business/screens';
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

      {/* Activities Tab - Business timeline / log */}
      <Tab.Screen
        name="Activities"
        component={AllActivityScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{
              fontSize: theme.fontSize.xs,
              fontFamily: focused ? theme.fonts.primary.extraBold : theme.fonts.primary.medium,
              color,
            }}>
              Activities
            </Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <List size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
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
