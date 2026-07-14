import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { UserProgressProvider, useUserProgress } from '../UserProgressContext';
import { SubjectDataProvider } from '../SubjectDataContext';
import { ThemeProvider } from '../ThemeContext';

describe('UserProgressContext Exam Handlers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>
      <SubjectDataProvider>
        <UserProgressProvider>{children}</UserProgressProvider>
      </SubjectDataProvider>
    </ThemeProvider>
  );

  it('handleSetFavouriteExam sets exclusivity and clears with null', () => {
    const { result } = renderHook(() => useUserProgress(), { wrapper });

    act(() => {
      result.current.handleAddExam({ name: 'Exam 1', date: '2026-10-01', isPrimary: true, isFavourite: true });
      result.current.handleAddExam({ name: 'Exam 2', date: '2026-11-01', isPrimary: false, isFavourite: false });
    });

    // We should have 2 exams, one of them favourite
    expect(result.current.examDates).toHaveLength(2);
    const exam1 = result.current.examDates.find((e) => e.name === 'Exam 1')!;
    const exam2 = result.current.examDates.find((e) => e.name === 'Exam 2')!;
    expect(exam1.isFavourite).toBe(true);
    expect(exam2.isFavourite).toBeFalsy();

    // Now set exam 2 as favourite
    act(() => {
      result.current.handleSetFavouriteExam(exam2.id);
    });

    expect(result.current.examDates.find((e) => e.id === exam1.id)?.isFavourite).toBe(false);
    expect(result.current.examDates.find((e) => e.id === exam2.id)?.isFavourite).toBe(true);

    // Now clear favourite exam (pass null)
    act(() => {
      result.current.handleSetFavouriteExam(null);
    });

    expect(result.current.examDates.find((e) => e.id === exam1.id)?.isFavourite).toBe(false);
    expect(result.current.examDates.find((e) => e.id === exam2.id)?.isFavourite).toBe(false);
  });

  it('handleSetExamSyllabus sets syllabus for target exam only', () => {
    const { result } = renderHook(() => useUserProgress(), { wrapper });

    act(() => {
      result.current.handleAddExam({ name: 'Mains', date: '2026-10-01', isPrimary: true });
    });

    const exam = result.current.examDates[0];
    const newSyllabus = { physics: [1, 2], chemistry: [10] };

    act(() => {
      result.current.handleSetExamSyllabus(exam.id, newSyllabus);
    });

    expect(result.current.examDates[0].syllabus).toEqual(newSyllabus);
  });
});
