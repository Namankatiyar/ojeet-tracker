import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRemoteAuth } from './RemoteAuthContext';
import { useUserProgress, defaultMockExamPresets } from './UserProgressContext';
import { useSubjectData } from './SubjectDataContext';
import { supabase } from '../../shared/lib/supabase';
import { buildSyncPayload } from '../../features/sync/syncPayload';
import {
  SYNC_DEFAULT_PLANNER_HISTORY_DAYS,
  SyncPayloadV1,
  SyncStorageMode,
} from '../../features/sync/syncTypes';
import {
  computeChecksum,
  decompressSyncPayload,
  encodeSyncPayload,
  reconstructCompressedPayload,
} from '../../features/sync/syncCodec';
import { mergePayloadDomainsWithPolicy, SyncDomain } from '../../features/sync/syncMerge';
import { StudySession } from '../../shared/types';
import { calculateBackoffWithJitter, isOnline } from '../../shared/utils/backoff';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface RemoteSyncContextType {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  remoteStudyAggregate: UserStudyAggregateRow | null;
  syncNow: () => Promise<void>;
  hasPendingChanges: () => boolean;
}

interface UserSyncStateRow {
  payload_inline: string | null;
  payload_storage: SyncStorageMode;
  payload_version: number;
  chunk_count: number;
  payload_bytes: number;
  checksum: string;
}

import {
  applyDeltaLogs,
  computeLocalStudyAggregate,
  computeSessionDelta,
  mergeRemoteVideoLogsIntoSessions,
} from './remoteSyncHelpers';
import type { StudySessionLogEntry, UserStudyAggregateRow } from './remoteSyncHelpers';

export type { StudySessionLogEntry, UserStudyAggregateRow } from './remoteSyncHelpers';

const REMOTE_SYNC_META_PREFIX = 'ojeet-remote-sync-';
const LAST_SUCCESSFUL_PUSH_AT_KEY = `${REMOTE_SYNC_META_PREFIX}last-successful-push-at`;
const LAST_SYNCED_AT_KEY = `${REMOTE_SYNC_META_PREFIX}last-synced-at`;
const DOMAIN_EDITED_AT_PREFIX = `${REMOTE_SYNC_META_PREFIX}domain-edited-at-`;
// Content-modified-at is distinct from domain-edited-at: it is stamped ONLY on genuine
// local content changes and is never advanced by a successful sync. This makes it a valid
// last-write-wins clock for singleton domains (settings, subjects) across devices.
const DOMAIN_CONTENT_MODIFIED_AT_PREFIX = `${REMOTE_SYNC_META_PREFIX}domain-content-modified-at-`;
const REMOTE_CHECKSUM_KEY = `${REMOTE_SYNC_META_PREFIX}remote-checksum`;
const LAST_SESSION_DELTA_SYNCED_KEY = `${REMOTE_SYNC_META_PREFIX}last-session-delta-synced-at`;
const CACHED_AGGREGATE_KEY = `${REMOTE_SYNC_META_PREFIX}cached-aggregate`;
const DEFAULT_DELTA_CURSOR = { created_at: '2000-01-01T00:00:00.000Z' };

const SYNC_BATCH_INTERVAL_MS = 600_000; // 10 minutes — active (tab visible) polling cadence
const SYNC_PASSIVE_INTERVAL_MS = 1_800_000; // 30 minutes — cadence while the tab is hidden
const SYNC_RETRY_BASE_MS = 5_000;
const SYNC_RETRY_MAX_MS = 300_000;
// Focus-triggered syncs removed — app uses time-based polling only.

// Cadence for the next scheduled success-path sync, throttled when backgrounded.
const nextSyncInterval = () =>
  typeof document !== 'undefined' && document.visibilityState === 'hidden'
    ? SYNC_PASSIVE_INTERVAL_MS
    : SYNC_BATCH_INTERVAL_MS;

const domainKeys: SyncDomain[] = [
  'progress',
  'plannerTasks',
  'mockScores',
  'examDates',
  'settings',
  'subjects',
];

const RemoteSyncContext = createContext<RemoteSyncContextType | undefined>(undefined);

function readStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

function writeStorageValue(key: string, value: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

function getDomainEditedAt(domain: SyncDomain): string | null {
  return readStorageValue(`${DOMAIN_EDITED_AT_PREFIX}${domain}`);
}

function setDomainEditedAt(domain: SyncDomain, value: string) {
  writeStorageValue(`${DOMAIN_EDITED_AT_PREFIX}${domain}`, value);
}

function getDomainContentModifiedAt(domain: SyncDomain): string | null {
  return readStorageValue(`${DOMAIN_CONTENT_MODIFIED_AT_PREFIX}${domain}`);
}

function setDomainContentModifiedAt(domain: SyncDomain, value: string) {
  writeStorageValue(`${DOMAIN_CONTENT_MODIFIED_AT_PREFIX}${domain}`, value);
}

function markCleanDomainsAsSynced(syncStartTimeIso: string) {
  const syncStartTimeMs = new Date(syncStartTimeIso).getTime();
  writeStorageValue(LAST_SUCCESSFUL_PUSH_AT_KEY, syncStartTimeIso);
  writeStorageValue(LAST_SYNCED_AT_KEY, syncStartTimeIso);
  domainKeys.forEach((domain) => {
    const editedAtStr = getDomainEditedAt(domain);
    if (!editedAtStr) {
      setDomainEditedAt(domain, syncStartTimeIso);
    } else {
      const editedAtMs = new Date(editedAtStr).getTime();
      if (!Number.isNaN(editedAtMs) && editedAtMs <= syncStartTimeMs) {
        setDomainEditedAt(domain, syncStartTimeIso);
      }
      // If editedAtMs > syncStartTimeMs, local edits occurred while the sync was in flight.
      // We preserve the newer editedAtStr so the next sync knows to push those local edits!
    }
  });
}

type DeltaCursor = {
  created_at: string;
  id?: string;
};

function readDeltaCursor(): DeltaCursor {
  const raw = readStorageValue(LAST_SESSION_DELTA_SYNCED_KEY);
  if (!raw) return DEFAULT_DELTA_CURSOR;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.created_at === 'string') {
      return {
        created_at: parsed.created_at,
        id: typeof parsed.id === 'string' ? parsed.id : undefined,
      };
    }
    return DEFAULT_DELTA_CURSOR;
  } catch {
    // Legacy timestamp-only value.
  }
  return { created_at: raw };
}

function writeDeltaCursor(cursor: DeltaCursor) {
  writeStorageValue(LAST_SESSION_DELTA_SYNCED_KEY, JSON.stringify(cursor));
}

function isCursorAfter(a: DeltaCursor, b: DeltaCursor) {
  if (a.created_at > b.created_at) return true;
  if (a.created_at < b.created_at) return false;
  if (!a.id || !b.id) return false;
  return a.id > b.id;
}

function isLogAfterCursor(log: StudySessionLogEntry, cursor: DeltaCursor) {
  if (log.created_at > cursor.created_at) return true;
  if (log.created_at < cursor.created_at) return false;
  if (!cursor.id) return true;
  return log.id > cursor.id;
}

function hasLocalUnsyncedEdit(domain: SyncDomain): boolean {
  const localEditedAt = getDomainEditedAt(domain);
  const lastPushAt = readStorageValue(LAST_SUCCESSFUL_PUSH_AT_KEY);
  if (!localEditedAt) return false;
  if (!lastPushAt) return true;
  return new Date(localEditedAt).getTime() > new Date(lastPushAt).getTime();
}

// modifiedAt drives LWW for the singleton domains (settings, subjects). We use the
// content-modified clock (stamped only on genuine edits, never advanced by a sync) so a
// device that merely synced without editing cannot out-rank one that actually changed data.
function getDomainsModifiedAtMap(): { settings?: string; subjects?: string } {
  const map: { settings?: string; subjects?: string } = {};
  const settings = getDomainContentModifiedAt('settings');
  if (settings) map.settings = settings;
  const subjects = getDomainContentModifiedAt('subjects');
  if (subjects) map.subjects = subjects;
  return map;
}

function createLocalPayload(params: {
  progress: ReturnType<typeof useUserProgress>['progress'];
  plannerTasks: ReturnType<typeof useUserProgress>['plannerTasks'];
  mockScores: ReturnType<typeof useUserProgress>['mockScores'];
  studySessions: ReturnType<typeof useUserProgress>['studySessions'];
  examDates: ReturnType<typeof useUserProgress>['examDates'];
  disableAutoShift: ReturnType<typeof useUserProgress>['disableAutoShift'];
  progressCardSettings: ReturnType<typeof useUserProgress>['progressCardSettings'];
  mockExamPresets: ReturnType<typeof useUserProgress>['mockExamPresets'];
  examMode: ReturnType<typeof useUserProgress>['examMode'];
  neetMockExamPresets: ReturnType<typeof useUserProgress>['neetMockExamPresets'];
  tombstones: ReturnType<typeof useUserProgress>['tombstones'];
  subjectData: ReturnType<typeof useSubjectData>['subjectData'];
  customColumns: ReturnType<typeof useSubjectData>['customColumns'];
  excludedColumns: ReturnType<typeof useSubjectData>['excludedColumns'];
  materialOrder: ReturnType<typeof useSubjectData>['materialOrder'];
}) {
  return buildSyncPayload({
    progress: params.progress,
    plannerTasks: params.plannerTasks,
    mockScores: params.mockScores,
    examDates: params.examDates,
    disableAutoShift: params.disableAutoShift,
    progressCardSettings: params.progressCardSettings,
    mockExamPresets: params.mockExamPresets,
    examMode: params.examMode,
    neetMockExamPresets: params.neetMockExamPresets,
    tombstones: params.tombstones,
    domainsModifiedAt: getDomainsModifiedAtMap(),
    plannerHistoryDays: SYNC_DEFAULT_PLANNER_HISTORY_DAYS,
    appVersion: __APP_VERSION__,
    subjects: {
      subjectData: params.subjectData,
      customColumns: params.customColumns,
      excludedColumns: params.excludedColumns,
      materialOrder: params.materialOrder,
    },
  });
}

// Strategy 1: Lightweight checksum-only fetch (~50 bytes egress vs ~200KB for full payload)
async function fetchRemoteChecksum(
  userId: string
): Promise<{ checksum: string | null; payloadVersion: number | null }> {
  if (!supabase) return { checksum: null, payloadVersion: null };

  const { data, error } = await supabase
    .from('user_sync_state')
    .select('checksum,payload_version')
    .eq('user_id', userId)
    .maybeSingle<{ checksum: string; payload_version: number }>();

  if (error) throw new Error(error.message);
  if (!data) return { checksum: null, payloadVersion: null };
  return { checksum: data.checksum, payloadVersion: data.payload_version };
}

async function fetchRemotePayload(
  userId: string
): Promise<{ payload: SyncPayloadV1 | null; row: UserSyncStateRow | null }> {
  if (!supabase) return { payload: null, row: null };

  const { data, error } = await supabase
    .from('user_sync_state')
    .select('payload_inline,payload_storage,payload_version,chunk_count,payload_bytes,checksum')
    .eq('user_id', userId)
    .maybeSingle<UserSyncStateRow>();

  if (error) throw new Error(error.message);
  if (!data) return { payload: null, row: null };

  let compressedPayload = data.payload_inline ?? '';
  if (data.payload_storage === 'chunked') {
    const { data: chunkRows, error: chunkError } = await supabase
      .from('user_sync_chunks')
      .select('chunk_index,chunk_data')
      .eq('user_id', userId)
      .eq('payload_version', data.payload_version)
      .order('chunk_index', { ascending: true });

    if (chunkError) throw new Error(chunkError.message);
    compressedPayload = reconstructCompressedPayload(chunkRows ?? []);
  }

  if (!compressedPayload) {
    return { payload: null, row: data };
  }

  const payload = decompressSyncPayload(compressedPayload);
  return { payload, row: data };
}

const AGGREGATE_SELECT_COLUMNS =
  'user_id,total_seconds_overall,total_seconds_physics,total_seconds_chemistry,total_seconds_maths,buckets_daily_json,buckets_weekly_json,buckets_monthly_json,video_watch_45d_json,updated_at' as const;

async function fetchRemoteStudyAggregate(userId: string): Promise<UserStudyAggregateRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_study_aggregate')
    .select(AGGREGATE_SELECT_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle<UserStudyAggregateRow>();

  if (error) throw new Error(error.message);
  return data ?? null;
}

function readCachedAggregate(): UserStudyAggregateRow | null {
  const raw = readStorageValue(CACHED_AGGREGATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserStudyAggregateRow;
  } catch {
    return null;
  }
}

function writeCachedAggregate(aggregate: UserStudyAggregateRow | null) {
  if (!aggregate) return;
  writeStorageValue(CACHED_AGGREGATE_KEY, JSON.stringify(aggregate));
}

export const RemoteSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isConfigured } = useRemoteAuth();
  const {
    progress,
    setProgress,
    plannerTasks,
    setPlannerTasks,
    studySessions,
    setStudySessions,
    mockScores,
    setMockScores,
    examDates,
    setExamDates,
    disableAutoShift,
    setDisableAutoShift,
    enableAIAgent,
    setEnableAIAgent,
    enableMusicPlayer,
    setEnableMusicPlayer,
    progressCardSettings,
    setProgressCardSettings,
    jeeMockExamPresets,
    setJeeMockExamPresets,
    neetMockExamPresets,
    setNeetMockExamPresets,
    examMode,
    setExamMode,
    tombstones,
    setTombstones,
  } = useUserProgress();
  const {
    subjectData,
    setSubjectData,
    customColumns,
    setCustomColumns,
    excludedColumns,
    setExcludedColumns,
    materialOrder,
    setMaterialOrder,
  } = useSubjectData();

  // Rescue lost study sessions: If local sessions are wiped but a sync cursor exists,
  // clear the cursor to force a full re-fetch from Supabase.
  useEffect(() => {
    const cursor = readStorageValue(LAST_SESSION_DELTA_SYNCED_KEY);
    if (studySessions.length === 0 && cursor) {
      console.warn('Recovering lost study sessions: clearing sync cursor.');
      window.localStorage.removeItem(LAST_SESSION_DELTA_SYNCED_KEY);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    readStorageValue(LAST_SYNCED_AT_KEY)
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [remoteStudyAggregate, setRemoteStudyAggregate] = useState<UserStudyAggregateRow | null>(
    () => readCachedAggregate()
  );
  const appliedDomainSnapshotsRef = useRef<Record<SyncDomain, string | null>>({
    progress: null,
    plannerTasks: null,
    mockScores: null,
    examDates: null,
    settings: null,
    subjects: null,
  });
  const syncInFlightRef = useRef(false);
  const scheduledTimerRef = useRef<number | null>(null);
  const scheduledDueAtRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const lastSyncCompletedAtRef = useRef<number>(0);
  const domainSnapshotsRef = useRef<Record<SyncDomain, string | null>>({
    progress: null,
    plannerTasks: null,
    mockScores: null,
    examDates: null,
    settings: null,
    subjects: null,
  });
  const studySessionsSnapshotRef = useRef<string | null>(null);
  const isHydratedRef = useRef(false);
  const skipNextSessionsSyncRef = useRef(false);
  // Always-current mirror of studySessions so runSync never reads a stale closure value.
  const latestStudySessionsRef = useRef(studySessions);
  // Stable refs for runSync/user/isConfigured so scheduleSync closure never goes stale
  // without recreating the callback itself (which would re-fire the startup useEffect).
  const runSyncRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const userRef = useRef(user);
  const isConfiguredRef = useRef(isConfigured);

  const clientIdRef = useRef<string>(Math.random().toString(36).substring(2, 15));
  const pendingSessionLogsRef = useRef<
    Omit<StudySessionLogEntry, 'id' | 'created_at' | 'user_id'>[]
  >([]);

  const domainSnapshots = useMemo<Record<SyncDomain, string | null>>(() => {
    const isSubjectDataLoaded =
      subjectData.physics !== null && subjectData.chemistry !== null && subjectData.maths !== null;

    return {
      progress: JSON.stringify(progress),
      plannerTasks: JSON.stringify(plannerTasks),
      mockScores: JSON.stringify(mockScores),
      examDates: JSON.stringify(examDates),
      settings: JSON.stringify({
        disableAutoShift,
        enableAIAgent,
        enableMusicPlayer,
        progressCardSettings: {
          visibleStats: progressCardSettings.visibleStats,
          showTasks: progressCardSettings.showTasks,
        },
        mockExamPresets: jeeMockExamPresets,
        examMode,
        neetMockExamPresets,
      }),
      subjects: isSubjectDataLoaded
        ? JSON.stringify({
            subjectData,
            customColumns,
            excludedColumns,
            materialOrder,
          })
        : null,
    };
  }, [
    progress,
    plannerTasks,
    mockScores,
    examDates,
    disableAutoShift,
    enableAIAgent,
    enableMusicPlayer,
    progressCardSettings,
    jeeMockExamPresets,
    examMode,
    neetMockExamPresets,
    subjectData,
    customColumns,
    excludedColumns,
    materialOrder,
  ]);

  const clearScheduledSync = useCallback(() => {
    if (scheduledTimerRef.current !== null) {
      window.clearTimeout(scheduledTimerRef.current);
      scheduledTimerRef.current = null;
      scheduledDueAtRef.current = null;
    }
  }, []);

  const applyMergedPayload = useCallback(
    (payload: SyncPayloadV1) => {
      appliedDomainSnapshotsRef.current = {
        progress: JSON.stringify(payload.domains.progress),
        plannerTasks: JSON.stringify(payload.domains.plannerTasks),
        mockScores: JSON.stringify(payload.domains.mockScores),
        examDates: JSON.stringify(payload.domains.examDates),
        settings: JSON.stringify({
          disableAutoShift: payload.domains.settings.disableAutoShift,
          enableAIAgent: payload.domains.settings.enableAIAgent,
          enableMusicPlayer: payload.domains.settings.enableMusicPlayer,
          progressCardSettings: {
            visibleStats: payload.domains.settings.progressCardSettings.visibleStats,
            showTasks: payload.domains.settings.progressCardSettings.showTasks ?? true,
          },
          mockExamPresets:
            payload.domains.settings.mockExamPresets &&
            payload.domains.settings.mockExamPresets.length > 0
              ? payload.domains.settings.mockExamPresets
              : defaultMockExamPresets,
          examMode: payload.domains.settings.examMode,
          neetMockExamPresets: payload.domains.settings.neetMockExamPresets,
        }),
        subjects: payload.domains.subjects
          ? JSON.stringify({
              subjectData: payload.domains.subjects.subjectData,
              customColumns: payload.domains.subjects.customColumns,
              excludedColumns: payload.domains.subjects.excludedColumns,
              materialOrder: payload.domains.subjects.materialOrder,
            })
          : null,
      };

      setProgress(payload.domains.progress);
      setPlannerTasks(payload.domains.plannerTasks);
      setMockScores(payload.domains.mockScores);
      setExamDates(payload.domains.examDates);
      setDisableAutoShift(payload.domains.settings.disableAutoShift);
      if (payload.domains.settings.enableAIAgent !== undefined) {
        setEnableAIAgent(payload.domains.settings.enableAIAgent);
      }
      if (payload.domains.settings.enableMusicPlayer !== undefined) {
        setEnableMusicPlayer(payload.domains.settings.enableMusicPlayer);
      }
      setProgressCardSettings((prev) => ({
        ...prev,
        visibleStats: payload.domains.settings.progressCardSettings.visibleStats,
        showTasks: payload.domains.settings.progressCardSettings.showTasks ?? true,
      }));
      setJeeMockExamPresets(
        payload.domains.settings.mockExamPresets &&
          payload.domains.settings.mockExamPresets.length > 0
          ? payload.domains.settings.mockExamPresets
          : defaultMockExamPresets
      );
      if (payload.domains.settings.examMode !== undefined) {
        setExamMode(payload.domains.settings.examMode);
      }
      if (
        payload.domains.settings.neetMockExamPresets !== undefined &&
        payload.domains.settings.neetMockExamPresets.length > 0
      ) {
        setNeetMockExamPresets(payload.domains.settings.neetMockExamPresets);
      }

      if (payload.domains.subjects) {
        setSubjectData(payload.domains.subjects.subjectData);
        setCustomColumns(payload.domains.subjects.customColumns);
        setExcludedColumns(payload.domains.subjects.excludedColumns);
        setMaterialOrder(payload.domains.subjects.materialOrder);
      }
      // Absorb merged tombstones so this device's next payload carries the union.
      // Always set (defaulting to empty) so tombstones the merge discarded — because an
      // item was recreated after deletion — are dropped locally instead of resurfacing.
      setTombstones(payload.domains.tombstones ?? {});
      // Adopt the winning singleton modifiedAt clocks so future local payloads don't
      // regress below the merged timestamp.
      if (payload.domains.modifiedAt?.settings) {
        setDomainContentModifiedAt('settings', payload.domains.modifiedAt.settings);
      }
      if (payload.domains.modifiedAt?.subjects) {
        setDomainContentModifiedAt('subjects', payload.domains.modifiedAt.subjects);
      }
    },
    [
      setCustomColumns,
      setDisableAutoShift,
      setEnableAIAgent,
      setExamDates,
      setExcludedColumns,
      setMaterialOrder,
      setMockScores,
      setPlannerTasks,
      setProgress,
      setProgressCardSettings,
      setJeeMockExamPresets,
      setNeetMockExamPresets,
      setExamMode,
      setSubjectData,
      setTombstones,
    ]
  );

  const runSync = useCallback(async () => {
    if (!user || !isConfigured || !supabase) return;
    if (syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    const syncStartTimeIso = new Date().toISOString();
    setStatus('syncing');
    setLastError(null);

    try {
      const localPayload = createLocalPayload({
        progress,
        plannerTasks,
        mockScores,
        studySessions: latestStudySessionsRef.current,
        examDates,
        disableAutoShift,
        progressCardSettings,
        mockExamPresets: jeeMockExamPresets,
        examMode,
        neetMockExamPresets,
        tombstones,
        subjectData,
        customColumns,
        excludedColumns,
        materialOrder,
      });

      // --- Strategy 1: Checksum-gated fetch ---
      // First, fetch only the remote checksum (~50 bytes egress) to decide
      // whether a full payload download is necessary.
      const cachedRemoteChecksum = readStorageValue(REMOTE_CHECKSUM_KEY);
      const { checksum: remoteChecksumLite, payloadVersion: remotePayloadVersionLite } =
        await fetchRemoteChecksum(user.id);

      const remoteUnchanged =
        remoteChecksumLite !== null && remoteChecksumLite === cachedRemoteChecksum;
      const needsFullFetch = !remoteUnchanged;

      let remotePayload: SyncPayloadV1 | null = null;
      let row: UserSyncStateRow | null = null;

      if (needsFullFetch) {
        const result = await fetchRemotePayload(user.id);
        remotePayload = result.payload;
        row = result.row;
      } else {
        // Synthesize a minimal row so the push-check below works
        row = remoteChecksumLite
          ? {
              payload_inline: null,
              payload_storage: 'inline' as SyncStorageMode,
              payload_version: remotePayloadVersionLite ?? 0,
              chunk_count: 0,
              payload_bytes: 0,
              checksum: remoteChecksumLite,
            }
          : null;
      }

      // --- Delta Strategy: Pull Study Session Logs ---
      let deltaCursor = readDeltaCursor();

      // 1. Pull changes
      const { data: newLogsRaw, error: deltaPullError } = await supabase
        .from('study_session_log')
        .select('id,user_id,client_id,session_id,action,payload,created_at')
        .eq('user_id', user.id)
        .gt('created_at', deltaCursor.created_at)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(500);

      if (deltaPullError) throw new Error(deltaPullError.message);
      const newLogs = (newLogsRaw ?? []).filter((log) =>
        isLogAfterCursor(log, deltaCursor)
      ) as StudySessionLogEntry[];

      // --- Strategy 5: Conditional aggregate sync ---
      // Only fetch the full study aggregate when studySessions have unsynced local edits or remote changed.
      const hasPendingSessionLogs = pendingSessionLogsRef.current.length > 0;
      const remoteAggregateDirty = !remoteUnchanged || newLogs.length > 0;
      const shouldLoadAggregate =
        hasPendingSessionLogs || remoteAggregateDirty || !remoteStudyAggregate;

      let remoteAggregate: UserStudyAggregateRow | null = null;
      let videoMergeResult = { sessions: latestStudySessionsRef.current, changed: false };
      let capturedVideoLogs: any[] = [];

      if (shouldLoadAggregate) {
        if (remoteAggregateDirty || !remoteStudyAggregate) {
          remoteAggregate = await fetchRemoteStudyAggregate(user.id);
          setRemoteStudyAggregate(remoteAggregate);
          writeCachedAggregate(remoteAggregate);
        } else {
          remoteAggregate = remoteStudyAggregate;
        }
        capturedVideoLogs = remoteAggregate?.video_watch_45d_json ?? [];
        videoMergeResult = mergeRemoteVideoLogsIntoSessions(
          latestStudySessionsRef.current,
          capturedVideoLogs
        );
      }

      const mergedPayload = remotePayload
        ? mergePayloadDomainsWithPolicy(localPayload, remotePayload, {
            hasLocalUnsyncedEdit: (domain) => hasLocalUnsyncedEdit(domain),
          })
        : localPayload;
      const localDomainChecksum = await computeChecksum(JSON.stringify(localPayload.domains));
      const mergedDomainChecksum = await computeChecksum(JSON.stringify(mergedPayload.domains));

      if (localDomainChecksum !== mergedDomainChecksum) {
        applyMergedPayload(mergedPayload);
      }

      const encoded = await encodeSyncPayload(mergedPayload);
      const remoteChecksum = row?.checksum ?? '';
      const shouldPush = !row || encoded.checksum !== remoteChecksum;

      if (shouldPush) {
        const nextPayloadVersion = (row?.payload_version ?? 0) + 1;

        const manifestRow = {
          user_id: user.id,
          payload_inline: encoded.storage === 'inline' ? encoded.compressed : null,
          payload_storage: encoded.storage,
          payload_version: nextPayloadVersion,
          chunk_count: encoded.storage === 'chunked' ? encoded.chunkCount : 0,
          payload_bytes: encoded.compressedBytes,
          checksum: encoded.checksum,
          client_updated_at: new Date().toISOString(),
          app_version: __APP_VERSION__,
        };

        const { error: manifestError } = await supabase
          .from('user_sync_state')
          .upsert(manifestRow, { onConflict: 'user_id' }); // Removing .select() completely suppresses RETURNING * in supabase-js v2
        if (manifestError) throw new Error(manifestError.message);

        if (encoded.storage === 'chunked') {
          const chunkRows = encoded.chunks.map((chunk, index) => ({
            user_id: user.id,
            payload_version: nextPayloadVersion,
            chunk_index: index,
            chunk_data: chunk,
          }));

          const { error: chunkError } = await supabase
            .from('user_sync_chunks')
            .upsert(chunkRows, { onConflict: 'user_id,payload_version,chunk_index' }); // Removing .select() suppresses RETURNING *
          if (chunkError) throw new Error(chunkError.message);
        }
        // Database triggers automatically prune old chunks when the user_sync_state is updated.
      }

      // Cache the remote checksum locally to enable checksum-gating on next cycle
      writeStorageValue(REMOTE_CHECKSUM_KEY, encoded.checksum);

      // --- Delta Strategy: Apply Pull and Push Study Session Logs ---
      let applyDeltaChanges = false;
      let finalSessionsForAggregate = videoMergeResult.sessions;

      if (newLogs.length > 0) {
        newLogs.forEach((log) => {
          const nextCursor = { created_at: log.created_at, id: log.id };
          if (isCursorAfter(nextCursor, deltaCursor)) {
            deltaCursor = nextCursor;
          }
        });

        const applied = applyDeltaLogs(finalSessionsForAggregate, newLogs, clientIdRef.current);
        finalSessionsForAggregate = applied.sessions;
        applyDeltaChanges = applied.changed;
      }

      // 2. Push pending
      const pendingToPush = [...pendingSessionLogsRef.current];
      if (pendingToPush.length > 0) {
        const rowsToInsert = pendingToPush.map((log) => ({
          user_id: user.id,
          client_id: log.client_id,
          session_id: log.session_id,
          action: log.action,
          payload: log.payload,
        }));
        const { data: insertedLogs, error: deltaPushError } = await supabase
          .from('study_session_log')
          .insert(rowsToInsert)
          .select('id, created_at');

        if (deltaPushError) {
          throw new Error(deltaPushError.message);
        }

        pendingSessionLogsRef.current = pendingSessionLogsRef.current.slice(pendingToPush.length);
        const insertedRows = (insertedLogs ?? []) as Array<
          Pick<StudySessionLogEntry, 'id' | 'created_at'>
        >;
        insertedRows.forEach((log) => {
          const nextCursor = { created_at: log.created_at, id: log.id };
          if (isCursorAfter(nextCursor, deltaCursor)) {
            deltaCursor = nextCursor;
          }
        });
      }

      writeDeltaCursor(deltaCursor);

      if (applyDeltaChanges || videoMergeResult.changed) {
        skipNextSessionsSyncRef.current = true;
        setStudySessions((prevSessions) => {
          let updated = prevSessions;
          if (videoMergeResult.changed) {
            updated = mergeRemoteVideoLogsIntoSessions(updated, capturedVideoLogs).sessions;
          }
          if (newLogs.length > 0) {
            updated = applyDeltaLogs(updated, newLogs, clientIdRef.current).sessions;
          }
          return updated;
        });
      }

      // --- Strategy 5 (cont.): Only compute aggregate for local state ---
      const pushHadEdits = pendingToPush.length > 0;
      if (pushHadEdits || applyDeltaChanges || videoMergeResult.changed) {
        const localAggregate = computeLocalStudyAggregate(finalSessionsForAggregate);

        const mergedAggregateRow = {
          user_id: user.id,
          total_seconds_overall: localAggregate.total_seconds_overall,
          total_seconds_physics: localAggregate.total_seconds_physics,
          total_seconds_chemistry: localAggregate.total_seconds_chemistry,
          total_seconds_maths: localAggregate.total_seconds_maths,
          buckets_daily_json: localAggregate.buckets_daily_json,
          buckets_weekly_json: localAggregate.buckets_weekly_json,
          buckets_monthly_json: localAggregate.buckets_monthly_json,
          video_watch_45d_json: remoteAggregate?.video_watch_45d_json ?? [],
          updated_at: new Date().toISOString(),
        };

        // The upsert has been removed from the hot loop to save egress.
        // It is now handled by the beforeunload/throttled sync mechanism below.
        setRemoteStudyAggregate(mergedAggregateRow);
        writeCachedAggregate(mergedAggregateRow);

        try {
          const { updated_at, ...upsertPayload } = mergedAggregateRow;
          const { error } = await supabase
            .from('user_study_aggregate')
            .upsert(upsertPayload, { onConflict: 'user_id' });
          if (!error) {
            lastPushedAggregateRef.current = JSON.stringify(mergedAggregateRow);
          }
        } catch (err) {
          console.warn('Failed to upsert aggregate during sync', err);
        }
      }

      const syncedAt = new Date().toISOString();
      markCleanDomainsAsSynced(syncStartTimeIso);
      setLastSyncedAt(syncedAt);
      setStatus('synced');
      retryAttemptRef.current = 0;
      lastSyncCompletedAtRef.current = Date.now();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Remote sync failed.';
      setLastError(message);
      setStatus('error');
      retryAttemptRef.current += 1;
      throw error;
    } finally {
      syncInFlightRef.current = false;
    }
  }, [
    applyMergedPayload,
    customColumns,
    disableAutoShift,
    examDates,
    excludedColumns,
    isConfigured,
    materialOrder,
    mockScores,
    plannerTasks,
    progress,
    progressCardSettings,
    jeeMockExamPresets,
    neetMockExamPresets,
    examMode,
    setStudySessions,
    // studySessions intentionally omitted — read via latestStudySessionsRef to prevent stale closure.
    subjectData,
    tombstones,
    user,
  ]);

  // Keep the stable refs current every render so the scheduleSync closure below
  // always invokes the latest runSync without capturing stale values.
  useEffect(() => {
    runSyncRef.current = runSync;
  }, [runSync]);
  useEffect(() => {
    userRef.current = user;
    isConfiguredRef.current = isConfigured;
  }, [user, isConfigured]);

  const scheduleSync = useCallback(
    (delayMs: number) => {
      if (!userRef.current || !isConfiguredRef.current) return;
      const dueAt = Date.now() + Math.max(0, delayMs);
      const currentDueAt = scheduledDueAtRef.current;

      if (currentDueAt !== null && currentDueAt <= dueAt) {
        return;
      }

      clearScheduledSync();
      scheduledDueAtRef.current = dueAt;
      scheduledTimerRef.current = window.setTimeout(
        async () => {
          scheduledTimerRef.current = null;
          scheduledDueAtRef.current = null;

          // Offline: don't burn a request. Sync immediately on reconnect, and keep a
          // long fallback timer in case the online event never fires.
          if (!isOnline()) {
            const onOnline = () => {
              window.removeEventListener('online', onOnline);
              scheduleSync(0);
            };
            window.addEventListener('online', onOnline);
            scheduleSync(SYNC_RETRY_MAX_MS);
            return;
          }

          try {
            await runSyncRef.current();
            scheduleSync(nextSyncInterval());
          } catch (error) {
            // If sync fails with a "Payload version mismatch" or similar permanent-looking error,
            // or after too many retries, prioritize a PWA update check.
            if (retryAttemptRef.current > 5 && navigator.onLine) {
              console.warn('[Sync] Persistent failures detected. Checking for PWA updates...');
              if ((window as any).__FORCE_PWA_UPDATE__) (window as any).__FORCE_PWA_UPDATE__();
            }

            const backoffDelay = calculateBackoffWithJitter(
              Math.max(0, retryAttemptRef.current - 1),
              SYNC_RETRY_BASE_MS,
              SYNC_RETRY_MAX_MS
            );
            scheduleSync(backoffDelay);
          }
        },
        Math.max(0, delayMs)
      );
    },
    [clearScheduledSync] // ponytail: stable reference — reads user/isConfigured/runSync via refs
  );

  // Track which domains have been locally edited so the merge policy can decide
  // which side wins during the next *scheduled* sync. We intentionally do NOT
  // schedule an ad-hoc sync here — polling is time-based only.
  useEffect(() => {
    const nowIso = new Date().toISOString();
    domainKeys.forEach((domain) => {
      const previous = domainSnapshotsRef.current[domain];
      const current = domainSnapshots[domain];

      if (current === null) return;

      domainSnapshotsRef.current[domain] = current;

      if (previous === null) return;
      if (previous === current) return;
      if (
        appliedDomainSnapshotsRef.current[domain] !== null &&
        appliedDomainSnapshotsRef.current[domain] === current
      ) {
        appliedDomainSnapshotsRef.current[domain] = null;
        return;
      }

      setDomainEditedAt(domain, nowIso);
      // Genuine local content change (not a remote application): stamp the
      // content-modified clock so settings/subjects singleton LWW has a truthful timestamp.
      setDomainContentModifiedAt(domain, nowIso);
    });
  }, [domainSnapshots]);

  // Keep the live ref in sync so runSync always has the latest sessions regardless
  // of when its useCallback closure was last created.
  useEffect(() => {
    latestStudySessionsRef.current = studySessions;
  }, [studySessions]);

  // Buffer study session deltas so they are ready for the next *scheduled* sync.
  // We intentionally do NOT schedule an ad-hoc sync here.
  useEffect(() => {
    // Always update the snapshot FIRST, before any early-return guards.
    // If we skip updating the snapshot when the skip-flag is set, the next
    // delta computation diffs against a stale baseline and generates spurious
    // INSERT logs for sessions that were added by a remote pull.
    const serialized = JSON.stringify(studySessions);
    const previous = studySessionsSnapshotRef.current;
    studySessionsSnapshotRef.current = serialized;

    if (skipNextSessionsSyncRef.current) {
      skipNextSessionsSyncRef.current = false;
      return;
    }

    if (!isHydratedRef.current) {
      isHydratedRef.current = true;
      return;
    }

    if (previous === null || previous === serialized) return;

    // Compute Delta and buffer for the next scheduled sync cycle.
    const prevArray: StudySession[] = JSON.parse(previous);
    const currArray: StudySession[] = studySessions;
    const cid = clientIdRef.current;
    const newPending = computeSessionDelta(prevArray, currArray, cid);

    if (newPending.length > 0) {
      pendingSessionLogsRef.current.push(...newPending);
    }
  }, [studySessions]);

  const syncNow = useCallback(async () => {
    if (!userRef.current || !isConfiguredRef.current) return;
    clearScheduledSync();
    try {
      await runSyncRef.current();
      scheduleSync(nextSyncInterval());
    } catch {
      const backoffDelay = calculateBackoffWithJitter(
        Math.max(0, retryAttemptRef.current - 1),
        SYNC_RETRY_BASE_MS,
        SYNC_RETRY_MAX_MS
      );
      scheduleSync(backoffDelay);
    }
  }, [clearScheduledSync, scheduleSync]);

  useEffect(() => {
    if (!user || !isConfigured) {
      clearScheduledSync();
      setStatus('idle');
      setRemoteStudyAggregate(null);
      return;
    }
    scheduleSync(0);
    return () => {
      clearScheduledSync();
    };
    // ponytail: scheduleSync intentionally omitted — it is now stable (depends only on
    // clearScheduledSync). Including it would re-fire on every sync cycle's state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearScheduledSync, isConfigured, user]);

  // When the tab returns to the foreground, pull the next scheduled sync back to
  // the active cadence. scheduleSync only shortens an existing timer, so a pending
  // retry or sooner sync is preserved.
  useEffect(() => {
    if (!user || !isConfigured) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleSync(SYNC_BATCH_INTERVAL_MS);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isConfigured, scheduleSync]);

  // Strategy 4: Debounce the Study Aggregate Upsert to run on an interval or beforeunload.
  const lastPushedAggregateRef = useRef<string | null>(null);
  const remoteStudyAggregateRef = useRef(remoteStudyAggregate);
  useEffect(() => {
    remoteStudyAggregateRef.current = remoteStudyAggregate;
  }, [remoteStudyAggregate]);

  useEffect(() => {
    if (!user || !isConfigured || !supabase) return;
    const supabaseClient = supabase;

    const pushAggregate = async () => {
      const currentAgg = remoteStudyAggregateRef.current;
      if (!currentAgg) return;
      const currentStr = JSON.stringify(currentAgg);
      if (currentStr === lastPushedAggregateRef.current) return;

      try {
        // Strip updated_at to ensure single query variant and faster execution
        const { updated_at, ...upsertPayload } = currentAgg;

        const { error } = await supabaseClient
          .from('user_study_aggregate')
          .upsert(upsertPayload, { onConflict: 'user_id' }); // Removing .select() suppresses RETURNING *
        if (!error) {
          lastPushedAggregateRef.current = currentStr;
        }
      } catch (err) {
        console.warn('Failed to upsert aggregate', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pushAggregate();
      }
    };

    const intervalId = setInterval(pushAggregate, 3600000); // Once per hour
    window.addEventListener('beforeunload', pushAggregate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', pushAggregate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isConfigured]);

  // Focus/visibility-triggered syncs intentionally removed.
  // App follows a time-based polling model: sync on start, then every 10 minutes.

  const checkPendingChanges = useCallback(() => {
    const hasDomainEdits = domainKeys.some((domain) => hasLocalUnsyncedEdit(domain));
    const hasPendingLogs = pendingSessionLogsRef.current.length > 0;
    return hasDomainEdits || hasPendingLogs;
  }, []);

  const value = useMemo<RemoteSyncContextType>(
    () => ({
      status,
      lastSyncedAt,
      lastError,
      remoteStudyAggregate,
      syncNow,
      hasPendingChanges: checkPendingChanges,
    }),
    [lastError, lastSyncedAt, remoteStudyAggregate, status, syncNow, checkPendingChanges]
  );

  return <RemoteSyncContext.Provider value={value}>{children}</RemoteSyncContext.Provider>;
};

export const useRemoteSync = () => {
  const context = useContext(RemoteSyncContext);
  if (!context) {
    throw new Error('useRemoteSync must be used within a RemoteSyncProvider');
  }
  return context;
};
