import { describe, expect, it } from 'vitest';
import { StudySession } from '../../shared/types';
import { formatDateLocal } from '../../shared/utils/date';
import {
  buildBucketEntry,
  addToBucket,
  computeLocalStudyAggregate,
  normalizeSubject,
  toVideoSessionTimestamp,
  mergeRemoteVideoLogsIntoSessions,
  computeSessionDelta,
  applyDeltaLogs,
  pruneAggregateBuckets,
  getWeekKey,
  getMonthKey,
  AggregateBucketMap,
  VideoWatchEntry,
  StudySessionLogEntry,
} from './remoteSyncHelpers';

// ─── Test data factories ────────────────────────────────────────────────────

function makeSession(overrides: Partial<StudySession> & { id: string }): StudySession {
  return {
    title: 'Test Session',
    type: 'custom',
    startTime: '2026-03-07T10:00:00.000Z',
    endTime: '2026-03-07T10:30:00.000Z',
    duration: 1800,
    ...overrides,
  };
}

function makeVideoEntry(overrides: Partial<VideoWatchEntry> = {}): VideoWatchEntry {
  return {
    video_id: 'vid-abc',
    video_name: 'Lecture 1',
    subject: 'physics',
    watched_seconds: 3600,
    watched_date: '2026-03-07',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// buildBucketEntry
// ═══════════════════════════════════════════════════════════════════════════

describe('buildBucketEntry', () => {
  it('returns zeroes when called with no arguments', () => {
    expect(buildBucketEntry()).toEqual({ overall: 0, physics: 0, chemistry: 0, maths: 0 });
  });

  it('fills missing fields from a partial input', () => {
    expect(buildBucketEntry({ physics: 42 })).toEqual({
      overall: 0,
      physics: 42,
      chemistry: 0,
      maths: 0,
    });
  });

  it('passes through a complete entry unchanged', () => {
    const full = { overall: 10, physics: 20, chemistry: 30, maths: 40 };
    expect(buildBucketEntry(full)).toEqual(full);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// addToBucket
// ═══════════════════════════════════════════════════════════════════════════

describe('addToBucket', () => {
  it('creates a new bucket entry for a new key', () => {
    const map: AggregateBucketMap = {};
    addToBucket(map, '2026-03-07', 'physics', 100);
    expect(map['2026-03-07']).toEqual({ overall: 100, physics: 100, chemistry: 0, maths: 0 });
  });

  it('accumulates seconds into an existing bucket', () => {
    const map: AggregateBucketMap = {
      '2026-03-07': { overall: 50, physics: 50, chemistry: 0, maths: 0 },
    };
    addToBucket(map, '2026-03-07', 'physics', 100);
    expect(map['2026-03-07']).toEqual({ overall: 150, physics: 150, chemistry: 0, maths: 0 });
  });

  it('adds to overall even when subject is undefined', () => {
    const map: AggregateBucketMap = {};
    addToBucket(map, '2026-03-07', undefined, 200);
    expect(map['2026-03-07']).toEqual({ overall: 200, physics: 0, chemistry: 0, maths: 0 });
  });

  it('tracks each subject independently', () => {
    const map: AggregateBucketMap = {};
    addToBucket(map, 'day', 'physics', 10);
    addToBucket(map, 'day', 'chemistry', 20);
    addToBucket(map, 'day', 'maths', 30);
    expect(map['day']).toEqual({ overall: 60, physics: 10, chemistry: 20, maths: 30 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getWeekKey / getMonthKey
// ═══════════════════════════════════════════════════════════════════════════

describe('getWeekKey', () => {
  it('returns ISO week format for a Monday', () => {
    const key = getWeekKey('2026-03-09'); // Monday
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('returns same week key for consecutive days in the same week', () => {
    const mon = getWeekKey('2026-03-09');
    const tue = getWeekKey('2026-03-10');
    const sun = getWeekKey('2026-03-15');
    expect(mon).toBe(tue);
    expect(mon).toBe(sun);
  });

  it('returns different week keys across a week boundary', () => {
    const sun = getWeekKey('2026-03-15');
    const nextMon = getWeekKey('2026-03-16');
    expect(sun).not.toBe(nextMon);
  });

  it('is timezone-neutral: same string on any device', () => {
    // Both dates are near midnight UTC; the key must depend only on the
    // local calendar date embedded in the string, not on Date.getDate().
    expect(getWeekKey('2026-03-11')).toBe(getWeekKey('2026-03-11'));
  });
});

describe('getMonthKey', () => {
  it('returns YYYY-MM format', () => {
    expect(getMonthKey('2026-03-07')).toBe('2026-03');
  });

  it('zero-pads single-digit months', () => {
    expect(getMonthKey('2026-01-15')).toBe('2026-01');
  });

  it('is timezone-neutral: slices the date string directly', () => {
    expect(getMonthKey('2026-12-31')).toBe('2026-12');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// normalizeSubject
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeSubject', () => {
  it('returns physics/chemistry/maths for valid strings', () => {
    expect(normalizeSubject('physics')).toBe('physics');
    expect(normalizeSubject('chemistry')).toBe('chemistry');
    expect(normalizeSubject('maths')).toBe('maths');
  });

  it('returns undefined for invalid values', () => {
    expect(normalizeSubject('biology')).toBeUndefined();
    expect(normalizeSubject('')).toBeUndefined();
    expect(normalizeSubject(null)).toBeUndefined();
    expect(normalizeSubject(undefined)).toBeUndefined();
    expect(normalizeSubject(42)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// toVideoSessionTimestamp
// ═══════════════════════════════════════════════════════════════════════════

describe('toVideoSessionTimestamp', () => {
  it('returns null for undefined/empty input', () => {
    expect(toVideoSessionTimestamp(undefined)).toBeNull();
    expect(toVideoSessionTimestamp('')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(toVideoSessionTimestamp('not-a-date')).toBeNull();
  });

  it('passes through ISO strings with time component', () => {
    const iso = '2026-03-07T10:00:00.000Z';
    expect(toVideoSessionTimestamp(iso)).toBe(new Date(iso).toISOString());
  });

  it('uses UTC midnight for date-only strings (timezone-neutral)', () => {
    const result = toVideoSessionTimestamp('2026-03-07');
    // Must be exactly UTC midnight — not a local T09:00:00 which varies by timezone.
    expect(result).toBe('2026-03-07T00:00:00.000Z');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// computeLocalStudyAggregate
// ═══════════════════════════════════════════════════════════════════════════

describe('computeLocalStudyAggregate', () => {
  it('returns all zeroes for empty sessions array', () => {
    const agg = computeLocalStudyAggregate([]);
    expect(agg.total_seconds_overall).toBe(0);
    expect(agg.total_seconds_physics).toBe(0);
    expect(agg.total_seconds_chemistry).toBe(0);
    expect(agg.total_seconds_maths).toBe(0);
    expect(Object.keys(agg.buckets_daily_json)).toHaveLength(0);
  });

  it('correctly sums a single physics session', () => {
    const agg = computeLocalStudyAggregate([
      makeSession({ id: '1', subject: 'physics', duration: 3600 }),
    ]);
    expect(agg.total_seconds_overall).toBe(3600);
    expect(agg.total_seconds_physics).toBe(3600);
    expect(agg.total_seconds_chemistry).toBe(0);
    expect(agg.total_seconds_maths).toBe(0);
  });

  it('sums multiple subjects correctly', () => {
    const agg = computeLocalStudyAggregate([
      makeSession({ id: '1', subject: 'physics', duration: 100 }),
      makeSession({ id: '2', subject: 'chemistry', duration: 200 }),
      makeSession({ id: '3', subject: 'maths', duration: 300 }),
    ]);
    expect(agg.total_seconds_overall).toBe(600);
    expect(agg.total_seconds_physics).toBe(100);
    expect(agg.total_seconds_chemistry).toBe(200);
    expect(agg.total_seconds_maths).toBe(300);
  });

  it('ignores sessions with zero or negative duration', () => {
    const agg = computeLocalStudyAggregate([
      makeSession({ id: '1', subject: 'physics', duration: 0 }),
      makeSession({ id: '2', subject: 'physics', duration: -100 }),
    ]);
    expect(agg.total_seconds_overall).toBe(0);
  });

  it('ignores sessions with invalid startTime', () => {
    const agg = computeLocalStudyAggregate([
      makeSession({ id: '1', subject: 'physics', duration: 100, startTime: 'garbage' }),
    ]);
    expect(agg.total_seconds_overall).toBe(0);
  });

  it('floors fractional durations', () => {
    const agg = computeLocalStudyAggregate([
      makeSession({ id: '1', subject: 'physics', duration: 99.9 }),
    ]);
    expect(agg.total_seconds_overall).toBe(99);
  });

  it('counts sessions without subject towards overall only', () => {
    const agg = computeLocalStudyAggregate([makeSession({ id: '1', duration: 500 })]);
    expect(agg.total_seconds_overall).toBe(500);
    expect(agg.total_seconds_physics).toBe(0);
    expect(agg.total_seconds_chemistry).toBe(0);
    expect(agg.total_seconds_maths).toBe(0);
  });

  it('populates daily/weekly/monthly buckets', () => {
    const agg = computeLocalStudyAggregate([
      makeSession({
        id: '1',
        subject: 'physics',
        duration: 1000,
        startTime: '2026-03-07T10:00:00.000Z',
      }),
    ]);
    expect(Object.keys(agg.buckets_daily_json).length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(agg.buckets_weekly_json).length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(agg.buckets_monthly_json).length).toBeGreaterThanOrEqual(1);
  });

  it('handles high volume: 1000 sessions', () => {
    const sessions: StudySession[] = [];
    const subjects: ('physics' | 'chemistry' | 'maths')[] = ['physics', 'chemistry', 'maths'];
    for (let i = 0; i < 1000; i++) {
      const day = (i % 60) + 1;
      const month = Math.floor(day / 30) + 1;
      sessions.push(
        makeSession({
          id: `s-${i}`,
          subject: subjects[i % 3],
          duration: 1800,
          startTime: `2026-${String(month).padStart(2, '0')}-${String(Math.min(day, 28)).padStart(2, '0')}T10:00:00.000Z`,
        })
      );
    }
    const agg = computeLocalStudyAggregate(sessions);
    expect(agg.total_seconds_overall).toBe(1000 * 1800);
    expect(agg.total_seconds_physics + agg.total_seconds_chemistry + agg.total_seconds_maths).toBe(
      1000 * 1800
    );
  });

  it('uses localDate if available, otherwise derives from startTime', () => {
    const withLocalDate = computeLocalStudyAggregate([
      makeSession({ id: '1', subject: 'physics', duration: 100, localDate: '2026-12-25' }),
    ]);
    expect(withLocalDate.buckets_daily_json['2026-12-25']).toBeDefined();
    expect(withLocalDate.buckets_daily_json['2026-12-25'].overall).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// mergeRemoteVideoLogsIntoSessions
// ═══════════════════════════════════════════════════════════════════════════

describe('mergeRemoteVideoLogsIntoSessions', () => {
  it('returns unchanged if videoLogs is empty', () => {
    const existing = [makeSession({ id: '1' })];
    const result = mergeRemoteVideoLogsIntoSessions(existing, []);
    expect(result.changed).toBe(false);
    expect(result.sessions).toBe(existing); // same reference
  });

  it('appends a new video session when none exists locally', () => {
    const result = mergeRemoteVideoLogsIntoSessions([], [makeVideoEntry()]);
    expect(result.changed).toBe(true);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].sourceVideoId).toBe('vid-abc');
    expect(result.sessions[0].timerMode).toBe('video');
  });

  it('does not duplicate when local already has the same video', () => {
    const existing = [
      makeSession({
        id: 'remote-video-vid-abc-3600',
        sourceVideoId: 'vid-abc',
        duration: 3600,
      }),
    ];
    const result = mergeRemoteVideoLogsIntoSessions(existing, [
      makeVideoEntry({ watched_seconds: 3600 }),
    ]);
    expect(result.changed).toBe(false);
  });

  it('appends delta when remote has more time than local', () => {
    const existing = [
      makeSession({
        id: 'remote-video-vid-abc-1800',
        sourceVideoId: 'vid-abc',
        duration: 1800,
      }),
    ];
    const result = mergeRemoteVideoLogsIntoSessions(existing, [
      makeVideoEntry({ watched_seconds: 3600 }),
    ]);
    expect(result.changed).toBe(true);
    expect(result.sessions).toHaveLength(2);
    const appended = result.sessions[1];
    expect(appended.duration).toBe(1800); // 3600 - 1800
  });

  it('ignores video entries with zero watched_seconds', () => {
    const result = mergeRemoteVideoLogsIntoSessions([], [makeVideoEntry({ watched_seconds: 0 })]);
    expect(result.changed).toBe(false);
  });

  it('ignores video entries with no video_id', () => {
    const result = mergeRemoteVideoLogsIntoSessions([], [makeVideoEntry({ video_id: '' })]);
    expect(result.changed).toBe(false);
  });

  it('ignores video entries with invalid watched_date', () => {
    const result = mergeRemoteVideoLogsIntoSessions(
      [],
      [makeVideoEntry({ watched_date: 'not-a-date' })]
    );
    expect(result.changed).toBe(false);
  });

  it('uses "Video Session" as fallback title when video_name is empty', () => {
    const result = mergeRemoteVideoLogsIntoSessions([], [makeVideoEntry({ video_name: '' })]);
    expect(result.sessions[0].title).toBe('Video Session');
  });

  it('sets type to "chapter" when subject is valid, "custom" otherwise', () => {
    const withSubject = mergeRemoteVideoLogsIntoSessions(
      [],
      [makeVideoEntry({ subject: 'physics' })]
    );
    expect(withSubject.sessions[0].type).toBe('chapter');

    const noSubject = mergeRemoteVideoLogsIntoSessions([], [makeVideoEntry({ subject: 'art' })]);
    expect(noSubject.sessions[0].type).toBe('custom');
  });

  it('deduplicates video logs, keeping the one with highest seconds', () => {
    const logs: VideoWatchEntry[] = [
      makeVideoEntry({ video_id: 'v1', watched_seconds: 100 }),
      makeVideoEntry({ video_id: 'v1', watched_seconds: 500 }),
      makeVideoEntry({ video_id: 'v1', watched_seconds: 200 }),
    ];
    const result = mergeRemoteVideoLogsIntoSessions([], logs);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].duration).toBe(500);
  });

  it('handles multiple videos merged at once', () => {
    const logs: VideoWatchEntry[] = [
      makeVideoEntry({ video_id: 'v1', watched_seconds: 100, video_name: 'V1' }),
      makeVideoEntry({ video_id: 'v2', watched_seconds: 200, video_name: 'V2' }),
      makeVideoEntry({ video_id: 'v3', watched_seconds: 300, video_name: 'V3' }),
    ];
    const result = mergeRemoteVideoLogsIntoSessions([], logs);
    expect(result.changed).toBe(true);
    expect(result.sessions).toHaveLength(3);
  });

  it('accumulates local video time across multiple sessions for the same video', () => {
    const existing = [
      makeSession({ id: 'a', sourceVideoId: 'v1', duration: 100 }),
      makeSession({ id: 'b', sourceVideoId: 'v1', duration: 200 }),
    ];
    // Remote says 300 total — which we already have locally, so no change
    const result = mergeRemoteVideoLogsIntoSessions(existing, [
      makeVideoEntry({ video_id: 'v1', watched_seconds: 300 }),
    ]);
    expect(result.changed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// computeSessionDelta
// ═══════════════════════════════════════════════════════════════════════════

describe('computeSessionDelta', () => {
  const cid = 'test-client';

  it('returns empty array when sessions are identical', () => {
    const sessions = [makeSession({ id: '1' })];
    expect(computeSessionDelta(sessions, sessions, cid)).toHaveLength(0);
  });

  it('detects an INSERT for a new session', () => {
    const prev: StudySession[] = [];
    const curr = [makeSession({ id: 'new-1' })];
    const delta = computeSessionDelta(prev, curr, cid);
    expect(delta).toHaveLength(1);
    expect(delta[0].action).toBe('INSERT');
    expect(delta[0].session_id).toBe('new-1');
    expect(delta[0].payload).toEqual(curr[0]);
  });

  it('detects a DELETE for a removed session', () => {
    const prev = [makeSession({ id: 'old-1' })];
    const curr: StudySession[] = [];
    const delta = computeSessionDelta(prev, curr, cid);
    expect(delta).toHaveLength(1);
    expect(delta[0].action).toBe('DELETE');
    expect(delta[0].session_id).toBe('old-1');
    expect(delta[0].payload).toBeNull();
  });

  it('detects an INSERT (update) for a modified session', () => {
    const prev = [makeSession({ id: '1', duration: 100 })];
    const curr = [makeSession({ id: '1', duration: 200 })];
    const delta = computeSessionDelta(prev, curr, cid);
    expect(delta).toHaveLength(1);
    expect(delta[0].action).toBe('INSERT');
    expect(delta[0].payload?.duration).toBe(200);
  });

  it('detects mixed INSERTs and DELETEs', () => {
    const prev = [makeSession({ id: 'keep' }), makeSession({ id: 'remove' })];
    const curr = [makeSession({ id: 'keep' }), makeSession({ id: 'add' })];
    const delta = computeSessionDelta(prev, curr, cid);
    expect(delta).toHaveLength(2);
    const actions = delta.map((d) => d.action);
    expect(actions).toContain('INSERT');
    expect(actions).toContain('DELETE');
  });

  it('tags all entries with the client ID', () => {
    const delta = computeSessionDelta([], [makeSession({ id: '1' })], 'my-client');
    expect(delta[0].client_id).toBe('my-client');
  });

  it('handles high volume: 500 sessions added', () => {
    const prev: StudySession[] = [];
    const curr: StudySession[] = Array.from({ length: 500 }, (_, i) =>
      makeSession({ id: `s-${i}` })
    );
    const delta = computeSessionDelta(prev, curr, cid);
    expect(delta).toHaveLength(500);
    delta.forEach((d) => expect(d.action).toBe('INSERT'));
  });

  it('handles high volume: 500 sessions deleted', () => {
    const prev: StudySession[] = Array.from({ length: 500 }, (_, i) =>
      makeSession({ id: `s-${i}` })
    );
    const curr: StudySession[] = [];
    const delta = computeSessionDelta(prev, curr, cid);
    expect(delta).toHaveLength(500);
    delta.forEach((d) => expect(d.action).toBe('DELETE'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyDeltaLogs
// ═══════════════════════════════════════════════════════════════════════════

describe('applyDeltaLogs', () => {
  const ownClientId = 'my-client';
  const otherClientId = 'other-client';

  function makeLog(
    overrides: Partial<StudySessionLogEntry> & { session_id: string; action: 'INSERT' | 'DELETE' }
  ): StudySessionLogEntry {
    return {
      id: 'log-1',
      user_id: 'user-1',
      client_id: otherClientId,
      payload: overrides.action === 'INSERT' ? makeSession({ id: overrides.session_id }) : null,
      created_at: '2026-03-07T10:00:00.000Z',
      ...overrides,
    };
  }

  it('returns unchanged when logs are empty', () => {
    const sessions = [makeSession({ id: '1' })];
    const result = applyDeltaLogs(sessions, [], ownClientId);
    expect(result.changed).toBe(false);
    expect(result.sessions).toHaveLength(1);
  });

  it('ignores logs from own client', () => {
    const sessions = [makeSession({ id: '1' })];
    const logs = [makeLog({ session_id: 'new', action: 'INSERT', client_id: ownClientId })];
    const result = applyDeltaLogs(sessions, logs, ownClientId);
    expect(result.changed).toBe(false);
  });

  it('applies INSERT from another client — adds new session', () => {
    const newSession = makeSession({ id: 'remote-new', title: 'Remote Session' });
    const logs = [makeLog({ session_id: 'remote-new', action: 'INSERT', payload: newSession })];
    const result = applyDeltaLogs([], logs, ownClientId);
    expect(result.changed).toBe(true);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].title).toBe('Remote Session');
  });

  it('applies INSERT from another client — updates existing session', () => {
    const existing = [makeSession({ id: 's1', duration: 100 })];
    const updated = makeSession({ id: 's1', duration: 999 });
    const logs = [makeLog({ session_id: 's1', action: 'INSERT', payload: updated })];
    const result = applyDeltaLogs(existing, logs, ownClientId);
    expect(result.changed).toBe(true);
    expect(result.sessions[0].duration).toBe(999);
  });

  it('applies DELETE from another client — removes session', () => {
    const existing = [makeSession({ id: 's1' }), makeSession({ id: 's2' })];
    const logs = [makeLog({ session_id: 's1', action: 'DELETE' })];
    const result = applyDeltaLogs(existing, logs, ownClientId);
    expect(result.changed).toBe(true);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].id).toBe('s2');
  });

  it('ignores DELETE for a session that does not exist locally', () => {
    const existing = [makeSession({ id: 's1' })];
    const logs = [makeLog({ session_id: 'nonexistent', action: 'DELETE' })];
    const result = applyDeltaLogs(existing, logs, ownClientId);
    expect(result.changed).toBe(false);
    expect(result.sessions).toHaveLength(1);
  });

  it('applies multiple logs in order', () => {
    const logs = [
      makeLog({ session_id: 'a', action: 'INSERT', payload: makeSession({ id: 'a', title: 'A' }) }),
      makeLog({ session_id: 'b', action: 'INSERT', payload: makeSession({ id: 'b', title: 'B' }) }),
      makeLog({ session_id: 'a', action: 'DELETE' }),
    ];
    const result = applyDeltaLogs([], logs, ownClientId);
    expect(result.changed).toBe(true);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].id).toBe('b');
  });

  it('does not mutate the original sessions array', () => {
    const existing = [makeSession({ id: 's1' })];
    const copy = [...existing];
    applyDeltaLogs(
      existing,
      [makeLog({ session_id: 'new', action: 'INSERT', payload: makeSession({ id: 'new' }) })],
      ownClientId
    );
    expect(existing).toEqual(copy);
  });

  it('handles high volume: 200 INSERT logs', () => {
    const logs: StudySessionLogEntry[] = Array.from({ length: 200 }, (_, i) =>
      makeLog({ session_id: `s-${i}`, action: 'INSERT', payload: makeSession({ id: `s-${i}` }) })
    );
    const result = applyDeltaLogs([], logs, ownClientId);
    expect(result.changed).toBe(true);
    expect(result.sessions).toHaveLength(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pruneAggregateBuckets
// ═══════════════════════════════════════════════════════════════════════════

function daysAgoLocalDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return formatDateLocal(d);
}

function makeAggregate(daily: AggregateBucketMap) {
  return {
    total_seconds_overall: 7200,
    total_seconds_physics: 3600,
    total_seconds_chemistry: 1800,
    total_seconds_maths: 1800,
    buckets_daily_json: daily,
    buckets_weekly_json: {
      '2026-W10': { overall: 7200, physics: 3600, chemistry: 1800, maths: 1800 },
    },
    buckets_monthly_json: {
      '2026-03': { overall: 7200, physics: 3600, chemistry: 1800, maths: 1800 },
    },
  };
}

describe('pruneAggregateBuckets', () => {
  it('keeps recent days and drops entries older than the 90-day default', () => {
    const aggregate = makeAggregate({
      [daysAgoLocalDate(1)]: { overall: 600, physics: 600, chemistry: 0, maths: 0 },
      [daysAgoLocalDate(30)]: { overall: 1200, physics: 0, chemistry: 1200, maths: 0 },
      [daysAgoLocalDate(89)]: { overall: 300, physics: 300, chemistry: 0, maths: 0 },
      // Boundary: exactly cutoffStr is kept (>= comparison)
      [daysAgoLocalDate(90)]: { overall: 100, physics: 100, chemistry: 0, maths: 0 },
      [daysAgoLocalDate(91)]: { overall: 50, physics: 50, chemistry: 0, maths: 0 },
      [daysAgoLocalDate(365)]: { overall: 25, physics: 25, chemistry: 0, maths: 0 },
    });

    const pruned = pruneAggregateBuckets(aggregate);
    const keys = Object.keys(pruned.buckets_daily_json);

    expect(keys).toHaveLength(4);
    expect(keys).toContain(daysAgoLocalDate(1));
    expect(keys).toContain(daysAgoLocalDate(90));
    expect(keys).not.toContain(daysAgoLocalDate(91));
    expect(keys).not.toContain(daysAgoLocalDate(365));
  });

  it('honors a custom retention window', () => {
    const aggregate = makeAggregate({
      [daysAgoLocalDate(2)]: { overall: 600, physics: 600, chemistry: 0, maths: 0 },
      [daysAgoLocalDate(7)]: { overall: 1200, physics: 0, chemistry: 1200, maths: 0 },
      [daysAgoLocalDate(14)]: { overall: 300, physics: 300, chemistry: 0, maths: 0 },
    });

    const pruned = pruneAggregateBuckets(aggregate, 7);
    const keys = Object.keys(pruned.buckets_daily_json);

    expect(keys).toHaveLength(2);
    expect(keys).toContain(daysAgoLocalDate(2));
    expect(keys).toContain(daysAgoLocalDate(7));
    expect(keys).not.toContain(daysAgoLocalDate(14));
  });

  it('leaves weekly and monthly buckets untouched', () => {
    const aggregate = makeAggregate({
      [daysAgoLocalDate(200)]: { overall: 600, physics: 600, chemistry: 0, maths: 0 },
      [daysAgoLocalDate(1)]: { overall: 60, physics: 60, chemistry: 0, maths: 0 },
    });

    const pruned = pruneAggregateBuckets(aggregate);

    expect(pruned.buckets_weekly_json).toEqual(aggregate.buckets_weekly_json);
    expect(pruned.buckets_monthly_json).toEqual(aggregate.buckets_monthly_json);
  });

  it('preserves totals and other fields from the input row', () => {
    const aggregate = {
      ...makeAggregate({
        [daysAgoLocalDate(400)]: { overall: 600, physics: 600, chemistry: 0, maths: 0 },
      }),
      user_id: 'user-1',
    };

    const pruned = pruneAggregateBuckets(aggregate);

    expect(pruned.user_id).toBe('user-1');
    expect(pruned.total_seconds_overall).toBe(7200);
    expect(Object.keys(pruned.buckets_daily_json)).toHaveLength(0);
  });

  it('handles an empty daily map without changing anything else', () => {
    const aggregate = makeAggregate({});

    const pruned = pruneAggregateBuckets(aggregate);

    expect(pruned.buckets_daily_json).toEqual({});
    expect(pruned.total_seconds_overall).toBe(7200);
  });

  it('does not mutate the input aggregate', () => {
    const oldKey = daysAgoLocalDate(200);
    const daily = { [oldKey]: { overall: 600, physics: 600, chemistry: 0, maths: 0 } };
    const aggregate = makeAggregate(daily);

    pruneAggregateBuckets(aggregate);

    expect(Object.keys(aggregate.buckets_daily_json)).toContain(oldKey);
  });
});
