import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Default ceiling for a single Supabase request before it is aborted. */
export const SUPABASE_REQUEST_TIMEOUT_MS = 20_000;

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

    const controller = new AbortController();
    const callerSignal = init?.signal;
    const onCallerAbort = () => controller.abort(callerSignal?.reason);
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort(callerSignal.reason);
      else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
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
      global: { fetch: createTimeoutFetch() },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Custom no-op lock to prevent navigator.locks deadlocks in background tabs or Strict Mode
        lock: async (_name, _acquireTimeout, fn) => {
          return await fn();
        },
      },
    })
  : null;
