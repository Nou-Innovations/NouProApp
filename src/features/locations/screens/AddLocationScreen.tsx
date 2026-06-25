/**
 * AddLocationScreen - Create a new business location
 * Screen for adding new locations to the business with map-based address selection
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Modal, Switch } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import ListItemCard from '@/shared/components/ui/ListItemCard';
import { AppButton, SectionTitle } from '@/shared/components/ui';
import { createLocation } from '@/features/locations/locations.service';
import { canUseIndependentLocations } from '@/shared/utils/permissions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Location types based on business needs
type LocationType = 
  | 'warehouse' 
  | 'store' 
  | 'office' 
  | 'factory' 
  | 'distribution_center' 
  | 'showroom'
  | 'service_center'
  | 'other';

// Location type options with labels and icons
const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string; icon: string; description: string }[] = [
  { value: 'warehouse', label: 'Warehouse', icon: 'cube-outline', description: 'Storage and inventory facility' },
  { value: 'store', label: 'Store', icon: 'storefront-outline', description: 'Retail or customer-facing location' },
  { value: 'office', label: 'Office', icon: 'business-outline', description: 'Administrative or headquarters' },
  { value: 'factory', label: 'Factory', icon: 'construct-outline', description: 'Manufacturing or production site' },
  { value: 'distribution_center', label: 'Distribution Center', icon: 'git-network-outline', description: 'Logistics hub for deliveries' },
  { value: 'showroom', label: 'Showroom', icon: 'sparkles-outline', description: 'Product display location' },
  { value: 'service_center', label: 'Service Center', icon: 'build-outline', description: 'Repair or service facility' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', description: 'Custom location type' },
];

// Default map region (Mauritius)
const DEFAULT_REGION: Region = {
  latitude: -20.2,
  longitude: 57.5,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

interface SelectedAddress {
  address: string;
  latitude: number;
  longitude: number;
}

export default function AddLocationScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const mapRef = useRef<MapView>(null);

  // Enterprise check
  const plan = activeBusiness?.plan || null;
  const isEnterprise = canUseIndependentLocations(plan);

  // Form state
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState<LocationType | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [operatingMode, setOperatingMode] = useState<'DEPENDENT' | 'INDEPENDENT'>('DEPENDENT');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // Map state
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [markerPosition, setMarkerPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Get selected type label
  const selectedTypeOption = LOCATION_TYPE_OPTIONS.find(opt => opt.value === locationType);

  // Check if form is valid
  const isFormValid = locationName.trim() !== '' && locationType !== null && selectedAddress !== null;

  // Request location permissions and get current location
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

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const formattedAddress = formatAddress(address);
        setSearchAddress(formattedAddress);
      }

      mapRef.current?.animateToRegion(newRegion, 500);
    } catch (error) {
      console.error('Error getting location:', error);
      AppAlert.alert('Error', 'Failed to get current location.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

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

  // Handle map press to select location
  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });

    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        const formattedAddress = formatAddress(address);
        setSearchAddress(formattedAddress);
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
      setSelectedAddress({
        address: searchAddress,
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
      });
      setShowMapModal(false);
    } else {
      AppAlert.alert('No Location Selected', 'Please select a location on the map or search for an address.');
    }
  };

  // Handle type selection
  const handleSelectType = (type: LocationType) => {
    setLocationType(type);
    setShowTypeSheet(false);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!activeBusiness?.id) {
      AppAlert.alert('Error', 'No active business selected');
      return;
    }

    if (!isFormValid) {
      AppAlert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await createLocation(activeBusiness.id, {
        name: locationName.trim(),
        location_type: locationType,
        address: selectedAddress?.address,
        latitude: selectedAddress?.latitude,
        longitude: selectedAddress?.longitude,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        operating_mode: operatingMode,
        is_public: operatingMode === 'INDEPENDENT' ? isPublic : false,
        is_primary: false,
      });

      AppAlert.alert(
        'Success',
        'Location created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating location:', error);
      AppAlert.alert('Error', 'Failed to create location. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open map modal and get current location
  const openMapModal = () => {
    setShowMapModal(true);
    if (!markerPosition) {
      getCurrentLocation();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Create new Location"
        leftAction={{
          icon: 'chevron-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Go back',
        }}
      />

      <KeyboardAwareScreen
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={[styles.title, { color: appTheme.colors.text }]}>
              Add a new location
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              Create a new location for your business to manage operations, track inventory, and assign staff
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Location Name */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>
                Location Name <Text style={{ color: appTheme.colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }
                ]}
                value={locationName}
                onChangeText={setLocationName}
                placeholder="e.g., Main Warehouse, City Center Shop"
                placeholderTextColor={appTheme.colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Text style={[styles.fieldHint, { color: appTheme.colors.textMuted }]}>
                This will be displayed as the location identifier
              </Text>
            </View>

            {/* Location Type */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>
                Location Type <Text style={{ color: appTheme.colors.error }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                  }
                ]}
                onPress={() => setShowTypeSheet(true)}
                activeOpacity={0.7}
              >
                {selectedTypeOption ? (
                  <View style={styles.selectedTypeContent}>
                    <Icon 
                      name={selectedTypeOption.icon as any} 
                      size={20} 
                      color={appTheme.colors.primary} 
                    />
                    <Text style={[styles.selectFieldText, { color: appTheme.colors.text }]}>
                      {selectedTypeOption.label}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.selectFieldPlaceholder, { color: appTheme.colors.textMuted }]}>
                    Select location type
                  </Text>
                )}
                <Icon name="chevron-down" size={20} color={appTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Address */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>
                Address <Text style={{ color: appTheme.colors.error }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  styles.addressField,
                  {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                  }
                ]}
                onPress={openMapModal}
                activeOpacity={0.7}
              >
                {selectedAddress ? (
                  <View style={styles.selectedAddressContent}>
                    <Icon 
                      name="location" 
                      size={20} 
                      color={appTheme.colors.primary} 
                    />
                    <Text 
                      style={[styles.selectFieldText, { color: appTheme.colors.text, flex: 1 }]}
                      numberOfLines={2}
                    >
                      {selectedAddress.address}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.addressPlaceholder}>
                    <Icon name="map-outline" size={20} color={appTheme.colors.textMuted} />
                    <Text style={[styles.selectFieldPlaceholder, { color: appTheme.colors.textMuted }]}>
                      Tap to select address on map
                    </Text>
                  </View>
                )}
                <Icon name="chevron-forward" size={20} color={appTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Phone */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>
                Phone
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g., +230 123 4567"
                placeholderTextColor={appTheme.colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Email */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="e.g., location@business.com"
                placeholderTextColor={appTheme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Operating Mode (Enterprise only) */}
            {isEnterprise && (
              <View style={styles.fieldContainer}>
                <SectionTitle style={{ marginBottom: 8 }}>
                  Advanced Settings
                </SectionTitle>

                <View style={[styles.settingRow, { borderColor: appTheme.colors.borderColor }]}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: appTheme.colors.text }]}>
                      Independent Mode
                    </Text>
                    <Text style={[styles.settingDescription, { color: appTheme.colors.textSecondary }]}>
                      Location can create its own orders and invoices
                    </Text>
                  </View>
                  <Switch
                    value={operatingMode === 'INDEPENDENT'}
                    onValueChange={(value) => {
                      setOperatingMode(value ? 'INDEPENDENT' : 'DEPENDENT');
                      if (!value) setIsPublic(false);
                    }}
                    trackColor={{ false: appTheme.colors.surface, true: appTheme.colors.primary + '80' }}
                    thumbColor={operatingMode === 'INDEPENDENT' ? appTheme.colors.primary : appTheme.colors.textMuted}
                  />
                </View>

                {operatingMode === 'INDEPENDENT' && (
                  <View style={[styles.settingRow, { borderColor: appTheme.colors.borderColor }]}>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingLabel, { color: appTheme.colors.text }]}>
                        Public Visibility
                      </Text>
                      <Text style={[styles.settingDescription, { color: appTheme.colors.textSecondary }]}>
                        Location visible on public storefront
                      </Text>
                    </View>
                    <Switch
                      value={isPublic}
                      onValueChange={setIsPublic}
                      trackColor={{ false: appTheme.colors.surface, true: appTheme.colors.primary + '80' }}
                      thumbColor={isPublic ? appTheme.colors.primary : appTheme.colors.textMuted}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
      </KeyboardAwareScreen>

      {/* Bottom Action Button */}
      <View style={[styles.bottomActions, {
        borderTopColor: appTheme.colors.borderColor,
        backgroundColor: appTheme.colors.background,
      }]}>
        <AppButton
          title="Create"
          onPress={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          loading={isSubmitting}
          fullWidth
        />
      </View>

      {/* Location Type Selection Bottom Sheet */}
      <AppBottomSheet
        visible={showTypeSheet}
        onClose={() => setShowTypeSheet(false)}
        title="Select Location Type"
      >
        {LOCATION_TYPE_OPTIONS.map((option, index) => (
          <ListItemCard
            key={option.value}
            avatar={{
              type: 'icon',
              icon: option.icon,
              iconColor: appTheme.colors.text,
              backgroundColor: appTheme.colors.surface,
            }}
            title={option.label}
            subtitle={option.description}
            onPress={() => handleSelectType(option.value)}
            selected={locationType === option.value}
            showCheckmark
            showDivider={index < LOCATION_TYPE_OPTIONS.length - 1}
          />
        ))}
      </AppBottomSheet>

      {/* Map Modal for Address Selection */}
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

            {/* Instructions Overlay */}
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
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: markerPosition ? appTheme.colors.primary : appTheme.colors.surface,
                }
              ]}
              onPress={handleConfirmAddress}
              disabled={!markerPosition}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.confirmButtonText,
                { color: markerPosition ? '#FFFFFF' : appTheme.colors.textMuted }
              ]}>
                Confirm Address
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  heroSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
  },
  formSection: {
    gap: 24,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 4,
  },
  selectField: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressField: {
    minHeight: 52,
    height: 'auto',
    paddingVertical: 12,
  },
  selectedTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedAddressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  addressPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectFieldText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  selectFieldPlaceholder: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
  },
  // Bottom Sheet Styles
  typeOptionsContainer: {
    gap: 8,
    paddingBottom: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  typeOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeOptionTextContainer: {
    flex: 1,
  },
  typeOptionLabel: {
    fontSize: 16,
  },
  typeOptionDescription: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
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
  confirmButton: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.medium,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
    lineHeight: 18,
  },
});
