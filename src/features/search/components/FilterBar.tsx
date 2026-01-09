import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import theme from '@/shared/theme';
import { Text } from '@/shared/components/ui/Typography';
import { useTheme } from '@/shared/theme/ThemeProvider';

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
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={[
        styles.filtersContainer, 
        { 
          backgroundColor: appTheme.colors.background,
          borderBottomColor: appTheme.colors.borderColor 
        },
        containerStyle
      ]}
      contentContainerStyle={styles.filtersContentContainer}
    >
      {statuses.map((status) => (
        <TouchableOpacity
          key={status}
          style={styles.filterButton}
          onPress={() => onSelectStatus(status)}
        >
          <View style={styles.filterTextWrapper}>
            <Text 
              style={[
                styles.filterText,
                selectedStatus === status 
                  ? [styles.filterTextSelected, { color: appTheme.colors.primary }] 
                  : [styles.filterTextNotSelected, { color: appTheme.colors.textSecondary }]
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
            {selectedStatus === status && 
              <View style={[styles.selectedIndicator, { backgroundColor: appTheme.colors.primary }]} />
            }
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  filtersContainer: {
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    borderBottomWidth: 1,
    
  },
  filtersContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    height: 40,
    minHeight: 40,
  },
  filterButton: {
    flex: 1,
    height: '100%', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTextWrapper: { 
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: { 
    fontSize: theme.fontSize.sm,
    paddingBottom: 6,
    fontFamily: theme.fonts.primary.medium,
  },
  filterTextSelected: {
    fontFamily: theme.fonts.primary.bold,
  },
  filterTextNotSelected: {
  },
  selectedIndicator: {
    height: 3,
    width: '100%', 
    position: 'absolute', 
    bottom: 0,
  },
});

export default FilterBar; 