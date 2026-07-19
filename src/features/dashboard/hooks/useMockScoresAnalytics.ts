import { useMemo } from 'react';
import { MockExamType, MockScore, MockExamPreset } from '../../../shared/types';
import {
  getMockExamType,
  getMockSubjectTotals,
  getMockTotalMarks,
} from '../../../shared/utils/mockScores';
import { getSubjectColors, createGradient } from '../utils/analyticsUtils';
import { useUserProgress } from '../../../core/context/UserProgressContext';

export function useMockScoresAnalytics(
  mockScores: MockScore[],
  examType: MockExamType,
  presets: MockExamPreset[] = []
) {
  const { examMode } = useUserProgress();
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

    const totalData = sortedScores.map((s) => getMockTotalMarks(s, preset));
    const physicsData = sortedScores.map((s) => getMockSubjectTotals(s, preset).physics);
    const chemistryData = sortedScores.map((s) => getMockSubjectTotals(s, preset).chemistry);
    const mathsData = sortedScores.map((s) => getMockSubjectTotals(s, preset).maths);
    const biologyData = sortedScores.map((s) => getMockSubjectTotals(s, preset).biology ?? 0);

    const isNeet = examMode === 'neet';
    const datasets: any[] = [
      {
        label: 'Total',
        data: totalData,
        borderColor: '#8b5cf6',
        backgroundColor: createGradient('#8b5cf6', totalData),
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: 'start',
        borderWidth: 3,
      },
      {
        label: 'Physics',
        data: physicsData,
        borderColor: subjectColors.physics,
        backgroundColor: createGradient(subjectColors.physics, physicsData),
        pointBackgroundColor: subjectColors.physics,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: 'start',
        borderWidth: 2,
      },
      {
        label: 'Chemistry',
        data: chemistryData,
        borderColor: subjectColors.chemistry,
        backgroundColor: createGradient(subjectColors.chemistry, chemistryData),
        pointBackgroundColor: subjectColors.chemistry,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: 'start',
        borderWidth: 2,
      },
      isNeet
        ? {
            label: 'Biology',
            data: biologyData,
            borderColor: subjectColors.biology || '#00b330',
            backgroundColor: createGradient(subjectColors.biology || '#00b330', biologyData),
            pointBackgroundColor: subjectColors.biology || '#00b330',
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            fill: 'start',
            borderWidth: 2,
          }
        : {
            label: 'Maths',
            data: mathsData,
            borderColor: subjectColors.maths,
            backgroundColor: createGradient(subjectColors.maths, mathsData),
            pointBackgroundColor: subjectColors.maths,
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            fill: 'start',
            borderWidth: 2,
          },
    ];

    if (preset && preset.targetScore !== undefined) {
      datasets.push({
        label: 'Target',
        data: Array(sortedScores.length).fill(preset.targetScore),
        borderColor: '#f43f5e',
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 15,
        pointHoverBackgroundColor: '#f43f5e',
        pointHoverBorderColor: '#fff',
        fill: false,
        tension: 0,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [sortedScores, preset]);

  return { sortedScores, chartData };
}
