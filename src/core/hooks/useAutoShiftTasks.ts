import { useEffect } from 'react';
import { formatDateLocal } from '../../shared/utils/date';
import { PlannerTask } from '../../shared/types';

export const useAutoShiftTasks = (
    setPlannerTasks: (tasks: PlannerTask[] | ((prev: PlannerTask[]) => PlannerTask[])) => void,
    disableAutoShift: boolean
) => {
    useEffect(() => {
        if (disableAutoShift) return;

        const todayStr = formatDateLocal(new Date());
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        setPlannerTasks(currentTasks => {
            let shifted = false;
            const updatedTasks = currentTasks.map(task => {
                if (task.completed) return task;
                const taskDate = new Date(task.date);
                taskDate.setHours(0, 0, 0, 0);
                if (taskDate < today) {
                    shifted = true;
                    return { ...task, date: todayStr, wasShifted: true };
                }
                return task;
            });
            return shifted ? updatedTasks : currentTasks;
        });
    }, [disableAutoShift, setPlannerTasks]);
};
