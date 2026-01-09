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
  Linking,
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
import { SecondaryHeader } from '@/shared/components/layout/headers';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PersonalSettingsScreen() {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme, theme: appTheme } = useTheme();

  // Profile store
  const currentUser = useProfileStore((state) => state.currentUser);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const updateCurrentUser = useProfileStore((state) => state.updateCurrentUser);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);

  // Local state
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    currentUser?.notifications_on ?? true
  );
  const [isProfileSwitcherVisible, setIsProfileSwitcherVisible] = useState(false);

  // Animation for modal
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    updateCurrentUser({ notifications_on: value });
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
    // Navigate to community feedback page or open link
    Linking.openURL('https://noupro.app/community');
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive', 
          onPress: () => {
            // Clear auth state and navigate to login
            console.log('Logout');
            // @ts-ignore
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      ]
    );
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
    </View>
  );

  const renderHelpCommunitySection = () => (
    <View style={styles.communitySection}>
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
    </View>
  );

  const renderLogoutButton = () => (
    <TouchableOpacity
      style={styles.logoutButton}
      onPress={handleLogout}
    >
      <Icon name="log-out-outline" size={20} color="#DC2626" />
      <Text style={styles.logoutText}>Log Out</Text>
    </TouchableOpacity>
  );

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
      <SecondaryHeader
        title="Settings"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderSettingsSection()}
        {renderHelpCommunitySection()}
        {renderLogoutButton()}
        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
      {renderProfileSwitcherModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
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
  communitySection: {
    paddingHorizontal: 12,
    marginTop: theme.spacing.xxl,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginTop: theme.spacing.sm,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    gap: theme.spacing.md,
  },
  logoutText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#DC2626',
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





