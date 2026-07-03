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
      dismissPrompt: vi.fn(),
      resetPrompt: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });
  });

  it('should return empty list when user is not logged in', () => {
    vi.mocked(useRemoteAuth).mockReturnValue({
      user: null,
      isConfigured: false,
      isLoading: false,
      session: null,
      isPromptDismissed: false,
      dismissPrompt: vi.fn(),
      resetPrompt: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
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
});
