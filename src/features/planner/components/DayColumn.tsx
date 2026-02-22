import React, { useState } from 'react';
import { Plus, Check, Trash2, Pencil, Clock, ClockAlert, Hourglass, Calendar as CalendarIcon } from 'lucide-react';
import { PlannerTask } from '../../../shared/types';
import { formatDateLocal, formatTime12Hour } from '../../../shared/utils/date';

interface DayColumnProps {
    date: Date;
    tasks: PlannerTask[];
    isExamDay: boolean;
    isPastDay: boolean;
    onAddTask: () => void;
    onEditTask: (task: PlannerTask) => void;
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onMoveTask: (taskId: string, newDate: string) => void;
    onDuplicateTask: (taskId: string, newDate: string) => void;
}

export function DayColumn({ date, tasks = [], isExamDay, isPastDay, onAddTask, onEditTask, onToggleTask, onDeleteTask, onMoveTask, onDuplicateTask }: DayColumnProps) {
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
        const isDuplicating = e.shiftKey;
        setIsShiftHeld(isDuplicating);
        e.dataTransfer.dropEffect = isDuplicating ? 'copy' : 'move';
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (isPastDay) return;
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
                onDuplicateTask(taskId, formatDateLocal(date));
            } else {
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
                                draggable={!isPastDay}
                                onDragStart={(e) => handleDragStart(e, task.id)}
                            >
                                <div className="task-left">
                                    <div className="task-title">
                                        {task.title && <span className="task-title-text">{task.title}</span>}
                                        {isOverdue(task) && !task.wasShifted && <span className="pending-tag"><ClockAlert size={13} /> Pending</span>}
                                        {task.wasShifted && !task.completed && <span className="delayed-tag"><Hourglass size={13} /> Delayed</span>}
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
                                        <button className="task-btn check-btn" onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }} title={task.completed ? "Mark incomplete" : "Mark complete"}>
                                            <Check size={14} />
                                        </button>
                                        <button className="task-btn edit-btn" onClick={(e) => { e.stopPropagation(); onEditTask(task); }} title="Edit task">
                                            <Pencil size={14} />
                                        </button>
                                        <button className="task-btn delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} title="Delete task">
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
