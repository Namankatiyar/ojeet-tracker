import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// NOTE (Issue #4 — auth churn): Supabase Auth JWT expiry is expected to be set to
// 24h (86400s) in the Supabase dashboard (Project Settings → Auth). The default 1h
// expiry caused a token refresh roughly every hour per device, each writing an
// insert + revoke to auth.refresh_tokens (~700 MB WAL). With autoRefreshToken enabled
// below and a 24h JWT, refreshes happen ~once/day/device — infrequent on purpose.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
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
