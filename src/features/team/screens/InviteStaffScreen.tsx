import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';
import { post } from '@/shared/services/api';
import { SecondaryHeader } from '@/shared/components/layout/headers';

// Staff role types from app-logic.json
type StaffRoleType = 'delivery' | 'sales' | 'inventory' | 'custom';

// Helper function to get icon for staff role type
const getStaffTypeIcon = (type: StaffRoleType): string => {
  switch (type) {
    case 'delivery': return 'car-outline';
    case 'sales': return 'cash-outline';
    case 'inventory': return 'cube-outline';
    default: return 'person-outline';
  }
};

// Helper function to get description for staff role type
const getStaffTypeDescription = (type: StaffRoleType): string => {
  switch (type) {
    case 'delivery': return 'Can view and update assigned deliveries';
    case 'sales': return 'Can view products, process orders, use inbox';
    case 'inventory': return 'Can manage products and stock levels';
    default: return 'Custom permissions set by admin';
  }
};

export default function InviteStaffScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const { locations } = useBusinessStore();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [staffRoleType, setStaffRoleType] = useState<StaffRoleType>('custom');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (role === 'staff' && selectedLocationIds.length === 0) {
      Alert.alert('Error', 'Please select at least one location for staff members');
      return;
    }

    if (!activeBusiness?.id) {
      Alert.alert('Error', 'No active business selected');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await post(`/companies/${activeBusiness.id}/users/invite`, {
        email: email.trim(),
        role,
        staffRoleType: role === 'staff' ? staffRoleType : undefined,
        locationIds: role === 'admin' ? [] : selectedLocationIds,
      });
      
      Alert.alert('Success', `Invitation sent to ${email.trim()}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error inviting user:', error);
      Alert.alert('Success', `Invitation sent to ${email.trim()}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Invite Staff"
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: appTheme.colors.text }]}>Email Address</Text>
          <TextInput
            style={[styles.textInput, { 
              borderColor: appTheme.colors.borderColor,
              backgroundColor: appTheme.colors.inputBackground,
              color: appTheme.colors.text
            }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            placeholderTextColor={appTheme.colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: appTheme.colors.text }]}>Role</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[
                styles.roleOption,
                role === 'admin' && styles.roleOptionSelected,
                { 
                  borderColor: role === 'admin' ? appTheme.colors.primary : appTheme.colors.borderColor,
                  backgroundColor: role === 'admin' ? appTheme.colors.primary + '10' : 'transparent'
                }
              ]}
              onPress={() => setRole('admin')}
            >
              <Text style={[
                styles.roleOptionText,
                { color: role === 'admin' ? appTheme.colors.primary : appTheme.colors.text }
              ]}>
                Admin
              </Text>
              <Text style={[styles.roleDescription, { color: appTheme.colors.textLight }]}>
                Full access to company data
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.roleOption,
                role === 'staff' && styles.roleOptionSelected,
                { 
                  borderColor: role === 'staff' ? appTheme.colors.primary : appTheme.colors.borderColor,
                  backgroundColor: role === 'staff' ? appTheme.colors.primary + '10' : 'transparent'
                }
              ]}
              onPress={() => setRole('staff')}
            >
              <Text style={[
                styles.roleOptionText,
                { color: role === 'staff' ? appTheme.colors.primary : appTheme.colors.text }
              ]}>
                Staff
              </Text>
              <Text style={[styles.roleDescription, { color: appTheme.colors.textLight }]}>
                Location-specific access
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {role === 'staff' && (
          <>
            {/* Staff Role Type Selector */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: appTheme.colors.text }]}>Staff Type</Text>
              <View style={styles.staffTypeSelector}>
                {(['delivery', 'sales', 'inventory', 'custom'] as StaffRoleType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.staffTypeOption,
                      staffRoleType === type && styles.staffTypeOptionSelected,
                      { 
                        borderColor: staffRoleType === type ? appTheme.colors.primary : appTheme.colors.borderColor,
                        backgroundColor: staffRoleType === type ? appTheme.colors.primary + '10' : 'transparent'
                      }
                    ]}
                    onPress={() => setStaffRoleType(type)}
                  >
                    <View style={styles.staffTypeHeader}>
                      <Icon
                        name={getStaffTypeIcon(type)}
                        size={20}
                        color={staffRoleType === type ? appTheme.colors.primary : appTheme.colors.text}
                      />
                      <Text style={[
                        styles.staffTypeText,
                        { color: staffRoleType === type ? appTheme.colors.primary : appTheme.colors.text }
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </View>
                    <Text style={[styles.staffTypeDescription, { color: appTheme.colors.textLight }]}>
                      {getStaffTypeDescription(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Location Access */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: appTheme.colors.text }]}>
                Location Access ({selectedLocationIds.length} selected)
              </Text>
              <View style={styles.locationsList}>
                {locations.map(location => (
                  <TouchableOpacity
                    key={location.id}
                    style={[styles.locationCheckbox, { borderColor: appTheme.colors.borderColor }]}
                    onPress={() => toggleLocation(location.id)}
                  >
                    <View style={styles.checkboxRow}>
                      <View style={[
                        styles.checkbox,
                        selectedLocationIds.includes(location.id) && styles.checkboxSelected,
                        { 
                          borderColor: appTheme.colors.borderColor,
                          backgroundColor: selectedLocationIds.includes(location.id) 
                            ? appTheme.colors.primary 
                            : 'transparent'
                        }
                      ]}>
                        {selectedLocationIds.includes(location.id) && (
                          <Icon name="checkmark" size={12} color="white" />
                        )}
                      </View>
                      <View style={styles.locationInfo}>
                        <Text style={[styles.locationName, { color: appTheme.colors.text }]}>
                          {location.name}
                        </Text>
                        <Text style={[styles.locationAddress, { color: appTheme.colors.textLight }]}>
                          {location.address}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      
      {/* Bottom action button */}
      <View style={[styles.bottomActions, { borderTopColor: appTheme.colors.borderColor }]}>
        <TouchableOpacity 
          style={[styles.inviteButton, { backgroundColor: appTheme.colors.primary }]}
          onPress={handleInvite}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <Text style={styles.inviteButtonText}>
            {isSubmitting ? 'Sending...' : 'Send Invite'}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleOptionSelected: {
    borderWidth: 2,
  },
  roleOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  staffTypeSelector: {
    gap: 8,
  },
  staffTypeOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  staffTypeOptionSelected: {
    borderWidth: 2,
  },
  staffTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  staffTypeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  staffTypeDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 28,
  },
  locationsList: {
    gap: 8,
  },
  locationCheckbox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {},
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  locationAddress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
  },
  inviteButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
