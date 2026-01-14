import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface LocationDropdownProps {
  onLocationSelect?: (locationId: string | null) => void;
  showAllLocationsOption?: boolean;
  selectedLocationId?: string | null;
  style?: any;
}

export default function LocationDropdown({ 
  onLocationSelect, 
  showAllLocationsOption = true,
  selectedLocationId,
  style 
}: LocationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    locations, 
    currentLocation,
    setLocation 
  } = useBusinessStore();
  const { theme: appTheme } = useTheme();

  const selectedLocation = selectedLocationId 
    ? locations.find(loc => loc.id === selectedLocationId)
    : currentLocation;

  const handleLocationSelect = (locationId: string | null) => {
    const location = locationId ? locations.find(loc => loc.id === locationId) : null;
    
    if (onLocationSelect) {
      onLocationSelect(locationId);
    } else {
      // Default behavior: update global current location
      setLocation(location || null);
    }
    
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!selectedLocationId && !selectedLocation) {
      return 'All Locations';
    }
    return selectedLocation?.name || 'All Locations';
  };

  const dropdownOptions = [
    ...(showAllLocationsOption ? [{ id: null, name: 'All Locations' }] : []),
    ...locations.map(loc => ({ id: loc.id, name: loc.name }))
  ];

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={[styles.dropdownTrigger, { borderColor: appTheme.colors.borderColor }]}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.dropdownText, { color: appTheme.colors.text }]}>
          {getDisplayText()}
        </Text>
        <Icon 
          name="chevron-down" 
          size={16} 
          color={appTheme.colors.textLight} 
        />
      </TouchableOpacity>

      <Modal 
        visible={isOpen} 
        transparent 
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View 
            style={[
              styles.modalContent, 
              { backgroundColor: appTheme.colors.background }
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
              <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>
                Select Location
              </Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Icon 
                  name="close" 
                  size={24} 
                  color={appTheme.colors.textLight} 
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={dropdownOptions}
              keyExtractor={(item) => item.id || 'all'}
              style={styles.locationsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.locationItem,
                    (selectedLocationId === item.id || (!selectedLocationId && !item.id)) && 
                      styles.selectedLocationItem,
                    { borderBottomColor: appTheme.colors.borderColor }
                  ]}
                  onPress={() => handleLocationSelect(item.id)}
                >
                  <View style={styles.locationItemContent}>
                    <Icon 
                      name={item.id ? "location" : "grid"} 
                      size={20} 
                      color={appTheme.colors.textLight}
                      style={styles.locationIcon} 
                    />
                    <Text 
                      style={[
                        styles.locationName,
                        { color: appTheme.colors.text },
                        (selectedLocationId === item.id || (!selectedLocationId && !item.id)) && 
                          { color: appTheme.colors.primary }
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                  {(selectedLocationId === item.id || (!selectedLocationId && !item.id)) && (
                    <Icon 
                      name="checkmark" 
                      size={20} 
                      color={appTheme.colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: appTheme.colors.textLight }]}>
                    No locations available
                  </Text>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 120,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  locationsList: {
    maxHeight: 300,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  selectedLocationItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  locationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
  },
}); 