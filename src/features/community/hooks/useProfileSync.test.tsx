import { useState } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfileSync } from './useProfileSync';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { supabase } from '../../../shared/lib/supabase';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../core/context/RemoteAuthContext', () => ({
  useRemoteAuth: vi.fn(),
}));

vi.mock('../../../core/context/UserProgressContext', () => ({
  useUserProgress: vi.fn(),
}));

vi.mock('../../../core/context/SubjectDataContext', () => ({
  useSubjectData: () => ({
    subjectData: { physics: {}, chemistry: {}, maths: {} },
  }),
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

describe('useProfileSync Hook', () => {
  const mockUser = {
    id: 'user-123',
    user_metadata: {
      full_name: 'Google User',
      avatar_url: 'https://google.com/avatar.png',
    },
  } as any;

  const defaultProgressSettings = {
    userName: '',
    customAvatarUrl: '',
    inviteCode: '',
    discordSpecialTag: '',
    bannerUrl: '',
    customStatus: '',
    gradeStatus: 'Class 12',
    targetExam: 'JEE 2026',
    showTasks: true,
  };

  const mockProgressCardSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default auth mock
    vi.mocked(useRemoteAuth).mockReturnValue({
      user: mockUser,
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
    });

    // Default progress mock
    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: defaultProgressSettings,
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);
  });

  // No global afterEach needed since we control fake/real timers per test

  it('should fetch profile details and prefill progressCardSettings on authentication', async () => {
    const mockProfileData = {
      invite_code: 'OSUD',
      discord_tag: 'test#1234',
      display_name: 'Custom Nickname',
      avatar_url: 'https://xyz.com/avatar.jpg',
      banner_url: 'https://xyz.com/banner.jpg',
      custom_status: 'Studying hard',
      grade_status: 'Class 12 Pass',
      target_exam: 'JEE 2026',
    };

    const singleMock = vi.fn().mockResolvedValue({ data: mockProfileData, error: null });
    const selectMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      maybeSingle: singleMock,
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(supabase!.from).mockImplementation((table) => selectMock(table));

    renderHook(() => useProfileSync());

    await waitFor(() => {
      expect(mockProgressCardSettings).toHaveBeenCalled();
    });

    // Call updates functional state setter
    const stateUpdater = mockProgressCardSettings.mock.calls[0][0];
    const finalSettings = stateUpdater(defaultProgressSettings);

    expect(finalSettings.inviteCode).toBe('OSUD');
    expect(finalSettings.discordSpecialTag).toBe('test#1234');
    expect(finalSettings.userName).toBe('Custom Nickname');
    expect(finalSettings.customAvatarUrl).toBe('https://xyz.com/avatar.jpg');
    expect(finalSettings.bannerUrl).toBe('https://xyz.com/banner.jpg');
    expect(finalSettings.customStatus).toBe('Studying hard');
    expect(finalSettings.gradeStatus).toBe('Class 12 Pass');
    expect(finalSettings.targetExam).toBe('JEE 2026');
  });

  it('should fallback to Google metadata if profile is not found in database', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') });
    const selectMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      maybeSingle: singleMock,
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(supabase!.from).mockImplementation((table) => selectMock(table));

    renderHook(() => useProfileSync());

    await waitFor(() => {
      expect(mockProgressCardSettings).toHaveBeenCalled();
    });

    const stateUpdater = mockProgressCardSettings.mock.calls[0][0];
    const finalSettings = stateUpdater(defaultProgressSettings);

    expect(finalSettings.userName).toBe('Google User');
    expect(finalSettings.customAvatarUrl).toBe('https://google.com/avatar.png');
  });

  it('should process pending invite code and run RPC on authentication', async () => {
    localStorage.setItem('pending_invite_code', 'ABCD');
    vi.mocked(supabase!.rpc).mockResolvedValue({ data: null, error: null } as any);

    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      maybeSingle: singleMock,
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(supabase!.from).mockImplementation((table) => selectMock(table));

    renderHook(() => useProfileSync());

    await waitFor(() => {
      expect(supabase!.rpc).toHaveBeenCalledWith('add_friend_by_code', { friend_code: 'ABCD' });
      expect(localStorage.getItem('pending_invite_code')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/community');
    });
  });

  it('should trigger debounced profile updates on settings/session change', async () => {
    vi.useFakeTimers();
    // 1. Mock empty selects/updates
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateMock = vi.fn().mockReturnThis();
    const upsertMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockImplementation((_table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
      maybeSingle: singleMock,
      insert: vi.fn().mockResolvedValue({ error: null }),
        update: updateMock,
        upsert: upsertMock,
        then: vi.fn((onFulfilled) => onFulfilled({ error: null })),
      };
    });
    vi.mocked(supabase!.from).mockImplementation((table) => selectMock(table));

    // Force user settings to trigger update check
    const progressSettings = {
      ...defaultProgressSettings,
      userName: 'New Updated Name',
    };

    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: progressSettings,
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    const { rerender } = renderHook(() => useProfileSync());

    await act(async () => {
      await Promise.resolve();
    });

    // Simulate settings change after initial fetch completes
    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: {
        ...progressSettings,
        userName: 'New Updated Name 2',
      },
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    rerender();

    // Settings changed check triggers update, debounced for 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(supabase!.from).toHaveBeenCalledWith('profiles');
    expect(upsertMock).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should clear settings on transition to logged-out state', () => {
    // 1. Initial render as logged-in
    const { rerender } = renderHook(() => useProfileSync());

    // 2. Mock state transition to logged-out
    vi.mocked(useRemoteAuth).mockReturnValue({
      user: null,
      isConfigured: false,
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
    });

    // 3. Trigger rerender with new unauthenticated status
    rerender();

    // Rerender with user = null triggers cleanup logic
    expect(mockProgressCardSettings).toHaveBeenCalled();
    const stateUpdater = mockProgressCardSettings.mock.calls[0][0];
    const cleared = stateUpdater(defaultProgressSettings);

    expect(cleared.inviteCode).toBe('');
    expect(cleared.userName).toBe('');
  });

  it('should not push debounced profile updates to DB before initial fetch completes', async () => {
    vi.useFakeTimers();
    let resolveFetch: any;
    const singleMock = vi.fn().mockReturnValue(new Promise((r) => { resolveFetch = r; }));
    const updateMock = vi.fn().mockReturnThis();
    const upsertMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      maybeSingle: singleMock,
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: updateMock,
      upsert: upsertMock,
      then: vi.fn((onFulfilled) => onFulfilled({ error: null })),
    }));
    vi.mocked(supabase!.from).mockImplementation((table) => selectMock(table));

    const progressSettings = {
      ...defaultProgressSettings,
      userName: 'New Updated Name',
    };

    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: progressSettings,
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    renderHook(() => useProfileSync());

    // Advance 5 seconds while fetch is still pending
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should NOT have called update/upsert because initial fetch is not done
    expect(upsertMock).not.toHaveBeenCalled();

    // Resolve initial fetch
    await act(async () => {
      resolveFetch({ data: null, error: null });
    });

    vi.useRealTimers();
  });

  it('should overwrite stale localStorage avatar with DB avatar_url', async () => {
    const mockProfileData = {
      avatar_url: 'https://xyz.com/new-custom-avatar.jpg',
    };

    const singleMock = vi.fn().mockResolvedValue({ data: mockProfileData, error: null });
    const selectMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      maybeSingle: singleMock,
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(supabase!.from).mockImplementation((table) => selectMock(table));

    // Simulate localStorage already having an old Google avatar or stale avatar
    const staleSettings = {
      ...defaultProgressSettings,
      customAvatarUrl: 'https://google.com/old-default.png',
    };

    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: staleSettings,
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    renderHook(() => useProfileSync());

    await waitFor(() => {
      expect(mockProgressCardSettings).toHaveBeenCalled();
    });

    const stateUpdater = mockProgressCardSettings.mock.calls[0][0];
    const finalSettings = stateUpdater(staleSettings);

    // Should overwrite stale localStorage value with DB value
    expect(finalSettings.customAvatarUrl).toBe('https://xyz.com/new-custom-avatar.jpg');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  const makeAuthState = (overrides: Record<string, unknown> = {}) =>
    ({
      user: mockUser,
      isConfigured: true,
      isLoading: false,
      session: null,
      authEventEpoch: 0,
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
      ...overrides,
    }) as any;

  it('hydrates persisted snapshot & agenda from localStorage on cold mount for zero redundant writes and avoids echoing DB metadata', async () => {
    vi.useFakeTimers();

    const profilesUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const visUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === 'peer_visibility_settings') {
        return { upsert: visUpsertMock } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
        maybeSingle: singleMock,
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: profilesUpsertMock,
      } as any;
    });

    const initialSettings = {
      ...defaultProgressSettings,
      userName: 'Hydrated User',
      customAvatarUrl: 'https://example.com/old.png',
    };

    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: initialSettings,
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    // 1. First mount syncs once and persists snapshot + agenda keys in localStorage
    const first = renderHook(() => useProfileSync());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(profilesUpsertMock).toHaveBeenCalledTimes(1);
    expect(visUpsertMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('ojeet-remote-sync-profile-snapshot-user-123')).not.toBeNull();
    expect(localStorage.getItem('ojeet-remote-sync-profile-agenda-user-123')).toBe('true');

    first.unmount();
    profilesUpsertMock.mockClear();
    visUpsertMock.mockClear();

    // 2. Cold remount with DB returning updated display_name & avatar_url (edited on another device)
    const dbUpdatedSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: 'Device A Name',
        avatar_url: 'https://example.com/device-a.png',
        banner_url: null,
        custom_status: null,
        grade_status: 'Class 12',
        target_exam: 'JEE 2026',
      },
      error: null,
    });
    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === 'peer_visibility_settings') {
        return { upsert: visUpsertMock } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: dbUpdatedSingle,
        maybeSingle: dbUpdatedSingle,
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: profilesUpsertMock,
      } as any;
    });

    // Use real React state for progressCardSettings so DB updates flow into the snapshot effect
    const second = renderHook(() => {
      const [settings, setSettings] = useState(initialSettings);
      vi.mocked(useUserProgress).mockReturnValue({
        progressCardSettings: settings,
        setProgressCardSettings: setSettings,
        studySessions: [],
        plannerTasks: [],
        dailyQuestionLogs: {},
      } as any);
      return useProfileSync();
    });

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // Zero redundant writes on cold mount even though DB updated display_name & avatar_url
    expect(profilesUpsertMock).not.toHaveBeenCalled();
    expect(visUpsertMock).not.toHaveBeenCalled();

    const persisted = JSON.parse(
      localStorage.getItem('ojeet-remote-sync-profile-snapshot-user-123') ?? '{}'
    );
    expect(persisted.display_name).toBe('Device A Name');
    expect(persisted.avatar_url).toBe('https://example.com/device-a.png');

    second.unmount();
  });

  it('enforces hard stop after retryAttemptRef > 4 even on timerUpdateTrigger and local edits during backoff', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const profilesUpsertMock = vi
      .fn()
      .mockResolvedValue({ error: { status: 500, message: 'Internal Server Error' } });
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase!.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      maybeSingle: singleMock,
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: profilesUpsertMock,
    }) as any);

    const settings1 = { ...defaultProgressSettings, userName: 'User One' };
    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: settings1,
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    const { rerender } = renderHook(() => useProfileSync());
    await act(async () => {
      await Promise.resolve();
    });

    // Initial attempt (t=5s) -> attempt 1
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(profilesUpsertMock).toHaveBeenCalledTimes(1);

    // 4 automatic retries with exact backoff (Math.random = 0.5 -> 0 jitter): 10s, 20s, 40s, 80s
    for (const delay of [10_000, 20_000, 40_000, 80_000]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay);
      });
    }
    expect(profilesUpsertMock).toHaveBeenCalledTimes(5);

    // Now retryAttemptRef === 5 (> 4) and pausedUntilRef is ~160s ahead.
    // Fire timerUpdateTrigger (structural change on localStorage) and advance timers
    localStorage.setItem('jee-timer-engine', JSON.stringify({ engineState: 'running', mode: 'stopwatch', phase: null }));
    await act(async () => {
      window.dispatchEvent(new Event('jee-timer-state-change'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(profilesUpsertMock).toHaveBeenCalledTimes(5);

    // Make a local edit while still in backoff window (waitMs > 0) and advance past backoff
    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: { ...settings1, userName: 'User Edited During Backoff' },
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000);
    });
    expect(profilesUpsertMock).toHaveBeenCalledTimes(5);

    // Subsequent timerUpdateTrigger after backoff with unchanged snapshot still stays stopped
    localStorage.setItem('jee-timer-engine', JSON.stringify({ engineState: 'paused', mode: 'stopwatch', phase: null }));
    await act(async () => {
      window.dispatchEvent(new Event('jee-timer-state-change'));
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(profilesUpsertMock).toHaveBeenCalledTimes(5);
  });

  it('checks peer_visibility_settings error before updating localStorage and retries on failure', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const profilesUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const visUpsertMock = vi
      .fn()
      .mockResolvedValueOnce({ error: { status: 500, message: 'Visibility upsert failed' } })
      .mockResolvedValueOnce({ error: null });
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === 'peer_visibility_settings') {
        return { upsert: visUpsertMock } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
        maybeSingle: singleMock,
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: profilesUpsertMock,
      } as any;
    });

    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: { ...defaultProgressSettings, userName: 'Agenda User' },
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    renderHook(() => useProfileSync());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(profilesUpsertMock).toHaveBeenCalledTimes(1);
    expect(visUpsertMock).toHaveBeenCalledTimes(1);
    // Must NOT persist agenda key when peer_visibility_settings failed
    expect(localStorage.getItem('ojeet-remote-sync-profile-agenda-user-123')).toBeNull();

    // Retry fires after 10s backoff, succeeds, and persists agenda without repeating profiles upsert
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(visUpsertMock).toHaveBeenCalledTimes(2);
    expect(profilesUpsertMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('ojeet-remote-sync-profile-agenda-user-123')).toBe('true');
  });

  it('does not re-run fetchProfileDetails or handlePendingInvite when TOKEN_REFRESHED delivers a new user object with the same userId', async () => {
    localStorage.setItem('pending_invite_code', 'ABCD');
    vi.mocked(supabase!.rpc).mockResolvedValue({ data: null, error: null } as any);

    const singleMock = vi.fn().mockResolvedValue({
      data: {
        invite_code: 'OSUD',
        display_name: 'Student',
      },
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleMock,
      maybeSingle: singleMock,
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(supabase!.from).mockImplementation(() => selectMock() as any);

    const { rerender } = renderHook(() => useProfileSync());

    await waitFor(() => {
      expect(singleMock).toHaveBeenCalledTimes(1);
      expect(supabase!.rpc).toHaveBeenCalledTimes(1);
    });

    // Simulate TOKEN_REFRESHED: new user object reference, identical id
    vi.mocked(useRemoteAuth).mockReturnValue(
      makeAuthState({
        user: { ...mockUser, app_metadata: { provider: 'google', refreshedAt: 2 } },
        authEventEpoch: 1,
      })
    );
    rerender();

    await act(async () => {
      await Promise.resolve();
    });

    expect(singleMock).toHaveBeenCalledTimes(1);
    expect(supabase!.rpc).toHaveBeenCalledTimes(1);
  });

  it('pauses sync on 401/PGRST301 auth error without burning retries and recovers when authEventEpoch increments', async () => {
    vi.useFakeTimers();

    const profilesUpsertMock = vi
      .fn()
      .mockResolvedValue({ error: { status: 401, code: 'PGRST301', message: 'JWT expired' } });
    const visUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === 'peer_visibility_settings') {
        return { upsert: visUpsertMock } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
        maybeSingle: singleMock,
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: profilesUpsertMock,
      } as any;
    });

    const baseSettings = { ...defaultProgressSettings, userName: 'Auth User' };
    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: baseSettings,
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    const { rerender } = renderHook(() => useProfileSync());
    await act(async () => {
      await Promise.resolve();
    });

    // First attempt hits 401 -> authPausedRef = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(profilesUpsertMock).toHaveBeenCalledTimes(1);

    // Advancing long periods or making local edits does NOT burn retries while auth-paused
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(profilesUpsertMock).toHaveBeenCalledTimes(1);

    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: { ...baseSettings, userName: 'Auth User Edited' },
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(profilesUpsertMock).toHaveBeenCalledTimes(1);

    // Auth recovers (TOKEN_REFRESHED / SIGNED_IN increments authEventEpoch)
    profilesUpsertMock.mockResolvedValue({ error: null });
    vi.mocked(useRemoteAuth).mockReturnValue(makeAuthState({ authEventEpoch: 1 }));
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(profilesUpsertMock).toHaveBeenCalledTimes(2);
    expect(visUpsertMock).toHaveBeenCalledTimes(1);
  });

  it('skips executeSync when document.visibilityState is hidden and flushes when tab becomes visible', async () => {
    vi.useFakeTimers();

    let visibility: DocumentVisibilityState = 'hidden';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });

    const profilesUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const visUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === 'peer_visibility_settings') {
        return { upsert: visUpsertMock } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
        maybeSingle: singleMock,
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: profilesUpsertMock,
      } as any;
    });

    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: { ...defaultProgressSettings, userName: 'Hidden Tab User' },
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    renderHook(() => useProfileSync());
    await act(async () => {
      await Promise.resolve();
    });

    // Debounce fires while hidden -> must skip upsert
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(profilesUpsertMock).not.toHaveBeenCalled();

    // Tab becomes visible -> dirty sync flushes immediately
    visibility = 'visible';
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(profilesUpsertMock).toHaveBeenCalledTimes(1);
    expect(visUpsertMock).toHaveBeenCalledTimes(1);
  });

  it('ignores cross-tab storage ticks with unchanged structural timer signature so debounce is not starved', async () => {
    vi.useFakeTimers();

    const profilesUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const visUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === 'peer_visibility_settings') {
        return { upsert: visUpsertMock } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
        maybeSingle: singleMock,
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: profilesUpsertMock,
      } as any;
    });

    localStorage.setItem(
      'jee-timer-engine',
      JSON.stringify({ engineState: 'running', phase: null, mode: 'stopwatch', runStartedAtMs: 1000 })
    );

    vi.mocked(useUserProgress).mockReturnValue({
      progressCardSettings: { ...defaultProgressSettings, userName: 'Debounce User' },
      setProgressCardSettings: mockProgressCardSettings,
      studySessions: [],
      plannerTasks: [],
      dailyQuestionLogs: {},
    } as any);

    renderHook(() => useProfileSync());
    await act(async () => {
      await Promise.resolve();
    });

    // Advance 3s into the 5s debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(profilesUpsertMock).not.toHaveBeenCalled();

    // Another tab writes updated runStartedAtMs with identical engineState|phase|mode
    localStorage.setItem(
      'jee-timer-engine',
      JSON.stringify({ engineState: 'running', phase: null, mode: 'stopwatch', runStartedAtMs: 4000 })
    );
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'jee-timer-engine' }));
    });

    // Remaining 2s completes the original 5s debounce without starvation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(profilesUpsertMock).toHaveBeenCalledTimes(1);
  });
});

