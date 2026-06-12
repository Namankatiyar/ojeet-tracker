import { useMemo } from 'react';
import { StudySession } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';
import { getWeekDays, getMonthDays, getStudyTimeBySubject, getSubjectColors } from '../utils/analyticsUtils';

interface RemoteAggregateBucketEntry {
    overall?: number;
    physics?: number;
    chemistry?: number;
    maths?: number;
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
    const analyticsData = useMemo(() => {
        const subjectColors = getSubjectColors();
        if (mode === 'weekly') {
            const weekDays = getWeekDays(offset);
            const labels = weekDays.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }));

            const physicsData: number[] = [];
            const chemistryData: number[] = [];
            const mathsData: number[] = [];
            const customData: number[] = [];

            weekDays.forEach(day => {
                const dateStr = formatDateLocal(day);
                const times = getStudyTimeBySubject(studySessions, dateStr);
                const remote = remoteDailyBuckets?.[dateStr];
                const useLocalOnly = isWithinHistory(day);

                physicsData.push(Number((useLocalOnly ? times.physics : Math.max(times.physics, (remote?.physics ?? 0) / 3600)).toFixed(2)));
                chemistryData.push(Number((useLocalOnly ? times.chemistry : Math.max(times.chemistry, (remote?.chemistry ?? 0) / 3600)).toFixed(2)));
                mathsData.push(Number((useLocalOnly ? times.maths : Math.max(times.maths, (remote?.maths ?? 0) / 3600)).toFixed(2)));
                customData.push(Number(times.other.toFixed(2)));
            });

            return {
                labels,
                datasets: [
                    {
                        label: 'Physics',
                        data: physicsData,
                        backgroundColor: subjectColors.physics,
                        borderRadius: 4,
                        barPercentage: 0.7
                    },
                    {
                        label: 'Chemistry',
                        data: chemistryData,
                        backgroundColor: subjectColors.chemistry,
                        borderRadius: 4,
                        barPercentage: 0.7
                    },
                    {
                        label: 'Maths',
                        data: mathsData,
                        backgroundColor: subjectColors.maths,
                        borderRadius: 4,
                        barPercentage: 0.7
                    },
                    {
                        label: 'Custom',
                        data: customData,
                        backgroundColor: subjectColors.custom,
                        borderRadius: 4,
                        barPercentage: 0.7
                    }
                ]
            };
        } else {
            const monthDays = getMonthDays(offset);
            const labels = monthDays.map(d => d.getDate().toString());

            const overallData: number[] = [];
            const physicsData: number[] = [];
            const chemistryData: number[] = [];
            const mathsData: number[] = [];
            const customData: number[] = [];

            monthDays.forEach(day => {
                const dateStr = formatDateLocal(day);
                const times = getStudyTimeBySubject(studySessions, dateStr);
                const remote = remoteDailyBuckets?.[dateStr];
                const useLocalOnly = isWithinHistory(day);
                const localOverall = times.physics + times.chemistry + times.maths + times.other;
                const remoteOverallHours = (remote?.overall ?? 0) / 3600;
                const overallHours = useLocalOnly ? localOverall : Math.max(localOverall, remoteOverallHours);

                overallData.push(Number(overallHours.toFixed(2)));
                physicsData.push(Number((useLocalOnly ? times.physics : Math.max(times.physics, (remote?.physics ?? 0) / 3600)).toFixed(2)));
                chemistryData.push(Number((useLocalOnly ? times.chemistry : Math.max(times.chemistry, (remote?.chemistry ?? 0) / 3600)).toFixed(2)));
                mathsData.push(Number((useLocalOnly ? times.maths : Math.max(times.maths, (remote?.maths ?? 0) / 3600)).toFixed(2)));
                customData.push(Number(times.other.toFixed(2)));
            });

            const createGradient = (color: string, data: number[]) => {
                return (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea, scales } = chart;
                    if (!chartArea || !scales.y) return null;

                    let r = 0, g = 0, b = 0;
                    if (color.startsWith('#')) {
                        const hex = color.replace('#', '');
                        if (hex.length === 3) {
                            r = parseInt(hex[0] + hex[0], 16);
                            g = parseInt(hex[1] + hex[1], 16);
                            b = parseInt(hex[2] + hex[2], 16);
                        } else if (hex.length >= 6) {
                            r = parseInt(hex.substring(0, 2), 16);
                            g = parseInt(hex.substring(2, 4), 16);
                            b = parseInt(hex.substring(4, 6), 16);
                        }
                    }

                    // Find the peak of this specific dataset
                    const maxVal = Math.max(...data, 0.1); 
                    const topY = scales.y.getPixelForValue(maxVal);

                    // Gradient starts at the peak of the dataset's line
                    const gradient = ctx.createLinearGradient(0, topY, 0, chartArea.bottom);
                    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
                    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);
                    return gradient;
                };
            };

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
                        order: 5
                    },
                    {
                        label: 'Physics',
                        data: physicsData,
                        fill: true,
                        backgroundColor: createGradient(subjectColors.physics, physicsData),
                        borderColor: subjectColors.physics,
                        pointBackgroundColor: subjectColors.physics,
                        pointBorderColor: '#fff',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        tension: 0.4,
                        order: 4
                    },
                    {
                        label: 'Chemistry',
                        data: chemistryData,
                        fill: true,
                        backgroundColor: createGradient(subjectColors.chemistry, chemistryData),
                        borderColor: subjectColors.chemistry,
                        pointBackgroundColor: subjectColors.chemistry,
                        pointBorderColor: '#fff',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        tension: 0.4,
                        order: 3
                    },
                    {
                        label: 'Maths',
                        data: mathsData,
                        fill: true,
                        backgroundColor: createGradient(subjectColors.maths, mathsData),
                        borderColor: subjectColors.maths,
                        pointBackgroundColor: subjectColors.maths,
                        pointBorderColor: '#fff',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        tension: 0.4,
                        order: 2
                    },
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
                        order: 1
                    }
                ]
            };
        }
    }, [studySessions, offset, mode, remoteDailyBuckets]);

    return analyticsData;
}
