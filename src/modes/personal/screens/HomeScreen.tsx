/**
 * HomeScreen - Personal Mode
 * Feed & updates from businesses, suggestions, and basic activity overview
 * 
 * ARCHITECTURE: Data comes from useFeed hook (API → Service → Hook → Screen)
 * Screen only handles display and navigation, not data fetching.
 * 
 * Features:
 * - Fixed header with white background and Notifications icon
 * - Feed posts from connected businesses (via API)
 * - Pull-to-refresh
 * - Infinite scroll
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useNotifications } from '@/shared/context/NotificationContext';
// ARCHITECTURE: Data comes from hook, not inline mock arrays
import { useFeed } from '@/features/feed';
import { FeedPost } from '@/shared/types/feed';
import {
  BrandPresentationPost,
  CompanyPresentationPost,
  NewProductPost,
} from '../components';
import { EmptyState } from '@/shared/components/ui';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const currentUser = useProfileStore((state) => state.currentUser);
  const isNewUser = useProfileStore((state) => state.isNewUser);
  const clearNewUserFlag = useProfileStore((state) => state.clearNewUserFlag);
  const { unreadCount } = useNotifications();
  
  // Clear new user flag after showing welcome message (after a delay)
  useEffect(() => {
    if (isNewUser) {
      const timer = setTimeout(() => {
        clearNewUserFlag();
      }, 5000); // Clear after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isNewUser, clearNewUserFlag]);
  
  // ========================================================================
  // ARCHITECTURE: Data comes from useFeed hook (API → Service → Hook → Screen)
  // ========================================================================
  const { 
    posts, 
    loading, 
    refreshing, 
    loadingMore,
    error, 
    isMockData, 
    hasMore,
    refresh, 
    loadMore 
  } = useFeed();

  // Navigation handlers
  const navigateToNotifications = useCallback(() => {
    // @ts-ignore
    navigation.navigate('Notifications');
  }, [navigation]);

  const handleBusinessPress = (businessId: string, expandBrandId?: string) => {
    // @ts-ignore - Navigate to business profile, optionally expand a specific brand
    navigation.navigate('ViewBusinessProfile', { businessId, expandBrandId });
  };

  const handleProductPress = (productId: string, businessId?: string) => {
    // @ts-ignore - Navigate to unified product detail screen
    navigation.navigate('ProductDetail', { productId });
  };

  const handleBrandPress = (brandId: string, businessId: string) => {
    // @ts-ignore - Navigate to business profile with that brand expanded
    navigation.navigate('ViewBusinessProfile', { businessId, expandBrandId: brandId });
  };

  const handleConnectPress = (companyId: string, isConnected: boolean) => {
    // Toggle connection state
    console.log('Connect/Disconnect:', companyId, isConnected);
  };

  // Get dynamic greeting based on time of day or new user status
  const getGreeting = () => {
    if (isNewUser) return 'Welcome';
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get emoji based on time of day or new user status
  const getGreetingEmoji = () => {
    if (isNewUser) return '👋';
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 17) return '☀️';
    return '👋';
  };

  // Get user's first name
  const getUserFirstName = () => {
    if (!currentUser?.name) return 'User';
    return currentUser.name.split(' ')[0];
  };

  const renderBadge = (count: number) => {
    if (count <= 0) return null;
    
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {count > 9 ? '9+' : count.toString()}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: '#FFFFFF' }]}>
      <View style={{ width: 40 }} />
      <View style={styles.headerActions}>
        {/* Notifications Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={navigateToNotifications}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon 
            name="notifications-outline" 
            size={24} 
            color={appTheme.colors.text} 
          />
          {renderBadge(unreadCount)}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGreeting = () => (
    <View style={styles.greetingSection}>
      <Text style={[styles.greeting, { color: appTheme.colors.text }]}>
        {getGreeting()}
      </Text>
      <View style={styles.userNameRow}>
        <Text style={[styles.userName, { color: appTheme.colors.text }]}>
          {getUserFirstName()}{isNewUser ? '!' : ''}
        </Text>
        <Text style={styles.greetingEmoji}>{getGreetingEmoji()}</Text>
      </View>
    </View>
  );

  const renderFeedPost = ({ item }: { item: FeedPost }) => {
    switch (item.type) {
      case 'brand_presentation':
        return (
          <BrandPresentationPost
            id={item.id}
            brandId={item.data.brandId}
            brandName={item.data.brandName}
            brandLogo={item.data.brandLogo}
            distributorName={item.data.distributorName}
            distributorId={item.data.distributorId}
            products={item.data.products}
            timestamp={item.timestamp}
            // Clicking the brand header goes to the distributor's business profile with that brand expanded
            onBrandPress={(brandId, distributorId) => handleBrandPress(brandId, distributorId)}
            onDistributorPress={() => handleBusinessPress(item.data.distributorId)}
            // Product cards navigate to product detail (browse only, no ordering in Personal mode)
            onProductPress={(productId) => handleProductPress(productId, item.data.distributorId)}
          />
        );

      case 'company_presentation':
        return (
          <CompanyPresentationPost
            id={item.data.companyId}
            companyName={item.data.companyName}
            companyLogo={item.data.companyLogo}
            location={item.data.location}
            isConnected={item.data.isConnected}
            brands={item.data.brands}
            timestamp={item.timestamp}
            onCompanyPress={() => handleBusinessPress(item.data.companyId)}
            onConnectPress={() => handleConnectPress(item.data.companyId, item.data.isConnected)}
            // Clicking a brand card navigates to the company's business profile with that brand expanded
            onBrandPress={(brandId: string) => handleBrandPress(brandId, item.data.companyId)}
          />
        );

      case 'new_products':
        return (
          <NewProductPost
            id={item.id}
            postType={item.data.postType}
            businessName={item.data.businessName}
            businessLogo={item.data.businessLogo}
            businessId={item.data.businessId}
            products={item.data.products}
            timestamp={item.timestamp}
            onBusinessPress={() => handleBusinessPress(item.data.businessId)}
            // Product cards navigate to product detail
            onProductPress={(productId) => handleProductPress(productId, item.data.businessId)}
            onViewAllPress={() => handleBusinessPress(item.data.businessId)}
          />
        );

      default:
        return null;
    }
  };

  // Footer component for loading more indicator
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={appTheme.colors.primary} />
      </View>
    );
  };

  const renderEmptyFeed = () => (
    <EmptyState
      iconName="sparkles-outline"
      title="Welcome to your workspace"
      subtitle="This is where updates, activity, and recommendations will appear as you start using NouPro."
      ctaLabel="Explore NouPro"
      onCtaPress={() => navigation.navigate('Explore' as never)}
      testID="empty-home-feed"
    />
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: '#FFFFFF' }]}
      edges={['top']}
    >
      {/* Fixed Header */}
      {renderHeader()}
      
      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      )}
      
      {/* Feed List */}
      {!loading && (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedPost}
          ListHeaderComponent={
            <>
              {renderGreeting()}
              {/* Mock Data Indicator (DEV only) */}
              {__DEV__ && isMockData && (
                <View style={[styles.mockDataBanner, { backgroundColor: appTheme.colors.warning }]}>
                  <Text style={styles.mockDataText}>Using mock data (API unavailable)</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={renderEmptyFeed}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={appTheme.colors.primary}
            />
          }
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  greetingSection: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.medium,
    color: '#000000',
    marginTop: 28,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 40,
    fontFamily: theme.fonts.primary.bold,
    color: '#000000',
    marginTop: 2,
    marginBottom: 20,
  },
  greetingEmoji: {
    fontSize: 32,
    marginLeft: 8,
    marginTop: 2,
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.bold,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  exploreButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  mockDataBanner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: 6,
  },
  mockDataText: {
    color: '#000',
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
});
