import {
  AppProgress,
  ExamEntry,
  MockExamPreset,
  MockScore,
  PlannerTask,
  Subject,
} from '../../shared/types';
import { SyncPayloadV1, SyncTombstone, SyncTombstoneMap } from './syncTypes';

export type SyncDomain =
  | 'progress'
  | 'plannerTasks'
  | 'mockScores'
  | 'examDates'
  | 'settings'
  | 'subjects';

interface MergeOptions {
  hasLocalUnsyncedEdit: (domain: SyncDomain) => boolean;
}

const TOMBSTONE_RETENTION_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

function getItemTimestamp(item: any, fallbackTime?: string): number {
  if (item && typeof item === 'object') {
    if (item.updatedAt) {
      const t = Date.parse(item.updatedAt);
      if (!Number.isNaN(t)) return t;
    }
    if (item.lastRevised) {
      const t = Date.parse(item.lastRevised);
      if (!Number.isNaN(t)) return t;
    }
    if (item.lastAttempted) {
      const t = Date.parse(item.lastAttempted);
      if (!Number.isNaN(t)) return t;
    }
    if (item.date && typeof item.date === 'string') {
      const timeStr = item.time && typeof item.time === 'string' ? item.time : '00:00';
      const t = Date.parse(`${item.date}T${timeStr}:00.000Z`);
      if (!Number.isNaN(t)) return t;
    }
  }
  if (fallbackTime) {
    const t = Date.parse(fallbackTime);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

function mergeItemList<T extends { id: string }>(
  localItems: T[] = [],
  remoteItems: T[] = [],
  localTombstones: SyncTombstone[] = [],
  remoteTombstones: SyncTombstone[] = [],
  fallbackLocalTime?: string,
  fallbackRemoteTime?: string,
  preferLocalTie = false
): { mergedItems: T[]; mergedTombstones: SyncTombstone[] } {
  // 1. Combine tombstones by item ID, taking the newest deletedAt timestamp
  const tombstoneMap: Record<string, SyncTombstone> = {};
  for (const t of [...localTombstones, ...remoteTombstones]) {
    if (!t.id || !t.deletedAt) continue;
    const existing = tombstoneMap[t.id];
    if (!existing || Date.parse(t.deletedAt) > Date.parse(existing.deletedAt)) {
      tombstoneMap[t.id] = t;
    }
  }

  // 2. Map all items by ID
  const itemMap: Record<string, { local?: T; remote?: T }> = {};
  for (const item of localItems) {
    if (item?.id) {
      itemMap[item.id] = { ...itemMap[item.id], local: item };
    }
  }
  for (const item of remoteItems) {
    if (item?.id) {
      itemMap[item.id] = { ...itemMap[item.id], remote: item };
    }
  }

  const mergedItems: T[] = [];
  for (const [id, entry] of Object.entries(itemMap)) {
    let winner: T;
    let winnerTime = 0;

    if (entry.local && entry.remote) {
      const localTime = getItemTimestamp(entry.local, fallbackLocalTime);
      const remoteTime = getItemTimestamp(entry.remote, fallbackRemoteTime);
      if (localTime > remoteTime || (localTime === remoteTime && preferLocalTie)) {
        winner = entry.local;
        winnerTime = localTime;
      } else {
        winner = entry.remote;
        winnerTime = remoteTime;
      }
    } else if (entry.local) {
      winner = entry.local;
      winnerTime = getItemTimestamp(entry.local, fallbackLocalTime);
    } else {
      winner = entry.remote!;
      winnerTime = getItemTimestamp(entry.remote, fallbackRemoteTime);
    }

    // Check tombstone vs winner timestamp
    const tombstone = tombstoneMap[id];
    if (tombstone) {
      const deletedTime = Date.parse(tombstone.deletedAt);
      if (!Number.isNaN(deletedTime) && deletedTime > winnerTime) {
        // Tombstone wins -> item remains deleted
        continue;
      } else {
        // Item was modified/created AFTER tombstone -> item wins, discard tombstone
        delete tombstoneMap[id];
      }
    }

    mergedItems.push(winner);
  }

  // 3. Prune tombstones older than retention threshold
  const nowMs = Date.now();
  const prunedTombstones = Object.values(tombstoneMap).filter((t) => {
    const deletedTime = Date.parse(t.deletedAt);
    if (Number.isNaN(deletedTime)) return false;
    return nowMs - deletedTime <= TOMBSTONE_RETENTION_MS;
  });

  return { mergedItems, mergedTombstones: prunedTombstones };
}

function mergeProgress(
  localProgress: AppProgress = { physics: {}, chemistry: {}, maths: {}, biology: {} },
  remoteProgress: AppProgress = { physics: {}, chemistry: {}, maths: {}, biology: {} },
  fallbackLocalTime?: string,
  fallbackRemoteTime?: string,
  preferLocalTie = false
): AppProgress {
  const subjects: Subject[] = ['physics', 'chemistry', 'maths', 'biology'];
  const merged: AppProgress = {
    physics: {},
    chemistry: {},
    maths: {},
    biology: {},
  };

  for (const subject of subjects) {
    const localSubject = localProgress[subject] || {};
    const remoteSubject = remoteProgress[subject] || {};
    const allSerials = new Set([...Object.keys(localSubject), ...Object.keys(remoteSubject)]);

    for (const serialStr of allSerials) {
      const serial = Number(serialStr);
      const localCh = localSubject[serial];
      const remoteCh = remoteSubject[serial];

      if (localCh && remoteCh) {
        const localTime = getItemTimestamp(localCh, fallbackLocalTime);
        const remoteTime = getItemTimestamp(remoteCh, fallbackRemoteTime);
        if (localTime > remoteTime || (localTime === remoteTime && preferLocalTie)) {
          merged[subject]![serial] = localCh;
        } else {
          merged[subject]![serial] = remoteCh;
        }
      } else if (localCh) {
        merged[subject]![serial] = localCh;
      } else if (remoteCh) {
        merged[subject]![serial] = remoteCh;
      }
    }
  }

  return merged;
}

export function mergePayloadDomainsWithPolicy(
  localPayload: SyncPayloadV1,
  remotePayload: SyncPayloadV1,
  options: MergeOptions
): SyncPayloadV1 {
  const fallbackLocalTime = localPayload.generatedAt;
  const fallbackRemoteTime = remotePayload.generatedAt;

  // 1. Progress domain (per-chapter union + LWW)
  const mergedProgress = mergeProgress(
    localPayload.domains.progress,
    remotePayload.domains.progress,
    fallbackLocalTime,
    fallbackRemoteTime,
    options.hasLocalUnsyncedEdit('progress')
  );

  // 2. List domains
  const tasksResult = mergeItemList<PlannerTask>(
    localPayload.domains.plannerTasks,
    remotePayload.domains.plannerTasks,
    localPayload.domains.tombstones?.plannerTasks,
    remotePayload.domains.tombstones?.plannerTasks,
    fallbackLocalTime,
    fallbackRemoteTime,
    options.hasLocalUnsyncedEdit('plannerTasks')
  );
  tasksResult.mergedItems.sort((a, b) => {
    const d = (a.date || '').localeCompare(b.date || '');
    if (d !== 0) return d;
    return (a.time || '').localeCompare(b.time || '');
  });

  const scoresResult = mergeItemList<MockScore>(
    localPayload.domains.mockScores,
    remotePayload.domains.mockScores,
    localPayload.domains.tombstones?.mockScores,
    remotePayload.domains.tombstones?.mockScores,
    fallbackLocalTime,
    fallbackRemoteTime,
    options.hasLocalUnsyncedEdit('mockScores')
  );
  scoresResult.mergedItems.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const examsResult = mergeItemList<ExamEntry>(
    localPayload.domains.examDates,
    remotePayload.domains.examDates,
    localPayload.domains.tombstones?.examDates,
    remotePayload.domains.tombstones?.examDates,
    fallbackLocalTime,
    fallbackRemoteTime,
    options.hasLocalUnsyncedEdit('examDates')
  );
  examsResult.mergedItems.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  // Ensure at most one primary exam (pick newest modified or first)
  const primaryExams = examsResult.mergedItems.filter((e) => e.isPrimary);
  if (primaryExams.length > 1) {
    let newestPrimary = primaryExams[0];
    let newestTime = getItemTimestamp(newestPrimary);
    for (let i = 1; i < primaryExams.length; i += 1) {
      const t = getItemTimestamp(primaryExams[i]);
      if (t > newestTime) {
        newestPrimary = primaryExams[i];
        newestTime = t;
      }
    }
    for (const exam of examsResult.mergedItems) {
      exam.isPrimary = exam.id === newestPrimary.id;
    }
  }

  const presetsResult = mergeItemList<MockExamPreset>(
    localPayload.domains.settings.mockExamPresets || [],
    remotePayload.domains.settings.mockExamPresets || [],
    localPayload.domains.tombstones?.mockExamPresets,
    remotePayload.domains.tombstones?.mockExamPresets,
    fallbackLocalTime,
    fallbackRemoteTime,
    options.hasLocalUnsyncedEdit('settings')
  );

  // 3. Settings singleton (excluding mockExamPresets)
  const localSettingsTime = localPayload.domains.modifiedAt?.settings
    ? Date.parse(localPayload.domains.modifiedAt.settings)
    : 0;
  const remoteSettingsTime = remotePayload.domains.modifiedAt?.settings
    ? Date.parse(remotePayload.domains.modifiedAt.settings)
    : 0;
  const preferLocalSettings = options.hasLocalUnsyncedEdit('settings');
  const useLocalSettings =
    localSettingsTime > remoteSettingsTime ||
    (localSettingsTime === remoteSettingsTime && preferLocalSettings) ||
    (!remotePayload.domains.settings && Boolean(localPayload.domains.settings));

  const winningSettingsBase = useLocalSettings
    ? localPayload.domains.settings
    : remotePayload.domains.settings;

  const mergedSettings = {
    ...winningSettingsBase,
    mockExamPresets: presetsResult.mergedItems,
  };

  // 4. Subjects singleton
  let mergedSubjects = remotePayload.domains.subjects;
  let winningSubjectsTimeStr = remotePayload.domains.modifiedAt?.subjects;
  if (localPayload.domains.subjects && remotePayload.domains.subjects) {
    const localSubTime = localPayload.domains.modifiedAt?.subjects
      ? Date.parse(localPayload.domains.modifiedAt.subjects)
      : 0;
    const remoteSubTime = remotePayload.domains.modifiedAt?.subjects
      ? Date.parse(remotePayload.domains.modifiedAt.subjects)
      : 0;
    const preferLocalSubjects = options.hasLocalUnsyncedEdit('subjects');
    if (localSubTime > remoteSubTime || (localSubTime === remoteSubTime && preferLocalSubjects)) {
      mergedSubjects = localPayload.domains.subjects;
      winningSubjectsTimeStr = localPayload.domains.modifiedAt?.subjects;
    }
  } else if (localPayload.domains.subjects) {
    mergedSubjects = localPayload.domains.subjects;
    winningSubjectsTimeStr = localPayload.domains.modifiedAt?.subjects;
  }

  // Collect tombstones and modifiedAt
  const mergedTombstones: SyncTombstoneMap = {};
  if (tasksResult.mergedTombstones.length > 0)
    mergedTombstones.plannerTasks = tasksResult.mergedTombstones;
  if (scoresResult.mergedTombstones.length > 0)
    mergedTombstones.mockScores = scoresResult.mergedTombstones;
  if (examsResult.mergedTombstones.length > 0)
    mergedTombstones.examDates = examsResult.mergedTombstones;
  if (presetsResult.mergedTombstones.length > 0)
    mergedTombstones.mockExamPresets = presetsResult.mergedTombstones;

  const mergedModifiedAt: { settings?: string; subjects?: string } = {};
  const winningSettingsTimeStr = useLocalSettings
    ? localPayload.domains.modifiedAt?.settings
    : remotePayload.domains.modifiedAt?.settings;
  if (winningSettingsTimeStr) mergedModifiedAt.settings = winningSettingsTimeStr;
  if (winningSubjectsTimeStr) mergedModifiedAt.subjects = winningSubjectsTimeStr;

  const merged: SyncPayloadV1 = {
    ...remotePayload,
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    domains: {
      progress: mergedProgress,
      plannerTasks: tasksResult.mergedItems,
      mockScores: scoresResult.mergedItems,
      examDates: examsResult.mergedItems,
      settings: mergedSettings,
      subjects: mergedSubjects,
    },
  };

  if (Object.keys(mergedTombstones).length > 0) {
    merged.domains.tombstones = mergedTombstones;
  }
  if (Object.keys(mergedModifiedAt).length > 0) {
    merged.domains.modifiedAt = mergedModifiedAt;
  }
  if (!merged.domains.subjects) {
    delete merged.domains.subjects;
  }

  return merged;
}
