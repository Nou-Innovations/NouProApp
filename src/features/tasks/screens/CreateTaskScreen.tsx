/**
 * CreateTaskScreen - Business Mode
 * Form for creating a new task. Follows AddWorkExperienceScreen pattern.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import themeConstants from '@/shared/theme';
import { AppModal, AppButton } from '@/shared/components/ui';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { useProfileStore } from '@/shared/store/profileStore';
import { createTask } from '../services/tasks.service';
import type { TaskType, TaskPriority } from '@/shared/types/task';

type RouteParams = {
  CreateTask: {
    businessId: string;
    linkedOrderId?: string;
    linkedDeliveryId?: string;
    linkedInvoiceId?: string;
  };
};

const TYPE_OPTIONS: { label: string; value: TaskType }[] = [
  { label: 'General', value: 'GENERAL' },
  { label: 'Delivery', value: 'DELIVERY' },
  { label: 'Order', value: 'ORDER' },
  { label: 'Invoice', value: 'INVOICE' },
  { label: 'Inventory', value: 'INVENTORY' },
];

const PRIORITY_OPTIONS: { label: string; value: TaskPriority; color: string }[] = [
  { label: 'Low', value: 'LOW', color: '#A8A29E' },
  { label: 'Normal', value: 'NORMAL', color: '#2A75E6' },
  { label: 'Urgent', value: 'URGENT', color: '#D6453E' },
];

export default function CreateTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'CreateTask'>>();
  const { theme: appTheme } = useTheme();

  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const businessId = route.params?.businessId || activeBusiness?.id || '';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('GENERAL');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [dueDate, setDueDate] = useState('');

  // UI state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = title.trim() !== '';

  const handleSave = async () => {
    if (!title.trim()) {
      AppAlert.alert('Error', 'Please enter a task title');
      return;
    }
    if (!businessId) {
      AppAlert.alert('Error', 'No business selected');
      return;
    }

    setIsSaving(true);
    try {
      await createTask(businessId, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        dueDate: dueDate.trim() || undefined,
        linkedOrderId: route.params?.linkedOrderId,
        linkedDeliveryId: route.params?.linkedDeliveryId,
        linkedInvoiceId: route.params?.linkedInvoiceId,
      });
      setShowSuccessDialog(true);
    } catch (error: any) {
      AppAlert.alert('Error', error?.message || 'Failed to create task');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="New Task"
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
        rightActions={hasChanges ? [{ icon: 'save', onPress: handleSave }] : []}
      />
      <View style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            {/* Title */}
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Title *</Text>
              <TextInput
                style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]}
                value={title}
                onChangeText={setTitle}
                placeholder="What needs to be done?"
                placeholderTextColor={appTheme.colors.textMuted}
              />
            </View>

            {/* Description */}
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Description</Text>
              <TextInput
                style={[styles.multilineInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add details..."
                placeholderTextColor={appTheme.colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Type selector */}
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Type</Text>
              <View style={styles.chipRow}>
                {TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, type === opt.value && styles.chipSelected]}
                    onPress={() => setType(opt.value)}
                  >
                    <Text style={[styles.chipText, type === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority selector */}
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Priority</Text>
              <View style={styles.chipRow}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chip,
                      priority === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                    ]}
                    onPress={() => setPriority(opt.value)}
                  >
                    <Text style={[styles.chipText, priority === opt.value && { color: '#FFFFFF' }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Due Date */}
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: appTheme.colors.textMuted }]}>Due Date</Text>
              <TextInput
                style={[styles.infoInput, { color: appTheme.colors.text, borderColor: appTheme.colors.borderColor, backgroundColor: '#FFFFFF' }]}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="e.g., Apr 15, 2026"
                placeholderTextColor={appTheme.colors.textMuted}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <View style={styles.actionButtonsContainer}>
            <AppButton
              title="Create Task"
              onPress={handleSave}
              variant="confirm"
              loading={isSaving}
              disabled={!hasChanges || isSaving}
              fullWidth
              style={styles.saveButton}
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

      <AppModal visible={showSuccessDialog} onClose={() => { setShowSuccessDialog(false); navigation.goBack(); }} variant="success" title="Success" message="Task created successfully!" primaryButtonText="OK" onPrimaryAction={() => { setShowSuccessDialog(false); navigation.goBack(); }} />
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
  infoLabel: { fontSize: 14, fontFamily: themeConstants.fonts.primary.medium, marginBottom: 8, marginLeft: 8 },
  infoInput: { fontSize: 16, fontFamily: themeConstants.fonts.primary.semiBold, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  multilineInput: { fontSize: 16, fontFamily: themeConstants.fonts.primary.semiBold, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, minHeight: 100 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ECE6DF', backgroundColor: '#FFFFFF' },
  chipSelected: { backgroundColor: '#34A853', borderColor: '#34A853' },
  chipText: { fontSize: 14, fontFamily: themeConstants.fonts.primary.medium, color: '#57534E' },
  chipTextSelected: { color: '#FFFFFF' },
  bottomContainer: { paddingBottom: 32 },
  actionButtonsContainer: { paddingHorizontal: 12 },
  saveButton: { marginBottom: 10 },
});
