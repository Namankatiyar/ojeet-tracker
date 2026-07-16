import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChapterDetailDrawer } from '../ChapterDetailDrawer';
import { Chapter, ChapterProgress } from '../../../../shared/types';

describe('ChapterDetailDrawer Target Goals', () => {
  const mockChapter: Chapter = {
    serial: 1,
    name: 'Units and Measurements',
    materials: ['NCERT', 'PYQs'],
  };

  const defaultProps = {
    chapter: mockChapter,
    materialNames: ['NCERT', 'PYQs'],
    progress: {
      completed: {},
      priority: 'none' as const,
      detail: {
        attemptedByMaterial: {},
      },
    } as ChapterProgress,
    onClose: vi.fn(),
    onToggleMaterial: vi.fn(),
    onSetPriority: vi.fn(),
    onUpdateDetail: vi.fn(),
    onToggleSubtopicMaterial: vi.fn(),
    onUpdateSubtopicAttempted: vi.fn(),
    onSetSubtopicLastRevised: vi.fn(),
  };

  it('renders Target buttons when targets are not set', () => {
    render(<ChapterDetailDrawer {...defaultProps} />);
    
    const targetButtons = screen.getAllByRole('button', { name: 'Target' });
    expect(targetButtons).toHaveLength(2); // One for Revision, one for Lecture
  });

  it('toggles target sub-row when Target button is clicked', async () => {
    render(<ChapterDetailDrawer {...defaultProps} />);
    
    const targetButtons = screen.getAllByRole('button', { name: 'Target' });
    
    // Click Revision Target button
    fireEvent.click(targetButtons[0]);
    
    expect(screen.getByText('Target Revisions')).toBeInTheDocument();
  });

  it('triggers onUpdateDetail when incrementing/decrementing revision target count', () => {
    render(<ChapterDetailDrawer {...defaultProps} />);
    
    // Expand Revision Target
    const targetButtons = screen.getAllByRole('button', { name: 'Target' });
    fireEvent.click(targetButtons[0]);

    // Initially target is 0. Increase target.
    const incrementBtn = screen.getByRole('button', { name: 'Increase target revisions' });
    fireEvent.click(incrementBtn);
    
    expect(defaultProps.onUpdateDetail).toHaveBeenCalledWith(1, { targetRevisionCount: 1 });
  });

  it('renders Goal button and progress badge when target is set', () => {
    const progressWithTarget: ChapterProgress = {
      completed: {},
      priority: 'none' as const,
      detail: {
        attemptedByMaterial: {},
        revisionCount: 3,
        targetRevisionCount: 5,
      },
    };

    render(<ChapterDetailDrawer {...defaultProps} progress={progressWithTarget} />);

    expect(screen.getByRole('button', { name: 'Goal: 5' })).toBeInTheDocument();
    expect(screen.getByText('3 / 5 done')).toBeInTheDocument();
  });

  it('renders completed badge when revisionCount >= targetRevisionCount', () => {
    const progressCompleted: ChapterProgress = {
      completed: {},
      priority: 'none' as const,
      detail: {
        attemptedByMaterial: {},
        revisionCount: 5,
        targetRevisionCount: 5,
      },
    };

    render(<ChapterDetailDrawer {...defaultProps} progress={progressCompleted} />);

    expect(screen.getByText('5 / 5 🎉')).toBeInTheDocument();
  });

  it('resets target count to undefined when decrementing from 1', () => {
    const progressWithTarget: ChapterProgress = {
      completed: {},
      priority: 'none' as const,
      detail: {
        attemptedByMaterial: {},
        revisionCount: 3,
        targetRevisionCount: 1,
      },
    };

    render(<ChapterDetailDrawer {...defaultProps} progress={progressWithTarget} />);

    // Open Target panel by clicking Goal button
    fireEvent.click(screen.getByRole('button', { name: 'Goal: 1' }));

    // Click decrease button
    const decreaseBtn = screen.getByRole('button', { name: 'Decrease target revisions' });
    fireEvent.click(decreaseBtn);

    expect(defaultProps.onUpdateDetail).toHaveBeenCalledWith(1, { targetRevisionCount: undefined });
  });
});
