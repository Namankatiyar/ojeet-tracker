import { describe, it, expect } from 'vitest';
import { getActiveSubjects, JEE_SUBJECTS, NEET_SUBJECTS, SUBJECT_META } from './subjects';

describe('getActiveSubjects', () => {
  it('returns JEE subjects for jee mode', () => {
    expect(getActiveSubjects('jee')).toEqual(['physics', 'chemistry', 'maths']);
  });
  it('returns NEET subjects for neet mode', () => {
    expect(getActiveSubjects('neet')).toEqual(['physics', 'chemistry', 'biology']);
  });
  it('JEE_SUBJECTS has no biology', () => {
    expect(JEE_SUBJECTS).not.toContain('biology');
  });
  it('NEET_SUBJECTS has no maths', () => {
    expect(NEET_SUBJECTS).not.toContain('maths');
  });
  it('SUBJECT_META has entries for all four subjects', () => {
    expect(Object.keys(SUBJECT_META)).toEqual(
      expect.arrayContaining(['physics', 'chemistry', 'maths', 'biology'])
    );
  });
  it('biology colorVar references --biology CSS var', () => {
    expect(SUBJECT_META.biology.colorVar).toBe('var(--biology)');
  });
});
