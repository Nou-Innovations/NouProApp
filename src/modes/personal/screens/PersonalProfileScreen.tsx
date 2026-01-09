/**
 * PersonalProfileScreen - Personal Mode
 * Viewing own User Profile with Edit/Share buttons
 * Based on app-logic.json screens.personalMode.profile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import Avatar from '@/shared/components/ui/Avatar';
import { ConfirmationDialog } from '@/shared/components/ui';
import { imageService } from '@/shared/services/imageService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PersonalProfileScreen() {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme, theme: appTheme } = useTheme();

  // Profile store
  const currentUser = useProfileStore((state) => state.currentUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const updateCurrentUser = useProfileStore((state) => state.updateCurrentUser);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);

  // Local state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isProfileSwitcherVisible, setIsProfileSwitcherVisible] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Animation for modal
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const modalTranslateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const handleEditProfile = () => {
    // @ts-ignore
    navigation.navigate('EditPersonalProfile');
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out my profile on NouPro: ${currentUser?.name}`,
        title: 'Share Profile',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleChangeAvatar = async () => {
    const handleCamera = async () => {
      setIsUploadingAvatar(true);
      try {
        const result = await imageService.openCamera();
        if (result.success && result.imageUri) {
          const uploadResult = await imageService.uploadProfilePicture({
            userId: currentUser?.id || '1',
            imageUri: result.imageUri,
            imageType: 'profile',
          });
          if (uploadResult.success && uploadResult.imageUri) {
            updateCurrentUser({ avatar_url: uploadResult.imageUri });
            setSuccessMessage('Profile picture updated!');
            setShowSuccessDialog(true);
          }
        }
      } catch (error) {
        console.error('Camera error:', error);
      } finally {
        setIsUploadingAvatar(false);
      }
    };

    const handleGallery = async () => {
      setIsUploadingAvatar(true);
      try {
        const result = await imageService.openGallery();
        if (result.success && result.imageUri) {
          const uploadResult = await imageService.uploadProfilePicture({
            userId: currentUser?.id || '1',
            imageUri: result.imageUri,
            imageType: 'profile',
          });
          if (uploadResult.success && uploadResult.imageUri) {
            updateCurrentUser({ avatar_url: uploadResult.imageUri });
            setSuccessMessage('Profile picture updated!');
            setShowSuccessDialog(true);
          }
        }
      } catch (error) {
        console.error('Gallery error:', error);
      } finally {
        setIsUploadingAvatar(false);
      }
    };

    imageService.showImagePickerOptions(handleCamera, handleGallery);
  };

  const handleGoToBusiness = (businessId: string) => {
    // @ts-ignore
    navigation.navigate('ViewBusinessProfile', { businessId });
  };

  const handleSettings = () => {
    // @ts-ignore
    navigation.navigate('PersonalSettings');
  };

  // Profile switcher modal functions
  const openProfileSwitcher = () => {
    setIsProfileSwitcherVisible(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeProfileSwitcher = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsProfileSwitcherVisible(false);
    });
  };

  const handleBusinessSelect = async (businessId: string) => {
    try {
      await switchToBusiness(businessId);
      closeProfileSwitcher();
      // Mode switch happens via store - MainTabNavigator will automatically render BusinessTabNavigator
    } catch (error) {
      console.error('Error switching business:', error);
    }
  };

  // Format date for experience
  const formatExperienceDate = (dateString?: string) => {
    if (!dateString) return 'Present';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
      <View style={{ width: 40 }} />
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={handleSettings}
      >
        <Icon name="settings-outline" size={24} color={appTheme.colors.text} />
      </TouchableOpacity>
    </View>
  );

  const renderProfileSection = () => (
    <View style={styles.profileSection}>
      {/* Avatar on the left - 80x80 */}
      <View style={styles.profileTopRow}>
        <View style={styles.avatarContainer}>
          <Avatar
            userId={currentUser?.id || '1'}
            userName={currentUser?.name || 'User'}
            imageUri={currentUser?.avatar_url}
            size={80}
          />
        </View>
      </View>

      {/* Name with dropdown arrow on the left - 20px black */}
      <TouchableOpacity 
        style={styles.nameRow}
        onPress={openProfileSwitcher}
        activeOpacity={0.7}
      >
        <Text style={[styles.userName, { color: appTheme.colors.text }]}>
          {currentUser?.name || 'User Name'}
        </Text>
        <Icon name="chevron-down" size={18} color={appTheme.colors.text} style={styles.dropdownArrow} />
      </TouchableOpacity>

      {/* Job status - Inter medium 16px secondary color */}
      {currentUser?.job_title && (
        <Text style={[styles.jobStatus, { color: appTheme.colors.secondary }]}>
          {currentUser.job_title}
        </Text>
      )}

      {/* Description - Inter light 14px secondary color, expandable */}
      {currentUser?.description && (
        <TouchableOpacity 
          onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          activeOpacity={0.7}
        >
          <Text 
            style={[styles.description, { color: appTheme.colors.secondary }]}
            numberOfLines={isDescriptionExpanded ? undefined : 2}
          >
            {currentUser.description}
          </Text>
        </TouchableOpacity>
      )}
      {!currentUser?.description && (
        <Text style={[styles.descriptionPlaceholder, { color: appTheme.colors.textLight }]}>
          Add a description about yourself
        </Text>
      )}

      {/* Connections Stats */}
      <View style={styles.socialStats}>
        <TouchableOpacity 
          style={styles.socialStatItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('Connections', { userId: currentUser?.id || '1' });
          }}
        >
          <Text style={[styles.socialStatCount, { color: appTheme.colors.text }]}>
            {currentUser?.connections_count ?? 0}
          </Text>
          <Text style={[styles.socialStatLabel, { color: appTheme.colors.secondary }]}>
            Connections
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons - same as Professional mode */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareProfile}
        >
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderExperienceSection = () => {
    if (userBusinesses.length === 0) return null;

    return (
      <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Experience
        </Text>

        {userBusinesses.map((ub, index) => (
          <TouchableOpacity
            key={ub.business.id}
            style={[
              styles.experienceCard,
              index !== userBusinesses.length - 1 && { borderBottomWidth: 1, borderBottomColor: appTheme.colors.borderColor }
            ]}
            onPress={() => handleGoToBusiness(ub.business.id)}
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
              {/* Date range - Start date to End date (like LinkedIn) */}
              <Text style={[styles.experienceDate, { color: appTheme.colors.textMuted }]}>
                {formatExperienceDate(ub.start_date)} - {formatExperienceDate(ub.end_date)}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={appTheme.colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderAboutSection = () => {
    // Only show if user has contact info
    const hasContactInfo = currentUser?.phone || currentUser?.email || currentUser?.address;
    if (!hasContactInfo) return null;

    return (
      <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          About
        </Text>

        {currentUser?.phone && (
          <View style={styles.aboutItem}>
            <Icon name="call-outline" size={20} color={appTheme.colors.secondary} style={styles.aboutIcon} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textMuted }]}>Phone</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>{currentUser.phone}</Text>
            </View>
          </View>
        )}

        {currentUser?.email && (
          <View style={styles.aboutItem}>
            <Icon name="mail-outline" size={20} color={appTheme.colors.secondary} style={styles.aboutIcon} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textMuted }]}>Email</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>{currentUser.email}</Text>
            </View>
          </View>
        )}

        {currentUser?.address && (
          <View style={styles.aboutItem}>
            <Icon name="location-outline" size={20} color={appTheme.colors.secondary} style={styles.aboutIcon} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textMuted }]}>Address</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>{currentUser.address}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Profile Switcher Modal
  const renderProfileSwitcherModal = () => (
    <Modal
      transparent={true}
      visible={isProfileSwitcherVisible}
      onRequestClose={closeProfileSwitcher}
      animationType="none"
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: overlayOpacity }
        ]}
      >
        <TouchableOpacity
          style={styles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={closeProfileSwitcher}
        />

        <Animated.View
          style={[
            styles.modalBottomSheet,
            {
              backgroundColor: appTheme.colors.surface,
              transform: [{ translateY: modalTranslateY }]
            }
          ]}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Switch Profile</Text>
            <TouchableOpacity onPress={closeProfileSwitcher} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={appTheme.colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            {/* Personal Profile - Active */}
            <Text style={[styles.modalSectionTitle, { color: appTheme.colors.textLight }]}>
              Personal
            </Text>
            <View style={[styles.profileRow, styles.profileRowActive]}>
              <View style={styles.profileRowAvatar}>
                <Icon name="person" size={24} color="#6B7280" />
              </View>
              <View style={styles.profileRowInfo}>
                <Text style={[styles.profileRowName, { color: appTheme.colors.text }]}>
                  {currentUser?.name || 'Personal Profile'}
                </Text>
                <Text style={[styles.profileRowSubtitle, { color: appTheme.colors.textLight }]}>
                  Personal
                </Text>
              </View>
              <Icon name="checkmark-circle" size={24} color="#22C55E" />
            </View>

            {/* Business Profiles */}
            {userBusinesses.length > 0 && (
              <>
                <Text style={[styles.modalSectionTitle, { color: appTheme.colors.textLight }]}>
                  Businesses
                </Text>
                {userBusinesses.map((ub) => (
                  <TouchableOpacity
                    key={ub.business.id}
                    style={styles.profileRow}
                    onPress={() => handleBusinessSelect(ub.business.id)}
                  >
                    <Avatar
                      userId={ub.business.id}
                      userName={ub.business.name}
                      imageUri={ub.business.logo_url}
                      size={40}
                    />
                    <View style={styles.profileRowInfo}>
                      <Text style={[styles.profileRowName, { color: appTheme.colors.text }]}>
                        {ub.business.name}
                      </Text>
                      <Text style={[styles.profileRowSubtitle, { color: appTheme.colors.textLight }]}>
                        {getRoleDisplayName(ub.role)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Actions Section */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  closeProfileSwitcher();
                  // @ts-ignore
                  navigation.navigate('CreateBusiness');
                }}
              >
                <View style={styles.actionIconContainer}>
                  <Icon name="add" size={20} color="#6B7280" />
                </View>
                <Text style={[styles.actionText, { color: appTheme.colors.text }]}>Create New Business</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  closeProfileSwitcher();
                  // @ts-ignore
                  navigation.navigate('CompanySearch', { query: '' });
                }}
              >
                <View style={styles.actionIconContainer}>
                  <Icon name="people" size={20} color="#6B7280" />
                </View>
                <Text style={[styles.actionText, { color: appTheme.colors.text }]}>Join Existing Business</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderProfileSection()}
        {renderExperienceSection()}
        {renderAboutSection()}
        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
      {renderProfileSwitcherModal()}

      {/* Success Dialog */}
      <ConfirmationDialog
        visible={showSuccessDialog}
        variant="success"
        title="Success"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => setShowSuccessDialog(false)}
        onClose={() => setShowSuccessDialog(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12, // 12px horizontal margin
    paddingVertical: theme.spacing.sm,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  profileSection: {
    paddingHorizontal: 12, // 12px horizontal margin
    paddingTop: 0,
    paddingBottom: theme.spacing.md,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  avatarEditIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  userName: {
    fontSize: 24, // 20px black
    fontFamily: theme.fonts.primary.bold,
    color: '#000000',
  },
  dropdownArrow: {
    marginLeft: 8,
    marginTop: 2,
  },
  jobStatus: {
    fontSize: 16, // Inter medium 16px
    fontFamily: theme.fonts.primary.medium,
    marginTop: theme.spacing.xs,
  },
  description: {
    fontSize: 14, // Inter regular 14px
    fontFamily: theme.fonts.primary.medium,
    lineHeight: 20,
    marginTop: 16,
  },
  descriptionPlaceholder: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    fontStyle: 'italic',
    marginTop: 8,
  },
  socialStats: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    gap: 24,
  },
  socialStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socialStatCount: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  socialStatLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  section: {
    marginHorizontal: 12, // 12px horizontal margin
    marginBottom: 0, // 16px gap between sections
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: theme.spacing.sm,
  },
  experienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  experienceInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  experienceName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
  },
  experienceRole: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 2,
  },
  experienceDate: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  // About section styles
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  aboutIcon: {
    marginRight: 12,
    marginTop: 8,
  },
  aboutItemContent: {
    flex: 1,
  },
  aboutLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 2,
  },
  aboutValue: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalBottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  profileRowActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  profileRowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileRowName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  profileRowSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  actionsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    marginLeft: 12,
  },
});





