/**
 * BusinessExploreScreen - Pro Mode Explore/Feed Overlay
 * Slides in from right, sits above tabs
 * Displays the feed with brand presentations, company presentations, and new products
 *
 * ARCHITECTURE: Data comes from the useFeed hook (API → Service → Hook → Screen),
 * the same hook used by the Personal-mode HomeScreen. No mock data.
 */

import React, { useCallback, useState } from 'react';
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
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import {
  EmptyState,
  Skeleton,
  SkeletonCircle,
  SkeletonRow,
  SkeletonColumn,
} from '@/shared/components/ui';
import { useProfileStore } from '@/shared/store/profileStore';
import apiClient from '@/shared/services/api';
import { FeedPost } from '@/shared/types/feed';
import { RootStackParamList } from '@/shared/types/navigation';

// Feed Post Components (reuse from Personal mode)
import {
  BrandPresentationPost,
  CompanyPresentationPost,
  NewProductPost,
} from '@/modes/personal/components';

// ARCHITECTURE: Data comes from hook, not inline mock arrays
import { useFeed } from '@/features/feed';

export default function BusinessExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();

  // ========================================================================
  // Data comes from useFeed hook (API → Service → Hook → Screen)
  // ========================================================================
  const {
    posts,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  } = useFeed();

  // Optimistic connection state overrides (companyId -> isConnected)
  const [connectionOverrides, setConnectionOverrides] = useState<Record<string, boolean>>({});

  // Navigation handlers
  const handleBack = () => {
    navigation.goBack();
  };

  const handleBusinessPress = (businessId: string, expandBrandId?: string) => {
    navigation.navigate('ViewBusinessProfile', { businessId, expandBrandId });
  };

  const handleProductPress = (productId: string, _businessId?: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleBrandPress = (brandId: string, businessId: string) => {
    navigation.navigate('ViewBusinessProfile', { businessId, expandBrandId: brandId });
  };

  const handleConnectPress = async (companyId: string, currentConnected: boolean) => {
    // Optimistic toggle — immediately update UI
    const newState = !currentConnected;
    setConnectionOverrides((prev) => ({ ...prev, [companyId]: newState }));

    try {
      if (currentConnected) {
        // Disconnect: find the connection and delete it
        const res = await apiClient.get(`/companies/${companyId}/connections`);
        const connections = res.data?.data || [];
        if (connections.length > 0) {
          const myBizId = useProfileStore.getState().activeBusiness?.id;
          const conn = connections.find((c: any) => c.requesterBusinessId === myBizId);
          if (conn) {
            await apiClient.delete(`/companies/${companyId}/connections/${conn.id}`);
          }
        }
      } else {
        // Connect to this business
        await apiClient.post(`/companies/${companyId}/connections`, {});
      }
    } catch {
      // Revert optimistic update on failure
      setConnectionOverrides((prev) => ({ ...prev, [companyId]: currentConnected }));
    }
  };

  // Render feed post
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
            // Product cards navigate to product detail (Order from ProductDetailScreen)
            onProductPress={(productId) => handleProductPress(productId, item.data.distributorId)}
          />
        );

      case 'company_presentation': {
        const connected = connectionOverrides[item.data.companyId] ?? item.data.isConnected;
        return (
          <CompanyPresentationPost
            id={item.data.companyId}
            companyName={item.data.companyName}
            companyLogo={item.data.companyLogo}
            location={item.data.location}
            isConnected={connected}
            brands={item.data.brands}
            timestamp={item.timestamp}
            createdAt={item.createdAt}
            onCompanyPress={() => handleBusinessPress(item.data.companyId)}
            onConnectPress={() => handleConnectPress(item.data.companyId, connected)}
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

  // Footer component for "load more" indicator
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={appTheme.colors.primary} />
      </View>
    );
  };

  // Error banner with retry
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
      style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <SecondaryHeader
        title="Explore"
        leftAction={{ icon: 'chevron-left', onPress: handleBack }}
      />

      {/* Loading Skeleton */}
      {loading && (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={{ paddingHorizontal: 16, marginBottom: 24, marginTop: i === 0 ? 12 : 0 }}>
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
          ListHeaderComponent={renderErrorBanner}
          ListEmptyComponent={() => (
            <EmptyState
              iconName="search-outline"
              title="Discover businesses"
              subtitle="Explore suppliers, partners, and opportunities for your business."
              ctaLabel="Refresh"
              onCtaPress={refresh}
              testID="empty-business-explore"
            />
          )}
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
          contentContainerStyle={[
            styles.listContent,
            posts.length === 0 && { flex: 1 },
          ]}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
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
