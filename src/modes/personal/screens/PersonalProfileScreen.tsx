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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import Avatar from '@/shared/components/ui/Avatar';
import { AppModal } from '@/shared/components/ui';
import AppButton from '@/shared/components/ui/AppButton';
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
  const setLocation = useBusinessStore((state) => state.setLocation);

  // Local state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isProfileSwitcherVisible, setIsProfileSwitcherVisible] = useState(false);
  const [isAddBusinessOptionsVisible, setIsAddBusinessOptionsVisible] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Mock locations data - in real app this would come from the store/API
  const mockBusinessLocations: Record<string, Array<{ id: string; name: string; address: string; is_primary: boolean }>> = {
    'comp-1': [
      { id: 'loc-1', name: 'Main Warehouse', address: 'Port Louis', is_primary: true },
      { id: 'loc-2', name: 'Rose Hill Branch', address: 'Rose Hill', is_primary: false },
      { id: 'loc-3', name: 'Curepipe Store', address: 'Curepipe', is_primary: false },
    ],
    'comp-2': [
      { id: 'loc-4', name: 'Head Office', address: 'Ebene', is_primary: true },
      { id: 'loc-5', name: 'Quatre Bornes', address: 'Quatre Bornes', is_primary: false },
    ],
  };

  // Animation for add business options modal
  const addOptionsOverlayOpacity = React.useRef(new Animated.Value(0)).current;
  const addOptionsModalTranslateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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

  const handleBusinessPress = (businessId: string) => {
    const locations = mockBusinessLocations[businessId];
    if (locations && locations.length > 1) {
      // Toggle expansion if business has multiple locations
      setExpandedBusinessId(expandedBusinessId === businessId ? null : businessId);
    } else {
      // Switch directly if single location or no locations
      handleBusinessSelect(businessId);
    }
  };

  const handleLocationSelect = async (businessId: string, locationId: string) => {
    try {
      // Set selected location and switch business
      setSelectedLocationId(locationId);
      await switchToBusiness(businessId);
      closeProfileSwitcher();
      const selectedLocation = mockBusinessLocations[businessId]?.find(
        (location) => location.id === locationId
      );
      if (selectedLocation) {
        setLocation({
          id: selectedLocation.id,
          companyId: businessId,
          name: selectedLocation.name,
          address: selectedLocation.address,
          phone: undefined,
          email: undefined,
          latitude: undefined,
          longitude: undefined,
        });
      }
    } catch (error) {
      console.error('Error switching to location:', error);
    }
  };

  // Add business options modal functions
  const openAddBusinessOptions = () => {
    setIsAddBusinessOptionsVisible(true);
    Animated.parallel([
      Animated.timing(addOptionsOverlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(addOptionsModalTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeAddBusinessOptions = () => {
    Animated.parallel([
      Animated.timing(addOptionsOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(addOptionsModalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsAddBusinessOptionsVisible(false);
    });
  };

  const handleCreateNewBusiness = () => {
    closeAddBusinessOptions();
    setTimeout(() => {
      // @ts-ignore
      navigation.navigate('CreateBusiness');
    }, 100);
  };

  const handleJoinBusiness = () => {
    closeAddBusinessOptions();
    setTimeout(() => {
      // @ts-ignore
      navigation.navigate('CompanySearch', { query: '', mode: 'join' });
    }, 100);
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
        <View style={styles.dropdownArrow}>
          <Icon name="chevron-down" size={18} color={appTheme.colors.text} />
        </View>
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
          <Text style={styles.shareButtonText}>Share Profile</Text>
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
            <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handlePhonePress = () => {
    if (currentUser?.phone) {
      Linking.openURL(`tel:${currentUser.phone}`);
    }
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

        {currentUser?.email && (
          <View style={styles.aboutItem}>
            <Icon name="mail-outline" size={20} color={appTheme.colors.textSecondary} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Email</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>{currentUser.email}</Text>
            </View>
          </View>
        )}

        {currentUser?.phone && (
          <TouchableOpacity style={styles.aboutItem} onPress={handlePhonePress}>
            <Icon name="call-outline" size={20} color={appTheme.colors.textSecondary} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Phone</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.info }]}>{currentUser.phone}</Text>
            </View>
          </TouchableOpacity>
        )}

        {currentUser?.address && (
          <View style={styles.aboutItem}>
            <Icon name="location-outline" size={20} color={appTheme.colors.textSecondary} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Address</Text>
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
            {/* Personal Profile Section */}
            <Text style={[styles.modalSectionTitle, { color: appTheme.colors.primary }]}>
              Personal
            </Text>
            <View style={[styles.profileRow, styles.profileRowActive]}>
              <Avatar
                userId={currentUser?.id || '1'}
                userName={currentUser?.name || 'User'}
                imageUri={currentUser?.avatar_url}
                size={48}
              />
              <View style={styles.profileRowInfo}>
                <Text style={[styles.profileRowName, { color: '#FFFFFF' }]}>
                  {currentUser?.name || 'Personal Profile'}
                </Text>
                <Text style={[styles.profileRowSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                  Personal
                </Text>
              </View>
            </View>

            {/* Business Profiles Section - only shown when user has businesses */}
            {userBusinesses.length > 0 && (
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.modalSectionTitle, { color: appTheme.colors.primary }]}>
                  Businesses
                </Text>
                <TouchableOpacity
                  style={styles.addBusinessButton}
                  onPress={() => {
                    closeProfileSwitcher();
                    setTimeout(openAddBusinessOptions, 300);
                  }}
                >
                  <Icon name="add" size={20} color={appTheme.colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            {userBusinesses.map((ub) => {
                const locations = mockBusinessLocations[ub.business.id];
                const hasLocations = locations && locations.length > 0;
                const isExpanded = expandedBusinessId === ub.business.id;
                // Find if this business has a selected location
                const selectedLocation = hasLocations ? locations.find(loc => loc.id === selectedLocationId) : null;
                // Show all locations if expanded, or just the selected one if collapsed
                const showAllLocations = hasLocations && isExpanded;
                const showSelectedLocationOnly = !isExpanded && selectedLocation;
                
                return (
                  <View key={ub.business.id}>
                    <TouchableOpacity
                      style={styles.profileRow}
                      onPress={() => handleBusinessPress(ub.business.id)}
                    >
                      <Avatar
                        userId={ub.business.id}
                        userName={ub.business.name}
                        imageUri={ub.business.logo_url}
                        size={48}
                      />
                      <View style={styles.profileRowInfo}>
                        <Text style={[styles.profileRowName, { color: appTheme.colors.primary }]}>
                          {ub.business.name}
                        </Text>
                        <Text style={[styles.profileRowSubtitle, { color: appTheme.colors.textSecondary }]}>
                          {getRoleDisplayName(ub.role)}
                          {hasLocations && ` • ${locations.length} location${locations.length > 1 ? 's' : ''}`}
                        </Text>
                      </View>
                      {hasLocations && (
                        <Icon 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color={appTheme.colors.textLight} 
                        />
                      )}
                    </TouchableOpacity>
                    
                    {/* Selected location only - shown when collapsed but has selection */}
                    {showSelectedLocationOnly && (
                      <TouchableOpacity
                        style={[styles.locationRow, styles.locationRowActive]}
                        onPress={() => setExpandedBusinessId(ub.business.id)}
                      >
                        <View style={[styles.locationIconContainer, styles.locationIconContainerActive]}>
                          <Icon name="location-outline" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.locationInfo}>
                          <Text style={[styles.locationName, { color: '#FFFFFF' }]}>
                            {selectedLocation.name}
                          </Text>
                          <Text style={[styles.locationAddress, { color: 'rgba(255,255,255,0.7)' }]}>
                            {selectedLocation.address}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    
                    {/* All location options - shown when expanded */}
                    {showAllLocations && (
                      <View style={styles.locationsContainer}>
                        {locations.map((location) => {
                          const isLocationSelected = selectedLocationId === location.id;
                          return (
                            <TouchableOpacity
                              key={location.id}
                              style={[
                                styles.locationRow,
                                isLocationSelected && styles.locationRowActive,
                              ]}
                              onPress={() => handleLocationSelect(ub.business.id, location.id)}
                            >
                              <View style={[
                                styles.locationIconContainer,
                                isLocationSelected && styles.locationIconContainerActive,
                              ]}>
                                <Icon 
                                  name="location-outline" 
                                  size={20} 
                                  color={isLocationSelected ? '#FFFFFF' : appTheme.colors.textSecondary} 
                                />
                              </View>
                              <View style={styles.locationInfo}>
                                <Text style={[
                                  styles.locationName, 
                                  { color: isLocationSelected ? '#FFFFFF' : appTheme.colors.primary }
                                ]}>
                                  {location.name}
                                </Text>
                                <Text style={[
                                  styles.locationAddress, 
                                  { color: isLocationSelected ? 'rgba(255,255,255,0.7)' : appTheme.colors.textSecondary }
                                ]}>
                                  {location.address}
                                </Text>
                              </View>
                              {location.is_primary && !isLocationSelected && (
                                <View style={styles.primaryBadge}>
                                  <Text style={styles.primaryBadgeText}>Primary</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

            {/* Add New Business Button */}
            <TouchableOpacity
              style={styles.addNewBusinessButton}
              onPress={() => {
                closeProfileSwitcher();
                setTimeout(openAddBusinessOptions, 300);
              }}
            >
              <View style={{ marginRight: 8 }}>
                <Icon name="add" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.addNewBusinessButtonText}>Add New Business</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  // Add Business Options Modal
  const renderAddBusinessOptionsModal = () => (
    <Modal
      transparent={true}
      visible={isAddBusinessOptionsVisible}
      onRequestClose={closeAddBusinessOptions}
      animationType="none"
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: addOptionsOverlayOpacity }
        ]}
      >
        <TouchableOpacity
          style={styles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={closeAddBusinessOptions}
        />

        <Animated.View
          style={[
            styles.addOptionsBottomSheet,
            {
              backgroundColor: appTheme.colors.surface,
              transform: [{ translateY: addOptionsModalTranslateY }]
            }
          ]}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: appTheme.colors.borderColor }]}>
            <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>Add Business</Text>
            <TouchableOpacity onPress={closeAddBusinessOptions} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={appTheme.colors.textLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.addOptionsContent}>
            <TouchableOpacity
              style={styles.addOptionRow}
              onPress={handleCreateNewBusiness}
            >
              <View style={[styles.addOptionIconContainer, { backgroundColor: appTheme.colors.surface }]}>
                <Icon name="add-circle-outline" size={24} color={appTheme.colors.primary} />
              </View>
              <View style={styles.addOptionInfo}>
                <Text style={[styles.addOptionTitle, { color: appTheme.colors.primary }]}>
                  Create New Business
                </Text>
                <Text style={[styles.addOptionSubtitle, { color: appTheme.colors.textSecondary }]}>
                  Start a new business from scratch
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addOptionRow}
              onPress={handleJoinBusiness}
            >
              <View style={[styles.addOptionIconContainer, { backgroundColor: appTheme.colors.surface }]}>
                <Icon name="people-outline" size={24} color={appTheme.colors.primary} />
              </View>
              <View style={styles.addOptionInfo}>
                <Text style={[styles.addOptionTitle, { color: appTheme.colors.primary }]}>
                  Join a Business
                </Text>
                <Text style={[styles.addOptionSubtitle, { color: appTheme.colors.textSecondary }]}>
                  Search and join an existing business
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
            </TouchableOpacity>
          </View>
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
      {renderAddBusinessOptionsModal()}

      {/* Success Dialog */}
      <AppModal
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        variant="success"
        title="Success"
        message={successMessage}
        primaryButtonText="OK"
        onPrimaryAction={() => setShowSuccessDialog(false)}
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
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 2,
  },
  experienceDate: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 2,
  },
  // About section styles
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12, // 12px gap between icon and content
  },
  aboutItemContent: {
    flex: 1,
  },
  aboutLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 2,
  },
  aboutValue: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
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
    paddingHorizontal: 12,
    marginTop: 8,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  addBusinessButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E1E4EA',
  },
  profileRowActive: {
    backgroundColor: '#000000',
    borderRadius: 0,
    borderBottomWidth: 0,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  profileRowAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontFamily: theme.fonts.primary.bold,
  },
  profileRowSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 2,
  },
  // Location styles
  locationsContainer: {
    // No left line, just a container for locations
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E1E4EA',
  },
  locationRowActive: {
    backgroundColor: '#000000',
    borderBottomWidth: 0,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  locationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F6F7F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
  },
  locationAddress: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  primaryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#2E7D32',
  },
  emptyBusinessText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    paddingVertical: 16,
  },
  addNewBusinessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 8,
    height: 56,
    marginTop: 24,
    marginBottom: 16,
  },
  addNewBusinessButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#FFFFFF',
  },
  // Add Business Options Modal styles
  addOptionsBottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  addOptionsContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  addOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  addOptionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addOptionTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  addOptionSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
});





