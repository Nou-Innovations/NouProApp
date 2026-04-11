/**
 * useNetworkStatus Hook
 *
 * Subscribes to network connectivity changes using @react-native-community/netinfo.
 * Returns current connection status.
 */

import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: !!state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return () => unsubscribe();
  }, []);

  return status;
}
