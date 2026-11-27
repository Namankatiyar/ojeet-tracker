import { createClient, navigatorLock, processLock } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Default ceiling for a single Supabase request before it is aborted. */
export const SUPABASE_REQUEST_TIMEOUT_MS = 20_000;

/** Cross-tab localStorage key coordinating refresh cooldowns and in-flight leases. */
export const AUTH_REFRESH_GUARD_KEY = 'ojeet-auth-refresh-guard';

const TAB_OWNER_ID =
  typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`;

interface AuthRefreshGuardState {
  failCount: number;
  cooldownUntil: number;
  inFlightUntil: number;
  ownerId: string;
}

const DEFAULT_GUARD_STATE: AuthRefreshGuardState = {
  failCount: 0,
  cooldownUntil: 0,
  inFlightUntil: 0,
  ownerId: '',
};

function readGuardState(): AuthRefreshGuardState {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_GUARD_STATE };
    const raw = localStorage.getItem(AUTH_REFRESH_GUARD_KEY);
    if (!raw) return { ...DEFAULT_GUARD_STATE };
    const parsed = JSON.parse(raw) as Partial<AuthRefreshGuardState> | null;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_GUARD_STATE };
    return {
      failCount:
        typeof parsed.failCount === 'number' && Number.isFinite(parsed.failCount)
          ? Math.max(0, parsed.failCount)
          : 0,
      cooldownUntil:
        typeof parsed.cooldownUntil === 'number' && Number.isFinite(parsed.cooldownUntil)
          ? Math.max(0, parsed.cooldownUntil)
          : 0,
      inFlightUntil:
        typeof parsed.inFlightUntil === 'number' && Number.isFinite(parsed.inFlightUntil)
          ? Math.max(0, parsed.inFlightUntil)
          : 0,
      ownerId: typeof parsed.ownerId === 'string' ? parsed.ownerId : '',
    };
  } catch {
    return { ...DEFAULT_GUARD_STATE };
  }
}

function writeGuardState(state: AuthRefreshGuardState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(AUTH_REFRESH_GUARD_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures in private browsing or restricted contexts.
  }
}

function extractRefreshTokenFromBody(body: BodyInit | null | undefined): string | null {
  if (!body) return null;
  if (body instanceof URLSearchParams) {
    return body.get('refresh_token');
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const val = body.get('refresh_token');
    return typeof val === 'string' ? val : null;
  }
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as { refresh_token?: unknown } | null;
        if (parsed && typeof parsed.refresh_token === 'string') {
          return parsed.refresh_token;
        }
      } catch {
        // Not valid JSON; fall through to URLSearchParams parsing.
      }
    }
    const params = new URLSearchParams(body);
    return params.get('refresh_token');
  }
  return null;
}

function getStoredLatestRefreshToken(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as {
          refresh_token?: unknown;
          currentSession?: { refresh_token?: unknown };
        } | null;
        if (!parsed || typeof parsed !== 'object') continue;
        if (typeof parsed.refresh_token === 'string' && parsed.refresh_token.length > 0) {
          return parsed.refresh_token;
        }
        if (
          parsed.currentSession &&
          typeof parsed.currentSession.refresh_token === 'string' &&
          parsed.currentSession.refresh_token.length > 0
        ) {
          return parsed.currentSession.refresh_token;
        }
      } catch {
        // Ignore malformed entries and continue scanning.
      }
    }
  } catch {
    return null;
  }
  return null;
}

function computeRefreshCooldownMs(failCount: number): number {
  const baseCooldownMs = Math.min(300_000, 30_000 * 2 ** Math.max(0, failCount - 1));
  const jitterFactor = 0.9 + Math.random() * 0.2;
  return Math.min(300_000, Math.round(baseCooldownMs * jitterFactor));
}

function recordRefreshFailure(): Response {
  const latest = readGuardState();
  const nextFailCount = latest.failCount + 1;
  const cooldownMs = computeRefreshCooldownMs(nextFailCount);
  writeGuardState({
    failCount: nextFailCount,
    cooldownUntil: Date.now() + cooldownMs,
    inFlightUntil: 0,
    ownerId: TAB_OWNER_ID,
  });
  return new Response(null, { status: 503, statusText: 'Service Unavailable' });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const current = readGuardState();
    if (current.failCount !== 0 || current.cooldownUntil !== 0 || current.inFlightUntil !== 0) {
      writeGuardState({
        ...current,
        failCount: 0,
        cooldownUntil: 0,
        inFlightUntil: 0,
      });
    }
  });
}

/**
 * Bounded cross-tab auth lock using Web Locks (`navigatorLock`) with a bounded
 * acquisition timeout (`1s..10s`, preserving `0` try-lock) and automatic fallback
 * to `processLock` in environments without Web Locks or where Locks throw
 * `SecurityError`, `NotSupportedError`, or acquire timeout errors.
 */
export function createBoundedAuthLock() {
  return async <R>(
    name: string,
    acquireTimeout: number,
    fn: () => Promise<R>
  ): Promise<R> => {
    if (typeof globalThis.navigator?.locks?.request === 'function') {
      const boundedTimeout =
        acquireTimeout === 0 ? 0 : Math.min(Math.max(acquireTimeout, 1_000), 10_000);
      try {
        return await navigatorLock(name, boundedTimeout, fn);
      } catch (err) {
        const errName =
          err && typeof err === 'object' && 'name' in err
            ? (err as { name?: unknown }).name
            : undefined;
        const isAcquireTimeout =
          Boolean(
            err &&
              typeof err === 'object' &&
              'isAcquireTimeout' in err &&
              (err as { isAcquireTimeout?: unknown }).isAcquireTimeout
          ) || errName === 'NavigatorLockAcquireTimeoutError';
        if (errName === 'SecurityError' || errName === 'NotSupportedError' || isAcquireTimeout) {
          return await processLock(name, boundedTimeout, fn);
        }
        throw err;
      }
    }
    return await processLock(name, acquireTimeout, fn);
  };
}

/**
 * Wraps fetch to guard `/auth/v1/token?grant_type=refresh_token` requests against
 * offline bursts, cross-tab races, stale rotated tokens, and transient upstream
 * failures (429/5xx/522/524/network errors) that would otherwise trigger session loss.
 */
export function createResilientAuthFetch(
  baseFetch: typeof fetch = (...args) => fetch(...args)
): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Only gate refresh_token grants; pass through password, pkce, id_token, REST, storage, etc.
    if (!(url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token'))) {
      return baseFetch(input, init);
    }

    // 1) Offline fast-fail
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return new Response(null, { status: 503, statusText: 'Offline' });
    }

    const now = Date.now();
    const state = readGuardState();

    // 2) Cooldown circuit breaker
    if (now < state.cooldownUntil) {
      return new Response(null, { status: 503, statusText: 'Service Unavailable' });
    }

    // 3) Cross-tab in-flight lease
    if (state.inFlightUntil > now && state.ownerId !== TAB_OWNER_ID) {
      return new Response(null, { status: 503, statusText: 'Service Unavailable' });
    }

    // 4) Stale rotated refresh_token check
    const requestRefreshToken = extractRefreshTokenFromBody(init?.body);
    if (requestRefreshToken) {
      const latestStoredToken = getStoredLatestRefreshToken();
      if (latestStoredToken && latestStoredToken !== requestRefreshToken) {
        return new Response(null, { status: 503, statusText: 'Service Unavailable' });
      }
    }

    // Acquire cross-tab lease before hitting the network
    writeGuardState({
      ...state,
      inFlightUntil: Date.now() + SUPABASE_REQUEST_TIMEOUT_MS + 2_000,
      ownerId: TAB_OWNER_ID,
    });

    try {
      const response = await baseFetch(input, init);

      if (response.status >= 200 && response.status < 300) {
        writeGuardState({
          failCount: 0,
          cooldownUntil: 0,
          inFlightUntil: 0,
          ownerId: TAB_OWNER_ID,
        });
        return response;
      }

      if (response.status === 429 || response.status >= 500) {
        return recordRefreshFailure();
      }

      // 400, 401, 403 (and other terminal 4xx): pass straight through to GoTrueClient and clear lease
      const latest = readGuardState();
      writeGuardState({
        ...latest,
        inFlightUntil: 0,
      });
      return response;
    } catch {
      return recordRefreshFailure();
    }
  };
}

/**
 * Wraps fetch so every request is aborted after `timeoutMs`.
 *
 * When Supabase is overloaded, requests can hang indefinitely instead of failing.
 * A hung request leaves callers (e.g. the sync engine's in-flight guard) stuck
 * forever, so we convert hangs into ordinary, retryable failures. Storage
 * uploads are exempt because large avatars on slow links can legitimately take longer.
 */
export function createTimeoutFetch(
  timeoutMs: number = SUPABASE_REQUEST_TIMEOUT_MS,
  baseFetch: typeof fetch = (...args) => fetch(...args)
): typeof fetch {
  return (input, init) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/storage/v1/')) return baseFetch(input, init);

    const callerSignal = init?.signal;
    if (callerSignal?.aborted) {
      return Promise.reject(
        callerSignal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
      );
    }

    const controller = new AbortController();
    const onCallerAbort = () => controller.abort(callerSignal?.reason);
    if (callerSignal) {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }
    const timer = setTimeout(
      () => controller.abort(new Error(`Supabase request timed out after ${timeoutMs}ms`)),
      timeoutMs
    );

    return baseFetch(input, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    });
  };
}

// NOTE (Issue #4 — auth churn): Supabase Auth JWT expiry is expected to be set to
// 24h (86400s) in the Supabase dashboard (Project Settings → Auth). The default 1h
// expiry caused a token refresh roughly every hour per device, each writing an
// insert + revoke to auth.refresh_tokens (~700 MB WAL). With autoRefreshToken enabled
// below and a 24h JWT, refreshes happen ~once/day/device — infrequent on purpose.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { fetch: createResilientAuthFetch(createTimeoutFetch()) },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: createBoundedAuthLock(),
      },
    })
  : null;
