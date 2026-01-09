/**
 * BusinessListCard Component
 * Displays business in explore/discovery lists
 * Following design.json specifications
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Avatar from '@/shared/components/ui/Avatar';
import Pill from '@/shared/components/ui/Pill';

interface BusinessListCardProps {
  id: string;
  name: string;
  logo?: string;
  industry?: string;
  description?: string;
  isConnected?: boolean;
  productsCount?: number;
  rating?: number;
  featured?: boolean;
  onPress?: () => void;
  onConnect?: () => void;
}

export function BusinessListCard({
  id,
  name,
  logo,
  industry,
  description,
  isConnected = false,
  productsCount,
  rating,
  featured = false,
  onPress,
  onConnect,
}: BusinessListCardProps) {
  const { theme: appTheme } = useTheme();

  const industryLabels: Record<string, string> = {
    food_beverage: 'Food & Beverage',
    general_retail: 'Retail',
    production: 'Production',
    services: 'Services',
    cosmetics: 'Cosmetics',
    electronics: 'Electronics',
    other: 'Other',
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.borderColor,
        },
        featured && styles.featuredContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Featured Badge */}
      {featured && (
        <View style={[styles.featuredBadge, { backgroundColor: appTheme.colors.accent }]}>
          <Icon name="star" size={12} color="#FFFFFF" />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Logo */}
        <Avatar
          userId={id}
          userName={name}
          imageUri={logo}
          size={64}
          style={styles.logo}
        />

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.name, { color: appTheme.colors.text }]} numberOfLines={1}>
            {name}
          </Text>

          {industry && (
            <Text style={[styles.industry, { color: appTheme.colors.textLight }]}>
              {industryLabels[industry] || industry}
            </Text>
          )}

          {description && (
            <Text
              style={[styles.description, { color: appTheme.colors.textLight }]}
              numberOfLines={2}
            >
              {description}
            </Text>
          )}

          {/* Stats */}
          <View style={styles.stats}>
            {productsCount !== undefined && (
              <View style={styles.stat}>
                <Icon name="cube-outline" size={14} color={appTheme.colors.textLight} />
                <Text style={[styles.statText, { color: appTheme.colors.textLight }]}>
                  {productsCount} products
                </Text>
              </View>
            )}
            {rating !== undefined && (
              <View style={styles.stat}>
                <Icon name="star" size={14} color="#F59E0B" />
                <Text style={[styles.statText, { color: appTheme.colors.textLight }]}>
                  {rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Connect Button */}
        <TouchableOpacity
          style={[
            styles.connectButton,
            isConnected
              ? { backgroundColor: appTheme.colors.lightGrey }
              : { backgroundColor: appTheme.colors.primary },
          ]}
          onPress={onConnect}
        >
          <Text
            style={[
              styles.connectButtonText,
              { color: isConnected ? appTheme.colors.text : '#FFFFFF' },
            ]}
          >
            {isConnected ? 'Connected' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  featuredContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#D23030',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: theme.spacing.sm,
  },
  featuredText: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.medium,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logo: {
    borderRadius: 8,
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  name: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 2,
  },
  industry: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginBottom: 4,
  },
  description: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 18,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  statText: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    marginLeft: 4,
  },
  connectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  connectButtonText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default BusinessListCard;






