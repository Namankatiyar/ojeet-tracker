import { describe, expect, it } from 'vitest';
import { ChapterProgress } from '../../../shared/types';
import { getTotalAttemptedQuestions, hasChapterDetailData } from './chapterDetail';

describe('chapter detail helpers', () => {
    it('returns no detail data for empty progress', () => {
        const progress: ChapterProgress = { completed: {}, priority: 'none' };

        expect(hasChapterDetailData(progress)).toBe(false);
        expect(getTotalAttemptedQuestions(progress)).toBe(0);
    });

    it('sums positive attempted question counts', () => {
        const progress: ChapterProgress = {
            completed: {},
            priority: 'none',
            detail: {
                attemptedByMaterial: {
                    NCERT: 12,
                    PYQs: 35,
                    Modules: 0,
                },
            },
        };

        expect(hasChapterDetailData(progress)).toBe(true);
        expect(getTotalAttemptedQuestions(progress)).toBe(47);
    });

    it('treats confidence, date, and notes as detail data', () => {
        expect(hasChapterDetailData({
            completed: {},
            priority: 'none',
            detail: { attemptedByMaterial: {}, confidence: 3 },
        })).toBe(true);

        expect(hasChapterDetailData({
            completed: {},
            priority: 'none',
            detail: { attemptedByMaterial: {}, lastRevised: '2026-06-18' },
        })).toBe(true);

        expect(hasChapterDetailData({
            completed: {},
            priority: 'none',
            detail: { attemptedByMaterial: {}, notes: 'Revise errors' },
        })).toBe(true);
    });
});
