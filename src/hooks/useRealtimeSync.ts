'use client';

import { useEffect, useState } from 'react';
import { subscribeToRealtimeSync } from '@/lib/realtimeSync';

export function useRealtimeSync(onSync?: () => void) {
  const [isConnected, setIsConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSync((data) => {
      setIsConnected(true);
      setLastSyncTime(data.lastModified || Date.now());
      if (onSync) {
        onSync();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onSync]);

  return { isConnected, lastSyncTime };
}
