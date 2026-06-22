/**
 * DemoFullscreenModal — faithful reproduction of the fullscreen-page modal style
 * (camera scanner, map pickers, image lightbox). Opaque full-screen surface with a
 * header + X and a labeled placeholder body (we don't wire the real camera/map).
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';

interface DemoFullscreenModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Placeholder label for the (non-wired) body, e.g. "📷  Camera viewport" */
  placeholder?: string;
}

export default function DemoFullscreenModal({ visible, onClose, title, placeholder }: DemoFullscreenModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.borderColor }]}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <X size={26} color={theme.colors.iconColor} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={[styles.placeholder, { color: theme.colors.textMuted }]}>
            {placeholder ?? 'Fullscreen content'}
          </Text>
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
            Fullscreen modal — slides up over everything.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'InterCustom-Bold',
    paddingRight: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholder: {
    fontSize: 22,
    fontFamily: 'InterCustom-SemiBold',
  },
  hint: {
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
  },
});
