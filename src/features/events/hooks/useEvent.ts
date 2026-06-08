import { useCallback, useEffect, useState } from 'react';
import { getEvent, getEventRsvps, type BizEvent, type EventRSVPItem } from '../events.service';

/** Loads an event + its RSVPs (RSVP list is organizer-only on the backend; others get []). */
export function useEvent(id: string) {
  const [event, setEvent] = useState<BizEvent | null>(null);
  const [rsvps, setRsvps] = useState<EventRSVPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvent(await getEvent(id));
      try {
        setRsvps(await getEventRsvps(id));
      } catch {
        setRsvps([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { event, rsvps, loading, error, refresh: load };
}

export default useEvent;
