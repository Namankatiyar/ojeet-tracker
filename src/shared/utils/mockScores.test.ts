import { describe, expect, it } from 'vitest';
import { MockScore } from '../types';
import {
  getMockExamType,
  getMockMaxMarks,
  getMockPaperTotal,
  getMockSubjectTotals,
  getMockTotalMarks,
} from './mockScores';

describe('mockScores utils', () => {
  it('defaults legacy mock entries to JM semantics', () => {
    const score: MockScore = {
      id: 'legacy',
      name: 'Legacy Mock',
      date: '2026-03-09',
      physicsMarks: 71,
      chemistryMarks: 65,
      mathsMarks: 80,
      totalMarks: 216,
    };

    expect(getMockExamType(score)).toBe('jm');
    expect(getMockSubjectTotals(score)).toEqual({
      physics: 71,
      chemistry: 65,
      maths: 80,
    });
    expect(getMockTotalMarks(score)).toBe(216);
    expect(getMockMaxMarks(score)).toBe(300);
  });

  it('aggregates JA scores across both papers', () => {
    const score: MockScore = {
      id: 'ja-1',
      name: 'JA Mock',
      date: '2026-03-09',
      examType: 'ja',
      physicsMarks: 82,
      chemistryMarks: 74,
      mathsMarks: 91,
      totalMarks: 247,
      maxMarks: 360,
      paper1Marks: {
        physics: 42,
        chemistry: 36,
        maths: 45,
      },
      paper2Marks: {
        physics: 40,
        chemistry: 38,
        maths: 46,
      },
    };

    expect(getMockPaperTotal(score, 'paper1')).toBe(123);
    expect(getMockPaperTotal(score, 'paper2')).toBe(124);
    expect(getMockSubjectTotals(score)).toEqual({
      physics: 82,
      chemistry: 74,
      maths: 91,
    });
    expect(getMockTotalMarks(score)).toBe(247);
    expect(getMockMaxMarks(score)).toBe(360);
  });
});
