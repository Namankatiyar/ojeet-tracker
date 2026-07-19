import {
  AppProgress,
  ExamEntry,
  MockScore,
  PlannerTask,
  ProgressCardSettings,
  Subject,
  SubjectData,
  MockExamPreset,
} from '../../shared/types';
import { type ExamMode } from '../../shared/config/subjects';

export const SYNC_SCHEMA_VERSION = 2 as const;
export const SYNC_DEFAULT_PLANNER_HISTORY_DAYS = 60;
export const SYNC_MAX_COMPRESSED_BYTES = 512 * 1024;

export type SyncStorageMode = 'inline' | 'chunked';

export interface SyncTombstone {
  id: string;
  deletedAt: string;
}

export interface SyncTombstoneMap {
  plannerTasks?: SyncTombstone[];
  mockScores?: SyncTombstone[];
  examDates?: SyncTombstone[];
  mockExamPresets?: SyncTombstone[];
}

export interface SyncedProgressCardSettings {
  userName?: ProgressCardSettings['userName'];
  visibleStats: ProgressCardSettings['visibleStats'];
  showTasks?: ProgressCardSettings['showTasks'];
  customAvatarUrl?: ProgressCardSettings['customAvatarUrl'];
  bannerUrl?: ProgressCardSettings['bannerUrl'];
  customStatus?: ProgressCardSettings['customStatus'];
  gradeStatus?: ProgressCardSettings['gradeStatus'];
  targetExam?: ProgressCardSettings['targetExam'];
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
      enableAIAgent?: boolean;
      enableMusicPlayer?: boolean;
      progressCardSettings: SyncedProgressCardSettings;
      mockExamPresets: MockExamPreset[];
      examMode?: ExamMode;
      neetMockExamPresets?: MockExamPreset[];
    };
    subjects?: {
      subjectData: Record<Subject, SubjectData | null>;
      customColumns: Record<Subject, string[]>;
      excludedColumns: Record<Subject, string[]>;
      materialOrder: Record<Subject, string[]>;
    };
    tombstones?: SyncTombstoneMap;
    modifiedAt?: {
      settings?: string;
      subjects?: string;
    };
  };
}

export interface SyncPayloadInput {
  progress: AppProgress;
  plannerTasks: PlannerTask[];
  mockScores: MockScore[];
  examDates: ExamEntry[];
  disableAutoShift: boolean;
  enableAIAgent?: boolean;
  enableMusicPlayer?: boolean;
  progressCardSettings: ProgressCardSettings;
  mockExamPresets: MockExamPreset[];
  examMode?: ExamMode;
  neetMockExamPresets?: MockExamPreset[];
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
  tombstones?: SyncTombstoneMap;
  domainsModifiedAt?: {
    settings?: string;
    subjects?: string;
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
