import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { Icon } from '@/shared/utils/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ImageViewerModalProps = {
  isVisible: boolean;
  imageUrl: string | null;
  senderName: string | null;
  timestamp: string | null;
  messageId: string | null;
  onClose: () => void;
  onReply?: (messageId: string, senderName: string | null) => void;
  onShare?: (imageUrl: string) => void;
  onForward?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
};

export default function ImageViewerModal({
  isVisible,
  imageUrl,
  senderName,
  timestamp,
  messageId,
  onClose,
  onReply,
  onShare,
  onForward,
  onDelete,
}: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();

  if (!imageUrl) return null;

  const images = [{ uri: imageUrl }];

  const HeaderComponent = () => (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={onClose} style={styles.headerButton}>
        <Icon name="arrow-back" size={28} color="#ffffff" />
      </TouchableOpacity>
      <View style={styles.senderInfo}>
        <Text style={styles.senderName}>{senderName || 'Unknown Sender'}</Text>
        <Text style={styles.timestampText}>{timestamp || ''}</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );

  const FooterComponent = () => (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
      <TouchableOpacity
        style={styles.footerButton}
        onPress={() => messageId && onReply?.(messageId, senderName)}
      >
        <Icon name="arrow-undo-outline" size={24} color="#ffffff" />
        <Text style={styles.footerButtonText}>Reply</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.footerButton}
        onPress={() => imageUrl && onShare?.(imageUrl)}
      >
        <Icon name="share-outline" size={24} color="#ffffff" />
        <Text style={styles.footerButtonText}>Share</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.footerButton}
        onPress={() => messageId && onForward?.(messageId)}
      >
        <Icon name="arrow-redo-outline" size={24} color="#ffffff" />
        <Text style={styles.footerButtonText}>Forward</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.footerButton}
        onPress={() => messageId && onDelete?.(messageId)}
      >
        <Icon name="trash-outline" size={24} color="#ffffff" />
        <Text style={styles.footerButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageViewing
      images={images}
      imageIndex={0}
      visible={isVisible}
      onRequestClose={onClose}
      HeaderComponent={HeaderComponent}
      FooterComponent={FooterComponent}
      swipeToCloseEnabled
      doubleTapToZoomEnabled
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    minHeight: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerButton: {
    padding: 5,
  },
  senderInfo: {
    alignItems: 'center',
  },
  senderName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  timestampText: {
    color: '#ccc',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: 70,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  footerButton: {
    alignItems: 'center',
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
});
