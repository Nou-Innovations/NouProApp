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
  TextInput,
  ScrollView,
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
import ListItemCard from '@/shared/components/ui/ListItemCard';
import { deleteTransport, getTransports, updateTransport } from '@/features/transports/transports.service';
import { getTeamMembers } from '@/features/team/team.service';
import type { Transport, VehicleType, VehicleStatus } from '@/shared/types/transport';
import { getVehicleIcon, getVehicleStatusLabel as getStatusLabel } from '@/shared/types/transport';

// Vehicle type options (shared with AddTransportScreen pattern)
const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'bicycle', label: 'Bicycle', icon: 'bike' },
  { value: 'motorcycle', label: 'Motorcycle', icon: 'bike' },
  { value: 'scooter', label: 'Scooter', icon: 'bike' },
  { value: 'car', label: 'Car', icon: 'car' },
  { value: 'van', label: 'Van', icon: 'bus' },
  { value: 'pickup', label: 'Pickup', icon: 'truck' },
  { value: 'truck', label: 'Truck', icon: 'truck' },
  { value: 'lorry', label: 'Lorry', icon: 'truck' },
  { value: 'other', label: 'Other', icon: 'car' },
];

// Status options for editing
const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'in_use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

// Team member type for staff picker
interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

// Get status color (theme-aware, screen-specific)
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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<VehicleType>('car');
  const [editPlate, setEditPlate] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<VehicleStatus>('available');
  const [showTypeEditSheet, setShowTypeEditSheet] = useState(false);
  const [showStatusEditSheet, setShowStatusEditSheet] = useState(false);

  // Staff picker state
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Check permissions
  const isSuperAdmin = isSuperAdminRole();
  const isAdmin = isAdminRole();
  const canManageTransports = isSuperAdmin || isAdmin;

  const companyId = activeBusiness?.id;

  useEffect(() => {
    if (companyId) {
      fetchTransports();
      fetchTeamMembers();
    }
  }, [companyId]);

  const fetchTransports = async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const response = await getTransports(companyId);
      setTransports(response);
    } catch (error) {
      console.error('Error fetching transports:', error);
      Alert.alert('Error', 'Failed to load vehicles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (!companyId) return;
    try {
      const members = await getTeamMembers(companyId, 'accepted');
      setTeamMembers(members.map((m: any) => ({
        id: m.id,
        name: m.name || 'Unknown',
        role: m.role || 'staff',
        avatar: m.avatar,
      })));
    } catch {
      // Silently fail — staff picker will show empty
    }
  };

  const handleTransportPress = (transport: Transport) => {
    setSelectedTransport(transport);
    setIsEditing(false);
    setShowTransportSheet(true);
  };

  const handleCloseSheet = () => {
    setShowTransportSheet(false);
    setSelectedTransport(null);
    setIsEditing(false);
  };

  // --- Edit Transport ---
  const handleEditTransport = (transport: Transport) => {
    setSelectedTransport(transport);
    setEditName(transport.name);
    setEditType(transport.vehicle_type);
    setEditPlate(transport.license_plate || '');
    setEditCapacity(transport.capacity || '');
    setEditNotes(transport.notes || '');
    setEditStatus(transport.status);
    setIsEditing(true);
    setShowTransportSheet(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!companyId || !selectedTransport) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'Vehicle name is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {};
      if (editName.trim() !== selectedTransport.name) payload.name = editName.trim();
      if (editType !== selectedTransport.vehicle_type) payload.vehicle_type = editType;
      if (editPlate.trim() !== (selectedTransport.license_plate || '')) payload.license_plate = editPlate.trim() || '';
      if (editCapacity.trim() !== (selectedTransport.capacity || '')) payload.capacity = editCapacity.trim() || '';
      if (editNotes.trim() !== (selectedTransport.notes || '')) payload.notes = editNotes.trim() || '';
      if (editStatus !== selectedTransport.status) payload.status = editStatus;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const updated = await updateTransport(companyId, selectedTransport.id, payload);
      setTransports(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSelectedTransport(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating transport:', error);
      Alert.alert('Error', 'Failed to update vehicle. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Staff Assignment ---
  const handleAssignStaff = (transport: Transport) => {
    setSelectedTransport(transport);
    setStaffSearchQuery('');
    setShowTransportSheet(false);
    setShowStaffPicker(true);
  };

  const handleStaffSelect = async (memberId: string) => {
    if (!companyId || !selectedTransport) return;
    setShowStaffPicker(false);
    try {
      const updated = await updateTransport(companyId, selectedTransport.id, {
        assigned_staff_id: memberId,
      });
      setTransports(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSelectedTransport(updated);
    } catch (error) {
      console.error('Error assigning staff:', error);
      Alert.alert('Error', 'Failed to assign staff. Please try again.');
    }
  };

  const handleUnassignStaff = async () => {
    if (!companyId || !selectedTransport) return;
    setShowStaffPicker(false);
    try {
      const updated = await updateTransport(companyId, selectedTransport.id, {
        assigned_staff_id: null,
      });
      setTransports(prev => prev.map(t => t.id === updated.id ? updated : t));
      setSelectedTransport(updated);
    } catch (error) {
      console.error('Error unassigning staff:', error);
      Alert.alert('Error', 'Failed to unassign staff. Please try again.');
    }
  };

  // --- Delete ---
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
            if (!companyId) return;
            try {
              await deleteTransport(companyId, transport.id);
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

  // Filtered staff for picker
  const filteredStaff = teamMembers.filter(m =>
    m.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  // Selected type option for edit form
  const selectedEditTypeOption = VEHICLE_TYPE_OPTIONS.find(opt => opt.value === editType);
  const selectedEditStatusOption = STATUS_OPTIONS.find(opt => opt.value === editStatus);

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
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
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

      {/* Vehicle Details / Edit Bottom Sheet */}
      <AppBottomSheet
        visible={showTransportSheet}
        onClose={handleCloseSheet}
        title={isEditing ? 'Edit Vehicle' : selectedTransport?.name}
      >
        {selectedTransport && !isEditing && (
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

            {/* Action Buttons */}
            <View style={styles.sheetActions}>
              <AppButton
                title={selectedTransport.assigned_staff_id ? 'Change Assignment' : 'Assign Staff'}
                onPress={() => handleAssignStaff(selectedTransport)}
                variant="primary"
              />
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: appTheme.colors.surface }]}
                onPress={() => handleEditTransport(selectedTransport)}
                activeOpacity={0.7}
              >
                <Icon name="create-outline" size={18} color={appTheme.colors.text} />
                <Text style={[styles.editButtonText, { color: appTheme.colors.text }]}>
                  Edit Vehicle
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Edit Mode */}
        {selectedTransport && isEditing && (
          <ScrollView style={styles.editFormScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.editForm}>
              {/* Name */}
              <View style={styles.editField}>
                <Text style={[styles.editFieldLabel, { color: appTheme.colors.text }]}>
                  Name <Text style={{ color: appTheme.colors.error }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.editInput, {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Vehicle name"
                  placeholderTextColor={appTheme.colors.textMuted}
                  autoCapitalize="words"
                />
              </View>

              {/* Vehicle Type Picker */}
              <View style={styles.editField}>
                <Text style={[styles.editFieldLabel, { color: appTheme.colors.text }]}>
                  Type
                </Text>
                <TouchableOpacity
                  style={[styles.editPickerField, {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                  }]}
                  onPress={() => setShowTypeEditSheet(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.editPickerContent}>
                    <Icon
                      name={selectedEditTypeOption?.icon || 'car'}
                      size={18}
                      color={appTheme.colors.primary}
                    />
                    <Text style={[styles.editPickerText, { color: appTheme.colors.text }]}>
                      {selectedEditTypeOption?.label || 'Select type'}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={18} color={appTheme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Status Picker */}
              <View style={styles.editField}>
                <Text style={[styles.editFieldLabel, { color: appTheme.colors.text }]}>
                  Status
                </Text>
                <TouchableOpacity
                  style={[styles.editPickerField, {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                  }]}
                  onPress={() => setShowStatusEditSheet(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.editPickerContent}>
                    <View style={[styles.editStatusDot, { backgroundColor: getStatusColor(editStatus, appTheme) }]} />
                    <Text style={[styles.editPickerText, { color: appTheme.colors.text }]}>
                      {selectedEditStatusOption?.label || 'Select status'}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={18} color={appTheme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* License Plate */}
              <View style={styles.editField}>
                <Text style={[styles.editFieldLabel, { color: appTheme.colors.text }]}>
                  License Plate
                </Text>
                <TextInput
                  style={[styles.editInput, {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }]}
                  value={editPlate}
                  onChangeText={setEditPlate}
                  placeholder="e.g., MU-1234"
                  placeholderTextColor={appTheme.colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>

              {/* Capacity */}
              <View style={styles.editField}>
                <Text style={[styles.editFieldLabel, { color: appTheme.colors.text }]}>
                  Capacity
                </Text>
                <TextInput
                  style={[styles.editInput, {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }]}
                  value={editCapacity}
                  onChangeText={setEditCapacity}
                  placeholder="e.g., 500kg, 10 crates"
                  placeholderTextColor={appTheme.colors.textMuted}
                />
              </View>

              {/* Notes */}
              <View style={styles.editField}>
                <Text style={[styles.editFieldLabel, { color: appTheme.colors.text }]}>
                  Notes
                </Text>
                <TextInput
                  style={[styles.editInput, styles.editInputMultiline, {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Additional notes..."
                  placeholderTextColor={appTheme.colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Save / Cancel */}
              <View style={styles.editActions}>
                <AppButton
                  title={isSaving ? 'Saving...' : 'Save Changes'}
                  onPress={handleSaveEdit}
                  variant="primary"
                  disabled={isSaving || !editName.trim()}
                />
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: appTheme.colors.borderColor }]}
                  onPress={handleCancelEdit}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: appTheme.colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </AppBottomSheet>

      {/* Vehicle Type Edit Picker */}
      <AppBottomSheet
        visible={showTypeEditSheet}
        onClose={() => setShowTypeEditSheet(false)}
        title="Select Vehicle Type"
      >
        {VEHICLE_TYPE_OPTIONS.map((option, index) => (
          <ListItemCard
            key={option.value}
            avatar={{
              type: 'icon',
              icon: option.icon,
              iconColor: appTheme.colors.text,
              backgroundColor: appTheme.colors.surface,
            }}
            title={option.label}
            onPress={() => {
              setEditType(option.value);
              setShowTypeEditSheet(false);
            }}
            selected={editType === option.value}
            showCheckmark
            showDivider={index < VEHICLE_TYPE_OPTIONS.length - 1}
          />
        ))}
      </AppBottomSheet>

      {/* Status Edit Picker */}
      <AppBottomSheet
        visible={showStatusEditSheet}
        onClose={() => setShowStatusEditSheet(false)}
        title="Select Status"
      >
        {STATUS_OPTIONS.map((option, index) => (
          <ListItemCard
            key={option.value}
            avatar={{
              type: 'icon',
              icon: option.value === 'available' ? 'checkmark-circle' : option.value === 'in_use' ? 'navigate' : option.value === 'maintenance' ? 'build' : 'pause-circle',
              iconColor: getStatusColor(option.value, appTheme),
              backgroundColor: `${getStatusColor(option.value, appTheme)}15`,
            }}
            title={option.label}
            onPress={() => {
              setEditStatus(option.value);
              setShowStatusEditSheet(false);
            }}
            selected={editStatus === option.value}
            showCheckmark
            showDivider={index < STATUS_OPTIONS.length - 1}
          />
        ))}
      </AppBottomSheet>

      {/* Staff Picker Bottom Sheet */}
      <AppBottomSheet
        visible={showStaffPicker}
        onClose={() => setShowStaffPicker(false)}
        title="Assign Staff"
      >
        <View style={styles.staffPickerContainer}>
          <AppSearchBar
            placeholder="Search staff..."
            value={staffSearchQuery}
            onChangeText={setStaffSearchQuery}
            onClear={() => setStaffSearchQuery('')}
          />

          <ScrollView style={styles.staffList} showsVerticalScrollIndicator={false} bounces={false}>
            {/* Unassign option (if currently assigned) */}
            {selectedTransport?.assigned_staff_id && (
              <ListItemCard
                avatar={{
                  type: 'icon',
                  icon: 'close-circle',
                  iconColor: appTheme.colors.error,
                  backgroundColor: `${appTheme.colors.error}15`,
                }}
                title="Unassign Staff"
                subtitle="Remove current assignment"
                onPress={handleUnassignStaff}
                showDivider
              />
            )}

            {filteredStaff.length === 0 ? (
              <View style={styles.staffEmptyState}>
                <Text style={[styles.staffEmptyText, { color: appTheme.colors.textMuted }]}>
                  {staffSearchQuery ? 'No staff found' : 'No team members available'}
                </Text>
              </View>
            ) : (
              filteredStaff.map((member, index) => (
                <ListItemCard
                  key={member.id}
                  avatar={member.avatar
                    ? { type: 'image', imageUri: member.avatar, userId: member.id, userName: member.name }
                    : { type: 'icon', icon: 'person', iconColor: appTheme.colors.textSecondary, backgroundColor: appTheme.colors.inputBackground }
                  }
                  title={member.name}
                  subtitle={member.role}
                  onPress={() => handleStaffSelect(member.id)}
                  selected={selectedTransport?.assigned_staff_id === member.id}
                  showCheckmark
                  showDivider={index < filteredStaff.length - 1}
                />
              ))
            )}
          </ScrollView>
        </View>
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
    marginRight: 4,
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
  },
  // Bottom Sheet Styles - Detail View
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
  sheetActions: {
    marginTop: 8,
    gap: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Bottom Sheet Styles - Edit Mode
  editFormScroll: {
    maxHeight: 420,
  },
  editForm: {
    gap: 16,
    paddingBottom: 16,
  },
  editField: {
    gap: 6,
  },
  editFieldLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.semiBold,
  },
  editInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
  },
  editInputMultiline: {
    height: 80,
    paddingTop: 12,
  },
  editPickerField: {
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editPickerText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
  },
  editStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  editActions: {
    marginTop: 8,
    gap: 10,
  },
  cancelButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Staff Picker
  staffPickerContainer: {
    gap: 12,
  },
  staffList: {
    maxHeight: 350,
  },
  staffEmptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  staffEmptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
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
