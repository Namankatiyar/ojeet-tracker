import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { useActivityHeartbeat } from './useActivityHeartbeat';
import { supabase } from '../../../shared/lib/supabase';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';

vi.mock('../../../core/context/RemoteAuthContext', () => ({
  useRemoteAuth: vi.fn(),
}));

vi.mock('../../../core/context/SubjectDataContext', () => ({
  useSubjectData: vi.fn(),
}));

vi.mock('../../../core/context/UserProgressContext', () => ({
  useUserProgress: vi.fn(),
}));

vi.mock('../../../shared/lib/supabase', () => {
  const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const fromMock = vi.fn().mockReturnValue({
    upsert: upsertMock,
  });
  return {
    supabase: {
      from: fromMock,
    },
  };
});

describe('useActivityHeartbeat Hook', () => {
  const mockUser = { id: 'user-123' } as any;

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
      isPasswordRecovery: false,
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
      handleAddColumn: vi.fn(),
      handleRemoveColumn: vi.fn(),
      handleReorderMaterials: vi.fn(),
      handleAddChapter: vi.fn(),
      handleRemoveChapter: vi.fn(),
      handleRenameChapter: vi.fn(),
      handleReorderChapters: vi.fn(),
    } as any);

    vi.mocked(useUserProgress).mockReturnValue({
      plannerTasks: [],
    } as any);

    // Default document visibility
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should send initial heartbeat on mount when tab is visible', async () => {
    renderHook(() => useActivityHeartbeat());

    await act(async () => {
      await Promise.resolve();
    });

    expect(supabase!.from).toHaveBeenCalledWith('live_activity');
  });

  it('should NOT send heartbeat when tab is hidden on initial mount', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    renderHook(() => useActivityHeartbeat());

    await act(async () => {
      await Promise.resolve();
    });

    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it('should trigger heartbeat when tab visibility changes from hidden to visible after 60s', async () => {
    let visibility = 'hidden';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });

    renderHook(() => useActivityHeartbeat());

    await act(async () => {
      await Promise.resolve();
    });
    expect(supabase!.from).not.toHaveBeenCalled();

    // Fast-forward 65 seconds
    vi.advanceTimersByTime(65000);

    // Switch tab to visible
    visibility = 'visible';
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(supabase!.from).toHaveBeenCalledWith('live_activity');
  });

  it('should trigger immediate heartbeat on visibility change if state changed even if < 60s', async () => {
    renderHook(() => useActivityHeartbeat());

    await act(async () => {
      await Promise.resolve();
    });
    const initialCalls = vi.mocked(supabase!.from).mock.calls.length;

    // Simulate timer start state change in localStorage
    localStorage.setItem(
      'jee-timer-engine',
      JSON.stringify({ engineState: 'running', runStartedAtMs: Date.now() })
    );

    // Fast-forward only 10s
    vi.advanceTimersByTime(10000);

    // Fire visibilitychange event
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(vi.mocked(supabase!.from).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should clean up interval and event listeners on unmount', async () => {
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener');
    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useActivityHeartbeat());

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(windowRemoveSpy).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(windowRemoveSpy).toHaveBeenCalledWith('jee-timer-state-change', expect.any(Function));
  });

  it('should respect tab visibility during background interval execution', async () => {
    renderHook(() => useActivityHeartbeat());

    await act(async () => {
      await Promise.resolve();
    });
    const initialCalls = vi.mocked(supabase!.from).mock.calls.length;

    // Hide document
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    // Advance 3 minutes
    vi.advanceTimersByTime(180000);

    // No extra heartbeats should have been sent while hidden
    expect(vi.mocked(supabase!.from).mock.calls.length).toBe(initialCalls);
  });
});
