import { useMemo } from 'react';
import { DayTile } from './DayTile';
import { PlannerTask, StudySession, ExamEntry } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';
import { useMonthlyData } from '../hooks/useMonthlyData';

interface CalendarGridProps {
    monthDays: { date: Date; isCurrentMonth: boolean }[];
    tasks: PlannerTask[];
    sessions: StudySession[];
    examDate: string;
    examDates: ExamEntry[];
    year: number;
    month: number;
    onDayClick: (dateStr: string) => void;
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarGrid({
    monthDays,
    tasks,
    sessions,
    examDates,
    year,
    month,
    onDayClick,
}: CalendarGridProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { getDayData } = useMonthlyData(tasks, sessions, year, month);

    // Build a map of date string → exam name for quick lookup
    const examDateMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const exam of examDates) {
            map.set(exam.date, exam.name);
        }
        return map;
    }, [examDates]);

    // Split monthDays into weeks (rows of 7)
    const weeks: { date: Date; isCurrentMonth: boolean }[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
        weeks.push(monthDays.slice(i, i + 7));
    }

    return (
        <div className="apple-cal glass-panel">
            {/* Weekday header row */}
            <div className="apple-cal-header">
                {WEEKDAY_HEADERS.map((day, i) => (
                    <div
                        key={day}
                        className={`apple-cal-weekday ${i >= 5 ? 'weekend' : ''}`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar body — week rows */}
            <div className="apple-cal-body">
                {weeks.map((week, weekIdx) => (
                    <div className="apple-cal-week" key={weekIdx}>
                        {week.map(({ date, isCurrentMonth }, dayIdx) => {
                            const dateStr = formatDateLocal(date);
                            const cellDate = new Date(date);
                            cellDate.setHours(0, 0, 0, 0);
                            const dayData = getDayData(dateStr);
                            const examName = examDateMap.get(dateStr);

                            return (
                                <DayTile
                                    key={dayIdx}
                                    date={date}
                                    dateStr={dateStr}
                                    isCurrentMonth={isCurrentMonth}
                                    isToday={today.getTime() === cellDate.getTime()}
                                    isPast={cellDate.getTime() < today.getTime()}
                                    isExamDay={!!examName}
                                    examName={examName}
                                    tasks={dayData.tasks}
                                    totalStudySeconds={dayData.totalStudySeconds}
                                    onClick={onDayClick}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
