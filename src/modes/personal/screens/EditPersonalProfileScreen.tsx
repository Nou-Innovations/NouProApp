import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import Avatar from '@/shared/components/ui/Avatar';
import { AppModal, SectionTitle, AppButton } from '@/shared/components/ui';
import AppTextField from '@/shared/components/ui/AppTextField';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import ImageUploadField from '@/shared/components/ui/ImageUploadField';
import { imageService } from '@/shared/services/imageService';
import { patch as apiPatch, authAPI } from '@/shared/services/api';
import { LogOut, Trash2 } from 'lucide-react-native';

export default function EditPersonalProfileScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();

  // Profile store
  const currentUser = useProfileStore((state) => state.currentUser);
  const updateCurrentUser = useProfileStore((state) => state.updateCurrentUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);

  // Store original values for comparison
  const originalInfoRef = useRef({
    firstName: currentUser?.name?.split(' ')[0] || '',
    surname: currentUser?.name?.split(' ').slice(1).join(' ') || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    job_title: currentUser?.job_title || '',
    description: currentUser?.description || '',
    address: currentUser?.address || '',
    show_phone_publicly: currentUser?.privacy_settings?.show_phone_publicly ?? false,
    show_email_publicly: currentUser?.privacy_settings?.show_email_publicly ?? false,
    show_address_publicly: currentUser?.privacy_settings?.show_address_publicly ?? false,
    headline: currentUser?.headline || '',
    bio: currentUser?.bio || '',
    industry: currentUser?.industry || '',
    profile_slug: currentUser?.profile_slug || '',
  });

  // Personal information state
  const [personalInfo, setPersonalInfo] = useState({
    firstName: currentUser?.name?.split(' ')[0] || '',
    surname: currentUser?.name?.split(' ').slice(1).join(' ') || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    job_title: currentUser?.job_title || '',
    description: currentUser?.description || '',
    address: currentUser?.address || '',
    show_phone_publicly: currentUser?.privacy_settings?.show_phone_publicly ?? false,
    show_email_publicly: currentUser?.privacy_settings?.show_email_publicly ?? false,
    show_address_publicly: currentUser?.privacy_settings?.show_address_publicly ?? false,
    headline: currentUser?.headline || '',
    bio: currentUser?.bio || '',
    industry: currentUser?.industry || '',
    profile_slug: currentUser?.profile_slug || '',
  });

  // Work experience visibility toggles
  const [workplaceVisibility, setWorkplaceVisibility] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    userBusinesses.forEach(ub => {
      initial[ub.business.id] = true;
    });
    return initial;
  });

  // Track states
  const [hasChanges, setHasChanges] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAreYouSureDialog, setShowAreYouSureDialog] = useState(false);

  // Ref guard to prevent infinite loop in beforeRemove listener
  const isNavigatingAwayRef = useRef(false);

  // Update original info when currentUser changes
  useEffect(() => {
    if (currentUser) {
      const newOriginal = {
        firstName: currentUser.name?.split(' ')[0] || '',
        surname: currentUser.name?.split(' ').slice(1).join(' ') || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        job_title: currentUser.job_title || '',
        description: currentUser.description || '',
        address: currentUser.address || '',
        show_phone_publicly: currentUser.privacy_settings?.show_phone_publicly ?? false,
        show_email_publicly: currentUser.privacy_settings?.show_email_publicly ?? false,
        show_address_publicly: currentUser.privacy_settings?.show_address_publicly ?? false,
        headline: currentUser.headline || '',
        bio: currentUser.bio || '',
        industry: currentUser.industry || '',
        profile_slug: currentUser.profile_slug || '',
      };
      originalInfoRef.current = newOriginal;
      setPersonalInfo(newOriginal);
    }
  }, [currentUser?.id]);

  // Check for changes whenever personalInfo changes
  useEffect(() => {
    const original = originalInfoRef.current;
    const changed =
      personalInfo.firstName !== original.firstName ||
      personalInfo.surname !== original.surname ||
      personalInfo.email !== original.email ||
      personalInfo.phone !== original.phone ||
      personalInfo.job_title !== original.job_title ||
      personalInfo.description !== original.description ||
      personalInfo.address !== original.address ||
      personalInfo.show_phone_publicly !== original.show_phone_publicly ||
      personalInfo.show_email_publicly !== original.show_email_publicly ||
      personalInfo.show_address_publicly !== original.show_address_publicly ||
      personalInfo.headline !== original.headline ||
      personalInfo.bio !== original.bio ||
      personalInfo.industry !== original.industry ||
      personalInfo.profile_slug !== original.profile_slug;
    setHasChanges(changed);
  }, [personalInfo]);

  // Warn on unsaved changes when navigating away (back swipe, hardware back, header back)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!hasChanges || isNavigatingAwayRef.current) return;

      e.preventDefault();
      AppAlert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              isNavigatingAwayRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, hasChanges]);

  const updateField = useCallback((field: string, value: string | boolean) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSavePersonalInfo = async () => {
    if (isSaving) return;

    // Validation
    if (!personalInfo.firstName.trim()) {
      AppAlert.alert('Required', 'First name is required.');
      return;
    }
    if (personalInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) {
      AppAlert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    const fullName = `${personalInfo.firstName} ${personalInfo.surname}`.trim();

    setIsSaving(true);
    try {
      await apiPatch('/auth/me', {
        name: fullName,
        email: personalInfo.email || null,
        phone: personalInfo.phone || null,
        jobTitle: personalInfo.job_title || null,
        description: personalInfo.description || null,
        address: personalInfo.address || null,
        privacySettings: {
          show_phone_publicly: personalInfo.show_phone_publicly,
          show_email_publicly: personalInfo.show_email_publicly,
          show_address_publicly: personalInfo.show_address_publicly,
        },
        headline: personalInfo.headline || null,
        bio: personalInfo.bio || null,
        industry: personalInfo.industry || null,
        profileSlug: personalInfo.profile_slug || null,
      });

      updateCurrentUser({
        name: fullName,
        email: personalInfo.email,
        phone: personalInfo.phone,
        job_title: personalInfo.job_title,
        description: personalInfo.description,
        address: personalInfo.address,
        privacy_settings: {
          show_phone_publicly: personalInfo.show_phone_publicly,
          show_email_publicly: personalInfo.show_email_publicly,
          show_address_publicly: personalInfo.show_address_publicly,
        },
        headline: personalInfo.headline,
        bio: personalInfo.bio,
        industry: personalInfo.industry,
        profile_slug: personalInfo.profile_slug,
      });

      originalInfoRef.current = { ...personalInfo };
      setHasChanges(false);
      setSuccessMessage('Personal information updated successfully!');
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Save profile error:', error);
      AppAlert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSelected = async (imageUri: string) => {
    setIsUploadingAvatar(true);
    try {
      const uploadResult = await imageService.uploadProfilePicture({
        userId: currentUser?.id || '1',
        imageUri,
        imageType: 'profile',
      });

      if (uploadResult.success && uploadResult.imageUri) {
        updateCurrentUser({ avatar_url: uploadResult.imageUri });

        try {
          await apiPatch('/auth/me', { avatar: uploadResult.imageUri });
        } catch (syncError) {
          console.error('Profile pic sync error:', syncError);
          AppAlert.alert(
            'Warning',
            'Profile picture updated locally but failed to sync with server.'
          );
        }
      } else {
        AppAlert.alert('Error', 'Failed to upload profile picture. Please try again.');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      AppAlert.alert('Error', 'An error occurred while uploading the photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Format date for experience
  const formatExperienceDate = (dateString?: string) => {
    if (!dateString) return 'Present';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleAddWorkExperience = () => {
    // @ts-ignore
    navigation.navigate('AddWorkExperience');
  };

  const handleEditWorkExperience = (businessId: string) => {
    // @ts-ignore
    navigation.navigate('EditWorkExperience', { businessId });
  };

  const toggleWorkplaceVisibility = (businessId: string) => {
    setWorkplaceVisibility(prev => ({
      ...prev,
      [businessId]: !prev[businessId],
    }));
  };

  const renderPrivacyToggle = (
    label: string,
    value: boolean,
    onValueChange: (val: boolean) => void,
  ) => (
    <View style={styles.privacyToggleRow}>
      <Text style={[
        styles.privacyToggleText,
        {
          color: value ? appTheme.colors.text : appTheme.colors.textSecondary,
          fontFamily: value ? theme.fonts.primary.medium : theme.fonts.primary.regular,
        }
      ]}>
        {label}
      </Text>
      <Switch
        trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.switchTrackOn }}
        thumbColor={appTheme.colors.switchThumb}
        ios_backgroundColor={appTheme.colors.switchTrackOff}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <ImageUploadField
        imageUri={currentUser?.avatar_url}
        onImageSelected={handleAvatarSelected}
        placeholder="Add Profile picture"
        changeText="Change picture"
        size={200}
        isLoading={isUploadingAvatar}
      />
    </View>
  );

  const renderBasicSection = () => (
    <View style={styles.section}>
      <SectionTitle style={styles.sectionTitle}>
        Basic
      </SectionTitle>

      <AppTextField
        label="First Name"
        value={personalInfo.firstName}
        onChangeText={(text) => updateField('firstName', text)}
        placeholder="Enter your first name"
        required
        autoComplete="given-name"
        containerStyle={styles.fieldSpacing}
      />

      <AppTextField
        label="Surname"
        value={personalInfo.surname}
        onChangeText={(text) => updateField('surname', text)}
        placeholder="Enter your surname"
        autoComplete="family-name"
        containerStyle={styles.fieldSpacing}
      />

      <AppTextField
        label="Position"
        value={personalInfo.job_title}
        onChangeText={(text) => updateField('job_title', text)}
        placeholder="Enter your position"
        containerStyle={styles.fieldSpacing}
      />

      <AppTextField
        label="Headline"
        value={personalInfo.headline}
        onChangeText={(text) => updateField('headline', text)}
        placeholder="e.g., Supply Chain Expert | B2B Operations"
        maxLength={120}
        containerStyle={styles.fieldSpacing}
      />

      <AppTextField
        label="About"
        value={personalInfo.description}
        onChangeText={(text) => updateField('description', text)}
        placeholder="Tell us about yourself"
        isMultiline
        numberOfLines={3}
        maxLength={500}
        containerStyle={styles.fieldSpacing}
      />

      <AppTextField
        label="Bio"
        value={personalInfo.bio}
        onChangeText={(text) => updateField('bio', text)}
        placeholder="Write a detailed professional bio..."
        isMultiline
        numberOfLines={5}
        maxLength={2000}
        containerStyle={styles.fieldSpacing}
      />

      <AppTextField
        label="Industry"
        value={personalInfo.industry}
        onChangeText={(text) => updateField('industry', text)}
        placeholder="e.g., Food & Beverage, Retail"
        containerStyle={styles.fieldSpacing}
      />

      <AppTextField
        label="Profile URL Slug"
        value={personalInfo.profile_slug}
        onChangeText={(text) => updateField('profile_slug', text.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        placeholder="e.g., arnaud-labonne"
        autoCapitalize="none"
        containerStyle={styles.fieldSpacing}
      />
    </View>
  );

  const renderPersonalInfoSection = () => (
    <View style={styles.section}>
      <SectionTitle style={styles.sectionTitle}>
        Personal Information
      </SectionTitle>

      {/* Phone Number */}
      <View style={styles.fieldSpacing}>
        <AppTextField
          label="Phone Number"
          value={personalInfo.phone}
          onChangeText={(text) => updateField('phone', text)}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        {renderPrivacyToggle(
          'Show phone number on profile',
          personalInfo.show_phone_publicly,
          (value) => updateField('show_phone_publicly', value),
        )}
      </View>

      {/* Email */}
      <View style={styles.fieldSpacing}>
        <AppTextField
          label="Email"
          value={personalInfo.email}
          onChangeText={(text) => updateField('email', text)}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />
        {renderPrivacyToggle(
          'Show email address on profile',
          personalInfo.show_email_publicly,
          (value) => updateField('show_email_publicly', value),
        )}
      </View>

      {/* Address */}
      <View style={styles.fieldSpacing}>
        <AppTextField
          label="Address"
          value={personalInfo.address}
          onChangeText={(text) => updateField('address', text)}
          placeholder="Enter your address"
          autoComplete="street-address"
        />
        {renderPrivacyToggle(
          'Show address on profile',
          personalInfo.show_address_publicly,
          (value) => updateField('show_address_publicly', value),
        )}
      </View>
    </View>
  );

  const renderWorkExperiencesSection = () => (
    <View style={styles.section}>
      <SectionTitle style={styles.sectionTitle}>
        Work Experiences
      </SectionTitle>

      {userBusinesses.length === 0 ? (
        <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
          No work experiences added yet
        </Text>
      ) : (
        userBusinesses.map((ub, index) => (
          <View
            key={ub.business.id}
            style={[
              styles.experienceCardWrapper,
              index !== userBusinesses.length - 1 && { marginBottom: 12 },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.experienceCard,
                { backgroundColor: appTheme.colors.surface },
              ]}
              onPress={() => handleEditWorkExperience(ub.business.id)}
              activeOpacity={0.7}
            >
              <Avatar
                userId={ub.business.id}
                userName={ub.business.name}
                imageUri={ub.business.logo_url}
                size={48}
              />
              <View style={styles.experienceInfo}>
                <Text style={[styles.experienceName, { color: appTheme.colors.text }]}>
                  {ub.business.name}
                </Text>
                <Text style={[styles.experienceRole, { color: appTheme.colors.textSecondary }]}>
                  {getRoleDisplayName(ub.role)}
                </Text>
                <Text style={[styles.experienceDate, { color: appTheme.colors.textMuted }]}>
                  {formatExperienceDate(ub.start_date)} - {formatExperienceDate(ub.end_date)}
                </Text>
              </View>
              <Icon
                name="chevron-forward"
                size={20}
                color={appTheme.colors.iconMuted}
              />
            </TouchableOpacity>
            <View style={styles.workplaceToggleRow}>
              <Text style={[
                styles.workplaceToggleText,
                {
                  color: (workplaceVisibility[ub.business.id] ?? true) ? appTheme.colors.text : appTheme.colors.textSecondary,
                  fontFamily: (workplaceVisibility[ub.business.id] ?? true) ? theme.fonts.primary.medium : theme.fonts.primary.regular,
                }
              ]}>
                Show this workplace on profile
              </Text>
              <Switch
                trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.switchTrackOn }}
                thumbColor={appTheme.colors.switchThumb}
                ios_backgroundColor={appTheme.colors.switchTrackOff}
                onValueChange={() => toggleWorkplaceVisibility(ub.business.id)}
                value={workplaceVisibility[ub.business.id] ?? true}
              />
            </View>
          </View>
        ))
      )}

      <TouchableOpacity
        style={[styles.addMoreButton, { borderColor: appTheme.colors.borderColor }]}
        onPress={handleAddWorkExperience}
      >
        <Icon name="add" size={20} color={appTheme.colors.primary} />
        <Text style={[styles.addMoreText, { color: appTheme.colors.primary }]}>
          Add More
        </Text>
      </TouchableOpacity>
    </View>
  );

  const handleLogout = () => {
    AppAlert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            authAPI.logout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    setShowAreYouSureDialog(true);
  };

  const handleConfirmAreYouSure = () => {
    setShowAreYouSureDialog(false);
    setShowDeleteDialog(true);
  };

  const confirmDeleteAccount = () => {
    setShowDeleteDialog(false);
    AppAlert.alert('Delete Account', 'Account deletion process started...');
  };

  const renderAccountSection = () => (
    <View style={styles.section}>
      <SectionTitle style={styles.sectionTitle}>
        Account
      </SectionTitle>

      <TouchableOpacity
        style={[styles.accountOption, { borderBottomColor: appTheme.colors.borderColor }]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <View style={styles.accountOptionLeft}>
          <LogOut size={24} color={appTheme.colors.error} strokeWidth={2} />
          <Text style={[styles.accountOptionText, { color: appTheme.colors.error }]}>Log out</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.accountOption, { borderBottomColor: appTheme.colors.borderColor }]}
        onPress={handleDeleteAccount}
        activeOpacity={0.7}
      >
        <View style={styles.accountOptionLeft}>
          <Trash2 size={24} color={appTheme.colors.error} strokeWidth={2} />
          <Text style={[styles.accountOptionText, { color: appTheme.colors.error }]}>Delete account</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <AppButton
        title="Save Changes"
        onPress={handleSavePersonalInfo}
        variant="confirm"
        fullWidth
        loading={isSaving}
        disabled={!hasChanges || isSaving}
      />
      <AppButton
        title="Cancel"
        onPress={() => navigation.goBack()}
        variant="secondary"
        fullWidth
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title="Edit Profile"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={hasChanges && !isSaving ? [{ icon: 'save', onPress: handleSavePersonalInfo }] : []}
      />
      <KeyboardAwareScreen
        style={styles.scrollView}
        keyboardDismissMode="interactive"
      >
          {renderProfileHeader()}
          {renderBasicSection()}
          {renderPersonalInfoSection()}
          {renderWorkExperiencesSection()}
          {renderAccountSection()}
          {renderActionButtons()}
          <View style={{ height: 40 }} />
      </KeyboardAwareScreen>

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

      {/* Are You Sure Dialog */}
      <AppModal
        visible={showAreYouSureDialog}
        onClose={() => setShowAreYouSureDialog(false)}
        variant="confirm"
        title="Are you sure?"
        message="You are about to delete your account. This action is irreversible."
        primaryButtonText="Yes, I'm sure"
        onPrimaryAction={handleConfirmAreYouSure}
        secondaryButtonText="No"
        onSecondaryAction={() => setShowAreYouSureDialog(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AppModal
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        variant="delete"
        title="Delete Account?"
        message="This action cannot be undone. All your data will be permanently deleted."
        primaryButtonText="Delete"
        onPrimaryAction={confirmDeleteAccount}
        secondaryButtonText="Cancel"
        onSecondaryAction={() => setShowDeleteDialog(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  section: {
    paddingHorizontal: 12,
    paddingTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 20,
  },
  fieldSpacing: {
    marginBottom: 16,
  },
  privacyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  privacyToggleText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    paddingVertical: 16,
  },
  experienceCardWrapper: {
    // Wrapper for card + toggle
  },
  experienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  experienceInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  experienceName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  experienceRole: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 2,
  },
  experienceDate: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  workplaceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  workplaceToggleText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    flex: 1,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 12,
  },
  addMoreText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginLeft: 8,
  },
  actionButtonsContainer: {
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
  },
  accountOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountOptionText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginLeft: theme.spacing.md,
  },
});
