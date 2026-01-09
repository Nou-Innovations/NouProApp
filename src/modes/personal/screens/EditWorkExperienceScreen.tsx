import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import Avatar from '@/shared/components/ui/Avatar';
import { ConfirmationDialog } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';

type RouteParams = {
  EditWorkExperience: {
    businessId: string;
  };
};

export default function EditWorkExperienceScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'EditWorkExperience'>>();
  const { businessId } = route.params;
  const { theme: appTheme } = useTheme();
  
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const removeUserBusiness = useProfileStore((state) => state.removeUserBusiness);

  // Find the business experience
  const experience = userBusinesses.find((ub) => ub.business.id === businessId);

  // Form state
  const [role, setRole] = useState(getRoleDisplayName(experience?.role || null));
  const [startDate, setStartDate] = useState(experience?.start_date || '');
  const [endDate, setEndDate] = useState(experience?.end_date || '');
  const [isCurrentRole, setIsCurrentRole] = useState(!experience?.end_date);

  // Original values for comparison
  const originalRef = useRef({
    role: getRoleDisplayName(experience?.role || null),
    startDate: experience?.start_date || '',
    endDate: experience?.end_date || '',
    isCurrentRole: !experience?.end_date,
  });

  // UI state
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check for changes
  useEffect(() => {
    const original = originalRef.current;
    const changed =
      role !== original.role ||
      startDate !== original.startDate ||
      endDate !== original.endDate ||
      isCurrentRole !== original.isCurrentRole;
    setHasChanges(changed);
  }, [role, startDate, endDate, isCurrentRole]);

  const handleSave = () => {
    // In a real app, this would update the backend
    // For now, we'll just show a success message
    setSuccessMessage('Work experience updated successfully!');
    setShowSuccessDialog(true);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    removeUserBusiness(businessId);
    setShowDeleteDialog(false);
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  // Format date for display
  const formatExperienceDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (!experience) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: appTheme.colors.background }]}
        edges={['top']}
      >
        <SecondaryHeader
          title="Edit Experience"
          leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: appTheme.colors.textMuted }]}>
            Experience not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title="Edit Experience"
        leftAction={{ icon: 'chevron-left', onPress: handleCancel }}
        rightActions={hasChanges ? [{ icon: 'save', onPress: handleSave }] : []}
      />
      <View style={styles.keyboardView}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Company Card */}
          <View style={styles.companyCard}>
            <Avatar
              userId={experience.business.id}
              userName={experience.business.name}
              imageUri={experience.business.logo_url}
              size={64}
            />
            <Text style={[styles.companyName, { color: appTheme.colors.text }]}>
              {experience.business.name}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Role / Position</Text>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: '#DAD3D1',
                    backgroundColor: '#FFFFFF',
                  },
                ]}
                value={role}
                onChangeText={setRole}
                placeholder="Enter your role"
                placeholderTextColor="#777777"
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Start Date</Text>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: '#DAD3D1',
                    backgroundColor: '#FFFFFF',
                  },
                ]}
                value={startDate ? formatExperienceDate(startDate) : ''}
                onChangeText={setStartDate}
                placeholder="e.g., Jan 2020"
                placeholderTextColor="#777777"
              />
            </View>

            <View style={styles.infoItem}>
              <View style={styles.labelRow}>
                <Text style={[styles.infoLabel, styles.labelNoMargin, { color: '#777777' }]}>End Date</Text>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setIsCurrentRole(!isCurrentRole)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: '#DAD3D1',
                        backgroundColor: isCurrentRole ? '#22C55E' : 'transparent',
                      },
                    ]}
                  >
                    {isCurrentRole && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: '#777777' }]}>
                    I currently work here
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: '#DAD3D1',
                    backgroundColor: isCurrentRole
                      ? appTheme.colors.buttonBackgroundDisabled
                      : '#FFFFFF',
                  },
                ]}
                value={isCurrentRole ? 'Present' : (endDate ? formatExperienceDate(endDate) : '')}
                onChangeText={setEndDate}
                placeholder="e.g., Dec 2023"
                placeholderTextColor="#777777"
                editable={!isCurrentRole}
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons - Fixed at bottom */}
        <View style={styles.bottomContainer}>
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
            {/* Remove Experience Button */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Icon name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Remove Experience</Text>
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
        </View>
      </View>

      {/* Success Dialog */}
      <ConfirmationDialog
        visible={showSuccessDialog}
        variant="success"
        title="Success"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
        onClose={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        variant="delete"
        title="Remove Experience"
        message="Are you sure you want to remove this work experience?"
        primaryButtonText="Remove"
        secondaryButtonText="Cancel"
        onPrimaryAction={confirmDelete}
        onSecondaryAction={() => setShowDeleteDialog(false)}
        onClose={() => setShowDeleteDialog(false)}
      />
    </SafeAreaView>
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
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  companyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  companyName: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 12,
  },
  section: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  infoItem: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 8,
    marginLeft: 8,
  },
  labelNoMargin: {
    marginBottom: 0,
    marginLeft: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
  },
  infoInput: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
  },
  bottomContainer: {
    paddingBottom: 32,
  },
  actionButtonsContainer: {
    paddingHorizontal: 12,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    color: '#EF4444',
    marginLeft: 8,
  },
});
