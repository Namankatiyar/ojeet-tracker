import { useState, useEffect, useRef } from 'react';
import { PlannerTask } from '../../../shared/types';
import { X, Clock, CheckCircle2, Circle, Plus, Square, CheckSquare } from 'lucide-react';

interface DayModalProps {
    isOpen: boolean;
    date: Date | null;
    dateStr: string;
    tasks: PlannerTask[];
    totalStudySeconds: number;
    onClose: () => void;
    onToggleTask: (taskId: string) => void;
    onAddTask: (dateStr: string) => void;
}

function formatStudyTime(seconds: number): string {
    if (seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function DayModal({
    isOpen,
    date,
    dateStr,
    tasks,
    totalStudySeconds,
    onClose,
    onToggleTask,
    onAddTask,
}: DayModalProps) {
    const [isClosing, setIsClosing] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const completedTasks = tasks.filter(t => t.completed);
    const incompleteTasks = tasks.filter(t => !t.completed);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // ESC to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Focus trap on mount
    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            handleClose();
        }
    };

    if (!isOpen || !date) return null;

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div
            className={`day-modal-overlay ${isClosing ? 'closing' : ''}`}
            ref={overlayRef}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-label={`Tasks for ${formattedDate}`}
        >
            <div
                className={`day-modal-content glass-panel ${isClosing ? 'closing' : ''}`}
                ref={modalRef}
                tabIndex={-1}
            >
                {/* Header */}
                <div className="day-modal-header">
                    <div className="day-modal-title-row">
                        <h2 className="day-modal-date">{formattedDate}</h2>
                        <button className="day-modal-close" onClick={handleClose} aria-label="Close modal">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="day-modal-study-time">
                        <Clock size={14} />
                        <span>Study Time: {formatStudyTime(totalStudySeconds)}</span>
                    </div>
                </div>

                {/* Body */}
                <div className="day-modal-body">
                    {/* Incomplete Tasks */}
                    {incompleteTasks.length > 0 && (
                        <div className="day-modal-section">
                            <h3 className="day-modal-section-title pending">
                                <Circle size={12} /> Pending ({incompleteTasks.length})
                            </h3>
                            <ul className="day-modal-task-list">
                                {incompleteTasks.map(task => (
                                    <li key={task.id} className="day-modal-task-item">
                                        <div className="day-modal-task-label" onClick={() => onToggleTask(task.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleTask(task.id); }}>
                                            <Square size={18} className="day-modal-check-icon unchecked" />
                                            <span className="day-modal-task-text">
                                                {task.title}
                                                {task.subtitle && (
                                                    <span className="day-modal-task-subtitle"> — {task.subtitle}</span>
                                                )}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                        <div className="day-modal-section">
                            <h3 className="day-modal-section-title completed">
                                <CheckCircle2 size={12} /> Completed ({completedTasks.length})
                            </h3>
                            <ul className="day-modal-task-list">
                                {completedTasks.map(task => (
                                    <li key={task.id} className="day-modal-task-item completed">
                                        <div className="day-modal-task-label" onClick={() => onToggleTask(task.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleTask(task.id); }}>
                                            <CheckSquare size={18} className="day-modal-check-icon checked" />
                                            <span className="day-modal-task-text strikethrough">
                                                {task.title}
                                                {task.subtitle && (
                                                    <span className="day-modal-task-subtitle"> — {task.subtitle}</span>
                                                )}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {tasks.length === 0 && (
                        <div className="day-modal-empty">
                            No tasks for this day yet.
                        </div>
                    )}
                </div>

                {/* Footer: Add Task */}
                <div className="day-modal-footer">
                    <button
                        className="day-modal-add-btn"
                        onClick={() => { onAddTask(dateStr); handleClose(); }}
                    >
                        <Plus size={16} /> Add Task
                    </button>
                </div>
            </div>
        </div>
    );
}
