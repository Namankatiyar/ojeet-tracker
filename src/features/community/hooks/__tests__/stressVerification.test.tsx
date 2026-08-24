import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { useActivityHeartbeat } from '../useActivityHeartbeat';
import { useFriends } from '../useFriends';
import { supabase } from '../../../../shared/lib/supabase';
import { useRemoteAuth } from '../../../../core/context/RemoteAuthContext';
import { useSubjectData } from '../../../../core/context/SubjectDataContext';
import { useUserProgress } from '../../../../core/context/UserProgressContext';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/community' }),
}));

vi.mock('../../../../core/context/RemoteAuthContext', () => ({
  useRemoteAuth: vi.fn(),
}));

vi.mock('../../../../core/context/SubjectDataContext', () => ({
  useSubjectData: vi.fn(),
}));

vi.mock('../../../../core/context/UserProgressContext', () => ({
  useUserProgress: vi.fn(),
}));

vi.mock('../../../../shared/lib/supabase', () => {
  const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const selectMock = vi.fn().mockReturnThis();
  const inMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const orMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockReturnThis();

  const fromMock = vi.fn().mockReturnValue({
    upsert: upsertMock,
    select: selectMock,
    in: inMock,
    or: orMock,
    eq: eqMock,
  });

  return {
    supabase: {
      from: fromMock,
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
});

describe('Stress & Edge Case Empirical Verification Suite', () => {
  const mockUser = { id: 'user-stress-999' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();

    vi.mocked(useRemoteAuth).mockReturnValue({
      user: mockUser,
      isConfigured: true,
      isLoading: false,
      session: null,
      isPromptDismissed: false,
      dismissPrompt: vi.fn(),
      resetPrompt: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    vi.mocked(useSubjectData).mockReturnValue({
      subjectData: { physics: null, chemistry: null, maths: null, biology: null },
      mergedSubjectData: { physics: null, chemistry: null, maths: null, biology: null },
      setSubjectData: vi.fn(),
      customColumns: { physics: [], chemistry: [], maths: [], biology: [] },
      setCustomColumns: vi.fn(),
      excludedColumns: { physics: [], chemistry: [], maths: [], biology: [] },
      setExcludedColumns: vi.fn(),
      materialOrder: { physics: [], chemistry: [], maths: [], biology: [] },
      setMaterialOrder: vi.fn(),
    } as any);

    vi.mocked(useUserProgress).mockReturnValue({
      plannerTasks: [],
    } as any);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    Object.defineProperty(document, 'hasFocus', {
      configurable: true,
      value: () => true,
    });

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useActivityHeartbeat Stress Tests', () => {
    it('handles 50 rapid focus events without redundant upsert calls', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase!.from).mockReturnValue({ upsert: upsertSpy } as any);

      renderHook(() => useActivityHeartbeat());

      await act(async () => {
        await Promise.resolve();
      });

      const callsAfterMount = upsertSpy.mock.calls.length;

      // Fire 50 rapid focus events
      await act(async () => {
        for (let i = 0; i < 50; i++) {
          window.dispatchEvent(new Event('focus'));
        }
        await Promise.resolve();
      });

      // Payload did not change and <60s elapsed, so 0 extra calls should occur
      expect(upsertSpy.mock.calls.length).toBe(callsAfterMount);
    });

    it('suppresses heartbeats completely while document visibility is hidden during intervals', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase!.from).mockReturnValue({ upsert: upsertSpy } as any);

      let currentVisibility = 'visible';
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => currentVisibility,
      });

      renderHook(() => useActivityHeartbeat());

      await act(async () => {
        await Promise.resolve();
      });
      const initialCalls = upsertSpy.mock.calls.length;

      // Switch to hidden
      currentVisibility = 'hidden';
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
      });

      // Advance 10 interval periods (10 minutes)
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(60000);
      }

      // No new upserts should have occurred while hidden
      expect(upsertSpy.mock.calls.length).toBe(initialCalls);
    });

    it('bypasses heartbeat upsert when browser is offline', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase!.from).mockReturnValue({ upsert: upsertSpy } as any);

      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });

      renderHook(() => useActivityHeartbeat());

      await act(async () => {
        await Promise.resolve();
      });

      // Offline check prevents supabase.from call
      expect(upsertSpy).not.toHaveBeenCalled();
    });

    it('pauses heartbeats with backoff when consecutive upserts fail', async () => {
      localStorage.setItem(
        'jee-timer-engine',
        JSON.stringify({ engineState: 'running', runStartedAtMs: Date.now() })
      );

      const failingUpsertSpy = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(supabase!.from).mockReturnValue({ upsert: failingUpsertSpy } as any);

      renderHook(() => useActivityHeartbeat());

      // 1st failure on mount
      await act(async () => {
        await Promise.resolve();
      });
      expect(failingUpsertSpy).toHaveBeenCalledTimes(1);

      // Advance past the 2-minute active heartbeat interval to trigger the
      // 2nd heartbeat attempt (interval raised from 60s → 120s in Issue #5).
      await act(async () => {
        vi.advanceTimersByTime(130_000);
        await Promise.resolve();
      });
      expect(failingUpsertSpy).toHaveBeenCalledTimes(2);

      // 2 failures should trigger backoff pause (~60s with jitter).
      // Fire focus event immediately at +10s (still within backoff pause window)
      await act(async () => {
        vi.advanceTimersByTime(10000);
        window.dispatchEvent(new Event('focus'));
        await Promise.resolve();
      });

      // No extra attempt while paused during backoff window
      expect(failingUpsertSpy).toHaveBeenCalledTimes(2);
    });

    it('fires immediate heartbeat when timer state change event is dispatched with updated timer payload', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase!.from).mockReturnValue({ upsert: upsertSpy } as any);

      renderHook(() => useActivityHeartbeat());

      await act(async () => {
        await Promise.resolve();
      });
      const initialCalls = upsertSpy.mock.calls.length;

      // Update study clock in localStorage to active state
      localStorage.setItem(
        'jee-timer-engine',
        JSON.stringify({ engineState: 'running', runStartedAtMs: Date.now() - 5000 })
      );

      // Dispatch timer state change after 5 seconds (< 60s window)
      vi.advanceTimersByTime(5000);

      await act(async () => {
        window.dispatchEvent(new Event('jee-timer-state-change'));
        await Promise.resolve();
      });

      // State changed, so immediate heartbeat should be sent even though <60s
      expect(upsertSpy.mock.calls.length).toBeGreaterThan(initialCalls);
      const lastPayload = upsertSpy.mock.calls[upsertSpy.mock.calls.length - 1][0];
      expect(lastPayload.is_active).toBe(true);
    });
  });

  describe('useFriends Throttling & Robustness Stress Tests', () => {
    it('throttles rapid focus/blur events to 60-second window', async () => {
      const mockLive = [{ user_id: 'friend-1', is_active: true }];
      const inSpy = vi.fn().mockResolvedValue({ data: mockLive, error: null });
      const selectSpy = vi.fn().mockReturnValue({ in: inSpy });

      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === 'live_activity') {
          return { select: selectSpy };
        }
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
          or: vi.fn().mockReturnThis(),
          eq: vi
            .fn()
            .mockResolvedValue({
              data: [{ user_id_1: 'user-stress-999', user_id_2: 'friend-1' }],
              error: null,
            }),
        };
      });

      vi.mocked(supabase!.from).mockImplementation(fromMock as any);

      const cachedFriends = [{ id: 'friend-1', username: 'friend_one' }];
      localStorage.setItem('jee-community-friends-cache', JSON.stringify(cachedFriends));

      renderHook(() => useFriends());

      await act(async () => {
        await Promise.resolve();
      });

      // Rapidly fire 30 focus & blur events
      await act(async () => {
        for (let i = 0; i < 30; i++) {
          window.dispatchEvent(new Event('blur'));
          window.dispatchEvent(new Event('focus'));
        }
        await Promise.resolve();
      });

      // Live activity query should be throttled and not invoked 30 times
      const calls = vi.mocked(supabase!.from).mock.calls.filter((c) => c[0] === 'live_activity');
      expect(calls.length).toBeLessThanOrEqual(2);
    });

    it('gracefully handles invalid date formats in friend objects without crashing sort', async () => {
      const corruptFriends = [
        {
          id: 'friend-corrupt-1',
          username: 'corrupt1',
          updated_at: 'NOT_A_DATE',
          live_activity: { user_id: 'friend-corrupt-1', updated_at: 'INVALID' },
        },
        {
          id: 'friend-valid',
          username: 'valid',
          updated_at: new Date().toISOString(),
          live_activity: null,
        },
      ];

      localStorage.setItem('jee-community-friends-cache', JSON.stringify(corruptFriends));

      const { result } = renderHook(() => useFriends());

      await act(async () => {
        await Promise.resolve();
      });

      // Should not throw, valid friend sorted cleanly
      expect(result.current.friends.length).toBe(2);
      expect(result.current.friends[0].id).toBe('friend-valid');
      expect(result.current.friends[1].id).toBe('friend-corrupt-1');
    });
  });
});
