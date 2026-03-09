import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMockScoresAnalytics } from './useMockScoresAnalytics';
import { MockScore } from '../../../shared/types';

describe('useMockScoresAnalytics', () => {
    const mockScores: MockScore[] = [
        {
            id: '1',
            name: 'Mock 1',
            date: '2025-03-05',
            examType: 'jm',
            physicsMarks: 60,
            chemistryMarks: 70,
            mathsMarks: 80,
            totalMarks: 210,
        },
        {
            id: '2',
            name: 'Mock 2',
            date: '2025-03-01',
            examType: 'jm',
            physicsMarks: 50,
            chemistryMarks: 60,
            mathsMarks: 70,
            totalMarks: 180,
        },
        {
            id: '3',
            name: 'Mock 3',
            date: '2025-03-10',
            examType: 'jm',
            physicsMarks: 70,
            chemistryMarks: 80,
            mathsMarks: 90,
            totalMarks: 240,
        },
        {
            id: '4',
            name: 'JA Mock',
            date: '2025-03-06',
            examType: 'ja',
            physicsMarks: 40,
            chemistryMarks: 50,
            mathsMarks: 60,
            totalMarks: 150,
            paper1Marks: { physics: 20, chemistry: 25, maths: 30 },
            paper2Marks: { physics: 20, chemistry: 25, maths: 30 },
        }
    ];

    it('should filter and sort scores by date for JM', () => {
        const { result } = renderHook(() => useMockScoresAnalytics(mockScores, 'jm'));
        
        expect(result.current.sortedScores).toHaveLength(3);
        expect(result.current.sortedScores[0].id).toBe('2'); // March 1st
        expect(result.current.sortedScores[1].id).toBe('1'); // March 5th
        expect(result.current.sortedScores[2].id).toBe('3'); // March 10th
    });

    it('should generate correct chart data for JM', () => {
        const { result } = renderHook(() => useMockScoresAnalytics(mockScores, 'jm'));
        const { chartData } = result.current;

        expect(chartData.labels).toEqual(['Mock 2', 'Mock 1', 'Mock 3']);
        
        // Total marks dataset
        expect(chartData.datasets[0].label).toBe('Total');
        expect(chartData.datasets[0].data).toEqual([180, 210, 240]);

        // Subject datasets
        expect(chartData.datasets[1].label).toBe('Physics');
        expect(chartData.datasets[1].data).toEqual([50, 60, 70]);
        
        expect(chartData.datasets[2].label).toBe('Chemistry');
        expect(chartData.datasets[2].data).toEqual([60, 70, 80]);
        
        expect(chartData.datasets[3].label).toBe('Maths');
        expect(chartData.datasets[3].data).toEqual([70, 80, 90]);
    });

    it('should handle JA scores correctly (aggregating papers if needed)', () => {
        const { result } = renderHook(() => useMockScoresAnalytics(mockScores, 'ja'));
        
        expect(result.current.sortedScores).toHaveLength(1);
        expect(result.current.chartData.datasets[0].data).toEqual([150]);
        expect(result.current.chartData.datasets[1].data).toEqual([40]); // Total Physics (20 + 20)
    });

    it('should use serial numbers for labels when density is high (> 3)', () => {
        const manyScores: MockScore[] = [
            ...mockScores.filter(s => s.examType === 'jm'),
            {
                id: '5',
                name: 'Mock 4',
                date: '2025-03-11',
                examType: 'jm',
                physicsMarks: 0,
                chemistryMarks: 0,
                mathsMarks: 0,
                totalMarks: 0,
            }
        ];

        const { result } = renderHook(() => useMockScoresAnalytics(manyScores, 'jm'));
        expect(result.current.chartData.labels).toEqual(['1', '2', '3', '4']);
    });
});
