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
import { buildSyncPayload } from './syncPayload';
import { SyncPayloadV1 } from './syncTypes';
import { defaultMockExamPresets } from '../../core/context/UserProgressContext';

export const SYNC_LOCAL_KEYS = {
  progress: 'jee-tracker-progress',
  plannerTasks: 'jee-tracker-planner-tasks',
  mockScores: 'jee-tracker-mock-scores',
  studySessions: 'jee-tracker-study-sessions',
  examDates: 'jee-exam-dates',
  disableAutoShift: 'jee-tracker-disable-auto-shift',
  enableAIAgent: 'jee-tracker-enable-ai-agent',
  enableMusicPlayer: 'jee-tracker-enable-music-player',
  progressCardSettings: 'jee-tracker-progress-card',
  mockExamPresets: 'jee-tracker-mock-presets',
  subjectData: 'jee-tracker-subject-data',
  customColumns: 'jee-tracker-custom-columns',
  excludedColumns: 'jee-tracker-excluded-columns',
  materialOrder: 'jee-tracker-material-order',
} as const;

const defaultProgress: AppProgress = {
  physics: {},
  chemistry: {},
  maths: {},
};

const defaultProgressCardSettings: ProgressCardSettings = {
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
  bannerUrl: '',
  customStatus: '',
  gradeStatus: 'Class 12',
  targetExam: 'JEE 2026',
  discordSpecialTag: '',
  inviteCode: '',
  showTasks: true,
};

const defaultSubjectDataRecord: Record<Subject, SubjectData | null> = {
  physics: null,
  chemistry: null,
  maths: null,
};

const defaultSubjectStringMap: Record<Subject, string[]> = {
  physics: [],
  chemistry: [],
  maths: [],
};

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function buildSyncPayloadFromLocalStorage(options?: {
  appVersion?: string;
  includeSubjects?: boolean;
  plannerHistoryDays?: number;
  now?: Date;
}): SyncPayloadV1 {
  const includeSubjects = options?.includeSubjects ?? true;

  return buildSyncPayload({
    progress: readJson<AppProgress>(SYNC_LOCAL_KEYS.progress, defaultProgress),
    plannerTasks: readJson<PlannerTask[]>(SYNC_LOCAL_KEYS.plannerTasks, []),
    mockScores: readJson<MockScore[]>(SYNC_LOCAL_KEYS.mockScores, []),
    examDates: readJson<ExamEntry[]>(SYNC_LOCAL_KEYS.examDates, []),
    disableAutoShift: readJson<boolean>(SYNC_LOCAL_KEYS.disableAutoShift, false),
    enableAIAgent: readJson<boolean>(SYNC_LOCAL_KEYS.enableAIAgent, true),
    enableMusicPlayer: readJson<boolean>(SYNC_LOCAL_KEYS.enableMusicPlayer, true),
    progressCardSettings: readJson<ProgressCardSettings>(
      SYNC_LOCAL_KEYS.progressCardSettings,
      defaultProgressCardSettings
    ),
    mockExamPresets: readJson<MockExamPreset[]>(
      SYNC_LOCAL_KEYS.mockExamPresets,
      defaultMockExamPresets
    ),
    appVersion: options?.appVersion,
    plannerHistoryDays: options?.plannerHistoryDays,
    now: options?.now,
    subjects: includeSubjects
      ? {
          subjectData: readJson<Record<Subject, SubjectData | null>>(
            SYNC_LOCAL_KEYS.subjectData,
            defaultSubjectDataRecord
          ),
          customColumns: readJson<Record<Subject, string[]>>(
            SYNC_LOCAL_KEYS.customColumns,
            defaultSubjectStringMap
          ),
          excludedColumns: readJson<Record<Subject, string[]>>(
            SYNC_LOCAL_KEYS.excludedColumns,
            defaultSubjectStringMap
          ),
          materialOrder: readJson<Record<Subject, string[]>>(
            SYNC_LOCAL_KEYS.materialOrder,
            defaultSubjectStringMap
          ),
        }
      : undefined,
  });
}
