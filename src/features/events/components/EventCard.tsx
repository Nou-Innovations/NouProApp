import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ListItemCard } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { type BizEvent, EVENT_TYPE_LABELS, formatEventDate } from '../events.service';

interface Props {
  event: BizEvent;
  onPress: () => void;
  onRsvp?: () => void;
  showRsvp?: boolean;
}

export default function EventCard({ event, onPress, onRsvp, showRsvp }: Props) {
  const { theme: appTheme } = useTheme();
  const e = event;
  const place = e.isOnline ? 'Online' : e.locationText || '';
  const subtitle = [EVENT_TYPE_LABELS[e.type] || e.type, formatEventDate(e.startAt), place].filter(Boolean).join(' · ');

  const rsvpBtn =
    showRsvp && onRsvp ? (
      <TouchableOpacity onPress={onRsvp} style={[styles.btn, { backgroundColor: appTheme.colors.primary }]}>
        <Text style={styles.btnText}>RSVP</Text>
      </TouchableOpacity>
    ) : undefined;

  return (
    <ListItemCard
      avatar={{
        type: e.coverImageUrl ? 'image' : 'icon',
        imageUri: e.coverImageUrl,
        icon: 'calendar-outline',
        userId: e.id,
        userName: e.title,
      }}
      title={e.title}
      subtitle={subtitle}
      extraInfo={e.business?.name || undefined}
      onPress={onPress}
      rightColumn={rsvpBtn}
    />
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});
