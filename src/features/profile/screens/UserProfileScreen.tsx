/**
 * UserProfileScreen - Viewing OTHER users' personal profiles
 * UI/UX matches PersonalProfileScreen design
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Alert, Share, ActivityIndicator } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonRow, SkeletonColumn } from '@/shared/components/ui/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { userAvatarService } from '@/shared/services/userAvatarService';
import Avatar from '@/shared/components/ui/Avatar';
import { AppBottomSheet, type AppBottomSheetItem } from '@/shared/components/ui';
import { useProfileViewType } from '@/shared/hooks/useProfileViewType';
import { ProfileViewType, getProfileAdditionalOptions, getRelationshipAction } from '@/shared/types/profile';
import { useProfileStore } from '@/shared/store/profileStore';
import { get as apiGet, post as apiPost } from '@/shared/services/api';
import theme from '@/shared/theme';

interface UserProfileScreenProps {
  navigation: any;
  route: {
    params: {
      userId?: string;
    };
  };
}

interface UserProfileData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  jobTitle?: string;
  description?: string;
  address?: string;
  connectionsCount?: number;
  connectionStatus?: { id: string; status: string; direction: string } | null;
  experiences?: {
    business_id: string;
    business_name: string;
    business_logo?: string;
    role: string;
    started_at?: string;
  }[];
  createdAt?: string;
}

export default function UserProfileScreen({ navigation, route }: UserProfileScreenProps) {
  const { theme: appTheme } = useTheme();
  const userId = route.params?.userId || '1';

  // Data state
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [isMoreOptionsVisible, setIsMoreOptionsVisible] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  // Determine profile view type using the hook
  const { viewType, isOwnProfile, canEdit, showAdditionalOptions } = useProfileViewType({
    profileId: userId,
    profileType: 'user',
  });

  // Relationship button rule (see docs/PROFILES.md):
  // personal mode → Connect (person↔person); business mode → no button (a business
  // does not connect with a person).
  const activeMode = useProfileStore((state) => state.activeMode);
  const relationshipAction = getRelationshipAction(activeMode, 'user');
  const showConnectButton = viewType === ProfileViewType.OTHER_USER && relationshipAction === 'connect';

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<UserProfileData>(`/users/${userId}`);
      setUser(data);
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    userAvatarService.initialize().catch(console.error);
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleCompanyPress = (businessId: string) => {
    if (navigation && businessId) {
      navigation.push('ViewBusinessProfile', { businessId });
    }
  };

  const handlePhonePress = () => {
    if (user?.phone) {
      Linking.openURL(`tel:${user.phone}`);
    }
  };

  // Profile action handlers
  const handlePrimaryAction = () => {
    if (viewType === ProfileViewType.SELF_PROFILE) {
      navigation.navigate('EditPersonalProfile');
    } else {
      // Message user
      navigation.navigate('Chat', {
        id: `user-${userId}`,
        name: user?.name || 'User',
        avatar: user?.avatar,
        isGroup: false,
        partnerId: userId,
        partnerType: 'user',
        unreadCount: 0,
      });
    }
  };

  const handleSecondaryAction = async () => {
    if (viewType === ProfileViewType.SELF_PROFILE) {
      try {
        await Share.share({
          message: `Check out ${user?.name || 'this user'}'s profile on NouPro!`,
          title: 'Share Profile',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Handle connect based on current status
      const status = user?.connectionStatus;
      if (status?.status === 'accepted') {
        Alert.alert('Already Connected', `You are already connected with ${user?.name}.`);
        return;
      }
      if (status?.status === 'pending' && status.direction === 'sent') {
        Alert.alert('Request Pending', 'Your connection request is already pending.');
        return;
      }
      if (status?.status === 'pending' && status.direction === 'received') {
        // Accept the request
        Alert.alert('Accept Request', `Accept connection request from ${user?.name}?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept',
            onPress: async () => {
              try {
                setConnectLoading(true);
                await apiPost(`/connections/${status.id}/accept`, {});
                // Refresh profile to update connection status
                fetchUserProfile();
              } catch (err) {
                Alert.alert('Error', 'Failed to accept connection request.');
              } finally {
                setConnectLoading(false);
              }
            },
          },
        ]);
        return;
      }

      // Send new request
      Alert.alert('Connect', `Send a connection request to ${user?.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: async () => {
            try {
              setConnectLoading(true);
              await apiPost('/connections/request', { receiverId: userId });
              fetchUserProfile();
            } catch (err: any) {
              const msg = err?.response?.error || 'Failed to send connection request.';
              Alert.alert('Error', msg);
            } finally {
              setConnectLoading(false);
            }
          },
        },
      ]);
    }
  };

  // Get connect button label based on status
  const getConnectButtonLabel = () => {
    const status = user?.connectionStatus;
    if (!status) return 'Connect';
    if (status.status === 'accepted') return 'Connected';
    if (status.status === 'pending' && status.direction === 'sent') return 'Pending';
    if (status.status === 'pending' && status.direction === 'received') return 'Accept';
    return 'Connect';
  };

  // Action menu items for bottom sheet
  const moreOptionsItems: AppBottomSheetItem[] = getProfileAdditionalOptions(viewType).map((option) => ({
    id: option.toLowerCase().replace(/\s/g, '-'),
    title: option,
    variant: option === 'Block' ? 'destructive' : 'default',
  }));

  const handleMoreOptionAction = (title: string) => {
    setIsMoreOptionsVisible(false);
    if (title === 'Block') {
      Alert.alert('Block User', `Are you sure you want to block ${user?.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => {} },
      ]);
    } else if (title === 'Report') {
      Alert.alert('Report', `Report ${user?.name} for inappropriate content?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', onPress: () => {} },
      ]);
    } else if (title === 'Share') {
      Share.share({
        message: `Check out ${user?.name || 'this user'}'s profile on NouPro!`,
        title: 'Share Profile',
      }).catch(console.error);
    }
  };

  // Render header with back button and 3-dots menu
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Icon name="chevron-back" size={24} color={appTheme.colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setIsMoreOptionsVisible(true)}
      >
        <Icon name="ellipsis-vertical" size={24} color={appTheme.colors.text} />
      </TouchableOpacity>
    </View>
  );

  // Format date for experience
  const formatExperienceDate = (dateString?: string) => {
    if (!dateString) return 'Present';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Loading state - skeleton that mimics the user profile layout
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        {renderHeader()}
        <View style={{ paddingHorizontal: 12, paddingTop: 0 }}>
          {/* Avatar skeleton */}
          <SkeletonCircle size={80} />
          {/* Name */}
          <Skeleton width="45%" height={24} style={{ marginTop: 12 }} />
          {/* Job title */}
          <Skeleton width="30%" height={16} style={{ marginTop: 8 }} />
          {/* Description */}
          <Skeleton width="90%" height={14} style={{ marginTop: 16 }} />
          <Skeleton width="70%" height={14} style={{ marginTop: 6 }} />
          {/* Connections */}
          <SkeletonRow gap={8} style={{ marginTop: 16 }}>
            <Skeleton width={30} height={16} />
            <Skeleton width={80} height={14} />
          </SkeletonRow>
          {/* Action buttons */}
          <SkeletonRow gap={10} style={{ marginTop: 16 }}>
            <Skeleton width="48%" height={40} borderRadius={8} />
            <Skeleton width="48%" height={40} borderRadius={8} />
          </SkeletonRow>
          {/* Experience section */}
          <Skeleton width="30%" height={18} style={{ marginTop: 24 }} />
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonRow key={i} gap={12} style={{ paddingVertical: 12 }}>
              <Skeleton width={48} height={48} borderRadius={8} />
              <SkeletonColumn gap={5} style={{ flex: 1 }}>
                <Skeleton width="50%" height={16} />
                <Skeleton width="35%" height={13} />
                <Skeleton width="25%" height={12} />
              </SkeletonColumn>
            </SkeletonRow>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: appTheme.colors.secondary }]}>
            {error || 'Profile not found'}
          </Text>
          <TouchableOpacity onPress={fetchUserProfile} style={styles.retryButton}>
            <Text style={[styles.retryText, { color: appTheme.colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render profile section
  const renderProfileSection = () => (
    <View style={styles.profileSection}>
      {/* Avatar on the left - 80x80 */}
      <View style={styles.profileTopRow}>
        <View style={styles.avatarContainer}>
          <Avatar
            userId={userId}
            userName={user.name || ''}
            imageUri={user.avatar}
            size={80}
          />
        </View>
      </View>

      {/* Name - 24px bold, left aligned */}
      <Text style={[styles.userName, { color: appTheme.colors.text }]}>
        {user.name}
      </Text>

      {/* Job title - 16px medium, secondary color */}
      {user.jobTitle ? (
        <Text style={[styles.jobStatus, { color: appTheme.colors.secondary }]}>
          {user.jobTitle}
        </Text>
      ) : null}

      {/* Description - expandable */}
      {user.description ? (
        <TouchableOpacity
          onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.description, { color: appTheme.colors.secondary }]}
            numberOfLines={isDescriptionExpanded ? undefined : 2}
          >
            {user.description}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Connections Stats */}
      <View style={styles.socialStats}>
        <TouchableOpacity
          style={styles.socialStatItem}
          onPress={() => {
            navigation.navigate('Connections', { userId });
          }}
        >
          <Text style={[styles.socialStatCount, { color: appTheme.colors.text }]}>
            {user.connectionsCount ?? 0}
          </Text>
          <Text style={[styles.socialStatLabel, { color: appTheme.colors.secondary }]}>
            Connections
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons - Message + (Connect only in personal mode) */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={handlePrimaryAction}
        >
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        {showConnectButton && (
          <TouchableOpacity
            style={[
              styles.connectButton,
              user.connectionStatus?.status === 'accepted' && styles.connectedButton,
            ]}
            onPress={handleSecondaryAction}
            disabled={connectLoading}
          >
            {connectLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.connectButtonText,
                user.connectionStatus?.status === 'accepted' && styles.connectedButtonText,
              ]}>
                {getConnectButtonLabel()}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Render Experience section
  const renderExperienceSection = () => {
    if (!user.experiences || user.experiences.length === 0) return null;

    return (
      <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Experience
        </Text>

        {user.experiences.map((exp, index) => (
          <TouchableOpacity
            key={`${exp.business_id}-${index}`}
            style={styles.experienceCard}
            onPress={() => handleCompanyPress(exp.business_id)}
          >
            <Avatar
              userId={exp.business_id}
              userName={exp.business_name}
              imageUri={exp.business_logo}
              size={48}
            />
            <View style={styles.experienceInfo}>
              <Text style={[styles.experienceName, { color: appTheme.colors.text }]}>
                {exp.business_name}
              </Text>
              <Text style={[styles.experienceRole, { color: appTheme.colors.textLight }]}>
                {exp.role}
              </Text>
              <Text style={[styles.experienceDate, { color: appTheme.colors.textMuted }]}>
                {formatExperienceDate(exp.started_at)} - Present
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render About section - Contact Information
  const renderAboutSection = () => {
    const hasContactInfo = user.email || user.phone || user.address;
    if (!hasContactInfo) return null;

    return (
      <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          About
        </Text>

        {user.email && (
          <View style={styles.aboutItem}>
            <Icon name="mail-outline" size={20} color={appTheme.colors.textSecondary} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Email</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>{user.email}</Text>
            </View>
          </View>
        )}

        {user.phone && (
          <TouchableOpacity style={styles.aboutItem} onPress={handlePhonePress}>
            <Icon name="call-outline" size={20} color={appTheme.colors.textSecondary} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Phone</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.info }]}>{user.phone}</Text>
            </View>
          </TouchableOpacity>
        )}

        {user.address && (
          <View style={styles.aboutItem}>
            <Icon name="location-outline" size={20} color={appTheme.colors.textSecondary} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Address</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>{user.address}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render Other Details section
  const renderOtherDetailsSection = () => {
    if (!user.createdAt) return null;

    return (
      <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Other Details
        </Text>
        <View style={styles.aboutItem}>
          <Icon name="calendar-outline" size={20} color={appTheme.colors.textSecondary} />
          <View style={styles.aboutItemContent}>
            <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Joined</Text>
            <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>
              {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      {renderHeader()}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderProfileSection()}
        {renderExperienceSection()}
        {renderAboutSection()}
        {renderOtherDetailsSection()}

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>

      {/* More Options Bottom Sheet */}
      <AppBottomSheet
        visible={isMoreOptionsVisible}
        onClose={() => setIsMoreOptionsVisible(false)}
        title="Options"
        items={moreOptionsItems}
        mode="buttons"
        onSelectItem={(item) => handleMoreOptionAction(item.title)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  // Header styles - matching PersonalProfileScreen
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  // Profile Section - matching PersonalProfileScreen
  profileSection: {
    paddingHorizontal: 12,
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
  userName: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginTop: theme.spacing.xs,
  },
  jobStatus: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    marginTop: theme.spacing.xs,
  },
  description: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    lineHeight: 20,
    marginTop: 16,
  },
  // Social Stats - matching PersonalProfileScreen
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
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: 10,
  },
  messageButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#1C1917',
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  connectButton: {
    flex: 1,
    backgroundColor: '#1C1917',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  connectedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1C1917',
  },
  connectedButtonText: {
    color: '#1C1917',
  },
  // Section styles - matching PersonalProfileScreen
  section: {
    marginHorizontal: 12,
    marginBottom: 0,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: theme.spacing.sm,
  },
  // Experience section - matching PersonalProfileScreen
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
    gap: 12,
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
});
