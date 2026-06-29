/**
 * BusinessHoursTable
 *
 * Read-only weekly opening-hours display, shared by the own-business profile and the public
 * business profile. Data is the `businessHours` array saved by CompanyEditScreen
 * ({ day, isOpen, timeSlots: [{ open, close }] }[]). Renders "Closed" for days that are off
 * and a muted "Not configured" when no hours have been set.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import type { BusinessHours } from '@/shared/types/business';

interface BusinessHoursTableProps {
  hours?: BusinessHours[] | null;
}

const formatDay = (day: BusinessHours): string => {
  if (!day.isOpen || !day.timeSlots || day.timeSlots.length === 0) return 'Closed';
  return day.timeSlots.map((s) => `${s.open} - ${s.close}`).join(', ');
};

const BusinessHoursTable: React.FC<BusinessHoursTableProps> = ({ hours }) => {
  const { theme: appTheme } = useTheme();

  if (!hours || hours.length === 0) {
    return (
      <Text style={[styles.empty, { color: appTheme.colors.textLight }]}>Not configured</Text>
    );
  }

  return (
    <View>
      {hours.map((day, index) => (
        <View
          key={day.day ?? index}
          style={[
            styles.row,
            index < hours.length - 1 && { borderBottomWidth: 1, borderBottomColor: appTheme.colors.borderColor },
          ]}
        >
          <Text style={[styles.day, { color: appTheme.colors.text }]}>{day.day}</Text>
          <Text
            style={[
              styles.time,
              { color: day.isOpen ? appTheme.colors.textSecondary : appTheme.colors.textLight },
            ]}
          >
            {formatDay(day)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  day: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.medium,
  },
  time: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
  },
});

export default BusinessHoursTable;
