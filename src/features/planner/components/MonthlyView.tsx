import { useState } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { DayModal } from './DayModal';
import { PlannerTask, StudySession, ExamEntry } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';
import { useMonthlyData } from '../hooks/useMonthlyData';

interface MonthlyViewProps {
    monthDays: { date: Date; isCurrentMonth: boolean }[];
    groupedTasks: Map<string, PlannerTask[]>;
    groupedSessions: Map<string, StudySession[]>;
    examDate: string;
    examDates: ExamEntry[];
    tasks: PlannerTask[];
    sessions: StudySession[];
    year: number;
    month: number;
    onAddTask: (date: string) => void;
    onToggleTask: (taskId: string) => void;
}

export function MonthlyView({
    monthDays,
    tasks,
    sessions,
    examDate,
    examDates,
    year,
    month,
    onAddTask,
    onToggleTask,
}: MonthlyViewProps) {
    const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
    const { getDayData } = useMonthlyData(tasks, sessions, year, month);

    const handleDayClick = (dateStr: string) => {
        setSelectedDateStr(dateStr);
    };

    const handleCloseModal = () => {
        setSelectedDateStr(null);
    };

    // Derive selected date object from the string
    const selectedDate = selectedDateStr
        ? monthDays.find(d => formatDateLocal(d.date) === selectedDateStr)?.date ?? null
        : null;

    const selectedDayData = selectedDateStr ? getDayData(selectedDateStr) : { tasks: [], totalStudySeconds: 0 };

    return (
        <>
            <CalendarGrid
                monthDays={monthDays}
                tasks={tasks}
                sessions={sessions}
                examDate={examDate}
                examDates={examDates}
                year={year}
                month={month}
                onDayClick={handleDayClick}
            />

            <DayModal
                isOpen={selectedDateStr !== null}
                date={selectedDate}
                dateStr={selectedDateStr ?? ''}
                tasks={selectedDayData.tasks}
                totalStudySeconds={selectedDayData.totalStudySeconds}
                onClose={handleCloseModal}
                onToggleTask={onToggleTask}
                onAddTask={onAddTask}
            />
        </>
    );
}
