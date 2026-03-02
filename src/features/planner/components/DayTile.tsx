import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlannerTask } from '../../../shared/types';
import { Clock, FileText } from 'lucide-react';

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

// ─── Cursor-anchored hover panel (portalled to body) ───────────────────────

interface HoverPanelProps {
    x: number;
    y: number;
    date: Date;
    tasks: PlannerTask[];
    studyDisplay: string;
}

function HoverPanel({ x, y, date, tasks, studyDisplay }: HoverPanelProps) {
    const PANEL_WIDTH = 248;
    // Tiny horizontal gap from the cursor tip
    const GAP = 4;

    // Place panel to the right of cursor; flip left if near right edge
    const leftRaw = x + GAP;
    const overflowsRight = leftRaw + PANEL_WIDTH > window.innerWidth - 12;
    const left = overflowsRight ? x - PANEL_WIDTH - GAP : leftRaw;

    // Vertically align near cursor; avoid bottom overflow
    const ESTIMATED_HEIGHT = 52 + tasks.length * 36;
    const topRaw = y - 4;
    const overflowsBottom = topRaw + ESTIMATED_HEIGHT > window.innerHeight - 12;
    const top = overflowsBottom ? y - ESTIMATED_HEIGHT + 4 : topRaw;

    const dateLabel = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    const panel = (
        <div
            className="cal-hover-panel glass-panel"
            style={{ left, top, width: PANEL_WIDTH }}
            role="tooltip"
        >
            <div className="chp-header">
                <span className="chp-date">{dateLabel}</span>
                {studyDisplay && (
                    <span className="chp-study">
                        <Clock size={11} />
                        {studyDisplay}
                    </span>
                )}
            </div>

            <div className="chp-tasks">
                {tasks.map((task) => {
                    const color = task.subject
                        ? SUBJECT_COLORS[task.subject] ?? 'var(--accent)'
                        : 'var(--accent)';
                    return (
                        <div
                            key={task.id}
                            className={`chp-task-pill ${task.completed ? 'completed' : ''}`}
                            style={{ '--chp-pill-color': color } as React.CSSProperties}
                        >
                            <span className="chp-task-dot" />
                            <span className="chp-task-title">{task.title || 'Untitled'}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // Portal to document.body — escapes any ancestor transform/overflow
    return createPortal(panel, document.body);
}

// ─── Main DayTile component ───────────────────────────────────────────────────

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
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const studyDisplay = formatStudyTime(totalStudySeconds);
    const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
    const extraCount = tasks.length - MAX_VISIBLE_TASKS;

    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
        if (tasks.length === 0) return;
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        setHoverPos({ x: e.clientX, y: e.clientY });
    }, [tasks.length]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (tasks.length === 0) return;
        setHoverPos({ x: e.clientX, y: e.clientY });
    }, [tasks.length]);

    const handleMouseLeave = useCallback(() => {
        leaveTimerRef.current = setTimeout(() => setHoverPos(null), 80);
    }, []);

    // Past days: not clickable, no modal
    const handleClick = useCallback(() => {
        if (isPast) return;
        onClick(dateStr);
    }, [isPast, onClick, dateStr]);

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
        <>
            <div
                className={classNames}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                role={isPast ? undefined : 'button'}
                tabIndex={isPast ? -1 : 0}
                onKeyDown={isPast ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(dateStr); }}
                aria-label={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${isPast ? ' (past)' : ''}${tasks.length > 0 ? `, ${tasks.length} tasks` : ''}${totalStudySeconds > 0 ? `, studied ${studyDisplay}` : ''}`}
            >
                {isPast && <div className="past-cross-overlay" />}

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

                <div className="cal-cell-events">
                    {visibleTasks.map((task) => {
                        const color = task.subject
                            ? SUBJECT_COLORS[task.subject] ?? 'var(--accent)'
                            : 'var(--accent)';
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

                {studyDisplay && (
                    <div className="cal-cell-study-row">
                        <Clock size={12} />
                        <span>{studyDisplay}</span>
                    </div>
                )}
            </div>

            {/* Portalled panel — lives on body, unaffected by ancestor transforms */}
            {hoverPos && tasks.length > 0 && (
                <HoverPanel
                    x={hoverPos.x}
                    y={hoverPos.y}
                    date={date}
                    tasks={tasks}
                    studyDisplay={studyDisplay}
                />
            )}
        </>
    );
}

export const DayTile = React.memo(DayTileComponent);
