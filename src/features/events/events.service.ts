/**
 * Events Service - B2B networking / workshops / conferences (Explore marketplace).
 * Endpoints: /api/events ...
 */
import { get, post, patch, del } from '@/shared/services/api';

export type EventType = 'workshop' | 'coffee_connect' | 'conference' | 'panel' | 'webinar' | 'networking' | 'other';
export type EventStatus = 'scheduled' | 'cancelled' | 'completed';
export type RSVPStatus = 'going' | 'interested' | 'cancelled';

export interface EventBusinessRef {
  id: string;
  name: string;
  logoUrl?: string | null;
  industry?: string | null;
  category?: string | null;
  isVerified?: boolean;
}

export interface BizEvent {
  id: string;
  businessId: string;
  title: string;
  description?: string | null;
  type: EventType;
  startAt: string;
  endAt?: string | null;
  locationText?: string | null;
  isOnline: boolean;
  onlineUrl?: string | null;
  coverImageUrl?: string | null;
  capacity?: number | null;
  status: EventStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  business?: EventBusinessRef;
  rsvpCount?: number;
}

export interface EventRSVPItem {
  id: string;
  eventId: string;
  businessId: string;
  userId: string;
  status: RSVPStatus;
  createdAt: string;
}

export interface EventFilters {
  type?: EventType;
  locationText?: string;
  isOnline?: boolean;
  limit?: number;
}

export interface CreateEventData {
  businessId: string;
  title: string;
  description?: string;
  type?: EventType;
  startAt: string;
  endAt?: string;
  locationText?: string;
  isOnline?: boolean;
  onlineUrl?: string;
  coverImageUrl?: string;
  capacity?: number;
}

export async function listUpcomingEvents(filters: EventFilters = {}): Promise<BizEvent[]> {
  const q: Record<string, string | number | boolean> = {};
  if (filters.type) q.type = filters.type;
  if (filters.locationText) q.locationText = filters.locationText;
  if (filters.isOnline != null) q.isOnline = filters.isOnline;
  if (filters.limit) q.limit = filters.limit;
  return get<BizEvent[]>('/events', q);
}

export async function getMyEvents(businessId: string): Promise<BizEvent[]> {
  return get<BizEvent[]>('/events/mine', { businessId });
}

export async function getEvent(id: string): Promise<BizEvent> {
  return get<BizEvent>(`/events/${id}`);
}

export async function createEvent(data: CreateEventData): Promise<BizEvent> {
  return post<BizEvent>('/events', data);
}

export async function updateEvent(
  id: string,
  patchData: Partial<CreateEventData> & { status?: EventStatus },
): Promise<BizEvent> {
  return patch<BizEvent>(`/events/${id}`, patchData);
}

export async function deleteEvent(id: string): Promise<void> {
  return del(`/events/${id}`);
}

export async function rsvpEvent(id: string, businessId: string, status: RSVPStatus = 'going'): Promise<EventRSVPItem> {
  return post<EventRSVPItem>(`/events/${id}/rsvp`, { businessId, status });
}

export async function getEventRsvps(id: string): Promise<EventRSVPItem[]> {
  return get<EventRSVPItem[]>(`/events/${id}/rsvps`);
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  workshop: 'Workshop',
  coffee_connect: 'Coffee Connect',
  conference: 'Conference',
  panel: 'Panel',
  webinar: 'Webinar',
  networking: 'Networking',
  other: 'Other',
};

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
