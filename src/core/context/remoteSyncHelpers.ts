/**
 * Pure helper functions extracted from RemoteSyncContext for testability.
 * These handle aggregate computation, video log merging, bucket math, and delta diffing.
 */
import { formatDateLocal } from '../../shared/utils/date';
import { Subject, StudySession } from '../../shared/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AggregateBucketEntry {
  overall: number;
  physics: number;
  chemistry: number;
  maths: number;
}

export type AggregateBucketMap = Record<string, AggregateBucketEntry>;

export interface VideoWatchEntry {
  video_id?: string;
  video_name?: string;
  subject?: Subject | string;
  watched_seconds?: number;
  watched_date?: string;
}

export interface StudySessionLogEntry {
  id: string;
  user_id: string;
  client_id: string;
  session_id: string;
  action: 'INSERT' | 'DELETE';
  payload: StudySession | null;
  created_at: string;
}

export interface UserStudyAggregateRow {
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

// ─── Date key helpers ───────────────────────────────────────────────────────

/**
 * Returns the ISO 8601 week key (YYYY-Www) for a local calendar date string
 * (YYYY-MM-DD). Using the date string directly avoids local-vs-UTC field
 * confusion that arises when passing a Date object parsed from a UTC ISO
 * timestamp.
 */
export function getWeekKey(localDateStr: string): string {
  const [year, month, day] = localDateStr.split('-').map(Number);
  // Construct a UTC midnight for the given local calendar date so that
  // ISO week arithmetic is performed in a stable, timezone-neutral way.
  const tmp = new Date(Date.UTC(year, month - 1, day));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns the month key (YYYY-MM) for a local calendar date string (YYYY-MM-DD).
 * Slicing the string is always correct and never misreads due to UTC offsets.
 */
export function getMonthKey(localDateStr: string): string {
  // YYYY-MM-DD → first 7 chars are YYYY-MM
  return localDateStr.slice(0, 7);
}

// ─── Bucket operations ─────────────────────────────────────────────────────

export function buildBucketEntry(partial?: Partial<AggregateBucketEntry>): AggregateBucketEntry {
  return {
    overall: partial?.overall ?? 0,
    physics: partial?.physics ?? 0,
    chemistry: partial?.chemistry ?? 0,
    maths: partial?.maths ?? 0,
  };
}

export function addToBucket(
  map: AggregateBucketMap,
  key: string,
  subject: Subject | undefined,
  seconds: number
) {
  const current = buildBucketEntry(map[key]);
  current.overall += seconds;
  if (subject === 'physics') current.physics += seconds;
  if (subject === 'chemistry') current.chemistry += seconds;
  if (subject === 'maths') current.maths += seconds;
  map[key] = current;
}

// ─── Aggregate computation ──────────────────────────────────────────────────

export function computeLocalStudyAggregate(studySessions: StudySession[]) {
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

    const localDate = session.localDate ?? formatDateLocal(date);
    // Derive the bucket key Date from the stored localDate when available.
    // This guarantees that daily, weekly, and monthly buckets all use the
    // same calendar date, even if session.startTime is a UTC ISO string
    // that crosses a date boundary relative to the local timezone.
    const bucketDate = session.localDate
      ? new Date(`${session.localDate}T00:00:00`) // local midnight — safe for week/month key derivation
      : date;
    addToBucket(bucketsDaily, localDate, session.subject, seconds);
    addToBucket(bucketsWeekly, getWeekKey(localDate), session.subject, seconds);
    addToBucket(bucketsMonthly, getMonthKey(localDate), session.subject, seconds);
    // bucketDate is intentionally computed but only used as a guard to make
    // the fallback path explicit. The key functions now accept strings.
    void bucketDate;
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

// ─── Subject / timestamp normalization ──────────────────────────────────────

export function normalizeSubject(raw: unknown): Subject | undefined {
  if (raw !== 'physics' && raw !== 'chemistry' && raw !== 'maths') return undefined;
  return raw;
}

export function toVideoSessionTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  // If the value already has a time component, normalise to UTC ISO.
  if (value.includes('T')) return parsed.toISOString();
  // Date-only string (e.g. "2026-03-11" from YouTube Analytics):
  // Use UTC midnight so the result is timezone-neutral. An arbitrary
  // local time like T09:00:00 was incorrect — it would vary by device
  // timezone and could produce same-millisecond IDs for same-day videos.
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

// ─── Video log → session merge ──────────────────────────────────────────────

export function mergeRemoteVideoLogsIntoSessions(
  existingSessions: StudySession[],
  videoLogs: VideoWatchEntry[]
) {
  if (!videoLogs.length) {
    return { sessions: existingSessions, changed: false };
  }

  const byVideoId = new Map<string, VideoWatchEntry>();
  videoLogs.forEach((entry) => {
    const videoId = entry.video_id?.trim();
    if (!videoId) return;
    const nextSeconds = Math.max(0, Math.floor(entry.watched_seconds || 0));
    if (nextSeconds <= 0) return;

    const current = byVideoId.get(videoId);
    const currentSeconds = Math.max(0, Math.floor(current?.watched_seconds || 0));
    if (!current || nextSeconds >= currentSeconds) {
      byVideoId.set(videoId, entry);
    }
  });

  if (byVideoId.size === 0) {
    return { sessions: existingSessions, changed: false };
  }

  const accumulatedByVideoId = new Map<string, number>();
  existingSessions.forEach((session) => {
    const videoId = session.sourceVideoId?.trim();
    if (!videoId) return;
    const running = accumulatedByVideoId.get(videoId) ?? 0;
    accumulatedByVideoId.set(videoId, running + Math.max(0, Math.floor(session.duration || 0)));
  });

  const appendedSessions: StudySession[] = [];
  byVideoId.forEach((entry, videoId) => {
    const totalRemoteSeconds = Math.max(0, Math.floor(entry.watched_seconds || 0));
    const alreadyImportedSeconds = accumulatedByVideoId.get(videoId) ?? 0;
    const deltaSeconds = totalRemoteSeconds - alreadyImportedSeconds;
    // Require at least a 5-second difference to trigger a sync update and prevent float churn
    if (deltaSeconds <= 5) return;

    const startTime = toVideoSessionTimestamp(entry.watched_date);
    if (!startTime) return;

    const subject = normalizeSubject(entry.subject);
    const title = (entry.video_name || '').trim() || 'Video Session';
    const endTime = new Date(new Date(startTime).getTime() + deltaSeconds * 1000).toISOString();

    appendedSessions.push({
      id: `remote-video-${videoId}-${totalRemoteSeconds}`,
      title,
      subject,
      type: subject ? 'chapter' : 'custom',
      startTime,
      endTime,
      duration: deltaSeconds,
      timerMode: 'video',
      sourceVideoId: videoId,
    });
  });

  if (appendedSessions.length === 0) {
    return { sessions: existingSessions, changed: false };
  }

  const mergedSessions = [...existingSessions, ...appendedSessions];
  return { sessions: mergedSessions, changed: true };
}

// ─── Delta diffing ──────────────────────────────────────────────────────────

export function computeSessionDelta(
  prevSessions: StudySession[],
  currSessions: StudySession[],
  clientId: string
): Omit<StudySessionLogEntry, 'id' | 'created_at' | 'user_id'>[] {
  const prevMap = new Map(prevSessions.map((s) => [s.id, s]));
  const currMap = new Map(currSessions.map((s) => [s.id, s]));

  const pending: Omit<StudySessionLogEntry, 'id' | 'created_at' | 'user_id'>[] = [];

  currMap.forEach((session, id) => {
    const prevSession = prevMap.get(id);
    if (!prevSession || JSON.stringify(prevSession) !== JSON.stringify(session)) {
      pending.push({ client_id: clientId, session_id: id, action: 'INSERT', payload: session });
    }
  });

  prevMap.forEach((_, id) => {
    if (!currMap.has(id)) {
      pending.push({ client_id: clientId, session_id: id, action: 'DELETE', payload: null });
    }
  });

  return pending;
}

// ─── Delta log application ──────────────────────────────────────────────────

export function applyDeltaLogs(
  currentSessions: StudySession[],
  logs: StudySessionLogEntry[],
  ownClientId: string
): { sessions: StudySession[]; changed: boolean } {
  let changed = false;
  const sessions = [...currentSessions];

  logs.forEach((log) => {
    if (log.client_id === ownClientId) return;

    if (log.action === 'INSERT' && log.payload) {
      const existingIdx = sessions.findIndex((s) => s.id === log.session_id);
      if (existingIdx >= 0) {
        sessions[existingIdx] = log.payload;
      } else {
        sessions.push(log.payload);
      }
      changed = true;
    } else if (log.action === 'DELETE') {
      const existingIdx = sessions.findIndex((s) => s.id === log.session_id);
      if (existingIdx >= 0) {
        sessions.splice(existingIdx, 1);
        changed = true;
      }
    }
  });

  return { sessions, changed };
}
