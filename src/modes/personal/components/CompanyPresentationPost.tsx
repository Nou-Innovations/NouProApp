/**
 * CompanyPresentationPost Component
 * Feed post presenting a company/distributor with logo, name, location, follow button, and brand cards
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Avatar from '@/shared/components/ui/Avatar';
import { timeAgo } from '@/shared/utils/timeAgo';

const BRAND_CARD_WIDTH = 160;
const BRAND_LOGO_CONTAINER_SIZE = 160;
const BRAND_LOGO_SIZE = 120;

interface BrandItem {
  id: string;
  name: string;
  logo?: string;
  productsCount?: number;
}

interface CompanyPresentationPostProps {
  id: string;
  companyName: string;
  companyLogo?: string;
  location: string;
  /** Whether the viewer (a person) follows this business */
  isFollowing?: boolean;
  brands: BrandItem[];
  timestamp?: string;
  createdAt?: string;
  onCompanyPress?: () => void;
  onFollowPress?: () => void;
  onBrandPress?: (brandId: string) => void;
}

export function CompanyPresentationPost({
  id,
  companyName,
  companyLogo,
  location,
  isFollowing = false,
  brands = [],
  timestamp,
  createdAt,
  onCompanyPress,
  onFollowPress,
  onBrandPress,
}: CompanyPresentationPostProps) {
  const { theme: appTheme } = useTheme();

  const renderBrandCard = (brand: BrandItem) => (
    <TouchableOpacity
      key={brand.id}
      style={styles.brandCard}
      onPress={() => onBrandPress?.(brand.id)}
      activeOpacity={0.7}
    >
      {/* Logo Container - 160x160px with surface background, logo 120x120px centered */}
      <View style={[styles.brandLogoContainer, { backgroundColor: appTheme.colors.surface }]}>
        {brand.logo ? (
          <Image source={{ uri: brand.logo }} style={styles.brandLogo} />
        ) : (
          <View style={styles.brandLogoPlaceholder}>
            <Icon name="pricetag-outline" size={32} color={appTheme.colors.textMuted} />
          </View>
        )}
      </View>
      {/* Brand Name - 16px SemiBold primary */}
      <Text
        style={[styles.brandName, { color: appTheme.colors.text }]}
        numberOfLines={2}
      >
        {brand.name}
      </Text>
      {/* Products Count - 14px Medium secondary */}
      {brand.productsCount !== undefined && (
        <Text style={[styles.brandProductsCount, { color: appTheme.colors.textSecondary }]}>
          {brand.productsCount} products
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.cardBackground, borderBottomColor: appTheme.colors.borderColor }]}>
      {/* Company Header - Connect button aligned vertically with name and location */}
      <View style={styles.companyHeader}>
        <TouchableOpacity
          style={styles.companyInfoRow}
          onPress={onCompanyPress}
          activeOpacity={0.7}
        >
          <Avatar
            userId={id}
            userName={companyName}
            imageUri={companyLogo}
            size={48}
            style={styles.companyLogo}
          />
          <View style={styles.companyInfo}>
            {/* Company Name - 16px Bold primary */}
            <Text style={[styles.companyName, { color: appTheme.colors.text }]}>
              {companyName}
            </Text>
            {/* Location - 14px Medium secondary */}
            <View style={styles.locationRow}>
              <Icon name="location-outline" size={14} color={appTheme.colors.textSecondary} />
              <Text style={[styles.locationText, { color: appTheme.colors.textSecondary }]}>
                {location}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Follow Button - Vertically aligned, using secondary variant when following */}
        <TouchableOpacity
          style={[
            styles.connectButton,
            isFollowing
              ? { backgroundColor: appTheme.colors.cardBackground, borderWidth: 0 }
              : { backgroundColor: appTheme.colors.primary },
          ]}
          onPress={onFollowPress}
          activeOpacity={0.7}
        >
          {isFollowing ? (
            <>
              <Icon name="checkmark" size={16} color={appTheme.colors.text} />
              <Text style={[styles.connectButtonText, { color: appTheme.colors.text, marginLeft: 4 }]}>
                Following
              </Text>
            </>
          ) : (
            <>
              <Icon name="add" size={16} color={appTheme.colors.textInverse} />
              <Text style={[styles.connectButtonText, { color: appTheme.colors.textInverse, marginLeft: 4 }]}>
                Follow
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: appTheme.colors.textMuted }]}>
        {createdAt ? timeAgo(createdAt) : timestamp}
      </Text>

      {/* Section Title - 14px Medium primary */}
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Brands in Store
      </Text>

      {/* Brands Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.brandsContainer}
        decelerationRate="fast"
        snapToInterval={BRAND_CARD_WIDTH + theme.spacing.sm}
      >
        {brands.map(renderBrandCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.5,
    paddingBottom: theme.spacing.md,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  companyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    borderRadius: theme.borderRadius.md,
  },
  companyInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  // Company Name - 16px Bold primary
  companyName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Location - 14px Medium secondary
  locationText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginLeft: 4,
  },
  // Connect Button - vertically aligned
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
  },
  connectButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  // Section Title - 14px Medium primary
  sectionTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  brandsContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  // Brand Card - no border, left-aligned text
  brandCard: {
    width: BRAND_CARD_WIDTH,
    alignItems: 'flex-start',
  },
  // Logo Container - 160x160px with surface background
  brandLogoContainer: {
    width: BRAND_LOGO_CONTAINER_SIZE,
    height: BRAND_LOGO_CONTAINER_SIZE,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Brand Logo - 120x120px centered inside container
  brandLogo: {
    width: BRAND_LOGO_SIZE,
    height: BRAND_LOGO_SIZE,
    resizeMode: 'contain',
  },
  brandLogoPlaceholder: {
    width: BRAND_LOGO_SIZE,
    height: BRAND_LOGO_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Brand Name - 16px SemiBold primary
  brandName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    textAlign: 'left',
    marginBottom: 2,
    lineHeight: 20,
  },
  // Products Count - 14px Medium secondary
  brandProductsCount: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    textAlign: 'left',
  },
});

export default CompanyPresentationPost;
