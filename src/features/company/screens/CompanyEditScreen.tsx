import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { useBusinessStore } from '@/shared/store/businessStore';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppButton from '@/shared/components/ui/AppButton';
import { AppBottomSheet, AppModal } from '@/shared/components/ui';

// DropdownItem type (kept for selection items)
interface DropdownItem {
  id: string;
  title: string;
  description?: string;
  icon?: string;
}
import { SecondaryHeader } from '@/shared/components/layout/headers';
import Avatar from '@/shared/components/ui/Avatar';
import theme from '@/shared/theme';

interface TimeSlot {
  open: string;
  close: string;
}

interface BusinessHour {
  day: string;
  isOpen: boolean;
  timeSlots: TimeSlot[];
}

const businessTypes: DropdownItem[] = [
  { id: 'warehouse', title: 'Warehouse', icon: 'business-outline' },
  { id: 'retail', title: 'Retail Store', icon: 'storefront-outline' },
  { id: 'office', title: 'Office', icon: 'business-outline' },
  { id: 'manufacturing', title: 'Manufacturing', icon: 'construct-outline' },
  { id: 'restaurant', title: 'Restaurant', icon: 'restaurant-outline' },
  { id: 'service', title: 'Service Provider', icon: 'hammer-outline' },
];

const countryCodes = [
  { code: '+230', country: 'Mauritius', flag: '🇲🇺' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
];

// Helper to parse time string to Date
const parseTimeToDate = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Helper to format Date to time string
const formatDateToTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Generate time options for picker (every 15 minutes)
const generateTimeOptions = (): string[] => {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

export default function CompanyEditScreen() {
  const { theme: appTheme } = useTheme();
  const navigation = useNavigation();
  const { currentCompany } = useBusinessStore();

  // Initial values
  const initialCoverImage = 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80';
  const initialProfileImage = currentCompany?.logo_url || '';
  const initialCompanyName = currentCompany?.name || '';
  const initialBusinessDescription = currentCompany?.description || 'Leading distribution company serving clients across multiple locations.';
  const initialBusinessType = 'warehouse';
  const initialEmail = currentCompany?.email || 'company@email.com';
  const initialWebsite = 'www.noupro.com';
  const initialCountryCode = '+230';
  const initialPhoneNumber = currentCompany?.phone || '123456789';
  // Get address from first location if available
  const initialAddress = currentCompany?.locations?.[0]?.address || '123 Business Street, City, State 12345';
  const initialBusinessHours: BusinessHour[] = [
    { day: 'Sunday', isOpen: false, timeSlots: [{ open: '09:00', close: '18:00' }] },
    { day: 'Monday', isOpen: true, timeSlots: [{ open: '08:00', close: '17:00' }] },
    { day: 'Tuesday', isOpen: true, timeSlots: [{ open: '08:30', close: '12:00' }, { open: '13:00', close: '16:30' }] },
    { day: 'Wednesday', isOpen: true, timeSlots: [{ open: '08:30', close: '12:00' }, { open: '13:00', close: '16:30' }] },
    { day: 'Thursday', isOpen: true, timeSlots: [{ open: '08:00', close: '12:00' }, { open: '13:00', close: '16:30' }] },
    { day: 'Friday', isOpen: true, timeSlots: [{ open: '08:00', close: '17:00' }] },
    { day: 'Saturday', isOpen: false, timeSlots: [{ open: '09:00', close: '16:00' }] },
  ];

  // Invoice Settings initial values
  const initialCurrency = currentCompany?.settings?.currency || 'USD';
  const initialTaxRate = (currentCompany?.settings?.taxRate || 15).toString();
  const initialInvoicePrefix = currentCompany?.settings?.invoicePrefix || 'INV';
  const initialAllowPartialPayments = true;
  const initialAutoGenerateInvoices = false;

  // Store original values for comparison
  const originalInfoRef = useRef({
    coverImage: initialCoverImage,
    profileImage: initialProfileImage,
    companyName: initialCompanyName,
    businessDescription: initialBusinessDescription,
    businessType: initialBusinessType,
    email: initialEmail,
    website: initialWebsite,
    countryCode: initialCountryCode,
    phoneNumber: initialPhoneNumber,
    address: initialAddress,
    businessHours: initialBusinessHours,
    currency: initialCurrency,
    taxRate: initialTaxRate,
    invoicePrefix: initialInvoicePrefix,
    allowPartialPayments: initialAllowPartialPayments,
    autoGenerateInvoices: initialAutoGenerateInvoices,
  });

  // State
  const [coverImage, setCoverImage] = useState(initialCoverImage);
  const [profileImage, setProfileImage] = useState(initialProfileImage);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [businessDescription, setBusinessDescription] = useState(initialBusinessDescription);
  const [businessType, setBusinessType] = useState(initialBusinessType);
  const [email, setEmail] = useState(initialEmail);
  const [website, setWebsite] = useState(initialWebsite);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [address, setAddress] = useState(initialAddress);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(initialBusinessHours);
  
  // Invoice Settings state
  const [currency, setCurrency] = useState(initialCurrency);
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [invoicePrefix, setInvoicePrefix] = useState(initialInvoicePrefix);
  const [allowPartialPayments, setAllowPartialPayments] = useState(initialAllowPartialPayments);
  const [autoGenerateInvoices, setAutoGenerateInvoices] = useState(initialAutoGenerateInvoices);
  
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [showCountryCodeModal, setShowCountryCodeModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerConfig, setTimePickerConfig] = useState<{
    dayIndex: number;
    slotIndex: number;
    type: 'open' | 'close';
    currentTime: string;
  } | null>(null);
  const [tempSelectedTime, setTempSelectedTime] = useState<Date>(new Date());

  // Mock business plan
  const [businessPlan, setBusinessPlan] = useState<'free' | 'premium' | 'enterprise'>('free');

  // Check for changes
  useEffect(() => {
    const original = originalInfoRef.current;
    const hasChanges = 
      coverImage !== original.coverImage ||
      profileImage !== original.profileImage ||
      companyName !== original.companyName ||
      businessDescription !== original.businessDescription ||
      businessType !== original.businessType ||
      email !== original.email ||
      website !== original.website ||
      countryCode !== original.countryCode ||
      phoneNumber !== original.phoneNumber ||
      address !== original.address ||
      JSON.stringify(businessHours) !== JSON.stringify(original.businessHours) ||
      currency !== original.currency ||
      taxRate !== original.taxRate ||
      invoicePrefix !== original.invoicePrefix ||
      allowPartialPayments !== original.allowPartialPayments ||
      autoGenerateInvoices !== original.autoGenerateInvoices;
    
    setHasChanges(hasChanges);
  }, [coverImage, profileImage, companyName, businessDescription, businessType, email, website, countryCode, phoneNumber, address, businessHours, currency, taxRate, invoicePrefix, allowPartialPayments, autoGenerateInvoices]);

  const handleImagePicker = async (type: 'cover' | 'profile') => {
    try {
      setIsUploadingImage(true);
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permissionResult.granted === false) {
          Alert.alert(
            'Permission Required',
            'Permission to access camera roll is required to change images. Please enable it in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => console.log('Open settings') }
            ]
          );
          setIsUploadingImage(false);
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'cover' ? [3, 4] : [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        if (type === 'cover') {
          setCoverImage(result.assets[0].uri);
        } else {
          setProfileImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleToggleDay = (dayIndex: number, isOpen: boolean) => {
    const updatedHours = [...businessHours];
    updatedHours[dayIndex] = { ...updatedHours[dayIndex], isOpen };
    setBusinessHours(updatedHours);
  };

  const openTimePicker = (dayIndex: number, slotIndex: number, type: 'open' | 'close') => {
    const currentTime = businessHours[dayIndex].timeSlots[slotIndex][type];
    setTimePickerConfig({ dayIndex, slotIndex, type, currentTime });
    setTempSelectedTime(parseTimeToDate(currentTime));
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedDate && timePickerConfig) {
        applyTimeSelection(selectedDate);
      }
    } else {
      // iOS - update temp time as user scrolls
      if (selectedDate) {
        setTempSelectedTime(selectedDate);
      }
    }
  };

  const applyTimeSelection = (date: Date) => {
    if (!timePickerConfig) return;
    
    const { dayIndex, slotIndex, type } = timePickerConfig;
    const timeString = formatDateToTime(date);
    const currentSlot = businessHours[dayIndex].timeSlots[slotIndex];
    const allSlots = businessHours[dayIndex].timeSlots;
    
    // Validate the time
    if (type === 'open') {
      // Open time must be before close time
      if (timeString >= currentSlot.close) {
        Alert.alert('Invalid Time', 'Opening time must be before closing time.');
        return;
      }
      // For slots after the first, open time must be after previous slot's close time
      if (slotIndex > 0) {
        const prevSlot = allSlots[slotIndex - 1];
        if (timeString <= prevSlot.close) {
          Alert.alert('Invalid Time', `Opening time must be after the previous slot ends (${prevSlot.close}).`);
          return;
        }
      }
    } else {
      // Close time must be after open time
      if (timeString <= currentSlot.open) {
        Alert.alert('Invalid Time', 'Closing time must be after opening time.');
        return;
      }
      // For slots before the last, close time must be before next slot's open time
      if (slotIndex < allSlots.length - 1) {
        const nextSlot = allSlots[slotIndex + 1];
        if (timeString >= nextSlot.open) {
          Alert.alert('Invalid Time', `Closing time must be before the next slot starts (${nextSlot.open}).`);
          return;
        }
      }
    }
    
    const updatedHours = [...businessHours];
    const updatedSlots = [...updatedHours[dayIndex].timeSlots];
    updatedSlots[slotIndex] = {
      ...updatedSlots[slotIndex],
      [type]: timeString,
    };
    updatedHours[dayIndex] = {
      ...updatedHours[dayIndex],
      timeSlots: updatedSlots,
    };
    
    setBusinessHours(updatedHours);
  };

  const confirmTimeSelection = () => {
    applyTimeSelection(tempSelectedTime);
    setShowTimePicker(false);
    setTimePickerConfig(null);
  };

  const cancelTimeSelection = () => {
    setShowTimePicker(false);
    setTimePickerConfig(null);
  };

  const addTimeSlot = (dayIndex: number) => {
    const updatedHours = [...businessHours];
    const lastSlot = updatedHours[dayIndex].timeSlots[updatedHours[dayIndex].timeSlots.length - 1];
    
    // New slot must start after the last slot's close time
    const lastCloseTime = parseTimeToDate(lastSlot.close);
    
    // Add 1 hour gap after last close time for new open
    const newOpenDate = new Date(lastCloseTime);
    newOpenDate.setHours(newOpenDate.getHours() + 1);
    
    // Ensure we don't go past midnight
    if (newOpenDate.getHours() >= 23) {
      Alert.alert('Cannot Add Slot', 'No more time available in the day to add another slot.');
      return;
    }
    
    const newOpenTime = formatDateToTime(newOpenDate);
    
    // New close time is 2 hours after open, or end of day
    const newCloseDate = new Date(newOpenDate);
    newCloseDate.setHours(Math.min(newCloseDate.getHours() + 2, 23));
    newCloseDate.setMinutes(newCloseDate.getHours() === 23 ? 45 : newCloseDate.getMinutes());
    const newCloseTime = formatDateToTime(newCloseDate);
    
    updatedHours[dayIndex].timeSlots.push({ open: newOpenTime, close: newCloseTime });
    setBusinessHours(updatedHours);
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const updatedHours = [...businessHours];
    // Don't allow removing the last time slot
    if (updatedHours[dayIndex].timeSlots.length > 1) {
      updatedHours[dayIndex].timeSlots.splice(slotIndex, 1);
      setBusinessHours(updatedHours);
    }
  };

  const getSelectedBusinessType = () => {
    return businessTypes.find(type => type.id === businessType);
  };

  const getSelectedCountryCode = () => {
    return countryCodes.find(cc => cc.code === countryCode);
  };

  const handleSave = () => {
    // Update original values after save
    originalInfoRef.current = {
      coverImage,
      profileImage,
      companyName,
      businessDescription,
      businessType,
      email,
      website,
      countryCode,
      phoneNumber,
      address,
      businessHours,
      currency,
      taxRate,
      invoicePrefix,
      allowPartialPayments,
      autoGenerateInvoices,
    };
    setHasChanges(false);
    setShowSuccessDialog(true);
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };


  const renderCoverSection = () => (
    <View style={styles.coverSection}>
      <TouchableOpacity 
        style={styles.coverImageWrapper}
        onPress={() => handleImagePicker('cover')}
        disabled={isUploadingImage}
      >
        <Image
          source={{ uri: coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        {isUploadingImage && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="white" />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleImagePicker('cover')} disabled={isUploadingImage}>
        <Text style={[styles.changePictureText, { color: appTheme.colors.primary }]}>
          Change cover picture
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfileSection = () => (
    <View style={styles.profileSection}>
      <TouchableOpacity 
        style={styles.avatarContainer}
        onPress={() => handleImagePicker('profile')}
        disabled={isUploadingImage}
      >
        <Avatar
          userId={currentCompany?.id || 'company'}
          userName={companyName || 'Business'}
          imageUri={profileImage}
          size={120}
          style={styles.avatar}
          textStyle={{ fontSize: 48 }}
        />
        {isUploadingImage && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="white" />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleImagePicker('profile')} disabled={isUploadingImage}>
        <Text style={[styles.changePictureText, { color: appTheme.colors.primary }]}>
          Change profile picture
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderUpgradeSection = () => {
    if (businessPlan !== 'free') return null;
    
    return (
      <View style={styles.upgradeSection}>
        <AppButton
          title="Upgrade plan"
          onPress={() => Alert.alert('Upgrade Plan', 'Upgrade to premium features!')}
          variant="alert"
          style={styles.upgradeButton}
        />
      </View>
    );
  };

  const renderBasicSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Basic Information
      </Text>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Business Name</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Enter business name"
          placeholderTextColor="#777777"
        />
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Business Description</Text>
        <TextInput
          style={[
            styles.infoInput,
            styles.aboutInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={businessDescription}
          onChangeText={setBusinessDescription}
          placeholder="Describe your business"
          placeholderTextColor="#777777"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Business Type</Text>
        <TouchableOpacity 
          style={[
            styles.dropdownInput,
            {
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          onPress={() => setShowBusinessTypeModal(true)}
        >
          <View style={styles.dropdownContent}>
            <Icon 
              name={getSelectedBusinessType()?.icon as any || 'business-outline'} 
              size={20} 
              color="#777777" 
            />
            <Text style={[styles.dropdownText, { color: appTheme.colors.text }]}>
              {getSelectedBusinessType()?.title || 'Select Business Type'}
            </Text>
          </View>
          <Icon name="chevron-down" size={20} color="#777777" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Address</Text>
        <TextInput
          style={[
            styles.infoInput,
            styles.addressInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main Street, City, State"
          placeholderTextColor="#777777"
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );

  const renderContactSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Contact Information
      </Text>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Email</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="company@email.com"
          placeholderTextColor="#777777"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Business Phone Number</Text>
        <View style={styles.phoneInputContainer}>
          <TouchableOpacity 
            style={[
              styles.countryCodeInput,
              {
                borderColor: '#DAD3D1',
                backgroundColor: '#FFFFFF',
              },
            ]}
            onPress={() => setShowCountryCodeModal(true)}
          >
            <Text style={styles.flagText}>{getSelectedCountryCode()?.flag}</Text>
            <Text style={[styles.countryCodeText, { color: appTheme.colors.text }]}>{countryCode}</Text>
            <Icon name="chevron-down" size={16} color="#777777" />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.infoInput,
              styles.phoneNumberInput,
              {
                color: appTheme.colors.text,
                borderColor: '#DAD3D1',
                backgroundColor: '#FFFFFF',
              },
            ]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="123456789"
            placeholderTextColor="#777777"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Business Website</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={website}
          onChangeText={setWebsite}
          placeholder="www.yourcompany.com"
          placeholderTextColor="#777777"
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const renderBusinessHoursSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Business Hours
      </Text>
      
      {businessHours.map((hour, dayIndex) => (
        <View key={hour.day} style={[styles.hourRow, { borderBottomColor: appTheme.colors.borderColor }]}>
          <View style={styles.hourDay}>
            <Text style={[styles.dayLabel, { color: appTheme.colors.text }]}>{hour.day}</Text>
            <View style={styles.dayRightSection}>
              {!hour.isOpen && (
                <Text style={[styles.closedText, { color: appTheme.colors.textMuted }]}>Closed</Text>
              )}
              <Switch
                value={hour.isOpen}
                onValueChange={(value) => handleToggleDay(dayIndex, value)}
                trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E9E9EA"
              />
            </View>
          </View>
          
          {hour.isOpen && (
            <View style={styles.timeContainer}>
              {hour.timeSlots.map((slot, slotIndex) => (
                <View key={slotIndex} style={styles.timeSlotRow}>
                  <View style={styles.timeRow}>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => openTimePicker(dayIndex, slotIndex, 'open')}
                    >
                      <Text style={[styles.timeText, { color: appTheme.colors.text }]}>{slot.open}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.timeSeperator, { color: appTheme.colors.textSecondary }]}>to</Text>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => openTimePicker(dayIndex, slotIndex, 'close')}
                    >
                      <Text style={[styles.timeText, { color: appTheme.colors.text }]}>{slot.close}</Text>
                    </TouchableOpacity>
                  </View>
                  {hour.timeSlots.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeTimeSlotButton}
                      onPress={() => removeTimeSlot(dayIndex, slotIndex)}
                    >
                      <Icon name="close" size={20} color={appTheme.colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity 
                style={[styles.addTimeSlotButton, { borderColor: appTheme.colors.borderColor }]}
                onPress={() => addTimeSlot(dayIndex)}
              >
                <Icon name="add" size={20} color={appTheme.colors.primary} />
                <Text style={[styles.addTimeSlotText, { color: appTheme.colors.primary }]}>Add time slot</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderInvoiceSettingsSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Invoice Settings
      </Text>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Currency</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={currency}
          onChangeText={setCurrency}
          placeholder="USD"
          placeholderTextColor="#777777"
        />
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Tax Rate (%)</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={taxRate}
          onChangeText={setTaxRate}
          placeholder="15"
          placeholderTextColor="#777777"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Invoice Prefix</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={invoicePrefix}
          onChangeText={setInvoicePrefix}
          placeholder="INV"
          placeholderTextColor="#777777"
        />
      </View>

      <View style={[styles.switchItem, { borderBottomColor: appTheme.colors.borderColor }]}>
        <View style={styles.switchLeft}>
          <View style={[styles.switchIconContainer, { backgroundColor: appTheme.colors.primary + '15' }]}>
            <Icon name="wallet-outline" size={20} color={appTheme.colors.primary} />
          </View>
          <View style={styles.switchTextContainer}>
            <Text style={[styles.switchTitle, { color: appTheme.colors.text }]}>
              Allow Partial Payments
            </Text>
            <Text style={[styles.switchSubtitle, { color: appTheme.colors.textSecondary }]}>
              Let clients pay invoices in parts
            </Text>
          </View>
        </View>
        <Switch
          value={allowPartialPayments}
          onValueChange={setAllowPartialPayments}
          trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E9E9EA"
        />
      </View>

      <View style={[styles.switchItem, { borderBottomColor: 'transparent' }]}>
        <View style={styles.switchLeft}>
          <View style={[styles.switchIconContainer, { backgroundColor: appTheme.colors.primary + '15' }]}>
            <Icon name="document-text-outline" size={20} color={appTheme.colors.primary} />
          </View>
          <View style={styles.switchTextContainer}>
            <Text style={[styles.switchTitle, { color: appTheme.colors.text }]}>
              Auto-Generate Invoices
            </Text>
            <Text style={[styles.switchSubtitle, { color: appTheme.colors.textSecondary }]}>
              Automatically create invoices from deliveries
            </Text>
          </View>
        </View>
        <Switch
          value={autoGenerateInvoices}
          onValueChange={setAutoGenerateInvoices}
          trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E9E9EA"
        />
      </View>
    </View>
  );

  const renderTimePicker = () => {
    if (!showTimePicker || !timePickerConfig) return null;

    const { type } = timePickerConfig;
    const title = type === 'open' ? 'Select Opening Time' : 'Select Closing Time';

    if (Platform.OS === 'ios') {
      return (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={cancelTimeSelection}
        >
          <View style={styles.timePickerModalOverlay}>
            <TouchableOpacity 
              style={styles.timePickerModalBackdrop}
              activeOpacity={1}
              onPress={cancelTimeSelection}
            />
            <View style={[styles.timePickerModalContent, { backgroundColor: appTheme.colors.background }]}>
              <Text style={[styles.timePickerTitle, { color: appTheme.colors.text }]}>{title}</Text>
              <View style={styles.timePickerSpinnerContainer}>
                <DateTimePicker
                  value={tempSelectedTime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  is24Hour={true}
                  minuteInterval={15}
                  style={styles.iosTimePicker}
                />
              </View>
              <View style={styles.timePickerButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.timePickerButton, { backgroundColor: appTheme.colors.primary }]}
                  onPress={confirmTimeSelection}
                >
                  <Text style={[styles.timePickerDoneButtonText, { color: appTheme.colors.textInverse }]}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.timePickerButton, styles.timePickerCancelButton]}
                  onPress={cancelTimeSelection}
                >
                  <Text style={[styles.timePickerCancelButtonText, { color: appTheme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    // Android - shows native picker directly
    return (
      <DateTimePicker
        value={tempSelectedTime}
        mode="time"
        display="default"
        onChange={handleTimeChange}
        is24Hour={true}
      />
    );
  };

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          styles.saveButton,
          {
            backgroundColor: hasChanges ? '#22C55E' : appTheme.colors.buttonBackgroundDisabled,
          },
        ]}
        onPress={handleSave}
        disabled={!hasChanges}
      >
        <Text
          style={[
            styles.saveButtonText,
            { color: hasChanges ? '#FFFFFF' : appTheme.colors.textMuted },
          ]}
        >
          Save Changes
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.actionButton,
          styles.cancelButton,
          {
            backgroundColor: '#FFFFFF',
          },
        ]}
        onPress={handleCancel}
      >
        <Text style={[styles.cancelButtonText, { color: '#000000' }]}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title="Edit Business Profile"
        leftAction={{ icon: 'chevron-left', onPress: handleCancel }}
        rightActions={hasChanges ? [{ icon: 'save', onPress: handleSave }] : []}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderCoverSection()}
        {renderProfileSection()}
        {renderUpgradeSection()}
        {renderBasicSection()}
        {renderContactSection()}
        {renderBusinessHoursSection()}
        {renderInvoiceSettingsSection()}
        {renderActionButtons()}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Time Picker */}
      {renderTimePicker()}

      {/* Business Type Modal */}
      <AppBottomSheet
        visible={showBusinessTypeModal}
        onClose={() => setShowBusinessTypeModal(false)}
        title="Select Business Type"
      >
        <ScrollView style={{ maxHeight: 300 }}>
          {businessTypes.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.bottomSheetItem,
                { borderBottomColor: appTheme.colors.borderColor },
                businessType === item.id && { backgroundColor: `${appTheme.colors.primary}15` }
              ]}
              onPress={() => {
                setBusinessType(item.id);
                setShowBusinessTypeModal(false);
              }}
            >
              <Text style={[
                styles.bottomSheetItemText,
                { color: businessType === item.id ? appTheme.colors.primary : appTheme.colors.text }
              ]}>
                {item.title}
              </Text>
              {businessType === item.id && (
                <Icon name="check" size={20} color={appTheme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AppBottomSheet>

      {/* Country Code Modal */}
      <AppBottomSheet
        visible={showCountryCodeModal}
        onClose={() => setShowCountryCodeModal(false)}
        title="Select Country Code"
      >
        <ScrollView style={{ maxHeight: 400 }}>
          {countryCodes.map((cc) => (
            <TouchableOpacity
              key={cc.code}
              style={[
                styles.bottomSheetItem,
                { borderBottomColor: appTheme.colors.borderColor },
                countryCode === cc.code && { backgroundColor: `${appTheme.colors.primary}15` }
              ]}
              onPress={() => {
                setCountryCode(cc.code);
                setShowCountryCodeModal(false);
              }}
            >
              <Text style={[
                styles.bottomSheetItemText,
                { color: countryCode === cc.code ? appTheme.colors.primary : appTheme.colors.text }
              ]}>
                {`${cc.flag} ${cc.country} ${cc.code}`}
              </Text>
              {countryCode === cc.code && (
                <Icon name="check" size={20} color={appTheme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AppBottomSheet>

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
        title="Success"
        message="Business profile updated successfully!"
        footer={
          <AppButton
            title="OK"
            onPress={() => {
              setShowSuccessDialog(false);
              navigation.goBack();
            }}
            variant="confirm"
            style={{ width: '100%' }}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  coverSection: {
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  coverImageWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    borderRadius: 8,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePictureText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 8,
  },
  upgradeSection: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  upgradeButton: {
    marginVertical: 0,
  },
  section: {
    paddingHorizontal: 12,
    paddingTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 20,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 8,
    marginLeft: 8,
  },
  infoInput: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 40,
  },
  aboutInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  dropdownInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    marginLeft: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
  },
  flagText: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  phoneNumberInput: {
    flex: 1,
  },
  hourRow: {
    paddingBottom: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
  },
  hourDay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
  },
  dayRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closedText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  timeContainer: {
    marginTop: 16,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  timeButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DAD3D1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  timeSeperator: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  removeTimeSlotButton: {
    padding: 4,
    marginLeft: 8,
  },
  addTimeSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  addTimeSlotText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Switch item styles (for Invoice Settings)
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  switchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  switchSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  // Time Picker Modal styles
  timePickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  timePickerModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timePickerModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  timePickerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  timePickerSpinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosTimePicker: {
    height: 200,
    width: '100%',
  },
  timePickerButtonsContainer: {
    marginTop: 16,
  },
  timePickerButton: {
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerDoneButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  timePickerCancelButton: {
    backgroundColor: '#FFFFFF',
  },
  timePickerCancelButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  actionButtonsContainer: {
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 0,
  },
  actionButton: {
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    // Background color set dynamically
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  cancelButton: {
    // Background color set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Bottom sheet item styles
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  bottomSheetItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
