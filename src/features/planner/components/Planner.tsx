import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { PlannerTask, Subject, SubjectData, StudySession, AppProgress, ExamEntry } from '../../../shared/types';
import { TaskModal } from './TaskModal';
import { WeeklyView } from './WeeklyView';
import { MonthlyView } from './MonthlyView';
import { usePlannerData } from '../hooks/usePlannerData';
import { useDateNavigator } from '../hooks/useDateNavigator';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';

interface PlannerProps {
    tasks: PlannerTask[];
    sessions?: StudySession[];
    progress: AppProgress;
    subjectData: Record<Subject, SubjectData | null>;
    examDate: string;
    examDates?: ExamEntry[];
    initialOpenDate?: string | null;
    onAddTask: (task: PlannerTask) => void;
    onEditTask: (task: PlannerTask) => void;
    onToggleTask: (taskId: string) => void;
    onDeleteTask: (taskId: string) => void;
    onConsumeInitialDate?: () => void;
}

type ViewMode = 'weekly' | 'monthly';

export function Planner({
    tasks,
    sessions = [],
    progress,
    subjectData,
    examDate,
    examDates = [],
    initialOpenDate,
    onAddTask,
    onEditTask,
    onToggleTask,
    onDeleteTask,
    onConsumeInitialDate,
}: PlannerProps) {
    const [viewMode, setViewMode] = useLocalStorage<ViewMode>('ojeet-planner-view', 'weekly');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedDateForTask, setSelectedDateForTask] = useState('');
    const [taskToEdit, setTaskToEdit] = useState<PlannerTask | null>(null);

    // Core Data Hooks
    const { groupedTasks, groupedSessions } = usePlannerData(tasks, sessions);
    const dateNavigator = useDateNavigator();

    // Handle intent to open the modal from another part of the app
    useEffect(() => {
        if (initialOpenDate) {
            setSelectedDateForTask(initialOpenDate);
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
            if (onConsumeInitialDate) onConsumeInitialDate();
        }
    }, [initialOpenDate, onConsumeInitialDate]);

    // Calculate total study time for the current view period
    const totalStudyTime = useMemo(() => {
        const period = dateNavigator.studyTimePeriod[viewMode];
        const relevantSessions = sessions.filter(s => s.startTime.slice(0, 10) >= period.start && s.startTime.slice(0, 10) <= period.end);
        const totalSeconds = relevantSessions.reduce((acc, s) => acc + s.duration, 0);

        if (totalSeconds === 0) return '0h';
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }, [sessions, viewMode, dateNavigator.studyTimePeriod]);


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
            onEditTask({ ...task, date: newDateStr, wasShifted: false });
        }
    };

    const handleDuplicateTask = (taskId: string, newDateStr: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            onAddTask({
                ...task,
                id: crypto.randomUUID(),
                date: newDateStr,
                completed: false,
                completedAt: undefined,
                wasShifted: false
            });
        }
    };

    const handleSaveTask = (task: PlannerTask) => {
        if (taskToEdit) {
            onEditTask(task);
        } else {
            onAddTask(task);
        }
    };

    const handlePrev = viewMode === 'monthly' ? dateNavigator.handlePrevMonth : dateNavigator.handlePrevWeek;
    const handleNext = viewMode === 'monthly' ? dateNavigator.handleNextMonth : dateNavigator.handleNextWeek;
    const currentLabel = viewMode === 'monthly' ? dateNavigator.monthlyLabel : dateNavigator.weeklyLabel;

    return (
        <div className="planner-page">
            <div className="planner-header">
                <div className="view-toggles">
                    <button className={`view-btn ${viewMode === 'weekly' ? 'active' : ''}`} onClick={() => setViewMode('weekly')}>Weekly</button>
                    <button className={`view-btn ${viewMode === 'monthly' ? 'active' : ''}`} onClick={() => setViewMode('monthly')}>Monthly</button>
                </div>
                <div className="study-time-display">
                    <Clock size={16} />
                    <span>{totalStudyTime}</span>
                </div>
                <div className="date-controls">
                    <button onClick={handlePrev}><ChevronLeft size={20} /></button>
                    <span className="current-date-range">{currentLabel}</span>
                    <button onClick={handleNext}><ChevronRight size={20} /></button>
                </div>
            </div>

            {viewMode === 'weekly' ? (
                <WeeklyView
                    reorderedWeekDays={dateNavigator.reorderedWeekDays}
                    groupedTasks={groupedTasks}
                    examDate={examDate}
                    onAddTask={handleAddTaskClick}
                    onEditTask={handleEditClick}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
                    onMoveTask={handleMoveTask}
                    onDuplicateTask={handleDuplicateTask}
                />
            ) : (
                <MonthlyView
                    monthDays={dateNavigator.monthDays}
                    groupedTasks={groupedTasks}
                    groupedSessions={groupedSessions}
                    examDate={examDate}
                    examDates={examDates}
                    tasks={tasks}
                    sessions={sessions}
                    year={dateNavigator.currentDate.getFullYear()}
                    month={dateNavigator.currentDate.getMonth()}
                    onAddTask={handleAddTaskClick}
                    onToggleTask={onToggleTask}
                />
            )}

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleSaveTask}
                initialDate={selectedDateForTask}
                subjectData={subjectData}
                taskToEdit={taskToEdit}
                progress={progress}
            />
        </div>
    );
}
