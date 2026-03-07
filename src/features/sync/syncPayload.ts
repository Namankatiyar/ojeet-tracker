import { formatDateLocal } from '../../shared/utils/date';
import { SyncPayloadInput, SyncPayloadV1, SYNC_DEFAULT_PLANNER_HISTORY_DAYS, SYNC_SCHEMA_VERSION, SyncedProgressCardSettings } from './syncTypes';

const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function clampPlannerHistoryDays(days?: number): number {
    if (typeof days !== 'number' || Number.isNaN(days)) return SYNC_DEFAULT_PLANNER_HISTORY_DAYS;
    if (days < 0) return 0;
    return Math.floor(days);
}

export function filterPlannerTasksForSync(tasks: SyncPayloadInput['plannerTasks'], now: Date, plannerHistoryDays = SYNC_DEFAULT_PLANNER_HISTORY_DAYS) {
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

export function toSyncedProgressCardSettings(settings: SyncPayloadInput['progressCardSettings']): SyncedProgressCardSettings {
    return {
        userName: settings?.userName ?? '',
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
    };
}

export function buildSyncPayload(input: SyncPayloadInput): SyncPayloadV1 {
    const now = input.now ?? new Date();
    const generatedAt = input.generatedAt ?? now.toISOString();
    const plannerHistoryDays = clampPlannerHistoryDays(input.plannerHistoryDays);

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
                // customAvatarUrl is intentionally excluded from sync.
                progressCardSettings: toSyncedProgressCardSettings(input.progressCardSettings),
            },
            subjects: input.subjects,
        },
    };

    if (!input.subjects) {
        delete payload.domains.subjects;
    }

    return payload;
}
