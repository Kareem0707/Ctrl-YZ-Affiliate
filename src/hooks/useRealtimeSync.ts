'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeToRealtimeSync } from '@/lib/realtimeSync';

/**
 * Subscribe to cross-tab & server change notifications without re-subscribing on re-renders.
 * Keeps `onSync` in a ref so the subscription lifecycle runs strictly once on mount/unmount.
 */
export function useRealtimeSync(onSync?: () => void) {
  const [isConnected, setIsConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number>(() => Date.now());
  const onSyncRef = useRef(onSync);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSync((data) => {
      setIsConnected(true);
      setLastSyncTime(data.lastModified || Date.now());
      if (onSyncRef.current) {
        onSyncRef.current();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isConnected, lastSyncTime };
}
