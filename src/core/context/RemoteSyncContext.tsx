import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRemoteAuth } from './RemoteAuthContext';
import { useUserProgress } from './UserProgressContext';
import { useSubjectData } from './SubjectDataContext';
import { supabase } from '../../shared/lib/supabase';
import { buildSyncPayload } from '../../features/sync/syncPayload';
import { SYNC_DEFAULT_PLANNER_HISTORY_DAYS, SyncPayloadV1, SyncStorageMode } from '../../features/sync/syncTypes';
import { computeChecksum, decompressSyncPayload, encodeSyncPayload, reconstructCompressedPayload } from '../../features/sync/syncCodec';
import { formatDateLocal } from '../../shared/utils/date';
import { Subject, StudySession } from '../../shared/types';

type SyncDomain = 'progress' | 'plannerTasks' | 'mockScores' | 'examDates' | 'settings' | 'subjects';
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

interface AggregateBucketEntry {
    overall: number;
    physics: number;
    chemistry: number;
    maths: number;
}

type AggregateBucketMap = Record<string, AggregateBucketEntry>;

interface VideoWatchEntry {
    video_id?: string;
    video_name?: string;
    subject?: Subject;
    watched_seconds?: number;
    watched_date?: string;
}

interface UserStudyAggregateRow {
    user_id: string;
    total_seconds_overall: number;
    total_seconds_physics: number;
    total_seconds_chemistry: number;
    total_seconds_maths: number;
    buckets_daily_json: AggregateBucketMap;
    buckets_weekly_json: AggregateBucketMap;
    buckets_monthly_json: AggregateBucketMap;
    video_watch_45d_json: VideoWatchEntry[];
    updated_at: string;
}

const REMOTE_SYNC_META_PREFIX = 'ojeet-remote-sync-';
const LAST_SUCCESSFUL_PUSH_AT_KEY = `${REMOTE_SYNC_META_PREFIX}last-successful-push-at`;
const LAST_SYNCED_AT_KEY = `${REMOTE_SYNC_META_PREFIX}last-synced-at`;
const DOMAIN_EDITED_AT_PREFIX = `${REMOTE_SYNC_META_PREFIX}domain-edited-at-`;
const SYNC_BATCH_INTERVAL_MS = 30_000;
const SYNC_RETRY_BASE_MS = 5_000;
const SYNC_RETRY_MAX_MS = 300_000;

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

function getWeekKey(date: Date) {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getMonthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildBucketEntry(partial?: Partial<AggregateBucketEntry>): AggregateBucketEntry {
    return {
        overall: partial?.overall ?? 0,
        physics: partial?.physics ?? 0,
        chemistry: partial?.chemistry ?? 0,
        maths: partial?.maths ?? 0,
    };
}

function mergeBucketMaps(existing: AggregateBucketMap, incoming: AggregateBucketMap): AggregateBucketMap {
    const merged: AggregateBucketMap = { ...existing };
    Object.entries(incoming).forEach(([key, value]) => {
        const current = buildBucketEntry(merged[key]);
        const next = buildBucketEntry(value);
        merged[key] = {
            overall: Math.max(current.overall, next.overall),
            physics: Math.max(current.physics, next.physics),
            chemistry: Math.max(current.chemistry, next.chemistry),
            maths: Math.max(current.maths, next.maths),
        };
    });
    return merged;
}

function addToBucket(map: AggregateBucketMap, key: string, subject: Subject | undefined, seconds: number) {
    const current = buildBucketEntry(map[key]);
    current.overall += seconds;
    if (subject === 'physics') current.physics += seconds;
    if (subject === 'chemistry') current.chemistry += seconds;
    if (subject === 'maths') current.maths += seconds;
    map[key] = current;
}

function computeLocalStudyAggregate(studySessions: StudySession[]) {
    const bucketsDaily: AggregateBucketMap = {};
    const bucketsWeekly: AggregateBucketMap = {};
    const bucketsMonthly: AggregateBucketMap = {};

    let totalOverall = 0;
    let totalPhysics = 0;
    let totalChemistry = 0;
    let totalMaths = 0;

    studySessions.forEach((session) => {
        const seconds = Math.max(0, Math.floor(session.duration || 0));
        if (seconds <= 0) return;

        const date = new Date(session.startTime);
        if (Number.isNaN(date.getTime())) return;

        totalOverall += seconds;
        if (session.subject === 'physics') totalPhysics += seconds;
        if (session.subject === 'chemistry') totalChemistry += seconds;
        if (session.subject === 'maths') totalMaths += seconds;

        addToBucket(bucketsDaily, formatDateLocal(date), session.subject, seconds);
        addToBucket(bucketsWeekly, getWeekKey(date), session.subject, seconds);
        addToBucket(bucketsMonthly, getMonthKey(date), session.subject, seconds);
    });

    return {
        total_seconds_overall: totalOverall,
        total_seconds_physics: totalPhysics,
        total_seconds_chemistry: totalChemistry,
        total_seconds_maths: totalMaths,
        buckets_daily_json: bucketsDaily,
        buckets_weekly_json: bucketsWeekly,
        buckets_monthly_json: bucketsMonthly,
    };
}

function mergeVideoWatchIntoAggregate(base: ReturnType<typeof computeLocalStudyAggregate>, videoLogs: VideoWatchEntry[]) {
    const merged = {
        ...base,
        buckets_daily_json: { ...base.buckets_daily_json },
        buckets_weekly_json: { ...base.buckets_weekly_json },
        buckets_monthly_json: { ...base.buckets_monthly_json },
    };

    videoLogs.forEach((entry) => {
        if (!entry || !entry.watched_date) return;
        const seconds = Math.max(0, Math.floor(entry.watched_seconds || 0));
        if (seconds <= 0) return;

        const parsedDate = new Date(entry.watched_date);
        if (Number.isNaN(parsedDate.getTime())) return;

        const subject = entry.subject;
        if (subject !== 'physics' && subject !== 'chemistry' && subject !== 'maths') return;

        merged.total_seconds_overall += seconds;
        if (subject === 'physics') merged.total_seconds_physics += seconds;
        if (subject === 'chemistry') merged.total_seconds_chemistry += seconds;
        if (subject === 'maths') merged.total_seconds_maths += seconds;

        addToBucket(merged.buckets_daily_json, entry.watched_date, subject, seconds);
        addToBucket(merged.buckets_weekly_json, getWeekKey(parsedDate), subject, seconds);
        addToBucket(merged.buckets_monthly_json, getMonthKey(parsedDate), subject, seconds);
    });

    return merged;
}

function createLocalPayload(params: {
    progress: ReturnType<typeof useUserProgress>['progress'];
    plannerTasks: ReturnType<typeof useUserProgress>['plannerTasks'];
    mockScores: ReturnType<typeof useUserProgress>['mockScores'];
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
        subjects: {
            subjectData: params.subjectData,
            customColumns: params.customColumns,
            excludedColumns: params.excludedColumns,
            materialOrder: params.materialOrder,
        },
    });
}

function mergePayloadDomains(localPayload: SyncPayloadV1, remotePayload: SyncPayloadV1) {
    const merged: SyncPayloadV1 = {
        ...remotePayload,
        domains: {
            ...remotePayload.domains,
            settings: {
                ...remotePayload.domains.settings,
            },
        },
    };

    const useLocalForDomain = (domain: SyncDomain) => hasLocalUnsyncedEdit(domain);

    merged.domains.progress = useLocalForDomain('progress') || !remotePayload.domains.progress ? localPayload.domains.progress : remotePayload.domains.progress;
    merged.domains.plannerTasks = useLocalForDomain('plannerTasks') || !remotePayload.domains.plannerTasks ? localPayload.domains.plannerTasks : remotePayload.domains.plannerTasks;
    merged.domains.mockScores = useLocalForDomain('mockScores') || !remotePayload.domains.mockScores ? localPayload.domains.mockScores : remotePayload.domains.mockScores;
    merged.domains.examDates = useLocalForDomain('examDates') || !remotePayload.domains.examDates ? localPayload.domains.examDates : remotePayload.domains.examDates;
    merged.domains.settings = useLocalForDomain('settings') || !remotePayload.domains.settings ? localPayload.domains.settings : remotePayload.domains.settings;
    merged.domains.subjects = useLocalForDomain('subjects') || !remotePayload.domains.subjects ? localPayload.domains.subjects : remotePayload.domains.subjects;

    return merged;
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
        progress, setProgress, plannerTasks, setPlannerTasks, studySessions, mockScores, setMockScores,
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
    const domainSnapshotsRef = useRef<Record<SyncDomain, string | null>>({
        progress: null,
        plannerTasks: null,
        mockScores: null,
        examDates: null,
        settings: null,
        subjects: null,
    });
    const studySessionsSnapshotRef = useRef<string | null>(null);

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
                examDates,
                disableAutoShift,
                progressCardSettings,
                subjectData,
                customColumns,
                excludedColumns,
                materialOrder,
            });

            const { payload: remotePayload, row } = await fetchRemotePayload(user.id);
            const remoteAggregate = await fetchRemoteStudyAggregate(user.id);
            setRemoteStudyAggregate(remoteAggregate);
            const mergedPayload = remotePayload ? mergePayloadDomains(localPayload, remotePayload) : localPayload;
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

                    const { error: pruneError } = await supabase.rpc('prune_stale_sync_chunks', {
                        target_user_id: user.id,
                        keep_payload_version: nextPayloadVersion,
                    });
                    if (pruneError) {
                        const { error: fallbackDeleteError } = await supabase
                            .from('user_sync_chunks')
                            .delete()
                            .eq('user_id', user.id)
                            .neq('payload_version', nextPayloadVersion);
                        if (fallbackDeleteError) throw new Error(fallbackDeleteError.message);
                    }
                } else {
                    const { error: cleanupError } = await supabase
                        .from('user_sync_chunks')
                        .delete()
                        .eq('user_id', user.id);
                    if (cleanupError) throw new Error(cleanupError.message);
                }
            }

            const localAggregate = computeLocalStudyAggregate(studySessions);
            const videoLogs = remoteAggregate?.video_watch_45d_json ?? [];
            const localPlusVideoAggregate = mergeVideoWatchIntoAggregate(localAggregate, videoLogs);

            const mergedAggregateRow = {
                user_id: user.id,
                total_seconds_overall: Math.max(localPlusVideoAggregate.total_seconds_overall, remoteAggregate?.total_seconds_overall ?? 0),
                total_seconds_physics: Math.max(localPlusVideoAggregate.total_seconds_physics, remoteAggregate?.total_seconds_physics ?? 0),
                total_seconds_chemistry: Math.max(localPlusVideoAggregate.total_seconds_chemistry, remoteAggregate?.total_seconds_chemistry ?? 0),
                total_seconds_maths: Math.max(localPlusVideoAggregate.total_seconds_maths, remoteAggregate?.total_seconds_maths ?? 0),
                buckets_daily_json: mergeBucketMaps(remoteAggregate?.buckets_daily_json ?? {}, localPlusVideoAggregate.buckets_daily_json),
                buckets_weekly_json: mergeBucketMaps(remoteAggregate?.buckets_weekly_json ?? {}, localPlusVideoAggregate.buckets_weekly_json),
                buckets_monthly_json: mergeBucketMaps(remoteAggregate?.buckets_monthly_json ?? {}, localPlusVideoAggregate.buckets_monthly_json),
                video_watch_45d_json: videoLogs,
            };

            const { data: aggregateUpsertData, error: aggregateError } = await supabase
                .from('user_study_aggregate')
                .upsert(mergedAggregateRow, { onConflict: 'user_id' })
                .select('*')
                .maybeSingle<UserStudyAggregateRow>();

            if (aggregateError) throw new Error(aggregateError.message);
            if (aggregateUpsertData) {
                setRemoteStudyAggregate(aggregateUpsertData);
            }

            const syncedAt = new Date().toISOString();
            markAllDomainsAsSynced(syncedAt);
            setLastSyncedAt(syncedAt);
            setStatus('synced');
            retryAttemptRef.current = 0;
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
        const serialized = JSON.stringify(studySessions);
        const previous = studySessionsSnapshotRef.current;
        studySessionsSnapshotRef.current = serialized;
        if (previous === null || previous === serialized) return;
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

    useEffect(() => {
        if (!user || !isConfigured) return;

        const handleFocusSync = () => {
            scheduleSync(0);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
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
