/**
 * ExploreChips - horizontally scrollable single-select chip strip.
 *
 * Used by the Explore discovery screen to switch between sections
 * (Overall, Businesses, Products, Suppliers, Buyers, Opportunities, Events, Near Me).
 * The shared `FilterBar` is fixed equal-width and can't hold this many chips,
 * so this is a dedicated scrollable strip.
 */
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface ExploreChipsProps {
  chips: string[];
  selected: string;
  onSelect: (chip: string) => void;
  style?: ViewStyle;
}

export default function ExploreChips({ chips, selected, onSelect, style }: ExploreChipsProps) {
  const { theme: appTheme } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={[styles.container, style]}
    >
      {chips.map((chip) => {
        const active = chip === selected;
        return (
          <TouchableOpacity
            key={chip}
            onPress={() => onSelect(chip)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: active ? appTheme.colors.primary : appTheme.colors.surface,
                borderColor: active ? appTheme.colors.primary : appTheme.colors.borderColor,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? '#FFFFFF' : appTheme.colors.text }]}>
              {chip}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 0 },
  content: { paddingHorizontal: 12, gap: 8, paddingVertical: 8, alignItems: 'center' },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '600' },
});
