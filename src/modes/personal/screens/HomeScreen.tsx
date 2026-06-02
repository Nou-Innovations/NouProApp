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

import React, { useCallback, useEffect, useState } from 'react';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useNotifications } from '@/shared/context/NotificationContext';
// ARCHITECTURE: Data comes from hook, not inline mock arrays
import { useFeed } from '@/features/feed';
import { followBusiness, unfollowBusiness } from '@/features/follow/follow.service';
import { FeedPost } from '@/shared/types/feed';
import { RootStackParamList } from '@/shared/types/navigation';
import {
  BrandPresentationPost,
  CompanyPresentationPost,
  NewProductPost,
} from '../components';
import { EmptyState, Skeleton, SkeletonCircle, SkeletonRow, SkeletonColumn } from '@/shared/components/ui';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();
  const currentUser = useProfileStore((state) => state.currentUser);
  const isNewUser = useProfileStore((state) => state.isNewUser);
  const clearNewUserFlag = useProfileStore((state) => state.clearNewUserFlag);
  const { unreadCount } = useNotifications();
  
  // Optimistic follow state overrides (companyId -> isFollowing)
  const [followOverrides, setFollowOverrides] = useState<Record<string, boolean>>({});
  
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
    hasMore,
    refresh, 
    loadMore 
  } = useFeed();

  // Navigation handlers
  const navigateToNotifications = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

  const handleBusinessPress = (businessId: string, expandBrandId?: string) => {
    navigation.navigate('ViewBusinessProfile', { businessId, expandBrandId });
  };

  const handleProductPress = (productId: string, businessId?: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleBrandPress = (brandId: string, businessId: string) => {
    navigation.navigate('ViewBusinessProfile', { businessId, expandBrandId: brandId });
  };

  // In personal mode a person follows a business (see docs/PROFILES.md).
  const handleFollowPress = async (companyId: string, currentlyFollowing: boolean) => {
    // Optimistic toggle — immediately update UI
    const newState = !currentlyFollowing;
    setFollowOverrides((prev) => ({ ...prev, [companyId]: newState }));

    try {
      if (currentlyFollowing) {
        await unfollowBusiness(companyId);
      } else {
        await followBusiness(companyId);
      }
    } catch {
      // Revert optimistic update on failure
      setFollowOverrides((prev) => ({ ...prev, [companyId]: currentlyFollowing }));
    }
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
    <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
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
            createdAt={item.createdAt}
            // Clicking the brand header goes to the distributor's business profile with that brand expanded
            onBrandPress={(brandId, distributorId) => handleBrandPress(brandId, distributorId)}
            onDistributorPress={() => handleBusinessPress(item.data.distributorId)}
            // Product cards navigate to product detail (browse only, no ordering in Personal mode)
            onProductPress={(productId) => handleProductPress(productId, item.data.distributorId)}
          />
        );

      case 'company_presentation': {
        const following = followOverrides[item.data.companyId] ?? item.data.isFollowing ?? item.data.isConnected ?? false;
        return (
          <CompanyPresentationPost
            id={item.data.companyId}
            companyName={item.data.companyName}
            companyLogo={item.data.companyLogo}
            location={item.data.location}
            isFollowing={following}
            brands={item.data.brands}
            timestamp={item.timestamp}
            createdAt={item.createdAt}
            onCompanyPress={() => handleBusinessPress(item.data.companyId)}
            onFollowPress={() => handleFollowPress(item.data.companyId, following)}
            // Clicking a brand card navigates to the company's business profile with that brand expanded
            onBrandPress={(brandId: string) => handleBrandPress(brandId, item.data.companyId)}
          />
        );
      }

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
            createdAt={item.createdAt}
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

  const renderErrorBanner = () => {
    if (!error) return null;
    return (
      <View style={[styles.errorBanner, { backgroundColor: appTheme.colors.error }]}>
        <Text style={styles.errorBannerText}>{error}</Text>
        <TouchableOpacity onPress={refresh} activeOpacity={0.7} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {/* Fixed Header */}
      {renderHeader()}
      
      {/* Loading Skeleton */}
      {loading && (
        <View style={styles.loadingContainer}>
          {/* Greeting skeleton */}
          <View style={styles.greetingSection}>
            <Skeleton width={140} height={20} style={{ marginTop: 28 }} />
            <Skeleton width={200} height={40} style={{ marginTop: 8, marginBottom: 20 }} borderRadius={8} />
          </View>
          {/* Feed post skeletons */}
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={{ paddingHorizontal: 16, marginBottom: 24 }}>
              <SkeletonRow gap={12} style={{ marginBottom: 12 }}>
                <SkeletonCircle size={48} />
                <SkeletonColumn gap={6} style={{ flex: 1 }}>
                  <Skeleton width="50%" height={16} />
                  <Skeleton width="30%" height={14} />
                </SkeletonColumn>
              </SkeletonRow>
              <SkeletonRow gap={10}>
                {[1, 2].map((_, j) => (
                  <Skeleton key={j} width={160} height={200} borderRadius={12} />
                ))}
              </SkeletonRow>
            </View>
          ))}
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
              {/* Error banner with retry */}
              {renderErrorBanner()}
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
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
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
    justifyContent: 'flex-start',
  },
  loadingMore: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: 6,
  },
  errorBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
    flex: 1,
  },
  retryButton: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: theme.fonts.primary.bold,
  },
});
