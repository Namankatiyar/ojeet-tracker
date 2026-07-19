import { describe, expect, it } from 'vitest';
import { MockScore, MockExamPreset } from '../types';
import {
  getMockExamType,
  getMockDefaultMaxMarks,
  getMockMaxMarks,
  getMockPaperTotal,
  getMockSubjectTotals,
  getMockTotalMarks,
  filterMockScoresByMode,
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
      biology: undefined,
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
      biology: 0,
    });
    expect(getMockTotalMarks(score)).toBe(247);
    expect(getMockMaxMarks(score)).toBe(360);
  });

  it('handles negative subject marks (JEE negative marking)', () => {
    const score: MockScore = {
      id: 'neg-1',
      name: 'Rough Mock',
      date: '2026-07-05',
      physicsMarks: -12,
      chemistryMarks: 5,
      mathsMarks: -8,
      totalMarks: -15,
      maxMarks: 300,
    };

    expect(getMockSubjectTotals(score)).toEqual({
      physics: -12,
      chemistry: 5,
      maths: -8,
      biology: undefined,
    });
    expect(getMockTotalMarks(score)).toBe(-15);
    expect(getMockMaxMarks(score)).toBe(300);
  });
});

describe('getMockDefaultMaxMarks with biology', () => {
  const neetPreset: MockExamPreset = {
    id: 'neet',
    name: 'NEET UG',
    shortName: 'NEET',
    paperCount: 1,
    subjectMaxMarks: { physics: 180, chemistry: 180, maths: 0, biology: 360 },
    targetScore: 650,
  };

  it('sums biology marks when present', () => {
    expect(getMockDefaultMaxMarks(neetPreset)).toBe(720); // 180+180+360
  });

  it('ignores maths: 0 in sum', () => {
    const marks = getMockDefaultMaxMarks(neetPreset);
    expect(marks).not.toBe(0);
  });
});

describe('filterMockScoresByMode', () => {
  const jeeScore: MockScore = {
    id: '1', name: 'JEE test', date: '2026-01-01',
    physicsMarks: 90, chemistryMarks: 80, mathsMarks: 70, totalMarks: 240,
    examMode: 'jee',
  };
  const neetScore: MockScore = {
    id: '2', name: 'NEET test', date: '2026-01-02',
    physicsMarks: 150, chemistryMarks: 140, mathsMarks: 0, biologyMarks: 300, totalMarks: 590,
    examMode: 'neet',
  };
  const untaggedScore: MockScore = {
    id: '3', name: 'Old test', date: '2025-01-01',
    physicsMarks: 70, chemistryMarks: 60, mathsMarks: 50, totalMarks: 180,
  };

  it('jee mode returns jee and untagged scores', () => {
    const result = filterMockScoresByMode([jeeScore, neetScore, untaggedScore], 'jee');
    expect(result.map(s => s.id)).toEqual(['1', '3']);
  });

  it('neet mode returns only neet scores', () => {
    const result = filterMockScoresByMode([jeeScore, neetScore, untaggedScore], 'neet');
    expect(result.map(s => s.id)).toEqual(['2']);
  });
});
