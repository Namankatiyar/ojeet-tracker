import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubjectDataProvider, useSubjectData } from '../SubjectDataContext';

describe('SubjectDataContext offline bundled integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SubjectDataProvider>{children}</SubjectDataProvider>
  );

  it('provides all 4 subjects immediately without network fetch', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('Network fetch must not be invoked');
    });

    const { result } = renderHook(() => useSubjectData(), { wrapper });

    expect(fetchSpy).not.toHaveBeenCalled();

    // Check mergedSubjectData has all 4 subjects populated immediately
    const { mergedSubjectData } = result.current;
    expect(mergedSubjectData.physics).not.toBeNull();
    expect(mergedSubjectData.chemistry).not.toBeNull();
    expect(mergedSubjectData.maths).not.toBeNull();
    expect(mergedSubjectData.biology).not.toBeNull();

    expect(mergedSubjectData.physics?.chapters).toHaveLength(25);
    expect(mergedSubjectData.chemistry?.chapters).toHaveLength(25);
    expect(mergedSubjectData.maths?.chapters).toHaveLength(25);
    expect(mergedSubjectData.biology?.chapters).toHaveLength(33);

    // Verify subtopics are populated
    expect(mergedSubjectData.physics?.chapters[0].subtopics?.length).toBeGreaterThan(0);
    expect(mergedSubjectData.biology?.chapters[0].subtopics?.length).toBeGreaterThan(0);
  });

  it('falls back to bundled data if localStorage has null for a subject', async () => {
    // Simulate legacy or corrupt localStorage with null subjectData
    window.localStorage.setItem(
      'jee-tracker-subject-data',
      JSON.stringify({ physics: null, chemistry: null, maths: null, biology: null })
    );

    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useSubjectData(), { wrapper });
      hookResult = result;
    });

    expect(hookResult.current.mergedSubjectData.physics).not.toBeNull();
    expect(hookResult.current.mergedSubjectData.physics?.chapters).toHaveLength(25);
    expect(hookResult.current.mergedSubjectData.biology?.chapters).toHaveLength(33);
  });

  it('supports custom chapters and column additions while preserving bundled chapters', () => {
    const { result } = renderHook(() => useSubjectData(), { wrapper });

    act(() => {
      result.current.handleAddChapter('physics', 'Special Theory of Relativity');
    });

    const physicsChapters = result.current.mergedSubjectData.physics?.chapters;
    expect(physicsChapters).toBeDefined();
    expect(physicsChapters?.length).toBe(26);
    expect(physicsChapters?.[physicsChapters.length - 1].name).toBe('Special Theory of Relativity');
    expect(physicsChapters?.[physicsChapters.length - 1].isCustom).toBe(true);

    act(() => {
      result.current.handleAddColumn('physics', 'HC Verma');
    });

    expect(result.current.mergedSubjectData.physics?.materialNames).toContain('HC Verma');
  });

  it('supports adding and removing subtopics', () => {
    const { result } = renderHook(() => useSubjectData(), { wrapper });

    act(() => {
      result.current.handleAddSubtopic('physics', 1, 'Custom Subtopic 101');
    });

    const ch1 = result.current.mergedSubjectData.physics?.chapters.find((c) => c.serial === 1);
    expect(ch1?.subtopics).toContain('Custom Subtopic 101');

    act(() => {
      result.current.handleRemoveSubtopic('physics', 1, 'Custom Subtopic 101');
    });

    const updatedCh1 = result.current.mergedSubjectData.physics?.chapters.find((c) => c.serial === 1);
    expect(updatedCh1?.subtopics).not.toContain('Custom Subtopic 101');
  });

  it('hydrates null or omitted subject keys from bundled defaults during mutations instead of no-oping', () => {
    window.localStorage.setItem(
      'jee-tracker-subject-data',
      JSON.stringify({ physics: null, chemistry: null })
    );
    window.localStorage.setItem('jee-tracker-custom-columns', JSON.stringify({}));
    window.localStorage.setItem('jee-tracker-excluded-columns', JSON.stringify({}));

    const { result } = renderHook(() => useSubjectData(), { wrapper });

    // Trigger mutations synchronously while localStorage had null/missing subjects
    act(() => {
      result.current.handleAddChapter('physics', 'Quantum Optics');
      result.current.handleAddSubtopic('chemistry', 1, 'Custom Chem Subtopic');
      result.current.handleRenameChapter('maths', 1, 'Renamed Sets');
      result.current.handleRemoveChapter('biology', 1);
      result.current.handleAddColumn('physics', 'Irodov');
    });

    expect(result.current.subjectData.physics?.chapters).toHaveLength(26);
    expect(result.current.subjectData.physics?.chapters[25].name).toBe('Quantum Optics');
    expect(result.current.subjectData.chemistry?.chapters.find((c) => c.serial === 1)?.subtopics).toContain(
      'Custom Chem Subtopic'
    );
    expect(result.current.subjectData.maths?.chapters.find((c) => c.serial === 1)?.name).toBe(
      'Renamed Sets'
    );
    expect(result.current.subjectData.biology?.chapters).toHaveLength(32);
    expect(result.current.mergedSubjectData.physics?.materialNames).toContain('Irodov');
  });
});
