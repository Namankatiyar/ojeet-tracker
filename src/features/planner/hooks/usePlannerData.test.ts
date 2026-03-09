import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePlannerData } from './usePlannerData';
import { PlannerTask, StudySession } from '../../../shared/types';

describe('usePlannerData', () => {
    const mockTasks: PlannerTask[] = [
        {
            id: '1',
            date: '2025-03-01',
            time: '14:00',
            title: 'Task 1',
            completed: true,
            type: 'chapter',
            subject: 'physics'
        },
        {
            id: '2',
            date: '2025-03-01',
            time: '09:00',
            title: 'Task 2',
            completed: false,
            type: 'chapter',
            subject: 'chemistry'
        },
        {
            id: '3',
            date: '2025-03-02',
            time: '10:00',
            title: 'Task 3',
            completed: false,
            type: 'chapter',
            subject: 'maths'
        }
    ];

    const mockSessions: StudySession[] = [
        {
            id: 's1',
            title: 'Session 1',
            startTime: '2025-03-01T14:00:00Z',
            endTime: '2025-03-01T15:00:00Z',
            duration: 3600,
            type: 'chapter',
            subject: 'physics',
            chapterName: 'Mechanics'
        }
    ];

    it('should group tasks by date', () => {
        const { result } = renderHook(() => usePlannerData(mockTasks, mockSessions));
        
        expect(result.current.groupedTasks.has('2025-03-01')).toBe(true);
        expect(result.current.groupedTasks.has('2025-03-02')).toBe(true);
        expect(result.current.groupedTasks.get('2025-03-01')).toHaveLength(2);
    });

    it('should sort tasks correctly (incomplete first, then by time)', () => {
        const { result } = renderHook(() => usePlannerData(mockTasks, mockSessions));
        const day1Tasks = result.current.groupedTasks.get('2025-03-01')!;
        
        // Task 2 (incomplete, 09:00) should be before Task 1 (completed, 14:00)
        expect(day1Tasks[0].id).toBe('2');
        expect(day1Tasks[1].id).toBe('1');
    });

    it('should group sessions by date', () => {
        const { result } = renderHook(() => usePlannerData(mockTasks, mockSessions));
        
        expect(result.current.groupedSessions.has('2025-03-01')).toBe(true);
        expect(result.current.groupedSessions.get('2025-03-01')).toHaveLength(1);
    });
});
