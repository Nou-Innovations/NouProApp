/**
 * BusinessHoursScreen
 * Set business operating hours during registration
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList, FullBusinessData } from '@/shared/types/navigation';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppButton from '@/shared/components/ui/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'BusinessHours'>;

interface TimeSlot {
  open: string;
  close: string;
}

interface BusinessHour {
  day: string;
  isOpen: boolean;
  timeSlots: TimeSlot[];
}

const DEFAULT_BUSINESS_HOURS: BusinessHour[] = [
  { day: 'Sunday', isOpen: false, timeSlots: [{ open: '09:00', close: '17:00' }] },
  { day: 'Monday', isOpen: true, timeSlots: [{ open: '08:00', close: '17:00' }] },
  { day: 'Tuesday', isOpen: true, timeSlots: [{ open: '08:00', close: '17:00' }] },
  { day: 'Wednesday', isOpen: true, timeSlots: [{ open: '08:00', close: '17:00' }] },
  { day: 'Thursday', isOpen: true, timeSlots: [{ open: '08:00', close: '17:00' }] },
  { day: 'Friday', isOpen: true, timeSlots: [{ open: '08:00', close: '17:00' }] },
  { day: 'Saturday', isOpen: false, timeSlots: [{ open: '09:00', close: '16:00' }] },
];

export default function BusinessHoursScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { businessData, location, fromProfileSwitcher, pendingAuth } = route.params;
  
  // State
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(DEFAULT_BUSINESS_HOURS);

  // Toggle day open/closed
  const toggleDayOpen = (dayIndex: number, isOpen: boolean) => {
    const updatedHours = [...businessHours];
    updatedHours[dayIndex] = { ...updatedHours[dayIndex], isOpen };
    setBusinessHours(updatedHours);
  };

  // Check if at least one day is open (form valid)
  const isFormValid = businessHours.some(day => day.isOpen);

  const handleContinue = () => {
    // Build full business data
    const fullBusinessData: FullBusinessData = {
      ...businessData,
      location,
      businessHours,
    };

    navigation.navigate('UploadBusinessLogo', {
      businessData: fullBusinessData,
      fromProfileSwitcher,
      pendingAuth,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            Business Hours
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            Set the days and times your business is open to let customers know when you're available.
          </Text>
        </View>

        {/* Days List */}
        <View style={styles.daysList}>
          {businessHours.map((hour, index) => (
            <View 
              key={hour.day}
              style={[
                styles.dayRow,
                { borderBottomColor: appTheme.colors.borderColor }
              ]}
            >
              <View style={styles.dayInfo}>
                <Text style={[styles.dayName, { color: appTheme.colors.text }]}>
                  {hour.day}
                </Text>
                {hour.isOpen ? (
                  <Text style={[styles.dayTime, { color: appTheme.colors.textSecondary }]}>
                    {hour.timeSlots[0].open} - {hour.timeSlots[0].close}
                  </Text>
                ) : (
                  <Text style={[styles.dayTime, { color: appTheme.colors.textMuted }]}>
                    Closed
                  </Text>
                )}
              </View>
              <Switch
                value={hour.isOpen}
                onValueChange={(value) => toggleDayOpen(index, value)}
                trackColor={{
                  false: appTheme.colors.switchTrackOff,
                  true: appTheme.colors.switchTrackOn,
                }}
                thumbColor={appTheme.colors.switchThumb}
              />
            </View>
          ))}
        </View>

        {/* Note */}
        <Text style={[styles.note, { color: appTheme.colors.textMuted }]}>
          You can customize specific time slots for each day later in your business settings.
        </Text>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[
        styles.bottomContainer,
        { paddingBottom: insets.bottom + 16 }
      ]}>
        <AppButton
          title="Continue"
          onPress={handleContinue}
          variant={isFormValid ? 'primary' : 'disabled'}
          disabled={!isFormValid}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.primary.bold,
    lineHeight: 40,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 24,
  },
  daysList: {
    gap: 0,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dayInfo: {
    gap: 4,
  },
  dayName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  dayTime: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
  },
  note: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 24,
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
});
