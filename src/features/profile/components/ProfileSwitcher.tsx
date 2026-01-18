/**
 * ProfileSwitcher Component
 * Allows users to switch between Personal Profile and Business Profiles
 * 
 * Based on app-logic.json identitySystem.profileSwitching:
 * - Switching profile = switching identity, not logging out
 * - User Mode Active: User acts as an individual
 * - Business Mode Active: User acts as the company
 * - Tabs, permissions, and UI change based on active profile
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import { UserBusiness } from '@/shared/types/business';
import theme from '@/shared/theme';

interface ProfileSwitcherProps {
  /**
   * Size variant
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Whether to show the dropdown arrow
   */
  showArrow?: boolean;
  /**
   * Custom onPress handler (overrides default modal behavior)
   */
  onPress?: () => void;
}

/**
 * ProfileSwitcher Component
 */
export function ProfileSwitcher({
  size = 'medium',
  showArrow = true,
  onPress,
}: ProfileSwitcherProps) {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Profile store state and actions
  const {
    currentUser,
    activeMode,
    activeBusiness,
    userBusinesses,
    switchToPersonal,
    switchToBusiness,
    currentUserRole,
  } = useProfileStore();

  /**
   * Get current profile display info
   */
  const getCurrentProfileInfo = () => {
    if (activeMode === 'business' && activeBusiness) {
      return {
        name: activeBusiness.name,
        subtitle: getRoleDisplayName(currentUserRole),
        avatar: activeBusiness.logo_url,
        isBusinessMode: true,
      };
    }
    return {
      name: currentUser?.name || 'Personal Profile',
      subtitle: 'Personal',
      avatar: currentUser?.avatar_url,
      isBusinessMode: false,
    };
  };

  const profileInfo = getCurrentProfileInfo();

  /**
   * Handle profile selection
   */
  const handleSelectProfile = async (type: 'personal' | 'business', businessId?: string) => {
    setIsLoading(true);
    
    try {
      if (type === 'personal') {
        switchToPersonal();
      } else if (businessId) {
        await switchToBusiness(businessId);
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error switching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle create business action
   */
  const handleCreateBusiness = () => {
    setModalVisible(false);
    // Navigate to business registration flow
    // @ts-ignore - Will be properly typed after navigation refactor
    navigation.navigate('BusinessBasicInfo', { fromProfileSwitcher: true });
  };

  /**
   * Handle join business action
   */
  const handleJoinBusiness = () => {
    setModalVisible(false);
    // Navigate to company search to find and join a business
    // @ts-ignore - Will be properly typed after navigation refactor
    navigation.navigate('CompanySearch', { query: '' });
  };

  /**
   * Get avatar/logo size based on variant
   */
  const getAvatarSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 48;
      default:
        return 40;
    }
  };

  const avatarSize = getAvatarSize();

  /**
   * Render avatar or fallback
   */
  const renderAvatar = (avatar?: string, name?: string, isBusinessMode?: boolean) => {
    if (avatar) {
      return (
        <Image
          source={{ uri: avatar }}
          style={[styles.avatar, { width: avatarSize, height: avatarSize }]}
        />
      );
    }

    // Fallback icon
    const iconName = isBusinessMode ? 'business' : 'person';
    const iconSize = avatarSize * 0.6;

    return (
      <View
        style={[
          styles.avatarPlaceholder,
          { width: avatarSize, height: avatarSize },
          isBusinessMode && styles.businessAvatarPlaceholder,
        ]}
      >
        <Icon name={iconName} size={iconSize} color="#6B7280" />
      </View>
    );
  };

  /**
   * Render profile row in modal
   */
  const renderProfileRow = (
    type: 'personal' | 'business',
    name: string,
    subtitle: string,
    avatar?: string,
    businessId?: string,
    isActive?: boolean
  ) => (
    <TouchableOpacity
      key={businessId || 'personal'}
      style={[
        styles.profileRow,
        isActive && styles.profileRowActive,
      ]}
      onPress={() => handleSelectProfile(type, businessId)}
      disabled={isLoading}
    >
      {renderAvatar(avatar, name, type === 'business')}
      <View style={styles.profileRowInfo}>
        <Text style={[styles.profileRowName, isActive && styles.profileRowNameActive]}>
          {name}
        </Text>
        <Text style={styles.profileRowSubtitle}>{subtitle}</Text>
      </View>
      {isActive && (
        <Icon name="checkmark-circle" size={24} color="#22C55E" />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      {/* Profile Switcher Button */}
      <TouchableOpacity
        style={styles.container}
        onPress={onPress || (() => setModalVisible(true))}
        activeOpacity={0.7}
      >
        {renderAvatar(profileInfo.avatar, profileInfo.name, profileInfo.isBusinessMode)}
        
        <View style={styles.info}>
          <Text style={[styles.name, { color: appTheme.colors.text }]} numberOfLines={1}>
            {profileInfo.name}
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textLight }]}>
            {profileInfo.subtitle}
          </Text>
        </View>

        {showArrow && (
          <Icon
            name="chevron-down"
            size={20}
            color={appTheme.colors.textLight}
            style={styles.arrow}
          />
        )}
      </TouchableOpacity>

      {/* Profile Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { backgroundColor: appTheme.colors.background }]}
            onPress={() => {}} // Prevent closing when tapping inside
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: appTheme.colors.text }]}>
                Switch Profile
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={24} color={appTheme.colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* Loading Indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={appTheme.colors.primary} />
              </View>
            )}

            {/* Profile List */}
            <ScrollView style={styles.profileList} showsVerticalScrollIndicator={false}>
              {/* Personal Profile */}
              <Text style={[styles.sectionTitle, { color: appTheme.colors.textLight }]}>
                Personal
              </Text>
              {renderProfileRow(
                'personal',
                currentUser?.name || 'Personal Profile',
                'Personal',
                currentUser?.avatar_url,
                undefined,
                activeMode === 'personal'
              )}

              {/* Business Profiles */}
              {userBusinesses.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: appTheme.colors.textLight }]}>
                    Businesses
                  </Text>
                  {userBusinesses.map((ub: UserBusiness) => (
                    renderProfileRow(
                      'business',
                      ub.business.name,
                      getRoleDisplayName(ub.role),
                      ub.business.logo_url,
                      ub.business.id,
                      activeMode === 'business' && activeBusiness?.id === ub.business.id
                    )
                  ))}
                </>
              )}

              {/* Actions */}
              <View style={styles.actionsSection}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCreateBusiness}
                >
                  <View style={styles.actionIconContainer}>
                    <Icon name="add" size={20} color="#6B7280" />
                  </View>
                  <Text style={styles.actionText}>Create New Business</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleJoinBusiness}
                >
                  <View style={styles.actionIconContainer}>
                    <Icon name="people" size={20} color="#6B7280" />
                  </View>
                  <Text style={styles.actionText}>Join Existing Business</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  avatar: {
    borderRadius: 10,
  },
  avatarPlaceholder: {
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessAvatarPlaceholder: {
    backgroundColor: '#E0E7FF',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.bold,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  arrow: {
    marginLeft: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.primary.bold,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 24,
  },
  profileList: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
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
  profileRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileRowName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    color: '#111827',
  },
  profileRowNameActive: {
    fontFamily: theme.fonts.primary.bold,
  },
  profileRowSubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  
  // Action Buttons
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
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    color: '#374151',
    marginLeft: 12,
  },
});

export default ProfileSwitcher;

