/**
 * ProRecentActivity - Business Mode Recent Activities preview
 * A borderless divided list of the latest business activity (invoices,
 * deliveries, orders, purchase orders/requests). Each row is tappable (opens the
 * related entity) with a chevron; "See all" opens the full Activities log.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { Skeleton, SkeletonColumn, SectionTitle } from '@/shared/components/ui';
import { RootStackParamList } from '@/shared/types/navigation';
import { formatActivityTime, type ActivityItem } from '@/features/business';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ProRecentActivityProps {
  items: ActivityItem[];
  isLoading?: boolean;
  maxItems?: number;
  onSeeAll?: () => void;
}

const ENTITY_CONFIG: Record<string, { icon: string; color: string }> = {
  invoice: { icon: 'receipt-text-outline', color: theme.colors.error },
  delivery: { icon: 'car-outline', color: theme.colors.warning },
  order: { icon: 'cart-outline', color: theme.colors.info },
  product: { icon: 'cube-outline', color: theme.colors.success },
  purchase_order: { icon: 'cart-outline', color: theme.colors.statusInReview },
  purchase_request: { icon: 'clipboard-outline', color: theme.colors.statusInReview },
};

const DEFAULT_CONFIG: { icon: string; color: string } = {
  icon: 'document-outline',
  color: theme.colors.textSecondary,
};

/** Open the detail screen for an activity based on its entity type. */
function openEntity(navigation: Nav, item: ActivityItem) {
  switch (item.entityType) {
    case 'order':
      navigation.navigate('OrderDetails', { orderId: item.entityId });
      break;
    case 'delivery':
      navigation.navigate('DeliveryDetail', { deliveryId: item.entityId, viewAs: 'self' });
      break;
    case 'invoice':
      navigation.navigate('InvoiceDetails', { invoiceId: item.entityId });
      break;
    case 'product':
      navigation.navigate('ProductDetail', { productId: item.entityId });
      break;
  }
}

export function ProRecentActivity({
  items,
  isLoading,
  maxItems = 5,
  onSeeAll,
}: ProRecentActivityProps) {
  const { theme: appTheme } = useTheme();
  const navigation = useNavigation<Nav>();

  const renderHeader = () => (
    <View style={styles.header}>
      <SectionTitle>Recent Activities</SectionTitle>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} style={styles.seeAllRow}>
          <Text style={[styles.seeAllText, { color: appTheme.colors.primary }]}>See all</Text>
          <Icon name="chevron-forward" size={16} color={appTheme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: appTheme.colors.borderColor }]} />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.listContent}>
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              {i > 0 && renderSeparator()}
              <View style={styles.row}>
                <Skeleton width={40} height={40} borderRadius={10} />
                <SkeletonColumn gap={6} style={{ flex: 1 }}>
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="80%" height={12} />
                </SkeletonColumn>
                <Skeleton width={38} height={11} />
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={[styles.stateCard, { backgroundColor: appTheme.colors.surface }]}>
          <Icon name="time-outline" size={28} color={appTheme.colors.textMuted} />
          <Text style={[styles.emptyText, { color: appTheme.colors.textSecondary }]}>
            No recent activity yet
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const config = ENTITY_CONFIG[item.entityType] || DEFAULT_CONFIG;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openEntity(navigation, item)}
        activeOpacity={0.6}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
          <Icon name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text
            style={[styles.itemSubtitle, { color: appTheme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: appTheme.colors.textMuted }]}>
          {formatActivityTime(item.timestamp)}
        </Text>
        <Icon name="chevron-forward" size={18} color={appTheme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  listContent: {
    paddingHorizontal: theme.spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
  },
  itemSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.regular,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    marginHorizontal: theme.spacing.sm,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default ProRecentActivity;
