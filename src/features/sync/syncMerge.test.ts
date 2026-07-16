import { describe, expect, it } from 'vitest';
import { mergePayloadDomainsWithPolicy } from './syncMerge';
import { SyncPayloadV1 } from './syncTypes';

const makeBasePayload = (): SyncPayloadV1 => ({
  schemaVersion: 2,
  generatedAt: '2026-03-07T10:00:00.000Z',
  domains: {
    progress: {
      physics: {},
      chemistry: {},
      maths: {},
      biology: {},
    },
    plannerTasks: [],
    mockScores: [],
    examDates: [],
    settings: {
      disableAutoShift: false,
      progressCardSettings: {
        userName: 'Naman',
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
      },
      mockExamPresets: [],
    },
  },
});

describe('syncMerge', () => {
  it('unions distinct list items from both local and remote payloads', () => {
    const local = makeBasePayload();
    local.domains.plannerTasks = [
      { id: 'local-task', title: 'Local Task', date: '2026-03-07', time: '10:00', completed: false, type: 'custom' },
    ];
    const remote = makeBasePayload();
    remote.domains.plannerTasks = [
      { id: 'remote-task', title: 'Remote Task', date: '2026-03-08', time: '10:00', completed: false, type: 'custom' },
    ];

    const merged = mergePayloadDomainsWithPolicy(local, remote, {
      hasLocalUnsyncedEdit: () => false,
    });

    expect(merged.domains.plannerTasks).toHaveLength(2);
    expect(merged.domains.plannerTasks.map((t) => t.id)).toEqual(['local-task', 'remote-task']);
  });

  it('uses LWW timestamp comparison when both payloads have the same item ID', () => {
    const local = makeBasePayload();
    local.domains.plannerTasks = [
      {
        id: 'task-1',
        title: 'Older Local Title',
        date: '2026-03-07',
        time: '10:00',
        completed: false,
        type: 'custom',
        updatedAt: '2026-03-07T10:00:00.000Z',
      },
    ];
    const remote = makeBasePayload();
    remote.domains.plannerTasks = [
      {
        id: 'task-1',
        title: 'Newer Remote Title',
        date: '2026-03-07',
        time: '10:00',
        completed: true,
        type: 'custom',
        updatedAt: '2026-03-07T12:00:00.000Z',
      },
    ];

    const merged = mergePayloadDomainsWithPolicy(local, remote, {
      hasLocalUnsyncedEdit: () => false,
    });

    expect(merged.domains.plannerTasks).toHaveLength(1);
    expect(merged.domains.plannerTasks[0].title).toBe('Newer Remote Title');
    expect(merged.domains.plannerTasks[0].completed).toBe(true);
  });

  it('removes item if a newer tombstone exists for that item ID', () => {
    const recentItemTime = new Date(Date.now() - 3600 * 1000).toISOString();
    const recentTombstoneTime = new Date(Date.now() - 1800 * 1000).toISOString();

    const local = makeBasePayload();
    local.domains.plannerTasks = [
      {
        id: 'task-1',
        title: 'Task to be deleted',
        date: '2026-07-16',
        time: '10:00',
        completed: false,
        type: 'custom',
        updatedAt: recentItemTime,
      },
    ];
    const remote = makeBasePayload();
    remote.domains.tombstones = {
      plannerTasks: [{ id: 'task-1', deletedAt: recentTombstoneTime }],
    };

    const merged = mergePayloadDomainsWithPolicy(local, remote, {
      hasLocalUnsyncedEdit: () => false,
    });

    expect(merged.domains.plannerTasks).toHaveLength(0);
    expect(merged.domains.tombstones?.plannerTasks).toEqual([
      { id: 'task-1', deletedAt: recentTombstoneTime },
    ]);
  });

  it('keeps live item and discards tombstone if item was modified AFTER tombstone deletedAt', () => {
    const recentTombstoneTime = new Date(Date.now() - 3600 * 1000).toISOString();
    const recentItemTime = new Date(Date.now() - 1800 * 1000).toISOString();

    const local = makeBasePayload();
    local.domains.plannerTasks = [
      {
        id: 'task-1',
        title: 'Re-created or edited Task',
        date: '2026-07-16',
        time: '10:00',
        completed: false,
        type: 'custom',
        updatedAt: recentItemTime,
      },
    ];
    const remote = makeBasePayload();
    remote.domains.tombstones = {
      plannerTasks: [{ id: 'task-1', deletedAt: recentTombstoneTime }],
    };

    const merged = mergePayloadDomainsWithPolicy(local, remote, {
      hasLocalUnsyncedEdit: () => false,
    });

    expect(merged.domains.plannerTasks).toHaveLength(1);
    expect(merged.domains.plannerTasks[0].title).toBe('Re-created or edited Task');
    expect(merged.domains.tombstones?.plannerTasks).toBeUndefined();
  });

  it('unions chapter progress across subjects and uses LWW for conflicting chapters', () => {
    const local = makeBasePayload();
    local.domains.progress.physics[1] = {
      completed: { ncert: true },
      priority: 'high',
      updatedAt: '2026-03-07T10:00:00.000Z',
    } as any;
    local.domains.progress.physics[2] = {
      completed: { ncert: true },
      priority: 'none',
      updatedAt: '2026-03-07T10:00:00.000Z',
    } as any;

    const remote = makeBasePayload();
    remote.domains.progress.physics[1] = {
      completed: { ncert: false },
      priority: 'low',
      updatedAt: '2026-03-07T12:00:00.000Z',
    } as any;
    remote.domains.progress.physics[3] = {
      completed: { ncert: true },
      priority: 'medium',
      updatedAt: '2026-03-07T11:00:00.000Z',
    } as any;

    const merged = mergePayloadDomainsWithPolicy(local, remote, {
      hasLocalUnsyncedEdit: () => false,
    });

    expect(merged.domains.progress.physics[1]!.priority).toBe('low');
    expect(merged.domains.progress.physics[2]!.priority).toBe('none');
    expect(merged.domains.progress.physics[3]!.priority).toBe('medium');
  });

  it('uses LWW modifiedAt timestamps for settings and subjects singleton domains', () => {
    const local = makeBasePayload();
    local.domains.settings.disableAutoShift = true;
    local.domains.modifiedAt = { settings: '2026-03-07T15:00:00.000Z' };

    const remote = makeBasePayload();
    remote.domains.settings.disableAutoShift = false;
    remote.domains.modifiedAt = { settings: '2026-03-07T12:00:00.000Z' };

    const merged = mergePayloadDomainsWithPolicy(local, remote, {
      hasLocalUnsyncedEdit: () => false,
    });

    expect(merged.domains.settings.disableAutoShift).toBe(true);
  });
});
