/**
 * LocationSelectorPill — header control to scope Business Home to one location
 * (or "All locations"). Reads/writes the shared businessStore so the dashboard
 * hooks refetch automatically when the selection changes.
 *
 * Renders nothing when the business has no locations to choose from.
 */

import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useBusinessStore } from '@/shared/store/businessStore';

export function LocationSelectorPill() {
  const { theme: appTheme } = useTheme();
  const locations = useBusinessStore((s) => s.locations);
  const currentLocation = useBusinessStore((s) => s.currentLocation);
  const currentLocationId = useBusinessStore((s) => s.currentLocationId);
  const setLocation = useBusinessStore((s) => s.setLocation);
  const [open, setOpen] = useState(false);

  if (!locations || locations.length === 0) return null;

  const label = currentLocation?.name ?? 'All locations';

  const select = (loc: (typeof locations)[number] | null) => {
    setLocation(loc);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, { backgroundColor: appTheme.colors.surface, borderColor: appTheme.colors.borderColor }]}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
        accessibilityLabel="Select location"
      >
        <Icon name="location-outline" size={14} color={appTheme.colors.textSecondary} />
        <Text style={[styles.pillText, { color: appTheme.colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        <Icon name="chevron-down" size={14} color={appTheme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: appTheme.colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: appTheme.colors.text }]}>Location</Text>
            <ScrollView style={styles.sheetScroll}>
              <LocationRow
                label="All locations"
                selected={currentLocationId === null}
                onPress={() => select(null)}
              />
              {locations.map((loc) => (
                <LocationRow
                  key={loc.id}
                  label={loc.name}
                  selected={currentLocationId === loc.id}
                  onPress={() => select(loc)}
                />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function LocationRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme: appTheme } = useTheme();
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <Text
        style={[
          styles.rowText,
          { color: selected ? appTheme.colors.accent : appTheme.colors.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {selected ? <Icon name="checkmark" size={18} color={appTheme.colors.accent} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 180,
  },
  pillText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.semiBold,
    flexShrink: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: theme.spacing.sm,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.15)',
  },
  rowText: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.medium,
    flex: 1,
  },
});

export default LocationSelectorPill;
