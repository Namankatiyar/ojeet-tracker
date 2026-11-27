import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteSyncProvider, useRemoteSync } from './RemoteSyncContext';
import { getBundledSubjectData } from '../../shared/utils/syllabusData';
import type { StudySession, Subject, SubjectData } from '../../shared/types';
import type { SyncPayloadV1 } from '../../features/sync/syncTypes';
import { SYNC_SCHEMA_VERSION } from '../../features/sync/syncTypes';

type TableCalls = {
  selects: string[];
  upserts: Array<{ rows: unknown; options?: unknown }>;
  updates: Array<{ values: unknown }>;
  inserts: number;
};

const testState = vi.hoisted(() => {
  const auth = {
    user: { id: 'user-1' } as { id: string } | null,
    isConfigured: true,
    authEventEpoch: 0,
  };

  const progressData = {
    progress: { physics: {}, chemistry: {}, maths: {}, biology: {} } as any,
    plannerTasks: [] as any[],
    studySessions: [] as StudySession[],
    mockScores: [] as any[],
    examDates: [] as any[],
    disableAutoShift: false,
    enableAIAgent: false,
    enableMusicPlayer: false,
    jeeMockExamPresets: [] as any[],
    neetMockExamPresets: [] as any[],
    examMode: 'jee' as 'jee' | 'neet',
    tombstones: {} as any,
    setProgress: vi.fn(),
    setPlannerTasks: vi.fn(),
    setStudySessions: vi.fn(),
    setMockScores: vi.fn(),
    setExamDates: vi.fn(),
    setDisableAutoShift: vi.fn(),
    setEnableAIAgent: vi.fn(),
    setEnableMusicPlayer: vi.fn(),
    setJeeMockExamPresets: vi.fn(),
    setNeetMockExamPresets: vi.fn(),
    setExamMode: vi.fn(),
    setProgressCardSettings: vi.fn(),
    setTombstones: vi.fn(),
  };

  const subjectState = {
    subjectData: {
      physics: null,
      chemistry: null,
      maths: null,
      biology: null,
    } as Record<Subject, SubjectData | null>,
    customColumns: { physics: [], chemistry: [], maths: [], biology: [] } as Record<
      Subject,
      string[]
    >,
    excludedColumns: { physics: [], chemistry: [], maths: [], biology: [] } as Record<
      Subject,
      string[]
    >,
    materialOrder: { physics: [], chemistry: [], maths: [], biology: [] } as Record<
      Subject,
      string[]
    >,
    setSubjectData: vi.fn(),
    setCustomColumns: vi.fn(),
    setExcludedColumns: vi.fn(),
    setMaterialOrder: vi.fn(),
  };

  const resetStores = () => {
    auth.user = { id: 'user-1' };
    auth.isConfigured = true;
    auth.authEventEpoch = 0;

    progressData.progress = { physics: {}, chemistry: {}, maths: {}, biology: {} };
    progressData.plannerTasks = [];
    progressData.studySessions = [];
    progressData.mockScores = [];
    progressData.examDates = [];
    progressData.disableAutoShift = false;
    progressData.enableAIAgent = false;
    progressData.enableMusicPlayer = false;
    progressData.jeeMockExamPresets = [];
    progressData.neetMockExamPresets = [];
    progressData.examMode = 'jee';
    progressData.tombstones = {};
    progressData.setProgress = vi.fn();
    progressData.setPlannerTasks = vi.fn();
    progressData.setStudySessions = vi.fn();
    progressData.setMockScores = vi.fn();
    progressData.setExamDates = vi.fn();
    progressData.setDisableAutoShift = vi.fn();
    progressData.setEnableAIAgent = vi.fn();
    progressData.setEnableMusicPlayer = vi.fn();
    progressData.setJeeMockExamPresets = vi.fn();
    progressData.setNeetMockExamPresets = vi.fn();
    progressData.setExamMode = vi.fn();
    progressData.setProgressCardSettings = vi.fn();
    progressData.setTombstones = vi.fn();

    subjectState.subjectData = { physics: null, chemistry: null, maths: null, biology: null };
    subjectState.customColumns = { physics: [], chemistry: [], maths: [], biology: [] };
    subjectState.excludedColumns = { physics: [], chemistry: [], maths: [], biology: [] };
    subjectState.materialOrder = { physics: [], chemistry: [], maths: [], biology: [] };
    subjectState.setSubjectData = vi.fn();
    subjectState.setCustomColumns = vi.fn();
    subjectState.setExcludedColumns = vi.fn();
    subjectState.setMaterialOrder = vi.fn();
  };

  return { auth, progressData, subjectState, resetStores };
});

const supabaseState = vi.hoisted(() => {
  const tables = new Map<string, TableCalls>();
  const fromTables: string[] = [];

  type ResponseOverride = {
    maybeSingle?: (selection?: string) => unknown;
    select?: (selection?: string) => unknown;
    upsert?: (rows?: unknown, options?: unknown) => unknown;
    upsertSelect?: (rows?: unknown, options?: unknown, selection?: string) => unknown;
  };
  const overrides = new Map<string, ResponseOverride>();

  const ensureTable = (table: string) => {
    if (!tables.has(table)) {
      tables.set(table, { selects: [], upserts: [], updates: [], inserts: 0 });
    }
    return tables.get(table)!;
  };

  const recordSelect = (table: string, selection?: string) => {
    ensureTable(table).selects.push(selection ?? '*');
  };
  const recordUpsert = (table: string, rows?: unknown, options?: unknown) => {
    ensureTable(table).upserts.push({ rows, options });
  };
  const recordUpdate = (table: string, values?: unknown) => {
    ensureTable(table).updates.push({ values });
  };
  const recordInsert = (table: string) => {
    ensureTable(table).inserts += 1;
  };

  const resolveMaybeSingle = (table: string, selection?: string) => {
    const custom = overrides.get(table)?.maybeSingle;
    if (custom) return custom(selection);
    if (table === 'user_sync_state' && selection?.includes('checksum')) {
      return { data: { checksum: 'abc', payload_version: 1 }, error: null };
    }
    if (table === 'user_study_aggregate') {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  };

  const resolveSelect = (table: string, selection?: string) => {
    const custom = overrides.get(table)?.select;
    if (custom) return custom(selection);
    if (table === 'study_session_log') {
      return { data: [], error: null };
    }
    return { data: [], error: null };
  };

  const resolveUpsert = (table: string, rows?: unknown, options?: unknown) => {
    const custom = overrides.get(table)?.upsert;
    if (custom) return custom(rows, options);
    return { data: null, error: null };
  };

  const resolveUpsertSelect = (
    table: string,
    rows?: unknown,
    options?: unknown,
    selection?: string
  ) => {
    const custom = overrides.get(table)?.upsertSelect;
    if (custom) return custom(rows, options, selection);
    if (table === 'study_session_log') {
      return { data: [], error: null };
    }
    return { data: [], error: null };
  };

  const resolveInsertSelect = (table: string) => {
    if (table === 'study_session_log') {
      return { data: [], error: null };
    }
    return { data: [], error: null };
  };

  const createBuilder = (table: string) => {
    let selection: string | undefined;
    const builder: any = {
      select(sel?: string) {
        selection = sel;
        recordSelect(table, sel);
        return this;
      },
      eq() {
        return this;
      },
      gte() {
        return this;
      },
      gt() {
        return this;
      },
      order() {
        return this;
      },
      limit() {
        return this;
      },
      maybeSingle() {
        return Promise.resolve(resolveMaybeSingle(table, selection));
      },
      upsert(rows?: unknown, options?: unknown) {
        recordUpsert(table, rows, options);
        return {
          select(sel?: string) {
            recordSelect(table, sel);
            return Promise.resolve(resolveUpsertSelect(table, rows, options, sel));
          },
          then(
            onFulfilled: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) {
            return Promise.resolve(resolveUpsert(table, rows, options)).then(
              onFulfilled,
              onRejected
            );
          },
        };
      },
      update(values?: unknown) {
        recordUpdate(table, values);
        return {
          eq() {
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
      insert() {
        recordInsert(table);
        return {
          select(sel?: string) {
            recordSelect(table, sel);
            return Promise.resolve(resolveInsertSelect(table));
          },
        };
      },
      then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(resolveSelect(table, selection)).then(onFulfilled, onRejected);
      },
    };
    return builder;
  };

  const supabase = {
    from: vi.fn((table: string) => {
      fromTables.push(table);
      return createBuilder(table);
    }),
  };

  const setTableOverride = (table: string, override: ResponseOverride) => {
    overrides.set(table, override);
  };

  const reset = () => {
    tables.clear();
    fromTables.length = 0;
    overrides.clear();
  };

  return { supabase, tables, fromTables, setTableOverride, reset };
});

const codecMocks = vi.hoisted(() => ({
  computeChecksum: vi.fn().mockResolvedValue('same'),
  decompressSyncPayload: vi.fn(),
  encodeSyncPayload: vi.fn().mockResolvedValue({
    storage: 'inline',
    compressed: '',
    compressedBytes: 0,
    checksum: 'abc',
    chunkCount: 0,
  }),
  encodeSplitSyncPayload: vi.fn().mockResolvedValue({
    hotCompressed: 'hot',
    hotBytes: 3,
    hotChecksum: 'hot-cs',
    coldCompressed: 'cold',
    coldBytes: 4,
    coldChecksum: 'cold-cs',
    checksum: 'abc',
    fitsSplitInline: true,
  }),
  reconstructCompressedPayload: vi.fn(),
  reconstructSplitSyncPayload: vi.fn(),
}));

vi.mock('../../shared/lib/supabase', () => ({
  supabase: supabaseState.supabase,
}));

vi.mock('./RemoteAuthContext', () => ({
  useRemoteAuth: () => ({
    user: testState.auth.user,
    session: null,
    isLoading: false,
    isConfigured: testState.auth.isConfigured,
    isPromptDismissed: false,
    isPasswordRecovery: false,
    unconfirmedEmail: null,
    authEventEpoch: testState.auth.authEventEpoch,
    setPendingUnconfirmedEmail: vi.fn(),
    dismissPrompt: vi.fn(),
    resetPrompt: vi.fn(),
    signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
    signUpWithEmail: vi.fn().mockResolvedValue({ error: null, confirmationRequired: false }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    updatePassword: vi.fn().mockResolvedValue({ error: null }),
    updateEmail: vi.fn().mockResolvedValue({ error: null, confirmationRequired: false }),
    resendConfirmationEmail: vi.fn().mockResolvedValue({ error: null }),
    clearPasswordRecovery: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

vi.mock('./UserProgressContext', () => ({
  useUserProgress: () => ({
    ...testState.progressData,
    mockExamPresets: testState.progressData.jeeMockExamPresets,
    setMockExamPresets: testState.progressData.setJeeMockExamPresets,
    progressCardSettings: {
      userName: '',
      customAvatarUrl: '',
      visibleStats: {
        totalStudyTime: true,
        highestMockScore: true,
        highestDailyHours: true,
        highestWeekAverage: true,
        physicsTime: true,
        chemistryTime: true,
        mathsTime: true,
        physicsProgress: true,
        chemistryProgress: true,
        mathsProgress: true,
        examCountdown: true,
      },
      showTasks: true,
    },
  }),
  defaultMockExamPresets: [
    {
      id: 'jm',
      name: 'JEE Main',
      shortName: 'JM',
      paperCount: 1,
      subjectMaxMarks: { physics: 100, chemistry: 100, maths: 100 },
    },
  ],
}));

vi.mock('./SubjectDataContext', () => ({
  useSubjectData: () => testState.subjectState,
}));

vi.mock('../../features/sync/syncCodec', () => codecMocks);

function SyncProbe({
  onContext,
}: {
  onContext: (ctx: ReturnType<typeof useRemoteSync>) => void;
}) {
  const ctx = useRemoteSync();
  onContext(ctx);
  return null;
}

describe('RemoteSyncContext egress optimizations & resilience', () => {
  beforeEach(() => {
    supabaseState.reset();
    testState.resetStores();
    codecMocks.computeChecksum.mockReset().mockResolvedValue('same');
    codecMocks.decompressSyncPayload.mockReset();
    codecMocks.encodeSyncPayload.mockReset().mockResolvedValue({
      storage: 'inline',
      compressed: '',
      compressedBytes: 0,
      checksum: 'abc',
      chunkCount: 0,
    });
    codecMocks.encodeSplitSyncPayload.mockReset().mockResolvedValue({
      hotCompressed: 'hot',
      hotBytes: 3,
      hotChecksum: 'hot-cs',
      coldCompressed: 'cold',
      coldBytes: 4,
      coldChecksum: 'cold-cs',
      checksum: 'abc',
      fitsSplitInline: true,
    });
    codecMocks.reconstructCompressedPayload.mockReset();
    codecMocks.reconstructSplitSyncPayload.mockReset();

    localStorage.clear();
    localStorage.setItem('ojeet-remote-sync-remote-checksum', 'abc');
    localStorage.setItem(
      'ojeet-remote-sync-last-session-delta-synced-at',
      JSON.stringify({ created_at: '2000-01-01T00:00:00.000Z' })
    );
    (globalThis as any).__APP_VERSION__ = 'test';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('skips full payload and chunk fetches when checksum is unchanged', async () => {
    render(
      <RemoteSyncProvider>
        <div />
      </RemoteSyncProvider>
    );

    await waitFor(
      () => {
        const userSync = supabaseState.tables.get('user_sync_state');
        expect(userSync?.selects.length ?? 0).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    const userSync = supabaseState.tables.get('user_sync_state');
    expect(userSync?.selects).toContain(
      'checksum,payload_version,hot_checksum,cold_checksum,payload_format'
    );
    const fetchedPayload = (userSync?.selects ?? []).some(
      (sel) => sel.includes('payload_inline') || sel.includes('payload_storage')
    );
    expect(fetchedPayload).toBe(false);
    expect(supabaseState.fromTables).not.toContain('user_sync_chunks');
    expect(userSync?.upserts.length ?? 0).toBe(0);
  });

  it('retains existing delta cursor on cold mount when studySessions is empty', async () => {
    const existingCursor = JSON.stringify({ created_at: '2026-05-01T12:00:00.000Z', id: 'log-9' });
    localStorage.setItem('ojeet-remote-sync-last-session-delta-synced-at', existingCursor);

    render(
      <RemoteSyncProvider>
        <div />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(supabaseState.tables.get('study_session_log')?.selects.length ?? 0).toBeGreaterThan(0);
    });

    expect(localStorage.getItem('ojeet-remote-sync-last-session-delta-synced-at')).toBe(
      existingCursor
    );
  });

  it('uses ignoreDuplicates upsert on study_session_log and drains pendingSessionLogsRef even when empty rows return', async () => {
    let latestCtx: ReturnType<typeof useRemoteSync> | null = null;
    const { rerender } = render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('synced');
    });

    // Add a local session so computeSessionDelta buffers a pending INSERT
    testState.progressData.studySessions = [
      {
        id: 'sess-dup-1',
        title: 'Physics',
        subject: 'physics',
        type: 'chapter',
        startTime: '2026-06-01T10:00:00.000Z',
        endTime: '2026-06-01T11:00:00.000Z',
        duration: 3600,
      },
    ];
    rerender(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    expect(latestCtx?.hasPendingChanges()).toBe(true);

    // Server ignores duplicate and returns data: [] with no error
    supabaseState.setTableOverride('study_session_log', {
      upsertSelect: () => ({ data: [], error: null }),
    });

    await act(async () => {
      await latestCtx!.syncNow();
    });

    const sessionLogTable = supabaseState.tables.get('study_session_log');
    expect(sessionLogTable?.upserts).toHaveLength(1);
    expect(sessionLogTable?.upserts[0].options).toEqual({
      onConflict: 'user_id,session_id',
      ignoreDuplicates: true,
    });
    expect(sessionLogTable?.inserts ?? 0).toBe(0);
    expect(latestCtx?.hasPendingChanges()).toBe(false);

    // A subsequent sync must NOT re-push the drained session log
    await act(async () => {
      await latestCtx!.syncNow();
    });
    expect(supabaseState.tables.get('study_session_log')?.upserts).toHaveLength(1);
  });

  it('pauses sync on 401 auth error without retry loop, recovers on authEventEpoch, and ignores epoch changes when not auth-paused', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let latestCtx: ReturnType<typeof useRemoteSync> | null = null;

    supabaseState.setTableOverride('user_sync_state', {
      maybeSingle: () => ({
        data: null,
        error: { message: 'JWT expired', code: 'PGRST301' },
        status: 401,
      }),
    });

    const { rerender } = render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('auth_error');
    });
    expect(latestCtx?.lastError).toBe('Session expired — sign in again to resume sync');

    const callsAfter401 = supabaseState.tables.get('user_sync_state')?.selects.length ?? 0;

    // Advancing timers must NOT trigger retry backoff while auth-paused
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000);
    });
    expect(supabaseState.tables.get('user_sync_state')?.selects.length ?? 0).toBe(callsAfter401);

    // Explicit syncNow while auth-paused is a no-op
    await act(async () => {
      await latestCtx!.syncNow();
    });
    expect(supabaseState.tables.get('user_sync_state')?.selects.length ?? 0).toBe(callsAfter401);

    // Now simulate session refresh / re-login: authEventEpoch increments
    supabaseState.setTableOverride('user_sync_state', {
      maybeSingle: () => ({
        data: { checksum: 'abc', payload_version: 1 },
        error: null,
      }),
    });
    testState.auth.authEventEpoch = 1;
    rerender(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('synced');
    });
    const callsAfterRecovery = supabaseState.tables.get('user_sync_state')?.selects.length ?? 0;
    expect(callsAfterRecovery).toBeGreaterThan(callsAfter401);

    // Incrementing authEventEpoch again when NOT auth-paused must NOT trigger a sync
    testState.auth.authEventEpoch = 2;
    rerender(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(supabaseState.tables.get('user_sync_state')?.selects.length ?? 0).toBe(
      callsAfterRecovery
    );
  });

  it('persists lastPushedDomainChecksums and lastPushedAggregate across cold remounts and detects deleted domain keys', async () => {
    codecMocks.computeChecksum.mockImplementation(async (val: string) => `hash:${val.length}`);
    codecMocks.encodeSyncPayload.mockResolvedValue({
      storage: 'inline',
      compressed: 'x',
      compressedBytes: 1,
      checksum: 'local-new-checksum',
      chunkCount: 0,
    });

    // Ensure remote row exists with a different checksum so initial push triggers
    supabaseState.setTableOverride('user_sync_state', {
      maybeSingle: (sel) => {
        if (sel?.includes('payload_inline')) {
          return {
            data: {
              payload_inline: 'remote-x',
              payload_storage: 'inline',
              payload_version: 1,
              chunk_count: 0,
              payload_bytes: 1,
              checksum: 'remote-checksum',
            },
            error: null,
          };
        }
        return { data: { checksum: 'remote-checksum', payload_version: 1 }, error: null };
      },
    });
    localStorage.setItem('ojeet-remote-sync-remote-checksum', 'remote-checksum');

    let latestCtx: ReturnType<typeof useRemoteSync> | null = null;
    const { unmount } = render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('synced');
    });

    // Persisted domain checksums should now exist in localStorage
    const persistedDomainsRaw = localStorage.getItem('ojeet-remote-sync-pushed-domains-user-1');
    expect(persistedDomainsRaw).not.toBeNull();
    expect(supabaseState.tables.get('user_sync_state')?.upserts).toHaveLength(1);

    unmount();

    // Cold remount: even if remote checksum differs (e.g. local checksum mismatch),
    // persisted domain checksums prevent redundant user_sync_state upserts.
    supabaseState.reset();
    localStorage.setItem('ojeet-remote-sync-remote-checksum', 'local-new-checksum');
    codecMocks.encodeSyncPayload.mockResolvedValue({
      storage: 'inline',
      compressed: 'x',
      compressedBytes: 1,
      checksum: 'different-envelope-checksum',
      chunkCount: 0,
    });
    supabaseState.setTableOverride('user_sync_state', {
      maybeSingle: () => ({
        data: { checksum: 'local-new-checksum', payload_version: 2 },
        error: null,
      }),
    });

    // Pre-seed cached aggregate AND matching persisted pushed-aggregate
    const cachedAgg = {
      user_id: 'user-1',
      total_seconds_overall: 1200,
      total_seconds_physics: 1200,
      total_seconds_chemistry: 0,
      total_seconds_maths: 0,
      buckets_daily_json: {},
      buckets_weekly_json: {},
      buckets_monthly_json: {},
      video_watch_45d_json: [],
      updated_at: '2026-06-01T10:00:00.000Z',
    };
    const { updated_at: _u, ...aggPayload } = cachedAgg;
    localStorage.setItem('ojeet-remote-sync-cached-aggregate', JSON.stringify(cachedAgg));
    localStorage.setItem(
      'ojeet-remote-sync-pushed-aggregate-user-1',
      JSON.stringify(aggPayload)
    );

    let remountCtx: ReturnType<typeof useRemoteSync> | null = null;
    const { unmount: unmount2 } = render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (remountCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(remountCtx?.status).toBe('synced');
    });

    // Domain checksums matched persisted values -> 0 upserts
    expect(supabaseState.tables.get('user_sync_state')?.upserts ?? []).toHaveLength(0);

    // Tab hide with unchanged persisted aggregate -> 0 aggregate upserts
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(supabaseState.tables.get('user_study_aggregate')?.upserts ?? []).toHaveLength(0);

    // If persisted domain checksums had an optional key (e.g. tombstones) that is now removed,
    // deleted-key comparison detects the removal and pushes.
    unmount2();
    supabaseState.reset();
    const parsedDomains = JSON.parse(persistedDomainsRaw!);
    parsedDomains.tombstones = 'old-tombstones-hash';
    localStorage.setItem(
      'ojeet-remote-sync-pushed-domains-user-1',
      JSON.stringify(parsedDomains)
    );

    let remountCtx2: ReturnType<typeof useRemoteSync> | null = null;
    render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (remountCtx2 = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(remountCtx2?.status).toBe('synced');
    });
    expect(supabaseState.tables.get('user_sync_state')?.upserts).toHaveLength(1);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  it('reads up-to-date remoteStudyAggregateRef inside runSync instead of stale closure', async () => {
    const remoteAggRow = {
      user_id: 'user-1',
      total_seconds_overall: 500,
      total_seconds_physics: 500,
      total_seconds_chemistry: 0,
      total_seconds_maths: 0,
      buckets_daily_json: {},
      buckets_weekly_json: {},
      buckets_monthly_json: {},
      video_watch_45d_json: [],
      updated_at: '2026-06-01T00:00:00.000Z',
    };

    supabaseState.setTableOverride('user_study_aggregate', {
      maybeSingle: () => ({ data: remoteAggRow, error: null }),
    });

    let latestCtx: ReturnType<typeof useRemoteSync> | null = null;
    render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('synced');
    });
    expect(latestCtx?.remoteStudyAggregate).toEqual(remoteAggRow);
    expect(supabaseState.tables.get('user_study_aggregate')?.selects).toHaveLength(1);

    // Run syncNow immediately: remoteStudyAggregateRef.current is already populated synchronously,
    // so runSync does not re-fetch user_study_aggregate when remote is unchanged and no new logs exist.
    await act(async () => {
      await latestCtx!.syncNow();
    });
    expect(supabaseState.tables.get('user_study_aggregate')?.selects).toHaveLength(1);
  });

  it('deduplicates offline online listeners and cleans them up on unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <RemoteSyncProvider>
        <div />
      </RemoteSyncProvider>
    );

    // Initial scheduleSync(0) runs and detects offline -> registers 1 online listener + 300s fallback
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    const onlineAddsAfterCycle1 = addSpy.mock.calls.filter(([ev]) => ev === 'online').length;
    expect(onlineAddsAfterCycle1).toBe(1);

    // Advance across two 300s offline fallback cycles: old listener is removed before adding the new one
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000);
    });

    const totalOnlineAdds = addSpy.mock.calls.filter(([ev]) => ev === 'online').length;
    const totalOnlineRemoves = removeSpy.mock.calls.filter(([ev]) => ev === 'online').length;
    expect(totalOnlineAdds - totalOnlineRemoves).toBe(1);

    // Unmount cleans up the remaining online listener
    unmount();
    const finalOnlineRemoves = removeSpy.mock.calls.filter(([ev]) => ev === 'online').length;
    expect(finalOnlineRemoves).toBe(totalOnlineAdds);
  });

  it('hydrates missing and null subject keys with bundled defaults in applyMergedPayload', async () => {
    const customPhysics: SubjectData = {
      materialNames: ['Custom Book'],
      chapters: [{ serial: 1, name: 'Custom Kinematics', materials: ['Custom Book'] }],
    };

    const remotePayload: SyncPayloadV1 = {
      schemaVersion: SYNC_SCHEMA_VERSION,
      generatedAt: '2026-06-02T00:00:00.000Z',
      appVersion: 'test',
      domains: {
        progress: { physics: {}, chemistry: {}, maths: {}, biology: {} },
        plannerTasks: [],
        mockScores: [],
        examDates: [],
        settings: {
          disableAutoShift: false,
          progressCardSettings: {
            visibleStats: {
              totalStudyTime: true,
              highestMockScore: true,
              highestDailyHours: true,
              highestWeekAverage: true,
              physicsTime: true,
              chemistryTime: true,
              mathsTime: true,
              physicsProgress: true,
              chemistryProgress: true,
              mathsProgress: true,
              examCountdown: true,
            },
            showTasks: true,
          },
          mockExamPresets: [],
        },
        subjects: {
          subjectData: {
            physics: customPhysics,
            chemistry: null,
          } as unknown as Record<Subject, SubjectData | null>,
          customColumns: { physics: [], chemistry: [], maths: [], biology: [] },
          excludedColumns: { physics: [], chemistry: [], maths: [], biology: [] },
          materialOrder: { physics: [], chemistry: [], maths: [], biology: [] },
        },
      },
    };

    // Force checksum mismatch so local != merged and applyMergedPayload runs
    let checksumCall = 0;
    codecMocks.computeChecksum.mockImplementation(async () => {
      checksumCall += 1;
      return `cs-${checksumCall}`;
    });
    codecMocks.decompressSyncPayload.mockReturnValue(remotePayload);
    supabaseState.setTableOverride('user_sync_state', {
      maybeSingle: (sel) => {
        if (sel?.includes('payload_inline')) {
          return {
            data: {
              payload_inline: 'compressed',
              payload_storage: 'inline',
              payload_version: 2,
              chunk_count: 0,
              payload_bytes: 10,
              checksum: 'remote-diff',
            },
            error: null,
          };
        }
        return { data: { checksum: 'remote-diff', payload_version: 2 }, error: null };
      },
    });

    render(
      <RemoteSyncProvider>
        <div />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(testState.subjectState.setSubjectData).toHaveBeenCalled();
    });

    const hydratedArg = testState.subjectState.setSubjectData.mock.calls[0][0] as Record<
      Subject,
      SubjectData
    >;
    expect(hydratedArg.physics).toEqual(customPhysics);
    expect(hydratedArg.chemistry).toEqual(getBundledSubjectData('chemistry'));
    expect(hydratedArg.maths).toEqual(getBundledSubjectData('maths'));
    expect(hydratedArg.biology).toEqual(getBundledSubjectData('biology'));
  });

  it('uses hot-only UPDATE without cold_payload/payload_inline when split_v2 cold_checksum matches', async () => {
    codecMocks.computeChecksum.mockImplementation(async (val: string) => `hash:${val.length}`);
    codecMocks.encodeSyncPayload.mockResolvedValue({
      storage: 'inline',
      compressed: 'x',
      compressedBytes: 1,
      checksum: 'new-overall-cs',
      chunkCount: 0,
    });
    codecMocks.encodeSplitSyncPayload.mockResolvedValue({
      hotCompressed: 'new-hot',
      hotBytes: 7,
      hotChecksum: 'new-hot-cs',
      coldCompressed: 'same-cold',
      coldBytes: 9,
      coldChecksum: 'cold-cs-1',
      checksum: 'new-overall-cs',
      fitsSplitInline: true,
    });

    supabaseState.setTableOverride('user_sync_state', {
      maybeSingle: () => ({
        data: {
          checksum: 'old-overall-cs',
          payload_version: 5,
          hot_checksum: 'old-hot-cs',
          cold_checksum: 'cold-cs-1',
          payload_format: 'split_v2',
        },
        error: null,
      }),
    });
    // remoteUnchanged = true so synthesized row has payload_format: 'split_v2', cold_checksum: 'cold-cs-1', payload_inline: null
    localStorage.setItem('ojeet-remote-sync-remote-checksum', 'old-overall-cs');

    let latestCtx: ReturnType<typeof useRemoteSync> | null = null;
    render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('synced');
    });

    const userSync = supabaseState.tables.get('user_sync_state');
    expect(userSync?.upserts ?? []).toHaveLength(0);
    expect(userSync?.updates).toHaveLength(1);
    const updatePayload = userSync!.updates[0].values as Record<string, unknown>;
    expect(updatePayload.hot_payload).toBe('new-hot');
    expect(updatePayload.hot_checksum).toBe('new-hot-cs');
    expect(updatePayload).not.toHaveProperty('cold_payload');
    expect(updatePayload).not.toHaveProperty('payload_inline');
  });

  it('caches remoteChecksum (not encoded.checksum) when shouldPush is false', async () => {
    codecMocks.computeChecksum.mockResolvedValue('same-domain-hash');
    codecMocks.encodeSyncPayload.mockResolvedValue({
      storage: 'inline',
      compressed: 'x',
      compressedBytes: 1,
      checksum: 'local-different-checksum',
      chunkCount: 0,
    });

    // Persisted domain checksums match -> anyDomainDirty is false -> shouldPush is false
    localStorage.setItem(
      'ojeet-remote-sync-pushed-domains-user-1',
      JSON.stringify({
        progress: 'same-domain-hash',
        plannerTasks: 'same-domain-hash',
        mockScores: 'same-domain-hash',
        examDates: 'same-domain-hash',
        settings: 'same-domain-hash',
      })
    );
    localStorage.setItem('ojeet-remote-sync-remote-checksum', 'server-checksum-123');
    supabaseState.setTableOverride('user_sync_state', {
      maybeSingle: () => ({
        data: { checksum: 'server-checksum-123', payload_version: 1 },
        error: null,
      }),
    });

    let latestCtx: ReturnType<typeof useRemoteSync> | null = null;
    render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('synced');
    });

    expect(localStorage.getItem('ojeet-remote-sync-remote-checksum')).toBe('server-checksum-123');
  });

  it('does not bypass 10m cooldown on visibilitychange -> visible even when pending changes exist', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let latestCtx: ReturnType<typeof useRemoteSync> | null = null;

    const { rerender } = render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('synced');
    });
    const selectsAfterMount = supabaseState.tables.get('user_sync_state')?.selects.length ?? 0;

    // Introduce a pending change
    testState.progressData.progress = {
      physics: { 1: { completed: { ncert: true }, priority: 'high' } },
      chemistry: {},
      maths: {},
      biology: {},
    };
    rerender(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    // Tab switches to visible 10s after last sync -> must NOT trigger immediate sync
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(supabaseState.tables.get('user_sync_state')?.selects.length ?? 0).toBe(
      selectsAfterMount
    );
  });

  it('deduplicates concurrent pushAggregate calls and avoids cold-load echo', async () => {
    const remoteAggRow = {
      user_id: 'user-1',
      total_seconds_overall: 900,
      total_seconds_physics: 900,
      total_seconds_chemistry: 0,
      total_seconds_maths: 0,
      buckets_daily_json: {},
      buckets_weekly_json: {},
      buckets_monthly_json: {},
      video_watch_45d_json: [],
      updated_at: '2026-06-01T00:00:00.000Z',
    };

    supabaseState.setTableOverride('user_study_aggregate', {
      maybeSingle: () => ({ data: remoteAggRow, error: null }),
    });

    let latestCtx: ReturnType<typeof useRemoteSync> | null = null;
    render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('synced');
    });

    // Cold load: firing visibilitychange(hidden) + beforeunload must NOT echo unchanged remote aggregate
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('beforeunload'));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(supabaseState.tables.get('user_study_aggregate')?.upserts ?? []).toHaveLength(0);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  it('skips study_session_log polling on 10m background ticks when remote is unchanged and no pending logs exist', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let latestCtx: ReturnType<typeof useRemoteSync> | null = null;

    render(
      <RemoteSyncProvider>
        <SyncProbe onContext={(ctx) => (latestCtx = ctx)} />
      </RemoteSyncProvider>
    );

    await waitFor(() => {
      expect(latestCtx?.status).toBe('synced');
    });
    // Initial mount pulls study_session_log once
    expect(supabaseState.tables.get('study_session_log')?.selects).toHaveLength(1);

    // Advance 10 minutes for routine background tick with remoteUnchanged=true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000);
    });

    // user_sync_state checksum was checked again, but study_session_log was NOT re-polled
    expect(supabaseState.tables.get('user_sync_state')?.selects.length).toBeGreaterThanOrEqual(2);
    expect(supabaseState.tables.get('study_session_log')?.selects).toHaveLength(1);
  });
});
