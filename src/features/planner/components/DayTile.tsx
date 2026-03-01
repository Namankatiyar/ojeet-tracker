import React, { useState } from 'react';
import { PlannerTask } from '../../../shared/types';
import { Clock, BookOpen, CheckCircle2, Circle, FileText } from 'lucide-react';

interface DayTileProps {
    date: Date;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    isExamDay: boolean;
    examName?: string;
    tasks: PlannerTask[];
    totalStudySeconds: number;
    onClick: (dateStr: string) => void;
}

const MAX_VISIBLE_TASKS = 2;

const SUBJECT_COLORS: Record<string, string> = {
    physics: '#6366f1',
    chemistry: '#10b981',
    maths: '#f59e0b',
};

function formatStudyTime(seconds: number): string {
    if (seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DayTileComponent({
    date,
    dateStr,
    isCurrentMonth,
    isToday,
    isPast,
    isExamDay,
    examName,
    tasks,
    totalStudySeconds,
    onClick,
}: DayTileProps) {
    const [showPreview, setShowPreview] = useState(false);

    const studyDisplay = formatStudyTime(totalStudySeconds);
    const completedTasks = tasks.filter(t => t.completed);
    const incompleteTasks = tasks.filter(t => !t.completed);
    const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
    const extraCount = tasks.length - MAX_VISIBLE_TASKS;

    const classNames = [
        'cal-cell',
        !isCurrentMonth && 'other-month',
        isToday && 'today',
        isPast && 'past-day',
        isExamDay && 'exam-day',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={classNames}
            onClick={() => onClick(dateStr)}
            onMouseEnter={() => setShowPreview(true)}
            onMouseLeave={() => setShowPreview(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(dateStr); }}
            aria-label={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${tasks.length > 0 ? `, ${tasks.length} tasks` : ''}${totalStudySeconds > 0 ? `, studied ${studyDisplay}` : ''}`}
        >
            {/* Past day subtle diagonal cross */}
            {isPast && <div className="past-cross-overlay" />}

            {/* Top row: Date number + Exam name */}
            <div className="cal-cell-header">
                <span className={`cal-date-num${isToday ? ' cal-today-badge' : ''}`}>
                    {date.getDate()}
                </span>
                {examName && (
                    <span className="cal-exam-label">
                        <FileText size={13} />
                        {examName}
                    </span>
                )}
            </div>

            {/* Task event bars (Apple Calendar-style pills) */}
            <div className="cal-cell-events">
                {visibleTasks.map((task) => {
                    const color = task.subject ? SUBJECT_COLORS[task.subject] || 'var(--accent)' : 'var(--accent)';
                    return (
                        <div
                            key={task.id}
                            className={`cal-event-pill ${task.completed ? 'completed' : ''}`}
                            style={{ '--pill-color': color } as React.CSSProperties}
                        >
                            <span className="cal-event-dot" />
                            <span className="cal-event-text">{task.title}</span>
                        </div>
                    );
                })}
                {extraCount > 0 && (
                    <span className="cal-event-more">+{extraCount} more</span>
                )}
            </div>

            {/* Study time at bottom if present */}
            {studyDisplay && (
                <div className="cal-cell-study-row">
                    <Clock size={12} />
                    <span>{studyDisplay}</span>
                </div>
            )}

            {/* Hover Preview Panel */}
            {showPreview && tasks.length > 0 && (
                <div className="cal-preview-panel glass-panel" role="tooltip">
                    {studyDisplay && (
                        <div className="preview-row">
                            <BookOpen size={12} />
                            <span>{studyDisplay} studied</span>
                        </div>
                    )}
                    {completedTasks.length > 0 && (
                        <div className="preview-row completed">
                            <CheckCircle2 size={12} />
                            <span>{completedTasks.length} completed</span>
                        </div>
                    )}
                    {incompleteTasks.length > 0 && (
                        <div className="preview-row pending">
                            <Circle size={12} />
                            <span>{incompleteTasks.length} pending</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const DayTile = React.memo(DayTileComponent);
