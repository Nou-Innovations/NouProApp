/**
 * FloatingHeader — back / save / share controls that float over the hero, plus a
 * solid header bar + product title that fade in as the user scrolls past the image.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';

interface Props {
  title: string;
  /** Animated style providing `opacity` for the solid bar + title. */
  headerBarStyle: any;
  topInset: number;
  showSave: boolean;
  isSaved: boolean;
  onBack: () => void;
  onSave: () => void;
  onShare: () => void;
}

const FloatingHeader: React.FC<Props> = ({
  title,
  headerBarStyle,
  topInset,
  showSave,
  isSaved,
  onBack,
  onSave,
  onShare,
}) => {
  const { theme: appTheme } = useTheme();

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Solid bar + title (fades in on scroll) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bar,
          {
            height: topInset + BAR_CONTENT,
            paddingTop: topInset,
            backgroundColor: appTheme.colors.cardBackground,
            borderBottomColor: appTheme.colors.borderColor,
          },
          headerBarStyle,
        ]}
      >
        <Text style={[styles.title, { color: appTheme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>

      {/* Always-visible controls */}
      <View style={[styles.controls, { paddingTop: topInset + 6 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.button} onPress={onBack} activeOpacity={0.8}>
          <Icon name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.right}>
          {showSave && (
            <TouchableOpacity style={styles.button} onPress={onSave} activeOpacity={0.8}>
              <Icon name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.button} onPress={onShare} activeOpacity={0.8}>
            <Icon name="share-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const BAR_CONTENT = 52;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 64,
  },
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.semiBold,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  right: {
    flexDirection: 'row',
    gap: 10,
  },
});

export default FloatingHeader;
