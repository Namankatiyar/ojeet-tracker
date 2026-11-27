import { Chapter, Subject, SubjectData } from '../../shared/types';
import { formatDateLocal } from '../../shared/utils/date';
import { BUNDLED_SUBJECT_DATA, getBundledSubjectData } from '../../shared/utils/syllabusData';
import {
  SubjectDataDelta,
  SyncedSubjectDataEntry,
  SyncPayloadInput,
  SyncPayloadV1,
  SYNC_DEFAULT_PLANNER_HISTORY_DAYS,
  SYNC_SCHEMA_VERSION,
  SyncedProgressCardSettings,
} from './syncTypes';

const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ALL_SUBJECTS: readonly Subject[] = ['physics', 'chemistry', 'maths', 'biology'];

export { getBundledSubjectData };

function areStringArraysEqual(a: readonly string[] = [], b: readonly string[] = []): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function hasNonEmptySubjectStringMap(map?: Partial<Record<Subject, string[]>> | null): boolean {
  if (!map) return false;
  return Object.values(map).some((entries) => Array.isArray(entries) && entries.length > 0);
}

export function isSubjectDataDelta(
  entry: SyncedSubjectDataEntry | null | undefined
): entry is SubjectDataDelta {
  return Boolean(entry && typeof entry === 'object' && 'isDelta' in entry && entry.isDelta === true);
}

function areChaptersEqual(ch: Chapter, bCh: Chapter): boolean {
  if (ch.serial !== bCh.serial || ch.name !== bCh.name) return false;
  if (Boolean(ch.isCustom) !== Boolean(bCh.isCustom)) return false;
  if (!areStringArraysEqual(ch.materials, bCh.materials)) return false;
  if (!areStringArraysEqual(ch.subtopics, bCh.subtopics)) return false;
  return true;
}

/**
 * Fast structural check comparing a subject's SubjectData against the canonical bundled syllabus.
 */
export function isSubjectDataEqualToBundled(
  subject: Subject,
  data: SubjectData | null | undefined
): boolean {
  if (!data) return false;
  const bundled = BUNDLED_SUBJECT_DATA[subject];
  if (!bundled) return false;

  if (!areStringArraysEqual(data.materialNames, bundled.materialNames)) {
    return false;
  }

  if (!Array.isArray(data.chapters) || data.chapters.length !== bundled.chapters.length) {
    return false;
  }

  for (let i = 0; i < bundled.chapters.length; i += 1) {
    const ch = data.chapters[i];
    const bCh = bundled.chapters[i];
    if (!ch || !areChaptersEqual(ch, bCh)) return false;
  }

  return true;
}

/**
 * Hydrates a single subject entry (either a compact SubjectDataDelta or a legacy full SubjectData)
 * against the bundled syllabus defaults.
 */
export function hydrateSubjectDataEntry(
  subject: Subject,
  entry: SyncedSubjectDataEntry | null | undefined
): SubjectData {
  if (!entry) return getBundledSubjectData(subject);
  if (!isSubjectDataDelta(entry)) {
    return entry;
  }

  const base = getBundledSubjectData(subject);
  if (entry.materialNames) {
    base.materialNames = [...entry.materialNames];
  }
  if (entry.deletedChapterSerials && entry.deletedChapterSerials.length > 0) {
    const deletedSet = new Set(entry.deletedChapterSerials);
    base.chapters = base.chapters.filter((ch) => !deletedSet.has(ch.serial));
  }
  if (entry.upsertChapters && entry.upsertChapters.length > 0) {
    const indexBySerial = new Map(base.chapters.map((ch, idx) => [ch.serial, idx]));
    for (const ch of entry.upsertChapters) {
      const existingIdx = indexBySerial.get(ch.serial);
      if (existingIdx !== undefined) {
        base.chapters[existingIdx] = ch;
      } else {
        indexBySerial.set(ch.serial, base.chapters.length);
        base.chapters.push(ch);
      }
    }
  }
  return base;
}

/**
 * Returns only compact deltas for subjects whose SubjectData differs from the bundled syllabus defaults.
 * Unmodified and null/missing subjects are omitted to eliminate sync payload bloat.
 */
export function getCustomSubjectDataForSync(
  subjectData?: Partial<Record<Subject, SyncedSubjectDataEntry | null>> | null
): Partial<Record<Subject, SyncedSubjectDataEntry>> {
  const custom: Partial<Record<Subject, SyncedSubjectDataEntry>> = {};
  if (!subjectData) return custom;

  for (const subject of ALL_SUBJECTS) {
    const raw = subjectData[subject];
    if (!raw) continue;
    const data = isSubjectDataDelta(raw) ? hydrateSubjectDataEntry(subject, raw) : raw;
    if (isSubjectDataEqualToBundled(subject, data)) continue;

    const bundled = BUNDLED_SUBJECT_DATA[subject];
    const bundledMap = new Map(bundled.chapters.map((ch) => [ch.serial, ch]));
    const localMap = new Map(data.chapters.map((ch) => [ch.serial, ch]));

    const upsertChapters: Chapter[] = [];
    for (const ch of data.chapters) {
      const bCh = bundledMap.get(ch.serial);
      if (!bCh || !areChaptersEqual(ch, bCh)) {
        upsertChapters.push(ch);
      }
    }

    const deletedChapterSerials: number[] = [];
    for (const bCh of bundled.chapters) {
      if (!localMap.has(bCh.serial)) {
        deletedChapterSerials.push(bCh.serial);
      }
    }

    const delta: SubjectDataDelta = { isDelta: true };
    if (!areStringArraysEqual(data.materialNames, bundled.materialNames)) {
      delta.materialNames = [...data.materialNames];
    }
    if (upsertChapters.length > 0) {
      delta.upsertChapters = upsertChapters;
    }
    if (deletedChapterSerials.length > 0) {
      delta.deletedChapterSerials = deletedChapterSerials;
    }

    custom[subject] = delta;
  }

  return custom;
}

/**
 * Hydrates a sparse or omitted subjectData map (deltas or legacy full objects) with cloned bundled syllabus defaults.
 */
export function hydrateSubjectDataWithBundledDefaults(
  subjectData?: Partial<Record<Subject, SyncedSubjectDataEntry | null>> | null
): Record<Subject, SubjectData> {
  return {
    physics: hydrateSubjectDataEntry('physics', subjectData?.physics),
    chemistry: hydrateSubjectDataEntry('chemistry', subjectData?.chemistry),
    maths: hydrateSubjectDataEntry('maths', subjectData?.maths),
    biology: hydrateSubjectDataEntry('biology', subjectData?.biology),
  };
}

/**
 * Strips unmodified bundled subjectData and omits the entire subjects domain when
 * all 4 subjects match bundled defaults and customColumns/excludedColumns/materialOrder are empty.
 */
export function normalizeSubjectsForSync(
  subjects?: SyncPayloadInput['subjects'] | null
): SyncPayloadV1['domains']['subjects'] | undefined {
  if (!subjects) return undefined;

  const customSubjectData = getCustomSubjectDataForSync(subjects.subjectData);
  const hasCustomSubjectData = Object.keys(customSubjectData).length > 0;
  const hasCustomColumns = hasNonEmptySubjectStringMap(subjects.customColumns);
  const hasExcludedColumns = hasNonEmptySubjectStringMap(subjects.excludedColumns);
  const hasMaterialOrder = hasNonEmptySubjectStringMap(subjects.materialOrder);

  if (!hasCustomSubjectData && !hasCustomColumns && !hasExcludedColumns && !hasMaterialOrder) {
    return undefined;
  }

  return {
    // Runtime omits unmodified keys; cast keeps compatibility with SyncPayloadV1's Record shape.
    subjectData: customSubjectData as Record<Subject, SyncedSubjectDataEntry | null>,
    customColumns: subjects.customColumns,
    excludedColumns: subjects.excludedColumns,
    materialOrder: subjects.materialOrder,
  };
}

function clampPlannerHistoryDays(days?: number): number {
  if (typeof days !== 'number' || Number.isNaN(days)) return SYNC_DEFAULT_PLANNER_HISTORY_DAYS;
  if (days < 0) return 0;
  return Math.floor(days);
}

export function filterPlannerTasksForSync(
  tasks: SyncPayloadInput['plannerTasks'],
  now: Date,
  plannerHistoryDays = SYNC_DEFAULT_PLANNER_HISTORY_DAYS
) {
  const safeDays = clampPlannerHistoryDays(plannerHistoryDays);
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - safeDays);
  const cutoffDateString = formatDateLocal(cutoffDate);

  return tasks.filter((task) => {
    if (!YYYY_MM_DD_REGEX.test(task.date)) return true;
    // Lexical comparison is safe because format is YYYY-MM-DD.
    return task.date >= cutoffDateString;
  });
}

export function toSyncedProgressCardSettings(
  settings: SyncPayloadInput['progressCardSettings']
): SyncedProgressCardSettings {
  return {
    visibleStats: settings?.visibleStats ?? {
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
    showTasks: settings?.showTasks ?? true,
  };
}

export function buildSyncPayload(input: SyncPayloadInput): SyncPayloadV1 {
  const now = input.now ?? new Date();
  const generatedAt = input.generatedAt ?? now.toISOString();
  const plannerHistoryDays = clampPlannerHistoryDays(input.plannerHistoryDays);
  const normalizedSubjects = normalizeSubjectsForSync(input.subjects);

  const payload: SyncPayloadV1 = {
    schemaVersion: SYNC_SCHEMA_VERSION,
    generatedAt,
    appVersion: input.appVersion,
    domains: {
      progress: input.progress,
      plannerTasks: filterPlannerTasksForSync(input.plannerTasks, now, plannerHistoryDays),
      mockScores: input.mockScores,
      examDates: input.examDates,
      settings: {
        disableAutoShift: input.disableAutoShift,
        enableAIAgent: input.enableAIAgent,
        enableMusicPlayer: input.enableMusicPlayer,
        progressCardSettings: toSyncedProgressCardSettings(input.progressCardSettings),
        mockExamPresets: input.mockExamPresets || [],
        examMode: input.examMode,
        neetMockExamPresets: input.neetMockExamPresets,
      },
      subjects: normalizedSubjects,
      tombstones: input.tombstones,
      modifiedAt: input.domainsModifiedAt,
    },
  };

  if (!normalizedSubjects) {
    delete payload.domains.subjects;
  }
  if (!input.tombstones || Object.keys(input.tombstones).length === 0) {
    delete payload.domains.tombstones;
  }
  if (!input.domainsModifiedAt || Object.keys(input.domainsModifiedAt).length === 0) {
    delete payload.domains.modifiedAt;
  }

  return payload;
}
