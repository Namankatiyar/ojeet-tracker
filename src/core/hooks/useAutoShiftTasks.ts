import { useEffect } from 'react';
import { getLogicalTodayStr, getLogicalDate, parseDateLocal } from '../../shared/utils/date';
import { PlannerTask } from '../../shared/types';

export const useAutoShiftTasks = (
  plannerTasks: PlannerTask[],
  setPlannerTasks: (tasks: PlannerTask[] | ((prev: PlannerTask[]) => PlannerTask[])) => void,
  disableAutoShift: boolean,
  dailyResetHour: number = 0
) => {
  useEffect(() => {
    if (disableAutoShift) return;

    const todayStr = getLogicalTodayStr(dailyResetHour);
    const today = getLogicalDate(dailyResetHour);
    today.setHours(0, 0, 0, 0);

    setPlannerTasks((currentTasks) => {
      let shifted = false;
      const updatedTasks = currentTasks.map((task) => {
        if (task.completed) return task;
        const taskDate = parseDateLocal(task.date);
        if (!taskDate) return task;
        taskDate.setHours(0, 0, 0, 0);
        if (taskDate < today) {
          shifted = true;
          return { ...task, date: todayStr, wasShifted: true };
        }
        return task;
      });
      return shifted ? updatedTasks : currentTasks;
    });
  }, [plannerTasks, disableAutoShift, setPlannerTasks, dailyResetHour]);
};

