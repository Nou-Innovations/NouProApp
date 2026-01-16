import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { Text, BodyBold, Caption } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface BrandCardProps {
  brandName: string;
  brandLogo?: string;
  productCount: number;
  isExpanded: boolean;
  isFirst?: boolean;
  onPress?: () => void;
}

const BrandCard: React.FC<BrandCardProps> = ({ brandName, brandLogo, productCount, isExpanded, isFirst = false, onPress }) => {
  const logoSize = 48;
  const { theme: appTheme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.cardContainer,
        {
          backgroundColor: appTheme.colors.cardBackground,
          borderBottomColor: appTheme.colors.surface,
        },
        (isFirst || isExpanded) && {
          borderTopWidth: 1,
          borderTopColor: isExpanded ? appTheme.colors.primary : appTheme.colors.surface,
        },
        isExpanded && { borderBottomWidth: 0 },
      ]}
    >
      <View style={styles.cardContent}>
        {brandLogo ? (
          <Image 
            source={{ uri: brandLogo }} 
            style={[styles.logo, { width: logoSize, height: logoSize }]} 
          />
        ) : (
          <View style={[
            styles.logoPlaceholder, 
            { 
              width: logoSize, 
              height: logoSize,
              backgroundColor: appTheme.colors.inputBackground 
            }
          ]}>
            <Icon name="business-outline" size={logoSize * 0.5} color={appTheme.colors.textLight} />
          </View>
        )}
        <View style={styles.textContainer}>
          <BodyBold style={[styles.brandName, { color: appTheme.colors.primary }]}>{brandName}</BodyBold>
          <Caption style={[styles.productCount, { color: appTheme.colors.textSecondary }]}>
            {productCount} product{productCount !== 1 ? 's' : ''}
          </Caption>
        </View>
      </View>
      <Icon 
        name={isExpanded ? "chevron-down-outline" : "chevron-forward-outline"} 
        size={20} 
        color={isExpanded ? appTheme.colors.primary : appTheme.colors.iconMuted} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md - 4,
  },
  logoPlaceholder: {
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md - 4,
  },
  textContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  brandName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 4,
  },
  productCount: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
});

export default BrandCard; 