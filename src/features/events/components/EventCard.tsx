import React from 'react';
import { AppButton, ListItemCard } from '@/shared/components/ui';
import { type BizEvent, EVENT_TYPE_LABELS, formatEventDate } from '../events.service';

interface Props {
  event: BizEvent;
  onPress: () => void;
  onRsvp?: () => void;
  showRsvp?: boolean;
}

export default function EventCard({ event, onPress, onRsvp, showRsvp }: Props) {
  const e = event;
  const place = e.isOnline ? 'Online' : e.locationText || '';
  const subtitle = [EVENT_TYPE_LABELS[e.type] || e.type, formatEventDate(e.startAt), place].filter(Boolean).join(' · ');

  const rsvpBtn =
    showRsvp && onRsvp ? (
      <AppButton title="RSVP" onPress={onRsvp} size="small" />
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
