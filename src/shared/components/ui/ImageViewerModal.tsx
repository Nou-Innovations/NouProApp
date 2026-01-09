import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import Modal from 'react-native-modal'; // Ensure Modal is imported
import { Icon } from '@/shared/utils/icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme/ThemeProvider';

const { width, height } = Dimensions.get('window');

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

// Restore the component definition
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
  const insets = useSafeAreaInsets(); // Get safe area insets
  const { theme: appTheme } = useTheme();

  if (!imageUrl) return null;

  const handleReplyPress = () => {
    if (messageId && onReply) {
      onReply(messageId, senderName);
    }
  };
  
  const handleSharePress = () => {
    if (imageUrl && onShare) {
      onShare(imageUrl);
    }
  };
  
  const handleForwardPress = () => {
    if (messageId && onForward) {
      onForward(messageId);
    }
  };
  
  const handleDeletePress = () => {
    if (messageId && onDelete) {
      onDelete(messageId);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      backdropOpacity={0.9}
      animationIn="fadeInUp"
      animationOut="fadeOutDown"
      useNativeDriverForBackdrop
      useNativeDriver={false}
    >
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Icon name="arrow-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.senderInfo}>
            <Text style={styles.senderName}>{senderName || 'Unknown Sender'}</Text>
            <Text style={styles.timestampText}>{timestamp || 'Unknown Time'}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity style={styles.footerButton} onPress={handleReplyPress}>
            <Icon name="arrow-undo-outline" size={24} color="#ffffff" />
            <Text style={styles.footerButtonText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={handleSharePress}>
            <Icon name="share-outline" size={24} color="#ffffff" />
            <Text style={styles.footerButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={handleForwardPress}>
            <Icon name="arrow-redo-outline" size={24} color="#ffffff" />
            <Text style={styles.footerButtonText}>Forward</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={handleDeletePress}>
            <Icon name="trash-outline" size={24} color="#ffffff" />
            <Text style={styles.footerButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Keep styles defined, even if not all are used by the test view
const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-start',
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    minHeight: 60,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
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
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height * 0.8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: 70,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
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