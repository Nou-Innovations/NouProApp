/**
 * TransportsScreen - Business Vehicles/Transports Management
 * Displays all business vehicles/transports with details following design.json specifications
 * Used for delivery fleet management in Business Mode
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppSearchBar, Avatar, AppButton, EmptyState } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import { deleteTransport, getTransports } from '@/features/transports/transports.service';

// Transport/Vehicle type
export type VehicleType = 'bicycle' | 'motorcycle' | 'scooter' | 'car' | 'van' | 'pickup' | 'truck' | 'lorry' | 'other';
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'inactive';

export interface Transport {
  id: string;
  business_id: string;
  name: string;
  vehicle_type: VehicleType;
  license_plate?: string;
  capacity?: string;
  status: VehicleStatus;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  assigned_staff_avatar?: string;
  current_location_id?: string;
  current_location_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

// Get icon for vehicle type
const getVehicleIcon = (type: VehicleType): string => {
  switch (type) {
    case 'bicycle':
      return 'bike';
    case 'motorcycle':
      return 'bike';
    case 'scooter':
      return 'bike';
    case 'car':
      return 'car';
    case 'van':
      return 'bus';
    case 'pickup':
      return 'truck';
    case 'truck':
      return 'truck';
    case 'lorry':
      return 'truck';
    default:
      return 'car';
  }
};

// Get status color
const getStatusColor = (status: VehicleStatus, appTheme: any): string => {
  switch (status) {
    case 'available':
      return appTheme.colors.success;
    case 'in_use':
      return appTheme.colors.info;
    case 'maintenance':
      return appTheme.colors.warning;
    case 'inactive':
      return appTheme.colors.textMuted;
    default:
      return appTheme.colors.textMuted;
  }
};

// Get status label
const getStatusLabel = (status: VehicleStatus): string => {
  switch (status) {
    case 'available':
      return 'Available';
    case 'in_use':
      return 'In Use';
    case 'maintenance':
      return 'Maintenance';
    case 'inactive':
      return 'Inactive';
    default:
      return status;
  }
};

// Transport Card Component
interface TransportCardProps {
  transport: Transport;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showDivider?: boolean;
}

const TransportCard: React.FC<TransportCardProps> = ({
  transport,
  onPress,
  onEdit,
  onDelete,
  showDivider = true,
}) => {
  const { theme: appTheme } = useTheme();

  const handleOptionsPress = () => {
    Alert.alert(
      transport.name,
      'Choose an action',
      [
        { text: 'Edit Vehicle', onPress: onEdit },
        { text: 'Delete Vehicle', onPress: onDelete, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const statusColor = getStatusColor(transport.status, appTheme);

  return (
    <View>
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Left: Vehicle Icon */}
        <View style={[styles.iconContainer, { backgroundColor: appTheme.colors.surface }]}>
          <Icon 
            name={getVehicleIcon(transport.vehicle_type)} 
            size={24} 
            color={appTheme.colors.primary} 
          />
        </View>

        {/* Middle: Info */}
        <View style={styles.cardInfo}>
          {/* Row 1: Name + Status (right aligned) */}
          <View style={styles.nameRow}>
            <Text style={[styles.vehicleName, { color: appTheme.colors.text }]} numberOfLines={1}>
              {transport.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(transport.status)}
              </Text>
            </View>
          </View>
          
          {/* Row 2: License Plate + Location (right aligned) - no location for inactive */}
          <View style={styles.detailsRow}>
            {transport.license_plate && (
              <Text style={[styles.licensePlate, { color: appTheme.colors.textSecondary }]}>
                {transport.license_plate}
              </Text>
            )}
            {transport.status !== 'inactive' && (
              <View style={styles.locationRow}>
                <Icon name="location-outline" size={14} color={appTheme.colors.textMuted} />
                <Text style={[styles.locationText, { color: appTheme.colors.textMuted }]} numberOfLines={1}>
                  {transport.status === 'in_use' ? 'On road' : (transport.current_location_name || '—')}
                </Text>
              </View>
            )}
          </View>
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

export default function TransportsScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  
  // Profile store
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const isSuperAdminRole = useProfileStore((state) => state.isSuperAdmin);
  const isAdminRole = useProfileStore((state) => state.isAdmin);
  
  // State
  const [transports, setTransports] = useState<Transport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);
  const [showTransportSheet, setShowTransportSheet] = useState(false);

  // Check permissions
  const isSuperAdmin = isSuperAdminRole();
  const isAdmin = isAdminRole();
  const canManageTransports = isSuperAdmin || isAdmin;

  useEffect(() => {
    if (activeBusiness?.id) {
      fetchTransports();
    }
  }, [activeBusiness?.id]);

  const fetchTransports = async () => {
    if (!activeBusiness?.id) return;
    
    setIsLoading(true);
    try {
      const response = await getTransports(activeBusiness.id);
      setTransports(response);
    } catch (error) {
      console.error('Error fetching transports:', error);
      Alert.alert('Error', 'Failed to load vehicles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransportPress = (transport: Transport) => {
    setSelectedTransport(transport);
    setShowTransportSheet(true);
  };

  const handleCloseSheet = () => {
    setShowTransportSheet(false);
    setSelectedTransport(null);
  };

  const handleAssignStaff = (transport: Transport) => {
    handleCloseSheet();
    Alert.alert('Assign Staff', 'Staff assignment is not available yet.');
  };

  const handleEditTransport = (transport: Transport) => {
    Alert.alert('Edit Vehicle', 'Vehicle editing is not available yet.');
  };

  const handleDeleteTransport = (transport: Transport) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete "${transport.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!activeBusiness?.id) return;
            try {
              await deleteTransport(activeBusiness.id, transport.id);
              setTransports(prev => prev.filter(t => t.id !== transport.id));
            } catch (error) {
              console.error('Error deleting transport:', error);
              Alert.alert('Error', 'Failed to delete transport. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAddTransport = () => {
    navigation.navigate('AddTransport' as never);
  };

  // Filter transports based on search query
  const filteredTransports = transports.filter(transport =>
    transport.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transport.license_plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transport.assigned_staff_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group transports by status
  const activeTransports = filteredTransports.filter(t => t.status === 'available' || t.status === 'in_use');
  const maintenanceTransports = filteredTransports.filter(t => t.status === 'maintenance');
  const inactiveTransports = filteredTransports.filter(t => t.status === 'inactive');

  // Stats
  const stats = {
    total: transports.length,
    available: transports.filter(t => t.status === 'available').length,
    inUse: transports.filter(t => t.status === 'in_use').length,
    maintenance: transports.filter(t => t.status === 'maintenance').length,
  };

  if (!canManageTransports) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader
          title="Vehicles"
          leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        />
        <View style={styles.accessDeniedContainer}>
          <Icon name="car" size={60} color={appTheme.colors.textLight} />
          <Text style={[styles.accessDeniedText, { color: appTheme.colors.text }]}>
            Access Denied
          </Text>
          <Text style={[styles.accessDeniedSubtext, { color: appTheme.colors.textLight }]}>
            Only admins can manage vehicles
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
        title="Vehicles"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={[{ icon: 'plus', onPress: handleAddTransport }]}
      />

      {/* Search Bar */}
      <AppSearchBar
        placeholder="Search vehicles..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        containerStyle={styles.searchBarContainer}
      />

      {/* Stats Row */}
      {!isLoading && transports.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: appTheme.colors.surface }]}>
            <Text style={[styles.statValue, { color: appTheme.colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: appTheme.colors.textMuted }]}>Total</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: appTheme.colors.surface }]}>
            <Text style={[styles.statValue, { color: appTheme.colors.success }]}>{stats.available}</Text>
            <Text style={[styles.statLabel, { color: appTheme.colors.textMuted }]}>Available</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: appTheme.colors.surface }]}>
            <Text style={[styles.statValue, { color: appTheme.colors.info }]}>{stats.inUse}</Text>
            <Text style={[styles.statLabel, { color: appTheme.colors.textMuted }]}>In Use</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: appTheme.colors.surface }]}>
            <Text style={[styles.statValue, { color: appTheme.colors.warning }]}>{stats.maintenance}</Text>
            <Text style={[styles.statLabel, { color: appTheme.colors.textMuted }]}>Service</Text>
          </View>
        </View>
      )}

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: appTheme.colors.textLight }]}>
            Loading vehicles...
          </Text>
        </View>
      ) : filteredTransports.length === 0 ? (
        <EmptyState
          iconName="car-outline"
          title={searchQuery ? 'No vehicles found' : 'No transport added'}
          subtitle={
            searchQuery
              ? 'Try adjusting your search criteria.'
              : 'Add vehicles or transport options to manage deliveries efficiently.'
          }
          ctaLabel={searchQuery ? undefined : 'Add transport'}
          onCtaPress={searchQuery ? undefined : handleAddTransport}
          testID="empty-transports"
        />
      ) : (
        <FlatList
          data={[1]} // Single item to render sections
          keyExtractor={() => 'sections'}
          renderItem={() => (
            <View style={styles.sectionsContainer}>
              {/* Active Vehicles Section */}
              {activeTransports.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
                      Active Fleet ({activeTransports.length})
                    </Text>
                  </View>
                  <View style={styles.sectionContent}>
                    {activeTransports.map((transport, index) => (
                      <TransportCard
                        key={transport.id}
                        transport={transport}
                        onPress={() => handleTransportPress(transport)}
                        onEdit={() => handleEditTransport(transport)}
                        onDelete={() => handleDeleteTransport(transport)}
                        showDivider={index < activeTransports.length - 1}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Maintenance Vehicles Section */}
              {maintenanceTransports.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
                      In Maintenance ({maintenanceTransports.length})
                    </Text>
                  </View>
                  <View style={styles.sectionContent}>
                    {maintenanceTransports.map((transport, index) => (
                      <TransportCard
                        key={transport.id}
                        transport={transport}
                        onPress={() => handleTransportPress(transport)}
                        onEdit={() => handleEditTransport(transport)}
                        onDelete={() => handleDeleteTransport(transport)}
                        showDivider={index < maintenanceTransports.length - 1}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Inactive Vehicles Section */}
              {inactiveTransports.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: appTheme.colors.textMuted }]}>
                      Inactive ({inactiveTransports.length})
                    </Text>
                  </View>
                  <View style={styles.sectionContent}>
                    {inactiveTransports.map((transport, index) => (
                      <TransportCard
                        key={transport.id}
                        transport={transport}
                        onPress={() => handleTransportPress(transport)}
                        onEdit={() => handleEditTransport(transport)}
                        onDelete={() => handleDeleteTransport(transport)}
                        showDivider={index < inactiveTransports.length - 1}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Vehicle Details Bottom Sheet */}
      <AppBottomSheet
        visible={showTransportSheet}
        onClose={handleCloseSheet}
        title={selectedTransport?.name}
      >
        {selectedTransport && (
          <View style={styles.sheetContent}>
            {/* Status */}
            <View style={styles.sheetRow}>
              <Text style={[styles.sheetLabel, { color: appTheme.colors.textSecondary }]}>
                Status
              </Text>
              <View style={[
                styles.sheetStatusBadge,
                { backgroundColor: `${getStatusColor(selectedTransport.status, appTheme)}15` }
              ]}>
                <View style={[
                  styles.sheetStatusDot,
                  { backgroundColor: getStatusColor(selectedTransport.status, appTheme) }
                ]} />
                <Text style={[
                  styles.sheetStatusText,
                  { color: getStatusColor(selectedTransport.status, appTheme) }
                ]}>
                  {getStatusLabel(selectedTransport.status)}
                </Text>
              </View>
            </View>

            {/* Vehicle Type */}
            <View style={styles.sheetRow}>
              <Text style={[styles.sheetLabel, { color: appTheme.colors.textSecondary }]}>
                Type
              </Text>
              <Text style={[styles.sheetValue, { color: appTheme.colors.text }]}>
                {selectedTransport.vehicle_type.charAt(0).toUpperCase() + selectedTransport.vehicle_type.slice(1)}
              </Text>
            </View>

            {/* License Plate */}
            {selectedTransport.license_plate && (
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetLabel, { color: appTheme.colors.textSecondary }]}>
                  License Plate
                </Text>
                <Text style={[styles.sheetValue, { color: appTheme.colors.text }]}>
                  {selectedTransport.license_plate}
                </Text>
              </View>
            )}

            {/* Capacity */}
            {selectedTransport.capacity && (
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetLabel, { color: appTheme.colors.textSecondary }]}>
                  Capacity
                </Text>
                <Text style={[styles.sheetValue, { color: appTheme.colors.text }]}>
                  {selectedTransport.capacity}
                </Text>
              </View>
            )}

            {/* Location */}
            {selectedTransport.current_location_name && (
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetLabel, { color: appTheme.colors.textSecondary }]}>
                  Location
                </Text>
                <Text style={[styles.sheetValue, { color: appTheme.colors.text }]}>
                  {selectedTransport.current_location_name}
                </Text>
              </View>
            )}

            {/* Assigned Staff */}
            <View style={styles.sheetRow}>
              <Text style={[styles.sheetLabel, { color: appTheme.colors.textSecondary }]}>
                Assigned Staff
              </Text>
              {selectedTransport.assigned_staff_id ? (
                <View style={styles.sheetAssignedStaff}>
                  <Avatar
                    userId={selectedTransport.assigned_staff_id}
                    userName={selectedTransport.assigned_staff_name || 'Staff'}
                    imageUri={selectedTransport.assigned_staff_avatar}
                    size={24}
                  />
                  <Text style={[styles.sheetValue, { color: appTheme.colors.text }]}>
                    {selectedTransport.assigned_staff_name}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.sheetValue, { color: appTheme.colors.textMuted }]}>
                  Not assigned
                </Text>
              )}
            </View>

            {/* Notes */}
            {selectedTransport.notes && (
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetLabel, { color: appTheme.colors.textSecondary }]}>
                  Notes
                </Text>
                <Text style={[styles.sheetValue, { color: appTheme.colors.text }]}>
                  {selectedTransport.notes}
                </Text>
              </View>
            )}

            {/* Assign Staff Button */}
            <View style={styles.sheetButton}>
              <AppButton
                title={selectedTransport.assigned_staff_id ? 'Change Assignment' : 'Assign Staff'}
                onPress={() => handleAssignStaff(selectedTransport)}
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  statItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionsContainer: {
    paddingHorizontal: 12,
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
  // Transport Card Styles
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
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
    marginRight: 4, // 4px gap between content and options button
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vehicleName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    flexShrink: 1,
    marginRight: 8,
  },
  statusBadge: {
    width: 88,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.semiBold,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  licensePlate: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    flexShrink: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  locationText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  optionsButton: {
    paddingRight: 0,
    paddingLeft: 4,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    // Full width within the 12px padded container
  },
  // Bottom Sheet Styles
  sheetContent: {
    gap: 16,
    paddingBottom: 8,
  },
  sheetRow: {
    gap: 4,
  },
  sheetLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  sheetValue: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 22,
  },
  sheetStatusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  sheetStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sheetStatusText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  sheetAssignedStaff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetButton: {
    marginTop: 8,
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
