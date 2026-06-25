import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Share, ActivityIndicator } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { post, get } from '@/shared/services/api';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { AppSearchBar, Avatar, AppButton } from '@/shared/components/ui';
import PaywallModal from '@/shared/components/ui/PaywallModal';
import { checkPaywall, getLimitTriggerId, PaywallCheck } from '@/shared/utils/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function InviteStaffScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentLocation = useBusinessStore((state) => state.currentLocation);

  // Email fields - start with one empty email
  const [emails, setEmails] = useState<string[]>(['']);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedUserIds, setAddedUserIds] = useState<Set<string>>(new Set());
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
        const members = await get<any[]>(`/companies/${activeBusiness.id}/staff`);
        setCurrentStaffCount(Array.isArray(members) ? members.length : 0);
      } catch {
        // Default to 0 if fetch fails
      }
    };
    fetchStaffCount();
  }, [activeBusiness?.id]);

  // Search users with debounce
  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await get<User[]>('/users/search', { q });
      setSearchResults(Array.isArray(results) ? results : []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Generate invite link
  const inviteLink = `https://noupro.app/join/${activeBusiness?.id || 'company'}`;

  // Check if button should be enabled
  const hasValidEmails = emails.some(email => email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
  const isButtonEnabled = hasValidEmails;

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
      AppAlert.alert('Share Link', inviteLink);
    }
  };

  // Add a searched user's email to the invite list
  const handleSendUserRequest = (user: User) => {
    if (!user.email) return;
    setAddedUserIds(prev => new Set([...prev, user.id]));
    // Add their email to the email invite list if not already there
    setEmails(prev => {
      if (prev.includes(user.email)) return prev;
      const withoutEmpty = prev.filter(e => e.trim() !== '');
      return [...withoutEmpty, user.email, ''];
    });
  };

  // Handle final submit
  const handleSubmit = async () => {
    if (!activeBusiness?.id) {
      AppAlert.alert('Error', 'No active business selected');
      return;
    }
    
    // Check staff limit before inviting (deduplicate to avoid double-inviting the same address)
    const validEmails = [...new Set(
      emails
        .map(email => email.trim())
        .filter(email => email !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )];
    const totalNewInvites = validEmails.length;
    const newStaffCount = currentStaffCount + totalNewInvites;
    
    const triggerId = getLimitTriggerId('staff', activeBusiness?.plan || null);
    const check = checkPaywall(triggerId, activeBusiness?.plan || null, { currentCount: newStaffCount - 1 });
    if (!check.allowed) {
      setPaywallCheckResult(check);
      setShowPaywall(true);
      return;
    }

    if (!currentLocation?.id) {
      AppAlert.alert('Error', 'No location selected. Please select a location first.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send email invites
      for (const email of validEmails) {
        await post(`/companies/${activeBusiness.id}/users/invite`, {
          email,
          role: 'staff',
          locationIds: currentLocation?.id ? [currentLocation.id] : [],
        });
      }
      
      const totalInvites = validEmails.length;
      
      AppAlert.alert(
        'Success',
        `${totalInvites} invitation${totalInvites !== 1 ? 's' : ''} sent successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error sending invites:', error);
      AppAlert.alert('Error', 'Failed to send invitations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render user card
  const renderUserCard = ({ item }: { item: User }) => {
    const isAdded = addedUserIds.has(item.id);

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
            {item.email}
          </Text>
        </View>
        <AppButton
          title={isAdded ? 'Added' : 'Add to invite'}
          onPress={() => handleSendUserRequest(item)}
          disabled={isAdded}
          variant={isAdded ? 'outline' : 'primary'}
          size="small"
          iconLeft={isAdded ? 'checkmark' : undefined}
          style={styles.sendRequestButton}
        />
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
        <AppButton
          title="Copy link"
          onPress={handleCopyLink}
          iconLeft="link-outline"
          fullWidth
          style={styles.copyLinkButton}
        />

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
            placeholder="Search by name or email"
            onClear={() => { setSearchQuery(''); setSearchResults([]); }}
            containerStyle={styles.searchBar}
          />

          {/* Users List */}
          <View style={styles.usersList}>
            {isSearching ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color={appTheme.colors.primary} />
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map(user => (
                <View key={user.id}>
                  {renderUserCard({ item: user })}
                </View>
              ))
            ) : searchQuery.trim() ? (
              <View style={styles.emptyState}>
                <Icon name="search-outline" size={48} color={appTheme.colors.textMuted} />
                <Text style={[styles.emptyStateText, { color: appTheme.colors.textSecondary }]}>
                  No users found matching "{searchQuery}"
                </Text>
              </View>
            ) : (
              <Text style={[styles.emptyStateText, { color: appTheme.colors.textMuted }]}>
                Type a name or email to search for users
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Bottom Action Button */}
      <View style={[styles.bottomActions, {
        borderTopColor: appTheme.colors.borderColor,
        backgroundColor: appTheme.colors.background,
      }]}>
        <AppButton
          title="Send request"
          onPress={handleSubmit}
          fullWidth
          loading={isSubmitting}
          disabled={!isButtonEnabled || isSubmitting}
        />
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
    marginBottom: 24,
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
    minWidth: 110,
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
});
