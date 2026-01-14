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
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppSearchBar, AppButton } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';

// Location type based on app-logic.json and Prisma schema
interface Location {
  id: string;
  business_id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  operating_mode: 'DEPENDENT' | 'INDEPENDENT';
  is_public: boolean;
  is_primary: boolean;
  staff_count?: number;
  created_at: string;
  updated_at?: string;
}

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

  return (
    <View>
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Left: Icon Container */}
        <View style={[styles.iconContainer, { backgroundColor: appTheme.colors.surface }]}>
          <Icon 
            name={location.is_primary ? 'business' : 'location-outline'} 
            size={24} 
            color={appTheme.colors.primary} 
          />
        </View>

        {/* Middle: Info */}
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.locationName, { color: appTheme.colors.text }]} numberOfLines={1}>
              {location.name}
            </Text>
            {/* Show status badge aligned right, but not for primary/parent location */}
            {!isPrimaryLocation && (
              <View style={[
                styles.modeBadge,
                { 
                  backgroundColor: location.operating_mode === 'INDEPENDENT' 
                    ? 'rgba(42, 207, 1, 0.1)' 
                    : 'rgba(0, 117, 255, 0.1)'
                }
              ]}>
                <Text style={[
                  styles.modeBadgeText,
                  { 
                    color: location.operating_mode === 'INDEPENDENT' 
                      ? appTheme.colors.success 
                      : appTheme.colors.info
                  }
                ]}>
                  {location.operating_mode === 'INDEPENDENT' ? 'Independent' : 'Dependent'}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.locationAddress, { color: appTheme.colors.textSecondary }]} numberOfLines={2}>
            {location.address}
          </Text>
        </View>

        {/* Right: Options Button */}
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={handleOptionsPress}
          activeOpacity={0.7}
        >
          <Icon name="ellipsis-vertical" size={20} color={appTheme.colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>
      
      {showDivider && (
        <View style={[styles.divider, { backgroundColor: appTheme.colors.surface }]} />
      )}
    </View>
  );
};

export default function LocationsScreen() {
  const navigation = useNavigation();
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

  useEffect(() => {
    if (activeBusiness?.id) {
      fetchLocations();
    }
  }, [activeBusiness?.id]);

  const fetchLocations = async () => {
    if (!activeBusiness?.id) return;
    
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await get<Location[]>(`/businesses/${activeBusiness.id}/locations`);
      // setLocations(response);
      
      // Mock data for development
      const mockLocations: Location[] = [
        {
          id: 'loc-1',
          business_id: activeBusiness.id,
          name: 'Main Warehouse',
          address: '123 Industrial Ave, Port Louis, Mauritius',
          phone: '+230 123 4567',
          email: 'warehouse@business.com',
          latitude: -20.162,
          longitude: 57.502,
          operating_mode: 'DEPENDENT',
          is_public: false,
          is_primary: true,
          staff_count: 8,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'loc-2',
          business_id: activeBusiness.id,
          name: 'City Center Shop',
          address: '45 Main Street, Curepipe, Mauritius',
          phone: '+230 234 5678',
          email: 'curepipe@business.com',
          latitude: -20.318,
          longitude: 57.528,
          operating_mode: 'INDEPENDENT',
          is_public: true,
          is_primary: false,
          staff_count: 4,
          created_at: '2024-02-15T00:00:00Z',
        },
        {
          id: 'loc-3',
          business_id: activeBusiness.id,
          name: 'Beach Resort Outlet',
          address: 'Grand Baie Coastal Road, Grand Baie, Mauritius',
          phone: '+230 345 6789',
          operating_mode: 'DEPENDENT',
          is_public: false,
          is_primary: false,
          staff_count: 3,
          created_at: '2024-03-20T00:00:00Z',
        },
        {
          id: 'loc-4',
          business_id: activeBusiness.id,
          name: 'South Distribution Center',
          address: 'Zone Industrielle, Mahebourg, Mauritius',
          phone: '+230 456 7890',
          email: 'south@business.com',
          latitude: -20.408,
          longitude: 57.700,
          operating_mode: 'DEPENDENT',
          is_public: false,
          is_primary: false,
          staff_count: 5,
          created_at: '2024-04-10T00:00:00Z',
        },
      ];
      
      setLocations(mockLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      Alert.alert('Error', 'Failed to load locations');
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
    // TODO: Implement switch profile logic
    handleCloseSheet();
    Alert.alert('Switch Profile', `Switching to ${selectedLocation?.name}`);
  };

  const handleEditLocation = (location: Location) => {
    // TODO: Navigate to edit location screen
    Alert.alert('Edit Location', `Edit ${location.name}`);
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
            // TODO: Call API to delete location
            setLocations(prev => prev.filter(l => l.id !== location.id));
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
    location.address.toLowerCase().includes(searchQuery.toLowerCase())
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
                    isPrimaryLocation={true}
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
                          isPrimaryLocation={true}
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

            {/* Location/Address */}
            <View style={styles.aboutItem}>
              <Icon name="location-outline" size={20} color={appTheme.colors.textSecondary} />
              <View style={styles.aboutItemContent}>
                <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>
                  Location
                </Text>
                <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>
                  {selectedLocation.address}
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

            {/* Switch Profile Button */}
            <View style={styles.sheetButton}>
              <AppButton
                title="Switch Profile"
                onPress={handleSwitchProfile}
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
    paddingHorizontal: 12,
  },
  sectionsContainer: {
    // padding handled by listContent
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
  // Location Card Styles
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  locationName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    flexShrink: 1,
    marginRight: 8,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    lineHeight: 20,
  },
  optionsButton: {
    paddingRight: 0,
    paddingLeft: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
  },
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
