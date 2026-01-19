/**
 * UserProfileScreen - Viewing OTHER users' personal profiles
 * UI/UX matches PersonalProfileScreen design
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Alert, Share } from 'react-native';
import { mockUser, mockUserCompany, mockUserProfileDetails } from '@/shared/data/userProfile';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { userAvatarService } from '@/shared/services/userAvatarService';
import Avatar from '@/shared/components/ui/Avatar';
import { AppBottomSheet, ListItemCard } from '@/shared/components/ui';
import { useProfileViewType } from '@/shared/hooks/useProfileViewType';
import { ProfileViewType, getProfileAdditionalOptions } from '@/shared/types/profile';
import theme from '@/shared/theme';

interface UserProfileScreenProps {
  navigation: any;
  route: {
    params: {
      userId?: string;
    };
  };
}

export default function UserProfileScreen({ navigation, route }: UserProfileScreenProps) {
  const { theme: appTheme } = useTheme();
  const userId = route.params?.userId || '1';

  // Local state
  const [isMoreOptionsVisible, setIsMoreOptionsVisible] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Determine profile view type using the hook
  const { viewType, isOwnProfile, canEdit, showAdditionalOptions } = useProfileViewType({
    profileId: userId,
    profileType: 'user',
  });

  useEffect(() => {
    const initializeService = async () => {
      try {
        await userAvatarService.initialize();
      } catch (error) {
        console.error('Error initializing userAvatarService:', error);
      }
    };

    initializeService();
  }, []);

  const handleCompanyPress = () => {
    if (navigation && mockUserCompany?.id) {
      navigation.push('ViewBusinessProfile', { businessId: mockUserCompany.id });
    }
  };

  const handlePhonePress = () => {
    if (mockUserProfileDetails?.phone) {
      Linking.openURL(`tel:${mockUserProfileDetails.phone}`);
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
        name: mockUser.name,
        avatar: mockUser.avatar,
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
          message: `Check out ${mockUser.name}'s profile on NouPro!`,
          title: 'Share Profile',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Connect with user
      Alert.alert('Connect', `Send a connection request to ${mockUser.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: () => console.log('Connection sent') },
      ]);
    }
  };

  // Action menu items for bottom sheet
  const moreOptionsItems = getProfileAdditionalOptions(viewType).map((option) => ({
    id: option.toLowerCase().replace(/\s/g, '-'),
    title: option,
    isDestructive: option === 'Block',
    icon: option === 'Block' ? 'slash' : option === 'Report' ? 'flag' : option === 'Share Profile' ? 'share' : 'ellipsis-horizontal',
  }));

  const handleMoreOptionAction = (title: string) => {
    console.log(`${title} pressed for user ${userId}`);
    setIsMoreOptionsVisible(false);
    if (title === 'Block') {
      Alert.alert('Block User', `Are you sure you want to block ${mockUser.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => console.log('Blocked') },
      ]);
    } else if (title === 'Report') {
      Alert.alert('Report', `Report ${mockUser.name} for inappropriate content?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', onPress: () => console.log('Reported') },
      ]);
    } else if (title === 'Share') {
      handleShareProfile();
    }
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${mockUser.name}'s profile on NouPro!`,
        title: 'Share Profile',
      });
    } catch (error) {
      console.error('Error sharing:', error);
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

  // Render profile section - matching PersonalProfileScreen design
  const renderProfileSection = () => (
    <View style={styles.profileSection}>
      {/* Avatar on the left - 80x80 */}
      <View style={styles.profileTopRow}>
        <View style={styles.avatarContainer}>
          <Avatar
            userId={userId}
            userName={mockUser.name}
            imageUri={mockUser.avatar}
            size={80}
          />
        </View>
      </View>

      {/* Name - 24px bold, left aligned */}
      <Text style={[styles.userName, { color: appTheme.colors.text }]}>
        {mockUser.name}
      </Text>

      {/* Job title - 16px medium, secondary color */}
      <Text style={[styles.jobStatus, { color: appTheme.colors.secondary }]}>
        {mockUserProfileDetails.position || mockUser.role}
      </Text>

      {/* Description - expandable */}
      {mockUserProfileDetails.about ? (
        <TouchableOpacity 
          onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          activeOpacity={0.7}
        >
          <Text 
            style={[styles.description, { color: appTheme.colors.secondary }]}
            numberOfLines={isDescriptionExpanded ? undefined : 2}
          >
            {mockUserProfileDetails.about}
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
            {(mockUser as any).connections_count ?? 128}
          </Text>
          <Text style={[styles.socialStatLabel, { color: appTheme.colors.secondary }]}>
            Connections
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons - Message and Connect */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={handlePrimaryAction}
        >
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleSecondaryAction}
        >
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Format date for experience
  const formatExperienceDate = (dateString?: string) => {
    if (!dateString) return 'Present';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Render Experience section
  const renderExperienceSection = () => {
    if (!mockUserCompany) return null;

    // Mock date range for the user's experience
    const startDate = mockUserProfileDetails.joined || '2022-01-15';

    return (
      <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          Experience
        </Text>

        <TouchableOpacity
          style={styles.experienceCard}
          onPress={handleCompanyPress}
        >
          <Avatar
            userId={mockUserCompany.id}
            userName={mockUserCompany.name}
            imageUri={mockUserCompany.logo}
            size={48}
          />
          <View style={styles.experienceInfo}>
            <Text style={[styles.experienceName, { color: appTheme.colors.text }]}>
              {mockUserCompany.name}
            </Text>
            <Text style={[styles.experienceRole, { color: appTheme.colors.textLight }]}>
              {mockUserProfileDetails.position || mockUser.role}
            </Text>
            <Text style={[styles.experienceDate, { color: appTheme.colors.textMuted }]}>
              {formatExperienceDate(startDate)} - Present
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  // Render About section - Contact Information
  const renderAboutSection = () => {
    const hasContactInfo = mockUser.email || mockUserProfileDetails.phone || mockUserProfileDetails.address;
    if (!hasContactInfo) return null;

    return (
      <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
          About
        </Text>

        {mockUser.email && (
          <View style={styles.aboutItem}>
            <Icon name="mail-outline" size={20} color={appTheme.colors.textSecondary} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Email</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>{mockUser.email}</Text>
            </View>
          </View>
        )}

        {mockUserProfileDetails.phone && (
          <TouchableOpacity style={styles.aboutItem} onPress={handlePhonePress}>
            <Icon name="call-outline" size={20} color={appTheme.colors.textSecondary} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Phone</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.info }]}>{mockUserProfileDetails.phone}</Text>
            </View>
          </TouchableOpacity>
        )}

        {mockUserProfileDetails.address && (
          <View style={styles.aboutItem}>
            <Icon name="location-outline" size={20} color={appTheme.colors.textSecondary} />
            <View style={styles.aboutItemContent}>
              <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Address</Text>
              <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>{mockUserProfileDetails.address}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render Other Details section
  const renderOtherDetailsSection = () => (
    <View style={[styles.section, { backgroundColor: appTheme.colors.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>
        Other Details
      </Text>
      <View style={styles.aboutItem}>
        <Icon name="calendar-outline" size={20} color={appTheme.colors.textSecondary} />
        <View style={styles.aboutItemContent}>
          <Text style={[styles.aboutLabel, { color: appTheme.colors.textSecondary }]}>Joined</Text>
          <Text style={[styles.aboutValue, { color: appTheme.colors.text }]}>{mockUserProfileDetails.joined}</Text>
        </View>
      </View>
    </View>
  );

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
      >
        {moreOptionsItems.map((item, index) => (
          <ListItemCard
            key={item.id}
            avatar={{
              type: 'icon',
              icon: item.icon,
              iconColor: item.isDestructive ? appTheme.colors.error : appTheme.colors.text,
              backgroundColor: item.isDestructive ? `${appTheme.colors.error}15` : appTheme.colors.surface,
            }}
            title={item.title}
            onPress={() => handleMoreOptionAction(item.title)}
            showDivider={index < moreOptionsItems.length - 1}
          />
        ))}
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderColor: '#000000',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: theme.fonts.primary.bold,
  },
  connectButton: {
    flex: 1,
    backgroundColor: '#000000',
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
  // Bottom sheet action styles
  bottomSheetAction: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  bottomSheetActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
