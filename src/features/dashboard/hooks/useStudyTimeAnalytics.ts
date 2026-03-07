import { useMemo } from 'react';
import { StudySession } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';
import { getWeekDays, getMonthDays, getStudyTimeBySubject, subjectColors } from '../utils/analyticsUtils';

interface RemoteAggregateBucketEntry {
    overall?: number;
    physics?: number;
    chemistry?: number;
    maths?: number;
}

export function useStudyTimeAnalytics(
    studySessions: StudySession[],
    offset: number,
    mode: 'weekly' | 'monthly',
    remoteDailyBuckets?: Record<string, RemoteAggregateBucketEntry>
) {
    const analyticsData = useMemo(() => {
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
                physicsData.push(Number(Math.max(times.physics, (remote?.physics ?? 0) / 3600).toFixed(2)));
                chemistryData.push(Number(Math.max(times.chemistry, (remote?.chemistry ?? 0) / 3600).toFixed(2)));
                mathsData.push(Number(Math.max(times.maths, (remote?.maths ?? 0) / 3600).toFixed(2)));
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

            const totalData: number[] = [];

            monthDays.forEach(day => {
                const dateStr = formatDateLocal(day);
                const times = getStudyTimeBySubject(studySessions, dateStr);
                const total = times.physics + times.chemistry + times.maths + times.other;
                const remote = remoteDailyBuckets?.[dateStr];
                const remoteTotal = (remote?.overall ?? 0) / 3600;
                totalData.push(Number(Math.max(total, remoteTotal).toFixed(2)));
            });

            return {
                labels,
                datasets: [
                    {
                        label: 'Total Hours',
                        data: totalData,
                        fill: true,
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        borderColor: '#6366f1',
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#fff',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        tension: 0.4
                    }
                ]
            };
        }
    }, [studySessions, offset, mode, remoteDailyBuckets]);

    return analyticsData;
}
