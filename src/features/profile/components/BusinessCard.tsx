import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { Text, BodyBold, Caption } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface BusinessCardProps {
  businessName: string;
  businessLogo?: string;
  businessLocation: string;
  onPress?: () => void;
}

const BusinessCard: React.FC<BusinessCardProps> = ({ businessName, businessLogo, businessLocation, onPress }) => {
  const logoSize = 52;
  const { theme: appTheme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    console.log('BusinessCard - Logo URL:', businessLogo);
  }, [businessLogo]);

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.cardContainer, 
        { 
          backgroundColor: '#F6F3F0',
          borderBottomColor: appTheme.colors.borderColor 
        }
      ]}
    >
      <View style={styles.cardContent}>
        {businessLogo && !imageError ? (
          <Image 
            source={{ uri: businessLogo }} 
            style={[styles.logo, { width: logoSize, height: logoSize }]} 
            onError={(error) => {
              console.log('Business logo loading error:', error.nativeEvent.error);
              setImageError(true);
            }}
            onLoad={() => {
              console.log('Business logo loaded successfully');
              setImageLoaded(true);
            }}
            onLoadStart={() => {
              console.log('Business logo loading started');
            }}
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
          <BodyBold style={[styles.businessName, { color: appTheme.colors.text }]}>{businessName}</BodyBold>
          <Caption style={[styles.businessLocation, { color: appTheme.colors.textLight }]}>
            {businessLocation}
          </Caption>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 12,
    marginBottom: 36,
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
  businessName: {
    marginBottom: 4,
  },
  businessLocation: {
  },
});

export default BusinessCard; 