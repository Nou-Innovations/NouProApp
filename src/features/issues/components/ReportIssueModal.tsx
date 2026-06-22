/**
 * ReportIssueModal — report a problem against a delivery / transfer / route.
 * Reusable: pass entityType + entityId and it creates the issue.
 */
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { Icon } from '@/shared/utils/icons';
import { AppButton } from '@/shared/components/ui';
import theme from '@/shared/theme';
import { useProfileStore } from '@/shared/store/profileStore';
import { imageService, uploadImage } from '@/shared/services/imageService';
import { IssueType, IssueEntityType, ISSUE_TYPE_LABELS } from '@/shared/types/issue';
import { createIssue } from '../issues.service';

interface ReportIssueModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: IssueEntityType;
  entityId: string;
  onReported?: () => void;
}

const TYPES: IssueType[] = ['damaged', 'missing', 'wrong_qty', 'customer_unavailable', 'wrong_address', 'vehicle', 'late', 'payment', 'other'];

export function ReportIssueModal({ visible, onClose, entityType, entityId, onReported }: ReportIssueModalProps) {
  const companyId = useProfileStore((s) => s.activeBusiness?.id) || '';
  const [type, setType] = useState<IssueType>('damaged');
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setType('damaged'); setNote(''); setPhotoUrl(null); };

  const handlePhoto = async () => {
    const result = await imageService.openCamera();
    if (!result.success || !result.imageUri) return;
    setUploading(true);
    try { setPhotoUrl(await uploadImage(result.imageUri)); } catch { /* optional */ } finally { setUploading(false); }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await createIssue(companyId, { entityType, entityId, type, note: note || null, photoUrl });
      reset();
      onReported?.();
      onClose();
    } catch {
      Alert.alert('Could not report', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Report an issue</Text>
            <TouchableOpacity onPress={onClose}><Icon name="close" size={24} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>

          <Text style={styles.label}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
            {TYPES.map((t) => {
              const active = type === t;
              return (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.typeChip, { backgroundColor: active ? theme.colors.accent : theme.colors.inputBackground, borderColor: active ? theme.colors.accent : theme.colors.borderColor }]}>
                  <Text style={[styles.typeChipText, { color: active ? '#FFFFFF' : theme.colors.textSecondary }]}>{ISSUE_TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Note</Text>
          <TextInput value={note} onChangeText={setNote} placeholder="Describe the problem…" placeholderTextColor={theme.colors.textMuted} multiline style={styles.input} />

          <TouchableOpacity style={[styles.photoBtn, { borderColor: theme.colors.borderColor }]} onPress={handlePhoto} disabled={uploading}>
            {uploading ? <ActivityIndicator color={theme.colors.accent} /> : photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Icon name="camera-outline" size={22} color={theme.colors.textSecondary} />
                <Text style={styles.photoText}>Add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <AppButton
            title="Report issue"
            onPress={submit}
            variant="alert"
            loading={submitting}
            disabled={submitting || uploading}
            fullWidth
            style={styles.submit}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontFamily: 'InterCustom-SemiBold', color: theme.colors.text },
  label: { fontSize: 14, fontFamily: 'InterCustom-SemiBold', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  typeChipText: { fontSize: 13, fontFamily: 'InterCustom-Medium' },
  input: { minHeight: 70, borderWidth: 1, borderColor: theme.colors.borderColor, borderRadius: 10, padding: 10, fontSize: 15, color: theme.colors.text, textAlignVertical: 'top' },
  photoBtn: { height: 100, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center' },
  photoText: { marginTop: 6, fontSize: 13, fontFamily: 'InterCustom-Medium', color: theme.colors.textSecondary },
  submit: { marginTop: 20 },
});

export default ReportIssueModal;
