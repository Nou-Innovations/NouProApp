/**
 * GalleryCard — one row per gallery entry. Shows the name, source location, a
 * color-coded recommendation badge and a compact attribute-chip row. Tapping the
 * body expands the full attribute table; the "Preview" button opens the live demo.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { GalleryEntry, RECOMMENDATION_META } from '../data/bottomSheetRegistry';

interface GalleryCardProps {
  entry: GalleryEntry;
  onPreview: (entry: GalleryEntry) => void;
}

export default function GalleryCard({ entry, onPreview }: GalleryCardProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const a = entry.attributes;
  const rec = RECOMMENDATION_META[entry.recommendation];
  const badgeColor = resolveColor(rec.color, theme.colors);

  const chips = [
    a.animationType,
    a.backdrop.replace('rgba(', '').replace(')', ''),
    `r${a.radius}`,
    a.dragHandle ? 'handle' : 'no handle',
  ];

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderColor }]}>
      <Pressable onPress={toggle} style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {entry.name}
          </Text>
          <Text style={[styles.source, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {entry.source}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color={theme.colors.iconMuted} strokeWidth={2} />
        ) : (
          <ChevronDown size={20} color={theme.colors.iconMuted} strokeWidth={2} />
        )}
      </Pressable>

      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{rec.label}</Text>
        </View>
        {chips.map((c) => (
          <View key={c} style={[styles.chip, { backgroundColor: theme.colors.buttonBackground }]}>
            <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>{c}</Text>
          </View>
        ))}
      </View>

      {expanded ? (
        <View style={[styles.details, { borderTopColor: theme.colors.borderColor }]}>
          <AttrRow label="Animation" value={a.animationType} />
          <AttrRow label="Transparent" value={yesNo(a.transparent)} />
          <AttrRow label="Backdrop" value={a.backdrop} />
          <AttrRow label="Corner radius" value={String(a.radius)} />
          <AttrRow label="Drag handle" value={yesNo(a.dragHandle)} />
          <AttrRow label="Close (X) button" value={yesNo(a.closeButton)} />
          <AttrRow label="Safe-area handled" value={yesNo(a.safeArea)} />
          <AttrRow label="Uses OVERLAY token" value={yesNo(a.usesOverlayToken)} />
          {entry.note ? (
            <Text style={[styles.note, { color: theme.colors.textLight }]}>{entry.note}</Text>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity
        onPress={() => onPreview(entry)}
        style={[styles.previewBtn, { backgroundColor: theme.colors.primary }]}
        activeOpacity={0.8}
      >
        <Text style={[styles.previewText, { color: theme.colors.background }]}>Preview</Text>
      </TouchableOpacity>
    </View>
  );
}

function AttrRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.attrRow}>
      <Text style={[styles.attrLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.attrValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const yesNo = (v: boolean) => (v ? 'Yes' : 'No');

function resolveColor(key: string, colors: Record<string, string>): string {
  if (key === 'purple') return '#8B5CF6';
  return colors[key] ?? colors.neutral ?? '#999999';
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  name: {
    fontSize: 16,
    fontFamily: 'InterCustom-Bold',
  },
  source: {
    fontSize: 12,
    fontFamily: 'InterCustom-Regular',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'InterCustom-Bold',
    color: '#FFFFFF',
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'InterCustom-Medium',
  },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 10,
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  attrLabel: {
    fontSize: 13,
    fontFamily: 'InterCustom-Medium',
  },
  attrValue: {
    fontSize: 13,
    fontFamily: 'InterCustom-SemiBold',
    flexShrink: 1,
    textAlign: 'right',
    paddingLeft: 12,
  },
  note: {
    fontSize: 13,
    fontFamily: 'InterCustom-Medium',
    lineHeight: 20,
    marginTop: 8,
  },
  previewBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    fontSize: 15,
    fontFamily: 'InterCustom-Bold',
  },
});
