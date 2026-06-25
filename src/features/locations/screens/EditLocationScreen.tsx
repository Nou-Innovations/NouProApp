/**
 * EditLocationScreen - Edit an existing business location
 * Screen for modifying location details with map-based address editing
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Modal, ActivityIndicator, Switch } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as ExpoLocation from 'expo-location';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import ListItemCard from '@/shared/components/ui/ListItemCard';
import { AppButton, SectionTitle } from '@/shared/components/ui';
import { getLocation, updateLocation } from '@/features/locations/locations.service';
import type { BusinessLocation } from '@/shared/types/business';
import type { RootStackParamList } from '@/shared/types/navigation';
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

export default function EditLocationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EditLocation'>>();
  const { locationId } = route.params;
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const mapRef = useRef<MapView>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [originalData, setOriginalData] = useState<BusinessLocation | null>(null);

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

  // Enterprise check
  const plan = activeBusiness?.plan || null;
  const isEnterprise = canUseIndependentLocations(plan);

  // Load location data
  useEffect(() => {
    loadLocation();
  }, [locationId]);

  const loadLocation = async () => {
    setIsLoading(true);
    try {
      const location = await getLocation(locationId);
      setOriginalData(location);

      // Populate form
      setLocationName(location.name || '');
      setLocationType((location.location_type as LocationType) || null);
      setPhone(location.phone || '');
      setEmail(location.email || '');
      setOperatingMode(location.operating_mode || 'DEPENDENT');
      setIsPublic(location.is_public || false);

      if (location.address) {
        setSelectedAddress({
          address: location.address,
          latitude: location.latitude || DEFAULT_REGION.latitude,
          longitude: location.longitude || DEFAULT_REGION.longitude,
        });
      }

      if (location.latitude && location.longitude) {
        const region: Region = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(region);
        setMarkerPosition({ latitude: location.latitude, longitude: location.longitude });
        setSearchAddress(location.address || '');
      }
    } catch (error) {
      console.error('Error loading location:', error);
      AppAlert.alert('Error', 'Failed to load location details.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived state
  const selectedTypeOption = LOCATION_TYPE_OPTIONS.find(opt => opt.value === locationType);
  const isFormValid = locationName.trim() !== '' && locationType !== null && selectedAddress !== null;

  // Change detection
  const hasChanges = originalData ? (
    locationName.trim() !== (originalData.name || '') ||
    locationType !== (originalData.location_type || null) ||
    selectedAddress?.address !== (originalData.address || undefined) ||
    selectedAddress?.latitude !== (originalData.latitude || undefined) ||
    selectedAddress?.longitude !== (originalData.longitude || undefined) ||
    phone.trim() !== (originalData.phone || '') ||
    email.trim() !== (originalData.email || '') ||
    operatingMode !== (originalData.operating_mode || 'DEPENDENT') ||
    isPublic !== (originalData.is_public || false)
  ) : false;

  // Map helpers
  const formatAddress = (address: ExpoLocation.LocationGeocodedAddress): string => {
    const parts = [
      address.streetNumber,
      address.street,
      address.city,
      address.region,
      address.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        AppAlert.alert('Permission Denied', 'Please enable location services to use this feature.');
        setIsLoadingLocation(false);
        return;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
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

      const [address] = await ExpoLocation.reverseGeocodeAsync({
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

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });

    try {
      const [address] = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        setSearchAddress(formatAddress(address));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const searchForAddress = async () => {
    if (!searchAddress.trim()) return;

    setIsLoadingLocation(true);
    try {
      const results = await ExpoLocation.geocodeAsync(searchAddress);
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

  const handleSelectType = (type: LocationType) => {
    setLocationType(type);
    setShowTypeSheet(false);
  };

  const openMapModal = () => {
    setShowMapModal(true);
    if (!markerPosition && !selectedAddress) {
      getCurrentLocation();
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!isFormValid || !hasChanges) return;

    setIsSubmitting(true);

    try {
      await updateLocation(locationId, {
        name: locationName.trim(),
        location_type: locationType,
        address: selectedAddress?.address,
        latitude: selectedAddress?.latitude,
        longitude: selectedAddress?.longitude,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        operating_mode: operatingMode,
        is_public: operatingMode === 'INDEPENDENT' ? isPublic : false,
      });

      AppAlert.alert(
        'Success',
        'Location updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error updating location:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to update location. Please try again.';
      AppAlert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader
          title="Edit Location"
          leftAction={{
            icon: 'chevron-left',
            onPress: () => navigation.goBack(),
            accessibilityLabel: 'Go back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Edit Location"
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
              Edit location
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              Update your location details, address, and settings
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
              <View style={[styles.fieldContainer, styles.settingSection]}>
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
          title="Save Changes"
          onPress={handleSave}
          disabled={!isFormValid || !hasChanges || isSubmitting}
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
                Tap on the map or search to update location
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  settingSection: {
    marginTop: 8,
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
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
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
});
