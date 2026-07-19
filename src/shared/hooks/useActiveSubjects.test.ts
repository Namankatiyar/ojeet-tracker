import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useActiveSubjects } from './useActiveSubjects';

// Mock the UserProgressContext hook
vi.mock('../../core/context/UserProgressContext', () => ({
  useUserProgress: vi.fn(),
}));

import { useUserProgress } from '../../core/context/UserProgressContext';

describe('useActiveSubjects', () => {
  it('returns subjects and metadata for jee mode', () => {
    vi.mocked(useUserProgress).mockReturnValue({
      examMode: 'jee',
    } as any);

    const { result } = renderHook(() => useActiveSubjects());

    expect(result.current.examMode).toBe('jee');
    expect(result.current.subjects).toEqual(['physics', 'chemistry', 'maths']);
    expect(result.current.subjectMeta).toHaveLength(3);
    expect(result.current.subjectMeta[0].key).toBe('physics');
    expect(result.current.subjectMeta[2].key).toBe('maths');
  });

  it('returns subjects and metadata for neet mode', () => {
    vi.mocked(useUserProgress).mockReturnValue({
      examMode: 'neet',
    } as any);

    const { result } = renderHook(() => useActiveSubjects());

    expect(result.current.examMode).toBe('neet');
    expect(result.current.subjects).toEqual(['physics', 'chemistry', 'biology']);
    expect(result.current.subjectMeta).toHaveLength(3);
    expect(result.current.subjectMeta[0].key).toBe('physics');
    expect(result.current.subjectMeta[2].key).toBe('biology');
  });
});
