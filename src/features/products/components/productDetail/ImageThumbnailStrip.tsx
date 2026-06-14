/**
 * ImageThumbnailStrip — small image thumbnails pinned at the bottom of the hero.
 * Replaces the old dot indicators. Tap to jump; the active thumb is highlighted.
 * Renders nothing for single-image products.
 */
import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  images: string[];
  activeIndex: number;
  onPress: (index: number) => void;
}

const THUMB = 26;

const ImageThumbnailStrip: React.FC<Props> = ({ images, activeIndex, onPress }) => {
  if (!images || images.length < 2) return null;

  return (
    <View style={styles.scrim}>
      {images.map((uri, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.8}
          onPress={() => onPress(index)}
          style={[
            styles.thumbWrap,
            index === activeIndex ? styles.thumbActive : styles.thumbInactive,
          ]}
        >
          {uri ? (
            <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: 7,
    overflow: 'hidden',
  },
  thumbActive: {
    borderWidth: 2,
    borderColor: '#FF7A00',
  },
  thumbInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

export default ImageThumbnailStrip;
