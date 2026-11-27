import { renderHook, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useProfileSync } from './useProfileSync';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { supabase } from '../../../shared/lib/supabase';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../../core/context/RemoteAuthContext', () => ({ useRemoteAuth: vi.fn() }));
vi.mock('../../../core/context/UserProgressContext', () => ({ useUserProgress: vi.fn() }));
vi.mock('../../../core/context/SubjectDataContext', () => ({
  useSubjectData: () => ({ subjectData: {} }),
}));
vi.mock('../../../shared/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

const user = { id: 'user-1', user_metadata: {} } as any;
const baseSettings = {
  userName: 'Name',
  customAvatarUrl: '',
  bannerUrl: '',
  customStatus: '',
  gradeStatus: 'Class 12',
  targetExam: 'JEE 2026',
  showTasks: true,
};

const profileRow = { invite_code: 'X' };
let profileData: any;
let insertResult: any;
let visibilityData: any;
let updateResult: any;
const profileUpdate = vi.fn();
const profileUpsert = vi.fn();
const agendaUpsert = vi.fn();
let agendaFailuresLeft = 0;

function setupSupabase() {
  vi.mocked(supabase!.from).mockImplementation(((table: string) => {
    if (table === 'peer_visibility_settings') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: visibilityData, error: null }) }),
        }),
        upsert: (...a: any[]) => {
          agendaUpsert(...a);
          const error = agendaFailuresLeft > 0 ? { message: 'boom' } : null;
          if (agendaFailuresLeft > 0) agendaFailuresLeft -= 1;
          return Promise.resolve({ error });
        },
      };
    }
    return {
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: profileData, error: null }) }),
      }),
      insert: () => Promise.resolve(insertResult),
      update: (payload: any) => {
        profileUpdate(payload);
        return { eq: () => Promise.resolve(updateResult) };
      },
      upsert: (...a: any[]) => {
        profileUpsert(...a);
        return Promise.resolve({ error: null });
      },
    };
  }) as any);
}

const stableSetter = vi.fn();
function useSettings(settings: any) {
  vi.mocked(useUserProgress).mockReturnValue({
    progressCardSettings: settings,
    setProgressCardSettings: stableSetter,
    studySessions: [],
    plannerTasks: [],
    dailyQuestionLogs: {},
    dailyResetHour: 0,
  } as any);
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe('useProfileSync write path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    agendaFailuresLeft = 0;
    vi.useFakeTimers();
    profileData = profileRow;
    insertResult = { error: null };
    visibilityData = null;
    updateResult = { data: null, error: null };
    vi.mocked(useRemoteAuth).mockReturnValue({ user, isConfigured: true, isLoading: false } as any);
    setupSupabase();
    useSettings(baseSettings);
  });
  afterEach(() => vi.useRealTimers());

  it('uses UPDATE (not upsert) when the profile row is known to exist', async () => {
    const { rerender } = renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(profileUpdate).toHaveBeenCalledTimes(1);
    expect(profileUpsert).not.toHaveBeenCalled();

    useSettings({ ...baseSettings, customStatus: 'hi' });
    rerender();
    await advance(120000);
    expect(profileUpdate).toHaveBeenCalledTimes(2);
    expect(profileUpdate).toHaveBeenLastCalledWith({ custom_status: 'hi' });
    expect(profileUpsert).not.toHaveBeenCalled();
  });

  it('upserts when row existence is unknown (missing row and initial insert fails)', async () => {
    profileData = null;
    insertResult = { error: { message: 'insert failed' } };
    renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(profileUpsert).toHaveBeenCalledTimes(1);
    expect(profileUpdate).not.toHaveBeenCalled();
  });

  it('uses UPDATE (not upsert) after inserting a missing profile row', async () => {
    profileData = null;
    insertResult = { error: null };
    const { rerender } = renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(profileUpdate).toHaveBeenCalledTimes(1);
    expect(profileUpsert).not.toHaveBeenCalled();

    useSettings({ ...baseSettings, customStatus: 'after-insert' });
    rerender();
    await advance(120000);
    expect(profileUpdate).toHaveBeenCalledTimes(2);
    expect(profileUpdate).toHaveBeenLastCalledWith({ custom_status: 'after-insert' });
    expect(profileUpsert).not.toHaveBeenCalled();
  });

  it('does not write profiles or peer_visibility_settings on cold mount when DB values match', async () => {
    const emptyHeatmap = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      return { dayLabel: labels[d.getDay()], level: 0, seconds: 0 };
    });
    profileData = {
      invite_code: 'X',
      display_name: 'Name',
      avatar_url: null,
      banner_url: null,
      custom_status: null,
      grade_status: 'Class 12',
      target_exam: 'JEE 2026',
      today_study_seconds: 0,
      today_questions: 0,
      momentum_heatmap: emptyHeatmap,
      todays_tasks: [],
      streak_count: 0,
    };
    visibilityData = { show_agenda: true };

    renderHook(() => useProfileSync());
    await flush();
    await advance(10 * 60 * 1000);

    expect(profileUpdate).not.toHaveBeenCalled();
    expect(profileUpsert).not.toHaveBeenCalled();
    expect(agendaUpsert).not.toHaveBeenCalled();
  });

  it('treats a 0-row UPDATE (DB-suppressed no-op) as written, without upserting', async () => {
    updateResult = { data: null, count: 0, error: null };
    renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(profileUpdate).toHaveBeenCalledTimes(1);
    expect(profileUpdate.mock.calls[0][0]).not.toHaveProperty('weekly_hours');
    expect(profileUpsert).not.toHaveBeenCalled();
    expect(localStorage.getItem('ojeet-profile-sync:snapshot:user-1')).not.toBeNull();
  });

  it('does not write on reload when the persisted snapshot matches', async () => {
    const first = renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(profileUpdate).toHaveBeenCalledTimes(1);
    expect(agendaUpsert).toHaveBeenCalledTimes(1);
    first.unmount();

    vi.clearAllMocks();
    setupSupabase();
    renderHook(() => useProfileSync()); // fresh refs, same localStorage
    await flush();
    await advance(10 * 60 * 1000);
    expect(profileUpdate).not.toHaveBeenCalled();
    expect(profileUpsert).not.toHaveBeenCalled();
    expect(agendaUpsert).not.toHaveBeenCalled();
  });

  it('does not reuse another account persisted snapshot', async () => {
    const first = renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    first.unmount();

    vi.clearAllMocks();
    setupSupabase();
    vi.mocked(useRemoteAuth).mockReturnValue({
      user: { id: 'user-2', user_metadata: {} },
      isConfigured: true,
      isLoading: false,
    } as any);
    renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(profileUpdate).toHaveBeenCalledTimes(1);
  });

  it('survives localStorage failures', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const spy2 = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(profileUpdate).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    spy2.mockRestore();
  });

  it('enforces a 2 minute floor and sends a single trailing write with the latest state', async () => {
    const { rerender } = renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(profileUpdate).toHaveBeenCalledTimes(1);

    useSettings({ ...baseSettings, customStatus: 'a' });
    rerender();
    await advance(10000);
    useSettings({ ...baseSettings, customStatus: 'b' });
    rerender();
    await advance(60000);
    expect(profileUpdate).toHaveBeenCalledTimes(1); // still inside the floor

    await advance(60000); // past 2 minutes since first write
    expect(profileUpdate).toHaveBeenCalledTimes(2);
    expect(profileUpdate).toHaveBeenLastCalledWith({ custom_status: 'b' });

    await advance(10 * 60 * 1000);
    expect(profileUpdate).toHaveBeenCalledTimes(2);
  });

  it('respects 2-minute cooldown on pagehide/hidden flush and flushes on pagehide once outside cooldown', async () => {
    const { rerender } = renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(profileUpdate).toHaveBeenCalledTimes(1);

    // Edit inside 2-minute cooldown: pagehide must NOT bypass MIN_WRITE_INTERVAL_MS
    useSettings({ ...baseSettings, customStatus: 'too-soon' });
    rerender();
    await advance(1000);
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
      await Promise.resolve();
    });
    await flush();
    expect(profileUpdate).toHaveBeenCalledTimes(1);

    // Advance past 2-minute cooldown, then make another edit and trigger pagehide during 5s debounce
    await advance(120000);
    expect(profileUpdate).toHaveBeenCalledTimes(2);

    await advance(120000);
    useSettings({ ...baseSettings, customStatus: 'late' });
    rerender();
    await advance(1000);
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
      await Promise.resolve();
    });
    await flush();
    expect(profileUpdate).toHaveBeenCalledTimes(3);
    expect(profileUpdate).toHaveBeenLastCalledWith({ custom_status: 'late' });
  });

  it('retries a failed agenda visibility write via backoff', async () => {
    agendaFailuresLeft = 1;
    renderHook(() => useProfileSync());
    await flush();
    await advance(5000);
    expect(agendaUpsert).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('ojeet-profile-sync:show-agenda:user-1')).toBeNull();

    await advance(30000); // first backoff is <= 10s base with jitter
    expect(agendaUpsert).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('ojeet-profile-sync:show-agenda:user-1')).toBe('true');
  });
});
