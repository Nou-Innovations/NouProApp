/**
 * PersonalSettingsScreen - Personal Mode
 * Settings for the personal profile
 * Includes Security, Push Notifications, Dark Mode, Edit Profile, Switch Profile,
 * Help Community grow, and Logout
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
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
import { useBusinessStore } from '@/shared/store/businessStore';
import Avatar from '@/shared/components/ui/Avatar';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { DemoModeBadge } from '@/shared/components/ui/DemoModeBadge';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PersonalSettingsScreen() {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme, theme: appTheme } = useTheme();

  // Profile store
  const currentUser = useProfileStore((state) => state.currentUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const updateCurrentUser = useProfileStore((state) => state.updateCurrentUser);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);
  const setLocation = useBusinessStore((state) => state.setLocation);
  const storeLocations = useBusinessStore((state) => state.locations);
  const getBusinessLocations = (businessId: string) =>
    storeLocations.filter(loc => (loc as any).companyId === businessId);

  // Local state
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    currentUser?.notifications_on ?? true
  );
  const [isProfileSwitcherVisible, setIsProfileSwitcherVisible] = useState(false);
  const [isAddBusinessOptionsVisible, setIsAddBusinessOptionsVisible] = useState(false);
  const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);


  // Animation for modal
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Animation for add business options modal
  const addOptionsOverlayOpacity = useRef(new Animated.Value(0)).current;
  const addOptionsModalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const handleNotificationsToggle = async (value: boolean) => {
    if (value) {
      try {
        const { registerForPushNotifications, registerTokenWithBackend } = require('@/shared/services/pushNotifications');
        const token = await registerForPushNotifications();
        if (token) {
          await registerTokenWithBackend(token);
          setNotificationsEnabled(true);
          updateCurrentUser({ notifications_on: true });
        } else {
          Alert.alert(
            'Notifications Disabled',
            'Please enable notifications in your device settings to receive push notifications.',
            [{ text: 'OK' }],
          );
        }
      } catch (err) {
        console.error('[Settings] Push registration error:', err);
      }
    } else {
      try {
        const { unregisterTokenFromBackend } = require('@/shared/services/pushNotifications');
        await unregisterTokenFromBackend();
      } catch (err) {
        console.error('[Settings] Push unregister error:', err);
      }
      setNotificationsEnabled(false);
      updateCurrentUser({ notifications_on: false });
    }
  };

  const handleNotificationPreferences = () => {
    // @ts-ignore
    navigation.navigate('NotificationPreferences');
  };

  const handleEditProfile = () => {
    // @ts-ignore
    navigation.navigate('EditPersonalProfile');
  };

  const handleSecurity = () => {
    // @ts-ignore
    navigation.navigate('SecuritySettings');
  };

  const handleHelpCommunity = () => {
    // @ts-ignore
    navigation.navigate('FeedbackCategories');
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Navigate to privacy policy screen');
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
      // Navigate back to main tabs so BusinessTabNavigator renders instead of staying on personal settings
      // @ts-ignore
      navigation.navigate('MainTabs');
    } catch (error) {
      console.error('Error switching business:', error);
    }
  };

  const handleBusinessPress = (businessId: string) => {
    const locations = getBusinessLocations(businessId);
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
      const selectedLocation = getBusinessLocations(businessId)?.find(
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
      // Navigate back to main tabs so BusinessTabNavigator renders
      // @ts-ignore
      navigation.navigate('MainTabs');
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
      navigation.navigate('BusinessBasicInfo', { fromProfileSwitcher: true });
    }, 100);
  };

  const handleJoinBusiness = () => {
    closeAddBusinessOptions();
    setTimeout(() => {
      // @ts-ignore
      navigation.navigate('CompanySearch', { query: '', mode: 'join' });
    }, 100);
  };


  const renderSettingsSection = () => (
    <View style={styles.settingsSection}>
      {/* Edit Profile */}
      <TouchableOpacity
        style={[styles.settingRow, { borderBottomColor: appTheme.colors.borderColor }]}
        onPress={handleEditProfile}
      >
        <View style={styles.settingLeft}>
          <Icon name="person-outline" size={24} color={appTheme.colors.iconColor} />
          <Text style={[styles.settingText, { color: appTheme.colors.text }]}>Edit Profile</Text>
        </View>
        <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
      </TouchableOpacity>

      {/* Switch Profile */}
      <TouchableOpacity
        style={[styles.settingRow, { borderBottomColor: appTheme.colors.borderColor }]}
        onPress={openProfileSwitcher}
      >
        <View style={styles.settingLeft}>
          <Icon name="swap-horizontal-outline" size={24} color={appTheme.colors.iconColor} />
          <Text style={[styles.settingText, { color: appTheme.colors.text }]}>Switch Profile</Text>
        </View>
        <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
      </TouchableOpacity>

      {/* Security */}
      <TouchableOpacity
        style={[styles.settingRow, { borderBottomColor: appTheme.colors.borderColor }]}
        onPress={handleSecurity}
      >
        <View style={styles.settingLeft}>
          <Icon name="shield-checkmark-outline" size={24} color={appTheme.colors.iconColor} />
          <Text style={[styles.settingText, { color: appTheme.colors.text }]}>Security</Text>
        </View>
        <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
      </TouchableOpacity>

      {/* Push Notifications */}
      <View style={[styles.settingRow, { borderBottomColor: appTheme.colors.borderColor }]}>
        <View style={styles.settingLeft}>
          <Icon name="notifications-outline" size={24} color={appTheme.colors.iconColor} />
          <Text style={[styles.settingText, { color: appTheme.colors.text }]}>
            Push Notifications
          </Text>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={handleNotificationsToggle}
          trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E9E9EA"
        />
      </View>

      {/* Notification Preferences (visible when notifications enabled) */}
      {notificationsEnabled && (
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: appTheme.colors.borderColor }]}
          onPress={handleNotificationPreferences}
        >
          <View style={styles.settingLeft}>
            <Icon name="options-outline" size={24} color={appTheme.colors.iconColor} />
            <Text style={[styles.settingText, { color: appTheme.colors.text }]}>
              Notification Preferences
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
        </TouchableOpacity>
      )}

      {/* Dark Mode */}
      <View style={[styles.settingRow, { borderBottomColor: appTheme.colors.borderColor }]}>
        <View style={styles.settingLeft}>
          <Icon name="moon-outline" size={24} color={appTheme.colors.iconColor} />
          <Text style={[styles.settingText, { color: appTheme.colors.text }]}>Dark Mode</Text>
        </View>
        <Switch
          value={isDarkMode}
          onValueChange={toggleTheme}
          trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E9E9EA"
        />
      </View>

      {/* Privacy Policy */}
      <TouchableOpacity
        style={[styles.settingRow, { borderBottomColor: appTheme.colors.borderColor }]}
        onPress={handlePrivacyPolicy}
      >
        <View style={styles.settingLeft}>
          <Icon name="document-text-outline" size={24} color={appTheme.colors.iconColor} />
          <Text style={[styles.settingText, { color: appTheme.colors.text }]}>Privacy Policy</Text>
        </View>
        <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
      </TouchableOpacity>

    </View>
  );

  const renderHelpCommunitySection = () => (
    <TouchableOpacity
      style={[styles.communityButton, { backgroundColor: '#DBEAFE' }]}
      onPress={handleHelpCommunity}
    >
      <View style={styles.communityContent}>
        <View style={styles.communityIcon}>
          <Icon name="heart-outline" size={24} color="#3B82F6" />
        </View>
        <View style={styles.communityText}>
          <Text style={[styles.communityTitle, { color: '#3B82F6', fontFamily: theme.fonts.primary.bold }]}>
            Help the Community grow
          </Text>
          <Text style={[styles.communitySubtitle, { color: appTheme.colors.secondary }]}>
            Propose features, report bugs, and share your feedback
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Profile Switcher Modal
  const renderProfileSwitcherModal = () => (
    <Modal
      transparent
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
              const locations = getBusinessLocations(ub.business.id);
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
      transparent
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
      <SecondaryHeader
        title="Settings"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false} 
        bounces={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.demoModeContainer}>
          <DemoModeBadge />
        </View>
        {renderSettingsSection()}
      </ScrollView>

      {/* Bottom Fixed Buttons */}
      <View style={styles.bottomButtonsContainer}>
        {renderHelpCommunitySection()}
      </View>

      {renderProfileSwitcherModal()}
      {renderAddBusinessOptionsModal()}
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
  scrollViewContent: {
    flexGrow: 1,
  },
  demoModeContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  settingsSection: {
    marginTop: theme.spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    marginLeft: theme.spacing.md,
  },
  bottomButtonsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 40,
    gap: 8,
  },
  communityButton: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
  },
  communityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  communityIcon: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  communityText: {
    flex: 1,
  },
  communityTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  communitySubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.medium,
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





