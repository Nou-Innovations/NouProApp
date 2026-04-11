import { useState, useEffect, useCallback } from 'react';
import { onPaywallEvent, PaywallEvent } from '@/shared/services/api';

/**
 * Hook that listens for PAYWALL errors from the API layer.
 * When a backend call returns a PAYWALL 403, this hook captures the event
 * so the screen can reactively show PaywallModal without manual error parsing.
 *
 * Usage:
 *   const { paywallEvent, clearPaywall } = usePaywallListener();
 *   <PaywallModal
 *     visible={!!paywallEvent}
 *     onClose={clearPaywall}
 *     requiredPlan={paywallEvent?.requiredPlan}
 *     ...
 *   />
 */
export function usePaywallListener() {
  const [paywallEvent, setPaywallEvent] = useState<PaywallEvent | null>(null);

  useEffect(() => {
    return onPaywallEvent((event) => setPaywallEvent(event));
  }, []);

  const clearPaywall = useCallback(() => setPaywallEvent(null), []);

  return { paywallEvent, clearPaywall };
}
