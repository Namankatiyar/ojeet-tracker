import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_REFRESH_GUARD_KEY,
  createBoundedAuthLock,
  createResilientAuthFetch,
  createTimeoutFetch,
} from './supabase';

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

describe('createBoundedAuthLock', () => {
  const originalLocks = Object.getOwnPropertyDescriptor(globalThis.navigator, 'locks');

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalLocks) {
      Object.defineProperty(globalThis.navigator, 'locks', originalLocks);
    } else {
      Reflect.deleteProperty(globalThis.navigator, 'locks');
    }
  });

  it('uses processLock when navigator.locks is unavailable', async () => {
    Reflect.deleteProperty(globalThis.navigator, 'locks');
    const lock = createBoundedAuthLock();
    const order: string[] = [];

    const p1 = lock('auth-lock', 5_000, async () => {
      order.push('start-1');
      await Promise.resolve();
      order.push('end-1');
      return 'first';
    });
    const p2 = lock('auth-lock', 5_000, async () => {
      order.push('start-2');
      order.push('end-2');
      return 'second';
    });

    await expect(Promise.all([p1, p2])).resolves.toEqual(['first', 'second']);
    expect(order).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
  });

  it('bounds acquireTimeout to [1_000, 10_000] (preserving 0) when navigator.locks is available', async () => {
    const requestMock = vi.fn(
      async (
        _name: string,
        _options: LockOptions,
        callback: (lock: Lock | null) => Promise<unknown>
      ) => callback({ name: 'sb-lock', mode: 'exclusive' } as Lock)
    );
    Object.defineProperty(globalThis.navigator, 'locks', {
      configurable: true,
      value: { request: requestMock },
    });

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const lock = createBoundedAuthLock();

    // Negative / infinite timeout (-1) gets clamped up to 1_000ms
    await expect(lock('sb-lock', -1, async () => 'ok-neg')).resolves.toBe('ok-neg');
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1_000);

    // Huge timeout (60_000) gets clamped down to 10_000ms
    setTimeoutSpy.mockClear();
    await expect(lock('sb-lock', 60_000, async () => 'ok-max')).resolves.toBe('ok-max');
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10_000);

    // Zero timeout stays 0 (ifAvailable: true, no timer)
    setTimeoutSpy.mockClear();
    await expect(lock('sb-lock', 0, async () => 'ok-zero')).resolves.toBe('ok-zero');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(requestMock).toHaveBeenLastCalledWith(
      'sb-lock',
      { mode: 'exclusive', ifAvailable: true },
      expect.any(Function)
    );
  });

  it('falls back to processLock on SecurityError or NotSupportedError', async () => {
    for (const errorName of ['SecurityError', 'NotSupportedError']) {
      const requestMock = vi.fn().mockRejectedValue(new DOMException('Denied', errorName));
      Object.defineProperty(globalThis.navigator, 'locks', {
        configurable: true,
        value: { request: requestMock },
      });

      const lock = createBoundedAuthLock();
      await expect(lock(`fallback-${errorName}`, 2_000, async () => errorName)).resolves.toBe(
        errorName
      );
      expect(requestMock).toHaveBeenCalledTimes(1);
    }
  });
});

describe('createResilientAuthFetch', () => {
  const REFRESH_URL = 'https://x.supabase.co/auth/v1/token?grant_type=refresh_token';

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T20:00:00Z'));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('passes through non-refresh requests even when offline or in cooldown', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    localStorage.setItem(
      AUTH_REFRESH_GUARD_KEY,
      JSON.stringify({
        failCount: 3,
        cooldownUntil: Date.now() + 60_000,
        inFlightUntil: 0,
        ownerId: 'other',
      })
    );

    const ok = new Response('{"access_token":"abc"}', { status: 200 });
    const baseFetch = vi.fn().mockResolvedValue(ok);
    const resilientFetch = createResilientAuthFetch(baseFetch);

    for (const url of [
      'https://x.supabase.co/auth/v1/token?grant_type=password',
      'https://x.supabase.co/auth/v1/token?grant_type=pkce',
      'https://x.supabase.co/auth/v1/token?grant_type=id_token',
      'https://x.supabase.co/rest/v1/profiles',
    ]) {
      await expect(resilientFetch(url, { method: 'POST' })).resolves.toBe(ok);
    }
    expect(baseFetch).toHaveBeenCalledTimes(4);
  });

  it('fast-fails with synthetic 503 when offline without calling baseFetch', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const baseFetch = vi.fn();
    const resilientFetch = createResilientAuthFetch(baseFetch);

    const res = await resilientFetch(REFRESH_URL, { method: 'POST' });
    expect(res.status).toBe(503);
    expect(res.statusText).toBe('Offline');
    expect(baseFetch).not.toHaveBeenCalled();
  });

  it.each([429, 500, 502, 503, 504, 522, 524])(
    'normalizes %i refresh responses to 503 and enters cooldown',
    async (status) => {
      const baseFetch = vi.fn().mockResolvedValue(new Response('err', { status }));
      const resilientFetch = createResilientAuthFetch(baseFetch);

      const res1 = await resilientFetch(REFRESH_URL, {
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'rt-1' }),
      });
      expect(res1.status).toBe(503);
      expect(res1.statusText).toBe('Service Unavailable');
      expect(baseFetch).toHaveBeenCalledTimes(1);

      const state = JSON.parse(localStorage.getItem(AUTH_REFRESH_GUARD_KEY) || '{}');
      expect(state.failCount).toBe(1);
      expect(state.inFlightUntil).toBe(0);
      expect(state.cooldownUntil).toBe(Date.now() + 30_000);

      // Immediate retry is suppressed in 0ms without hitting baseFetch
      const res2 = await resilientFetch(REFRESH_URL, {
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'rt-1' }),
      });
      expect(res2.status).toBe(503);
      expect(baseFetch).toHaveBeenCalledTimes(1);
    }
  );

  it('normalizes thrown errors and AbortError to 503 and sets cooldown', async () => {
    const baseFetch = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
      .mockRejectedValueOnce(new Error('network down'));
    const resilientFetch = createResilientAuthFetch(baseFetch);

    const res1 = await resilientFetch(REFRESH_URL, { method: 'POST' });
    expect(res1.status).toBe(503);
    expect(res1.statusText).toBe('Service Unavailable');

    // Advance past 30s cooldown to verify exponential backoff on 2nd failure (60s)
    await vi.advanceTimersByTimeAsync(30_001);
    const res2 = await resilientFetch(REFRESH_URL, { method: 'POST' });
    expect(res2.status).toBe(503);

    const state = JSON.parse(localStorage.getItem(AUTH_REFRESH_GUARD_KEY) || '{}');
    expect(state.failCount).toBe(2);
    expect(state.cooldownUntil).toBe(Date.now() + 60_000);
  });

  it.each([400, 401, 403])(
    'passes %i refresh responses straight through to GoTrueClient and clears lease',
    async (status) => {
      const upstream = new Response(JSON.stringify({ error: 'invalid_grant' }), { status });
      const baseFetch = vi.fn().mockResolvedValue(upstream);
      const resilientFetch = createResilientAuthFetch(baseFetch);

      const res = await resilientFetch(REFRESH_URL, {
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'rt-bad' }),
      });
      expect(res).toBe(upstream);

      const state = JSON.parse(localStorage.getItem(AUTH_REFRESH_GUARD_KEY) || '{}');
      expect(state.inFlightUntil).toBe(0);
      expect(state.failCount).toBe(0);
      expect(state.cooldownUntil).toBe(0);
    }
  );

  it('suppresses refresh when another tab holds an active in-flight lease', async () => {
    localStorage.setItem(
      AUTH_REFRESH_GUARD_KEY,
      JSON.stringify({
        failCount: 0,
        cooldownUntil: 0,
        inFlightUntil: Date.now() + 15_000,
        ownerId: 'another-tab-id',
      })
    );
    const baseFetch = vi.fn();
    const resilientFetch = createResilientAuthFetch(baseFetch);

    const res = await resilientFetch(REFRESH_URL, { method: 'POST' });
    expect(res.status).toBe(503);
    expect(baseFetch).not.toHaveBeenCalled();
  });

  it('suppresses refresh when another tab has already rotated the refresh_token', async () => {
    localStorage.setItem(
      'sb-projref-auth-token',
      JSON.stringify({
        access_token: 'new-at',
        refresh_token: 'rt-rotated-by-other-tab',
      })
    );
    const baseFetch = vi.fn();
    const resilientFetch = createResilientAuthFetch(baseFetch);

    // JSON body
    const resJson = await resilientFetch(REFRESH_URL, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: 'rt-stale' }),
    });
    expect(resJson.status).toBe(503);

    // URL-encoded string body
    const resForm = await resilientFetch(REFRESH_URL, {
      method: 'POST',
      body: 'refresh_token=rt-stale',
    });
    expect(resForm.status).toBe(503);
    expect(baseFetch).not.toHaveBeenCalled();

    // Matching latest token proceeds normally
    baseFetch.mockResolvedValueOnce(new Response('{"access_token":"ok"}', { status: 200 }));
    const resFresh = await resilientFetch(REFRESH_URL, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: 'rt-rotated-by-other-tab' }),
    });
    expect(resFresh.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it('clears cooldown and failCount on 2xx response and on window online recovery', async () => {
    const baseFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 522 }))
      .mockResolvedValueOnce(new Response('{"access_token":"ok"}', { status: 200 }));
    const resilientFetch = createResilientAuthFetch(baseFetch);

    const first = await resilientFetch(REFRESH_URL, { method: 'POST' });
    expect(first.status).toBe(503);

    // Suppressed during cooldown
    const blocked = await resilientFetch(REFRESH_URL, { method: 'POST' });
    expect(blocked.status).toBe(503);
    expect(baseFetch).toHaveBeenCalledTimes(1);

    // Network recovery clears cooldown and failCount immediately
    window.dispatchEvent(new Event('online'));
    const clearedState = JSON.parse(localStorage.getItem(AUTH_REFRESH_GUARD_KEY) || '{}');
    expect(clearedState.failCount).toBe(0);
    expect(clearedState.cooldownUntil).toBe(0);

    const recovered = await resilientFetch(REFRESH_URL, { method: 'POST' });
    expect(recovered.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it('handles private-browsing localStorage errors without crashing', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    const ok = new Response('{}', { status: 200 });
    const baseFetch = vi.fn().mockResolvedValue(ok);
    const resilientFetch = createResilientAuthFetch(baseFetch);

    await expect(
      resilientFetch(REFRESH_URL, {
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'rt-1' }),
      })
    ).resolves.toBe(ok);
  });
});
