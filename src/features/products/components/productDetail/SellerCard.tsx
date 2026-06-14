/**
 * SellerCard — distributor/seller summary inside the info sheet.
 * Buyer + personal modes only (the owner IS the seller). Tapping opens the
 * distributor's business profile. Tolerates missing logo/rating/location.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { Avatar } from '@/shared/components/ui/Avatar';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { SellerInfo } from '@/shared/types/productDetails';

interface Props {
  seller: SellerInfo;
  onPress: () => void;
}

const SellerCard: React.FC<Props> = ({ seller, onPress }) => {
  const { theme: appTheme } = useTheme();

  const metaParts: { icon: string; label: string }[] = [];
  if (typeof seller.rating === 'number' && seller.rating > 0) {
    metaParts.push({ icon: 'star', label: seller.rating.toFixed(1) });
  }
  if (seller.location) {
    metaParts.push({ icon: 'location-outline', label: seller.location });
  }
  if (seller.responseTime) {
    metaParts.push({ icon: 'time-outline', label: seller.responseTime });
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: appTheme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar
        userId={seller.companyId || seller.companyName || 'seller'}
        userName={seller.companyName || 'Seller'}
        imageUri={seller.companyLogo}
        size={44}
      />

      <View style={styles.middle}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: appTheme.colors.text }]} numberOfLines={1}>
            {seller.companyName || 'Distributor'}
          </Text>
          {seller.isVerified && (
            <Icon name="shield-checkmark" size={15} color={appTheme.colors.success} />
          )}
        </View>

        {metaParts.length > 0 ? (
          <View style={styles.metaRow}>
            {metaParts.map((m, i) => (
              <View key={i} style={styles.metaItem}>
                <Icon
                  name={m.icon}
                  size={12}
                  color={m.icon === 'star' ? appTheme.colors.warning : appTheme.colors.textSecondary}
                />
                <Text style={[styles.metaText, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.metaText, { color: appTheme.colors.textSecondary }]}>
            View distributor
          </Text>
        )}
      </View>

      <Icon name="chevron-forward" size={20} color={appTheme.colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
    marginTop: 4,
  },
  middle: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default SellerCard;
