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

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { Icon } from '@/shared/utils/icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import { UserBusiness } from '@/shared/types/business';
import { getCapabilities } from '@/shared/auth/capabilities';
import { RoleRequest } from '@/shared/types/roleRequest';
import roleRequestService from '@/features/team/roleRequest.service';
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
  
  // Role request state
  const [roleRequests, setRoleRequests] = useState<Map<string, RoleRequest>>(new Map());
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<UserBusiness | null>(null);

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
  
  // Load role request statuses for staff memberships
  useEffect(() => {
    const loadRoleRequests = async () => {
      const requests = new Map<string, RoleRequest>();
      
      for (const ub of userBusinesses) {
        if (ub.role === 'staff') {
          try {
            const request = await roleRequestService.getMyRoleRequest(ub.business.id);
            if (request) {
              requests.set(ub.business.id, request);
            }
          } catch (error) {
            // No request exists - that's fine
            if (__DEV__) {
              console.log(`[ProfileSwitcher] No role request for ${ub.business.id}`);
            }
          }
        }
      }
      
      setRoleRequests(requests);
    };
    
    if (modalVisible && userBusinesses.some(ub => ub.role === 'staff')) {
      loadRoleRequests();
    }
  }, [modalVisible, userBusinesses]);

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
  const handleSelectProfile = async (
    type: 'personal' | 'business', 
    businessId?: string,
    userBusiness?: UserBusiness
  ) => {
    // Personal profile - always allowed
    if (type === 'personal') {
      setIsLoading(true);
      try {
        switchToPersonal();
        setModalVisible(false);
      } catch (error) {
        console.error('Error switching to personal:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Business profile - check role restrictions
    if (businessId && userBusiness) {
      const capabilities = getCapabilities(userBusiness.role);
      
      // Staff cannot access Business Profile mode
      if (capabilities.isStaff) {
        setSelectedBusiness(userBusiness);
        setShowAccessDialog(true);
        return;
      }
      
      // Admin/Super Admin - switch immediately
      setIsLoading(true);
      try {
        const success = await switchToBusiness(businessId);
        if (success) {
          setModalVisible(false);
        }
      } catch (error) {
        console.error('Error switching to business:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  /**
   * Handle request admin access
   */
  const handleRequestAccess = async () => {
    if (!selectedBusiness) return;
    
    setIsLoading(true);
    try {
      await roleRequestService.createRoleRequest(selectedBusiness.business.id, {
        requestedRole: 'admin',
        message: 'Requesting admin access to help manage business operations',
      });
      
      AppAlert.alert(
        'Request Sent',
        `Your admin access request for ${selectedBusiness.business.name} has been sent to the business owner. You'll be notified when it's reviewed.`,
        [{ text: 'OK', onPress: () => setShowAccessDialog(false) }]
      );
      
      // Reload role requests to show pending state
      const request = await roleRequestService.getMyRoleRequest(selectedBusiness.business.id);
      if (request) {
        setRoleRequests(prev => new Map(prev).set(selectedBusiness.business.id, request));
      }
    } catch (error: any) {
      console.error('Error requesting access:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already exists') || error.message?.includes('pending')) {
        AppAlert.alert('Request Already Sent', 'You already have a pending admin access request for this business.');
      } else if (error.message?.includes('cooldown') || error.message?.includes('recently rejected')) {
        AppAlert.alert(
          'Request Cooldown',
          'Your previous request was recently reviewed. Please wait before requesting again.'
        );
      } else {
        AppAlert.alert('Request Failed', 'Failed to send admin access request. Please try again.');
      }
      
      setShowAccessDialog(false);
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
    navigation.navigate('SelectCompany');
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
        <Icon name={iconName} size={iconSize} color={appTheme.colors.textSecondary} />
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
    isActive?: boolean,
    userBusiness?: UserBusiness
  ) => {
    const isStaff = userBusiness?.role === 'staff';
    const roleRequest = businessId ? roleRequests.get(businessId) : undefined;
    
    // Determine button state for staff members
    let staffButtonState: 'restricted' | 'pending' | 'rejected' | null = null;
    if (isStaff) {
      if (roleRequest?.status === 'PENDING') {
        staffButtonState = 'pending';
      } else if (roleRequest?.status === 'REJECTED') {
        staffButtonState = 'rejected';
      } else {
        staffButtonState = 'restricted';
      }
    }
    
    return (
      <TouchableOpacity
        key={businessId || 'personal'}
        style={[
          styles.profileRow,
          isActive && styles.profileRowActive,
          isStaff && styles.profileRowRestricted,
        ]}
        onPress={() => handleSelectProfile(type, businessId, userBusiness)}
        disabled={isLoading || (isStaff && staffButtonState === 'pending')}
      >
        {renderAvatar(avatar, name, type === 'business')}
        <View style={styles.profileRowInfo}>
          <View style={styles.profileRowHeader}>
            <Text style={[styles.profileRowName, isActive && styles.profileRowNameActive]}>
              {name}
            </Text>
            {/* Role badge */}
            {type === 'business' && userBusiness && (
              <View style={[
                styles.roleBadge,
                { backgroundColor: isStaff ? '#FEF3C7' : '#DBEAFE' }
              ]}>
                <Text style={[
                  styles.roleBadgeText,
                  { color: isStaff ? appTheme.colors.warning : appTheme.colors.info }
                ]}>
                  {userBusiness.role === 'super_admin' ? 'OWNER' : userBusiness.role.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.profileRowSubtitle}>{subtitle}</Text>
          
          {/* Status indicator for staff */}
          {isStaff && staffButtonState && (
            <View style={styles.staffStatusContainer}>
              {staffButtonState === 'pending' && (
                <View style={[styles.statusPill, { backgroundColor: '#FEF3C7' }]}>
                  <View style={[styles.statusDot, { backgroundColor: appTheme.colors.warning }]} />
                  <Text style={[styles.statusText, { color: appTheme.colors.warning }]}>
                    Request Pending
                  </Text>
                </View>
              )}
              {staffButtonState === 'rejected' && (
                <View style={[styles.statusPill, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="close-circle" size={14} color={appTheme.colors.error} />
                  <Text style={[styles.statusText, { color: appTheme.colors.error }]}>
                    Request Declined
                  </Text>
                </View>
              )}
              {staffButtonState === 'restricted' && (
                <View style={[styles.statusPill, { backgroundColor: appTheme.colors.surface }]}>
                  <Icon name="lock-closed" size={14} color={appTheme.colors.textSecondary} />
                  <Text style={[styles.statusText, { color: appTheme.colors.text }]}>
                    Tap to request access
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        {isActive && !isStaff && (
          <Icon name="checkmark-circle" size={24} color={appTheme.colors.success} />
        )}
      </TouchableOpacity>
    );
  };

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
                      activeMode === 'business' && activeBusiness?.id === ub.business.id,
                      ub
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
                    <Icon name="add" size={20} color={appTheme.colors.textSecondary} />
                  </View>
                  <Text style={styles.actionText}>Create New Business</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleJoinBusiness}
                >
                  <View style={styles.actionIconContainer}>
                    <Icon name="people" size={20} color={appTheme.colors.textSecondary} />
                  </View>
                  <Text style={styles.actionText}>Join Existing Business</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {/* Access Restriction Dialog */}
      <Modal
        visible={showAccessDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccessDialog(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogContent, { backgroundColor: appTheme.colors.cardBackground }]}>
            {/* Icon */}
            <View style={[styles.dialogIcon, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="lock-closed" size={32} color={appTheme.colors.warning} />
            </View>
            
            {/* Title */}
            <Text style={[styles.dialogTitle, { color: appTheme.colors.text }]}>
              Access Restricted
            </Text>
            
            {/* Message */}
            <Text style={[styles.dialogMessage, { color: appTheme.colors.textSecondary }]}>
              You're currently a Staff member in{' '}
              <Text style={[styles.dialogBusinessName, { color: appTheme.colors.text }]}>
                {selectedBusiness?.business.name}
              </Text>
              . Only Admins can access Business Profile mode.
            </Text>
            
            {/* Buttons */}
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonSecondary, { borderColor: appTheme.colors.border }]}
                onPress={() => setShowAccessDialog(false)}
                disabled={isLoading}
              >
                <Text style={[styles.dialogButtonTextSecondary, { color: appTheme.colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary, { backgroundColor: appTheme.colors.primary }]}
                onPress={handleRequestAccess}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.dialogButtonTextPrimary}>
                    Request Admin Access
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessAvatarPlaceholder: {
    backgroundColor: '#EDE9FE',
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
    borderBottomColor: '#ECE6DF',
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
    backgroundColor: '#FAF8F5',
  },
  profileRowActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  profileRowRestricted: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#ECE6DF',
  },
  profileRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  profileRowName: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    color: '#1C1917',
  },
  profileRowNameActive: {
    fontFamily: theme.fonts.primary.bold,
  },
  profileRowSubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.primary.regular,
    color: '#57534E',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.primary.bold,
    letterSpacing: 0.5,
  },
  staffStatusContainer: {
    marginTop: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
  },
  
  // Action Buttons
  actionsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECE6DF',
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
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fonts.primary.medium,
    color: '#1C1917',
    marginLeft: 12,
  },
  
  // Access Restriction Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  dialogIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  dialogBusinessName: {
    fontFamily: theme.fonts.primary.bold,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  dialogButtonSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  dialogButtonPrimary: {
    // backgroundColor set inline
  },
  dialogButtonTextSecondary: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
  },
  dialogButtonTextPrimary: {
    fontSize: 15,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#FFFFFF',
  },
});

export default ProfileSwitcher;

