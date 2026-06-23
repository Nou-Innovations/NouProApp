/**
 * PhoneNumberField Component
 * Combined country code selector + phone number input
 * Uses bottom sheet for country code selection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import AppBottomSheet, { AppBottomSheetScrollView } from './AppBottomSheet';
import ListItemCard from './ListItemCard';

// Country codes data
const COUNTRY_CODES = [
  { code: '+230', country: 'Mauritius', flag: '🇲🇺' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
];

interface PhoneNumberFieldProps {
  /** Label text displayed above the fields */
  label?: string;
  /** Current phone number value */
  value: string;
  /** Callback when phone number changes */
  onChangeText: (text: string) => void;
  /** Current country code (e.g., "+230") */
  countryCode: string;
  /** Callback when country code changes */
  onCountryCodeChange: (code: string) => void;
  /** Placeholder for phone number input */
  placeholder?: string;
  /** Error state */
  error?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export default function PhoneNumberField({
  label = 'Phone Number',
  value,
  onChangeText,
  countryCode,
  onCountryCodeChange,
  placeholder = 'Enter your phone number',
  error = false,
  disabled = false,
}: PhoneNumberFieldProps) {
  const { theme: appTheme } = useTheme();
  const [showCountrySheet, setShowCountrySheet] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Get selected country data
  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  // Handle phone number input - only allow numbers
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    onChangeText(cleaned);
  };

  // Handle country selection
  const handleSelectCountry = (code: string) => {
    onCountryCodeChange(code);
    setShowCountrySheet(false);
  };

  // Get border color based on state
  const getBorderColor = () => {
    if (error) return appTheme.colors.error;
    if (isFocused) return appTheme.colors.primary;
    return appTheme.colors.borderColor;
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[
        styles.label,
        { color: error ? appTheme.colors.error : appTheme.colors.text }
      ]}>
        {label}
      </Text>

      {/* Fields Row */}
      <View style={styles.fieldsRow}>
        {/* Country Code Selector */}
        <TouchableOpacity
          style={[
            styles.countryCodeField,
            {
              borderColor: getBorderColor(),
              backgroundColor: appTheme.colors.inputBackground,
            },
          ]}
          onPress={() => !disabled && setShowCountrySheet(true)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={[styles.countryFlag]}>
            {selectedCountry.flag}
          </Text>
          <Text style={[styles.countryCode, { color: appTheme.colors.text }]}>
            {selectedCountry.code}
          </Text>
          <Icon name="chevron-down" size={16} color={appTheme.colors.textMuted} />
        </TouchableOpacity>

        {/* Phone Number Input */}
        <View style={[
          styles.phoneInputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: appTheme.colors.inputBackground,
          },
        ]}>
          <TextInput
            style={[styles.phoneInput, { color: appTheme.colors.text }]}
            value={value}
            onChangeText={handlePhoneChange}
            placeholder={placeholder}
            placeholderTextColor={appTheme.colors.textMuted}
            keyboardType="phone-pad"
            editable={!disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>
      </View>

      {/* Country Code Bottom Sheet */}
      <AppBottomSheet
        visible={showCountrySheet}
        onClose={() => setShowCountrySheet(false)}
        title="Select Country Code"
      >
        <AppBottomSheetScrollView
          style={styles.countryList}
          showsVerticalScrollIndicator={false}
        >
          {COUNTRY_CODES.map((country, index) => (
            <ListItemCard
              key={country.code}
              avatar={{
                type: 'initials',
                userName: country.flag,
                userId: country.code,
              }}
              title={country.country}
              subtitle={country.code}
              onPress={() => handleSelectCountry(country.code)}
              selected={countryCode === country.code}
              showCheckmark
              showDivider={index < COUNTRY_CODES.length - 1}
            />
          ))}
        </AppBottomSheetScrollView>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 8,
    marginLeft: 8,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCodeField: {
    height: 56,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  phoneInputContainer: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  phoneInput: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
    height: '100%',
  },
  countryList: {
    maxHeight: 400,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 12,
  },
  countryOptionFlag: {
    fontSize: 24,
  },
  countryOptionInfo: {
    flex: 1,
  },
  countryOptionName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  countryOptionCode: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
});
