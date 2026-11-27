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
import {
  buildSyncPayload,
  hydrateSubjectDataWithBundledDefaults,
  normalizeSubjectsForSync,
} from '../../features/sync/syncPayload';
import {
  SYNC_DEFAULT_PLANNER_HISTORY_DAYS,
  SyncPayloadFormat,
  SyncPayloadV1,
  SyncStorageMode,
} from '../../features/sync/syncTypes';
import {
  computeChecksum,
  decompressSyncPayload,
  encodeSplitSyncPayload,
  encodeSyncPayload,
  reconstructCompressedPayload,
  reconstructSplitSyncPayload,
} from '../../features/sync/syncCodec';
import { mergePayloadDomainsWithPolicy, SyncDomain } from '../../features/sync/syncMerge';
import { StudySession, Subject } from '../../shared/types';
import { calculateBackoffWithJitter, isOnline } from '../../shared/utils/backoff';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'auth_error';

const AUTH_ERROR_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303', '42501']);
const AUTH_ERROR_MESSAGE_REGEX = /jwt expired|invalid jwt|permission denied for table|unauthorized/i;
const SESSION_EXPIRED_MESSAGE = 'Session expired — sign in again to resume sync';

export class SyncRequestError extends Error {
  status?: number;
  code?: string;
  isAuthError: boolean;

  constructor(params: { message: string; status?: number; code?: string; isAuthError: boolean }) {
    super(params.message);
    this.name = 'SyncRequestError';
    this.status = params.status;
    this.code = params.code;
    this.isAuthError = params.isAuthError;
  }
}

export function isSyncAuthError(error: unknown, statusOverride?: number): boolean {
  if (error instanceof SyncRequestError) {
    return error.isAuthError;
  }
  const errObj = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const status = statusOverride ?? (typeof errObj?.status === 'number' ? errObj.status : undefined);
  const code = typeof errObj?.code === 'string' ? errObj.code : undefined;
  const message =
    error instanceof Error
      ? error.message
      : typeof errObj?.message === 'string'
        ? errObj.message
        : '';

  if (status === 401) return true;
  if (code && AUTH_ERROR_CODES.has(code)) return true;
  if (AUTH_ERROR_MESSAGE_REGEX.test(message)) return true;
  return false;
}

export function throwSyncError(
  error: { message?: string; code?: string; status?: number } | unknown,
  status?: number
): never {
  const errObj = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const resolvedStatus =
    status ?? (typeof errObj?.status === 'number' ? errObj.status : undefined);
  const code = typeof errObj?.code === 'string' ? errObj.code : undefined;
  const message =
    error instanceof Error
      ? error.message
      : typeof errObj?.message === 'string' && errObj.message
        ? errObj.message
        : 'Remote sync failed.';
  const isAuthError = isSyncAuthError({ message, code, status: resolvedStatus }, resolvedStatus);

  throw new SyncRequestError({
    message,
    status: resolvedStatus,
    code,
    isAuthError,
  });
}

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
  hot_payload?: string | null;
  hot_checksum?: string | null;
  cold_payload?: string | null;
  cold_checksum?: string | null;
  payload_format?: SyncPayloadFormat | null;
}

import {
  applyDeltaLogs,
  computeLocalStudyAggregate,
  computeSessionDelta,
  mergeRemoteVideoLogsIntoSessions,
  parsePushedDomainChecksums,
  pruneAggregateBuckets,
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
// Storage mode ('inline' | 'chunked') of the remote payload we last saw/pushed; lets us know
// whether stale chunk rows may exist even when the lite checksum fetch skips the full row.
const REMOTE_STORAGE_KEY = `${REMOTE_SYNC_META_PREFIX}remote-storage`;
const LAST_SESSION_DELTA_SYNCED_KEY = `${REMOTE_SYNC_META_PREFIX}last-session-delta-synced-at`;
const CACHED_AGGREGATE_KEY = `${REMOTE_SYNC_META_PREFIX}cached-aggregate`;
const PUSHED_AGGREGATE_PREFIX = `${REMOTE_SYNC_META_PREFIX}pushed-aggregate-`;
const PUSHED_DOMAINS_PREFIX = `${REMOTE_SYNC_META_PREFIX}pushed-domains-`;
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

function emptySubjectStringMap(): Record<Subject, string[]> {
  return {
    physics: [],
    chemistry: [],
    maths: [],
    biology: [],
  };
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
  plannerCutoffNow?: Date;
}) {
  const normalizedSubjects = normalizeSubjectsForSync({
    subjectData: params.subjectData,
    customColumns: params.customColumns,
    excludedColumns: params.excludedColumns,
    materialOrder: params.materialOrder,
  });

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
    now: params.plannerCutoffNow,
    appVersion: __APP_VERSION__,
    subjects: normalizedSubjects,
  });
}

// Strategy 1: Lightweight checksum-only fetch (~80 bytes egress vs ~200KB for full payload)
async function fetchRemoteChecksum(userId: string): Promise<{
  checksum: string | null;
  payloadVersion: number | null;
  hotChecksum: string | null;
  coldChecksum: string | null;
  payloadFormat: SyncPayloadFormat | null;
}> {
  if (!supabase) {
    return {
      checksum: null,
      payloadVersion: null,
      hotChecksum: null,
      coldChecksum: null,
      payloadFormat: null,
    };
  }

  const { data, error, status } = await supabase
    .from('user_sync_state')
    .select('checksum,payload_version,hot_checksum,cold_checksum,payload_format')
    .eq('user_id', userId)
    .maybeSingle<{
      checksum: string;
      payload_version: number;
      hot_checksum?: string | null;
      cold_checksum?: string | null;
      payload_format?: SyncPayloadFormat | null;
    }>();

  if (error) throwSyncError(error, status);
  if (!data) {
    return {
      checksum: null,
      payloadVersion: null,
      hotChecksum: null,
      coldChecksum: null,
      payloadFormat: null,
    };
  }
  return {
    checksum: data.checksum,
    payloadVersion: data.payload_version,
    hotChecksum: data.hot_checksum ?? null,
    coldChecksum: data.cold_checksum ?? null,
    payloadFormat: data.payload_format ?? null,
  };
}

async function fetchRemotePayload(
  userId: string
): Promise<{ payload: SyncPayloadV1 | null; row: UserSyncStateRow | null }> {
  if (!supabase) return { payload: null, row: null };

  const { data, error, status } = await supabase
    .from('user_sync_state')
    .select(
      'payload_inline,payload_storage,payload_version,chunk_count,payload_bytes,checksum,hot_payload,hot_checksum,cold_payload,cold_checksum,payload_format'
    )
    .eq('user_id', userId)
    .maybeSingle<UserSyncStateRow>();

  if (error) throwSyncError(error, status);
  if (!data) return { payload: null, row: null };

  // Prefer split_v2 only when payload_inline is null (meaning a legacy client hasn't overwritten it).
  if (
    data.payload_format === 'split_v2' &&
    data.payload_inline === null &&
    data.hot_payload &&
    data.cold_payload
  ) {
    const payload = reconstructSplitSyncPayload(data.hot_payload, data.cold_payload);
    return { payload, row: data };
  }

  let compressedPayload = data.payload_inline ?? '';
  if (data.payload_storage === 'chunked') {
    const { data: chunkRows, error: chunkError, status: chunkStatus } = await supabase
      .from('user_sync_chunks')
      .select('chunk_index,chunk_data')
      .eq('user_id', userId)
      .eq('payload_version', data.payload_version)
      .order('chunk_index', { ascending: true });

    if (chunkError) throwSyncError(chunkError, chunkStatus);
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

  const { data, error, status } = await supabase
    .from('user_study_aggregate')
    .select(AGGREGATE_SELECT_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle<UserStudyAggregateRow>();

  if (error) throwSyncError(error, status);
  return data ?? null;
}

function readPushedDomainChecksums(userId: string | null): Record<string, string> {
  if (!userId) return {};
  try {
    return parsePushedDomainChecksums(readStorageValue(`${PUSHED_DOMAINS_PREFIX}${userId}`));
  } catch {
    return {};
  }
}

function writePushedDomainChecksums(userId: string, checksums: Record<string, string>) {
  try {
    writeStorageValue(`${PUSHED_DOMAINS_PREFIX}${userId}`, JSON.stringify(checksums));
  } catch {
    // Storage unavailable/full: worst case is one redundant push after the next reload.
  }
}

function readPushedAggregate(userId: string | null): string | null {
  if (!userId) return null;
  return readStorageValue(`${PUSHED_AGGREGATE_PREFIX}${userId}`);
}

function writePushedAggregate(userId: string, serializedAggregate: string) {
  writeStorageValue(`${PUSHED_AGGREGATE_PREFIX}${userId}`, serializedAggregate);
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
  const { user, isConfigured, authEventEpoch = 0 } = useRemoteAuth();
  // Effects key off the stable user id, not the user object: Supabase emits a new
  // user object on every auth event (TOKEN_REFRESHED, SIGNED_IN on tab focus, ...),
  // which would otherwise cancel the retry backoff and fire an immediate sync.
  const userId = user?.id ?? null;
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

  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    readStorageValue(LAST_SYNCED_AT_KEY)
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [remoteStudyAggregate, setRemoteStudyAggregate] = useState<UserStudyAggregateRow | null>(
    () => readCachedAggregate()
  );
  const remoteStudyAggregateRef = useRef(remoteStudyAggregate);
  const lastPushedAggregateRef = useRef<string | null>(null);
  const appliedDomainSnapshotsRef = useRef<Record<SyncDomain, string | null>>({
    progress: null,
    plannerTasks: null,
    mockScores: null,
    examDates: null,
    settings: null,
    subjects: null,
  });
  // PERF (Issue #1): Per-domain checksums from the last *successful* push. Gating
  // pushes on the overall checksum alone re-uploads the full ~70 KB payload whenever
  // any byte changes (e.g. progress ticks during an active study session). With
  // per-domain checksums, a cycle whose merged output is identical to what was last
  // pushed skips the write entirely.
  // Persisted per user in localStorage and hydrated lazily (see runSync) so a page reload
  // does not make every domain look dirty and re-upload the full blob.
  const lastPushedDomainChecksumsRef = useRef<Record<string, string>>({});
  const pushedChecksumsUserIdRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);
  const pushAggregateInFlightRef = useRef(false);
  const hasPulledSessionLogsRef = useRef(false);
  const authPausedRef = useRef(false);
  const scheduledTimerRef = useRef<number | null>(null);
  const scheduledDueAtRef = useRef<number | null>(null);
  const pendingOnlineListenerRef = useRef<(() => void) | null>(null);
  const retryAttemptRef = useRef(0);
  const lastSyncCompletedAtRef = useRef<number>(0);
  const latestSettingsRef = useRef({
    enableAIAgent,
    enableMusicPlayer,
    examMode,
    neetMockExamPresets,
  });
  latestSettingsRef.current = {
    enableAIAgent,
    enableMusicPlayer,
    examMode,
    neetMockExamPresets,
  };
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
  const runSyncRef = useRef<(options?: { isManual?: boolean }) => Promise<void>>(() =>
    Promise.resolve()
  );
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
    if (pendingOnlineListenerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('online', pendingOnlineListenerRef.current);
      pendingOnlineListenerRef.current = null;
    }
  }, []);

  const applyMergedPayload = useCallback(
    (payload: SyncPayloadV1) => {
      const hydratedSubjectData = hydrateSubjectDataWithBundledDefaults(
        payload.domains.subjects?.subjectData
      );
      const resolvedCustomColumns =
        payload.domains.subjects?.customColumns ?? emptySubjectStringMap();
      const resolvedExcludedColumns =
        payload.domains.subjects?.excludedColumns ?? emptySubjectStringMap();
      const resolvedMaterialOrder =
        payload.domains.subjects?.materialOrder ?? emptySubjectStringMap();
      const nextSubjectsSnapshot = JSON.stringify({
        subjectData: hydratedSubjectData,
        customColumns: resolvedCustomColumns,
        excludedColumns: resolvedExcludedColumns,
        materialOrder: resolvedMaterialOrder,
      });

      const resolvedEnableAIAgent =
        payload.domains.settings.enableAIAgent !== undefined
          ? payload.domains.settings.enableAIAgent
          : latestSettingsRef.current.enableAIAgent;
      const resolvedEnableMusicPlayer =
        payload.domains.settings.enableMusicPlayer !== undefined
          ? payload.domains.settings.enableMusicPlayer
          : latestSettingsRef.current.enableMusicPlayer;
      const resolvedExamMode =
        payload.domains.settings.examMode !== undefined
          ? payload.domains.settings.examMode
          : latestSettingsRef.current.examMode;
      const resolvedJeePresets =
        payload.domains.settings.mockExamPresets &&
        payload.domains.settings.mockExamPresets.length > 0
          ? payload.domains.settings.mockExamPresets
          : defaultMockExamPresets;
      const resolvedNeetPresets =
        payload.domains.settings.neetMockExamPresets !== undefined &&
        payload.domains.settings.neetMockExamPresets.length > 0
          ? payload.domains.settings.neetMockExamPresets
          : latestSettingsRef.current.neetMockExamPresets;

      appliedDomainSnapshotsRef.current = {
        progress: JSON.stringify(payload.domains.progress),
        plannerTasks: JSON.stringify(payload.domains.plannerTasks),
        mockScores: JSON.stringify(payload.domains.mockScores),
        examDates: JSON.stringify(payload.domains.examDates),
        settings: JSON.stringify({
          disableAutoShift: payload.domains.settings.disableAutoShift,
          enableAIAgent: resolvedEnableAIAgent,
          enableMusicPlayer: resolvedEnableMusicPlayer,
          progressCardSettings: {
            visibleStats: payload.domains.settings.progressCardSettings.visibleStats,
            showTasks: payload.domains.settings.progressCardSettings.showTasks ?? true,
          },
          mockExamPresets: resolvedJeePresets,
          examMode: resolvedExamMode,
          neetMockExamPresets: resolvedNeetPresets,
        }),
        subjects: payload.domains.subjects ? nextSubjectsSnapshot : null,
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
      setJeeMockExamPresets(resolvedJeePresets);
      if (payload.domains.settings.examMode !== undefined) {
        setExamMode(payload.domains.settings.examMode);
      }
      if (
        payload.domains.settings.neetMockExamPresets !== undefined &&
        payload.domains.settings.neetMockExamPresets.length > 0
      ) {
        setNeetMockExamPresets(payload.domains.settings.neetMockExamPresets);
      }

      if (
        payload.domains.subjects ||
        (domainSnapshotsRef.current.subjects !== null &&
          domainSnapshotsRef.current.subjects !== nextSubjectsSnapshot)
      ) {
        appliedDomainSnapshotsRef.current.subjects = nextSubjectsSnapshot;
        setSubjectData(hydratedSubjectData);
        setCustomColumns(resolvedCustomColumns);
        setExcludedColumns(resolvedExcludedColumns);
        setMaterialOrder(resolvedMaterialOrder);
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

  const runSync = useCallback(async (options?: { isManual?: boolean }) => {
    if (!user || !isConfigured || !supabase) return;
    if (syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    const syncStartTimeIso = new Date().toISOString();
    setStatus('syncing');
    setLastError(null);

    try {
      const lastPushAt = readStorageValue(LAST_SUCCESSFUL_PUSH_AT_KEY);
      const hasPlannerEdit = hasLocalUnsyncedEdit('plannerTasks');
      const plannerCutoffNow =
        !hasPlannerEdit && lastPushAt ? new Date(lastPushAt) : undefined;

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
        plannerCutoffNow,
      });

      // --- Strategy 1: Checksum-gated fetch ---
      // First, fetch only the remote checksum (~80 bytes egress vs ~200KB for full payload) to decide
      // whether a full payload download is necessary.
      const cachedRemoteChecksum = readStorageValue(REMOTE_CHECKSUM_KEY);
      const {
        checksum: remoteChecksumLite,
        payloadVersion: remotePayloadVersionLite,
        hotChecksum: remoteHotChecksumLite,
        coldChecksum: remoteColdChecksumLite,
        payloadFormat: remotePayloadFormatLite,
      } = await fetchRemoteChecksum(user.id);

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
        // Synthesize a minimal row so the push-check and split_v2 hot-update check work
        row = remoteChecksumLite
          ? {
              payload_inline: null,
              payload_storage: (readStorageValue(REMOTE_STORAGE_KEY) === 'chunked'
                ? 'chunked'
                : 'inline') as SyncStorageMode,
              payload_version: remotePayloadVersionLite ?? 0,
              chunk_count: 0,
              payload_bytes: 0,
              checksum: remoteChecksumLite,
              hot_checksum: remoteHotChecksumLite,
              cold_checksum: remoteColdChecksumLite,
              payload_format: remotePayloadFormatLite ?? 'legacy_v1',
            }
          : null;
      }

      // --- Delta Strategy: Pull Study Session Logs ---
      let deltaCursor = readDeltaCursor();
      let newLogs: StudySessionLogEntry[] = [];
      const shouldPullSessionLogs =
        !hasPulledSessionLogsRef.current ||
        !remoteUnchanged ||
        pendingSessionLogsRef.current.length > 0 ||
        Boolean(options?.isManual);

      if (shouldPullSessionLogs) {
        // 1. Pull changes
        const {
          data: newLogsRaw,
          error: deltaPullError,
          status: deltaPullStatus,
        } = await supabase
          .from('study_session_log')
          .select('id,user_id,client_id,session_id,action,payload,created_at')
          .eq('user_id', user.id)
          .gt('created_at', deltaCursor.created_at)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .limit(500);

        if (deltaPullError) throwSyncError(deltaPullError, deltaPullStatus);
        hasPulledSessionLogsRef.current = true;
        newLogs = (newLogsRaw ?? []).filter((log) =>
          isLogAfterCursor(log, deltaCursor)
        ) as StudySessionLogEntry[];
      }

      // --- Strategy 5: Conditional aggregate sync ---
      // Only fetch the full study aggregate when studySessions have unsynced local edits or remote changed.
      const hasPendingSessionLogs = pendingSessionLogsRef.current.length > 0;
      const remoteAggregateDirty = !remoteUnchanged || newLogs.length > 0;
      const currentAggregate = remoteStudyAggregateRef.current;
      const shouldLoadAggregate =
        hasPendingSessionLogs || remoteAggregateDirty || !currentAggregate;

      let remoteAggregate: UserStudyAggregateRow | null = null;
      let videoMergeResult = { sessions: latestStudySessionsRef.current, changed: false };
      let capturedVideoLogs: any[] = [];

      if (shouldLoadAggregate) {
        if (remoteAggregateDirty || !currentAggregate) {
          remoteAggregate = await fetchRemoteStudyAggregate(user.id);
          remoteStudyAggregateRef.current = remoteAggregate;
          setRemoteStudyAggregate(remoteAggregate);
          writeCachedAggregate(remoteAggregate);
          // Initialize baseline on cold load so unchanged remote aggregate is not echoed back
          if (remoteAggregate && lastPushedAggregateRef.current === null) {
            const { updated_at: _u, ...baselinePayload } = remoteAggregate;
            const baselineStr = JSON.stringify(pruneAggregateBuckets(baselinePayload));
            lastPushedAggregateRef.current = baselineStr;
            writePushedAggregate(user.id, baselineStr);
          }
        } else {
          remoteAggregate = currentAggregate;
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
            now: plannerCutoffNow,
          })
        : localPayload;
      const localDomainChecksum = await computeChecksum(JSON.stringify(localPayload.domains));
      const mergedDomainChecksum = await computeChecksum(JSON.stringify(mergedPayload.domains));

      if (localDomainChecksum !== mergedDomainChecksum) {
        applyMergedPayload(mergedPayload);
      }

      const encoded = await encodeSyncPayload(mergedPayload);
      const remoteChecksum = row?.checksum ?? '';

      // PERF (Issue #1): Domain-dirty push gating. Studying continuously mutates the
      // progress domain, which used to re-upload the entire payload nearly every cycle
      // even though the merged output was unchanged. Only push when the overall
      // checksum differs AND at least one domain's merged content actually differs
      // from what was last successfully pushed.
      const mergedDomainChecksums: Record<string, string> = {};
      for (const [key, value] of Object.entries(mergedPayload.domains)) {
        if (value === undefined) continue;
        mergedDomainChecksums[key] = await computeChecksum(JSON.stringify(value));
      }
      // Hydrate from localStorage on first use / when the signed-in user changes.
      if (pushedChecksumsUserIdRef.current !== user.id) {
        lastPushedDomainChecksumsRef.current = readPushedDomainChecksums(user.id);
        pushedChecksumsUserIdRef.current = user.id;
      }
      const allDomainKeys = new Set([
        ...Object.keys(mergedDomainChecksums),
        ...Object.keys(lastPushedDomainChecksumsRef.current),
      ]);
      const anyDomainDirty = Array.from(allDomainKeys).some(
        (key) => mergedDomainChecksums[key] !== lastPushedDomainChecksumsRef.current[key]
      );
      const shouldPush = !row || (encoded.checksum !== remoteChecksum && anyDomainDirty);

      let pushedStorageMode: SyncStorageMode = encoded.storage;
      if (shouldPush) {
        const nextPayloadVersion = (row?.payload_version ?? 0) + 1;
        const splitEncoded = await encodeSplitSyncPayload(mergedPayload);

        if (splitEncoded?.fitsSplitInline) {
          pushedStorageMode = 'inline';
          const canHotOnlyUpdate =
            Boolean(row) &&
            row?.payload_format === 'split_v2' &&
            row?.payload_inline === null &&
            row?.cold_checksum === splitEncoded.coldChecksum;

          if (canHotOnlyUpdate) {
            // Hot-only UPDATE omits cold_payload and payload_inline so Postgres reuses TOAST pointers.
            const { error: updateError, status: updateStatus } = await supabase
              .from('user_sync_state')
              .update({
                hot_payload: splitEncoded.hotCompressed,
                hot_checksum: splitEncoded.hotChecksum,
                checksum: encoded.checksum,
                payload_version: nextPayloadVersion,
                payload_bytes: splitEncoded.hotBytes + splitEncoded.coldBytes,
                client_updated_at: new Date().toISOString(),
                app_version: __APP_VERSION__,
              })
              .eq('user_id', user.id);
            if (updateError) throwSyncError(updateError, updateStatus);
          } else {
            const manifestRow = {
              user_id: user.id,
              payload_inline: null,
              payload_storage: 'inline' as SyncStorageMode,
              payload_version: nextPayloadVersion,
              chunk_count: 0,
              payload_bytes: splitEncoded.hotBytes + splitEncoded.coldBytes,
              checksum: encoded.checksum,
              hot_payload: splitEncoded.hotCompressed,
              hot_checksum: splitEncoded.hotChecksum,
              cold_payload: splitEncoded.coldCompressed,
              cold_checksum: splitEncoded.coldChecksum,
              payload_format: 'split_v2' as SyncPayloadFormat,
              client_updated_at: new Date().toISOString(),
              app_version: __APP_VERSION__,
            };

            const { error: manifestError, status: manifestStatus } = await supabase
              .from('user_sync_state')
              .upsert(manifestRow, { onConflict: 'user_id' });
            if (manifestError) throwSyncError(manifestError, manifestStatus);
          }
        } else {
          const manifestRow = {
            user_id: user.id,
            payload_inline: encoded.storage === 'inline' ? encoded.compressed : null,
            payload_storage: encoded.storage,
            payload_version: nextPayloadVersion,
            chunk_count: encoded.storage === 'chunked' ? encoded.chunkCount : 0,
            payload_bytes: encoded.compressedBytes,
            checksum: encoded.checksum,
            payload_format: 'legacy_v1' as SyncPayloadFormat,
            client_updated_at: new Date().toISOString(),
            app_version: __APP_VERSION__,
          };

          const { error: manifestError, status: manifestStatus } = await supabase
            .from('user_sync_state')
            .upsert(manifestRow, { onConflict: 'user_id' }); // Removing .select() completely suppresses RETURNING * in supabase-js v2
          if (manifestError) throwSyncError(manifestError, manifestStatus);

          if (encoded.storage === 'chunked') {
            const chunkRows = encoded.chunks.map((chunk, index) => ({
              user_id: user.id,
              payload_version: nextPayloadVersion,
              chunk_index: index,
              chunk_data: chunk,
            }));

            const { error: chunkError, status: chunkStatus } = await supabase
              .from('user_sync_chunks')
              .upsert(chunkRows, { onConflict: 'user_id,payload_version,chunk_index' }); // Removing .select() suppresses RETURNING *
            if (chunkError) throwSyncError(chunkError, chunkStatus);
          }
        }
        // No DB trigger prunes old chunk versions (dropped in 20260626171500), and the nightly
        // cron only runs once a day, so delete superseded versions now. Only needed when this
        // push or the previous remote payload was chunked. Failure must not fail the sync.
        if (pushedStorageMode === 'chunked' || row?.payload_storage === 'chunked') {
          try {
            const { error: pruneError } = await supabase
              .from('user_sync_chunks')
              .delete()
              .eq('user_id', user.id)
              .lt('payload_version', nextPayloadVersion);
            if (pruneError) console.warn('Failed to prune old sync chunks:', pruneError.message);
          } catch (pruneErr) {
            console.warn('Failed to prune old sync chunks:', pruneErr);
          }
        }
        // Remember what was pushed so future cycles can skip no-op rewrites (also across reloads).
        lastPushedDomainChecksumsRef.current = mergedDomainChecksums;
        writePushedDomainChecksums(user.id, mergedDomainChecksums);
      }

      // Cache the actual server checksum locally to enable checksum-gating on next cycle
      if (shouldPush) {
        writeStorageValue(REMOTE_CHECKSUM_KEY, encoded.checksum);
        writeStorageValue(REMOTE_STORAGE_KEY, pushedStorageMode);
      } else if (remoteChecksum) {
        writeStorageValue(REMOTE_CHECKSUM_KEY, remoteChecksum);
        if (needsFullFetch && row) {
          writeStorageValue(REMOTE_STORAGE_KEY, row.payload_storage);
        }
      }

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
        // NOTE: Because study_session_log has UNIQUE (user_id, session_id) and FOR UPDATE
        // USING (false), ignoreDuplicates: true prevents 409 conflict loops by ignoring
        // post-insert edits/deletes for the same session_id server-side unless the table
        // schema is later changed to support append-only event keys.
        const {
          data: insertedLogs,
          error: deltaPushError,
          status: deltaPushStatus,
        } = await supabase
          .from('study_session_log')
          .upsert(rowsToInsert, { onConflict: 'user_id,session_id', ignoreDuplicates: true })
          .select('id, created_at');

        if (deltaPushError) {
          throwSyncError(deltaPushError, deltaPushStatus);
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
        // PERF (Issue #2): cap daily buckets at the retention window before the
        // aggregate row is cached/queued so pushes never carry unbounded history.
        const localAggregate = pruneAggregateBuckets(
          computeLocalStudyAggregate(finalSessionsForAggregate)
        );

        const mergedAggregateRow = {
          user_id: user.id,
          total_seconds_overall: Math.max(
            localAggregate.total_seconds_overall,
            remoteAggregate?.total_seconds_overall ?? 0
          ),
          total_seconds_physics: Math.max(
            localAggregate.total_seconds_physics,
            remoteAggregate?.total_seconds_physics ?? 0
          ),
          total_seconds_chemistry: Math.max(
            localAggregate.total_seconds_chemistry,
            remoteAggregate?.total_seconds_chemistry ?? 0
          ),
          total_seconds_maths: Math.max(
            localAggregate.total_seconds_maths,
            remoteAggregate?.total_seconds_maths ?? 0
          ),
          buckets_daily_json: localAggregate.buckets_daily_json,
          buckets_weekly_json: localAggregate.buckets_weekly_json,
          buckets_monthly_json: localAggregate.buckets_monthly_json,
          video_watch_45d_json: remoteAggregate?.video_watch_45d_json ?? [],
          updated_at: new Date().toISOString(),
        };

        // Aggregate persistence is intentionally NOT in this hot loop.
        // The throttled path below (hourly interval + beforeunload + visibilitychange→hidden)
        // with its content-equality guard (lastPushedAggregateRef) handles all DB writes.
        // If the tab crashes before either trigger fires, data is safe locally (writeCachedAggregate).
        remoteStudyAggregateRef.current = mergedAggregateRow;
        setRemoteStudyAggregate(mergedAggregateRow);
        writeCachedAggregate(mergedAggregateRow);
      }

      const syncedAt = new Date().toISOString();
      markCleanDomainsAsSynced(syncStartTimeIso);
      authPausedRef.current = false;
      setLastSyncedAt(syncedAt);
      setStatus('synced');
      retryAttemptRef.current = 0;
      lastSyncCompletedAtRef.current = Date.now();
    } catch (error) {
      if (isSyncAuthError(error)) {
        authPausedRef.current = true;
        clearScheduledSync();
        setLastError(SESSION_EXPIRED_MESSAGE);
        setStatus('auth_error');
        throw error;
      }
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
    clearScheduledSync,
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
      if (!userRef.current || !isConfiguredRef.current || authPausedRef.current) return;
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

          if (authPausedRef.current) return;

          // Offline: don't burn a request. Sync immediately on reconnect, and keep a
          // long fallback timer in case the online event never fires.
          if (!isOnline()) {
            scheduleSync(SYNC_RETRY_MAX_MS);
            if (typeof window !== 'undefined' && !pendingOnlineListenerRef.current) {
              const onOnline = () => {
                if (pendingOnlineListenerRef.current === onOnline) {
                  pendingOnlineListenerRef.current = null;
                }
                window.removeEventListener('online', onOnline);
                scheduleSync(0);
              };
              pendingOnlineListenerRef.current = onOnline;
              window.addEventListener('online', onOnline);
            }
            return;
          }

          try {
            await runSyncRef.current();
            if (!authPausedRef.current) {
              scheduleSync(nextSyncInterval());
            }
          } catch (error) {
            if (authPausedRef.current || isSyncAuthError(error)) {
              authPausedRef.current = true;
              clearScheduledSync();
              return;
            }
            // Backend unavailable/overloaded: keep the user working locally and retry
            // with capped exponential backoff. Never reload the page or wipe caches
            // here — a server outage is not a broken client, and a reload would both
            // interrupt the user and reset the backoff into an immediate retry loop.
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
    if (!userRef.current || !isConfiguredRef.current || authPausedRef.current) return;
    clearScheduledSync();
    try {
      await runSyncRef.current({ isManual: true });
      if (!authPausedRef.current) {
        scheduleSync(nextSyncInterval());
      }
    } catch (error) {
      if (authPausedRef.current || isSyncAuthError(error)) {
        authPausedRef.current = true;
        clearScheduledSync();
        return;
      }
      const backoffDelay = calculateBackoffWithJitter(
        Math.max(0, retryAttemptRef.current - 1),
        SYNC_RETRY_BASE_MS,
        SYNC_RETRY_MAX_MS
      );
      scheduleSync(backoffDelay);
    }
  }, [clearScheduledSync, scheduleSync]);

  useEffect(() => {
    if (!userId || !isConfigured) {
      clearScheduledSync();
      authPausedRef.current = false;
      hasPulledSessionLogsRef.current = false;
      retryAttemptRef.current = 0;
      pushedChecksumsUserIdRef.current = null;
      lastPushedDomainChecksumsRef.current = {};
      lastPushedAggregateRef.current = null;
      remoteStudyAggregateRef.current = null;
      setRemoteStudyAggregate(null);
      setLastError(null);
      setStatus('idle');
      return;
    }
    authPausedRef.current = false;
    retryAttemptRef.current = 0;
    pushedChecksumsUserIdRef.current = userId;
    lastPushedDomainChecksumsRef.current = readPushedDomainChecksums(userId);
    lastPushedAggregateRef.current = readPushedAggregate(userId);
    scheduleSync(0);
    return () => {
      clearScheduledSync();
    };
    // ponytail: scheduleSync intentionally omitted — it is now stable (depends only on
    // clearScheduledSync). Including it would re-fire on every sync cycle's state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearScheduledSync, isConfigured, userId]);

  // Resume sync ONLY if it was paused due to an auth error and auth state later recovered.
  useEffect(() => {
    if (authEventEpoch === 0) return;
    if (!userId || !isConfigured) return;
    if (!authPausedRef.current) return;
    authPausedRef.current = false;
    retryAttemptRef.current = 0;
    scheduleSync(0);
  }, [authEventEpoch, isConfigured, scheduleSync, userId]);

  const checkPendingChanges = useCallback(() => {
    const hasDomainEdits = domainKeys.some((domain) => hasLocalUnsyncedEdit(domain));
    const hasPendingLogs = pendingSessionLogsRef.current.length > 0;
    return hasDomainEdits || hasPendingLogs;
  }, []);

  // When the tab returns to the foreground, enforce the >= 10m minimum interval
  // so rapid tab switches don't trigger immediate DB pushes.
  useEffect(() => {
    if (!userId || !isConfigured) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // While the backend is failing or auth-paused, leave the pending state alone.
        // Pulling it forward on every tab switch turns the backoff into polling.
        if (retryAttemptRef.current > 0 || authPausedRef.current) return;
        const elapsed = Date.now() - lastSyncCompletedAtRef.current;
        if (elapsed >= SYNC_BATCH_INTERVAL_MS) {
          scheduleSync(0);
        } else {
          scheduleSync(SYNC_BATCH_INTERVAL_MS - elapsed);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, isConfigured, scheduleSync]);

  // Strategy 4: Debounce the Study Aggregate Upsert to run on an interval or beforeunload.
  useEffect(() => {
    remoteStudyAggregateRef.current = remoteStudyAggregate;
  }, [remoteStudyAggregate]);

  useEffect(() => {
    if (!userId || !isConfigured || !supabase) return;
    const supabaseClient = supabase;

    const pushAggregate = async () => {
      if (pushAggregateInFlightRef.current) return;
      const currentAgg = remoteStudyAggregateRef.current;
      if (!currentAgg) return;
      // Backend is currently failing (sync is in backoff) or auth-paused: don't add
      // load on every tab hide. The aggregate is cached locally and pushed once sync recovers.
      if (retryAttemptRef.current > 0 || authPausedRef.current) return;

      pushAggregateInFlightRef.current = true;
      try {
        // Strip updated_at to ensure single query variant and faster execution.
        // PERF (Issue #2): prune daily buckets on the write side too so the JSONB
        // blob stays bounded regardless of how much history accumulated remotely.
        const { updated_at, ...upsertPayload } = currentAgg;
        const prunedUpsertPayload = pruneAggregateBuckets(upsertPayload);
        const currentStr = JSON.stringify(prunedUpsertPayload);
        if (currentStr === lastPushedAggregateRef.current) return;

        const { error, status: aggStatus } = await supabaseClient
          .from('user_study_aggregate')
          .upsert(prunedUpsertPayload, { onConflict: 'user_id' }); // Removing .select() suppresses RETURNING *
        if (!error) {
          lastPushedAggregateRef.current = currentStr;
          writePushedAggregate(userId, currentStr);
        } else if (isSyncAuthError(error, aggStatus)) {
          authPausedRef.current = true;
          clearScheduledSync();
          setLastError(SESSION_EXPIRED_MESSAGE);
          setStatus('auth_error');
        }
      } catch (err) {
        console.warn('Failed to upsert aggregate', err);
      } finally {
        pushAggregateInFlightRef.current = false;
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
  }, [userId, isConfigured]);

  // Focus/visibility-triggered syncs intentionally removed.
  // App follows a time-based polling model: sync on start, then every 10 minutes.

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
