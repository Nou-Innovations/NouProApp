/**
 * BusinessExploreScreen - Pro Mode Explore/Feed Overlay
 * Slides in from right, sits above tabs
 * Displays the feed with brand presentations, company presentations, and new products
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SecondaryHeader } from '@/shared/components/layout/headers';

// Feed Post Components (reuse from Personal mode)
import {
  BrandPresentationPost,
  CompanyPresentationPost,
  NewProductPost,
} from '@/modes/personal/components';

// Feed post types
type FeedPostType = 'brand_presentation' | 'company_presentation' | 'new_products';

interface FeedPost {
  id: string;
  type: FeedPostType;
  timestamp: string;
  data: any;
}

// Mock feed data for Pro mode - using real brand images where possible
const mockFeedPosts: FeedPost[] = [
  {
    id: 'post-1',
    type: 'brand_presentation',
    timestamp: '2h ago',
    data: {
      brandId: 'brand-001',
      brandName: 'Tropicana',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Tropicana_Logo.svg/512px-Tropicana_Logo.svg.png',
      distributorName: 'NouPro Distribution',
      distributorId: 'dist-001',
      products: [
        {
          id: 'prod-1',
          name: 'Premium Orange Juice',
          unit: '1L',
          price: 125.00,
          image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400',
          isNew: true,
        },
        {
          id: 'prod-2',
          name: 'Tropical Mango Smoothie',
          unit: '500ml',
          price: 145.00,
          image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400',
        },
        {
          id: 'prod-3',
          name: 'Coconut Water',
          unit: '500ml',
          price: 85.00,
          image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400',
        },
      ],
    },
  },
  {
    id: 'post-2',
    type: 'company_presentation',
    timestamp: '4h ago',
    data: {
      companyId: 'biz-001',
      companyName: 'Phoenix Beverages',
      companyLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Phoenix_Beverages_Limited_logo.svg/512px-Phoenix_Beverages_Limited_logo.svg.png',
      location: 'Port Louis, Mauritius',
      isConnected: false,
      brands: [
        {
          id: 'brand-101',
          name: 'Phoenix Beer',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Phoenix_Beverages_Limited_logo.svg/200px-Phoenix_Beverages_Limited_logo.svg.png',
          productsCount: 24,
        },
        {
          id: 'brand-102',
          name: 'Coca-Cola',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/512px-Coca-Cola_logo.svg.png',
          productsCount: 18,
        },
        {
          id: 'brand-103',
          name: 'Schweppes',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Schweppes_logo.svg/512px-Schweppes_logo.svg.png',
          productsCount: 32,
        },
      ],
    },
  },
  {
    id: 'post-3',
    type: 'new_products',
    timestamp: '6h ago',
    data: {
      postType: 'distributor_added',
      businessId: 'biz-001',
      businessName: 'Fresh Farms Mauritius',
      businessLogo: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=200',
      products: [
        {
          id: 'new-1',
          name: 'Organic Honey',
          unit: '500g',
          price: 350.00,
          image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
          brandName: 'Bee Natural',
        },
        {
          id: 'new-2',
          name: 'Fresh Avocados',
          unit: 'Pack of 4',
          price: 180.00,
          image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400',
          brandName: 'Green Valley',
        },
      ],
    },
  },
  {
    id: 'post-4',
    type: 'brand_presentation',
    timestamp: '8h ago',
    data: {
      brandId: 'brand-002',
      brandName: 'Nespresso',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Nespresso-logo.svg/512px-Nespresso-logo.svg.png',
      distributorName: 'Premium Beverages Ltd',
      distributorId: 'dist-002',
      products: [
        {
          id: 'prod-4',
          name: 'Artisan Coffee Beans',
          unit: '500g',
          price: 450.00,
          image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
          isNew: true,
        },
        {
          id: 'prod-5',
          name: 'Green Tea Collection',
          unit: '50 bags',
          price: 280.00,
          image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400',
        },
        {
          id: 'prod-6',
          name: 'Chai Spice Blend',
          unit: '200g',
          price: 195.00,
          image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400',
        },
      ],
    },
  },
  {
    id: 'post-5',
    type: 'company_presentation',
    timestamp: '10h ago',
    data: {
      companyId: 'biz-002',
      companyName: 'Innodis Ltd',
      companyLogo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200',
      location: 'Curepipe, Mauritius',
      isConnected: true,
      brands: [
        {
          id: 'brand-201',
          name: 'Pringles',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Pringles_logo.svg/512px-Pringles_logo.svg.png',
          productsCount: 45,
        },
        {
          id: 'brand-202',
          name: "Lay's",
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lays_brand_logo.svg/512px-Lays_brand_logo.svg.png',
          productsCount: 28,
        },
      ],
    },
  },
  {
    id: 'post-6',
    type: 'new_products',
    timestamp: '12h ago',
    data: {
      postType: 'business_received',
      businessId: 'biz-002',
      businessName: 'Healthy Choice Foods',
      businessLogo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
      products: [
        {
          id: 'new-3',
          name: 'Quinoa Grain Mix',
          unit: '1kg',
          price: 520.00,
          image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
          brandName: "Nature's Best",
        },
        {
          id: 'new-4',
          name: 'Organic Chia Seeds',
          unit: '500g',
          price: 380.00,
          image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=400',
          brandName: "Nature's Best",
        },
        {
          id: 'new-5',
          name: 'Almond Butter',
          unit: '350g',
          price: 420.00,
          image: 'https://images.unsplash.com/photo-1612187117960-22c8f4f0d47f?w=400',
          brandName: "Nature's Best",
        },
      ],
    },
  },
  {
    id: 'post-7',
    type: 'brand_presentation',
    timestamp: '1d ago',
    data: {
      brandId: 'brand-003',
      brandName: 'Ocean Basket',
      brandLogo: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200',
      distributorName: 'Seafood Express',
      distributorId: 'dist-003',
      products: [
        {
          id: 'prod-7',
          name: 'Fresh Salmon Fillet',
          unit: '500g',
          price: 890.00,
          image: 'https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=400',
          isNew: true,
        },
        {
          id: 'prod-8',
          name: 'Tiger Prawns',
          unit: '1kg',
          price: 1200.00,
          image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400',
        },
      ],
    },
  },
  {
    id: 'post-8',
    type: 'company_presentation',
    timestamp: '1d ago',
    data: {
      companyId: 'biz-003',
      companyName: 'Asia Foods Mauritius',
      companyLogo: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=200',
      location: 'Quatre Bornes, Mauritius',
      isConnected: false,
      brands: [
        {
          id: 'brand-301',
          name: 'Kikkoman',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Kikkoman_logo.svg/512px-Kikkoman_logo.svg.png',
          productsCount: 67,
        },
        {
          id: 'brand-302',
          name: 'Maggi',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Maggi_Logo.svg/512px-Maggi_Logo.svg.png',
          productsCount: 42,
        },
        {
          id: 'brand-303',
          name: 'Uncle Ben\'s',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Ben%27s_Original_logo.svg/512px-Ben%27s_Original_logo.svg.png',
          productsCount: 15,
        },
      ],
    },
  },
  {
    id: 'post-9',
    type: 'new_products',
    timestamp: '2d ago',
    data: {
      postType: 'distributor_added',
      businessId: 'biz-003',
      businessName: 'Tropical Fruits Co.',
      businessLogo: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200',
      products: [
        {
          id: 'new-6',
          name: 'Fresh Lychees',
          unit: '1kg',
          price: 250.00,
          image: 'https://images.unsplash.com/photo-1577003833619-76bbd7f82948?w=400',
          brandName: 'Tropical Selection',
        },
        {
          id: 'new-7',
          name: 'Dragon Fruit',
          unit: 'Pack of 3',
          price: 320.00,
          image: 'https://images.unsplash.com/photo-1527325678964-54921661f888?w=400',
          brandName: 'Tropical Selection',
        },
        {
          id: 'new-8',
          name: 'Passion Fruit',
          unit: '500g',
          price: 180.00,
          image: 'https://images.unsplash.com/photo-1604495772376-9657f0035eb5?w=400',
          brandName: 'Tropical Selection',
        },
      ],
    },
  },
  {
    id: 'post-10',
    type: 'brand_presentation',
    timestamp: '2d ago',
    data: {
      brandId: 'brand-004',
      brandName: 'Danone',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Danone_dairy_2017_logo.svg/512px-Danone_dairy_2017_logo.svg.png',
      distributorName: 'Fresh Dairy Mauritius',
      distributorId: 'dist-004',
      products: [
        {
          id: 'prod-9',
          name: 'Greek Yogurt',
          unit: '500g',
          price: 165.00,
          image: 'https://images.unsplash.com/photo-1571212515416-fca988798a0b?w=400',
        },
        {
          id: 'prod-10',
          name: 'Aged Cheddar',
          unit: '250g',
          price: 295.00,
          image: 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400',
          isNew: true,
        },
        {
          id: 'prod-11',
          name: 'Fresh Mozzarella',
          unit: '200g',
          price: 185.00,
          image: 'https://images.unsplash.com/photo-1571506165871-ee72a35bc9d4?w=400',
        },
      ],
    },
  },
  {
    id: 'post-11',
    type: 'company_presentation',
    timestamp: '3d ago',
    data: {
      companyId: 'biz-004',
      companyName: 'Euro Foods International',
      companyLogo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
      location: 'Grand Baie, Mauritius',
      isConnected: true,
      brands: [
        {
          id: 'brand-401',
          name: 'Barilla',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Barilla_pasta_logo.svg/512px-Barilla_pasta_logo.svg.png',
          productsCount: 89,
        },
        {
          id: 'brand-402',
          name: 'Lavazza',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Lavazza-Logo.svg/512px-Lavazza-Logo.svg.png',
          productsCount: 54,
        },
        {
          id: 'brand-403',
          name: 'Galbani',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Galbani_Logo.svg/512px-Galbani_Logo.svg.png',
          productsCount: 37,
        },
      ],
    },
  },
  {
    id: 'post-12',
    type: 'new_products',
    timestamp: '3d ago',
    data: {
      postType: 'business_received',
      businessId: 'biz-004',
      businessName: 'Bakery Supreme',
      businessLogo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
      products: [
        {
          id: 'new-9',
          name: 'Artisan Sourdough Loaf',
          unit: '800g',
          price: 85.00,
          image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400',
          brandName: 'Bakery Supreme',
        },
        {
          id: 'new-10',
          name: 'Croissant Box',
          unit: '6 pcs',
          price: 220.00,
          image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
          brandName: 'Bakery Supreme',
        },
      ],
    },
  },
];

export default function BusinessExploreScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  
  // State
  const [refreshing, setRefreshing] = useState(false);
  
  // Navigation handlers
  const handleBack = () => {
    navigation.goBack();
  };
  
  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call - replace with actual data fetching
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  // Navigation handlers for posts
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
    console.log('Connect/Disconnect:', companyId, isConnected);
  };

  // Render feed post
  const renderFeedPost = ({ item }: { item: FeedPost }) => {
    switch (item.type) {
      case 'brand_presentation':
        return (
          <BrandPresentationPost
            key={item.id}
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
            // Product cards navigate to product detail (Order from ProductDetailScreen)
            onProductPress={(productId) => handleProductPress(productId, item.data.distributorId)}
          />
        );

      case 'company_presentation':
        return (
          <CompanyPresentationPost
            key={item.id}
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
            key={item.id}
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

      {/* Feed List */}
      <FlatList
        data={mockFeedPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedPost}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={appTheme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
      />
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
});
