import { AppProgress, ExamEntry, MockScore, PlannerTask, ProgressCardSettings, Subject, SubjectData } from '../../shared/types';

export const SYNC_SCHEMA_VERSION = 1 as const;
export const SYNC_DEFAULT_PLANNER_HISTORY_DAYS = 60;
export const SYNC_MAX_COMPRESSED_BYTES = 512 * 1024;

export type SyncStorageMode = 'inline' | 'chunked';

export interface SyncedProgressCardSettings {
    userName: ProgressCardSettings['userName'];
    visibleStats: ProgressCardSettings['visibleStats'];
}

export interface SyncPayloadV1 {
    schemaVersion: typeof SYNC_SCHEMA_VERSION;
    generatedAt: string;
    appVersion?: string;
    domains: {
        progress: AppProgress;
        plannerTasks: PlannerTask[];
        mockScores: MockScore[];
        examDates: ExamEntry[];
        settings: {
            disableAutoShift: boolean;
            progressCardSettings: SyncedProgressCardSettings;
        };
        subjects?: {
            subjectData: Record<Subject, SubjectData | null>;
            customColumns: Record<Subject, string[]>;
            excludedColumns: Record<Subject, string[]>;
            materialOrder: Record<Subject, string[]>;
        };
    };
}

export interface SyncPayloadInput {
    progress: AppProgress;
    plannerTasks: PlannerTask[];
    mockScores: MockScore[];
    examDates: ExamEntry[];
    disableAutoShift: boolean;
    progressCardSettings: ProgressCardSettings;
    appVersion?: string;
    generatedAt?: string;
    now?: Date;
    plannerHistoryDays?: number;
    subjects?: {
        subjectData: Record<Subject, SubjectData | null>;
        customColumns: Record<Subject, string[]>;
        excludedColumns: Record<Subject, string[]>;
        materialOrder: Record<Subject, string[]>;
    };
}

export interface EncodedPayloadInline {
    storage: 'inline';
    compressed: string;
    compressedBytes: number;
    checksum: string;
    chunkCount: 0;
}

export interface EncodedPayloadChunked {
    storage: 'chunked';
    compressed: string;
    compressedBytes: number;
    checksum: string;
    chunkCount: number;
    chunks: string[];
}

export type EncodedPayload = EncodedPayloadInline | EncodedPayloadChunked;

export interface SyncChunkRow {
    chunk_index: number;
    chunk_data: string;
}
