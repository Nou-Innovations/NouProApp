/**
 * PartyHeaderCard Component
 * 
 * Displays the party information (client/supplier/destination) at the top of delivery detail views.
 * Reusable across all delivery detail view variants.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';

interface PartyHeaderCardProps {
  /** Company/business logo URL */
  logoUri?: string;
  /** Company/business name */
  name: string;
  /** Address to display */
  address: string;
  /** Callback when the name/logo is pressed (navigate to profile) */
  onPressProfile?: () => void;
  /** Callback when address is pressed (open maps). If not provided, opens Google Maps by default */
  onPressAddress?: () => void;
  /** Optional subtitle to display below the name */
  subtitle?: string;
  /** Optional: For transfers, show from/to locations */
  isTransfer?: boolean;
  fromLocation?: string;
  toLocation?: string;
}

export function PartyHeaderCard({
  logoUri,
  name,
  address,
  onPressProfile,
  onPressAddress,
  subtitle,
  isTransfer,
  fromLocation,
  toLocation,
}: PartyHeaderCardProps) {
  const handleAddressPress = () => {
    if (onPressAddress) {
      onPressAddress();
    } else {
      // Default: open Google Maps with the address
      const encodedAddress = encodeURIComponent(address);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPressProfile} disabled={!onPressProfile}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Icon name="business-outline" size={24} color={theme.colors.textSecondary} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.info}>
          <TouchableOpacity onPress={onPressProfile} disabled={!onPressProfile}>
            <Text style={styles.name}>{name}</Text>
          </TouchableOpacity>
          
          {isTransfer && fromLocation && toLocation ? (
            <View style={styles.transferLocationContainer}>
              <Text style={styles.locationText}>{fromLocation}</Text>
              <Icon 
                name="arrow-forward" 
                size={14} 
                color={theme.colors.textSecondary} 
                style={styles.transferArrow} 
              />
              <Text style={styles.locationText}>{toLocation}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleAddressPress} style={styles.addressContainer}>
              <Text style={styles.address}>{address}</Text>
            </TouchableOpacity>
          )}
          
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: 'InterCustom-Bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: 'InterCustom-Medium',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: 'InterCustom-Regular',
    marginTop: 4,
  },
  transferLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: 'InterCustom-Regular',
    flexShrink: 1,
  },
  transferArrow: {
    marginHorizontal: 6,
  },
});

export default PartyHeaderCard;
