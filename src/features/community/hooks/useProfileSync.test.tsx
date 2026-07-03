import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
      dismissPrompt: vi.fn(),
      resetPrompt: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
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
    const selectMock = vi.fn().mockImplementation((_table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
        update: updateMock,
        upsert: vi.fn().mockReturnThis(),
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

    renderHook(() => useProfileSync());

    // Settings changed check triggers update, debounced for 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(supabase!.from).toHaveBeenCalledWith('profiles');
    expect(updateMock).toHaveBeenCalled();
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
      dismissPrompt: vi.fn(),
      resetPrompt: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
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
});
