import { describe, expect, it } from 'vitest';
import { mergePayloadDomainsWithPolicy } from './syncMerge';
import { SyncPayloadV1 } from './syncTypes';

const makePayload = (tag: string): SyncPayloadV1 => ({
    schemaVersion: 1,
    generatedAt: '2026-03-07T10:00:00.000Z',
    domains: {
        progress: { physics: { 1: { completed: { ncert: tag === 'local' }, priority: 'none' } }, chemistry: {}, maths: {} },
        plannerTasks: [{ id: `${tag}-task`, title: tag, date: '2026-03-07', time: '10:00', completed: false, type: 'custom' }],
        mockScores: [{ id: `${tag}-mock`, name: tag, date: '2026-03-07', physicsMarks: 10, chemistryMarks: 10, mathsMarks: 10, totalMarks: 30 }],
        examDates: [{ id: `${tag}-exam`, name: tag, date: '2026-04-01', isPrimary: true }],
        settings: {
            disableAutoShift: tag === 'local',
            progressCardSettings: {
                userName: tag,
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
        },
        subjects: {
            subjectData: { physics: null, chemistry: null, maths: null },
            customColumns: { physics: [tag], chemistry: [], maths: [] },
            excludedColumns: { physics: [], chemistry: [], maths: [] },
            materialOrder: { physics: [], chemistry: [], maths: [] },
        },
    },
});

describe('syncMerge', () => {
    it('uses cloud data by default', () => {
        const local = makePayload('local');
        const remote = makePayload('remote');
        const merged = mergePayloadDomainsWithPolicy(local, remote, {
            hasLocalUnsyncedEdit: () => false,
        });

        expect(merged.domains.settings.progressCardSettings.userName).toBe('remote');
        expect(merged.domains.plannerTasks[0].id).toBe('remote-task');
    });

    it('overrides only edited domains with local data', () => {
        const local = makePayload('local');
        const remote = makePayload('remote');
        const merged = mergePayloadDomainsWithPolicy(local, remote, {
            hasLocalUnsyncedEdit: (domain) => domain === 'plannerTasks' || domain === 'settings',
        });

        expect(merged.domains.plannerTasks[0].id).toBe('local-task');
        expect(merged.domains.settings.progressCardSettings.userName).toBe('local');
        expect(merged.domains.mockScores[0].id).toBe('remote-mock');
        expect(merged.domains.examDates[0].id).toBe('remote-exam');
    });
});
