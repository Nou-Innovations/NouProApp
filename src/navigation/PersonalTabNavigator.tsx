/**
 * Personal Tab Navigator
 * Navigation for Personal Profile mode
 * 
 * Navigation structure:
 * - Home: Feed & updates from businesses, suggestions
 * - Inbox: Personal messages and conversations
 * - Notifications: mode-aware NotificationsScreen (shows the unread badge, like pro mode)
 * - Activity: All orders/tasks placed as a person
 * - Profile: Personal settings, switch/manage business profiles
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Mail,
  List,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { useNotifications } from '@/shared/context/NotificationContext';
import theme from '@/shared/theme';
import { CountBadge, formatBadgeCount } from '@/shared/components/ui';
import { PersonalTabParamList } from '@/shared/types/navigation';

// Import screens from modes
import HomeScreen from '@/modes/personal/screens/HomeScreen';
import PersonalInboxScreen from '@/modes/personal/screens/PersonalInboxScreen';
import ActivityScreen from '@/modes/personal/screens/ActivityScreen';
import PersonalProfileScreen from '@/modes/personal/screens/PersonalProfileScreen';
import NotificationsScreen from '@/features/notifications/screens/NotificationsScreen';

const Tab = createBottomTabNavigator<PersonalTabParamList>();

/**
 * Personal Tab Navigator Component
 */
export function PersonalTabNavigator() {
  const { theme: appTheme } = useTheme();
  const currentUser = useProfileStore((state) => state.currentUser);
  const { unreadCount, inboxUnreadCount } = useNotifications();

  /**
   * Render user profile picture or fallback icon (24x24px, border radius 4px)
   */
  const renderProfileIcon = (color: string, focused: boolean) => {
    if (currentUser?.avatar_url) {
      return (
        <View style={styles.profileIconContainer}>
          <Image
            source={{ uri: currentUser.avatar_url }}
            style={styles.profileIcon}
          />
        </View>
      );
    }
    // Fallback to placeholder with user initial
    return (
      <View style={[styles.profileIconContainer, styles.profileIconPlaceholder]}>
        <Text style={styles.profileIconInitial}>
          {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
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
      {/* Home Tab */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
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

      {/* Inbox Tab */}
      <Tab.Screen
        name="Inbox"
        component={PersonalInboxScreen}
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
            <View style={{ position: 'relative' }}>
              <Mail size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
              <CountBadge count={inboxUnreadCount} overlay style={{ top: -4, right: -10 }} />
            </View>
          ),
        }}
      />
      
      {/* Notifications Tab - mode-aware NotificationsScreen (matches pro mode's nav-bar bell) */}
      <Tab.Screen
        name="PersonalNotifications"
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
            <Bell size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
          tabBarBadge: unreadCount > 0 ? formatBadgeCount(unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: appTheme.colors.badgeBackground, color: '#FFFFFF' },
        }}
      />

      {/* Activities Tab */}
      <Tab.Screen
        name="Activities"
        component={ActivityScreen}
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
      
      {/* Profile Tab */}
      <Tab.Screen
        name="PersonalProfile"
        component={PersonalProfileScreen}
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
          tabBarIcon: ({ color, focused }) => renderProfileIcon(color, focused),
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

export default PersonalTabNavigator;
