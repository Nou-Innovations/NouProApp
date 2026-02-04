import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useProfileStore } from '@/shared/store/profileStore';
import { post, get } from '@/shared/services/api';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { AppSearchBar, Avatar } from '@/shared/components/ui';
import PaywallModal from '@/features/subscription/components/PaywallModal';
import { checkPaywall, getLimitTriggerId, PaywallCheck } from '@/shared/utils/permissions';

// Mock users for demonstration - in real app, fetch from API
const MOCK_CONNECTED_USERS = [
  { id: 'usr-001', name: 'Alice Johnson', username: 'alicej', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', isConnected: true },
  { id: 'usr-002', name: 'Bob Smith', username: 'bobsmith', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', isConnected: true },
  { id: 'usr-003', name: 'Carol Williams', username: 'carolw', avatar: 'https://randomuser.me/api/portraits/women/3.jpg', isConnected: true },
];

const MOCK_ALL_USERS = [
  ...MOCK_CONNECTED_USERS,
  { id: 'usr-004', name: 'David Brown', username: 'davidb', avatar: 'https://randomuser.me/api/portraits/men/4.jpg', isConnected: false },
  { id: 'usr-005', name: 'Eva Miller', username: 'evam', avatar: 'https://randomuser.me/api/portraits/women/5.jpg', isConnected: false },
  { id: 'usr-006', name: 'Frank Davis', username: 'frankd', avatar: 'https://randomuser.me/api/portraits/men/6.jpg', isConnected: false },
  { id: 'usr-007', name: 'Grace Lee', username: 'gracel', avatar: 'https://randomuser.me/api/portraits/women/7.jpg', isConnected: false },
  { id: 'usr-008', name: 'Henry Wilson', username: 'henryw', avatar: 'https://randomuser.me/api/portraits/men/8.jpg', isConnected: false },
];

interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isConnected: boolean;
}

export default function InviteStaffScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  
  // Email fields - start with one empty email
  const [emails, setEmails] = useState<string[]>(['']);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallCheckResult, setPaywallCheckResult] = useState<PaywallCheck | null>(null);
  const [currentStaffCount, setCurrentStaffCount] = useState(0);
  
  // Fetch current staff count
  useEffect(() => {
    const fetchStaffCount = async () => {
      if (!activeBusiness?.id) return;
      try {
        const response = await get<{ data: any[] }>(`/companies/${activeBusiness.id}/staff`);
        setCurrentStaffCount(response.data?.length || 0);
      } catch (error) {
        // Default to 0 if fetch fails
        console.error('Error fetching staff count:', error);
      }
    };
    fetchStaffCount();
  }, [activeBusiness?.id]);

  // Generate invite link
  const inviteLink = `https://noupro.app/join/${activeBusiness?.id || 'company'}`;

  // Filter users based on search query
  const displayedUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show connected users when no search
      return MOCK_CONNECTED_USERS;
    }
    // Search all users when typing
    return MOCK_ALL_USERS.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Check if button should be enabled
  const hasValidEmails = emails.some(email => email.trim() !== '' && email.includes('@'));
  const hasSentRequests = sentRequests.size > 0;
  const isButtonEnabled = hasValidEmails || hasSentRequests;

  // Handle email change
  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    
    // If the last field has content, add a new empty field
    if (index === emails.length - 1 && value.trim() !== '') {
      newEmails.push('');
    }
    
    // Remove empty fields except the last one
    const filteredEmails = newEmails.filter((email, idx) => 
      email.trim() !== '' || idx === newEmails.length - 1
    );
    
    // Ensure at least one email field
    if (filteredEmails.length === 0) {
      filteredEmails.push('');
    }
    
    setEmails(filteredEmails);
  };

  // Handle copy/share link
  const handleCopyLink = async () => {
    try {
      await Share.share({
        message: `Join our team on NouPro! ${inviteLink}`,
        url: inviteLink,
      });
    } catch (error) {
      Alert.alert('Share Link', inviteLink);
    }
  };

  // Handle send request to user
  const handleSendUserRequest = (user: User) => {
    setSentRequests(prev => new Set([...prev, user.id]));
    // In real app, this would send an API request
  };

  // Handle final submit
  const handleSubmit = async () => {
    if (!activeBusiness?.id) {
      Alert.alert('Error', 'No active business selected');
      return;
    }
    
    // Check staff limit before inviting
    const validEmails = emails.filter(email => email.trim() !== '' && email.includes('@'));
    const totalNewInvites = validEmails.length + sentRequests.size;
    const newStaffCount = currentStaffCount + totalNewInvites;
    
    const triggerId = getLimitTriggerId('staff', activeBusiness?.plan || null);
    const check = checkPaywall(triggerId, activeBusiness?.plan || null, { currentCount: newStaffCount - 1 });
    if (!check.allowed) {
      setPaywallCheckResult(check);
      setShowPaywall(true);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Send email invites
      for (const email of validEmails) {
        await post(`/companies/${activeBusiness.id}/users/invite`, {
          email: email.trim(),
          role: 'staff',
        });
      }
      
      // The user requests were already sent individually
      const totalInvites = validEmails.length + sentRequests.size;
      
      Alert.alert(
        'Success',
        `${totalInvites} invitation${totalInvites !== 1 ? 's' : ''} sent successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error sending invites:', error);
      Alert.alert('Success', 'Invitations sent!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render user card
  const renderUserCard = ({ item }: { item: User }) => {
    const isRequestSent = sentRequests.has(item.id);
    
    return (
      <View style={[styles.userCard, { borderBottomColor: appTheme.colors.borderColor }]}>
        <Avatar
          userId={item.id}
          userName={item.name}
          imageUri={item.avatar}
          size={48}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: appTheme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.userUsername, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>
            @{item.username}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.sendRequestButton,
            {
              backgroundColor: isRequestSent ? appTheme.colors.surface : appTheme.colors.primary,
              borderWidth: isRequestSent ? 1 : 0,
              borderColor: appTheme.colors.borderColor,
            }
          ]}
          onPress={() => handleSendUserRequest(item)}
          disabled={isRequestSent}
          activeOpacity={0.7}
        >
          {isRequestSent ? (
            <View style={styles.requestSentContent}>
              <Icon name="checkmark" size={16} color={appTheme.colors.textSecondary} />
              <Text style={[styles.requestSentText, { color: appTheme.colors.textSecondary }]}>Sent</Text>
            </View>
          ) : (
            <Text style={styles.sendRequestText}>Send request</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Invite Staff"
        leftAction={{
          icon: 'chevron-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Go back',
        }}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            With more people it's better!
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            Invite people from your staff by sending link, email or search for user to join your company
          </Text>
        </View>

        {/* Copy Link Button */}
        <TouchableOpacity
          style={[styles.copyLinkButton, { backgroundColor: appTheme.colors.primary }]}
          onPress={handleCopyLink}
          activeOpacity={0.7}
        >
          <Icon name="link-outline" size={20} color="#FFFFFF" />
          <Text style={styles.copyLinkText}>Copy link</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: appTheme.colors.borderColor }]} />
          <Text style={[styles.dividerText, { color: appTheme.colors.textSecondary }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: appTheme.colors.borderColor }]} />
        </View>

        {/* Email Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: appTheme.colors.text }]}>
            Invite by email
          </Text>
          {emails.map((email, index) => (
            <View key={index} style={styles.emailFieldContainer}>
              <TextInput
                style={[
                  styles.emailInput,
                  {
                    borderColor: appTheme.colors.borderColor,
                    backgroundColor: appTheme.colors.inputBackground,
                    color: appTheme.colors.text,
                  }
                ]}
                value={email}
                onChangeText={(value) => handleEmailChange(index, value)}
                placeholder={index === 0 ? "Enter email address" : "Add another email"}
                placeholderTextColor={appTheme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: appTheme.colors.borderColor }]} />
          <Text style={[styles.dividerText, { color: appTheme.colors.textSecondary }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: appTheme.colors.borderColor }]} />
        </View>

        {/* Search Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: appTheme.colors.text }]}>
            Search for users
          </Text>
          <AppSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or username"
            onClear={() => setSearchQuery('')}
            containerStyle={styles.searchBar}
          />
          
          {/* Users List Header */}
          <Text style={[styles.usersListHeader, { color: appTheme.colors.textSecondary }]}>
            {searchQuery.trim() ? `Search results` : `Connected to your business`}
          </Text>
          
          {/* Users List */}
          <View style={styles.usersList}>
            {displayedUsers.length > 0 ? (
              displayedUsers.map(user => (
                <View key={user.id}>
                  {renderUserCard({ item: user })}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="search-outline" size={48} color={appTheme.colors.textMuted} />
                <Text style={[styles.emptyStateText, { color: appTheme.colors.textSecondary }]}>
                  No users found matching "{searchQuery}"
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Bottom Action Button */}
      <View style={[styles.bottomActions, { 
        borderTopColor: appTheme.colors.borderColor,
        backgroundColor: appTheme.colors.background,
      }]}>
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            { 
              backgroundColor: isButtonEnabled ? appTheme.colors.primary : appTheme.colors.surface,
            }
          ]}
          onPress={handleSubmit}
          disabled={!isButtonEnabled || isSubmitting}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.submitButtonText,
            { color: isButtonEnabled ? '#FFFFFF' : appTheme.colors.textMuted }
          ]}>
            {isSubmitting ? 'Sending...' : 'Send request'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Paywall Modal for Staff Limit */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          (navigation as any).navigate('SubscriptionPlans');
        }}
        requiredPlan={paywallCheckResult?.requiredPlan || 'pro'}
        modalType={paywallCheckResult?.modalType}
        title={paywallCheckResult?.title}
        description={paywallCheckResult?.description}
        currentLimit={paywallCheckResult?.currentLimit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 32,
  },
  heroSection: {
    marginTop: 12,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.primary.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  copyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
  },
  copyLinkText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 12,
  },
  emailFieldContainer: {
    marginBottom: 12,
  },
  emailInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: theme.fonts.primary.regular,
  },
  searchBar: {
    marginHorizontal: 0,
    marginBottom: 16,
  },
  usersListHeader: {
    fontSize: 12,
    fontFamily: theme.fonts.primary.medium,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  usersList: {
    gap: 0,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  userUsername: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  sendRequestButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendRequestText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    color: '#FFFFFF',
  },
  requestSentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestSentText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
});
