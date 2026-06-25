/**
 * BusinessLocationScreen
 * Select business location on map during registration
 */

import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthStackParamList } from '@/shared/types/navigation';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'BusinessLocation'>;

// Default map region (Mauritius)
const DEFAULT_REGION: Region = {
  latitude: -20.2,
  longitude: 57.5,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

interface SelectedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export default function BusinessLocationScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { businessData, fromProfileSwitcher, pendingAuth } = route.params;
  
  // State
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [markerPosition, setMarkerPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const isFormValid = selectedLocation !== null;

  // Format geocoded address
  const formatAddress = (address: Location.LocationGeocodedAddress): string => {
    const parts = [
      address.streetNumber,
      address.street,
      address.city,
      address.region,
      address.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Get current location
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        AppAlert.alert('Permission Denied', 'Please enable location services to use this feature.');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setMapRegion(newRegion);
      setMarkerPosition({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        setSearchAddress(formatAddress(address));
      }

      mapRef.current?.animateToRegion(newRegion, 500);
    } catch (error) {
      console.error('Error getting location:', error);
      AppAlert.alert('Error', 'Failed to get current location.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Handle map press
  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });

    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        setSearchAddress(formatAddress(address));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  // Search for address
  const searchForAddress = async () => {
    if (!searchAddress.trim()) return;

    setIsLoadingLocation(true);
    try {
      const results = await Location.geocodeAsync(searchAddress);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        const newRegion: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(newRegion);
        setMarkerPosition({ latitude, longitude });
        mapRef.current?.animateToRegion(newRegion, 500);
      } else {
        AppAlert.alert('Not Found', 'Could not find the address. Please try a different search.');
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      AppAlert.alert('Error', 'Failed to search for address.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Confirm address selection
  const handleConfirmAddress = () => {
    if (markerPosition && searchAddress) {
      setSelectedLocation({
        address: searchAddress,
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
      });
      setShowMapModal(false);
    } else {
      AppAlert.alert('No Location Selected', 'Please select a location on the map or search for an address.');
    }
  };

  // Open map modal
  const openMapModal = () => {
    setShowMapModal(true);
    if (!markerPosition) {
      getCurrentLocation();
    }
  };

  const handleContinue = () => {
    if (!selectedLocation) return;

    navigation.navigate('BusinessHours', {
      businessData,
      location: selectedLocation,
      fromProfileSwitcher,
      pendingAuth,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Business location
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            Select your address on the map and enter your address so we can easily locate your business.
          </Text>
        </View>

        {/* Location Selector */}
        <View style={styles.formContainer}>
          <TouchableOpacity
            style={[
              styles.locationField,
              {
                borderColor: appTheme.colors.borderColor,
                backgroundColor: appTheme.colors.inputBackground,
              },
            ]}
            onPress={openMapModal}
            activeOpacity={0.7}
          >
            {selectedLocation ? (
              <View style={styles.selectedLocationContent}>
                <Icon name="location" size={20} color={appTheme.colors.primary} />
                <Text 
                  style={[styles.locationText, { color: appTheme.colors.text }]}
                  numberOfLines={2}
                >
                  {selectedLocation.address}
                </Text>
              </View>
            ) : (
              <View style={styles.locationPlaceholder}>
                <Icon name="map-outline" size={20} color={appTheme.colors.textMuted} />
                <Text style={[styles.locationPlaceholderText, { color: appTheme.colors.textMuted }]}>
                  Tap to select address on map
                </Text>
              </View>
            )}
            <Icon name="chevron-forward" size={20} color={appTheme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Button */}
      <View style={[
        styles.bottomContainer,
        { paddingBottom: insets.bottom + 16 }
      ]}>
        <AppButton
          title="Continue"
          onPress={handleContinue}
          variant={isFormValid ? 'primary' : 'disabled'}
          disabled={!isFormValid}
        />
      </View>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowMapModal(false)}
      >
        <SafeAreaView style={[styles.mapModalContainer, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
          {/* Map Header */}
          <View style={[styles.mapHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
            <TouchableOpacity
              style={styles.mapHeaderButton}
              onPress={() => setShowMapModal(false)}
            >
              <Icon name="close" size={24} color={appTheme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.mapHeaderTitle, { color: appTheme.colors.text }]}>
              Select Address
            </Text>
            <TouchableOpacity
              style={styles.mapHeaderButton}
              onPress={getCurrentLocation}
              disabled={isLoadingLocation}
            >
              <Icon 
                name="locate" 
                size={24} 
                color={isLoadingLocation ? appTheme.colors.textMuted : appTheme.colors.primary} 
              />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.mapSearchContainer, { backgroundColor: appTheme.colors.background }]}>
            <View style={[styles.mapSearchBar, { 
              backgroundColor: appTheme.colors.inputBackground,
              borderColor: appTheme.colors.borderColor,
            }]}>
              <Icon name="search" size={20} color={appTheme.colors.textMuted} />
              <TextInput
                style={[styles.mapSearchInput, { color: appTheme.colors.text }]}
                value={searchAddress}
                onChangeText={setSearchAddress}
                placeholder="Search for an address..."
                placeholderTextColor={appTheme.colors.textMuted}
                onSubmitEditing={searchForAddress}
                returnKeyType="search"
              />
              {searchAddress.length > 0 && (
                <TouchableOpacity onPress={() => setSearchAddress('')}>
                  <Icon name="close-circle" size={20} color={appTheme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Map View */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={mapRegion}
              onRegionChangeComplete={setMapRegion}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {markerPosition && (
                <Marker
                  coordinate={markerPosition}
                  draggable
                  onDragEnd={(e) => handleMapPress(e)}
                >
                  <View style={[styles.markerContainer, { backgroundColor: appTheme.colors.primary }]}>
                    <Icon name="location" size={24} color="#FFFFFF" />
                  </View>
                </Marker>
              )}
            </MapView>

            {/* Instructions */}
            <View style={[styles.mapInstructions, { backgroundColor: appTheme.colors.cardBackground }]}>
              <Icon name="information-circle-outline" size={18} color={appTheme.colors.textSecondary} />
              <Text style={[styles.mapInstructionsText, { color: appTheme.colors.textSecondary }]}>
                Tap on the map or search to select location
              </Text>
            </View>
          </View>

          {/* Confirm Button */}
          <View style={[styles.mapBottomActions, { 
            backgroundColor: appTheme.colors.background,
            borderTopColor: appTheme.colors.borderColor,
            paddingBottom: insets.bottom + 16,
          }]}>
            {markerPosition && searchAddress && (
              <View style={[styles.selectedLocationPreview, { backgroundColor: appTheme.colors.surface }]}>
                <Icon name="location" size={20} color={appTheme.colors.primary} />
                <Text 
                  style={[styles.selectedLocationText, { color: appTheme.colors.text }]}
                  numberOfLines={2}
                >
                  {searchAddress}
                </Text>
              </View>
            )}
            <AppButton
              title="Confirm Address"
              onPress={handleConfirmAddress}
              variant={markerPosition ? 'primary' : 'disabled'}
              disabled={!markerPosition}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 40,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 24,
  },
  formContainer: {
    gap: 16,
  },
  locationField: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  locationPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationPlaceholderText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mapHeaderButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.semiBold,
  },
  mapSearchContainer: {
    padding: 12,
  },
  mapSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mapInstructions: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  mapInstructionsText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    flex: 1,
  },
  mapBottomActions: {
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  selectedLocationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  selectedLocationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    lineHeight: 20,
  },
});
