import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { AppModal } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useProfileStore } from '@/shared/store/profileStore';
import { getCertifications, updateCertification, deleteCertification } from '../services/profile.service';
import type { Certification } from '@/shared/types/profile';

type RouteParams = { EditCertification: { certificationId: string } };

export default function EditCertificationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'EditCertification'>>();
  const { certificationId } = route.params;
  const { theme: appTheme } = useTheme();
  const currentUserId = useProfileStore((state) => state.currentUser?.id);

  const [cert, setCert] = useState<Certification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [name, setName] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [doesNotExpire, setDoesNotExpire] = useState(false);
  const [credentialId, setCredentialId] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');

  // UI
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const originalRef = useRef<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      if (!currentUserId) return;
      try {
        const items = await getCertifications(currentUserId);
        const item = items.find((c) => c.id === certificationId);
        if (item) {
          setCert(item);
          setName(item.name);
          setIssuingOrganization(item.issuingOrganization);
          setIssueDate(item.issueDate || '');
          setExpirationDate(item.expirationDate || '');
          setDoesNotExpire(!item.expirationDate);
          setCredentialId(item.credentialId || '');
          setCredentialUrl(item.credentialUrl || '');
          originalRef.current = {
            name: item.name,
            issuingOrganization: item.issuingOrganization,
            issueDate: item.issueDate || '',
            expirationDate: item.expirationDate || '',
            doesNotExpire: !item.expirationDate,
            credentialId: item.credentialId || '',
            credentialUrl: item.credentialUrl || '',
          };
        }
      } catch {
        Alert.alert('Error', 'Failed to load certification');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [currentUserId, certificationId]);

  useEffect(() => {
    const o = originalRef.current;
    setHasChanges(
      name !== o.name ||
      issuingOrganization !== o.issuingOrganization ||
      issueDate !== o.issueDate ||
      expirationDate !== o.expirationDate ||
      doesNotExpire !== o.doesNotExpire ||
      credentialId !== o.credentialId ||
      credentialUrl !== o.credentialUrl,
    );
  }, [name, issuingOrganization, issueDate, expirationDate, doesNotExpire, credentialId, credentialUrl]);

  const handleSave = async () => {
    if (!name.trim() || !issuingOrganization.trim()) {
      Alert.alert('Error', 'Name and issuing organization are required');
      return;
    }
    if (credentialUrl.trim() && !credentialUrl.trim().startsWith('http')) {
      Alert.alert('Error', 'Credential URL must start with http:// or https://');
      return;
    }
    setIsSaving(true);
    try {
      await updateCertification(certificationId, {
        name: name.trim(),
        issuingOrganization: issuingOrganization.trim(),
        issueDate: issueDate.trim() || undefined,
        expirationDate: doesNotExpire ? undefined : expirationDate.trim() || undefined,
        credentialId: credentialId.trim() || undefined,
        credentialUrl: credentialUrl.trim() || undefined,
      });
      setSuccessMessage('Certification updated successfully!');
      setShowSuccessDialog(true);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update certification');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCertification(certificationId);
      setShowDeleteDialog(false);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete certification');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Edit Certification" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={appTheme.colors.text} /></View>
      </SafeAreaView>
    );
  }

  if (!cert) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Edit Certification" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.loadingContainer}><Text style={[styles.errorText, { color: appTheme.colors.textMuted }]}>Certification not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader title="Edit Certification" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} rightActions={hasChanges ? [{ icon: 'save', onPress: handleSave }] : []} />
      <View style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Certification Name *</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={name} onChangeText={setName} placeholder="Certification name" placeholderTextColor={appTheme.colors.textMuted} />
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Issuing Organization *</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={issuingOrganization} onChangeText={setIssuingOrganization} placeholder="Issuing organization" placeholderTextColor={appTheme.colors.textMuted} />
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Issue Date</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={issueDate} onChangeText={setIssueDate} placeholder="e.g., Mar 2024" placeholderTextColor={appTheme.colors.textMuted} />
            </View>
            <View style={styles.infoItem}>
              <View style={styles.labelRow}>
                <Text style={[styles.infoLabel, styles.labelNoMargin, { color: appTheme.colors.textMuted }]}>Expiration Date</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setDoesNotExpire(!doesNotExpire)}>
                  <View style={[styles.checkbox, { borderColor: appTheme.colors.borderColor, backgroundColor: doesNotExpire ? appTheme.colors.success : 'transparent' }]}>
                    {doesNotExpire && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: appTheme.colors.textMuted }]}>Does not expire</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: doesNotExpire ? appTheme.colors.buttonBackgroundDisabled : '#FFFFFF' }]} value={doesNotExpire ? 'No Expiration' : expirationDate} onChangeText={setExpirationDate} placeholder="e.g., Mar 2027" placeholderTextColor={appTheme.colors.textMuted} editable={!doesNotExpire} />
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Credential ID</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={credentialId} onChangeText={setCredentialId} placeholder="Optional credential ID" placeholderTextColor={appTheme.colors.textMuted} />
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Credential URL</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={credentialUrl} onChangeText={setCredentialUrl} placeholder="https://..." placeholderTextColor={appTheme.colors.textMuted} autoCapitalize="none" keyboardType="url" />
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.saveButton, { backgroundColor: hasChanges ? appTheme.colors.success : appTheme.colors.buttonBackgroundDisabled }]} onPress={handleSave} disabled={!hasChanges || isSaving}>
              <Text style={[styles.saveButtonText, { color: hasChanges ? '#FFFFFF' : appTheme.colors.textMuted }]}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteDialog(true)}>
              <Icon name="trash-outline" size={20} color={appTheme.colors.error} />
              <Text style={styles.deleteButtonText}>Remove Certification</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton, { backgroundColor: '#FFFFFF' }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.cancelButtonText, { color: appTheme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <AppModal visible={showSuccessDialog} onClose={() => { setShowSuccessDialog(false); navigation.goBack(); }} variant="success" title="Success" message={successMessage} primaryButtonText="OK" onPrimaryAction={() => { setShowSuccessDialog(false); navigation.goBack(); }} />
      <AppModal visible={showDeleteDialog} onClose={() => !isDeleting && setShowDeleteDialog(false)} variant="delete" title="Remove Certification" message="Are you sure you want to remove this certification?" primaryButtonText="Remove" onPrimaryAction={confirmDelete} primaryButtonLoading={isDeleting} secondaryButtonText="Cancel" onSecondaryAction={() => setShowDeleteDialog(false)} secondaryButtonDisabled={isDeleting} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, fontFamily: theme.fonts.primary.regular },
  section: { paddingHorizontal: 12, paddingTop: 16 },
  infoItem: { marginBottom: 20 },
  infoLabel: { fontSize: 14, fontFamily: theme.fonts.primary.medium, marginBottom: 8, marginLeft: 8 },
  labelNoMargin: { marginBottom: 0, marginLeft: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkboxLabel: { fontSize: 13, fontFamily: theme.fonts.primary.regular },
  infoInput: { fontSize: 16, fontFamily: theme.fonts.primary.semiBold, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  bottomContainer: { paddingBottom: 32 },
  actionButtonsContainer: { paddingHorizontal: 12, gap: 0 },
  actionButton: { borderRadius: 8, height: 56, justifyContent: 'center', alignItems: 'center' },
  saveButton: {},
  saveButtonText: { fontSize: 16, fontFamily: theme.fonts.primary.semiBold },
  cancelButton: {},
  cancelButtonText: { fontSize: 16, fontFamily: theme.fonts.primary.semiBold },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#D6453E', marginTop: 8 },
  deleteButtonText: { fontSize: 16, fontFamily: theme.fonts.primary.medium, color: '#D6453E', marginLeft: 8 },
});
