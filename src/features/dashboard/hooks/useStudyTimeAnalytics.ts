import { useMemo } from 'react';
import { StudySession } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';
import {
  getWeekDays,
  getMonthDays,
  getStudyTimeBySubject,
  getSubjectColors,
  createGradient,
} from '../utils/analyticsUtils';
import { useActiveSubjects } from '../../../shared/hooks/useActiveSubjects';

interface RemoteAggregateBucketEntry {
  overall?: number;
  physics?: number;
  chemistry?: number;
  maths?: number;
  biology?: number;
}

const HISTORY_WINDOW_DAYS = 60;

function isWithinHistory(day: Date): boolean {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - HISTORY_WINDOW_DAYS);
  return day >= cutoff;
}

export function useStudyTimeAnalytics(
  studySessions: StudySession[],
  offset: number,
  mode: 'weekly' | 'monthly',
  remoteDailyBuckets?: Record<string, RemoteAggregateBucketEntry>
) {
  const { subjects, subjectMeta } = useActiveSubjects();

  const analyticsData = useMemo(() => {
    const subjectColors = getSubjectColors();
    if (mode === 'weekly') {
      const weekDays = getWeekDays(offset);
      const labels = weekDays.map((d) => d.toLocaleDateString('en-US', { weekday: 'short' }));

      const subjectDataArrays = subjects.reduce((acc, subj) => {
        acc[subj] = [];
        return acc;
      }, {} as Record<string, number[]>);
      const customData: number[] = [];

      weekDays.forEach((day) => {
        const dateStr = formatDateLocal(day);
        const times = getStudyTimeBySubject(studySessions, dateStr);
        const remote = remoteDailyBuckets?.[dateStr];
        const useLocalOnly = isWithinHistory(day);

        subjects.forEach((subj) => {
          const localVal = times[subj] || 0;
          const remoteVal = (remote?.[subj] ?? 0) / 3600;
          subjectDataArrays[subj].push(
            Number(
              (useLocalOnly ? localVal : Math.max(localVal, remoteVal)).toFixed(2)
            )
          );
        });
        customData.push(Number(times.other.toFixed(2)));
      });

      return {
        labels,
        datasets: [
          ...subjects.map((subj) => {
            const meta = subjectMeta.find((m) => m.key === subj);
            return {
              label: meta?.label ?? subj.charAt(0).toUpperCase() + subj.slice(1),
              data: subjectDataArrays[subj],
              backgroundColor: subjectColors[subj as keyof typeof subjectColors] || subjectColors.custom,
              borderRadius: 4,
              barPercentage: 0.7,
            };
          }),
          {
            label: 'Custom',
            data: customData,
            backgroundColor: subjectColors.custom,
            borderRadius: 4,
            barPercentage: 0.7,
          },
        ],
      };
    } else {
      const monthDays = getMonthDays(offset);
      const labels = monthDays.map((d) => d.getDate().toString());

      const subjectDataArrays = subjects.reduce((acc, subj) => {
        acc[subj] = [];
        return acc;
      }, {} as Record<string, number[]>);
      const overallData: number[] = [];
      const customData: number[] = [];

      monthDays.forEach((day) => {
        const dateStr = formatDateLocal(day);
        const times = getStudyTimeBySubject(studySessions, dateStr);
        const remote = remoteDailyBuckets?.[dateStr];
        const useLocalOnly = isWithinHistory(day);
        const localOverall = subjects.reduce((sum, subj) => sum + (times[subj] || 0), 0) + times.other;
        const remoteOverallHours = (remote?.overall ?? 0) / 3600;
        const overallHours = useLocalOnly
          ? localOverall
          : Math.max(localOverall, remoteOverallHours);

        overallData.push(Number(overallHours.toFixed(2)));
        subjects.forEach((subj) => {
          const localVal = times[subj] || 0;
          const remoteVal = (remote?.[subj] ?? 0) / 3600;
          subjectDataArrays[subj].push(
            Number(
              (useLocalOnly ? localVal : Math.max(localVal, remoteVal)).toFixed(2)
            )
          );
        });
        customData.push(Number(times.other.toFixed(2)));
      });

      return {
        labels,
        datasets: [
          {
            label: 'Overall',
            data: overallData,
            fill: true,
            backgroundColor: createGradient(subjectColors.overall, overallData),
            borderColor: subjectColors.overall,
            pointBackgroundColor: subjectColors.overall,
            pointBorderColor: '#fff',
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.4,
            borderWidth: 3,
            order: subjects.length + 2,
          },
          ...subjects.map((subj, index) => {
            const meta = subjectMeta.find((m) => m.key === subj);
            const color = subjectColors[subj as keyof typeof subjectColors] || subjectColors.custom;
            return {
              label: meta?.label ?? subj.charAt(0).toUpperCase() + subj.slice(1),
              data: subjectDataArrays[subj],
              fill: true,
              backgroundColor: createGradient(color, subjectDataArrays[subj]),
              borderColor: color,
              pointBackgroundColor: color,
              pointBorderColor: '#fff',
              pointRadius: 3,
              pointHoverRadius: 5,
              tension: 0.4,
              order: subjects.length + 1 - index,
            };
          }),
          {
            label: 'Custom',
            data: customData,
            fill: true,
            backgroundColor: createGradient(subjectColors.custom, customData),
            borderColor: subjectColors.custom,
            pointBackgroundColor: subjectColors.custom,
            pointBorderColor: '#fff',
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.4,
            order: 1,
          },
        ],
      };
    }
  }, [studySessions, offset, mode, remoteDailyBuckets, subjects, subjectMeta]);

  return analyticsData;
}
