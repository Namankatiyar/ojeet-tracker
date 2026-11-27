import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFriends } from './useFriends';
import { supabase } from '../../../shared/lib/supabase';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/community' }),
}));

vi.mock('../../../core/context/RemoteAuthContext', () => ({
  useRemoteAuth: vi.fn(),
}));

vi.mock('../../../shared/lib/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      rpc: vi.fn(),
    },
  };
});

const EXPECTED_PROFILE_COLUMNS =
  'id, display_name, username, avatar_url, banner_url, custom_status, streak_count, discord_tag, grade_status, target_exam, today_study_seconds, today_questions, momentum_heatmap, todays_tasks, updated_at';

const makeAuthState = (overrides: Record<string, any> = {}) => ({
  user: { id: 'user-123' } as any,
  isConfigured: true,
  isLoading: false,
  session: null,
  isPromptDismissed: false,
  isPasswordRecovery: false,
  unconfirmedEmail: null,
  authEventEpoch: 0,
  setPendingUnconfirmedEmail: vi.fn(),
  updateEmail: vi.fn().mockResolvedValue({ error: null, confirmationRequired: false }),
  dismissPrompt: vi.fn(),
  resetPrompt: vi.fn(),
  signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
  signUpWithEmail: vi.fn().mockResolvedValue({ error: null, confirmationRequired: false }),
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
  resetPassword: vi.fn().mockResolvedValue({ error: null }),
  updatePassword: vi.fn().mockResolvedValue({ error: null }),
  resendConfirmationEmail: vi.fn().mockResolvedValue({ error: null }),
  clearPasswordRecovery: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  ...overrides,
});

describe('useFriends Hook', () => {
  const mockUser = { id: 'user-123' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase!.from).mockReset();
    localStorage.clear();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);

    // Reset module-level globals cleanly by simulating signed-out state first
    vi.mocked(useRemoteAuth).mockReturnValue(
      makeAuthState({ user: null, isConfigured: false, isLoading: false })
    );
    const { unmount } = renderHook(() => useFriends());
    unmount();

    vi.clearAllMocks();
    vi.mocked(supabase!.from).mockReset();
    localStorage.clear();
    // Default logged in mock
    vi.mocked(useRemoteAuth).mockReturnValue(makeAuthState({ user: mockUser }));
  });

  it('should return empty list when user is not logged in', () => {
    vi.mocked(useRemoteAuth).mockReturnValue(
      makeAuthState({ user: null, isConfigured: false, isLoading: false })
    );

    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual([]);
    expect(result.current.isLoading).toBe(false); // Early returns false when unauthenticated
  });

  it('should load initial friends from localStorage cache if present', () => {
    const cachedFriends = [{ id: 'friend-1', username: 'friend_one', streak_count: 5 }];
    localStorage.setItem('jee-community-friends-cache', JSON.stringify(cachedFriends));

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      let data: any = [];
      if (table === 'peer_relationships') {
        data = [{ user_id_1: 'user-123', user_id_2: 'friend-1', status: 'accepted' }];
      } else if (table === 'profiles') {
        data = [{ id: 'friend-1', username: 'friend_one', streak_count: 5, updated_at: '2026-07-02T12:00:00Z' }];
      }
      return {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((onFulfilled) => onFulfilled({ data, error: null })),
      } as any;
    });

    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual(cachedFriends);
    expect(result.current.isLoading).toBe(false);
  });

  it('should prevent duplicate live activity fetch bursts on mount and omit peer_visibility_settings', async () => {
    // 1. Setup mock relationships
    const mockRels = [{ user_id_1: 'user-123', user_id_2: 'friend-1', status: 'accepted' }];
    const mockProfiles = [{ id: 'friend-1', updated_at: '2026-07-02T12:00:00Z' }];
    const mockLive = [{ user_id: 'friend-1', is_active: true, subject: 'physics' }];
    const profileSelectCalls: string[] = [];

    const selectMock = vi.fn().mockImplementation((table: string) => {
      let data: any = [];
      if (table === 'peer_relationships') data = mockRels;
      else if (table === 'profiles') data = mockProfiles;
      else if (table === 'live_activity') data = mockLive;

      const builder = {
        select: vi.fn((cols: string) => {
          if (table === 'profiles') profileSelectCalls.push(cols);
          return builder;
        }),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((onFulfilled) => onFulfilled({ data, error: null })),
      };
      return builder;
    });

    vi.mocked(supabase!.from).mockImplementation((table) => selectMock(table));

    // Clear globals
    const cacheKey = 'jee-community-friends-cache';
    localStorage.removeItem(cacheKey);

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.friends.length).toBeGreaterThan(0);
    });

    // peer_visibility_settings must never be queried
    const visibilityQueries = vi.mocked(supabase!.from).mock.calls.filter(
      (call) => call[0] === 'peer_visibility_settings'
    );
    expect(visibilityQueries.length).toBe(0);

    // profiles must select only id,updated_at for timestamp check and the exact 15 UI columns
    expect(profileSelectCalls).toContain('id, updated_at');
    expect(profileSelectCalls).toContain(EXPECTED_PROFILE_COLUMNS);
    expect(profileSelectCalls).not.toContain('*');

    // Check count of live_activity selects.
    // It should have been queried exactly once (inside Promise.all from fetchFriends).
    const liveActivityQueries = vi.mocked(supabase!.from).mock.calls.filter(
      (call) => call[0] === 'live_activity'
    );
    expect(liveActivityQueries.length).toBe(1);
  });

  it('should not double-poll live_activity on mount when cached friends are present', async () => {
    const cachedFriends = [
      { id: 'friend-1', username: 'friend_one', updated_at: '2026-07-02T12:00:00Z' },
    ];
    localStorage.setItem('jee-community-friends-cache', JSON.stringify(cachedFriends));

    const mockRels = [{ user_id_1: 'user-123', user_id_2: 'friend-1', status: 'accepted' }];
    const mockProfiles = [{ id: 'friend-1', updated_at: '2026-07-02T12:00:00Z' }];
    const mockLive = [{ user_id: 'friend-1', is_active: true, subject: 'maths' }];

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      let data: any = [];
      if (table === 'peer_relationships') data = mockRels;
      else if (table === 'profiles') data = mockProfiles;
      else if (table === 'live_activity') data = mockLive;

      return {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((onFulfilled) => onFulfilled({ data, error: null })),
      } as any;
    });

    renderHook(() => useFriends());

    await waitFor(() => {
      const liveCalls = vi.mocked(supabase!.from).mock.calls.filter((c) => c[0] === 'live_activity');
      expect(liveCalls.length).toBe(1);
    });

    // Give any microtasks a chance to flush and verify no second live_activity query fires
    await act(async () => {
      await Promise.resolve();
    });
    const liveCalls = vi.mocked(supabase!.from).mock.calls.filter((c) => c[0] === 'live_activity');
    expect(liveCalls.length).toBe(1);
  });

  it('should perform only a single live_activity poll on window focus after 60s', async () => {
    vi.useFakeTimers();
    try {
      const mockRels = [{ user_id_1: 'user-123', user_id_2: 'friend-1', status: 'accepted' }];
      const mockProfiles = [{ id: 'friend-1', updated_at: '2026-07-02T12:00:00Z' }];
      const mockLive = [{ user_id: 'friend-1', is_active: true, subject: 'physics' }];

      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        let data: any = [];
        if (table === 'peer_relationships') data = mockRels;
        else if (table === 'profiles') data = mockProfiles;
        else if (table === 'live_activity') data = mockLive;

        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          then: vi.fn((onFulfilled) => onFulfilled({ data, error: null })),
        } as any;
      });

      renderHook(() => useFriends());

      await act(async () => {
        await Promise.resolve();
      });

      expect(
        vi.mocked(supabase!.from).mock.calls.filter((c) => c[0] === 'live_activity').length
      ).toBe(1);

      vi.clearAllMocks();

      // Advance 65s (> 60s poll throttle, < 300s full fetch TTL)
      vi.advanceTimersByTime(65_000);

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('focus'));
        await Promise.resolve();
      });

      const liveCallsAfterFocus = vi
        .mocked(supabase!.from)
        .mock.calls.filter((c) => c[0] === 'live_activity');
      expect(liveCallsAfterFocus.length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should skip fetchFriends and pollLiveActivity when tab is hidden', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    const cachedFriends = [{ id: 'friend-1', username: 'friend_one' }];
    localStorage.setItem('jee-community-friends-cache', JSON.stringify(cachedFriends));

    const { result } = renderHook(() => useFriends());

    await act(async () => {
      await result.current.refresh(false);
    });

    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it('should reset module-level globals on logout so next sign-in fetches fresh', async () => {
    const mockRels = [{ user_id_1: 'user-123', user_id_2: 'friend-1', status: 'accepted' }];
    const mockProfiles = [{ id: 'friend-1', updated_at: '2026-07-02T12:00:00Z' }];
    const mockLive = [{ user_id: 'friend-1', is_active: true, subject: 'chemistry' }];

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      let data: any = [];
      if (table === 'peer_relationships') data = mockRels;
      else if (table === 'profiles') data = mockProfiles;
      else if (table === 'live_activity') data = mockLive;

      return {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: vi.fn((onFulfilled) => onFulfilled({ data, error: null })),
      } as any;
    });

    const { rerender } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(
        vi.mocked(supabase!.from).mock.calls.filter((c) => c[0] === 'peer_relationships').length
      ).toBe(1);
    });

    // Sign out
    vi.mocked(useRemoteAuth).mockReturnValue(
      makeAuthState({ user: null, isConfigured: true, isLoading: false })
    );
    rerender();

    expect(localStorage.getItem('jee-community-friends-cache')).toBeNull();
    vi.clearAllMocks();

    // Sign back in immediately (< 5 min): should perform full fetch because globals were reset
    vi.mocked(useRemoteAuth).mockReturnValue(makeAuthState({ user: mockUser }));
    rerender();

    await waitFor(() => {
      expect(
        vi.mocked(supabase!.from).mock.calls.filter((c) => c[0] === 'peer_relationships').length
      ).toBe(1);
    });
  });

  it('should call disconnect_peer RPC when disconnectFriend is invoked', async () => {
    vi.mocked(supabase!.rpc).mockResolvedValue({ data: null, error: null } as any);
    const selectMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((onFulfilled) => onFulfilled({ data: [], error: null })),
    });
    vi.mocked(supabase!.from).mockImplementation((table) => selectMock(table));

    const { result } = renderHook(() => useFriends());

    await act(async () => {
      await result.current.disconnectFriend('friend-1');
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('disconnect_peer', { friend_id: 'friend-1' });
  });

  it('should sort friends: online first, then by last seen descending', () => {
    const now = Date.now();
    const onlineFresh = new Date(now - 10000).toISOString(); // 10s ago (online)
    const onlineStaler = new Date(now - 120000).toISOString(); // 2m ago (online)
    const offlineStaler = new Date(now - 600000).toISOString(); // 10m ago (offline)
    const offlineStalest = new Date(now - 1000000).toISOString(); // 16m ago (offline)

    const unsortedFriends = [
      {
        id: 'friend-offline-staler',
        username: 'off_staler',
        updated_at: offlineStaler,
        live_activity: { user_id: 'friend-offline-staler', is_active: false, updated_at: offlineStaler },
      },
      {
        id: 'friend-online-staler',
        username: 'on_staler',
        live_activity: { user_id: 'friend-online-staler', is_active: true, updated_at: onlineStaler },
      },
      {
        id: 'friend-offline-stalest',
        username: 'off_stalest',
        updated_at: offlineStalest,
        live_activity: { user_id: 'friend-offline-stalest', is_active: false, updated_at: offlineStalest },
      },
      {
        id: 'friend-online-fresh',
        username: 'on_fresh',
        live_activity: { user_id: 'friend-online-fresh', is_active: true, updated_at: onlineFresh },
      },
    ];

    localStorage.setItem('jee-community-friends-cache', JSON.stringify(unsortedFriends));

    const { result } = renderHook(() => useFriends({ enabled: false }));

    const sortedIds = result.current.friends.map((f: any) => f.id);
    expect(sortedIds).toEqual([
      'friend-online-fresh',
      'friend-online-staler',
      'friend-offline-staler',
      'friend-offline-stalest',
    ]);
  });

  it('should sort pinned friends to the top regardless of active/last seen status', async () => {
    const now = Date.now();
    const onlineFresh = new Date(now - 10000).toISOString(); // 10s ago (online)
    const onlineStaler = new Date(now - 120000).toISOString(); // 2m ago (online)
    const offlineStaler = new Date(now - 600000).toISOString(); // 10m ago (offline)
    const offlineStalest = new Date(now - 1000000).toISOString(); // 16m ago (offline)

    const unsortedFriends = [
      {
        id: 'friend-offline-staler',
        username: 'off_staler',
        updated_at: offlineStaler,
        live_activity: { user_id: 'friend-offline-staler', is_active: false, updated_at: offlineStaler },
      },
      {
        id: 'friend-online-staler',
        username: 'on_staler',
        live_activity: { user_id: 'friend-online-staler', is_active: true, updated_at: onlineStaler },
      },
      {
        id: 'friend-offline-stalest',
        username: 'off_stalest',
        updated_at: offlineStalest,
        live_activity: { user_id: 'friend-offline-stalest', is_active: false, updated_at: offlineStalest },
      },
      {
        id: 'friend-online-fresh',
        username: 'on_fresh',
        live_activity: { user_id: 'friend-online-fresh', is_active: true, updated_at: onlineFresh },
      },
    ];

    localStorage.setItem('jee-community-friends-cache', JSON.stringify(unsortedFriends));
    // Pin the stalest offline friend
    localStorage.setItem('jee-community-pinned-friends', JSON.stringify(['friend-offline-stalest']));

    const { result } = renderHook(() => useFriends({ enabled: false }));

    expect(result.current.friends.map((f: any) => f.id)).toEqual([
      'friend-offline-stalest',
      'friend-online-fresh',
      'friend-online-staler',
      'friend-offline-staler',
    ]);

    // Test togglePin callback
    await act(async () => {
      result.current.togglePin('friend-online-staler');
    });

    // Both friend-offline-stalest and friend-online-staler are pinned.
    // Pinned group is sorted by online status, then last seen.
    // So friend-online-staler (online) comes before friend-offline-stalest (offline).
    expect(result.current.friends.map((f: any) => f.id)).toEqual([
      'friend-online-staler',
      'friend-offline-stalest',
      'friend-online-fresh',
      'friend-offline-staler',
    ]);
  });
});
