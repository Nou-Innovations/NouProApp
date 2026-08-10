import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import Avatar from '@/shared/components/ui/Avatar';
import { AppModal, SectionTitle, AppButton } from '@/shared/components/ui';
import AppTextField from '@/shared/components/ui/AppTextField';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { KeyboardAwareScreen } from '@/shared/components/layout';
import ImageUploadField from '@/shared/components/ui/ImageUploadField';
import { imageService } from '@/shared/services/imageService';
import { patch as apiPatch, authAPI } from '@/shared/services/api';
import { getExperiences, updateExperience } from '@/features/profile/services/profile.service';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { LogOut, Trash2 } from 'lucide-react-native';

export default function EditPersonalProfileScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();

  // Profile store
  const currentUser = useProfileStore((state) => state.currentUser);
  const updateCurrentUser = useProfileStore((state) => state.updateCurrentUser);
  // The timeline is real WorkExperience rows now. It used to render `userBusinesses`
  // (company memberships), which is why entries added via "Add work experience" never
  // appeared (P-11) and why the edit screen was handed a Business id (P-3).
  const [experiences, setExperiences] = useState<any[]>([]);
  const [experiencesLoading, setExperiencesLoading] = useState(true);

  const loadExperiences = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const rows = await getExperiences(currentUser.id);
      setExperiences(rows || []);
    } catch {
      // Non-fatal: the rest of the edit form still works.
    } finally {
      setExperiencesLoading(false);
    }
  }, [currentUser?.id]);

  // Refetch on focus so adding or editing an entry is reflected on return.
  useFocusEffect(
    useCallback(() => {
      void loadExperiences();
    }, [loadExperiences]),
  );

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

  // Track states
  const [hasChanges, setHasChanges] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
        // email/phone deliberately NOT sent: they are identity, not profile. Sending
        // `|| null` here is what used to wipe an email and permanently lock the account
        // out, since login is email-only. They change via the verified flow in Security.
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

  /** Persist the visibility switch. It used to be local state that no save ever sent. */
  const handleToggleExperienceVisibility = async (experienceId: string, value: boolean) => {
    setExperiences((prev) =>
      prev.map((e) => (e.id === experienceId ? { ...e, isVisible: value } : e)),
    );
    try {
      await updateExperience(experienceId, { isVisible: value });
    } catch (err) {
      // Put it back if the server refused, rather than showing a lie.
      setExperiences((prev) =>
        prev.map((e) => (e.id === experienceId ? { ...e, isVisible: !value } : e)),
      );
      AppAlert.alert('Error', getApiErrorMessage(err, 'Could not update visibility.'));
    }
  };

  const handleEditWorkExperience = (experienceId: string) => {
    // @ts-ignore -- this screen uses an untyped useNavigation()
    navigation.navigate('EditWorkExperience', { experienceId });
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
          onChangeText={() => {}}
          disabled
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />
        <Text style={[styles.fieldHint, { color: appTheme.colors.textMuted }]}>
          Your email is how you sign in. To change it, go to Settings › Security.
        </Text>
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

      {experiencesLoading ? null : experiences.length === 0 ? (
        <Text style={[styles.emptyText, { color: appTheme.colors.textMuted }]}>
          No work experiences added yet
        </Text>
      ) : (
        experiences.map((exp, index) => (
          <View
            key={exp.id}
            style={[
              styles.experienceCardWrapper,
              index !== experiences.length - 1 && { marginBottom: 12 },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.experienceCard,
                { backgroundColor: appTheme.colors.surface },
              ]}
              onPress={() => handleEditWorkExperience(exp.id)}
              activeOpacity={0.7}
            >
              <Avatar
                userId={exp.linkedBusinessId || exp.id}
                userName={exp.linkedBusiness?.name || exp.companyName}
                imageUri={exp.linkedBusiness?.logoUrl || exp.companyLogo}
                size={48}
              />
              <View style={styles.experienceInfo}>
                <Text style={[styles.experienceName, { color: appTheme.colors.text }]}>
                  {exp.linkedBusiness?.name || exp.companyName}
                </Text>
                <Text style={[styles.experienceRole, { color: appTheme.colors.textSecondary }]}>
                  {exp.position}
                </Text>
                <Text style={[styles.experienceDate, { color: appTheme.colors.textMuted }]}>
                  {/* Real dates at last — the membership-derived rows had none, so every
                      row used to read "Present - Present". */}
                  {formatExperienceDate(exp.startDate)} - {exp.isCurrent ? 'Present' : formatExperienceDate(exp.endDate)}
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
                  color: exp.isVisible !== false ? appTheme.colors.text : appTheme.colors.textSecondary,
                  fontFamily: exp.isVisible !== false ? theme.fonts.primary.medium : theme.fonts.primary.regular,
                }
              ]}>
                Show this workplace on profile
              </Text>
              <Switch
                trackColor={{ false: appTheme.colors.switchTrackOff, true: appTheme.colors.switchTrackOn }}
                thumbColor={appTheme.colors.switchThumb}
                ios_backgroundColor={appTheme.colors.switchTrackOff}
                onValueChange={(value) => handleToggleExperienceVisibility(exp.id, value)}
                value={exp.isVisible !== false}
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

  // Deletion needs the user's password (and a 2FA code when enabled), so it has to go
  // through the real screen — a confirm modal here could never actually delete anything.
  const handleDeleteAccount = () => {
    navigation.navigate('DeleteAccount');
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
  fieldHint: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 6,
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
