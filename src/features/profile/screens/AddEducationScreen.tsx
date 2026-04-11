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
import { addEducation } from '../services/profile.service';

export default function AddEducationScreen() {
  const navigation = useNavigation();
  const { theme: appTheme } = useTheme();

  // Form state
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);

  // UI state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = institution.trim() !== '';

  const handleSave = async () => {
    if (!institution.trim()) {
      Alert.alert('Error', 'Please enter an institution name');
      return;
    }

    setIsSaving(true);
    try {
      await addEducation({
        institution: institution.trim(),
        degree: degree.trim() || undefined,
        fieldOfStudy: fieldOfStudy.trim() || undefined,
        description: description.trim() || undefined,
        startDate: startDate.trim() || undefined,
        endDate: isCurrent ? undefined : endDate.trim() || undefined,
        isCurrent,
      });
      setShowSuccessDialog(true);
    } catch (error: any) {
      const msg = error?.message || 'Failed to add education';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      <SecondaryHeader
        title="Add Education"
        leftAction={{ icon: 'chevron-left', onPress: handleCancel }}
        rightActions={hasChanges ? [{ icon: 'save', onPress: handleSave }] : []}
      />
      <View style={styles.keyboardView}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Institution *</Text>
              <TextInput
                style={[styles.infoInput, { color: appTheme.colors.text, borderColor: '#DAD3D1', backgroundColor: '#FFFFFF' }]}
                value={institution}
                onChangeText={setInstitution}
                placeholder="Enter institution name"
                placeholderTextColor="#777777"
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Degree</Text>
              <TextInput
                style={[styles.infoInput, { color: appTheme.colors.text, borderColor: '#DAD3D1', backgroundColor: '#FFFFFF' }]}
                value={degree}
                onChangeText={setDegree}
                placeholder="e.g., Bachelor's, Master's"
                placeholderTextColor="#777777"
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Field of Study</Text>
              <TextInput
                style={[styles.infoInput, { color: appTheme.colors.text, borderColor: '#DAD3D1', backgroundColor: '#FFFFFF' }]}
                value={fieldOfStudy}
                onChangeText={setFieldOfStudy}
                placeholder="e.g., Computer Science"
                placeholderTextColor="#777777"
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Start Date</Text>
              <TextInput
                style={[styles.infoInput, { color: appTheme.colors.text, borderColor: '#DAD3D1', backgroundColor: '#FFFFFF' }]}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="e.g., Sep 2018"
                placeholderTextColor="#777777"
              />
            </View>

            <View style={styles.infoItem}>
              <View style={styles.labelRow}>
                <Text style={[styles.infoLabel, styles.labelNoMargin, { color: '#777777' }]}>End Date</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsCurrent(!isCurrent)}>
                  <View style={[styles.checkbox, { borderColor: '#DAD3D1', backgroundColor: isCurrent ? '#22C55E' : 'transparent' }]}>
                    {isCurrent && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: '#777777' }]}>Currently studying</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.infoInput, {
                  color: appTheme.colors.text,
                  borderColor: '#DAD3D1',
                  backgroundColor: isCurrent ? appTheme.colors.buttonBackgroundDisabled : '#FFFFFF',
                }]}
                value={isCurrent ? 'Present' : endDate}
                onChangeText={setEndDate}
                placeholder="e.g., Jun 2022"
                placeholderTextColor="#777777"
                editable={!isCurrent}
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#777777' }]}>Description</Text>
              <TextInput
                style={[styles.multilineInput, { color: appTheme.colors.text, borderColor: '#DAD3D1', backgroundColor: '#FFFFFF' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Activities, societies, description..."
                placeholderTextColor="#777777"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton, {
                backgroundColor: hasChanges ? '#22C55E' : appTheme.colors.buttonBackgroundDisabled,
              }]}
              onPress={handleSave}
              disabled={!hasChanges || isSaving}
            >
              <Text style={[styles.saveButtonText, { color: hasChanges ? '#FFFFFF' : appTheme.colors.textMuted }]}>
                {isSaving ? 'Saving...' : 'Add Education'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, { backgroundColor: '#FFFFFF' }]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelButtonText, { color: '#000000' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <AppModal
        visible={showSuccessDialog}
        onClose={() => { setShowSuccessDialog(false); navigation.goBack(); }}
        variant="success"
        title="Success"
        message="Education added successfully!"
        primaryButtonText="OK"
        onPrimaryAction={() => { setShowSuccessDialog(false); navigation.goBack(); }}
      />
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
  multilineInput: { fontSize: 16, fontFamily: theme.fonts.primary.semiBold, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, minHeight: 100 },
  bottomContainer: { paddingBottom: 32 },
  actionButtonsContainer: { paddingHorizontal: 12, gap: 0 },
  actionButton: { borderRadius: 8, height: 56, justifyContent: 'center', alignItems: 'center' },
  saveButton: {},
  saveButtonText: { fontSize: 16, fontFamily: theme.fonts.primary.semiBold },
  cancelButton: {},
  cancelButtonText: { fontSize: 16, fontFamily: theme.fonts.primary.semiBold },
});
