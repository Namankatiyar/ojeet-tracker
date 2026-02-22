import { StudySession } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';

/**
 * Get week days for the selected week offset
 */
export const getWeekDays = (offset: number) => {
    const today = new Date();
    const monday = new Date(today);
    // Adjust to Monday of the target week
    monday.setDate(today.getDate() - today.getDay() + 1 + (offset * 7));

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        days.push(day);
    }
    return days;
};

/**
 * Get month days for the selected month offset
 */
export const getMonthDays = (offset: number) => {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();

    const days: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), i));
    }
    return days;
};

/**
 * Calculate study time per subject for a given date
 */
export const getStudyTimeBySubject = (studySessions: StudySession[], dateStr: string) => {
    const daySessions = studySessions.filter(s => s.startTime.startsWith(dateStr));

    return {
        physics: daySessions.filter(s => s.subject === 'physics').reduce((acc, s) => acc + s.duration, 0) / 3600,
        chemistry: daySessions.filter(s => s.subject === 'chemistry').reduce((acc, s) => acc + s.duration, 0) / 3600,
        maths: daySessions.filter(s => s.subject === 'maths').reduce((acc, s) => acc + s.duration, 0) / 3600,
        other: daySessions.filter(s => !s.subject).reduce((acc, s) => acc + s.duration, 0) / 3600
    };
};

/**
 * Subject colors matching site-wide theme
 */
export const subjectColors = {
    physics: '#6366f1',
    chemistry: '#10b981',
    maths: '#f59e0b',
    custom: '#8b5cf6'
};

/**
 * Get standardized chart options based on theme and type
 */
export const getChartOptions = (theme: 'light' | 'dark', type: 'bar' | 'line' | 'mock') => {
    const axisColor = theme === 'dark' ? '#ffffff' : '#000000';
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: axisColor,
                    usePointStyle: true,
                    padding: 15,
                    font: { size: 11, family: 'Inter' }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: { family: 'Inter' },
                bodyFont: { family: 'Inter' },
                padding: 10,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: axisColor, font: { size: type === 'line' ? 10 : 11, family: 'Inter' } }
            },
            y: {
                grid: { color: gridColor },
                ticks: {
                    color: axisColor,
                    font: { size: 11, family: 'Inter' }
                }
            }
        }
    };

    if (type === 'bar') {
        return {
            ...baseOptions,
            scales: {
                ...baseOptions.scales,
                x: { ...baseOptions.scales.x, stacked: true },
                y: {
                    ...baseOptions.scales.y,
                    stacked: true,
                    ticks: {
                        ...baseOptions.scales.y.ticks,
                        callback: (value: number) => `${value}h`
                    },
                    title: {
                        display: true,
                        text: 'Hours',
                        color: axisColor,
                        font: { size: 12, family: 'Inter' }
                    }
                }
            }
        };
    }

    if (type === 'line') {
        return {
            ...baseOptions,
            scales: {
                ...baseOptions.scales,
                y: {
                    ...baseOptions.scales.y,
                    ticks: {
                        ...baseOptions.scales.y.ticks,
                        callback: (value: number) => `${value}h`
                    }
                }
            }
        };
    }

    if (type === 'mock') {
        return {
            ...baseOptions,
            scales: {
                ...baseOptions.scales,
                y: {
                    ...baseOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Marks',
                        color: axisColor,
                        font: { size: 12, family: 'Inter' }
                    },
                    min: 0,
                    max: 300
                }
            }
        };
    }

    return baseOptions;
};
