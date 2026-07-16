import { describe, expect, it } from 'vitest';
import { buildSyncPayload, filterPlannerTasksForSync } from './syncPayload';
import { AppProgress, ProgressCardSettings } from '../../shared/types';

const baseProgress: AppProgress = {
  physics: {},
  chemistry: {},
  maths: {},
  biology: {},
};

const progressCardSettings: ProgressCardSettings = {
  userName: 'Naman',
  customAvatarUrl: 'https://example.com/avatar.png',
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
};

describe('syncPayload', () => {
  it('filters planner tasks to last 60 days plus future', () => {
    const now = new Date('2026-03-07T10:00:00.000Z');
    const filtered = filterPlannerTasksForSync(
      [
        {
          id: 'old',
          title: 'old',
          date: '2026-01-01',
          time: '10:00',
          completed: false,
          type: 'custom',
        },
        {
          id: 'edge',
          title: 'edge',
          date: '2026-01-06',
          time: '10:00',
          completed: false,
          type: 'custom',
        },
        {
          id: 'future',
          title: 'future',
          date: '2026-03-09',
          time: '10:00',
          completed: false,
          type: 'custom',
        },
      ],
      now,
      60
    );

    expect(filtered.map((t) => t.id)).toEqual(['edge', 'future']);
  });

  it('excludes avatar url and other profile settings in synced settings payload', () => {
    const payload = buildSyncPayload({
      progress: baseProgress,
      plannerTasks: [],
      mockScores: [],
      examDates: [],
      disableAutoShift: false,
      progressCardSettings: {
        ...progressCardSettings,
        bannerUrl: 'https://example.com/banner.png',
        customStatus: 'Studying',
        gradeStatus: 'Class 12',
        targetExam: 'JEE 2026',
      },
      mockExamPresets: [],
      generatedAt: '2026-03-07T10:00:00.000Z',
    });

    expect(payload.domains.settings.progressCardSettings.userName).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.visibleStats.examCountdown).toBe(true);
    expect(payload.domains.settings.progressCardSettings.customAvatarUrl).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.bannerUrl).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.customStatus).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.gradeStatus).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.targetExam).toBeUndefined();
  });

  it('includes tombstones and modifiedAt when present, and excludes them when empty', () => {
    const payloadWithMetadata = buildSyncPayload({
      progress: baseProgress,
      plannerTasks: [],
      mockScores: [],
      examDates: [],
      disableAutoShift: false,
      progressCardSettings,
      mockExamPresets: [],
      tombstones: {
        plannerTasks: [{ id: 'task-1', deletedAt: '2026-03-07T10:00:00.000Z' }],
      },
      domainsModifiedAt: {
        settings: '2026-03-07T10:00:00.000Z',
      },
    });

    expect(payloadWithMetadata.domains.tombstones).toEqual({
      plannerTasks: [{ id: 'task-1', deletedAt: '2026-03-07T10:00:00.000Z' }],
    });
    expect(payloadWithMetadata.domains.modifiedAt).toEqual({
      settings: '2026-03-07T10:00:00.000Z',
    });

    const payloadWithoutMetadata = buildSyncPayload({
      progress: baseProgress,
      plannerTasks: [],
      mockScores: [],
      examDates: [],
      disableAutoShift: false,
      progressCardSettings,
      mockExamPresets: [],
      tombstones: {},
      domainsModifiedAt: {},
    });

    expect(payloadWithoutMetadata.domains.tombstones).toBeUndefined();
    expect(payloadWithoutMetadata.domains.modifiedAt).toBeUndefined();
  });
});
