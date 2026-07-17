import { useMemo } from 'react';
import { MockExamType, MockScore, MockExamPreset, Subject } from '../../../shared/types';
import {
  getMockExamType,
  getMockSubjectTotals,
  getMockTotalMarks,
  getMockPercentage,
} from '../../../shared/utils/mockScores';
import { getSubjectColors, createGradient } from '../../dashboard/utils/analyticsUtils';
import { useUserProgress } from '../../../core/context/UserProgressContext';

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
  const { examMode } = useUserProgress();
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
        subjectAverages: { physics: 0, chemistry: 0, maths: 0, biology: 0 },
      };
    }

    let sumTotal = 0;
    let sumPercentage = 0;
    let highestScore = -Infinity;
    let highestScoreName = '';
    let sumPhysics = 0;
    let sumChemistry = 0;
    let sumMaths = 0;
    let sumBiology = 0;

    sortedScores.forEach((s) => {
      const total = getMockTotalMarks(s, preset);
      const perc = getMockPercentage(s, presets);
      const sub = getMockSubjectTotals(s, preset);

      sumTotal += total;
      sumPercentage += perc;
      sumPhysics += sub.physics;
      sumChemistry += sub.chemistry;
      sumMaths += sub.maths;
      sumBiology += sub.biology ?? 0;

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
        biology: Math.round(sumBiology / totalTestsTaken),
      },
    };
  }, [sortedScores, preset, presets]);

  const chartData = useMemo(() => {
    const subjectColors = getSubjectColors();
    const useSerialNumbers = sortedScores.length > 4;
    const labels = sortedScores.map((s, index) =>
      useSerialNumbers ? `Test #${index + 1}` : s.name
    );

    const totalMarksData = sortedScores.map((s) => getMockTotalMarks(s, preset));
    const physicsData = sortedScores.map((s) => getMockSubjectTotals(s, preset).physics);
    const chemistryData = sortedScores.map((s) => getMockSubjectTotals(s, preset).chemistry);
    const mathsData = sortedScores.map((s) => getMockSubjectTotals(s, preset).maths);
    const biologyData = sortedScores.map((s) => getMockSubjectTotals(s, preset).biology ?? 0);

    // 1. Trend Chart Data
    const isNeet = examMode === 'neet';
    const datasets: any[] = [
      {
        label: 'Total Marks',
        data: totalMarksData,
        borderColor: '#8b5cf6',
        backgroundColor: createGradient('#8b5cf6', totalMarksData),
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
            borderColor: subjectColors.biology || '#059669',
            backgroundColor: createGradient(subjectColors.biology || '#059669', biologyData),
            pointBackgroundColor: subjectColors.biology || '#059669',
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

    if (examType !== 'all' && preset && preset.targetScore !== undefined) {
      datasets.push({
        label: 'Target Score',
        data: Array(sortedScores.length).fill(preset.targetScore),
        borderColor: '#f43f5e',
        borderDash: [6, 6],
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 15,
        pointHoverBackgroundColor: '#f43f5e',
        pointHoverBorderColor: '#fff',
        fill: false,
        tension: 0,
      });
    }

    const trendChartData = {
      labels,
      datasets,
    };

    // 2. Subject Share (Doughnut)
    const subjectShareChartData = {
      labels: isNeet ? ['Physics', 'Chemistry', 'Biology'] : ['Physics', 'Chemistry', 'Maths'],
      datasets: [
        {
          data: [
            summaryStats.subjectAverages.physics,
            summaryStats.subjectAverages.chemistry,
            isNeet ? summaryStats.subjectAverages.biology : summaryStats.subjectAverages.maths,
          ],
          backgroundColor: [
            subjectColors.physics,
            subjectColors.chemistry,
            isNeet ? (subjectColors.biology || '#059669') : subjectColors.maths,
          ],
          borderWidth: 2,
          borderColor: 'var(--bg-secondary)',
        },
      ],
    };

    // 3. Time Spent Chart Data (Bar & Line Trend)
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
          borderRadius: 4,
        },
        {
          label: 'Chemistry (mins)',
          data: timeLoggedScores.map((s) => s.timeSpent?.chemistry || 0),
          backgroundColor: subjectColors.chemistry,
          borderRadius: 4,
        },
        isNeet
          ? {
              label: 'Biology (mins)',
              data: timeLoggedScores.map((s) => s.timeSpent?.biology || 0),
              backgroundColor: subjectColors.biology || '#059669',
              borderRadius: 4,
            }
          : {
              label: 'Maths (mins)',
              data: timeLoggedScores.map((s) => s.timeSpent?.maths || 0),
              backgroundColor: subjectColors.maths,
              borderRadius: 4,
            },
      ],
    };

    const totalTimeData = timeLoggedScores.map((s) =>
      (s.timeSpent?.physics || 0) +
      (s.timeSpent?.chemistry || 0) +
      (isNeet ? (s.timeSpent?.biology || 0) : (s.timeSpent?.maths || 0))
    );
    const timePhysicsData = timeLoggedScores.map((s) => s.timeSpent?.physics || 0);
    const timeChemistryData = timeLoggedScores.map((s) => s.timeSpent?.chemistry || 0);
    const timeMathsOrBioData = timeLoggedScores.map((s) =>
      isNeet ? (s.timeSpent?.biology || 0) : (s.timeSpent?.maths || 0)
    );

    const timeSpentTrendChartData = {
      labels: timeLabels,
      datasets: [
        {
          label: 'Total Time (mins)',
          data: totalTimeData,
          borderColor: '#8b5cf6',
          backgroundColor: createGradient('#8b5cf6', totalTimeData),
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
          data: timePhysicsData,
          borderColor: subjectColors.physics,
          backgroundColor: createGradient(subjectColors.physics, timePhysicsData),
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
          data: timeChemistryData,
          borderColor: subjectColors.chemistry,
          backgroundColor: createGradient(subjectColors.chemistry, timeChemistryData),
          pointBackgroundColor: subjectColors.chemistry,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: 'start',
          borderWidth: 2,
        },
        {
          label: isNeet ? 'Biology' : 'Maths',
          data: timeMathsOrBioData,
          borderColor: isNeet ? (subjectColors.biology || '#059669') : subjectColors.maths,
          backgroundColor: createGradient(isNeet ? (subjectColors.biology || '#059669') : subjectColors.maths, timeMathsOrBioData),
          pointBackgroundColor: isNeet ? (subjectColors.biology || '#059669') : subjectColors.maths,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: 'start',
          borderWidth: 2,
        },
      ],
    };

    // 4. Accuracy & Questions Chart Data (Bar & Line Trend)
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
              (isNeet ? (s.attemptedQuestions?.biology || 0) : (s.attemptedQuestions?.maths || 0));
            const wr =
              (s.wrongQuestions?.physics || 0) +
              (s.wrongQuestions?.chemistry || 0) +
              (isNeet ? (s.wrongQuestions?.biology || 0) : (s.wrongQuestions?.maths || 0));
            return Math.max(0, att - wr);
          }),
          backgroundColor: '#10b981', // green
          borderRadius: 4,
        },
        {
          label: 'Wrong Questions',
          data: qLoggedScores.map((s) => {
            return (
              (s.wrongQuestions?.physics || 0) +
              (s.wrongQuestions?.chemistry || 0) +
              (isNeet ? (s.wrongQuestions?.biology || 0) : (s.wrongQuestions?.maths || 0))
            );
          }),
          backgroundColor: '#ef4444', // red
          borderRadius: 4,
        },
      ],
    };

    const getSubAcc = (att: number, wr: number) => {
      if (!att || att <= 0) return 0;
      const corr = Math.max(0, att - wr);
      return Math.round((corr / att) * 1000) / 10;
    };

    const overallAccData = qLoggedScores.map((s) => {
      const att =
        (s.attemptedQuestions?.physics || 0) +
        (s.attemptedQuestions?.chemistry || 0) +
        (isNeet ? (s.attemptedQuestions?.biology || 0) : (s.attemptedQuestions?.maths || 0));
      const wr =
        (s.wrongQuestions?.physics || 0) +
        (s.wrongQuestions?.chemistry || 0) +
        (isNeet ? (s.wrongQuestions?.biology || 0) : (s.wrongQuestions?.maths || 0));
      return getSubAcc(att, wr);
    });
    const physAccData = qLoggedScores.map((s) =>
      getSubAcc(s.attemptedQuestions?.physics || 0, s.wrongQuestions?.physics || 0)
    );
    const chemAccData = qLoggedScores.map((s) =>
      getSubAcc(s.attemptedQuestions?.chemistry || 0, s.wrongQuestions?.chemistry || 0)
    );
    const mathsOrBioAccData = qLoggedScores.map((s) =>
      isNeet
        ? getSubAcc(s.attemptedQuestions?.biology || 0, s.wrongQuestions?.biology || 0)
        : getSubAcc(s.attemptedQuestions?.maths || 0, s.wrongQuestions?.maths || 0)
    );

    const accuracyTrendChartData = {
      labels: qLabels,
      datasets: [
        {
          label: 'Overall Accuracy (%)',
          data: overallAccData,
          borderColor: '#10b981',
          backgroundColor: createGradient('#10b981', overallAccData),
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: 'start',
          borderWidth: 3,
        },
        {
          label: 'Physics',
          data: physAccData,
          borderColor: subjectColors.physics,
          backgroundColor: createGradient(subjectColors.physics, physAccData),
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
          data: chemAccData,
          borderColor: subjectColors.chemistry,
          backgroundColor: createGradient(subjectColors.chemistry, chemAccData),
          pointBackgroundColor: subjectColors.chemistry,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: 'start',
          borderWidth: 2,
        },
        {
          label: isNeet ? 'Biology' : 'Maths',
          data: mathsOrBioAccData,
          borderColor: isNeet ? (subjectColors.biology || '#059669') : subjectColors.maths,
          backgroundColor: createGradient(isNeet ? (subjectColors.biology || '#059669') : subjectColors.maths, mathsOrBioAccData),
          pointBackgroundColor: isNeet ? (subjectColors.biology || '#059669') : subjectColors.maths,
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: 'start',
          borderWidth: 2,
        },
      ],
    };

    return {
      trendChartData,
      subjectShareChartData,
      timeSpentChartData,
      timeSpentTrendChartData,
      accuracyChartData,
      accuracyTrendChartData,
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
