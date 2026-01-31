import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Calendar as CalendarIcon, Clock, Pencil, ClockAlert, Hourglass } from 'lucide-react';
import { PlannerTask, Subject, SubjectData, StudySession } from '../../../shared/types';
import { TaskModal } from './TaskModal';
import { formatDateLocal, formatTime12Hour } from '../../../shared/utils/date';

interface PlannerProps {
    tasks: PlannerTask[];
    onAddTask: (task: PlannerTask) => void;
    onEditTask: (task: PlannerTask) => void;
    onToggleTask: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
    subjectData: Record<Subject, SubjectData | null>;
    examDate: string;
    initialOpenDate?: string | null;
    onConsumeInitialDate?: () => void;
    sessions?: StudySession[];
}

type ViewMode = 'weekly' | 'monthly';

export function Planner({ tasks, onAddTask, onEditTask, onToggleTask, onDeleteTask, subjectData, examDate, initialOpenDate, onConsumeInitialDate, sessions = [] }: PlannerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('weekly');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedDateForTask, setSelectedDateForTask] = useState('');
    const [taskToEdit, setTaskToEdit] = useState<PlannerTask | null>(null);

    // Handle initial open intent
    useEffect(() => {
        if (initialOpenDate) {
            setSelectedDateForTask(initialOpenDate);
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
            if (onConsumeInitialDate) onConsumeInitialDate();
        }
    }, [initialOpenDate, onConsumeInitialDate]);

    const getMonday = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(date.setDate(diff));
    };

    const startOfWeek = getMonday(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
    });

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    // Get all days for the current month grid (includes padding days from prev/next months)
    const getMonthDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Get the day of week for the first day (0 = Sunday, adjust for Monday start)
        let startPadding = firstDay.getDay() - 1;
        if (startPadding < 0) startPadding = 6; // Sunday becomes 6

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        // Add padding days from previous month
        for (let i = startPadding - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({ date: d, isCurrentMonth: false });
        }

        // Add days of current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        // Add padding days from next month to complete the grid
        // Only add enough to complete the current row (not a full 6 rows)
        const totalDays = days.length;
        const rowsNeeded = Math.ceil(totalDays / 7);
        const cellsNeeded = rowsNeeded * 7;
        const remaining = cellsNeeded - totalDays;

        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            days.push({ date: d, isCurrentMonth: false });
        }

        return days;
    };

    const monthDays = getMonthDays();

    const getTasksForDate = (dateStr: string) => {
        return tasks.filter(t => t.date === dateStr).sort((a, b) => {
            // Priority: 1. New tasks (not completed, not shifted), 2. Shifted/delayed, 3. Completed
            const aIsCompleted = a.completed;
            const bIsCompleted = b.completed;
            const aIsShifted = a.wasShifted && !a.completed;
            const bIsShifted = b.wasShifted && !b.completed;
            const aIsNew = !a.completed && !a.wasShifted;
            const bIsNew = !b.completed && !b.wasShifted;

            // New tasks come first
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;

            // Then shifted/delayed tasks
            if (aIsShifted && !bIsShifted && !bIsNew) return -1;
            if (!aIsShifted && !aIsNew && bIsShifted) return 1;

            // Completed tasks come last
            if (aIsCompleted && !bIsCompleted) return 1;
            if (!aIsCompleted && bIsCompleted) return -1;

            // Within same category, sort by time
            return a.time.localeCompare(b.time);
        });
    };

    const handleAddTaskClick = (dateStr: string) => {
        setSelectedDateForTask(dateStr);
        setTaskToEdit(null);
        setIsTaskModalOpen(true);
    };

    const handleEditClick = (task: PlannerTask) => {
        setTaskToEdit(task);
        setSelectedDateForTask(task.date);
        setIsTaskModalOpen(true);
    };

    const handleMoveTask = (taskId: string, newDateStr: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.date !== newDateStr) {
            onEditTask({ ...task, date: newDateStr });
        }
    };

    const handleDuplicateTask = (taskId: string, newDateStr: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const duplicatedTask: PlannerTask = {
                ...task,
                id: crypto.randomUUID(),
                date: newDateStr,
                completed: false,
                completedAt: undefined,
                wasShifted: false
            };
            onAddTask(duplicatedTask);
        }
    };

    const handleSaveTask = (task: PlannerTask) => {
        if (taskToEdit) {
            onEditTask(task);
        } else {
            onAddTask(task);
        }
    };

    // Calculate study time for the current view period
    const getStudyTimeForPeriod = (): string => {
        let startDate: Date, endDate: Date;

        if (viewMode === 'weekly') {
            startDate = startOfWeek;
            endDate = new Date(startOfWeek);
            endDate.setDate(endDate.getDate() + 6);
        } else {
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }

        const startStr = formatDateLocal(startDate);
        const endStr = formatDateLocal(endDate);

        const totalSeconds = sessions
            .filter(s => s.startTime.slice(0, 10) >= startStr && s.startTime.slice(0, 10) <= endStr)
            .reduce((acc, s) => acc + s.duration, 0);

        if (totalSeconds === 0) return '0h';
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    return (
        <div className="planner-page">
            <div className="planner-header">
                <div className="view-toggles">
                    <button
                        className={`view-btn ${viewMode === 'weekly' ? 'active' : ''}`}
                        onClick={() => setViewMode('weekly')}
                    >
                        Weekly
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                        onClick={() => setViewMode('monthly')}
                    >
                        Monthly
                    </button>
                </div>

                <div className="study-time-display">
                    <Clock size={16} />
                    <span>{getStudyTimeForPeriod()}</span>
                </div>

                <div className="date-controls">
                    <button onClick={viewMode === 'monthly' ? handlePrevMonth : handlePrevWeek}>
                        <ChevronLeft size={20} />
                    </button>
                    <span className="current-date-range">
                        {viewMode === 'monthly'
                            ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                            : `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        }
                    </span>
                    <button onClick={viewMode === 'monthly' ? handleNextMonth : handleNextWeek}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {viewMode === 'monthly' ? (
                <div className="monthly-calendar">
                    <div className="month-header-row">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                            <div key={day} className={`month-day-header ${i === 5 || i === 6 ? 'weekend' : ''}`}>{day}</div>
                        ))}
                    </div>
                    <div className="month-grid">
                        {monthDays.map(({ date, isCurrentMonth }, index) => {
                            const dateStr = formatDateLocal(date);
                            const dayTasks = getTasksForDate(dateStr);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const cellDate = new Date(date);
                            cellDate.setHours(0, 0, 0, 0);
                            const isToday = today.getTime() === cellDate.getTime();
                            const isPast = cellDate < today;
                            const isExamDay = dateStr === examDate;
                            const pendingCount = dayTasks.filter(t => !t.completed).length;
                            const completedCount = dayTasks.filter(t => t.completed).length;
                            const totalTasks = dayTasks.length;
                            // Random cross image for past days (1-5) with random contrast
                            const crossImageNum = isPast ? ((date.getDate() + date.getMonth()) % 5) + 1 : 0;
                            // Random contrast between 0.75 and 1.25 (25% range)
                            const randomContrast = isPast ? 0.75 + ((date.getDate() * 7 + date.getMonth() * 13) % 50) / 100 : 1;

                            // Get study hours for this day
                            const dayStudyHours = sessions
                                .filter(s => s.startTime.startsWith(dateStr))
                                .reduce((acc, s) => acc + s.duration, 0);
                            const studyHoursDisplay = dayStudyHours > 0
                                ? dayStudyHours >= 3600
                                    ? `${Math.floor(dayStudyHours / 3600)}h ${Math.floor((dayStudyHours % 3600) / 60)}m`
                                    : `${Math.floor(dayStudyHours / 60)}m`
                                : '';

                            return (
                                <div
                                    key={index}
                                    className={`month-day-cell ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''} ${isExamDay ? 'exam-day' : ''} ${isPast ? 'past-day' : ''}`}
                                    onClick={() => !isPast && handleAddTaskClick(dateStr)}
                                    title={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${totalTasks > 0 ? ` • ${totalTasks} task(s)` : ''}${dayStudyHours > 0 ? ` • Studied: ${studyHoursDisplay}` : ''}${isPast ? ' (Past)' : ''}`}
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
                                                {/* Show individual dots for each completed task */}
                                                {Array.from({ length: Math.min(completedCount, 10) }).map((_, i) => (
                                                    <span key={`c-${i}`} className="task-dot completed"></span>
                                                ))}
                                                {/* Show individual dots for each pending task */}
                                                {Array.from({ length: Math.min(pendingCount, 10) }).map((_, i) => (
                                                    <span key={`p-${i}`} className="task-dot pending"></span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {isExamDay && <div className="exam-badge">📝</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="weekly-grid">
                    {/* Reorder days: today and remaining days first, then past days */}
                    {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const remainingDays = weekDays.filter(day => {
                            const dayDate = new Date(day);
                            dayDate.setHours(0, 0, 0, 0);
                            return dayDate >= today;
                        });

                        const pastDays = weekDays.filter(day => {
                            const dayDate = new Date(day);
                            dayDate.setHours(0, 0, 0, 0);
                            return dayDate < today;
                        });

                        const reorderedDays = [...remainingDays, ...pastDays];

                        return reorderedDays.map(day => (
                            <DayColumn
                                key={day.toISOString()}
                                date={day}
                                tasks={getTasksForDate(formatDateLocal(day))}
                                onAddTask={() => handleAddTaskClick(formatDateLocal(day))}
                                onEditTask={handleEditClick}
                                onToggleTask={onToggleTask}
                                onDeleteTask={onDeleteTask}
                                onMoveTask={handleMoveTask}
                                onDuplicateTask={handleDuplicateTask}
                                isExamDay={formatDateLocal(day) === examDate}
                                isPastDay={day.setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)}
                            />
                        ));
                    })()}
                </div>
            )}

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleSaveTask}
                initialDate={selectedDateForTask}
                subjectData={subjectData}
                taskToEdit={taskToEdit}
            />
        </div>
    );
}

function DayColumn({ date, tasks, onAddTask, onEditTask, onToggleTask, onDeleteTask, isExamDay, onMoveTask, onDuplicateTask, isPastDay }: {
    date: Date,
    tasks: PlannerTask[],
    onAddTask: () => void,
    onEditTask: (task: PlannerTask) => void,
    onToggleTask: (id: string) => void,
    onDeleteTask: (id: string) => void,
    onMoveTask: (taskId: string, newDate: string) => void,
    onDuplicateTask: (taskId: string, newDate: string) => void,
    isExamDay: boolean,
    isPastDay: boolean
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isShiftHeld, setIsShiftHeld] = useState(false);
    const isToday = new Date().toDateString() === date.toDateString();

    const isOverdue = (task: PlannerTask) => {
        if (task.completed) return false;
        const now = new Date();
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        return now > taskDateTime;
    };

    const getTaskTimeDisplay = (task: PlannerTask) => {
        if (task.completed && task.completedAt) {
            const completedDate = new Date(task.completedAt);
            return `Done ${formatTime12Hour(completedDate.getHours().toString().padStart(2, '0') + ':' + completedDate.getMinutes().toString().padStart(2, '0'))}`;
        }
        return formatTime12Hour(task.time);
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDragEnter = (e: React.DragEvent) => {
        if (isPastDay) return;
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (isPastDay) return;
        e.preventDefault();
        // Update visual feedback based on shift key
        const isDuplicating = e.shiftKey;
        setIsShiftHeld(isDuplicating);
        e.dataTransfer.dropEffect = isDuplicating ? 'copy' : 'move';
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (isPastDay) return;
        // Check if we are actually leaving the container
        if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
            return;
        }
        setIsDragOver(false);
        setIsShiftHeld(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        setIsShiftHeld(false);
        if (isPastDay) return;

        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
            if (e.shiftKey) {
                // Shift held - duplicate task
                onDuplicateTask(taskId, formatDateLocal(date));
            } else {
                // Normal drag - move task
                onMoveTask(taskId, formatDateLocal(date));
            }
        }
    };

    return (
        <div
            className={`day-column ${isToday ? 'today' : ''} ${isExamDay ? 'exam-day-col' : ''} ${isDragOver ? 'drag-over' : ''} ${isShiftHeld ? 'shift-copy' : ''} ${isPastDay ? 'past-day' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="day-header">
                <div className="day-header-left">
                    <span className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="day-number">{date.getDate()}</span>
                </div>
                {!isPastDay && (
                    <button className="header-add-btn" onClick={onAddTask} title="Add task">
                        <Plus size={18} />
                    </button>
                )}
            </div>

            <div className="tasks-list">
                {isExamDay && (
                    <div className="exam-event-card">
                        <div className="exam-icon-wrapper">
                            <CalendarIcon size={20} />
                        </div>
                        <div className="exam-content">
                            <span className="exam-title">JEE Main Exam</span>
                            <span className="exam-subtitle">Good Luck! 🎯</span>
                        </div>
                    </div>
                )}
                {tasks.length > 0 ? (
                    <>
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                className={`planner-task ${task.completed ? 'completed' : ''}`}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, task.id)}
                            >
                                <div className="task-left">
                                    <div className="task-title">
                                        {task.title && <span className="task-title-text">{task.title}</span>}
                                        {isOverdue(task) && !task.wasShifted && <span className="pending-tag">
                                            <ClockAlert size={13} />
                                            Pending</span>}
                                        {task.wasShifted && !task.completed && <span className="delayed-tag">
                                            <Hourglass size={13} />
                                            Delayed</span>}
                                    </div>
                                    <div className="task-subtitle">
                                        {task.subject && (
                                            <span className={`subject-tag text-${task.subject}`}>
                                                {task.subject.charAt(0).toUpperCase() + task.subject.slice(1)} {task.subtitle ? '•' : ''}
                                            </span>
                                        )}
                                        {task.subtitle && <span className="material-name">{task.subtitle}</span>}
                                    </div>
                                </div>

                                <div className="task-right">
                                    <div className={`task-meta ${task.wasShifted && !task.completed ? 'delayed' : ''} ${task.completed ? 'completed-time' : ''}`}>
                                        <Clock size={13} />
                                        <span>{getTaskTimeDisplay(task)}</span>
                                    </div>
                                    <div className="task-actions">
                                        <button
                                            className="task-btn check-btn"
                                            onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                                            title={task.completed ? "Mark incomplete" : "Mark complete"}
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            className="task-btn edit-btn"
                                            onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                            title="Edit task"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="task-btn delete-btn"
                                            onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                            title="Delete task"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {!isPastDay && (
                            <div className="inline-add-task" onClick={onAddTask}>
                                <Plus size={14} />
                                <span>Add Task</span>
                            </div>
                        )}
                    </>
                ) : (
                    !isPastDay && (
                        <div className="skeleton-task" onClick={onAddTask}>
                            <div className="skeleton-overlay">
                                <Plus size={20} />
                                <span>Plan this day</span>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}