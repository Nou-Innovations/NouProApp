import { useState, useEffect, useCallback } from 'react';
import { SubscriptionDetails } from '@/shared/types/payment';
import { getSubscriptionStatus } from '../payments.service';

export function useSubscription(businessId: string) {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSubscriptionStatus(businessId);
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const isActive = subscription?.status === 'active' || subscription?.status === 'grace';

  const daysRemaining = subscription?.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return { subscription, loading, isActive, daysRemaining, refetch: fetch };
}
