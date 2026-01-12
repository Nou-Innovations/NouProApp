import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import theme from '@/shared/theme';
import { Text } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';

// Design specs from design.json - filterBar
const FILTER_BAR_HEIGHT = 40;
const SELECTED_INDICATOR_HEIGHT = 2.5;

interface FilterBarProps {
  statuses: string[];
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  containerStyle?: ViewStyle;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  statuses, 
  selectedStatus, 
  onSelectStatus,
  containerStyle 
}) => {
  const { theme: appTheme } = useTheme();
  
  return (
    <View 
      style={[
        styles.filtersContainer, 
        { 
          backgroundColor: appTheme.colors.background,
          borderBottomColor: appTheme.colors.borderColor 
        },
        containerStyle
      ]}
    >
      {statuses.map((status) => {
        const isSelected = selectedStatus === status;
        return (
          <TouchableOpacity
            key={status}
            style={styles.filterButton}
            onPress={() => onSelectStatus(status)}
            activeOpacity={0.7}
          >
            <Text 
              style={[
                styles.filterText,
                isSelected 
                  ? { color: appTheme.colors.primary, fontFamily: theme.fonts.primary.bold }
                  : { color: appTheme.colors.textMuted }
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
            {isSelected && (
              <View style={[styles.selectedIndicator, { backgroundColor: appTheme.colors.primary }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  filtersContainer: {
    flexDirection: 'row',
    height: FILTER_BAR_HEIGHT,
    borderBottomWidth: 1,
  },
  filterButton: {
    flex: 1,
    height: '100%', 
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterText: { 
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
  },
  selectedIndicator: {
    height: SELECTED_INDICATOR_HEIGHT,
    position: 'absolute', 
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default FilterBar; 