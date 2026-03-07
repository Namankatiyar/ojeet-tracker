import { describe, expect, it } from 'vitest';
import { buildSyncPayload, filterPlannerTasksForSync } from './syncPayload';
import { AppProgress, ProgressCardSettings } from '../../shared/types';

const baseProgress: AppProgress = {
    physics: {},
    chemistry: {},
    maths: {},
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
        const filtered = filterPlannerTasksForSync([
            { id: 'old', title: 'old', date: '2026-01-01', time: '10:00', completed: false, type: 'custom' },
            { id: 'edge', title: 'edge', date: '2026-01-06', time: '10:00', completed: false, type: 'custom' },
            { id: 'future', title: 'future', date: '2026-03-09', time: '10:00', completed: false, type: 'custom' },
        ], now, 60);

        expect(filtered.map((t) => t.id)).toEqual(['edge', 'future']);
    });

    it('excludes avatar url from synced settings payload', () => {
        const payload = buildSyncPayload({
            progress: baseProgress,
            plannerTasks: [],
            mockScores: [],
            examDates: [],
            disableAutoShift: false,
            progressCardSettings,
            generatedAt: '2026-03-07T10:00:00.000Z',
        });

        expect(payload.domains.settings.progressCardSettings.userName).toBe('Naman');
        expect(payload.domains.settings.progressCardSettings.visibleStats.examCountdown).toBe(true);
        expect('customAvatarUrl' in payload.domains.settings.progressCardSettings).toBe(false);
    });
});
