import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockScoresPage } from './MockScoresPage';

// Hoisted mock state variables
const mockScoresState: any[] = [];
const mockHandleAddMockScore = vi.fn();
const mockHandleEditMockScore = vi.fn();
const mockHandleDeleteMockScore = vi.fn();

const defaultPresets = [
  { id: 'jm', name: 'JEE Main', shortName: 'JEE Main', paperCount: 1, maxMarks: 300, subjectWeights: { physics: 100, chemistry: 100, maths: 100 } },
  { id: 'ja', name: 'JEE Advanced', shortName: 'JEE Adv', paperCount: 2, maxMarks: 360, subjectWeights: { physics: 120, chemistry: 120, maths: 120 } },
];

// Mock contexts
vi.mock('../../../core/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark-glass',
  }),
}));

vi.mock('../../../core/context/UserProgressContext', () => ({
  useUserProgress: () => ({
    mockScores: mockScoresState,
    mockExamPresets: defaultPresets,
    handleAddMockScore: mockHandleAddMockScore,
    handleEditMockScore: mockHandleEditMockScore,
    handleDeleteMockScore: mockHandleDeleteMockScore,
  }),
}));

// Mock Chart.js elements
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart" />,
  Doughnut: () => <div data-testid="mock-doughnut-chart" />,
  Bar: () => <div data-testid="mock-bar-chart" />,
}));

// Mock Modals
vi.mock('../../dashboard/components/AddMockModal', () => ({
  AddMockModal: ({ onClose }: any) => (
    <div data-testid="add-mock-modal">
      <button onClick={onClose}>Close Add Modal</button>
    </div>
  ),
}));

vi.mock('../../dashboard/components/ManageMockPresetsModal', () => ({
  ManageMockPresetsModal: ({ onClose }: any) => (
    <div data-testid="manage-presets-modal">
      <button onClick={onClose}>Close Presets Modal</button>
    </div>
  ),
}));

describe('MockScoresPage', () => {
  beforeEach(() => {
    mockScoresState.length = 0;
    mockHandleAddMockScore.mockReset();
    mockHandleEditMockScore.mockReset();
    mockHandleDeleteMockScore.mockReset();
    vi.restoreAllMocks();
  });

  it('renders empty state correctly', () => {
    render(<MockScoresPage />);

    expect(screen.getByText('Mock Scores Cockpit')).toBeInTheDocument();
    expect(screen.getByText('No Mock Scores Recorded Yet')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-line-chart')).not.toBeInTheDocument();
  });

  it('renders logged mock scores and calculates summary stats', () => {
    mockScoresState.push({
      id: 'mock-1',
      name: 'Test 1',
      date: '2026-07-01',
      examType: 'jm',
      physicsMarks: 60,
      chemistryMarks: 70,
      mathsMarks: 50,
      totalMarks: 180,
      maxMarks: 300,
    });

    render(<MockScoresPage />);

    expect(screen.getByText('Tests Taken')).toBeInTheDocument();
    
    const testsCard = screen.getByText('Tests Taken').closest('.mock-stat-card')!;
    expect(within(testsCard).getByText('1')).toBeInTheDocument();

    const avgCard = screen.getByText('Average Score').closest('.mock-stat-card')!;
    expect(within(avgCard).getByText(/60\.0%/)).toBeInTheDocument();

    expect(screen.getAllByText('Test 1').length).toBe(2);
  });

  it('handles tab switching and renders charts', () => {
    mockScoresState.push({
      id: 'mock-1',
      name: 'Test 1',
      date: '2026-07-01',
      examType: 'jm',
      physicsMarks: 60,
      chemistryMarks: 70,
      mathsMarks: 50,
      totalMarks: 180,
      maxMarks: 300,
      timeSpent: { physics: 60, chemistry: 50, maths: 70 },
      attemptedQuestions: { physics: 20, chemistry: 20, maths: 20 },
      wrongQuestions: { physics: 2, chemistry: 2, maths: 2 },
    });

    render(<MockScoresPage />);

    // Line chart defaults for 'trend' tab
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();

    // Switch to Subject Share
    fireEvent.click(screen.getByText(/Subject Share/i));
    expect(screen.getByTestId('mock-doughnut-chart')).toBeInTheDocument();

    // Switch to Time Spent
    fireEvent.click(screen.getByText(/Time Spent/i));
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();

    // Switch to Accuracy
    fireEvent.click(screen.getByText(/Accuracy/i));
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
  });

  it('handles edge case: missing optional analytics parameters gracefully', () => {
    mockScoresState.push({
      id: 'mock-1',
      name: 'Test 1',
      date: '2026-07-01',
      examType: 'jm',
      physicsMarks: 0,
      chemistryMarks: 0,
      mathsMarks: 0,
      totalMarks: 0,
      maxMarks: 300,
      // No timeSpent, no attemptedQuestions, no wrongQuestions
    });

    render(<MockScoresPage />);

    const avgCard = screen.getByText('Average Score').closest('.mock-stat-card')!;
    expect(within(avgCard).getByText(/0\.0%/)).toBeInTheDocument();

    // Switch to Time Spent tab
    fireEvent.click(screen.getByText(/Time Spent/i));
    expect(screen.getByText('No Time Spent Data Available')).toBeInTheDocument();

    // Switch to Accuracy tab
    fireEvent.click(screen.getByText(/Accuracy/i));
    expect(screen.getByText('No Question Accuracy Data Available')).toBeInTheDocument();
  });

  it('handles edge case: double paper JEE Advanced mocks', () => {
    mockScoresState.push({
      id: 'mock-adv',
      name: 'Adv Mock 1',
      date: '2026-07-02',
      examType: 'ja',
      physicsMarks: 80,
      chemistryMarks: 90,
      mathsMarks: 70,
      totalMarks: 240,
      maxMarks: 360,
      paper1Marks: { physics: 40, chemistry: 45, maths: 35 },
      paper2Marks: { physics: 40, chemistry: 45, maths: 35 },
    });

    render(<MockScoresPage />);

    expect(screen.getAllByText('Adv Mock 1').length).toBe(2);
    const avgCard = screen.getByText('Average Score').closest('.mock-stat-card')!;
    expect(within(avgCard).getByText(/66\.7%/)).toBeInTheDocument();
  });

  it('opens and closes log new score modal', () => {
    render(<MockScoresPage />);

    const logButton = screen.getByText('Log New Score');
    fireEvent.click(logButton);

    expect(screen.getByTestId('add-mock-modal')).toBeInTheDocument();

    const closeButton = screen.getByText('Close Add Modal');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('add-mock-modal')).not.toBeInTheDocument();
  });

  it('handles deleting a score', () => {
    mockScoresState.push({
      id: 'mock-delete',
      name: 'Test to Delete',
      date: '2026-07-01',
      examType: 'jm',
      physicsMarks: 50,
      chemistryMarks: 50,
      mathsMarks: 50,
      totalMarks: 150,
      maxMarks: 300,
    });

    // Mock confirm dialog
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<MockScoresPage />);

    const deleteButton = screen.getByTitle('Delete Score');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('Delete "Test to Delete"?');
    expect(mockHandleDeleteMockScore).toHaveBeenCalledWith('mock-delete');
  });

  it('handles canceling delete score action', () => {
    mockScoresState.push({
      id: 'mock-delete',
      name: 'Test to Keep',
      date: '2026-07-01',
      examType: 'jm',
      physicsMarks: 50,
      chemistryMarks: 50,
      mathsMarks: 50,
      totalMarks: 150,
      maxMarks: 300,
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

    render(<MockScoresPage />);

    const deleteButton = screen.getByTitle('Delete Score');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockHandleDeleteMockScore).not.toHaveBeenCalled();
  });
});
