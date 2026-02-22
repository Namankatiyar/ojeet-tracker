import { useState, useMemo } from 'react';
import { formatDateLocal } from '../../../shared/utils/date';

const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
};

/**
 * A hook to manage date navigation and generate date arrays for the Planner.
 * It encapsulates the logic for weekly/monthly views and memoizes date calculations.
 */
export function useDateNavigator(initialDate: Date = new Date()) {
    const [currentDate, setCurrentDate] = useState(initialDate);

    const handlePrevWeek = () => {
        setCurrentDate(d => {
            const newDate = new Date(d);
            newDate.setDate(newDate.getDate() - 7);
            return newDate;
        });
    };

    const handleNextWeek = () => {
        setCurrentDate(d => {
            const newDate = new Date(d);
            newDate.setDate(newDate.getDate() + 7);
            return newDate;
        });
    };

    const handlePrevMonth = () => {
        setCurrentDate(d => {
            const newDate = new Date(d);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const handleNextMonth = () => {
        setCurrentDate(d => {
            const newDate = new Date(d);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    const weekDays = useMemo(() => {
        const startOfWeek = getMonday(currentDate);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [currentDate]);

    const monthDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let startPadding = firstDay.getDay() - 1;
        if (startPadding < 0) startPadding = 6;

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        for (let i = startPadding - 1; i >= 0; i--) {
            days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        const totalDays = days.length;
        const rowsNeeded = Math.ceil(totalDays / 7);
        const cellsNeeded = rowsNeeded * 7;
        const remaining = cellsNeeded - totalDays;

        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }
        return days;
    }, [currentDate]);

    const weeklyLabel = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const monthlyLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Memoized calculation for reordering week days to show today/future first
    const reorderedWeekDays = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureOrTodayDays = weekDays.filter(day => {
            const dayDate = new Date(day);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate.getTime() >= today.getTime();
        });

        const pastDays = weekDays.filter(day => {
            const dayDate = new Date(day);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate.getTime() < today.getTime();
        });

        return [...futureOrTodayDays, ...pastDays];
    }, [weekDays]);

    const studyTimePeriod = useMemo(() => {
        const startOfWeek = weekDays[0];
        const endOfWeek = weekDays[6];
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        return {
            weekly: {
                start: formatDateLocal(startOfWeek),
                end: formatDateLocal(endOfWeek)
            },
            monthly: {
                start: formatDateLocal(startOfMonth),
                end: formatDateLocal(endOfMonth)
            }
        };

    }, [currentDate, weekDays]);

    return {
        currentDate,
        weekDays,
        monthDays,
        reorderedWeekDays,
        weeklyLabel,
        monthlyLabel,
        studyTimePeriod,
        handlePrevWeek,
        handleNextWeek,
        handlePrevMonth,
        handleNextMonth
    };
}
