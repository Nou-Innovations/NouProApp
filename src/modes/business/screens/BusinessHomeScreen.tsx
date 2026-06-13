/**
 * BusinessHomeScreen - Pro Mode Home / Dashboard
 *
 * The Business mode landing screen. Mirrors the Personal HomeScreen pattern
 * (drawer menu + notifications header, time-of-day greeting) and composes the
 * Pro dashboard components:
 * - KPI chips (new orders, pending deliveries, unpaid invoices, open tasks)
 * - Priority Queue (needs-attention items)
 * - Quick Actions (permission-gated create flows)
 * - Recent Activity preview ("See all" → Activities log)
 *
 * Data comes from the useBusinessDashboard hook (API → service → hook → screen).
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@/shared/utils/icons';
import AnimatedMenuIcon from '@/shared/components/ui/AnimatedMenuIcon';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useNotifications } from '@/shared/context/NotificationContext';
import { RootStackParamList } from '@/shared/types/navigation';
import {
  ProKpiChipsRow,
  ProPriorityQueue,
  ProQuickActions,
  ProRecentActivity,
} from '../components';
import { useBusinessDashboard } from '../hooks/useBusinessDashboard';

export default function BusinessHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((s) => s.activeBusiness);
  const { unreadCount } = useNotifications();

  const {
    kpiChips,
    priorityItems,
    quickActions,
    recentActivity,
    loading,
    refreshing,
    error,
    refresh,
  } = useBusinessDashboard();

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  }, [navigation]);

  const goToNotifications = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

  const goToActivities = useCallback(() => {
    navigation.navigate('AllActivity');
  }, [navigation]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    return hour >= 5 && hour < 17 ? '☀️' : '👋';
  };

  const renderBadge = (count: number) => {
    if (count <= 0) return null;
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 9 ? '9+' : count.toString()}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={openDrawer}
          activeOpacity={0.7}
          accessibilityLabel="Open menu"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AnimatedMenuIcon size={30} color={appTheme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={goToNotifications}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="notifications-outline" size={24} color={appTheme.colors.text} />
            {renderBadge(unreadCount)}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={appTheme.colors.primary}
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greeting, { color: appTheme.colors.textSecondary }]}>
            {getGreeting()}
          </Text>
          <View style={styles.businessNameRow}>
            <Text
              style={[styles.businessName, { color: appTheme.colors.text }]}
              numberOfLines={1}
            >
              {activeBusiness?.name || 'Your business'}
            </Text>
            <Text style={styles.greetingEmoji}>{getGreetingEmoji()}</Text>
          </View>
        </View>

        {/* Error banner with retry */}
        {error && !loading && (
          <TouchableOpacity
            style={[styles.errorBanner, { backgroundColor: appTheme.colors.error }]}
            onPress={refresh}
            activeOpacity={0.8}
          >
            <Icon name="refresh-outline" size={16} color={appTheme.colors.textInverse} />
            <Text style={styles.errorText}>Couldn't load dashboard. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* KPI chips */}
        <ProKpiChipsRow chips={kpiChips} isLoading={loading} error={error} />

        {/* Priority queue */}
        <ProPriorityQueue items={priorityItems} isLoading={loading} onSeeAll={goToActivities} />

        {/* Quick actions */}
        <ProQuickActions actions={quickActions} isLoading={loading} />

        {/* Recent activity preview */}
        <ProRecentActivity items={recentActivity} isLoading={loading} onSeeAll={goToActivities} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.textInverse,
    fontSize: 10,
    fontFamily: theme.fonts.primary.bold,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  greetingSection: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
  },
  greeting: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 12,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  businessName: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    flexShrink: 1,
  },
  greetingEmoji: {
    fontSize: 28,
    marginLeft: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  errorText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
