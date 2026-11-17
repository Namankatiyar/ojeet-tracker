import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTimeoutFetch } from './supabase';

describe('createTimeoutFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // A fetch that never resolves unless its signal aborts — simulates an overloaded backend.
  const hangingFetch = vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
      })
  );

  it('aborts a hung request after the timeout', async () => {
    const timedFetch = createTimeoutFetch(1_000, hangingFetch as unknown as typeof fetch);
    const pending = timedFetch('https://x.supabase.co/rest/v1/user_sync_state');
    const assertion = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });

  it('passes through successful responses', async () => {
    const ok = new Response('{}', { status: 200 });
    const baseFetch = vi.fn().mockResolvedValue(ok);
    const timedFetch = createTimeoutFetch(1_000, baseFetch);
    await expect(timedFetch('https://x.supabase.co/rest/v1/profiles')).resolves.toBe(ok);
  });

  it('honours an already-aborted caller signal', async () => {
    const timedFetch = createTimeoutFetch(1_000, hangingFetch as unknown as typeof fetch);
    const controller = new AbortController();
    controller.abort(new Error('caller cancelled'));
    await expect(
      timedFetch('https://x.supabase.co/rest/v1/profiles', { signal: controller.signal })
    ).rejects.toThrow('caller cancelled');
  });

  it('does not apply the timeout to storage uploads', async () => {
    const baseFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const timedFetch = createTimeoutFetch(1_000, baseFetch);
    await timedFetch('https://x.supabase.co/storage/v1/object/avatars/a.png', { method: 'POST' });
    expect(baseFetch.mock.calls[0][1]).toEqual({ method: 'POST' });
  });
});
