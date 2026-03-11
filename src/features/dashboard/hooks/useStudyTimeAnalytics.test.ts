import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStudyTimeAnalytics } from './useStudyTimeAnalytics';
import { StudySession } from '../../../shared/types';

describe('useStudyTimeAnalytics', () => {
    const mockSessions: StudySession[] = [
        {
            id: '1',
            title: 'Session 1',
            startTime: '2025-03-01T10:00:00Z',
            endTime: '2025-03-01T11:00:00Z',
            duration: 3600, // 1 hour
            type: 'chapter',
            subject: 'physics'
        },
        {
            id: '2',
            title: 'Session 2',
            startTime: '2025-03-01T12:00:00Z',
            endTime: '2025-03-01T12:30:00Z',
            duration: 1800, // 0.5 hour
            type: 'chapter',
            subject: 'chemistry'
        }
    ];

    beforeEach(() => {
        vi.useFakeTimers();
        // Set fixed date to March 5th, 2025 (Wednesday)
        vi.setSystemTime(new Date(2025, 2, 5));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should calculate weekly analytics correctly', () => {
        const { result } = renderHook(() => useStudyTimeAnalytics(mockSessions, 0, 'weekly'));
        
        // Match weekday labels
        expect(result.current.labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
        
        // March 1st 2025 is Saturday. Monday of that week is Feb 24th if offset is correctly handled.
        // Wait, getWeekDays in analyticsUtils.ts:
        // monday.setDate(today.getDate() - today.getDay() + 1 + (offset * 7));
        // Today is Wed (3). 5 - 3 + 1 = 3. So Monday is March 3rd.
        // Saturday (March 1st) is not in this week.
        
        // Let's test with a date that contains the mock sessions
        // March 1st 2025 is Saturday. We need to offset to that week.
        // Today (March 5) is in the week starting March 3.
        // Week starting Feb 24 contains March 1. That's offset -1.
        
        const { result: weekBefore } = renderHook(() => useStudyTimeAnalytics(mockSessions, -1, 'weekly'));
        
        const physicsDataset = weekBefore.current.datasets.find(d => d.label === 'Physics');
        const chemistryDataset = weekBefore.current.datasets.find(d => d.label === 'Chemistry');
        
        // Saturday (index 5) should have 1.0 for Physics and 0.5 for Chemistry
        expect(physicsDataset?.data[5]).toBe(1.0);
        expect(chemistryDataset?.data[5]).toBe(0.5);
    });

    it('should calculate monthly analytics correctly', () => {
        const { result } = renderHook(() => useStudyTimeAnalytics(mockSessions, 0, 'monthly'));
        
        // March has 31 days
        expect(result.current.labels).toHaveLength(31);
        
        const overallDataset = result.current.datasets.find(d => d.label === 'Overall');
        const physicsDataset = result.current.datasets.find(d => d.label === 'Physics');
        const chemistryDataset = result.current.datasets.find(d => d.label === 'Chemistry');
        
        // March 1st (index 0) should have 1.0 for Physics and 0.5 for Chemistry
        expect(overallDataset?.data[0]).toBe(1.5);
        expect(physicsDataset?.data[0]).toBe(1.0);
        expect(chemistryDataset?.data[0]).toBe(0.5);
    });
});
