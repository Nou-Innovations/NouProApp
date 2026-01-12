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
import { AppSearchBar, Avatar } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';

// Transport/Vehicle type
export type VehicleType = 'van' | 'truck' | 'motorcycle' | 'car' | 'bicycle' | 'other';
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
    case 'van':
      return 'bus-outline';
    case 'truck':
      return 'cube-outline';
    case 'motorcycle':
      return 'bicycle-outline';
    case 'car':
      return 'car-outline';
    case 'bicycle':
      return 'bicycle-outline';
    default:
      return 'car-outline';
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
  onAssignStaff: () => void;
  showDivider?: boolean;
}

const TransportCard: React.FC<TransportCardProps> = ({
  transport,
  onPress,
  onEdit,
  onDelete,
  onAssignStaff,
  showDivider = true,
}) => {
  const { theme: appTheme } = useTheme();

  const handleOptionsPress = () => {
    Alert.alert(
      transport.name,
      'Choose an action',
      [
        { text: 'Edit Vehicle', onPress: onEdit },
        { 
          text: transport.assigned_staff_id ? 'Change Assignment' : 'Assign Staff',
          onPress: onAssignStaff,
        },
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
          <View style={styles.nameRow}>
            <Text style={[styles.vehicleName, { color: appTheme.colors.text }]} numberOfLines={1}>
              {transport.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(transport.status)}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailsRow}>
            {transport.license_plate && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: appTheme.colors.textMuted }]}>
                  Plate:
                </Text>
                <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>
                  {transport.license_plate}
                </Text>
              </View>
            )}
            
            {transport.capacity && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: appTheme.colors.textMuted }]}>
                  Capacity:
                </Text>
                <Text style={[styles.detailValue, { color: appTheme.colors.text }]}>
                  {transport.capacity}
                </Text>
              </View>
            )}
          </View>

          {/* Assigned Staff */}
          <View style={styles.assignmentRow}>
            {transport.assigned_staff_id ? (
              <View style={styles.assignedStaff}>
                <Avatar
                  userId={transport.assigned_staff_id}
                  userName={transport.assigned_staff_name || 'Staff'}
                  imageUri={transport.assigned_staff_avatar}
                  size={24}
                />
                <Text style={[styles.assignedStaffName, { color: appTheme.colors.textSecondary }]}>
                  {transport.assigned_staff_name}
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.assignButton}
                onPress={onAssignStaff}
                activeOpacity={0.7}
              >
                <Icon name="person-add-outline" size={16} color={appTheme.colors.info} />
                <Text style={[styles.assignButtonText, { color: appTheme.colors.info }]}>
                  Assign Staff
                </Text>
              </TouchableOpacity>
            )}

            {transport.current_location_name && (
              <View style={styles.currentLocation}>
                <Icon name="location-outline" size={14} color={appTheme.colors.textMuted} />
                <Text style={[styles.currentLocationText, { color: appTheme.colors.textMuted }]} numberOfLines={1}>
                  {transport.current_location_name}
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
        <View style={[styles.divider, { backgroundColor: appTheme.colors.borderColor }]} />
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
      // TODO: Replace with actual API call
      // const response = await get<Transport[]>(`/businesses/${activeBusiness.id}/transports`);
      // setTransports(response);
      
      // Mock data for development
      const mockTransports: Transport[] = [
        {
          id: 'trans-1',
          business_id: activeBusiness.id,
          name: 'Delivery Van 01',
          vehicle_type: 'van',
          license_plate: 'MU-1234',
          capacity: '500 kg',
          status: 'in_use',
          assigned_staff_id: 'user-2',
          assigned_staff_name: 'Jane Smith',
          assigned_staff_avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
          current_location_name: 'Route - Curepipe',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'trans-2',
          business_id: activeBusiness.id,
          name: 'Cargo Truck',
          vehicle_type: 'truck',
          license_plate: 'MU-5678',
          capacity: '2 tons',
          status: 'available',
          current_location_name: 'Main Warehouse',
          created_at: '2024-01-15T00:00:00Z',
        },
        {
          id: 'trans-3',
          business_id: activeBusiness.id,
          name: 'Express Bike',
          vehicle_type: 'motorcycle',
          license_plate: 'MU-9012',
          capacity: '20 kg',
          status: 'in_use',
          assigned_staff_id: 'user-3',
          assigned_staff_name: 'Mike Jones',
          assigned_staff_avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
          current_location_name: 'Port Louis Area',
          created_at: '2024-02-01T00:00:00Z',
        },
        {
          id: 'trans-4',
          business_id: activeBusiness.id,
          name: 'Delivery Van 02',
          vehicle_type: 'van',
          license_plate: 'MU-3456',
          capacity: '500 kg',
          status: 'maintenance',
          notes: 'Scheduled maintenance until Jan 20',
          current_location_name: 'Service Center',
          created_at: '2024-02-15T00:00:00Z',
        },
        {
          id: 'trans-5',
          business_id: activeBusiness.id,
          name: 'City Car',
          vehicle_type: 'car',
          license_plate: 'MU-7890',
          capacity: '100 kg',
          status: 'available',
          current_location_name: 'City Center Shop',
          created_at: '2024-03-01T00:00:00Z',
        },
        {
          id: 'trans-6',
          business_id: activeBusiness.id,
          name: 'Old Scooter',
          vehicle_type: 'motorcycle',
          license_plate: 'MU-0000',
          capacity: '15 kg',
          status: 'inactive',
          notes: 'Retired from active fleet',
          created_at: '2023-06-01T00:00:00Z',
        },
      ];
      
      setTransports(mockTransports);
    } catch (error) {
      console.error('Error fetching transports:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransportPress = (transport: Transport) => {
    // TODO: Navigate to transport detail screen
    Alert.alert(
      transport.name,
      `Type: ${transport.vehicle_type}\nPlate: ${transport.license_plate}\nStatus: ${getStatusLabel(transport.status)}${transport.notes ? `\nNotes: ${transport.notes}` : ''}`
    );
  };

  const handleEditTransport = (transport: Transport) => {
    // TODO: Navigate to edit transport screen
    Alert.alert('Edit Vehicle', `Edit ${transport.name}`);
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
            // TODO: Call API to delete transport
            setTransports(prev => prev.filter(t => t.id !== transport.id));
          },
        },
      ]
    );
  };

  const handleAssignStaff = (transport: Transport) => {
    // TODO: Open staff assignment modal
    Alert.alert('Assign Staff', `Assign staff to ${transport.name}`);
  };

  const handleAddTransport = () => {
    // TODO: Navigate to create transport screen
    Alert.alert('Add Vehicle', 'Create new vehicle screen coming soon');
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
        <View style={styles.emptyContainer}>
          <Icon name="car-outline" size={60} color={appTheme.colors.textLight} />
          <Text style={[styles.emptyText, { color: appTheme.colors.text }]}>
            {searchQuery ? 'No vehicles found' : 'No vehicles yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: appTheme.colors.textLight }]}>
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'Add your first vehicle to manage your delivery fleet'
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: appTheme.colors.primary }]}
              onPress={handleAddTransport}
            >
              <Text style={styles.addButtonText}>Add Vehicle</Text>
            </TouchableOpacity>
          )}
        </View>
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
                        onAssignStaff={() => handleAssignStaff(transport)}
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
                        onAssignStaff={() => handleAssignStaff(transport)}
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
                        onAssignStaff={() => handleAssignStaff(transport)}
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
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 0,
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
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  vehicleName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    fontFamily: theme.fonts.primary.medium,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.semiBold,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignedStaff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignedStaffName: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignButtonText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.medium,
  },
  currentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '50%',
  },
  currentLocationText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
  },
  optionsButton: {
    paddingRight: 4,
    paddingLeft: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 68, // iconContainer width + marginRight
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
