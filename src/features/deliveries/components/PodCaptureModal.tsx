/**
 * PodCaptureModal — captures proof of delivery (photo and/or signature) when a
 * delivery is marked Delivered.
 *
 * - Photo: camera via imageService → uploaded to Supabase Storage (returns URL).
 * - Signature: an SVG + PanResponder pad (no WebView / signature-canvas dep);
 *   captured strokes are serialized to an SVG path string.
 *
 * Both are optional — the driver can confirm delivery without either.
 */

import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Icon } from '@/shared/utils/icons';
import { AppButton } from '@/shared/components/ui';
import theme from '@/shared/theme';
import { imageService, uploadImage } from '@/shared/services/imageService';

interface PodPayload {
  podPhotoUrl?: string | null;
  podSignatureUrl?: string | null;
}

interface PodCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pod: PodPayload) => void | Promise<void>;
  submitting?: boolean;
}

export function PodCaptureModal({ visible, onClose, onConfirm, submitting = false }: PodCaptureModalProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [livePath, setLivePath] = useState<string>('');
  const currentPath = useRef<string>('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPath.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setLivePath(currentPath.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPath.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setLivePath(currentPath.current);
      },
      onPanResponderRelease: () => {
        const finished = currentPath.current;
        if (finished) setPaths((prev) => [...prev, finished]);
        currentPath.current = '';
        setLivePath('');
      },
    })
  ).current;

  const resetState = () => {
    setPhotoUrl(null);
    setPaths([]);
    setLivePath('');
    currentPath.current = '';
  };

  const handleClose = () => {
    if (submitting || uploading) return;
    resetState();
    onClose();
  };

  const handleTakePhoto = async () => {
    const result = await imageService.openCamera();
    if (!result.success || !result.imageUri) return;
    setUploading(true);
    try {
      const url = await uploadImage(result.imageUri);
      setPhotoUrl(url);
    } catch {
      // Swallow — POD photo is optional; user can retry or confirm without it.
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    const signatureData = paths.length > 0 ? paths.join(' ') : null;
    await onConfirm({ podPhotoUrl: photoUrl, podSignatureUrl: signatureData });
    resetState();
  };

  const hasSignature = paths.length > 0 || !!livePath;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Proof of delivery</Text>
            <TouchableOpacity onPress={handleClose} disabled={submitting || uploading}>
              <Icon name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Photo */}
          <Text style={styles.sectionLabel}>Photo</Text>
          <TouchableOpacity
            style={[styles.photoBox, { borderColor: theme.colors.borderColor }]}
            onPress={handleTakePhoto}
            disabled={uploading || submitting}
          >
            {uploading ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Icon name="camera-outline" size={28} color={theme.colors.textSecondary} />
                <Text style={styles.photoPlaceholderText}>Take a photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Signature */}
          <View style={styles.signatureHeader}>
            <Text style={styles.sectionLabel}>Signature</Text>
            {hasSignature && (
              <TouchableOpacity onPress={() => { setPaths([]); setLivePath(''); currentPath.current = ''; }}>
                <Text style={[styles.clearText, { color: theme.colors.accent }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.signaturePad, { borderColor: theme.colors.borderColor }]} {...panResponder.panHandlers}>
            <Svg width="100%" height="100%">
              {paths.map((d, i) => (
                <Path key={i} d={d} stroke={theme.colors.text} strokeWidth={2.5} fill="none" />
              ))}
              {!!livePath && <Path d={livePath} stroke={theme.colors.text} strokeWidth={2.5} fill="none" />}
            </Svg>
            {!hasSignature && <Text style={styles.signatureHint}>Sign here</Text>}
          </View>

          <AppButton
            title="Confirm delivery"
            onPress={handleConfirm}
            variant="confirm"
            loading={submitting}
            disabled={submitting || uploading}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'InterCustom-SemiBold',
    color: theme.colors.text,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'InterCustom-SemiBold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  photoBox: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'InterCustom-Medium',
    color: theme.colors.textSecondary,
  },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 14,
    fontFamily: 'InterCustom-SemiBold',
  },
  signaturePad: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signatureHint: {
    position: 'absolute',
    fontSize: 14,
    fontFamily: 'InterCustom-Regular',
    color: theme.colors.textMuted,
  },
});

export default PodCaptureModal;
