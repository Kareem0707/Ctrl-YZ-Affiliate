'use client';

type SyncCallback = (data: { eventType?: string; lastModified: number }) => void;

let broadcastChannel: BroadcastChannel | null = null;
let syncInterval: NodeJS.Timeout | null = null;
let lastKnownTimestamp = 0;
const subscribers = new Set<SyncCallback>();

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel('ctrl_yz_realtime_sync');
      broadcastChannel.onmessage = (event) => {
        const payload = event.data;
        if (payload?.lastModified) {
          lastKnownTimestamp = Math.max(lastKnownTimestamp, payload.lastModified);
        }
        window.dispatchEvent(new CustomEvent('affiliate_data_changed', { detail: payload }));
        subscribers.forEach((cb) => cb(payload));
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported or blocked:', e);
    }
  }
  return broadcastChannel;
}

export function broadcastLocalChange(type: string, entityId?: string): void {
  if (typeof window === 'undefined') return;
  const timestamp = Date.now();
  lastKnownTimestamp = timestamp;

  const payload = { eventType: type, entityId, lastModified: timestamp };

  // 1. Dispatch in current window
  window.dispatchEvent(new CustomEvent('affiliate_data_changed', { detail: payload }));

  // 2. Broadcast across tabs
  const ch = getBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage(payload);
    } catch (e) {
      console.error('Error posting to broadcast channel:', e);
    }
  }
}

export function startRealtimePolling(intervalMs = 3000): () => void {
  if (typeof window === 'undefined') return () => {};

  getBroadcastChannel();

  if (syncInterval) {
    return () => {};
  }

  const poll = async () => {
    try {
      const res = await fetch(`/api/sync?since=${lastKnownTimestamp}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data.hasChanges && data.lastModified > lastKnownTimestamp) {
        lastKnownTimestamp = data.lastModified;
        window.dispatchEvent(
          new CustomEvent('affiliate_data_changed', {
            detail: { lastModified: data.lastModified, events: data.events },
          })
        );
        subscribers.forEach((cb) => cb(data));
      }
    } catch {
      // Ignore network errors during background polling
    }
  };

  syncInterval = setInterval(poll, intervalMs);

  return () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  };
}

export function subscribeToRealtimeSync(callback: SyncCallback): () => void {
  subscribers.add(callback);
  startRealtimePolling();

  return () => {
    subscribers.delete(callback);
  };
}
