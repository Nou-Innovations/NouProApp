import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import Avatar from '@/shared/components/ui/Avatar';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { imageService } from '@/shared/services/imageService';
import { authService } from '@/shared/services/authService';
import { UserPrivacySettings } from '@/shared/types/user';

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
  });

  // Work experience visibility toggles
  const [workplaceVisibility, setWorkplaceVisibility] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    userBusinesses.forEach(ub => {
      initial[ub.business.id] = true; // Default to visible
    });
    return initial;
  });

  // Track if user has made changes
  const [hasChanges, setHasChanges] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      personalInfo.show_address_publicly !== original.show_address_publicly;
    setHasChanges(changed);
  }, [personalInfo]);

  const handleSavePersonalInfo = () => {
    // Combine first name and surname
    const fullName = `${personalInfo.firstName} ${personalInfo.surname}`.trim();
    
    // Update the profile store
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
    });

    // Update original values after save
    originalInfoRef.current = { ...personalInfo };
    setHasChanges(false);
    setSuccessMessage('Personal information updated successfully!');
    setShowSuccessDialog(true);
  };

  const handleCancelPersonalEdit = () => {
    // Reset to original values
    setPersonalInfo({ ...originalInfoRef.current });
    setHasChanges(false);
    navigation.goBack();
  };

  const handleChangeAvatar = () => {
    const handleCamera = async () => {
      setIsUploadingAvatar(true);
      try {
        const cameraResult = await imageService.openCamera();
        if (cameraResult.success && cameraResult.imageUri) {
          const uploadResult = await imageService.uploadProfilePicture({
            userId: currentUser?.id || '1',
            imageUri: cameraResult.imageUri,
            imageType: 'profile',
          });

          if (uploadResult.success && uploadResult.imageUri) {
            updateCurrentUser({ avatar_url: uploadResult.imageUri });

            const backendResult = await authService.updateProfilePicture(
              currentUser?.id || '1',
              uploadResult.imageUri
            );
            if (backendResult.success) {
              setSuccessMessage('Profile picture updated successfully!');
              setShowSuccessDialog(true);
            } else {
              Alert.alert(
                'Warning',
                'Profile picture updated locally but failed to sync with server.'
              );
            }
          } else {
            Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
          }
        }
      } catch (error) {
        console.error('Camera error:', error);
        Alert.alert('Error', 'An error occurred while taking the photo.');
      } finally {
        setIsUploadingAvatar(false);
      }
    };

    const handleGallery = async () => {
      setIsUploadingAvatar(true);
      try {
        const galleryResult = await imageService.openGallery();
        if (galleryResult.success && galleryResult.imageUri) {
          const uploadResult = await imageService.uploadProfilePicture({
            userId: currentUser?.id || '1',
            imageUri: galleryResult.imageUri,
            imageType: 'profile',
          });

          if (uploadResult.success && uploadResult.imageUri) {
            updateCurrentUser({ avatar_url: uploadResult.imageUri });

            const backendResult = await authService.updateProfilePicture(
              currentUser?.id || '1',
              uploadResult.imageUri
            );
            if (backendResult.success) {
              setSuccessMessage('Profile picture updated successfully!');
              setShowSuccessDialog(true);
            } else {
              Alert.alert(
                'Warning',
                'Profile picture updated locally but failed to sync with server.'
              );
            }
          } else {
            Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
          }
        }
      } catch (error) {
        console.error('Gallery error:', error);
        Alert.alert('Error', 'An error occurred while selecting the photo.');
      } finally {
        setIsUploadingAvatar(false);
      }
    };

    imageService.showImagePickerOptions(handleCamera, handleGallery);
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


  const renderProfileHeader = () => {
    return (
      <View style={styles.profileHeader}>
        <TouchableOpacity
          onPress={handleChangeAvatar}
          style={styles.avatarContainer}
          disabled={isUploadingAvatar}
        >
          <Avatar
            userId={currentUser?.id || '1'}
            userName={currentUser?.name || 'User'}
            imageUri={currentUser?.avatar_url}
            size={120}
            style={styles.avatar}
            textStyle={{ fontSize: 48 }}
          />
          {isUploadingAvatar && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="white" />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleChangeAvatar} disabled={isUploadingAvatar}>
          <Text style={[styles.changePictureText, { color: appTheme.colors.primary }]}>
            Change picture
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBasicSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Basic
      </Text>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>First Name</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={personalInfo.firstName}
          onChangeText={(text) => setPersonalInfo({ ...personalInfo, firstName: text })}
          placeholder="Enter your first name"
          placeholderTextColor="#777777"
        />
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Surname</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={personalInfo.surname}
          onChangeText={(text) => setPersonalInfo({ ...personalInfo, surname: text })}
          placeholder="Enter your surname"
          placeholderTextColor="#777777"
        />
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Position</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={personalInfo.job_title}
          onChangeText={(text) => setPersonalInfo({ ...personalInfo, job_title: text })}
          placeholder="Enter your position"
          placeholderTextColor="#777777"
        />
      </View>

      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>About</Text>
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
          value={personalInfo.description}
          onChangeText={(text) => setPersonalInfo({ ...personalInfo, description: text })}
          placeholder="Tell us about yourself"
          placeholderTextColor="#777777"
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderPersonalInfoSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Personal Information
      </Text>

      {/* Phone Number */}
      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Phone Number</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={personalInfo.phone}
          onChangeText={(text) => setPersonalInfo({ ...personalInfo, phone: text })}
          placeholder="Enter your phone number"
          placeholderTextColor="#777777"
          keyboardType="phone-pad"
        />
        <View style={styles.privacyToggleRow}>
          <Text style={[
            styles.privacyToggleText, 
            { 
              color: personalInfo.show_phone_publicly ? appTheme.colors.text : appTheme.colors.textLight,
              fontFamily: personalInfo.show_phone_publicly ? theme.fonts.primary.medium : theme.fonts.primary.regular,
            }
          ]}>
            Show phone number on profile
          </Text>
          <Switch
            trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E9E9EA"
            onValueChange={(value) =>
              setPersonalInfo({ ...personalInfo, show_phone_publicly: value })
            }
            value={personalInfo.show_phone_publicly}
          />
        </View>
      </View>

      {/* Email */}
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
          value={personalInfo.email}
          onChangeText={(text) => setPersonalInfo({ ...personalInfo, email: text })}
          placeholder="Enter your email"
          placeholderTextColor="#777777"
          keyboardType="email-address"
        />
        <View style={styles.privacyToggleRow}>
          <Text style={[
            styles.privacyToggleText, 
            { 
              color: personalInfo.show_email_publicly ? appTheme.colors.text : appTheme.colors.textLight,
              fontFamily: personalInfo.show_email_publicly ? theme.fonts.primary.medium : theme.fonts.primary.regular,
            }
          ]}>
            Show email address on profile
          </Text>
          <Switch
            trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E9E9EA"
            onValueChange={(value) =>
              setPersonalInfo({ ...personalInfo, show_email_publicly: value })
            }
            value={personalInfo.show_email_publicly}
          />
        </View>
      </View>

      {/* Address */}
      <View style={styles.infoItem}>
        <Text style={[styles.infoLabel, { color: '#777777' }]}>Address</Text>
        <TextInput
          style={[
            styles.infoInput,
            {
              color: appTheme.colors.text,
              borderColor: '#DAD3D1',
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={personalInfo.address}
          onChangeText={(text) => setPersonalInfo({ ...personalInfo, address: text })}
          placeholder="Enter your address"
          placeholderTextColor="#777777"
        />
        <View style={styles.privacyToggleRow}>
          <Text style={[
            styles.privacyToggleText, 
            { 
              color: personalInfo.show_address_publicly ? appTheme.colors.text : appTheme.colors.textLight,
              fontFamily: personalInfo.show_address_publicly ? theme.fonts.primary.medium : theme.fonts.primary.regular,
            }
          ]}>
            Show address on profile
          </Text>
          <Switch
            trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E9E9EA"
            onValueChange={(value) =>
              setPersonalInfo({ ...personalInfo, show_address_publicly: value })
            }
            value={personalInfo.show_address_publicly}
          />
        </View>
      </View>
    </View>
  );

  const renderWorkExperiencesSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Work Experiences
      </Text>

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
                {
                  backgroundColor: '#F6F7F9',
                },
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
                <Text style={[styles.experienceRole, { color: appTheme.colors.textLight }]}>
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
            {/* Show on profile toggle */}
            <View style={styles.workplaceToggleRow}>
              <Text style={[
                styles.workplaceToggleText, 
                { 
                  color: (workplaceVisibility[ub.business.id] ?? true) ? appTheme.colors.text : appTheme.colors.textLight,
                  fontFamily: (workplaceVisibility[ub.business.id] ?? true) ? theme.fonts.primary.medium : theme.fonts.primary.regular,
                }
              ]}>
                Show this workplace on profile
              </Text>
              <Switch
                trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E9E9EA"
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
        onPress={handleSavePersonalInfo}
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
        onPress={handleCancelPersonalEdit}
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
        title="Edit Profile"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={hasChanges ? [{ icon: 'save', onPress: handleSavePersonalInfo }] : []}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderProfileHeader()}
        {renderBasicSection()}
        {renderPersonalInfoSection()}
        {renderWorkExperiencesSection()}
        {renderActionButtons()}
        <View style={{ height: 40 }} />
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  profileHeader: {
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePictureText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
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
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
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
});
