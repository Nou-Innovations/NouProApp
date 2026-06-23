import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { AppBottomSheet, ListItemCard } from '@/shared/components/ui';
import { AppBottomSheetScrollView } from './AppBottomSheet';

interface LocationDropdownProps {
  onLocationSelect?: (locationId: string | null) => void;
  showAllLocationsOption?: boolean;
  selectedLocationId?: string | null;
  style?: any;
}

export default function LocationDropdown({ 
  onLocationSelect, 
  showAllLocationsOption = true,
  selectedLocationId: controlledLocationId,
  style 
}: LocationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    locations, 
    currentLocation,
    setLocation 
  } = useBusinessStore();
  const { theme: appTheme } = useTheme();

  // Use controlled value if provided, otherwise use store value
  const selectedLocationId = controlledLocationId !== undefined 
    ? controlledLocationId 
    : currentLocation?.id || null;

  // Defensive check for undefined/null locations
  const safeLocations = Array.isArray(locations) ? locations : [];

  // Check if there's only one location (single/main location)
  const hasSingleLocation = safeLocations.length === 1;
  const primaryLocation = safeLocations.find(loc => (loc as any).is_primary) || safeLocations[0];

  // Auto-select the primary location if there's only one location
  useEffect(() => {
    if (hasSingleLocation && primaryLocation && !currentLocation) {
      if (onLocationSelect) {
        onLocationSelect(primaryLocation.id);
      } else {
        setLocation(primaryLocation);
      }
    }
  }, [hasSingleLocation, primaryLocation?.id, currentLocation]);

  const handleLocationSelect = (locationId: string | null) => {
    const location = locationId ? safeLocations.find(loc => loc.id === locationId) : null;
    
    if (onLocationSelect) {
      onLocationSelect(locationId);
    } else {
      // Default behavior: update global current location
      setLocation(location || null);
    }
    
    setIsOpen(false);
  };

  const getDisplayText = () => {
    // If single location, always show that location's name
    if (hasSingleLocation && primaryLocation) {
      return primaryLocation.name;
    }
    if (selectedLocationId) {
      return safeLocations.find(l => l.id === selectedLocationId)?.name || 'All Locations';
    }
    return 'All Locations';
  };

  // Only show "All Locations" option if there are multiple locations
  const shouldShowAllLocations = showAllLocationsOption && !hasSingleLocation;

  // Create location items for the bottom sheet
  const locationItems = useMemo(() => {
    const items: { id: string | null; title: string; icon: string }[] = [];
    
    // Add "All Locations" option if applicable
    if (shouldShowAllLocations) {
      items.push({
        id: null,
        title: 'All Locations',
        icon: 'grid',
      });
    }
    
    // Add business locations
    safeLocations.forEach(location => {
      items.push({
        id: location.id,
        title: location.name,
        icon: 'location',
      });
    });
    
    return items;
  }, [safeLocations, shouldShowAllLocations]);

  // Don't allow opening dropdown if only one location
  const handleOpenDropdown = () => {
    if (hasSingleLocation) return;
    setIsOpen(true);
  };

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity 
        style={[
          styles.dropdownTrigger, 
          { 
            borderColor: appTheme.colors.borderColor,
            backgroundColor: appTheme.colors.background,
          },
          style,
        ]}
        onPress={handleOpenDropdown}
        disabled={hasSingleLocation}
        activeOpacity={hasSingleLocation ? 1 : 0.7}
      >
        <Text 
          style={[styles.dropdownText, { color: appTheme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {getDisplayText()}
        </Text>
        {!hasSingleLocation && (
          <Icon 
            name="chevron-down" 
            size={16} 
            color={appTheme.colors.textSecondary} 
          />
        )}
      </TouchableOpacity>

      {/* Location Selection Bottom Sheet */}
      <AppBottomSheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title="Locations"
      >
        <AppBottomSheetScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {locationItems.map((item, index) => {
            const isSelected = selectedLocationId === item.id || 
              (!selectedLocationId && item.id === null);
            return (
              <ListItemCard
                key={item.id || 'all'}
                avatar={{
                  type: 'icon',
                  icon: item.icon,
                  iconColor: isSelected ? appTheme.colors.primary : appTheme.colors.iconMuted,
                  backgroundColor: appTheme.colors.surface,
                }}
                title={item.title}
                onPress={() => handleLocationSelect(item.id)}
                selected={isSelected}
                showCheckmark
                showDivider={index < locationItems.length - 1}
              />
            );
          })}
          {locationItems.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: appTheme.colors.textLight }]}>
                No locations available
              </Text>
            </View>
          )}
        </AppBottomSheetScrollView>
      </AppBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
  },
});
