import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import Avatar from '@/shared/components/ui/Avatar';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { getExperiences, updateExperience, deleteExperience } from '@/features/profile/services/profile.service';
import type { WorkExperience } from '@/shared/types/profile';

type RouteParams = {
  EditWorkExperience: {
    experienceId: string;
  };
};

export default function EditWorkExperienceScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'EditWorkExperience'>>();
  const { experienceId } = route.params;
  const { theme: appTheme } = useTheme();

  const currentUserId = useProfileStore((state) => state.currentUser?.id);
  const removeUserBusiness = useProfileStore((state) => state.removeUserBusiness);

  // Find the experience (loaded from API)
  const [experience, setExperience] = useState<WorkExperience | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrentRole, setIsCurrentRole] = useState(false);

  // Original values for comparison
  const originalRef = useRef<Record<string, any>>({});

  // Fetch experience from API
  useEffect(() => {
    (async () => {
      if (!currentUserId) return;
      try {
        const items = await getExperiences(currentUserId);
        const item = items.find((e) => e.id === experienceId);
        if (item) {
          setExperience(item);
          setRole(item.position || '');
          setDescription(item.description || '');
          setIndustry(item.industry || '');
          setLocation(item.location || '');
          setStartDate(item.startDate || '');
          setEndDate(item.endDate || '');
          setIsCurrentRole(item.isCurrent);
          originalRef.current = {
            role: item.position || '',
            description: item.description || '',
            industry: item.industry || '',
            location: item.location || '',
            startDate: item.startDate || '',
            endDate: item.endDate || '',
            isCurrentRole: item.isCurrent,
          };
        }
      } catch {
        // Will show "not found" state
      } finally {
        setIsLoading(false);
      }
    })();
  }, [currentUserId, experienceId]);

  // UI state
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  // Check for changes
  useEffect(() => {
    const original = originalRef.current;
    const changed =
      role !== original.role ||
      description !== original.description ||
      industry !== original.industry ||
      location !== original.location ||
      startDate !== original.startDate ||
      endDate !== original.endDate ||
      isCurrentRole !== original.isCurrentRole;
    setHasChanges(changed);
  }, [role, description, industry, location, startDate, endDate, isCurrentRole]);

  const handleSave = async () => {
    setIsRemoving(false);
    try {
      await updateExperience(experienceId, {
        position: role.trim(),
        description: description.trim() || undefined,
        industry: industry.trim() || undefined,
        location: location.trim() || undefined,
        startDate: startDate.trim() || undefined,
        endDate: isCurrentRole ? undefined : endDate.trim() || undefined,
        isCurrent: isCurrentRole,
      });
      setSuccessMessage('Work experience updated successfully!');
      setShowSuccessDialog(true);
    } catch (error: any) {
      AppAlert.alert('Error', error?.message || 'Failed to update experience');
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsRemoving(true);
    try {
      await deleteExperience(experienceId);
      setShowDeleteDialog(false);
      navigation.goBack();
    } catch (error: any) {
      setIsRemoving(false);
      const msg = error?.message || 'Failed to remove experience. Please try again.';
      AppAlert.alert('Error', msg);
    }
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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Edit Experience" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: appTheme.colors.textMuted }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              userId={experience.id}
              userName={experience.companyName}
              imageUri={experience.companyLogo}
              size={64}
            />
            <Text style={[styles.companyName, { color: appTheme.colors.text }]}>
              {experience.companyName}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textSecondary }]}>Role / Position</Text>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: '#FFFFFF',
                  },
                ]}
                value={role}
                onChangeText={setRole}
                placeholder="Enter your role"
                placeholderTextColor={appTheme.colors.textMuted}
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textSecondary }]}>Start Date</Text>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: '#FFFFFF',
                  },
                ]}
                value={startDate ? formatExperienceDate(startDate) : ''}
                onChangeText={setStartDate}
                placeholder="e.g., Jan 2020"
                placeholderTextColor={appTheme.colors.textMuted}
              />
            </View>

            <View style={styles.infoItem}>
              <View style={styles.labelRow}>
                <Text style={[styles.infoLabel, styles.labelNoMargin, { color: appTheme.colors.textSecondary }]}>End Date</Text>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setIsCurrentRole(!isCurrentRole)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: appTheme.colors.borderColor,
                        backgroundColor: isCurrentRole ? appTheme.colors.success : 'transparent',
                      },
                    ]}
                  >
                    {isCurrentRole && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: appTheme.colors.textSecondary }]}>
                    I currently work here
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.infoInput,
                  {
                    color: appTheme.colors.text,
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: isCurrentRole
                      ? appTheme.colors.buttonBackgroundDisabled
                      : '#FFFFFF',
                  },
                ]}
                value={isCurrentRole ? 'Present' : (endDate ? formatExperienceDate(endDate) : '')}
                onChangeText={setEndDate}
                placeholder="e.g., Dec 2023"
                placeholderTextColor={appTheme.colors.textMuted}
                editable={!isCurrentRole}
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons - Fixed at bottom */}
        <View style={styles.bottomContainer}>
          <View style={styles.actionButtonsContainer}>
            <AppButton
              title="Save Changes"
              onPress={handleSave}
              variant="confirm"
              fullWidth
              disabled={!hasChanges}
            />
            {/* Leave / Remove Button */}
            <AppButton
              title={isCurrentRole ? 'Leave Company' : 'Remove Experience'}
              onPress={handleDelete}
              variant="destructive"
              fullWidth
              iconLeft="trash-outline"
            />
            <AppButton
              title="Cancel"
              onPress={handleCancel}
              variant="secondary"
              fullWidth
            />
          </View>
        </View>
      </View>

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
        variant="success"
        title="Success"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => {
          setShowSuccessDialog(false);
          navigation.goBack();
        }}
      />

      {/* Leave / Remove Confirmation Dialog */}
      <AppModal
        visible={showDeleteDialog}
        onClose={() => !isRemoving && setShowDeleteDialog(false)}
        variant="delete"
        title={isCurrentRole ? 'Leave Company' : 'Remove Experience'}
        message={
          isCurrentRole
            ? `Are you sure you want to remove ${experience?.companyName || 'this company'} from your profile?`
            : 'Are you sure you want to remove this work experience?'
        }
        primaryButtonText={isCurrentRole ? 'Leave' : 'Remove'}
        onPrimaryAction={confirmDelete}
        primaryButtonLoading={isRemoving}
        secondaryButtonText="Cancel"
        onSecondaryAction={() => setShowDeleteDialog(false)}
        secondaryButtonDisabled={isRemoving}
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
    gap: 8,
  },
});
