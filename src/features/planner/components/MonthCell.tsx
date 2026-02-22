import React from 'react';
import { PlannerTask, StudySession } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';

interface MonthCellProps {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    isExamDay: boolean;
    tasks: PlannerTask[];
    sessions: StudySession[];
    onAddTask: (date: string) => void;
}

function MonthCellComponent({ date, isCurrentMonth, isToday, isPast, isExamDay, tasks, sessions, onAddTask }: MonthCellProps) {
    const dateStr = formatDateLocal(date);
    const pendingCount = tasks.filter(t => !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;

    // Pseudo-random cross image for past days
    const crossImageNum = isPast ? ((date.getDate() + date.getMonth()) % 5) + 1 : 0;
    const randomContrast = isPast ? 0.75 + ((date.getDate() * 7 + date.getMonth() * 13) % 50) / 100 : 1;

    // Calculate study hours for this day
    const dayStudySeconds = sessions.reduce((acc, s) => acc + s.duration, 0);
    const studyHoursDisplay = dayStudySeconds > 0
        ? dayStudySeconds >= 3600
            ? `${Math.floor(dayStudySeconds / 3600)}h ${Math.floor((dayStudySeconds % 3600) / 60)}m`
            : `${Math.floor(dayStudySeconds / 60)}m`
        : '';

    const cellTitle = `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${totalTasks > 0 ? ` • ${totalTasks} task(s)` : ''}${dayStudySeconds > 0 ? ` • Studied: ${studyHoursDisplay}` : ''}${isPast ? ' (Past)' : ''}`;

    return (
        <div
            className={`month-day-cell ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''} ${isExamDay ? 'exam-day' : ''} ${isPast ? 'past-day' : ''}`}
            onClick={() => !isPast && onAddTask(dateStr)}
            title={cellTitle}
        >
            {isPast && (
                <div
                    className="cross-overlay"
                    style={{
                        backgroundImage: `url('/cross-images/cross${crossImageNum}.png')`,
                        filter: `contrast(${randomContrast})`
                    }}
                />
            )}
            <div className="cell-top">
                <span className="month-day-number">{date.getDate()}</span>
            </div>
            <div className="cell-center">
                {studyHoursDisplay && <span className="study-hours">{studyHoursDisplay}</span>}
            </div>
            <div className="cell-content">
                {totalTasks > 0 && (
                    <div className="month-task-dots">
                        {Array.from({ length: Math.min(completedCount, 10) }).map((_, i) => (
                            <span key={`c-${i}`} className="task-dot completed"></span>
                        ))}
                        {Array.from({ length: Math.min(pendingCount, 10) }).map((_, i) => (
                            <span key={`p-${i}`} className="task-dot pending"></span>
                        ))}
                    </div>
                )}
            </div>
            {isExamDay && <div className="exam-badge">📝</div>}
        </div>
    );
}

// Memoize the component to prevent re-renders unless its specific props change.
// This is critical for the performance of the monthly grid.
export const MonthCell = React.memo(MonthCellComponent);
