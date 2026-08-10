/**
 * BusinessListCard Component
 * Displays business in explore/discovery lists
 * Following design.json specifications
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, ActivityIndicator } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { ListItemCard } from '@/shared/components/ui';

interface BusinessListCardProps {
  id: string;
  name: string;
  logo?: string;
  industry?: string;
  isConnected?: boolean;
  /**
   * Which relationship this card offers. In personal mode a person FOLLOWS a business
   * (docs/PROFILES.md) — Explore used to say "Connect" regardless, and connecting needs
   * a company, so the button did nothing for anyone without one.
   */
  action?: 'connect' | 'follow';
  /** Request in flight — the button was previously always enabled with no feedback. */
  pending?: boolean;
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
  isConnected = false,
  action = 'connect',
  pending = false,
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

  // Build extra info with stats
  const extraInfoContent = () => {
    const hasStats = productsCount !== undefined || rating !== undefined;
    if (!hasStats) return null;

    return (
      <View style={styles.stats}>
        {productsCount !== undefined && (
          <View style={styles.stat}>
            <Text style={[styles.statText, { color: appTheme.colors.textMuted, marginLeft: 0 }]}>
              {productsCount} products
            </Text>
          </View>
        )}
        {rating !== undefined && (
          <View style={styles.stat}>
            <Icon name="star" size={14} color={appTheme.colors.warning} />
            <Text style={[styles.statText, { color: appTheme.colors.textMuted }]}>
              {rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Relationship button — Follow/Following in personal mode, Connect/Connected in business mode.
  const activeLabel = action === 'follow' ? 'Following' : 'Connected';
  const idleLabel = action === 'follow' ? 'Follow' : 'Connect';
  const connectButton = (
    <TouchableOpacity
      style={[
        styles.connectButton,
        isConnected
          ? { backgroundColor: appTheme.colors.surface }
          : { backgroundColor: appTheme.colors.primary },
        pending && { opacity: 0.6 },
      ]}
      onPress={onConnect}
      disabled={pending || !onConnect}
      accessibilityRole="button"
      accessibilityLabel={`${isConnected ? activeLabel : idleLabel} ${name}`}
    >
      {pending ? (
        <ActivityIndicator size="small" color={isConnected ? appTheme.colors.text : '#FFFFFF'} />
      ) : (
        <Text
          style={[
            styles.connectButtonText,
            { color: isConnected ? appTheme.colors.text : '#FFFFFF' },
          ]}
        >
          {isConnected ? activeLabel : idleLabel}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Container style for featured
  const containerStyle: ViewStyle | undefined = featured 
    ? { borderLeftWidth: 3, borderLeftColor: appTheme.colors.accent }
    : undefined;

  // Featured badge as top element
  const featuredBadge = featured ? (
    <View style={[styles.featuredBadge, { backgroundColor: appTheme.colors.accent }]}>
      <Icon name="star" size={12} color="#FFFFFF" />
      <Text style={styles.featuredText}>Featured</Text>
    </View>
  ) : null;

  return (
    <View>
      {featuredBadge && (
        <View style={styles.featuredContainer}>{featuredBadge}</View>
      )}
      <ListItemCard
        avatar={{
          type: logo ? 'image' : 'initials',
          userId: id,
          userName: name,
          imageUri: logo,
        }}
        title={name}
        subtitle={industry ? industryLabels[industry] || industry : undefined}
        rightColumn={connectButton}
        centerRightColumn
        extraContent={extraInfoContent()}
        onPress={onPress}
        showDivider
        style={containerStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  featuredContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredText: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.medium,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default React.memo(BusinessListCard);
