import { useMemo } from 'react';
import { PlannerTask, StudySession } from '../../../shared/types';

/**
 * Sorts an array of tasks based on their status and time.
 * Priority: 1. New/Incomplete, 2. Shifted/Delayed, 3. Completed.
 * Within each category, tasks are sorted by their scheduled time.
 */
const sortTasks = (a: PlannerTask, b: PlannerTask) => {
    const aIsCompleted = a.completed;
    const bIsCompleted = b.completed;
    const aIsShifted = a.wasShifted && !a.completed;
    const bIsShifted = b.wasShifted && !b.completed;
    const aIsNew = !a.completed && !a.wasShifted;
    const bIsNew = !b.completed && !b.wasShifted;

    // New tasks come first
    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;

    // Then shifted/delayed tasks
    if (aIsShifted && !bIsShifted && !bIsNew) return -1;
    if (!aIsShifted && !aIsNew && bIsShifted) return 1;

    // Completed tasks come last
    if (aIsCompleted && !bIsCompleted) return 1;
    if (!aIsCompleted && bIsCompleted) return -1;

    // Within the same category, sort by time
    return a.time.localeCompare(b.time);
};

/**
 * A hook to process and group planner tasks and study sessions for efficient access.
 * This is a key performance optimization to prevent re-filtering large arrays on every render.
 * @param tasks - The raw array of planner tasks.
 * @param sessions - The raw array of study sessions.
 * @returns Memoized maps of tasks and sessions grouped by date string ('YYYY-MM-DD').
 */
export function usePlannerData(tasks: PlannerTask[], sessions: StudySession[]) {
    const groupedTasks = useMemo(() => {
        const taskMap = new Map<string, PlannerTask[]>();
        for (const task of tasks) {
            const dateKey = task.date;
            if (!taskMap.has(dateKey)) {
                taskMap.set(dateKey, []);
            }
            taskMap.get(dateKey)!.push(task);
        }
        // Sort tasks within each day
        for (const dailyTasks of taskMap.values()) {
            dailyTasks.sort(sortTasks);
        }
        return taskMap;
    }, [tasks]);

    const groupedSessions = useMemo(() => {
        const sessionMap = new Map<string, StudySession[]>();
        for (const session of sessions) {
            const dateKey = session.startTime.slice(0, 10); // Get 'YYYY-MM-DD' from ISO string
            if (!sessionMap.has(dateKey)) {
                sessionMap.set(dateKey, []);
            }
            sessionMap.get(dateKey)!.push(session);
        }
        return sessionMap;
    }, [sessions]);

    return { groupedTasks, groupedSessions };
}
