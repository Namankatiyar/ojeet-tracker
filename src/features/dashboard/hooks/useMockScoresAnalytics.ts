import { useMemo } from 'react';
import { MockScore } from '../../../shared/types';
import { subjectColors } from '../utils/analyticsUtils';

export function useMockScoresAnalytics(mockScores: MockScore[]) {
    const sortedScores = useMemo(() => {
        return [...mockScores].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [mockScores]);

    const chartData = useMemo(() => {
        // Use serial numbers if density is high (more than 3), otherwise names
        const useSerialNumbers = sortedScores.length > 3;
        const labels = sortedScores.map((s, index) => useSerialNumbers ? (index + 1).toString() : s.name);

        return {
            labels,
            datasets: [
                {
                    label: 'Total',
                    data: sortedScores.map(s => s.totalMarks),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.3,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Physics',
                    data: sortedScores.map(s => s.physicsMarks),
                    borderColor: subjectColors.physics,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: subjectColors.physics,
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                    borderWidth: 2,
                    borderDash: [5, 5]
                },
                {
                    label: 'Chemistry',
                    data: sortedScores.map(s => s.chemistryMarks),
                    borderColor: subjectColors.chemistry,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: subjectColors.chemistry,
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                    borderWidth: 2,
                    borderDash: [5, 5]
                },
                {
                    label: 'Maths',
                    data: sortedScores.map(s => s.mathsMarks),
                    borderColor: subjectColors.maths,
                    backgroundColor: 'transparent',
                    pointBackgroundColor: subjectColors.maths,
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                    borderWidth: 2,
                    borderDash: [5, 5]
                }
            ]
        };
    }, [sortedScores]);

    return { sortedScores, chartData };
}
