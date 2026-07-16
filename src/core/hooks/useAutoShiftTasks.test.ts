import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAutoShiftTasks } from './useAutoShiftTasks';
import { PlannerTask } from '../../shared/types';
import * as dateUtils from '../../shared/utils/date';

describe('useAutoShiftTasks', () => {
  let setPlannerTasksMock: any;

  beforeEach(() => {
    setPlannerTasksMock = vi.fn();
    vi.spyOn(dateUtils, 'getLogicalTodayStr').mockReturnValue('2026-07-15');
    vi.spyOn(dateUtils, 'getLogicalDate').mockReturnValue(new Date(2026, 6, 15, 12, 0, 0)); // July 15, 2026
  });

  it('should not shift tasks if disableAutoShift is true', () => {
    renderHook(() => useAutoShiftTasks([], setPlannerTasksMock, true, 0));
    expect(setPlannerTasksMock).not.toHaveBeenCalled();
  });

  it('should shift past, incomplete tasks to today when disableAutoShift is false', () => {
    const mockTasks: PlannerTask[] = [
      { id: '1', title: 'Task 1', date: '2026-07-14', time: '10:00', completed: false, type: 'custom' },
      { id: '2', title: 'Task 2', date: '2026-07-14', time: '11:00', completed: true, type: 'custom' },
      { id: '3', title: 'Task 3', date: '2026-07-15', time: '12:00', completed: false, type: 'custom' },
      { id: '4', title: 'Task 4', date: '2026-07-16', time: '13:00', completed: false, type: 'custom' },
    ];

    setPlannerTasksMock.mockImplementation((fn: any) => {
      const result = fn(mockTasks);
      expect(result).toEqual([
        { id: '1', title: 'Task 1', date: '2026-07-15', time: '10:00', completed: false, wasShifted: true, type: 'custom' },
        { id: '2', title: 'Task 2', date: '2026-07-14', time: '11:00', completed: true, type: 'custom' },
        { id: '3', title: 'Task 3', date: '2026-07-15', time: '12:00', completed: false, type: 'custom' },
        { id: '4', title: 'Task 4', date: '2026-07-16', time: '13:00', completed: false, type: 'custom' },
      ]);
    });

    renderHook(() => useAutoShiftTasks(mockTasks, setPlannerTasksMock, false, 0));
    expect(setPlannerTasksMock).toHaveBeenCalled();
  });
});
