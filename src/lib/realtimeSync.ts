'use client';

type SyncCallback = (data: { eventType?: string; lastModified: number }) => void;

const POLL_INTERVAL_MS = 15000; // Calm 15s polling when tab is visible

let broadcastChannel: BroadcastChannel | null = null;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let visibilityHandlerRegistered = false;
let lastKnownTimestamp = 0;
let baselineInitialized = false;
let pollInFlight = false;
const subscribers = new Set<SyncCallback>();

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel('ctrl_yz_realtime_sync');
      broadcastChannel.onmessage = (event) => {
        const payload = event.data;
        if (!payload || typeof payload !== 'object') return;
        if (typeof payload.lastModified === 'number') {
          lastKnownTimestamp = Math.max(lastKnownTimestamp, payload.lastModified);
          baselineInitialized = true;
        }
        subscribers.forEach((cb) => cb(payload));
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported or blocked:', e);
    }
  }
  return broadcastChannel;
}

/**
 * Emit a confirmed local mutation across the current tab and other open tabs.
 * MUST ONLY be called after a confirmed 2xx server mutation (never from GET reads).
 */
export function broadcastLocalChange(type: string, entityId?: string): void {
  if (typeof window === 'undefined') return;
  const timestamp = Date.now();
  lastKnownTimestamp = Math.max(lastKnownTimestamp, timestamp);
  baselineInitialized = true;

  const payload = { eventType: type, entityId, lastModified: timestamp };

  // 1. Notify current-tab listeners (both custom event and active subscribers)
  window.dispatchEvent(new CustomEvent('affiliate_data_changed', { detail: payload }));

  // 2. Broadcast to other open tabs via BroadcastChannel
  const ch = getBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage(payload);
    } catch (e) {
      console.error('Error posting to broadcast channel:', e);
    }
  }
}

async function pollServerSync(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (document.hidden || pollInFlight || subscribers.size === 0) return;

  pollInFlight = true;
  try {
    const querySince = baselineInitialized ? lastKnownTimestamp : 0;
    const res = await fetch(`/api/sync?since=${querySince}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return;

    const data = await res.json();
    const serverLastModified = Number(data?.lastModified || 0);

    // First poll only establishes baseline timestamp — NEVER triggers redundant immediate refetch
    if (!baselineInitialized) {
      baselineInitialized = true;
      lastKnownTimestamp = serverLastModified;
      return;
    }

    if (data?.hasChanges && serverLastModified > lastKnownTimestamp) {
      lastKnownTimestamp = serverLastModified;
      const payload = { eventType: 'server_sync', lastModified: serverLastModified };
      subscribers.forEach((cb) => cb(payload));
    }
  } catch {
    // Ignore transient network errors during background polling
  } finally {
    pollInFlight = false;
  }
}

function stopPollingLoop(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

function startPollingLoop(intervalMs = POLL_INTERVAL_MS): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (subscribers.size === 0 || document.hidden) return;
  if (syncInterval) return;

  syncInterval = setInterval(() => {
    void pollServerSync();
  }, intervalMs);
}

function handleVisibilityChange(): void {
  if (typeof document === 'undefined') return;
  if (document.hidden) {
    stopPollingLoop();
  } else if (subscribers.size > 0) {
    void pollServerSync();
    startPollingLoop();
  }
}

export function startRealtimePolling(intervalMs = POLL_INTERVAL_MS): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  getBroadcastChannel();

  if (!visibilityHandlerRegistered) {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    visibilityHandlerRegistered = true;
  }

  if (!baselineInitialized && !document.hidden) {
    // Establish initial server timestamp silently without firing subscriber callbacks
    void pollServerSync();
  }

  startPollingLoop(intervalMs);

  return () => {
    if (subscribers.size === 0) {
      stopPollingLoop();
    }
  };
}

export function subscribeToRealtimeSync(callback: SyncCallback): () => void {
  subscribers.add(callback);
  startRealtimePolling();

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      stopPollingLoop();
      if (typeof document !== 'undefined' && visibilityHandlerRegistered) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        visibilityHandlerRegistered = false;
      }
    }
  };
}
