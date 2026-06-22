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
import { AppModal, AppButton } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useProfileStore } from '@/shared/store/profileStore';
import { getEducation, updateEducation, deleteEducation } from '../services/profile.service';
import type { Education } from '@/shared/types/profile';

type RouteParams = { EditEducation: { educationId: string } };

export default function EditEducationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'EditEducation'>>();
  const { educationId } = route.params;
  const { theme: appTheme } = useTheme();
  const currentUserId = useProfileStore((state) => state.currentUser?.id);

  // Data
  const [education, setEducation] = useState<Education | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);

  // UI state
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const originalRef = useRef<Record<string, any>>({});

  // Fetch education entry
  useEffect(() => {
    (async () => {
      if (!currentUserId) return;
      try {
        const items = await getEducation(currentUserId);
        const item = items.find((e) => e.id === educationId);
        if (item) {
          setEducation(item);
          setInstitution(item.institution);
          setDegree(item.degree || '');
          setFieldOfStudy(item.fieldOfStudy || '');
          setDescription(item.description || '');
          setStartDate(item.startDate || '');
          setEndDate(item.endDate || '');
          setIsCurrent(item.isCurrent);
          originalRef.current = {
            institution: item.institution,
            degree: item.degree || '',
            fieldOfStudy: item.fieldOfStudy || '',
            description: item.description || '',
            startDate: item.startDate || '',
            endDate: item.endDate || '',
            isCurrent: item.isCurrent,
          };
        }
      } catch {
        Alert.alert('Error', 'Failed to load education');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [currentUserId, educationId]);

  // Detect changes
  useEffect(() => {
    const o = originalRef.current;
    setHasChanges(
      institution !== o.institution ||
      degree !== o.degree ||
      fieldOfStudy !== o.fieldOfStudy ||
      description !== o.description ||
      startDate !== o.startDate ||
      endDate !== o.endDate ||
      isCurrent !== o.isCurrent,
    );
  }, [institution, degree, fieldOfStudy, description, startDate, endDate, isCurrent]);

  const handleSave = async () => {
    if (!institution.trim()) {
      Alert.alert('Error', 'Institution is required');
      return;
    }
    setIsSaving(true);
    try {
      await updateEducation(educationId, {
        institution: institution.trim(),
        degree: degree.trim() || undefined,
        fieldOfStudy: fieldOfStudy.trim() || undefined,
        description: description.trim() || undefined,
        startDate: startDate.trim() || undefined,
        endDate: isCurrent ? undefined : endDate.trim() || undefined,
        isCurrent,
      });
      setSuccessMessage('Education updated successfully!');
      setShowSuccessDialog(true);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update education');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEducation(educationId);
      setShowDeleteDialog(false);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete education');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Edit Education" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (!education) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
        <SecondaryHeader title="Edit Education" leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: appTheme.colors.textMuted }]}>Education not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Edit Education"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={hasChanges ? [{ icon: 'save', onPress: handleSave }] : []}
      />
      <View style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Institution *</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={institution} onChangeText={setInstitution} placeholder="Enter institution name" placeholderTextColor={appTheme.colors.textMuted} />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Degree</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={degree} onChangeText={setDegree} placeholder="e.g., Bachelor's, Master's" placeholderTextColor={appTheme.colors.textMuted} />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Field of Study</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={fieldOfStudy} onChangeText={setFieldOfStudy} placeholder="e.g., Computer Science" placeholderTextColor={appTheme.colors.textMuted} />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Start Date</Text>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={startDate} onChangeText={setStartDate} placeholder="e.g., Sep 2018" placeholderTextColor={appTheme.colors.textMuted} />
            </View>

            <View style={styles.infoItem}>
              <View style={styles.labelRow}>
                <Text style={[styles.infoLabel, styles.labelNoMargin, { color: appTheme.colors.textMuted }]}>End Date</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsCurrent(!isCurrent)}>
                  <View style={[styles.checkbox, { borderColor: appTheme.colors.borderColor, backgroundColor: isCurrent ? appTheme.colors.success : 'transparent' }]}>
                    {isCurrent && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: appTheme.colors.textMuted }]}>Currently studying</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: isCurrent ? appTheme.colors.buttonBackgroundDisabled : '#FFFFFF' }]} value={isCurrent ? 'Present' : endDate} onChangeText={setEndDate} placeholder="e.g., Jun 2022" placeholderTextColor={appTheme.colors.textMuted} editable={!isCurrent} />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Description</Text>
              <TextInput style={[styles.multilineInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]} value={description} onChangeText={setDescription} placeholder="Activities, societies, description..." placeholderTextColor={appTheme.colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <View style={styles.actionButtonsContainer}>
            <AppButton
              title="Save Changes"
              onPress={handleSave}
              variant="confirm"
              fullWidth
              loading={isSaving}
              disabled={!hasChanges || isSaving}
            />
            <AppButton
              title="Remove Education"
              onPress={() => setShowDeleteDialog(true)}
              variant="destructive"
              fullWidth
              iconLeft="trash-outline"
            />
            <AppButton
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="secondary"
              fullWidth
            />
          </View>
        </View>
      </View>

      <AppModal visible={showSuccessDialog} onClose={() => { setShowSuccessDialog(false); navigation.goBack(); }} variant="success" title="Success" message={successMessage} primaryButtonText="OK" onPrimaryAction={() => { setShowSuccessDialog(false); navigation.goBack(); }} />
      <AppModal visible={showDeleteDialog} onClose={() => !isDeleting && setShowDeleteDialog(false)} variant="delete" title="Remove Education" message="Are you sure you want to remove this education entry?" primaryButtonText="Remove" onPrimaryAction={confirmDelete} primaryButtonLoading={isDeleting} secondaryButtonText="Cancel" onSecondaryAction={() => setShowDeleteDialog(false)} secondaryButtonDisabled={isDeleting} />
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
  multilineInput: { fontSize: 16, fontFamily: theme.fonts.primary.semiBold, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, minHeight: 100 },
  bottomContainer: { paddingBottom: 32 },
  actionButtonsContainer: { paddingHorizontal: 12, gap: 8 },
});
