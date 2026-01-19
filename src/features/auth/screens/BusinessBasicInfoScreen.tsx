/**
 * BusinessBasicInfoScreen
 * Enter basic business information during registration
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/shared/types/navigation';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/components/ui/Typography';
import AppTextField from '@/shared/components/ui/AppTextField';
import AppButton from '@/shared/components/ui/AppButton';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import ListItemCard from '@/shared/components/ui/ListItemCard';
import PhoneNumberField from '@/shared/components/ui/PhoneNumberField';

type Props = NativeStackScreenProps<AuthStackParamList, 'BusinessBasicInfo'>;

// Business types in alphabetical order
const BUSINESS_TYPES = [
  'Bookstore',
  'Dealers & Resellers',
  'Distributors & Wholesalers',
  'Franchise & Chain Businesses',
  'Hardware Store',
  'Importers & Exporters',
  'Library',
  'Manufacturers & Producers',
  'Others',
  'Pharmacy',
  'Restaurant',
  'Retailers',
  'Showrooms',
  'Supply Chain & Logistics',
  'Wholesalers & Cash and Carry',
];

export default function BusinessBasicInfoScreen({ navigation, route }: Props) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const fromProfileSwitcher = route.params?.fromProfileSwitcher ?? false;
  const pendingAuth = route.params?.pendingAuth;
  
  // Form state
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [countryCode, setCountryCode] = useState('+230');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Check if form is valid
  const isFormValid = businessName.trim() && businessType && phoneNumber.trim();

  const handleContinue = () => {
    setHasAttemptedSubmit(true);
    
    if (!isFormValid) return;

    // Navigate to business location
    navigation.navigate('BusinessLocation', {
      businessData: {
        name: businessName.trim(),
        type: businessType,
        phone: phoneNumber.trim(),
        countryCode,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
      },
      fromProfileSwitcher,
      pendingAuth,
    });
  };

  const handleSelectType = (type: string) => {
    setBusinessType(type);
    setShowTypeSheet(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: appTheme.colors.text }]}>
              Create your business profile
            </Text>
            <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
              Enter your business basic information
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <AppTextField
              label="Business Name"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Enter your business name"
              leftIcon="business-outline"
              error={hasAttemptedSubmit && !businessName.trim()}
            />

            {/* Business Type Selector */}
            <View>
              <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>
                Business Type
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  {
                    borderColor: hasAttemptedSubmit && !businessType
                      ? appTheme.colors.error
                      : appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                  },
                ]}
                onPress={() => setShowTypeSheet(true)}
                activeOpacity={0.7}
              >
                <Icon name="list-outline" size={20} color={appTheme.colors.textMuted} />
                <Text 
                  style={[
                    styles.selectFieldText,
                    { 
                      color: businessType ? appTheme.colors.text : appTheme.colors.textMuted 
                    }
                  ]}
                >
                  {businessType || 'Select business type'}
                </Text>
                <Icon name="chevron-down" size={20} color={appTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <PhoneNumberField
              label="Business Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              placeholder="Enter phone number"
              error={hasAttemptedSubmit && !phoneNumber.trim()}
            />

            <AppTextField
              label="Business Email Address (Optional)"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter business email"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />

            <AppTextField
              label="Business Website (Optional)"
              value={website}
              onChangeText={setWebsite}
              placeholder="Enter business website"
              keyboardType="url"
              autoCapitalize="none"
              leftIcon="globe-outline"
            />
          </View>
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
      </KeyboardAvoidingView>

      {/* Business Type Bottom Sheet */}
      <AppBottomSheet
        visible={showTypeSheet}
        onClose={() => setShowTypeSheet(false)}
        title="Select Business Type"
      >
        <ScrollView style={styles.typeListContainer} showsVerticalScrollIndicator={false}>
          {BUSINESS_TYPES.map((type, index) => (
            <ListItemCard
              key={type}
              avatar={{
                type: 'icon',
                icon: 'business-outline',
                iconColor: appTheme.colors.text,
                backgroundColor: appTheme.colors.surface,
              }}
              title={type}
              onPress={() => handleSelectType(type)}
              selected={businessType === type}
              showCheckmark
              showDivider={index < BUSINESS_TYPES.length - 1}
            />
          ))}
        </ScrollView>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  formContainer: {
    gap: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 8,
    marginLeft: 8,
  },
  selectField: {
    height: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectFieldText: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  bottomContainer: {
    paddingHorizontal: 16,
  },
  typeListContainer: {
    maxHeight: 400,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  typeOptionText: {
    fontSize: 16,
  },
});
