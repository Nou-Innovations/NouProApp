import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { AppModal } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { addCertification } from '../services/profile.service';

export default function AddCertificationScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();

  // Form state
  const [name, setName] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [doesNotExpire, setDoesNotExpire] = useState(false);
  const [credentialId, setCredentialId] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');

  // UI state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = name.trim() !== '' && issuingOrganization.trim() !== '';

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter the certification name');
      return;
    }
    if (!issuingOrganization.trim()) {
      Alert.alert('Error', 'Please enter the issuing organization');
      return;
    }
    if (credentialUrl.trim() && !credentialUrl.trim().startsWith('http')) {
      Alert.alert('Error', 'Credential URL must start with http:// or https://');
      return;
    }

    setIsSaving(true);
    try {
      await addCertification({
        name: name.trim(),
        issuingOrganization: issuingOrganization.trim(),
        issueDate: issueDate.trim() || undefined,
        expirationDate: doesNotExpire ? undefined : expirationDate.trim() || undefined,
        credentialId: credentialId.trim() || undefined,
        credentialUrl: credentialUrl.trim() || undefined,
      });
      setShowSuccessDialog(true);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add certification');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Add Certification"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={hasChanges ? [{ icon: 'save', onPress: handleSave }] : []}
      />
      <View style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Certification Name *</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={name} onChangeText={setName} placeholder="e.g., AWS Solutions Architect" placeholderTextColor={appTheme.colors.textMuted} />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Issuing Organization *</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={issuingOrganization} onChangeText={setIssuingOrganization} placeholder="e.g., Amazon Web Services" placeholderTextColor={appTheme.colors.textMuted} />
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
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton, { backgroundColor: hasChanges ? appTheme.colors.success : appTheme.colors.buttonBackgroundDisabled }]}
              onPress={handleSave}
              disabled={!hasChanges || isSaving}
            >
              <Text style={[styles.saveButtonText, { color: hasChanges ? '#FFFFFF' : appTheme.colors.textMuted }]}>{isSaving ? 'Saving...' : 'Add Certification'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton, { backgroundColor: '#FFFFFF' }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.cancelButtonText, { color: appTheme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <AppModal visible={showSuccessDialog} onClose={() => { setShowSuccessDialog(false); navigation.goBack(); }} variant="success" title="Success" message="Certification added successfully!" primaryButtonText="OK" onPrimaryAction={() => { setShowSuccessDialog(false); navigation.goBack(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
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
});
