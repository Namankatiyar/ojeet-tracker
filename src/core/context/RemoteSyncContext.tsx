import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRemoteAuth } from './RemoteAuthContext';
import { useUserProgress } from './UserProgressContext';
import { useSubjectData } from './SubjectDataContext';
import { supabase } from '../../shared/lib/supabase';
import { buildSyncPayload } from '../../features/sync/syncPayload';
import { SYNC_DEFAULT_PLANNER_HISTORY_DAYS, SyncPayloadV1, SyncStorageMode } from '../../features/sync/syncTypes';
import { computeChecksum, decompressSyncPayload, encodeSyncPayload, reconstructCompressedPayload } from '../../features/sync/syncCodec';
import { mergePayloadDomainsWithPolicy, SyncDomain } from '../../features/sync/syncMerge';
import { StudySession } from '../../shared/types';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface RemoteSyncContextType {
    status: SyncStatus;
    lastSyncedAt: string | null;
    lastError: string | null;
    remoteStudyAggregate: UserStudyAggregateRow | null;
    syncNow: () => Promise<void>;
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
    computeLocalStudyAggregate,
    mergeBucketMaps,
    mergeRemoteVideoLogsIntoSessions,
} from './remoteSyncHelpers';
import type { StudySessionLogEntry, UserStudyAggregateRow } from './remoteSyncHelpers';

export type { StudySessionLogEntry, UserStudyAggregateRow } from './remoteSyncHelpers';

const REMOTE_SYNC_META_PREFIX = 'ojeet-remote-sync-';
const LAST_SUCCESSFUL_PUSH_AT_KEY = `${REMOTE_SYNC_META_PREFIX}last-successful-push-at`;
const LAST_SYNCED_AT_KEY = `${REMOTE_SYNC_META_PREFIX}last-synced-at`;
const DOMAIN_EDITED_AT_PREFIX = `${REMOTE_SYNC_META_PREFIX}domain-edited-at-`;
const REMOTE_CHECKSUM_KEY = `${REMOTE_SYNC_META_PREFIX}remote-checksum`;
const LAST_SESSION_DELTA_SYNCED_KEY = `${REMOTE_SYNC_META_PREFIX}last-session-delta-synced-at`;

const SYNC_BATCH_INTERVAL_MS = 300_000;
const SYNC_RETRY_BASE_MS = 5_000;
const SYNC_RETRY_MAX_MS = 300_000;
const FOCUS_SYNC_COOLDOWN_MS = 300_000;

const domainKeys: SyncDomain[] = ['progress', 'plannerTasks', 'mockScores', 'examDates', 'settings', 'subjects'];

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

function markAllDomainsAsSynced(syncedAt: string) {
    writeStorageValue(LAST_SUCCESSFUL_PUSH_AT_KEY, syncedAt);
    writeStorageValue(LAST_SYNCED_AT_KEY, syncedAt);
    domainKeys.forEach((domain) => setDomainEditedAt(domain, syncedAt));
}

function hasLocalUnsyncedEdit(domain: SyncDomain): boolean {
    const localEditedAt = getDomainEditedAt(domain);
    const lastPushAt = readStorageValue(LAST_SUCCESSFUL_PUSH_AT_KEY);
    if (!localEditedAt) return false;
    if (!lastPushAt) return true;
    return new Date(localEditedAt).getTime() > new Date(lastPushAt).getTime();
}

function createLocalPayload(params: {
    progress: ReturnType<typeof useUserProgress>['progress'];
    plannerTasks: ReturnType<typeof useUserProgress>['plannerTasks'];
    mockScores: ReturnType<typeof useUserProgress>['mockScores'];
    studySessions: ReturnType<typeof useUserProgress>['studySessions'];
    examDates: ReturnType<typeof useUserProgress>['examDates'];
    disableAutoShift: ReturnType<typeof useUserProgress>['disableAutoShift'];
    progressCardSettings: ReturnType<typeof useUserProgress>['progressCardSettings'];
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
async function fetchRemoteChecksum(userId: string): Promise<{ checksum: string | null; payloadVersion: number | null }> {
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

async function fetchRemotePayload(userId: string): Promise<{ payload: SyncPayloadV1 | null; row: UserSyncStateRow | null }> {
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

async function fetchRemoteStudyAggregate(userId: string): Promise<UserStudyAggregateRow | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('user_study_aggregate')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<UserStudyAggregateRow>();

    if (error) throw new Error(error.message);
    return data ?? null;
}

export const RemoteSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isConfigured } = useRemoteAuth();
    const {
        progress, setProgress, plannerTasks, setPlannerTasks, studySessions, setStudySessions, mockScores, setMockScores,
        examDates, setExamDates, disableAutoShift, setDisableAutoShift, progressCardSettings, setProgressCardSettings
    } = useUserProgress();
    const { subjectData, setSubjectData, customColumns, setCustomColumns, excludedColumns, setExcludedColumns, materialOrder, setMaterialOrder } = useSubjectData();

    const [status, setStatus] = useState<SyncStatus>('idle');
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => readStorageValue(LAST_SYNCED_AT_KEY));
    const [lastError, setLastError] = useState<string | null>(null);
    const [remoteStudyAggregate, setRemoteStudyAggregate] = useState<UserStudyAggregateRow | null>(null);
    const isApplyingRemoteRef = useRef(false);
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
    const skipNextSessionsSyncRef = useRef(false);

    const clientIdRef = useRef<string>(Math.random().toString(36).substring(2, 15));
    const pendingSessionLogsRef = useRef<Omit<StudySessionLogEntry, 'id' | 'created_at' | 'user_id'>[]>([]);

    const domainSnapshots = useMemo<Record<SyncDomain, string>>(() => ({
        progress: JSON.stringify(progress),
        plannerTasks: JSON.stringify(plannerTasks),
        mockScores: JSON.stringify(mockScores),
        examDates: JSON.stringify(examDates),
        settings: JSON.stringify({
            disableAutoShift,
            progressCardSettings: {
                userName: progressCardSettings.userName,
                visibleStats: progressCardSettings.visibleStats,
            },
        }),
        subjects: JSON.stringify({
            subjectData,
            customColumns,
            excludedColumns,
            materialOrder,
        }),
    }), [progress, plannerTasks, mockScores, examDates, disableAutoShift, progressCardSettings.userName, progressCardSettings.visibleStats, subjectData, customColumns, excludedColumns, materialOrder]);

    const clearScheduledSync = useCallback(() => {
        if (scheduledTimerRef.current !== null) {
            window.clearTimeout(scheduledTimerRef.current);
            scheduledTimerRef.current = null;
            scheduledDueAtRef.current = null;
        }
    }, []);

    const applyMergedPayload = useCallback((payload: SyncPayloadV1) => {
        isApplyingRemoteRef.current = true;

        setProgress(payload.domains.progress);
        setPlannerTasks(payload.domains.plannerTasks);
        setMockScores(payload.domains.mockScores);
        setExamDates(payload.domains.examDates);
        setDisableAutoShift(payload.domains.settings.disableAutoShift);
        setProgressCardSettings((prev) => ({
            ...prev,
            userName: payload.domains.settings.progressCardSettings.userName,
            visibleStats: payload.domains.settings.progressCardSettings.visibleStats,
        }));

        if (payload.domains.subjects) {
            setSubjectData(payload.domains.subjects.subjectData);
            setCustomColumns(payload.domains.subjects.customColumns);
            setExcludedColumns(payload.domains.subjects.excludedColumns);
            setMaterialOrder(payload.domains.subjects.materialOrder);
        }

        window.setTimeout(() => {
            isApplyingRemoteRef.current = false;
        }, 0);
    }, [setCustomColumns, setDisableAutoShift, setExamDates, setExcludedColumns, setMaterialOrder, setMockScores, setPlannerTasks, setProgress, setProgressCardSettings, setSubjectData]);

    const runSync = useCallback(async () => {
        if (!user || !isConfigured || !supabase) return;
        if (syncInFlightRef.current) return;

        syncInFlightRef.current = true;
        setStatus('syncing');
        setLastError(null);

        try {
            const localPayload = createLocalPayload({
                progress,
                plannerTasks,
                mockScores,
                studySessions,
                examDates,
                disableAutoShift,
                progressCardSettings,
                subjectData,
                customColumns,
                excludedColumns,
                materialOrder,
            });

            // --- Strategy 1: Checksum-gated fetch ---
            // First, fetch only the remote checksum (~50 bytes egress) to decide
            // whether a full payload download is necessary.
            const cachedRemoteChecksum = readStorageValue(REMOTE_CHECKSUM_KEY);
            const { checksum: remoteChecksumLite, payloadVersion: remotePayloadVersionLite } = await fetchRemoteChecksum(user.id);

            const remoteUnchanged = remoteChecksumLite !== null && remoteChecksumLite === cachedRemoteChecksum;
            const needsFullFetch = !remoteUnchanged;

            let remotePayload: SyncPayloadV1 | null = null;
            let row: UserSyncStateRow | null = null;

            if (needsFullFetch) {
                const result = await fetchRemotePayload(user.id);
                remotePayload = result.payload;
                row = result.row;
            } else {
                // Synthesize a minimal row so the push-check below works
                row = remoteChecksumLite ? {
                    payload_inline: null,
                    payload_storage: 'inline' as SyncStorageMode,
                    payload_version: remotePayloadVersionLite ?? 0,
                    chunk_count: 0,
                    payload_bytes: 0,
                    checksum: remoteChecksumLite,
                } : null;
            }

            // --- Delta Strategy: Pull Study Session Logs ---
            let latestDeltaSyncedAt = readStorageValue(LAST_SESSION_DELTA_SYNCED_KEY) || '2000-01-01T00:00:00.000Z';
            
            // 1. Pull changes
            const { data: newLogs, error: deltaPullError } = await supabase
                .from('study_session_log')
                .select('*')
                .eq('user_id', user.id)
                .gt('created_at', latestDeltaSyncedAt)
                .order('created_at', { ascending: true });
                
            if (deltaPullError) throw new Error(deltaPullError.message);

            // --- Strategy 5: Conditional aggregate sync ---
            // Only fetch the full study aggregate when studySessions have unsynced local edits or remote changed.
            const hasPendingSessionLogs = pendingSessionLogsRef.current.length > 0;
            const remoteAggregateDirty = !remoteUnchanged || (newLogs && newLogs.length > 0);
            
            let remoteAggregate: UserStudyAggregateRow | null = null;
            let videoMergeResult = { sessions: studySessions, changed: false };

            if (hasPendingSessionLogs || remoteAggregateDirty) {
                if (remoteAggregateDirty || !remoteStudyAggregate) {
                    remoteAggregate = await fetchRemoteStudyAggregate(user.id);
                    setRemoteStudyAggregate(remoteAggregate);
                } else {
                    remoteAggregate = remoteStudyAggregate;
                }
                const videoLogs = remoteAggregate?.video_watch_45d_json ?? [];
                videoMergeResult = mergeRemoteVideoLogsIntoSessions(studySessions, videoLogs);
                if (videoMergeResult.changed) {
                    skipNextSessionsSyncRef.current = true;
                    setStudySessions(videoMergeResult.sessions);
                }
            }

            const mergedPayload = remotePayload ? mergePayloadDomainsWithPolicy(localPayload, remotePayload, {
                hasLocalUnsyncedEdit: (domain) => hasLocalUnsyncedEdit(domain),
            }) : localPayload;
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
                    .upsert(manifestRow, { onConflict: 'user_id' });
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
                        .upsert(chunkRows, { onConflict: 'user_id,payload_version,chunk_index' });
                    if (chunkError) throw new Error(chunkError.message);
                } 
                // Database triggers automatically prune old chunks when the user_sync_state is updated.
            }

            // Cache the remote checksum locally to enable checksum-gating on next cycle
            writeStorageValue(REMOTE_CHECKSUM_KEY, encoded.checksum);

            // --- Delta Strategy: Apply Pull and Push Study Session Logs ---
            let applyDeltaChanges = false;
            let currentSessions = [...videoMergeResult.sessions];
            
            if (newLogs && newLogs.length > 0) {
                const logs = newLogs as StudySessionLogEntry[];
                logs.forEach((log) => {
                    const logTime = new Date(log.created_at).getTime();
                    const latestTime = new Date(latestDeltaSyncedAt).getTime();
                    if (logTime > latestTime) {
                        latestDeltaSyncedAt = log.created_at;
                    }

                    if (log.client_id !== clientIdRef.current) {
                        if (log.action === 'INSERT' && log.payload) {
                            const existingIdx = currentSessions.findIndex(s => s.id === log.session_id);
                            if (existingIdx >= 0) {
                                currentSessions[existingIdx] = log.payload;
                            } else {
                                currentSessions.push(log.payload);
                            }
                            applyDeltaChanges = true;
                        } else if (log.action === 'DELETE') {
                            const existingIdx = currentSessions.findIndex(s => s.id === log.session_id);
                            if (existingIdx >= 0) {
                                currentSessions.splice(existingIdx, 1);
                                applyDeltaChanges = true;
                            }
                        }
                    }
                });
            }
            
            // 2. Push pending
            const pendingToPush = [...pendingSessionLogsRef.current];
            if (pendingToPush.length > 0) {
                const rowsToInsert = pendingToPush.map(log => ({
                    user_id: user.id,
                    client_id: log.client_id,
                    session_id: log.session_id,
                    action: log.action,
                    payload: log.payload
                }));
                const { error: deltaPushError } = await supabase
                    .from('study_session_log')
                    .insert(rowsToInsert);
                    
                if (deltaPushError) {
                    throw new Error(deltaPushError.message);
                }
                
                pendingSessionLogsRef.current = pendingSessionLogsRef.current.slice(pendingToPush.length);
                const nowIso = new Date().toISOString();
                if (new Date(nowIso).getTime() > new Date(latestDeltaSyncedAt).getTime()) {
                    latestDeltaSyncedAt = nowIso;
                }
            }
            
            writeStorageValue(LAST_SESSION_DELTA_SYNCED_KEY, latestDeltaSyncedAt);
            
            if (applyDeltaChanges) {
                skipNextSessionsSyncRef.current = true;
                setStudySessions(currentSessions);
            }

            // --- Strategy 5 (cont.): Only upsert aggregate when sessions changed ---
            const pushHadEdits = pendingToPush.length > 0;
            if (pushHadEdits || applyDeltaChanges || videoMergeResult.changed) {
                const localAggregate = computeLocalStudyAggregate(currentSessions);

                const mergedAggregateRow = {
                    user_id: user.id,
                    total_seconds_overall: Math.max(localAggregate.total_seconds_overall, remoteAggregate?.total_seconds_overall ?? 0),
                    total_seconds_physics: Math.max(localAggregate.total_seconds_physics, remoteAggregate?.total_seconds_physics ?? 0),
                    total_seconds_chemistry: Math.max(localAggregate.total_seconds_chemistry, remoteAggregate?.total_seconds_chemistry ?? 0),
                    total_seconds_maths: Math.max(localAggregate.total_seconds_maths, remoteAggregate?.total_seconds_maths ?? 0),
                    buckets_daily_json: mergeBucketMaps(remoteAggregate?.buckets_daily_json ?? {}, localAggregate.buckets_daily_json),
                    buckets_weekly_json: mergeBucketMaps(remoteAggregate?.buckets_weekly_json ?? {}, localAggregate.buckets_weekly_json),
                    buckets_monthly_json: mergeBucketMaps(remoteAggregate?.buckets_monthly_json ?? {}, localAggregate.buckets_monthly_json),
                    video_watch_45d_json: remoteAggregate?.video_watch_45d_json ?? [],
                };

                // Strategy 4: Remove .select('*') — no need to read the row back as egress
                const { error: aggregateError } = await supabase
                    .from('user_study_aggregate')
                    .upsert(mergedAggregateRow, { onConflict: 'user_id' });

                if (aggregateError) throw new Error(aggregateError.message);
                setRemoteStudyAggregate(mergedAggregateRow as unknown as UserStudyAggregateRow);
            }

            const syncedAt = new Date().toISOString();
            markAllDomainsAsSynced(syncedAt);
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
        setStudySessions,
        studySessions,
        subjectData,
        user,
    ]);

    const scheduleSync = useCallback((delayMs: number) => {
        if (!user || !isConfigured) return;
        const dueAt = Date.now() + Math.max(0, delayMs);
        const currentDueAt = scheduledDueAtRef.current;

        if (currentDueAt !== null && currentDueAt <= dueAt) {
            return;
        }

        clearScheduledSync();
        scheduledDueAtRef.current = dueAt;
        scheduledTimerRef.current = window.setTimeout(async () => {
            scheduledTimerRef.current = null;
            scheduledDueAtRef.current = null;

            try {
                await runSync();
                scheduleSync(SYNC_BATCH_INTERVAL_MS);
            } catch {
                const backoffDelay = Math.min(
                    SYNC_RETRY_BASE_MS * (2 ** Math.max(0, retryAttemptRef.current - 1)),
                    SYNC_RETRY_MAX_MS,
                );
                scheduleSync(backoffDelay);
            }
        }, Math.max(0, delayMs));
    }, [clearScheduledSync, isConfigured, runSync, user]);

    useEffect(() => {
        const nowIso = new Date().toISOString();
        let changedAny = false;
        domainKeys.forEach((domain) => {
            const previous = domainSnapshotsRef.current[domain];
            const current = domainSnapshots[domain];
            domainSnapshotsRef.current[domain] = current;

            if (previous === null) return;
            if (previous === current) return;
            if (isApplyingRemoteRef.current) return;

            setDomainEditedAt(domain, nowIso);
            changedAny = true;
        });

        if (changedAny && user && isConfigured) {
            scheduleSync(SYNC_BATCH_INTERVAL_MS);
        }
    }, [domainSnapshots, isConfigured, scheduleSync, user]);

    useEffect(() => {
        if (isApplyingRemoteRef.current) return;
        if (skipNextSessionsSyncRef.current) {
            skipNextSessionsSyncRef.current = false;
            return;
        }

        const serialized = JSON.stringify(studySessions);
        const previous = studySessionsSnapshotRef.current;
        studySessionsSnapshotRef.current = serialized;
        
        if (previous === null || previous === serialized) return;

        // Compute Delta
        const prevArray: StudySession[] = JSON.parse(previous);
        const currArray: StudySession[] = studySessions;
        const prevMap = new Map(prevArray.map(s => [s.id, s]));
        const currMap = new Map(currArray.map(s => [s.id, s]));

        const newPending: Omit<StudySessionLogEntry, 'id' | 'created_at' | 'user_id'>[] = [];
        const cid = clientIdRef.current;

        currMap.forEach((session, id) => {
            const prevSession = prevMap.get(id);
            if (!prevSession || JSON.stringify(prevSession) !== JSON.stringify(session)) {
                newPending.push({ client_id: cid, session_id: id, action: 'INSERT', payload: session });
            }
        });

        prevMap.forEach((_, id) => {
            if (!currMap.has(id)) {
                newPending.push({ client_id: cid, session_id: id, action: 'DELETE', payload: null });
            }
        });

        if (newPending.length > 0) {
            pendingSessionLogsRef.current.push(...newPending);
        }

        if (!user || !isConfigured) return;
        scheduleSync(SYNC_BATCH_INTERVAL_MS);
    }, [isConfigured, scheduleSync, studySessions, user]);

    const syncNow = useCallback(async () => {
        if (!user || !isConfigured) return;
        clearScheduledSync();
        try {
            await runSync();
            scheduleSync(SYNC_BATCH_INTERVAL_MS);
        } catch {
            const backoffDelay = Math.min(
                SYNC_RETRY_BASE_MS * (2 ** Math.max(0, retryAttemptRef.current - 1)),
                SYNC_RETRY_MAX_MS,
            );
            scheduleSync(backoffDelay);
        }
    }, [clearScheduledSync, isConfigured, runSync, scheduleSync, user]);

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
    }, [clearScheduledSync, isConfigured, scheduleSync, user]);

    // Strategy 3: Debounce focus/visibility syncs with a 60s cooldown
    useEffect(() => {
        if (!user || !isConfigured) return;

        const shouldSyncOnFocus = () => {
            const elapsed = Date.now() - lastSyncCompletedAtRef.current;
            return elapsed >= FOCUS_SYNC_COOLDOWN_MS;
        };

        const handleFocusSync = () => {
            if (shouldSyncOnFocus()) {
                scheduleSync(0);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && shouldSyncOnFocus()) {
                scheduleSync(0);
            }
        };

        window.addEventListener('focus', handleFocusSync);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('focus', handleFocusSync);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isConfigured, scheduleSync, user]);

    const value = useMemo<RemoteSyncContextType>(() => ({
        status,
        lastSyncedAt,
        lastError,
        remoteStudyAggregate,
        syncNow,
    }), [lastError, lastSyncedAt, remoteStudyAggregate, status, syncNow]);

    return (
        <RemoteSyncContext.Provider value={value}>
            {children}
        </RemoteSyncContext.Provider>
    );
};

export const useRemoteSync = () => {
    const context = useContext(RemoteSyncContext);
    if (!context) {
        throw new Error('useRemoteSync must be used within a RemoteSyncProvider');
    }
    return context;
};
