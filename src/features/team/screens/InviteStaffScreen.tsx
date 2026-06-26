import React from 'react';
import { View, Text, StyleSheet, ScrollView, Share } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { AppButton } from '@/shared/components/ui';

// NOTE (R4): the invite-by-email flow was removed — it never actually sent email, so
// invitees were never notified. The working path is sharing this link: the recipient opens
// it, requests to join, and an admin approves the request in Team Management. Real
// email-based invites are deferred (see APP_AUDIT_2026-06-26.md §5).
export default function InviteStaffScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);

  const inviteLink = `https://noupro.app/join/${activeBusiness?.id || 'company'}`;

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

  const steps: { icon: string; title: string; description: string }[] = [
    {
      icon: 'share-social-outline',
      title: 'Share the link',
      description: 'Send the invite link to the people you want on your team.',
    },
    {
      icon: 'person-add-outline',
      title: 'They request to join',
      description: 'When they open the link they ask to join your company.',
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'You approve them',
      description: 'Approve pending requests in Team Management to add them.',
    },
  ];

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
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.title, { color: appTheme.colors.text }]}>
            With more people it's better!
          </Text>
          <Text style={[styles.subtitle, { color: appTheme.colors.textSecondary }]}>
            Share your invite link so people can request to join your company.
          </Text>
        </View>

        {/* Copy Link Button */}
        <AppButton
          title="Share invite link"
          onPress={handleCopyLink}
          iconLeft="link-outline"
          fullWidth
          style={styles.copyLinkButton}
        />

        {/* How it works */}
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View
              key={step.title}
              style={[
                styles.stepRow,
                index < steps.length - 1 && { borderBottomColor: appTheme.colors.borderColor, borderBottomWidth: 1 },
              ]}
            >
              <View style={[styles.stepIcon, { backgroundColor: `${appTheme.colors.primary}15` }]}>
                <Icon name={step.icon} size={22} color={appTheme.colors.primary} />
              </View>
              <View style={styles.stepText}>
                <Text style={[styles.stepTitle, { color: appTheme.colors.text }]}>{step.title}</Text>
                <Text style={[styles.stepDescription, { color: appTheme.colors.textSecondary }]}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    marginBottom: 32,
  },
  steps: {
    paddingHorizontal: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 20,
  },
});
