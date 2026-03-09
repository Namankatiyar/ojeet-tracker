import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useChapterSort } from './useChapterSort';
import { Chapter, SubjectProgress } from '../../../shared/types';

describe('useChapterSort', () => {
    const chapters: Chapter[] = [
        { serial: 1, name: 'Chapter 1', materials: ['NCERT'] },
        { serial: 2, name: 'Chapter 2', materials: ['NCERT'] },
        { serial: 3, name: 'Chapter 3', materials: ['NCERT'] }
    ];

    const progress: SubjectProgress = {
        1: { completed: {}, priority: 'high' },
        2: { completed: {}, priority: 'low' },
        3: { completed: {}, priority: 'medium' }
    };

    it('should return all chapters unsorted when filter is "all"', () => {
        const { result } = renderHook(() => useChapterSort(chapters, progress, 'all'));
        expect(result.current).toEqual(chapters);
    });

    it('should sort sessions by priority correctly (High > Medium > Low)', () => {
        // When filtered, it sorts based on priority weight
        const { result } = renderHook(() => useChapterSort(chapters, progress, 'high')); // filter doesn't strictly exclude yet based on code, it sorts matching first
        
        // Based on logic:
        // if (pA === priorityFilter && pB !== priorityFilter) return -1;
        // matching filter comes first
        expect(result.current[0].serial).toBe(1); // High (matching filter)
        expect(result.current[1].serial).toBe(3); // Medium
        expect(result.current[2].serial).toBe(2); // Low
    });

    it('should move matching priority to top', () => {
        const { result } = renderHook(() => useChapterSort(chapters, progress, 'medium'));
        expect(result.current[0].serial).toBe(3); // Medium (matching filter)
    });
});
