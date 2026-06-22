/**
 * BottomSheetGalleryScreen — Design System showroom.
 *
 * Lists every modal / bottom-sheet surface in the app (see bottomSheetRegistry.ts),
 * grouped by category. Each card shows the surface's attributes + proposed direction
 * and a "Preview" button that opens a live, faithful reproduction so its look and
 * open/close behavior can be compared side by side. Reached from the Business sidebar.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { SectionTitle } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import {
  GALLERY_ENTRIES,
  CATEGORY_ORDER,
  GalleryEntry,
} from '../data/bottomSheetRegistry';
import GalleryCard from '../components/GalleryCard';
import BottomSheetDemoHost from '../components/BottomSheetDemoHost';

const CLOSE_DELAY = 360; // keep the demo mounted long enough for its exit animation

export default function BottomSheetGalleryScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [activeEntry, setActiveEntry] = useState<GalleryEntry | null>(null);
  const [demoVisible, setDemoVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const openDemo = (entry: GalleryEntry) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveEntry(entry);
    setDemoVisible(true);
  };

  const closeDemo = () => {
    setDemoVisible(false);
    closeTimer.current = setTimeout(() => setActiveEntry(null), CLOSE_DELAY);
  };

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        entries: GALLERY_ENTRIES.filter((e) => e.category === category),
      })).filter((g) => g.entries.length > 0),
    []
  );

  const migrateCount = useMemo(
    () =>
      GALLERY_ENTRIES.filter(
        (e) => e.recommendation === 'migrate-bottomsheet' || e.recommendation === 'migrate-modal'
      ).length,
    []
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Bottom Sheet Gallery"
        leftAction={{
          icon: 'menu',
          onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()),
          accessibilityLabel: 'Open menu',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.banner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderColor }]}>
          <Text style={[styles.bannerTitle, { color: theme.colors.text }]}>
            {GALLERY_ENTRIES.length} modal/sheet surfaces
          </Text>
          <Text style={[styles.bannerSub, { color: theme.colors.textLight }]}>
            {migrateCount} flagged to migrate to a canonical component. Tap a card to inspect its
            attributes; tap Preview to see how it looks and opens/closes.
          </Text>
        </View>

        {grouped.map((group) => (
          <View key={group.category} style={styles.section}>
            <View style={styles.sectionHeader}>
              <SectionTitle>{group.category}</SectionTitle>
              <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
                {group.entries.length}
              </Text>
            </View>
            {group.entries.map((entry) => (
              <GalleryCard key={entry.id} entry={entry} onPreview={openDemo} />
            ))}
          </View>
        ))}
      </ScrollView>

      {activeEntry ? (
        <BottomSheetDemoHost entry={activeEntry} visible={demoVisible} onClose={closeDemo} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 18,
    fontFamily: 'InterCustom-Bold',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 14,
    fontFamily: 'InterCustom-Medium',
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'InterCustom-SemiBold',
  },
});
