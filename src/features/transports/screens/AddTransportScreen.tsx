/**
 * AddTransportScreen - Add a new vehicle/transport
 * Screen for adding new vehicles to the business fleet
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import ListItemCard from '@/shared/components/ui/ListItemCard';
import type { VehicleType } from '@/shared/types/transport';
import { createTransport } from '@/features/transports/transports.service';

// Vehicle type options with labels and icons
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

export default function AddTransportScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);

  // Form state
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [transportModel, setTransportModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);

  // Get selected type label
  const selectedTypeOption = VEHICLE_TYPE_OPTIONS.find(opt => opt.value === vehicleType);

  // Check if form is valid
  const isFormValid = vehicleType !== null && transportModel.trim() !== '';

  // Handle type selection
  const handleSelectType = (type: VehicleType) => {
    setVehicleType(type);
    setShowTypeSheet(false);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!activeBusiness?.id) {
      Alert.alert('Error', 'No active business selected');
      return;
    }

    if (!isFormValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await createTransport(activeBusiness.id, {
        name: transportModel.trim(),
        vehicle_type: vehicleType!,
        license_plate: licensePlate.trim() || undefined,
      });

      Alert.alert(
        'Success',
        'Vehicle added successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'Failed to add vehicle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Add Vehicle"
        leftAction={{
          icon: 'chevron-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Go back',
        }}
      />

      <KeyboardAwareScreen
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={[styles.title, { color: appTheme.colors.text }]}>
              Let's add a new transport
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              Add a vehicle to your fleet to manage deliveries and track your transportation
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Type of Transport */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>
                Type of Transport <Text style={{ color: appTheme.colors.error }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                  }
                ]}
                onPress={() => setShowTypeSheet(true)}
                activeOpacity={0.7}
              >
                {selectedTypeOption ? (
                  <View style={styles.selectedTypeContent}>
                    <Icon 
                      name={selectedTypeOption.icon as any} 
                      size={20} 
                      color={appTheme.colors.primary} 
                    />
                    <Text style={[styles.selectFieldText, { color: appTheme.colors.text }]}>
                      {selectedTypeOption.label}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.selectFieldPlaceholder, { color: appTheme.colors.textMuted }]}>
                    Select vehicle type
                  </Text>
                )}
                <Icon name="chevron-down" size={20} color={appTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Transport Model */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>
                Transport Model <Text style={{ color: appTheme.colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }
                ]}
                value={transportModel}
                onChangeText={setTransportModel}
                placeholder="e.g., Delivery Van 01, Express Bike"
                placeholderTextColor={appTheme.colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Text style={[styles.fieldHint, { color: appTheme.colors.textMuted }]}>
                This will be displayed as the vehicle name
              </Text>
            </View>

            {/* License Plate / Immatriculation Number */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>
                Immatriculation Number
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }
                ]}
                value={licensePlate}
                onChangeText={setLicensePlate}
                placeholder="e.g., MU-1234"
                placeholderTextColor={appTheme.colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </View>
      </KeyboardAwareScreen>

      {/* Bottom Action Button */}
      <View style={[styles.bottomActions, {
        borderTopColor: appTheme.colors.borderColor,
        backgroundColor: appTheme.colors.background,
      }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: isFormValid ? appTheme.colors.primary : appTheme.colors.surface,
            }
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.submitButtonText,
            { color: isFormValid ? '#FFFFFF' : appTheme.colors.textMuted }
          ]}>
            {isSubmitting ? 'Adding...' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle Type Selection Bottom Sheet */}
      <AppBottomSheet
        visible={showTypeSheet}
        onClose={() => setShowTypeSheet(false)}
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
            onPress={() => handleSelectType(option.value)}
            selected={vehicleType === option.value}
            showCheckmark
            showDivider={index < VEHICLE_TYPE_OPTIONS.length - 1}
          />
        ))}
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  heroSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
  },
  formSection: {
    gap: 24,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 4,
  },
  selectField: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectFieldText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  selectFieldPlaceholder: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
