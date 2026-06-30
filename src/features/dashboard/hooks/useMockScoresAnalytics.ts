import { useMemo } from 'react';
import { MockExamType, MockScore, MockExamPreset } from '../../../shared/types';
import {
  getMockExamType,
  getMockSubjectTotals,
  getMockTotalMarks,
} from '../../../shared/utils/mockScores';
import { getSubjectColors } from '../utils/analyticsUtils';

export function useMockScoresAnalytics(
  mockScores: MockScore[],
  examType: MockExamType,
  presets: MockExamPreset[] = []
) {
  const sortedScores = useMemo(() => {
    return mockScores
      .filter((score) => getMockExamType(score) === examType)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [examType, mockScores]);

  const preset = useMemo(() => presets.find((p) => p.id === examType), [presets, examType]);

  const chartData = useMemo(() => {
    const subjectColors = getSubjectColors();
    const useSerialNumbers = sortedScores.length > 3;
    const labels = sortedScores.map((s, index) =>
      useSerialNumbers ? (index + 1).toString() : s.name
    );

    return {
      labels,
      datasets: [
        {
          label: 'Total',
          data: sortedScores.map((s) => getMockTotalMarks(s, preset)),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: true,
          borderWidth: 3,
        },
        {
          label: 'Physics',
          data: sortedScores.map((s) => getMockSubjectTotals(s, preset).physics),
          borderColor: subjectColors.physics,
          backgroundColor: 'transparent',
          pointBackgroundColor: subjectColors.physics,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          borderWidth: 2,
          borderDash: [5, 5],
        },
        {
          label: 'Chemistry',
          data: sortedScores.map((s) => getMockSubjectTotals(s, preset).chemistry),
          borderColor: subjectColors.chemistry,
          backgroundColor: 'transparent',
          pointBackgroundColor: subjectColors.chemistry,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          borderWidth: 2,
          borderDash: [5, 5],
        },
        {
          label: 'Maths',
          data: sortedScores.map((s) => getMockSubjectTotals(s, preset).maths),
          borderColor: subjectColors.maths,
          backgroundColor: 'transparent',
          pointBackgroundColor: subjectColors.maths,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          borderWidth: 2,
          borderDash: [5, 5],
        },
      ],
    };
  }, [sortedScores, preset]);

  return { sortedScores, chartData };
}
