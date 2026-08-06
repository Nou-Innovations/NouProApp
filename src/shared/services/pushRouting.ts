/**
 * Routing for push-notification taps.
 *
 * Before this existed, tapping a push just opened the app wherever it happened to be:
 * `addNotificationResponseListener` had zero call sites, so every `data` payload the
 * backend sends was discarded.
 *
 * Three things make this harder than one listener:
 *  1. A tap can arrive on a COLD start, before any listener is registered — handled by
 *     reading the last notification response at startup.
 *  2. A tap can arrive while the user is LOGGED OUT. The auth screens live in a separate
 *     NavigationContainer, so there is nothing to navigate to yet — the target is parked
 *     here and replayed once the app is signed in and ready.
 *  3. React Navigation may not be mounted yet when either of the above fires, so
 *     navigation goes through a container ref rather than a hook.
 */
import { createNavigationContainerRef } from '@react-navigation/native';

/** Ref for the signed-in NavigationContainer. Attached in App.tsx. */
export const navigationRef = createNavigationContainerRef();

/** A resolved navigation destination. */
export interface PushTarget {
  screen: string;
  params?: Record<string, unknown>;
}

/**
 * Map a push `data` payload to a screen.
 *
 * Keys come from the backend's pushService.sendToUsers({ data }) call sites. Chat pushes
 * are the one legacy shape: they carry a bare `chatId` with no `type`.
 */
export function resolvePushTarget(data: unknown): PushTarget | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, any>;

  // Chat messages: legacy payload with no `type`.
  if (d.chatId) {
    return { screen: 'Chat', params: { id: d.chatId, name: d.chatName || 'Chat' } };
  }

  switch (d.type) {
    // ---- social ----
    case 'connection_request':
    case 'connection_accepted':
      return d.userId ? { screen: 'ViewUserProfile', params: { userId: d.userId } } : { screen: 'Notifications' };

    // ---- company / team ----
    case 'business_connection_request':
    case 'business_connection_accepted':
      return d.companyId
        ? { screen: 'ViewBusinessProfile', params: { businessId: d.companyId } }
        : { screen: 'Notifications' };
    case 'invite_received':
    case 'join_request_accepted':
    case 'join_request_rejected':
      return { screen: 'Notifications' };
    case 'join_request':
    case 'join_accepted':
      return { screen: 'TeamManagement' };

    // ---- operations ----
    case 'delivery_status':
      return d.deliveryId ? { screen: 'DeliveryDetail', params: { deliveryId: d.deliveryId } } : null;
    case 'issue':
      return d.issueId ? { screen: 'Issues' } : null;
    case 'stuck_orders':
      return { screen: 'Orders' };
    default:
      break;
  }

  // Subscription pushes share a prefix.
  if (typeof d.type === 'string' && d.type.startsWith('subscription_')) {
    return { screen: 'SubscriptionPlans' };
  }
  return null;
}

// ---- Deferred target (cold start / not yet signed in) ----

let pendingTarget: PushTarget | null = null;

export function setPendingPushTarget(target: PushTarget | null): void {
  pendingTarget = target;
}

/** Read and clear the parked target. */
export function consumePendingPushTarget(): PushTarget | null {
  const t = pendingTarget;
  pendingTarget = null;
  return t;
}

/**
 * Navigate now if the container is ready, otherwise park the target for replay.
 * Screens that live inside the business tab shell are routed through 'Tabs'.
 */
const TAB_SHELL_SCREENS = new Set(['TeamManagement', 'Orders', 'Issues']);

export function navigateToPushTarget(target: PushTarget | null): void {
  if (!target) return;
  if (!navigationRef.isReady()) {
    setPendingPushTarget(target);
    return;
  }
  // The ref is untyped here (the RootStack param list lives in App.tsx), so widen it
  // rather than fight the overloads with `as never`.
  const nav = navigationRef as unknown as {
    navigate: (screen: string, params?: object) => void;
  };
  try {
    if (TAB_SHELL_SCREENS.has(target.screen)) {
      nav.navigate('Tabs', { screen: target.screen, params: target.params });
    } else {
      nav.navigate(target.screen, target.params);
    }
  } catch (err) {
    console.warn('[Push] Could not navigate to target:', target.screen, err);
  }
}
