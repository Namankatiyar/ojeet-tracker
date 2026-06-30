import { registerSW } from './pwaRegister';

type PwaBridgeState = {
  needRefresh: boolean;
  offlineReady: boolean;
  dismissUpdate: boolean;
  lastError: string | null;
};

const BRIDGE_CACHE_CLEANUP_KEY = 'pcm-tracker-bridge-cache-cleanup-v1';
const CACHE_PREFIXES_TO_CLEAR = ['workbox-precache', 'workbox-runtime', 'vite-pwa'];

const state: PwaBridgeState = {
  needRefresh: false,
  offlineReady: false,
  dismissUpdate: false,
  lastError: null,
};

const listeners = new Set<(next: PwaBridgeState) => void>();
let initialized = false;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

function publish(partial: Partial<PwaBridgeState>) {
  Object.assign(state, partial);
  const snapshot = { ...state };
  listeners.forEach((listener) => listener(snapshot));
}

async function cleanupLegacyCachesOnce() {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  if (localStorage.getItem(BRIDGE_CACHE_CLEANUP_KEY) === '1') return;

  try {
    const cacheNames = await caches.keys();
    const deletionTasks = cacheNames
      .filter((name) => CACHE_PREFIXES_TO_CLEAR.some((prefix) => name.startsWith(prefix)))
      .map((name) => caches.delete(name));

    await Promise.all(deletionTasks);
    localStorage.setItem(BRIDGE_CACHE_CLEANUP_KEY, '1');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown cache cleanup error';
    publish({ lastError: message });
  }
}

export function initPwaBridge() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  void cleanupLegacyCachesOnce();

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      publish({ needRefresh: true, dismissUpdate: false });
    },
    onOfflineReady() {
      publish({ offlineReady: true });
    },
    onRegisterError(error: any) {
      publish({ lastError: error?.message ?? 'Service worker registration failed' });
    },
  });
}

export function getPwaBridgeState(): PwaBridgeState {
  return { ...state };
}

export function subscribePwaBridge(listener: (next: PwaBridgeState) => void) {
  listeners.add(listener);
  listener(getPwaBridgeState());
  return () => {
    listeners.delete(listener);
  };
}

export function dismissUpdateNotice() {
  publish({ dismissUpdate: true });
}

export async function applyPwaUpdate() {
  if (updateSW) {
    await updateSW(true);
    return;
  }
  window.location.reload();
}

export async function runPwaRecoveryAndReload() {
  if (typeof window === 'undefined') return;

  console.warn('[PWA] Triggering emergency recovery and reload...');

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    publish({
      needRefresh: false,
      offlineReady: false,
      dismissUpdate: false,
      lastError: null,
    });

    // Clear some critical localStorage flags that might be causing loops
    localStorage.removeItem(BRIDGE_CACHE_CLEANUP_KEY);

    window.location.reload();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recovery failed';
    publish({ lastError: message });
  }
}

// Global exposure for emergency use by other modules (e.g. RemoteSyncContext)
if (typeof window !== 'undefined') {
  (window as any).__FORCE_PWA_UPDATE__ = runPwaRecoveryAndReload;
}
