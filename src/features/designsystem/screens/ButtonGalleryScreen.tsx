/**
 * ButtonGalleryScreen — Design System showroom for buttons & controls.
 *
 * Renders every button/control LIVE in all its variants, sizes and states:
 * the existing components (AppButton, IconButton, ActionButton, ExploreChips,
 * FilterBar, Pill) plus the new shared building blocks proposed for the app
 * (ButtonRow, Chip/ChipGroup, SegmentedControl, TextButton, Fab).
 *
 * This is a review surface — nothing across the app has been migrated yet.
 * Reached from the Business sidebar → Design System → Button Gallery.
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import {
  MessageCircle,
  RefreshCw,
  Plus,
  List,
  LayoutGrid,
  Star,
  Package,
  Truck,
  Calendar,
} from 'lucide-react-native';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import {
  SectionTitle,
  Text,
  AppButton,
  ButtonRow,
  IconButton,
  ActionButton,
  Chip,
  ChipGroup,
  SegmentedControl,
  TextButton,
  Fab,
  ExploreChips,
  Pill,
} from '@/shared/components/ui';
import FilterBar from '@/shared/components/ui/FilterBar';
import { useTheme } from '@/shared/theme/ThemeProvider';

const noop = () => {};

/** A captioned slot wrapping one live example. */
function Demo({ caption, children }: { caption: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.demo}>
      <Text style={[styles.caption, { color: theme.colors.textMuted }]}>{caption}</Text>
      {children}
    </View>
  );
}

/** A titled group of demos rendered inside a card. */
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <SectionTitle>{title}</SectionTitle>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.textLight }]}>{subtitle}</Text>
      ) : null}
      <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderColor }]}>
        {children}
      </View>
    </View>
  );
}

export default function ButtonGalleryScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  // Interactive state for the controls below.
  const [chipDemo, setChipDemo] = useState(true);
  const [chipSingle, setChipSingle] = useState('all');
  const [chipMulti, setChipMulti] = useState<string[]>(['products']);
  const [seg2, setSeg2] = useState('list');
  const [seg3, setSeg3] = useState('30d');
  const [exploreSel, setExploreSel] = useState('Overall');
  const [filterSel, setFilterSel] = useState('pending');

  const NEW = ' · NEW';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title="Buttons & Controls"
        leftAction={{
          icon: 'menu',
          onPress: () => navigation.dispatch(DrawerActions.toggleDrawer()),
          accessibilityLabel: 'Open menu',
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderColor }]}>
          <Text style={[styles.bannerTitle, { color: theme.colors.text }]}>Button & control showcase</Text>
          <Text style={[styles.bannerSub, { color: theme.colors.textLight }]}>
            Every button/control rendered live. Items marked NEW are the proposed shared components —
            nothing across the app has been migrated yet. Review here, then we roll them out.
          </Text>
        </View>

        {/* ---------------- AppButton ---------------- */}
        <Section title="AppButton — variants" subtitle="Full-width. The destructive variant is new (outline in the error color).">
          <Demo caption="primary"><AppButton title="Primary" onPress={noop} fullWidth /></Demo>
          <Demo caption="secondary"><AppButton title="Secondary" variant="secondary" onPress={noop} fullWidth /></Demo>
          <Demo caption="outline"><AppButton title="Outline" variant="outline" onPress={noop} fullWidth /></Demo>
          <Demo caption="accent (highlight)"><AppButton title="Accent" variant="accent" onPress={noop} fullWidth /></Demo>
          <Demo caption="alert"><AppButton title="Alert" variant="alert" onPress={noop} fullWidth /></Demo>
          <Demo caption="confirm"><AppButton title="Confirm" variant="confirm" onPress={noop} fullWidth /></Demo>
          <Demo caption={`destructive${NEW}`}><AppButton title="Destructive" variant="destructive" onPress={noop} fullWidth /></Demo>
          <Demo caption="disabled"><AppButton title="Disabled" onPress={noop} disabled fullWidth /></Demo>
        </Section>

        <Section title="AppButton — sizes, icons & states">
          <Demo caption="default · 56px"><AppButton title="Default size" onPress={noop} fullWidth /></Demo>
          <Demo caption="small · 44px"><AppButton title="Small size" size="small" onPress={noop} fullWidth /></Demo>
          <Demo caption={`left icon (Lucide)${NEW}`}>
            <AppButton title="Message supplier" onPress={noop} iconLeft={MessageCircle} fullWidth />
          </Demo>
          <Demo caption="loading"><AppButton title="Saving…" onPress={noop} loading fullWidth /></Demo>
        </Section>

        <Section title={`AppButton — layout${NEW}`} subtitle="ButtonRow lays out equal-width pairs (replaces manual flex:1 rows).">
          <Demo caption="ButtonRow · destructive + confirm">
            <ButtonRow>
              <AppButton title="Reject" variant="destructive" onPress={noop} />
              <AppButton title="Accept" variant="confirm" onPress={noop} />
            </ButtonRow>
          </Demo>
          <Demo caption="ButtonRow · outline + primary">
            <ButtonRow>
              <AppButton title="Cancel" variant="outline" onPress={noop} />
              <AppButton title="Save" onPress={noop} />
            </ButtonRow>
          </Demo>
        </Section>

        {/* ---------------- IconButton ---------------- */}
        <Section title="IconButton" subtitle="Icon-only. Now tokenized + accessible.">
          <Demo caption="default · 40px">
            <View style={styles.row}>
              <IconButton iconName="add" variant="primary" onPress={noop} accessibilityLabel="Add" />
              <IconButton iconName="search" variant="outline" onPress={noop} accessibilityLabel="Search" />
              <IconButton iconName="heart" variant="alert" onPress={noop} accessibilityLabel="Favorite" />
              <IconButton iconName="checkmark" variant="confirm" onPress={noop} accessibilityLabel="Confirm" />
            </View>
          </Demo>
          <Demo caption="small · 32px">
            <View style={styles.row}>
              <IconButton iconName="add" size="small" variant="primary" onPress={noop} accessibilityLabel="Add" />
              <IconButton iconName="search" size="small" variant="outline" onPress={noop} accessibilityLabel="Search" />
              <IconButton iconName="settings" size="small" variant="secondary" onPress={noop} accessibilityLabel="Settings" />
            </View>
          </Demo>
        </Section>

        {/* ---------------- ActionButton ---------------- */}
        <Section title="ActionButton" subtitle="Add / remove / check toggles (form controls).">
          <Demo caption="default · 32px">
            <View style={styles.row}>
              <ActionButton variant="add" onPress={noop} />
              <ActionButton variant="remove" onPress={noop} />
              <ActionButton variant="check" onPress={noop} />
              <ActionButton variant="uncheck" onPress={noop} />
            </View>
          </Demo>
          <Demo caption="small · 24px">
            <View style={styles.row}>
              <ActionButton variant="add" size="small" onPress={noop} />
              <ActionButton variant="check" size="small" onPress={noop} />
              <ActionButton variant="uncheck" size="small" onPress={noop} />
            </View>
          </Demo>
        </Section>

        {/* ---------------- Chip / ChipGroup ---------------- */}
        <Section title={`Chip & ChipGroup${NEW}`} subtitle="Unifies the ~20 hand-rolled chip pickers across the app.">
          <Demo caption="single Chip (tap to toggle)">
            <View style={styles.row}>
              <Chip label="Toggle me" selected={chipDemo} onPress={() => setChipDemo((v) => !v)} />
              <Chip label="With icon" selected={false} onPress={noop} iconLeft={Star} />
              <Chip label="Locked" selected={false} onPress={noop} locked />
            </View>
          </Demo>
          <Demo caption="ChipGroup · single-select">
            <ChipGroup
              value={chipSingle}
              onChange={setChipSingle}
              options={[
                { value: 'all', label: 'All' },
                { value: 'products', label: 'Products', icon: Package },
                { value: 'deliveries', label: 'Deliveries', icon: Truck },
                { value: 'events', label: 'Events', icon: Calendar },
              ]}
            />
          </Demo>
          <Demo caption="ChipGroup · multi-select">
            <ChipGroup
              multiple
              value={chipMulti}
              onChange={setChipMulti}
              options={[
                { value: 'products', label: 'Products' },
                { value: 'orders', label: 'Orders' },
                { value: 'invoices', label: 'Invoices' },
                { value: 'transfers', label: 'Transfers' },
              ]}
            />
          </Demo>
          <Demo caption="ChipGroup · horizontal scroll">
            <ChipGroup
              scroll
              value={chipSingle}
              onChange={setChipSingle}
              options={[
                { value: 'all', label: 'All' },
                { value: 'products', label: 'Products' },
                { value: 'deliveries', label: 'Deliveries' },
                { value: 'events', label: 'Events' },
                { value: 'suppliers', label: 'Suppliers' },
                { value: 'buyers', label: 'Buyers' },
                { value: 'near', label: 'Near me' },
              ]}
            />
          </Demo>
        </Section>

        {/* ---------------- SegmentedControl ---------------- */}
        <Section title={`SegmentedControl${NEW}`} subtitle="Mutually-exclusive toggle. Supports a locked segment for gated ranges.">
          <Demo caption="2 segments">
            <SegmentedControl
              value={seg2}
              onChange={setSeg2}
              options={[
                { value: 'list', label: 'List', icon: List },
                { value: 'grid', label: 'Grid', icon: LayoutGrid },
              ]}
            />
          </Demo>
          <Demo caption="3 segments (90d locked)">
            <SegmentedControl
              value={seg3}
              onChange={setSeg3}
              options={[
                { value: '7d', label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: '90d', label: '90 days', locked: true },
              ]}
            />
          </Demo>
        </Section>

        {/* ---------------- TextButton ---------------- */}
        <Section title={`TextButton${NEW}`} subtitle="Text-only link actions (Retry / Close / Skip).">
          <Demo caption="tones">
            <View style={styles.row}>
              <TextButton title="Retry" onPress={noop} iconLeft={RefreshCw} />
              <TextButton title="Delete" tone="danger" onPress={noop} />
              <TextButton title="Skip" tone="muted" onPress={noop} />
            </View>
          </Demo>
          <Demo caption="loading">
            <TextButton title="Loading" onPress={noop} loading />
          </Demo>
        </Section>

        {/* ---------------- Fab ---------------- */}
        <Section title={`Fab${NEW}`} subtitle="Floating action button (shown within this bounded box).">
          <Demo caption="bottom-right">
            <View style={styles.fabStage}>
              <Fab icon={Plus} onPress={noop} accessibilityLabel="Create" />
            </View>
          </Demo>
        </Section>

        {/* ---------------- Existing controls ---------------- */}
        <Section title="Existing controls" subtitle="Already in the app — shown for comparison.">
          <Demo caption="ExploreChips (scrollable section strip)">
            <ExploreChips
              chips={['Overall', 'Businesses', 'Products', 'Suppliers', 'Buyers', 'Events']}
              selected={exploreSel}
              onSelect={setExploreSel}
            />
          </Demo>
          <Demo caption="FilterBar (underline tabs)">
            <FilterBar
              statuses={['pending', 'paid', 'overdue']}
              selectedStatus={filterSel}
              onSelectStatus={setFilterSel}
            />
          </Demo>
          <Demo caption="Pill (status badge, non-interactive)">
            <View style={styles.row}>
              <Pill text="Paid" color={theme.colors.success} />
              <Pill text="Pending" color={theme.colors.warning} />
              <Pill text="Unpaid" color={theme.colors.error} />
            </View>
          </Demo>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 48,
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
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'InterCustom-Medium',
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 16,
  },
  demo: {
    gap: 8,
  },
  caption: {
    fontSize: 12,
    fontFamily: 'InterCustom-SemiBold',
    textTransform: 'lowercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  fabStage: {
    height: 110,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,120,0.3)',
  },
});
