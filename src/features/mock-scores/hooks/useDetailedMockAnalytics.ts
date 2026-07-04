import { useMemo } from 'react';
import { MockExamType, MockScore, MockExamPreset, Subject } from '../../../shared/types';
import {
  getMockExamType,
  getMockSubjectTotals,
  getMockTotalMarks,
  getMockPercentage,
} from '../../../shared/utils/mockScores';
import { getSubjectColors } from '../../dashboard/utils/analyticsUtils';

export interface WeakAreaFrequency {
  id: string;
  subject: Subject;
  chapterSerial: number;
  chapterName: string;
  subtopicName?: string;
  count: number;
}

export function useDetailedMockAnalytics(
  mockScores: MockScore[],
  examType: MockExamType | 'all',
  presets: MockExamPreset[] = []
) {
  const sortedScores = useMemo(() => {
    return mockScores
      .filter((score) => (examType === 'all' ? true : getMockExamType(score) === examType))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [examType, mockScores]);

  const preset = useMemo(() => {
    if (examType === 'all') return presets[0];
    return presets.find((p) => p.id === examType) || presets[0];
  }, [presets, examType]);

  const summaryStats = useMemo(() => {
    const totalTestsTaken = sortedScores.length;
    if (totalTestsTaken === 0) {
      return {
        totalTestsTaken: 0,
        averagePercentage: 0,
        averageTotal: 0,
        highestScore: 0,
        highestScoreName: '-',
        latestScore: 0,
        latestTrend: 0,
        subjectAverages: { physics: 0, chemistry: 0, maths: 0 },
      };
    }

    let sumTotal = 0;
    let sumPercentage = 0;
    let highestScore = -Infinity;
    let highestScoreName = '';
    let sumPhysics = 0;
    let sumChemistry = 0;
    let sumMaths = 0;

    sortedScores.forEach((s) => {
      const total = getMockTotalMarks(s, preset);
      const perc = getMockPercentage(s, presets);
      const sub = getMockSubjectTotals(s, preset);

      sumTotal += total;
      sumPercentage += perc;
      sumPhysics += sub.physics;
      sumChemistry += sub.chemistry;
      sumMaths += sub.maths;

      if (total > highestScore) {
        highestScore = total;
        highestScoreName = s.name;
      }
    });

    const latest = sortedScores[sortedScores.length - 1];
    const latestTotal = getMockTotalMarks(latest, preset);
    let latestTrend = 0;
    if (sortedScores.length > 1) {
      const prevTotal = getMockTotalMarks(sortedScores[sortedScores.length - 2], preset);
      latestTrend = latestTotal - prevTotal;
    }

    return {
      totalTestsTaken,
      averagePercentage: sumPercentage / totalTestsTaken,
      averageTotal: Math.round(sumTotal / totalTestsTaken),
      highestScore,
      highestScoreName,
      latestScore: latestTotal,
      latestTrend,
      subjectAverages: {
        physics: Math.round(sumPhysics / totalTestsTaken),
        chemistry: Math.round(sumChemistry / totalTestsTaken),
        maths: Math.round(sumMaths / totalTestsTaken),
      },
    };
  }, [sortedScores, preset, presets]);

  const chartData = useMemo(() => {
    const subjectColors = getSubjectColors();
    const useSerialNumbers = sortedScores.length > 4;
    const labels = sortedScores.map((s, index) =>
      useSerialNumbers ? `Test #${index + 1}` : s.name
    );

    // 1. Trend Chart Data
    const trendChartData = {
      labels,
      datasets: [
        {
          label: 'Total Marks',
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

    // 2. Subject Share (Doughnut)
    const subjectShareChartData = {
      labels: ['Physics', 'Chemistry', 'Maths'],
      datasets: [
        {
          data: [
            summaryStats.subjectAverages.physics,
            summaryStats.subjectAverages.chemistry,
            summaryStats.subjectAverages.maths,
          ],
          backgroundColor: [
            subjectColors.physics,
            subjectColors.chemistry,
            subjectColors.maths,
          ],
          borderWidth: 2,
          borderColor: 'var(--bg-secondary)',
        },
      ],
    };

    // 3. Time Spent Chart Data (Bar)
    const timeLoggedScores = sortedScores.filter((s) => s.timeSpent);
    const timeLabels = timeLoggedScores.map((s, idx) =>
      useSerialNumbers ? `Test #${idx + 1}` : s.name
    );
    const timeSpentChartData = {
      labels: timeLabels,
      datasets: [
        {
          label: 'Physics (mins)',
          data: timeLoggedScores.map((s) => s.timeSpent?.physics || 0),
          backgroundColor: subjectColors.physics,
        },
        {
          label: 'Chemistry (mins)',
          data: timeLoggedScores.map((s) => s.timeSpent?.chemistry || 0),
          backgroundColor: subjectColors.chemistry,
        },
        {
          label: 'Maths (mins)',
          data: timeLoggedScores.map((s) => s.timeSpent?.maths || 0),
          backgroundColor: subjectColors.maths,
        },
      ],
    };

    // 4. Accuracy & Questions Chart Data (Bar)
    const qLoggedScores = sortedScores.filter((s) => s.attemptedQuestions && s.wrongQuestions);
    const qLabels = qLoggedScores.map((s, idx) =>
      useSerialNumbers ? `Test #${idx + 1}` : s.name
    );
    const accuracyChartData = {
      labels: qLabels,
      datasets: [
        {
          label: 'Correct Questions',
          data: qLoggedScores.map((s) => {
            const att =
              (s.attemptedQuestions?.physics || 0) +
              (s.attemptedQuestions?.chemistry || 0) +
              (s.attemptedQuestions?.maths || 0);
            const wr =
              (s.wrongQuestions?.physics || 0) +
              (s.wrongQuestions?.chemistry || 0) +
              (s.wrongQuestions?.maths || 0);
            return Math.max(0, att - wr);
          }),
          backgroundColor: '#10b981', // green
        },
        {
          label: 'Wrong Questions',
          data: qLoggedScores.map((s) => {
            return (
              (s.wrongQuestions?.physics || 0) +
              (s.wrongQuestions?.chemistry || 0) +
              (s.wrongQuestions?.maths || 0)
            );
          }),
          backgroundColor: '#ef4444', // red
        },
      ],
    };

    return {
      trendChartData,
      subjectShareChartData,
      timeSpentChartData,
      accuracyChartData,
      hasTimeData: timeLoggedScores.length > 0,
      hasQuestionData: qLoggedScores.length > 0,
    };
  }, [sortedScores, preset, summaryStats]);

  const weakAreasSummary = useMemo(() => {
    const freqMap = new Map<string, WeakAreaFrequency>();

    sortedScores.forEach((s) => {
      s.weakChapters?.forEach((wc) => {
        const id = `${wc.subject}-${wc.chapterSerial}`;
        const existing = freqMap.get(id);
        if (existing) {
          existing.count += 1;
        } else {
          freqMap.set(id, {
            id,
            subject: wc.subject,
            chapterSerial: wc.chapterSerial,
            chapterName: wc.chapterName,
            count: 1,
          });
        }
      });

      s.weakSubtopics?.forEach((wst) => {
        const id = `${wst.subject}-${wst.chapterSerial}-${wst.subtopicName}`;
        const existing = freqMap.get(id);
        if (existing) {
          existing.count += 1;
        } else {
          freqMap.set(id, {
            id,
            subject: wst.subject,
            chapterSerial: wst.chapterSerial,
            chapterName: wst.chapterName,
            subtopicName: wst.subtopicName,
            count: 1,
          });
        }
      });
    });

    return Array.from(freqMap.values()).sort((a, b) => b.count - a.count);
  }, [sortedScores]);

  const diagnosticNotes = useMemo(() => {
    return sortedScores
      .filter((s) => s.footnotes && s.footnotes.trim().length > 0)
      .map((s) => ({
        id: s.id,
        name: s.name,
        date: s.date,
        footnotes: s.footnotes!,
        totalMarks: getMockTotalMarks(s, preset),
      }))
      .reverse();
  }, [sortedScores, preset]);

  return {
    sortedScores,
    summaryStats,
    chartData,
    weakAreasSummary,
    diagnosticNotes,
  };
}
