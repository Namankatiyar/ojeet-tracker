import { MonthCell } from './MonthCell';
import { PlannerTask, StudySession } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';

interface MonthlyViewProps {
    monthDays: { date: Date; isCurrentMonth: boolean }[];
    groupedTasks: Map<string, PlannerTask[]>;
    groupedSessions: Map<string, StudySession[]>;
    examDate: string;
    onAddTask: (date: string) => void;
}

export function MonthlyView({ monthDays, groupedTasks, groupedSessions, examDate, onAddTask }: MonthlyViewProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="monthly-calendar">
            <div className="month-header-row">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                    <div key={day} className={`month-day-header ${i === 5 || i === 6 ? 'weekend' : ''}`}>{day}</div>
                ))}
            </div>
            <div className="month-grid">
                {monthDays.map(({ date, isCurrentMonth }, index) => {
                    const dateStr = formatDateLocal(date);
                    const cellDate = new Date(date);
                    cellDate.setHours(0, 0, 0, 0);

                    return (
                        <MonthCell
                            key={index}
                            date={date}
                            isCurrentMonth={isCurrentMonth}
                            isToday={today.getTime() === cellDate.getTime()}
                            isPast={cellDate.getTime() < today.getTime()}
                            isExamDay={dateStr === examDate}
                            tasks={groupedTasks.get(dateStr) || []}
                            sessions={groupedSessions.get(dateStr) || []}
                            onAddTask={onAddTask}
                        />
                    );
                })}
            </div>
        </div>
    );
}
