import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Share, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { inviteUrl } from '@/shared/config/urls';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { AppButton, AppTextField, ChipGroup, SectionTitle } from '@/shared/components/ui';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import {
  inviteStaff,
  getCompanyInvites,
  revokeCompanyInvite,
  type TeamMemberRole,
  type CompanyInvite,
} from '../team.service';
import { getLocations, type BusinessLocation } from '@/features/locations/locations.service';

// The invite form + pending email-invites list. Backed by the CompanyInvite table: inviting
// an address with no account records a pending invite (consumed automatically at signup);
// inviting an existing account creates an 'invited' membership and pushes them. The share
// link below is kept as a lightweight alternative (open → request to join → admin approves).
export default function InviteStaffScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id;

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<TeamMemberRole>('staff');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CompanyInvite[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const inviteLink = inviteUrl(companyId || 'company');

  const loadData = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [locs, invites] = await Promise.all([
        getLocations(companyId).catch(() => [] as BusinessLocation[]),
        getCompanyInvites(companyId).catch(() => [] as CompanyInvite[]),
      ]);
      setLocations(locs || []);
      setPendingInvites(invites || []);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShareLink = async () => {
    try {
      await Share.share({ message: `Join our team on NouPro! ${inviteLink}`, url: inviteLink });
    } catch {
      AppAlert.alert('Share Link', inviteLink);
    }
  };

  const handleInvite = async () => {
    if (!companyId || submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      AppAlert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    // Staff and admins must be assigned to at least one location (the backend enforces this).
    if (selectedLocationIds.length === 0) {
      AppAlert.alert('Pick a location', 'Choose at least one location for this person.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await inviteStaff(companyId, trimmedEmail, name.trim(), role, selectedLocationIds);
      setEmail('');
      setName('');
      setSelectedLocationIds([]);
      await loadData();
      AppAlert.alert(
        'Invitation sent',
        res?.pending
          ? `We'll add ${trimmedEmail} to your team automatically when they sign up with this email.`
          : `${trimmedEmail} has been invited and notified.`,
      );
    } catch (err) {
      AppAlert.alert('Could not invite', getApiErrorMessage(err, 'Failed to send the invitation.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = (invite: CompanyInvite) => {
    if (!companyId) return;
    AppAlert.alert('Revoke invite', `Revoke the invitation to ${invite.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await revokeCompanyInvite(companyId, invite.id);
            await loadData();
          } catch (err) {
            AppAlert.alert('Error', getApiErrorMessage(err, 'Could not revoke the invitation.'));
          }
        },
      },
    ]);
  };

  const roleOptions = [
    { value: 'staff', label: 'Staff' },
    { value: 'admin', label: 'Admin' },
  ];
  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Invite Staff"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Go back' }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <SectionTitle style={styles.firstSection}>Invite by email</SectionTitle>
        <AppTextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="person@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppTextField
          label="Name (optional)"
          value={name}
          onChangeText={setName}
          placeholder="Their name"
        />

        <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>Role</Text>
        <ChipGroup options={roleOptions} value={role} onChange={(v) => setRole(v as TeamMemberRole)} />

        <Text style={[styles.fieldLabel, { color: appTheme.colors.text }]}>Locations</Text>
        {loading ? (
          <ActivityIndicator color={appTheme.colors.primary} style={styles.inlineLoader} />
        ) : locationOptions.length === 0 ? (
          <Text style={[styles.helperText, { color: appTheme.colors.textSecondary }]}>
            Add a location first so you can assign staff to it.
          </Text>
        ) : (
          <ChipGroup multiple options={locationOptions} value={selectedLocationIds} onChange={setSelectedLocationIds} />
        )}

        <AppButton
          title="Send invitation"
          onPress={handleInvite}
          loading={submitting}
          disabled={submitting || locationOptions.length === 0}
          fullWidth
          style={styles.submitButton}
        />

        {/* Pending email invites */}
        {pendingInvites.length > 0 && (
          <View style={styles.pendingSection}>
            <SectionTitle style={styles.sectionSpacing}>Pending invites</SectionTitle>
            {pendingInvites.map((invite) => (
              <View
                key={invite.id}
                style={[styles.pendingRow, { borderBottomColor: appTheme.colors.borderColor }]}
              >
                <View style={styles.pendingInfo}>
                  <Text style={[styles.pendingEmail, { color: appTheme.colors.text }]}>{invite.email}</Text>
                  <Text style={[styles.pendingMeta, { color: appTheme.colors.textSecondary }]}>
                    {invite.role === 'admin' ? 'Admin' : 'Staff'} · invited
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRevoke(invite)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.revokeText, { color: appTheme.colors.error }]}>Revoke</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Share-link alternative */}
        <View style={styles.linkSection}>
          <SectionTitle style={styles.sectionSpacing}>Or share a join link</SectionTitle>
          <Text style={[styles.helperText, { color: appTheme.colors.textSecondary }]}>
            The recipient opens the link, requests to join, and you approve them in Team Management.
          </Text>
          <AppButton
            title="Share invite link"
            onPress={handleShareLink}
            iconLeft="link-outline"
            variant="secondary"
            fullWidth
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  firstSection: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.semiBold,
    marginTop: 16,
    marginBottom: 8,
  },
  inlineLoader: { alignSelf: 'flex-start', marginVertical: 8 },
  helperText: {
    fontSize: 13,
    fontFamily: theme.fonts.primary.regular,
    lineHeight: 18,
    marginBottom: 8,
  },
  submitButton: { marginTop: 24 },
  pendingSection: { marginTop: 32 },
  sectionSpacing: { marginBottom: 8 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pendingInfo: { flex: 1 },
  pendingEmail: { fontSize: 15, fontFamily: theme.fonts.primary.semiBold },
  pendingMeta: { fontSize: 13, fontFamily: theme.fonts.primary.regular, marginTop: 2 },
  revokeText: { fontSize: 14, fontFamily: theme.fonts.primary.semiBold },
  linkSection: { marginTop: 36 },
});
