import { useMemo } from 'react';
import { Chapter, SubjectProgress, Priority } from '../../../shared/types';

function getPriorityWeight(p: Priority): number {
    switch (p) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
    }
}

/**
 * Memoized chapter sorting/filtering based on priority filter.
 * Replaces the inline IIFE that was sorting on every render.
 */
export function useChapterSort(
    chapters: Chapter[],
    progress: SubjectProgress,
    priorityFilter: Priority | 'all'
): Chapter[] {
    return useMemo(() => {
        if (priorityFilter === 'all') return chapters;

        const sorted = [...chapters];
        sorted.sort((a, b) => {
            const pA = progress[a.serial]?.priority || 'none';
            const pB = progress[b.serial]?.priority || 'none';

            // Matching filter items come first
            if (pA === priorityFilter && pB !== priorityFilter) return -1;
            if (pA !== priorityFilter && pB === priorityFilter) return 1;

            // Otherwise sort by weight descending (High > Medium > Low > None)
            return getPriorityWeight(pB) - getPriorityWeight(pA);
        });

        return sorted;
    }, [chapters, progress, priorityFilter]);
}
