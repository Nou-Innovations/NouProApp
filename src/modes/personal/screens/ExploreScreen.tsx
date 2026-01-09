/**
 * ExploreScreen - Personal Mode
 * Discover businesses, browse categories, search functionality
 * Based on app-logic.json navigation.personalProfileTabs.Explore
 * Uses SimpleHeader for scrollable search bar (like Message screen)
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import AppSearchBar, { AppSearchBarRef } from '@/shared/components/ui/AppSearchBar';
import BusinessListCard from '@/features/profile/components/BusinessListCard';
import SimpleHeader, { AnimatedFlatList } from '@/shared/components/layout/headers/SimpleHeader';
import PrimaryHeader from '@/shared/components/layout/headers/PrimaryHeader';

// Industry categories
const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'food_beverage', label: 'Food & Beverage', icon: 'restaurant-outline' },
  { id: 'general_retail', label: 'Retail', icon: 'storefront-outline' },
  { id: 'production', label: 'Production', icon: 'construct-outline' },
  { id: 'services', label: 'Services', icon: 'briefcase-outline' },
  { id: 'cosmetics', label: 'Cosmetics', icon: 'sparkles-outline' },
  { id: 'electronics', label: 'Electronics', icon: 'hardware-chip-outline' },
];

// Mock businesses data
const mockBusinesses = [
  {
    id: 'biz-001',
    name: 'NouPro Distribution',
    logo: 'https://picsum.photos/seed/noupro/100/100',
    industry: 'food_beverage',
    description: 'Leading distribution company serving multiple locations across Mauritius',
    productsCount: 150,
    rating: 4.9,
    featured: true,
    isConnected: true,
  },
  {
    id: 'biz-002',
    name: 'Global Supply Co.',
    logo: 'https://picsum.photos/seed/global/100/100',
    industry: 'general_retail',
    description: 'Global supply chain management specialists',
    productsCount: 320,
    rating: 4.7,
    featured: true,
    isConnected: false,
  },
  {
    id: 'biz-003',
    name: 'Fresh Farms Mauritius',
    logo: 'https://picsum.photos/seed/farms/100/100',
    industry: 'food_beverage',
    description: 'Fresh produce directly from local farms to your business',
    productsCount: 85,
    rating: 4.8,
    isConnected: false,
  },
  {
    id: 'biz-004',
    name: 'Island Beverages Ltd',
    logo: 'https://picsum.photos/seed/island/100/100',
    industry: 'food_beverage',
    description: 'Premium beverages distributor serving all of Mauritius',
    productsCount: 95,
    rating: 4.6,
    isConnected: true,
  },
  {
    id: 'biz-005',
    name: 'QuickMart Wholesale',
    logo: 'https://picsum.photos/seed/quick/100/100',
    industry: 'general_retail',
    description: 'Your one-stop shop for wholesale retail products',
    productsCount: 450,
    rating: 4.5,
    isConnected: false,
  },
  {
    id: 'biz-006',
    name: 'Clean & Fresh Co.',
    logo: 'https://picsum.photos/seed/clean/100/100',
    industry: 'cosmetics',
    description: 'Cleaning supplies and personal care products',
    productsCount: 120,
    rating: 4.4,
    isConnected: false,
  },
  {
    id: 'biz-007',
    name: 'TechZone Electronics',
    logo: 'https://picsum.photos/seed/techzone/100/100',
    industry: 'electronics',
    description: 'Electronics and gadgets for businesses',
    productsCount: 280,
    rating: 4.3,
    isConnected: false,
  },
  {
    id: 'biz-008',
    name: 'BuildRight Construction',
    logo: 'https://picsum.photos/seed/build/100/100',
    industry: 'production',
    description: 'Construction materials and supplies',
    productsCount: 190,
    rating: 4.5,
    isConnected: false,
  },
];

export default function ExploreScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const searchBarRef = useRef<AppSearchBarRef>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [connectionState, setConnectionState] = useState<Record<string, boolean>>(
    mockBusinesses.reduce((acc, biz) => ({ ...acc, [biz.id]: biz.isConnected }), {})
  );

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    let businesses = mockBusinesses;

    // Filter by category
    if (selectedCategory !== 'all') {
      businesses = businesses.filter((b) => b.industry === selectedCategory);
    }

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      businesses = businesses.filter(
        (b) =>
          b.name.toLowerCase().includes(searchLower) ||
          b.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort: featured first, then by rating
    return businesses.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.rating - a.rating;
    });
  }, [search, selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleBusinessPress = (businessId: string) => {
    // @ts-ignore
    navigation.navigate('ViewBusinessProfile', { businessId });
  };

  const handleConnect = (businessId: string) => {
    setConnectionState((prev) => ({
      ...prev,
      [businessId]: !prev[businessId],
    }));
  };

  const handleScroll = () => {
    if (searchBarRef.current?.isFocused()) {
      searchBarRef.current?.blur();
    }
  };

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected
                    ? appTheme.colors.primary
                    : appTheme.colors.cardBackground,
                  borderColor: isSelected
                    ? appTheme.colors.primary
                    : appTheme.colors.borderColor,
                },
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Icon
                name={category.icon as any}
                size={18}
                color={isSelected ? '#FFFFFF' : appTheme.colors.textLight}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: isSelected ? '#FFFFFF' : appTheme.colors.text },
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderResultsHeader = () => (
    <View style={styles.resultsHeader}>
      <Text style={[styles.resultsCount, { color: appTheme.colors.textLight }]}>
        {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'} found
      </Text>
    </View>
  );

  const renderBusinessItem = ({ item }: { item: typeof mockBusinesses[0] }) => (
    <BusinessListCard
      {...item}
      isConnected={connectionState[item.id]}
      onPress={() => handleBusinessPress(item.id)}
      onConnect={() => handleConnect(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="search" size={60} color={appTheme.colors.textLight} />
      <Text style={[styles.emptyTitle, { color: appTheme.colors.text }]}>
        No businesses found
      </Text>
      <Text style={[styles.emptySubtitle, { color: appTheme.colors.textLight }]}>
        {search
          ? `No results for "${search}"`
          : 'Try a different category or search term'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SimpleHeader
        headerComponent={
          <PrimaryHeader title="Explore" />
        }
        searchComponent={
          <View style={[styles.searchContainer, { backgroundColor: appTheme.colors.background }]}>
            <AppSearchBar
              ref={searchBarRef}
              placeholder="Search businesses..."
              value={search}
              onChangeText={setSearch}
              onClear={() => setSearch('')}
              containerStyle={styles.searchBar}
            />
          </View>
        }
        stickyComponent={
          <View style={{ backgroundColor: appTheme.colors.background }}>
            {renderCategories()}
          </View>
        }
      >
        <AnimatedFlatList
          data={filteredBusinesses}
          keyExtractor={(item: any) => item.id}
          renderItem={renderBusinessItem}
          ListHeaderComponent={renderResultsHeader}
          ListEmptyComponent={renderEmptyState}
          onScrollBeginDrag={handleScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={appTheme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      </SimpleHeader>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    height: 48,
  },
  screenTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 32,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  searchBar: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  categoriesContainer: {
    paddingVertical: theme.spacing.sm,
  },
  categoriesContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
    marginLeft: 6,
  },
  resultsHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  resultsCount: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
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
  },
});





