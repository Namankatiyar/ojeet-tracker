import { useMemo } from 'react';
import { PlannerTask, StudySession } from '../../../shared/types';

interface DayData {
    tasks: PlannerTask[];
    totalStudySeconds: number;
}

/**
 * Hook to efficiently aggregate tasks and study sessions for a specific month.
 * Returns a Map keyed by 'YYYY-MM-DD' date strings with pre-aggregated data.
 * Study time is summed once per month change for performance.
 */
export function useMonthlyData(
    tasks: PlannerTask[],
    sessions: StudySession[],
    year: number,
    month: number
) {
    const monthData = useMemo(() => {
        const data = new Map<string, DayData>();

        // Helper to ensure a DayData entry exists
        const ensureDay = (key: string): DayData => {
            if (!data.has(key)) {
                data.set(key, { tasks: [], totalStudySeconds: 0 });
            }
            return data.get(key)!;
        };

        // Build month boundary strings for fast filtering
        const monthStr = String(month + 1).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;

        // Group tasks for this month
        for (const task of tasks) {
            if (task.date.startsWith(prefix)) {
                ensureDay(task.date).tasks.push(task);
            }
        }

        // Aggregate session durations for this month
        for (const session of sessions) {
            const dateKey = session.startTime.slice(0, 10);
            if (dateKey.startsWith(prefix)) {
                ensureDay(dateKey).totalStudySeconds += session.duration;
            }
        }

        return data;
    }, [tasks, sessions, year, month]);

    const getDayData = (dateStr: string): DayData => {
        return monthData.get(dateStr) || { tasks: [], totalStudySeconds: 0 };
    };

    return { monthData, getDayData };
}
