import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { UserProgressProvider, useUserProgress } from './UserProgressContext';

// Define mocks for context dependencies
const mockMergedSubjectData = {
  physics: {
    materialNames: ['NCERT', 'PYQs', 'Modules'],
    chapters: [
      {
        serial: 1,
        name: 'Physical World',
        materials: ['NCERT', 'PYQs', 'Modules'],
        subtopics: ['Subtopic A', 'Subtopic B'],
      },
      {
        serial: 2,
        name: 'Units and Measurements',
        materials: ['NCERT', 'PYQs', 'Modules'],
        subtopics: [], // Chapter without subtopics
      },
    ],
  },
  chemistry: null,
  maths: null,
};

vi.mock('./SubjectDataContext', () => ({
  useSubjectData: () => ({
    mergedSubjectData: mockMergedSubjectData,
    subjectData: mockMergedSubjectData,
    setSubjectData: vi.fn(),
    customColumns: { physics: [], chemistry: [], maths: [] },
    setCustomColumns: vi.fn(),
    excludedColumns: { physics: [], chemistry: [], maths: [] },
    setExcludedColumns: vi.fn(),
    materialOrder: { physics: [], chemistry: [], maths: [] },
    setMaterialOrder: vi.fn(),
  }),
}));

vi.mock('./ThemeContext', () => ({
  useTheme: () => ({
    accentColor: '#00ffff',
  }),
}));

vi.mock('../../shared/utils/confetti', () => ({
  triggerSmallConfetti: vi.fn(),
}));

describe('UserProgressContext - handleUpdateSubtopicAttempted', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserProgressProvider>{children}</UserProgressProvider>
  );

  it('should correctly log daily questions count when updating from 0', () => {
    const { result } = renderHook(() => useUserProgress(), { wrapper });

    // Update Subtopic A NCERT attempted count to 50
    act(() => {
      result.current.handleUpdateSubtopicAttempted('physics', 1, 'Subtopic A', 'NCERT', 50);
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    expect(result.current.dailyQuestionLogs[todayStr]).toBe(50);
    expect(
      result.current.progress.physics[1]?.subtopics?.['Subtopic A']?.attemptedByMaterial?.['NCERT']
    ).toBe(50);
  });

  it('should handle keystrokes in rapid succession (batching) when updating from 50 to 60', () => {
    // Pre-populate state: 50 questions already attempted
    const initialProgressState = {
      physics: {
        1: {
          completed: {},
          priority: 'none',
          subtopics: {
            'Subtopic A': {
              completed: {},
              attemptedByMaterial: {
                NCERT: 50,
              },
            },
          },
        },
      },
      chemistry: {},
      maths: {},
    };
    window.localStorage.setItem('jee-tracker-progress', JSON.stringify(initialProgressState));

    const { result } = renderHook(() => useUserProgress(), { wrapper });

    expect(
      result.current.progress.physics[1]?.subtopics?.['Subtopic A']?.attemptedByMaterial?.['NCERT']
    ).toBe(50);

    act(() => {
      result.current.handleUpdateSubtopicAttempted('physics', 1, 'Subtopic A', 'NCERT', 0);
      result.current.handleUpdateSubtopicAttempted('physics', 1, 'Subtopic A', 'NCERT', 60);
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    expect(result.current.dailyQuestionLogs[todayStr]).toBe(10);
    expect(
      result.current.progress.physics[1]?.subtopics?.['Subtopic A']?.attemptedByMaterial?.['NCERT']
    ).toBe(60);
  });

  it('should handle keystrokes across separate updates (non-batched) when updating from 50 to 60', () => {
    const initialProgressState = {
      physics: {
        1: {
          completed: {},
          priority: 'none',
          subtopics: {
            'Subtopic A': {
              completed: {},
              attemptedByMaterial: {
                NCERT: 50,
              },
            },
          },
        },
      },
      chemistry: {},
      maths: {},
    };
    window.localStorage.setItem('jee-tracker-progress', JSON.stringify(initialProgressState));

    const { result } = renderHook(() => useUserProgress(), { wrapper });

    expect(
      result.current.progress.physics[1]?.subtopics?.['Subtopic A']?.attemptedByMaterial?.['NCERT']
    ).toBe(50);

    act(() => {
      result.current.handleUpdateSubtopicAttempted('physics', 1, 'Subtopic A', 'NCERT', 0);
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    expect(
      result.current.progress.physics[1]?.subtopics?.['Subtopic A']?.attemptedByMaterial?.['NCERT']
    ).toBe(0);
    expect(result.current.dailyQuestionLogs[todayStr]).toBe(-50);

    act(() => {
      result.current.handleUpdateSubtopicAttempted('physics', 1, 'Subtopic A', 'NCERT', 60);
    });

    expect(result.current.dailyQuestionLogs[todayStr]).toBe(10);
    expect(
      result.current.progress.physics[1]?.subtopics?.['Subtopic A']?.attemptedByMaterial?.['NCERT']
    ).toBe(60);
  });

  it('should NOT overwrite other study material chapter totals when updating one subtopic material', () => {
    // Pre-populate state: Subtopic A has NCERT=50, PYQs=20. Chapter-level detail also has NCERT=50, PYQs=20.
    const initialProgressState = {
      physics: {
        1: {
          completed: {},
          priority: 'none',
          detail: {
            attemptedByMaterial: {
              NCERT: 50,
              PYQs: 20,
              Modules: 0,
            },
          },
          subtopics: {
            'Subtopic A': {
              completed: {},
              attemptedByMaterial: {
                NCERT: 50,
                PYQs: 20,
              },
            },
          },
        },
      },
      chemistry: {},
      maths: {},
    };
    window.localStorage.setItem('jee-tracker-progress', JSON.stringify(initialProgressState));

    const { result } = renderHook(() => useUserProgress(), { wrapper });

    // Update Subtopic A NCERT from 50 to 60.
    act(() => {
      result.current.handleUpdateSubtopicAttempted('physics', 1, 'Subtopic A', 'NCERT', 60);
    });

    // Verify that NCERT is updated to 60, but PYQs remains 20 (and doesn't get set to 60 or zeroed out)
    const detail = result.current.progress.physics[1].detail;
    expect(detail?.attemptedByMaterial?.['NCERT']).toBe(60);
    expect(detail?.attemptedByMaterial?.['PYQs']).toBe(20);
  });
});

describe('UserProgressContext - handleUpdateChapterDetail', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserProgressProvider>{children}</UserProgressProvider>
  );

  it('should correctly log daily questions count when updating chapter-level count from 0', () => {
    const { result } = renderHook(() => useUserProgress(), { wrapper });

    act(() => {
      result.current.handleUpdateChapterDetail('physics', 2, {
        attemptedByMaterial: {
          NCERT: 15,
        },
      });
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    expect(result.current.dailyQuestionLogs[todayStr]).toBe(15);
    expect(result.current.progress.physics[2]?.detail?.attemptedByMaterial?.['NCERT']).toBe(15);
  });

  it('should correctly log daily questions count when updating chapter-level count from 15 to 25', () => {
    const initialProgressState = {
      physics: {
        2: {
          completed: {},
          priority: 'none',
          detail: {
            attemptedByMaterial: {
              NCERT: 15,
            },
          },
        },
      },
      chemistry: {},
      maths: {},
    };
    window.localStorage.setItem('jee-tracker-progress', JSON.stringify(initialProgressState));

    const { result } = renderHook(() => useUserProgress(), { wrapper });

    expect(result.current.progress.physics[2]?.detail?.attemptedByMaterial?.['NCERT']).toBe(15);

    act(() => {
      result.current.handleUpdateChapterDetail('physics', 2, {
        attemptedByMaterial: {
          NCERT: 25,
        },
      });
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    // Net increase is +10 questions
    expect(result.current.dailyQuestionLogs[todayStr]).toBe(10);
    expect(result.current.progress.physics[2]?.detail?.attemptedByMaterial?.['NCERT']).toBe(25);
  });

  it('should handle rapid keystroke updates (batching) when updating chapter-level count', () => {
    const initialProgressState = {
      physics: {
        2: {
          completed: {},
          priority: 'none',
          detail: {
            attemptedByMaterial: {
              NCERT: 15,
            },
          },
        },
      },
      chemistry: {},
      maths: {},
    };
    window.localStorage.setItem('jee-tracker-progress', JSON.stringify(initialProgressState));

    const { result } = renderHook(() => useUserProgress(), { wrapper });

    expect(result.current.progress.physics[2]?.detail?.attemptedByMaterial?.['NCERT']).toBe(15);

    act(() => {
      result.current.handleUpdateChapterDetail('physics', 2, {
        attemptedByMaterial: {
          NCERT: 0,
        },
      });
      result.current.handleUpdateChapterDetail('physics', 2, {
        attemptedByMaterial: {
          NCERT: 25,
        },
      });
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    // Net increase should be +10 questions
    expect(result.current.dailyQuestionLogs[todayStr]).toBe(10);
    expect(result.current.progress.physics[2]?.detail?.attemptedByMaterial?.['NCERT']).toBe(25);
  });
});
