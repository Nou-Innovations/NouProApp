import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  ScrollView,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface Location {
  id: string;
  name: string;
  address: string;
}

interface ManageLocationsModalProps {
  isVisible: boolean;
  onClose: () => void;
  locations: Location[];
  onAddLocation: (location: { name: string; address: string }) => void;
  onEditLocation: (location: { id: string; name: string; address: string }) => void;
  onDeleteLocation: (locationId: string) => void;
  isSuperAdmin?: boolean;
  onSelectLocation?: (location: Location) => void;
  selectedLocation?: Location;
}

const ManageLocationsModal: React.FC<ManageLocationsModalProps> = ({
  isVisible,
  onClose,
  locations,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  isSuperAdmin = false,
  onSelectLocation,
  selectedLocation,
}) => {
  const { theme: appTheme } = useTheme();
  
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  const handleAddMode = () => {
    setLocationName('');
    setLocationAddress('');
    setIsAddMode(true);
    setIsEditMode(false);
  };

  const handleEditMode = (location: Location) => {
    setCurrentLocation(location);
    setLocationName(location.name);
    setLocationAddress(location.address);
    setIsEditMode(true);
    setIsAddMode(false);
  };

  const handleCancel = () => {
    setIsAddMode(false);
    setIsEditMode(false);
    setCurrentLocation(null);
    setLocationName('');
    setLocationAddress('');
  };

  const handleSave = () => {
    if (!locationName.trim() || !locationAddress.trim()) {
      return;
    }

    if (isAddMode) {
      onAddLocation({
        name: locationName.trim(),
        address: locationAddress.trim(),
      });
    } else if (isEditMode && currentLocation) {
      onEditLocation({
        id: currentLocation.id,
        name: locationName.trim(),
        address: locationAddress.trim(),
      });
    }

    setIsAddMode(false);
    setIsEditMode(false);
    setCurrentLocation(null);
    setLocationName('');
    setLocationAddress('');
  };

  const renderContent = () => {
    if (isAddMode || isEditMode) {
      return (
    <View style={styles.form}>
      <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: appTheme.colors.text }]}>Location Name</Text>
        <TextInput
              style={[styles.input, { 
                color: appTheme.colors.text, 
                borderColor: appTheme.colors.borderColor,
                backgroundColor: appTheme.colors.inputBackground
              }]}
              value={locationName}
              onChangeText={setLocationName}
          placeholder="Enter location name"
              placeholderTextColor={appTheme.colors.textLight}
        />
      </View>

      <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: appTheme.colors.text }]}>Address</Text>
        <TextInput
              style={[styles.input, { 
                color: appTheme.colors.text, 
                borderColor: appTheme.colors.borderColor,
                backgroundColor: appTheme.colors.inputBackground
              }]}
              value={locationAddress}
              onChangeText={setLocationAddress}
          placeholder="Enter address"
              placeholderTextColor={appTheme.colors.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
        />
      </View>

      <View style={styles.formButtons}>
        <TouchableOpacity
              style={[styles.cancelButton, { borderColor: appTheme.colors.borderColor }]} 
              onPress={handleCancel}
        >
              <Text style={[styles.cancelButtonText, { color: appTheme.colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: appTheme.colors.accent }]} 
              onPress={handleSave}
        >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <>
        {isSuperAdmin && (
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: appTheme.colors.accent }]}
            onPress={handleAddMode}
          >
            <Icon name="add" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Location</Text>
          </TouchableOpacity>
        )}

        <ScrollView style={styles.locationsContainer} contentContainerStyle={styles.listContent}>
          {locations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.locationAddress, { color: appTheme.colors.textLight }]}>No locations added yet.</Text>
            </View>
          ) : (
            locations.map((item) => {
              const isSelected = selectedLocation && item.id === selectedLocation.id;
              return (
                <TouchableOpacity 
                  key={item.id}
                  style={[
                    styles.locationItem, 
                    { borderBottomColor: appTheme.colors.borderColor },
                    isSelected && styles.selectedLocationItem
                  ]}
                  onPress={() => onSelectLocation && onSelectLocation(item)}
                >
                  <View style={styles.locationInfo}>
                    <Text style={[styles.locationName, { color: isSelected ? '#FFFFFF' : appTheme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.locationAddress, { color: isSelected ? '#FFFFFF' : appTheme.colors.textLight }]}>{item.address}</Text>
                  </View>
                  <View style={styles.locationActions}>
                    {isSelected && (
                      <Icon name="checkmark" size={24} color="#FFFFFF" style={styles.checkmarkIcon} />
                    )}
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditMode(item);
                      }}
                    >
                      <Icon name="create-outline" size={20} color={isSelected ? '#FFFFFF' : appTheme.colors.iconColor} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: appTheme.colors.cardBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Locations</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={appTheme.colors.iconColor} />
            </TouchableOpacity>
          </View>

          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '90%',
    minHeight: 'auto',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  locationsContainer: {
    paddingHorizontal: 0,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLocationItem: {
    backgroundColor: '#1C1917',
  },
  checkmarkIcon: {
    marginRight: 8,
  },
});

export default ManageLocationsModal; 