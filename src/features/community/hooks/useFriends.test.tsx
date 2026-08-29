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

describe('useFriends Hook', () => {
  const mockUser = { id: 'user-123' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default logged in mock
    vi.mocked(useRemoteAuth).mockReturnValue({
      user: mockUser,
      isConfigured: true,
      isLoading: false,
      session: null,
      isPromptDismissed: false,
      isPasswordRecovery: false,
      unconfirmedEmail: null,
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
    });
  });

  it('should return empty list when user is not logged in', () => {
    vi.mocked(useRemoteAuth).mockReturnValue({
      user: null,
      isConfigured: false,
      isLoading: false,
      session: null,
      isPromptDismissed: false,
      isPasswordRecovery: false,
      unconfirmedEmail: null,
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
    });

    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual([]);
    expect(result.current.isLoading).toBe(false); // Early returns false when unauthenticated
  });

  it('should load initial friends from localStorage cache if present', () => {
    const cachedFriends = [{ id: 'friend-1', username: 'friend_one', streak_count: 5 }];
    localStorage.setItem('jee-community-friends-cache', JSON.stringify(cachedFriends));

    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual(cachedFriends);
    expect(result.current.isLoading).toBe(false);
  });

  it('should prevent duplicate live activity fetch bursts on mount', async () => {
    // 1. Setup mock relationships
    const mockRels = [{ user_id_1: 'user-123', user_id_2: 'friend-1', status: 'accepted' }];
    const mockProfiles = [{ id: 'friend-1', updated_at: '2026-07-02T12:00:00Z' }];
    const mockSettings = [{ user_id: 'friend-1', show_agenda: true }];
    const mockLive = [{ user_id: 'friend-1', is_active: true, subject: 'physics' }];

    const selectMock = vi.fn().mockImplementation((table: string) => {
      let data: any = [];
      if (table === 'peer_relationships') data = mockRels;
      else if (table === 'profiles') data = mockProfiles;
      else if (table === 'peer_visibility_settings') data = mockSettings;
      else if (table === 'live_activity') data = mockLive;

      const builder = {
        select: vi.fn().mockReturnThis(),
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

    // Check count of live_activity selects.
    // It should have been queried exactly once (inside Promise.all from fetchFriends).
    // The duplicate pollLiveActivity should have been skipped.
    const liveActivityQueries = vi.mocked(supabase!.from).mock.calls.filter(
      (call) => call[0] === 'live_activity'
    );
    expect(liveActivityQueries.length).toBe(1);
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

    const { result } = renderHook(() => useFriends());

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

    const { result } = renderHook(() => useFriends());

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
