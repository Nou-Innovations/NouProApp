import React from 'react';
import { AppButton, ListItemCard } from '@/shared/components/ui';
import { type Opportunity, OPPORTUNITY_TYPE_LABELS } from '../opportunities.service';

interface Props {
  opportunity: Opportunity;
  onPress: () => void;
  onRespond?: () => void;
  showRespond?: boolean;
}

function budgetText(o: Opportunity): string | null {
  if (o.budgetMin == null && o.budgetMax == null) return null;
  const min = o.budgetMin != null ? `${o.budgetMin}` : '';
  const max = o.budgetMax != null ? `${o.budgetMax}` : '';
  const sep = o.budgetMin != null && o.budgetMax != null ? '–' : '';
  return `${o.currency} ${min}${sep}${max}`.trim();
}

export default function OpportunityCard({ opportunity, onPress, onRespond, showRespond }: Props) {
  const o = opportunity;
  const subtitle = [OPPORTUNITY_TYPE_LABELS[o.type] || o.type, o.locationText, budgetText(o)]
    .filter(Boolean)
    .join(' · ');

  const respondBtn =
    showRespond && onRespond ? (
      <AppButton title="Respond" onPress={onRespond} size="small" />
    ) : undefined;

  return (
    <ListItemCard
      avatar={{
        type: o.business?.logoUrl ? 'image' : 'icon',
        imageUri: o.business?.logoUrl,
        icon: 'briefcase-outline',
        userId: o.businessId,
        userName: o.business?.name || 'Business',
      }}
      title={o.title}
      subtitle={subtitle}
      extraInfo={o.business?.name || undefined}
      onPress={onPress}
      rightColumn={respondBtn}
    />
  );
}
