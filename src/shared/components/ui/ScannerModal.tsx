/**
 * ScannerModal — reusable barcode / QR scanner built on expo-camera's CameraView.
 * No new native module (expo-camera is already bundled). Calls onScanned(value) once.
 */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';

interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (value: string) => void;
  title?: string;
}

export function ScannerModal({ visible, onClose, onScanned, title = 'Scan a code' }: ScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleScan = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={scanned ? undefined : handleScan}
          />
        ) : (
          <View style={styles.permission}>
            <Icon name="camera-outline" size={40} color="#FFFFFF" />
            <Text style={styles.permissionText}>Camera access is needed to scan codes.</Text>
            {permission && !permission.granted && (
              <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                <Text style={styles.grantText}>Grant access</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reticle */}
        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.reticle} />
          <Text style={styles.hint}>{title}</Text>
        </View>

        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Icon name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  permissionText: { color: '#FFFFFF', textAlign: 'center', fontFamily: 'InterCustom-Medium', fontSize: 15 },
  grantBtn: { backgroundColor: theme.colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  grantText: { color: '#FFFFFF', fontFamily: 'InterCustom-SemiBold' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  reticle: { width: 240, height: 240, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 20 },
  hint: { color: '#FFFFFF', marginTop: 16, fontFamily: 'InterCustom-SemiBold', fontSize: 16 },
  close: { position: 'absolute', top: 52, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});

export default ScannerModal;
