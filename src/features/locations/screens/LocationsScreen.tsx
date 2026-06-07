/**
 * LocationsScreen - Business Locations Management
 * Displays all business locations with details following design.json specifications
 * Based on app-logic.json locationsAndModesMVP section
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppSearchBar, AppButton, ListItemCard } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import { deleteLocation, getLocations } from '@/features/locations/locations.service';
import type { BusinessLocation } from '@/shared/types/business';

type Location = BusinessLocation;

// Map location_type value to display label
const LOCATION_TYPE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse',
  store: 'Store',
  office: 'Office',
  factory: 'Factory',
  distribution_center: 'Distribution Center',
  showroom: 'Showroom',
  service_center: 'Service Center',
  other: 'Other',
};

// Location Card Component
interface LocationCardProps {
  location: Location;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showDivider?: boolean;
  isPrimaryLocation?: boolean; // true if this is the parent location (doesn't show status)
}

const LocationCard: React.FC<LocationCardProps> = ({
  location,
  onPress,
  onEdit,
  onDelete,
  showDivider = true,
  isPrimaryLocation = false,
}) => {
  const { theme: appTheme } = useTheme();

  const handleOptionsPress = () => {
    Alert.alert(
      location.name,
      'Choose an action',
      [
        { text: 'Edit Location', onPress: onEdit },
        { text: 'Delete Location', onPress: onDelete, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Status pill config for non-primary locations
  const statusPillConfig = !isPrimaryLocation ? {
    text: location.operating_mode === 'INDEPENDENT' ? 'Independent' : 'Dependent',
    color: location.operating_mode === 'INDEPENDENT' 
      ? appTheme.colors.success 
      : appTheme.colors.info,
  } : undefined;

  // Build subtitle: location type + address
  const typeLabel = location.location_type ? LOCATION_TYPE_LABELS[location.location_type] || location.location_type : null;
  const subtitle = [typeLabel, location.address].filter(Boolean).join(' · ');

  return (
    <ListItemCard
      avatar={{
        type: 'icon',
        icon: location.is_primary ? 'business' : 'location-outline',
        iconColor: appTheme.colors.primary,
        backgroundColor: appTheme.colors.surface,
      }}
      title={location.name}
      subtitle={subtitle || undefined}
      rightRow1={statusPillConfig ? { statusPill: statusPillConfig } : undefined}
      onPress={onPress}
      showOptionsButton
      onOptionsPress={handleOptionsPress}
      showDivider={showDivider}
    />
  );
};

export default function LocationsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { theme: appTheme } = useTheme();

  // Profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isSuperAdminRole = useProfileStore((state) => state.isSuperAdmin);
  const isAdminRole = useProfileStore((state) => state.isAdmin);

  // State
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showLocationSheet, setShowLocationSheet] = useState(false);

  // Check permissions
  const isSuperAdmin = isSuperAdminRole();
  const isAdmin = isAdminRole();
  const canManageLocations = isSuperAdmin || isAdmin;

  // Refetch when screen comes into focus (after edit/add)
  useEffect(() => {
    if (activeBusiness?.id && isFocused) {
      fetchLocations();
    }
  }, [activeBusiness?.id, isFocused]);

  const fetchLocations = async () => {
    if (!activeBusiness?.id) return;
    
    setIsLoading(true);
    try {
      const response = await getLocations(activeBusiness.id);
      setLocations(response);
    } catch (error) {
      console.error('Error fetching locations:', error);
      Alert.alert('Error', 'Failed to load locations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationPress = (location: Location) => {
    setSelectedLocation(location);
    setShowLocationSheet(true);
  };

  const handleCloseSheet = () => {
    setShowLocationSheet(false);
    setSelectedLocation(null);
  };

  const handleSwitchProfile = () => {
    handleCloseSheet();
    Alert.alert('Switch Profile', 'Switching profiles is not available for locations yet.');
  };

  const handleEditLocation = (location: Location) => {
    handleCloseSheet();
    navigation.navigate('EditLocation' as any, { locationId: location.id });
  };

  const handleDeleteLocation = (location: Location) => {
    if (location.is_primary) {
      Alert.alert('Cannot Delete', 'You cannot delete the primary location.');
      return;
    }
    
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${location.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!activeBusiness?.id) return;
            try {
              await deleteLocation(activeBusiness.id, location.id);
              setLocations(prev => prev.filter(l => l.id !== location.id));
            } catch (error) {
              console.error('Error deleting location:', error);
              Alert.alert('Error', 'Failed to delete location. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAddLocation = () => {
    navigation.navigate('AddLocation' as any);
  };

  // Filter locations based on search query
  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (location.address || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate primary and other locations
  const primaryLocation = filteredLocations.find(l => l.is_primary);
  const otherLocations = filteredLocations.filter(l => !l.is_primary);
  
  // Check if there's only one location (single parent location)
  const hasSingleLocation = filteredLocations.length === 1;

  if (!canManageLocations) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader
          title="Locations"
          leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        />
        <View style={styles.accessDeniedContainer}>
          <Icon name="location" size={60} color={appTheme.colors.textLight} />
          <Text style={[styles.accessDeniedText, { color: appTheme.colors.text }]}>
            Access Denied
          </Text>
          <Text style={[styles.accessDeniedSubtext, { color: appTheme.colors.textLight }]}>
            Only admins can manage locations
          </Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: appTheme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Locations"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'plus', onPress: handleAddLocation }]}
      />

      {/* Search Bar */}
      <AppSearchBar
        placeholder="Search locations..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        containerStyle={styles.searchBarContainer}
      />

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: appTheme.colors.textLight }]}>
            Loading locations...
          </Text>
        </View>
      ) : filteredLocations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="location-outline" size={60} color={appTheme.colors.textLight} />
          <Text style={[styles.emptyText, { color: appTheme.colors.text }]}>
            {searchQuery ? 'No locations found' : 'No locations yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: appTheme.colors.textLight }]}>
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'Add your first location to get started'
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: appTheme.colors.primary }]}
              onPress={handleAddLocation}
            >
              <Text style={styles.addButtonText}>Add Location</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={[1]} // Single item to render sections
          keyExtractor={() => 'sections'}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          renderItem={() => (
            <View style={styles.sectionsContainer}>
              {/* Single Location - No sections */}
              {hasSingleLocation && primaryLocation ? (
                <View style={styles.singleLocationContainer}>
                  <LocationCard
                    location={primaryLocation}
                    onPress={() => handleLocationPress(primaryLocation)}
                    onEdit={() => handleEditLocation(primaryLocation)}
                    onDelete={() => handleDeleteLocation(primaryLocation)}
                    showDivider={false}
                    isPrimaryLocation
                  />
                </View>
              ) : (
                <>
                  {/* Primary Location Section */}
                  {primaryLocation && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
                          Primary Location
                        </Text>
                      </View>
                      <View style={styles.sectionContent}>
                        <LocationCard
                          location={primaryLocation}
                          onPress={() => handleLocationPress(primaryLocation)}
                          onEdit={() => handleEditLocation(primaryLocation)}
                          onDelete={() => handleDeleteLocation(primaryLocation)}
                          showDivider={false}
                          isPrimaryLocation
                        />
                      </View>
                    </View>
                  )}

                  {/* Other Locations Section */}
                  {otherLocations.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
                          Other Locations ({otherLocations.length})
                        </Text>
                      </View>
                      <View style={styles.sectionContent}>
                        {otherLocations.map((location, index) => (
                          <LocationCard
                            key={location.id}
                            location={location}
                            onPress={() => handleLocationPress(location)}
                            onEdit={() => handleEditLocation(location)}
                            onDelete={() => handleDeleteLocation(location)}
                            showDivider={index < otherLocations.length - 1}
                            isPrimaryLocation={false}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Location Details Bottom Sheet */}
      <AppBottomSheet
        visible={showLocationSheet}
        onClose={handleCloseSheet}
        title={selectedLocation?.name}
      >
        {selectedLocation && (
          <View style={styles.sheetContent}>
            {/* Status - Only show for non-primary locations */}
            {!selectedLocation.is_primary && (
              <View style={styles.aboutItem}>
                <Icon name="pulse-outline" size={20} color={appTheme.colors.textSecondary} />
                <View style={styles.aboutItemContent}>
                  <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>
                    Status
                  </Text>
                  <View style={[
                    styles.sheetStatusBadge,
                    { 
                      backgroundColor: selectedLocation.operating_mode === 'INDEPENDENT' 
                        ? 'rgba(42, 207, 1, 0.1)' 
                        : 'rgba(0, 117, 255, 0.1)'
                    }
                  ]}>
                    <Text style={[
                      styles.sheetStatusText,
                      { 
                        color: selectedLocation.operating_mode === 'INDEPENDENT' 
                          ? appTheme.colors.success 
                          : appTheme.colors.info
                      }
                    ]}>
                      {selectedLocation.operating_mode === 'INDEPENDENT' ? 'Independent' : 'Dependent'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Location Type */}
            {selectedLocation.location_type && (
              <View style={styles.aboutItem}>
                <Icon name="pricetag-outline" size={20} color={appTheme.colors.textSecondary} />
                <View style={styles.aboutItemContent}>
                  <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>
                    Type
                  </Text>
                  <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>
                    {LOCATION_TYPE_LABELS[selectedLocation.location_type] || selectedLocation.location_type}
                  </Text>
                </View>
              </View>
            )}

            {/* Location/Address */}
            <View style={styles.aboutItem}>
              <Icon name="location-outline" size={20} color={appTheme.colors.textSecondary} />
              <View style={styles.aboutItemContent}>
                <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>
                  Location
                </Text>
                <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>
                  {selectedLocation.address || 'No address set'}
                </Text>
              </View>
            </View>

            {/* Contact Number */}
            {selectedLocation.phone && (
              <TouchableOpacity 
                style={styles.aboutItem} 
                onPress={() => Linking.openURL(`tel:${selectedLocation.phone?.replace(/\s/g, '')}`)}
              >
                <Icon name="call-outline" size={20} color={appTheme.colors.textSecondary} />
                <View style={styles.aboutItemContent}>
                  <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>
                    Contact
                  </Text>
                  <Text style={[styles.aboutValue, { color: appTheme.colors.info }]}>
                    {selectedLocation.phone}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Edit Button */}
            <View style={styles.sheetButton}>
              <AppButton
                title="Edit Location"
                onPress={() => handleEditLocation(selectedLocation)}
                variant="primary"
              />
            </View>
          </View>
        )}
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchBarContainer: {
    marginTop: 8,
    marginHorizontal: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionsContainer: {
    // padding handled by ListItemCard
  },
  singleLocationContainer: {
    paddingTop: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  sectionContent: {},
  // Bottom Sheet Styles - matching About section from UserProfileScreen
  sheetContent: {
    gap: 0,
    paddingBottom: 8,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  aboutItemContent: {
    flex: 1,
  },
  aboutLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 2,
  },
  aboutValue: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  sheetStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 2,
  },
  sheetStatusText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  sheetButton: {
    marginTop: 16,
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Access Denied
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  accessDeniedText: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginBottom: 32,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
