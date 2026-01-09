import React, { useEffect, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Linking, Alert, Share } from 'react-native';
import { mockUser, mockUserCompany, mockUserProfileDetails } from '@/shared/data/userProfile';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { userAvatarService } from '@/shared/services/userAvatarService';
import Avatar from '@/shared/components/ui/Avatar';
import BusinessCard from '@/features/profile/components/BusinessCard';
import ProfileActionButtons from '@/features/profile/components/ProfileActionButtons';
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

// Accept navigation prop and route for navigating to business profile
export default function UserProfileScreen({ navigation, route }: UserProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme: appTheme } = useTheme();
  // TODO: Use userId to fetch real user data
  const userId = route.params?.userId || '1';

  // Determine profile view type using the hook
  // Since this screen is for viewing OTHER users, we pass the userId
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
    // Navigate to Business Profile, passing the business ID
    if (navigation && mockUserCompany?.id) {
      navigation.push('ViewBusinessProfile', { businessId: mockUserCompany.id });
    }
  };

  const handlePhonePress = () => {
    if (mockUserProfileDetails?.phone) {
      Linking.openURL(`tel:${mockUserProfileDetails.phone}`);
    }
  };

  // Profile action handlers based on ProfileViewType
  const handlePrimaryAction = () => {
    if (viewType === ProfileViewType.SELF_PROFILE) {
      // Edit profile
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
      // Share profile
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

  const handleMoreOptions = () => {
    const options = getProfileAdditionalOptions(viewType);
    Alert.alert('Options', 'Select an action', [
      ...options.map((option) => ({
        text: option,
        onPress: () => console.log(`${option} pressed for user ${userId}`),
        style: option === 'Block' ? 'destructive' as const : 'default' as const,
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top', 'bottom']}>
      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-back" size={24} color={appTheme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Avatar
              userId={userId}
              userName={mockUser.name}
              imageUri={mockUser.avatar}
              size={110}
              style={{ borderColor: appTheme.colors.cardBackground, borderWidth: 4, borderRadius: 55 }}
            />
          </View>
          <Text style={[styles.userName, { color: appTheme.colors.text }]}>{mockUser.name}</Text>
          <Text style={[styles.userRole, { color: appTheme.colors.textLight }]}>{mockUserProfileDetails.position || mockUser.role}</Text>
          
          {/* Profile Action Buttons - Based on ProfileViewType */}
          <ProfileActionButtons
            viewType={viewType}
            onPrimaryPress={handlePrimaryAction}
            onSecondaryPress={handleSecondaryAction}
            onMoreOptionsPress={showAdditionalOptions ? handleMoreOptions : undefined}
            style={styles.actionButtons}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>About</Text>
          <Text style={[styles.aboutText, { color: appTheme.colors.textLight }]}>{mockUserProfileDetails.about}</Text>
        </View>

        {/* Business Card */}
        <BusinessCard
          businessName={mockUserCompany.name}
          businessLogo={mockUserCompany.logo}
          businessLocation={mockUserCompany.locations[0]?.address || 'No location available'}
          onPress={handleCompanyPress}
        />

        {/* Contact Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>Contact Information</Text>
          <View style={styles.contactItem}>
            <Icon name="mail-outline" size={20} color={appTheme.colors.textLight} style={styles.contactIcon} />
            <Text style={[styles.contactText, { color: appTheme.colors.textLight }]}>{mockUser.email}</Text>
          </View>
          <TouchableOpacity style={styles.contactItem} onPress={handlePhonePress}>
            <Icon name="call-outline" size={20} color={appTheme.colors.textLight} style={styles.contactIcon} />
            <Text style={[styles.contactLinkText, { color: appTheme.colors.accent }]}>{mockUserProfileDetails.phone}</Text>
          </TouchableOpacity>
          <View style={styles.contactItem}>
            <Icon name="location-outline" size={20} color={appTheme.colors.textLight} style={styles.contactIcon} />
            <Text style={[styles.contactText, { color: appTheme.colors.textLight }]}>{mockUserProfileDetails.address}</Text>
          </View>
        </View>
        
        {/* Other Details Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>Other Details</Text>
          <View style={styles.contactItem}>
            <Icon name="calendar-outline" size={20} color={appTheme.colors.textLight} style={styles.contactIcon} />
            <Text style={[styles.contactText, { color: appTheme.colors.textLight }]}>Joined: {mockUserProfileDetails.joined}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 8,
    justifyContent: 'flex-start',
    backgroundColor: 'red',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  avatarContainer: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 8,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  userRole: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  actionButtons: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactIcon: {
    marginRight: 12,
  },
  contactText: {
    flex: 1,
    fontSize: 15,
  },
  contactLinkText: {
    flex: 1,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
}); 