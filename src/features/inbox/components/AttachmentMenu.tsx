import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';

const ICON_SIZE = 24;

interface AttachmentMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectAttachment: (type: 'document' | 'camera' | 'gallery' | 'audio' | 'location' | 'contact') => void;
}

const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  isVisible,
  onClose,
  onSelectAttachment,
}) => {
  const { theme: appTheme } = useTheme();

  const attachmentOptions = [
    { type: 'document', icon: 'document-outline', label: 'Document', color: '#4B5563' },
    { type: 'camera', icon: 'camera-outline', label: 'Camera', color: '#10B981' },
    { type: 'gallery', icon: 'image-outline', label: 'Gallery', color: '#6366F1' },
    { type: 'audio', icon: 'musical-notes-outline', label: 'Audio', color: '#F59E0B' },
    { type: 'location', icon: 'location-outline', label: 'Location', color: '#EF4444' },
    { type: 'contact', icon: 'person-outline', label: 'Contact', color: '#8B5CF6' },
  ] as const;

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      backdropOpacity={0.3}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriverForBackdrop
    >
      <View style={[styles.container, { backgroundColor: appTheme.colors.cardBackground }]}>
        <View style={styles.handle} />
        <View style={styles.optionsGrid}>
          {attachmentOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={styles.option}
              onPress={() => {
                onSelectAttachment(option.type);
                onClose();
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                <Icon name={option.icon as any} size={ICON_SIZE} color="white" />
              </View>
              <Text style={[styles.optionLabel, { color: appTheme.colors.text }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  option: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default AttachmentMenu; 