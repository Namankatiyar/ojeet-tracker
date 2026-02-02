import { useState, useEffect } from 'react';
import { ProgressRing } from '../../../shared/components/ui/ProgressBar';
import { Subject, SubjectData, PlannerTask, StudySession, MockScore } from '../../../shared/types';
import { TaskLog } from '../../planner/components/TaskLog';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';
import { AnalyticsPanels } from './AnalyticsPanels';
import { Atom, FlaskConical, Calculator, Zap, Calendar, Check } from 'lucide-react';
import { formatDateLocal, formatTime12Hour } from '../../../shared/utils/date';

interface DashboardProps {
    physicsProgress: number;
    chemistryProgress: number;
    mathsProgress: number;
    overallProgress: number;
    subjectData: Record<Subject, SubjectData | null>;
    onNavigate: (subject: Subject) => void;
    quote?: { quote: string; author: string } | null;
    plannerTasks: PlannerTask[];
    onToggleTask: (taskId: string) => void;
    examDate: string;
    onExamDateChange: (date: string) => void;
    onQuickAdd: () => void;
    studySessions?: StudySession[];
    mockScores?: MockScore[];
    onAddMockScore?: (score: Omit<MockScore, 'id'>) => void;
    onDeleteMockScore?: (id: string) => void;
}

export function Dashboard({
    physicsProgress,
    chemistryProgress,
    mathsProgress,
    overallProgress,
    subjectData,
    onNavigate,
    quote,
    plannerTasks,
    onToggleTask,
    examDate,
    onExamDateChange,
    onQuickAdd,
    studySessions = [],
    mockScores = [],
    onAddMockScore = () => { },
    onDeleteMockScore = () => { }
}: DashboardProps) {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Reset exam date if it has passed
    useEffect(() => {
        if (examDate) {
            const target = new Date(examDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            target.setHours(0, 0, 0, 0);

            if (target < today) {
                onExamDateChange('');
            }
        }
    }, [examDate, onExamDateChange]);

    const subjects: { key: Subject; label: string; icon: React.ReactNode; progress: number; color: string }[] = [
        { key: 'physics', label: 'Physics', icon: <Atom size={24} />, progress: physicsProgress, color: 'var(--accent)' },
        { key: 'chemistry', label: 'Chemistry', icon: <FlaskConical size={24} />, progress: chemistryProgress, color: 'var(--accent)' },
        { key: 'maths', label: 'Maths', icon: <Calculator size={24} />, progress: mathsProgress, color: 'var(--accent)' },
    ];

    const getChapterStats = (subject: Subject) => {
        const data = subjectData[subject];
        if (!data) return { total: 0, completed: 0 };
        return { total: data.chapters.length, completed: 0 };
    };

    const calculateDaysRemaining = () => {
        if (!examDate) return null;
        const target = new Date(examDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);

        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysRemaining = calculateDaysRemaining();

    const getCountdownColor = (days: number) => {
        const hue = Math.min(Math.max(days * 2, 0), 120);
        return `hsl(${hue}, 90%, 55%)`;
    };

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return 'Set Target Date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const todayStr = formatDateLocal(new Date());
    const todaysTasks = plannerTasks
        .filter(t => t.date === todayStr)
        .sort((a, b) => {
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

    const isTaskOverdue = (task: PlannerTask) => {
        if (task.completed) return false;
        const now = new Date();
        const [hours, minutes] = task.time.split(':').map(Number);
        const taskTime = new Date();
        taskTime.setHours(hours, minutes, 0, 0);
        return now > taskTime;
    };

    const getTaskTimeDisplay = (task: PlannerTask) => {
        if (task.completed && task.completedAt) {
            const completedDate = new Date(task.completedAt);
            return `Done ${formatTime12Hour(completedDate.getHours().toString().padStart(2, '0') + ':' + completedDate.getMinutes().toString().padStart(2, '0'))}`;
        }
        return formatTime12Hour(task.time);
    };

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                {quote ? (
                    <div className="quote-container">
                        <h1>"{quote.quote}"</h1>
                        <p className="quote-author">- {quote.author}</p>
                    </div>
                ) : (
                    <h1>Your Progress</h1>
                )}
            </div>

            <div className="dashboard-stats-row">
                <div className="overall-progress-card">
                    <div className="overall-header">
                        <h2>Overall Progress</h2>
                        <p>Combined progress across all subjects</p>
                    </div>
                    <div className="overall-ring-wrapper">
                        <ProgressRing progress={overallProgress} size={130} strokeWidth={10} color="var(--accent)" />
                        <div className="total-study-time">
                            <span className="study-time-label">Total Studied</span>
                            <span className="study-time-value">
                                {(() => {
                                    const totalSeconds = studySessions.reduce((acc, s) => acc + s.duration, 0);
                                    const hours = Math.floor(totalSeconds / 3600);
                                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                                    return hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m` : '0m';
                                })()}
                            </span>
                        </div>
                    </div>
                    <div className="overall-stats">
                        <div className="stat">
                            <span className="stat-value">{(subjectData.physics?.chapters.length || 0) + (subjectData.chemistry?.chapters.length || 0) + (subjectData.maths?.chapters.length || 0)}</span>
                            <span className="stat-label">Total Chapters</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">3</span>
                            <span className="stat-label">Subjects</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{overallProgress}%</span>
                            <span className="stat-label">Complete</span>
                        </div>
                    </div>
                </div>

                <div className="agenda-card">
                    <div className="agenda-header">
                        <div className="agenda-header-row">
                            <h2>Today's Agenda</h2>
                            {plannerTasks.filter(t => t.date === todayStr).length > 0 && (
                                <button
                                    onClick={onQuickAdd}
                                    className="add-task-icon-btn"
                                    title="Add task"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                                </button>
                            )}
                        </div>
                        <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <div className="agenda-list">
                        {todaysTasks.length > 0 ? (
                            todaysTasks.map(task => (
                                <div key={task.id} className={`agenda-item ${task.completed ? 'completed' : ''}`}>
                                    <button
                                        className={`agenda-check ${task.completed ? 'checked' : ''}`}
                                        onClick={() => onToggleTask(task.id)}
                                    >
                                        {task.completed && <Check size={10} />}
                                    </button>
                                    <div className="agenda-info">
                                        <span className="agenda-title">{task.title}</span>
                                        <div className="agenda-subtitle">
                                            {task.subject && (
                                                <span className={`text-${task.subject} agenda-subtitle-subject`}>
                                                    {task.subject.charAt(0).toUpperCase() + task.subject.slice(1)}
                                                </span>
                                            )}
                                            {task.subtitle && <span className="agenda-subtitle-text"> • {task.subtitle}</span>}
                                            <span className={`agenda-time-inline ${task.completed ? 'completed' :
                                                task.wasShifted ? 'delayed' :
                                                    isTaskOverdue(task) ? 'pending' : ''
                                                }`}>
                                                {getTaskTimeDisplay(task)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div
                                className="empty-agenda clickable"
                                onClick={onQuickAdd}
                                title="Click to add a task"
                            >
                                <p>No tasks scheduled for today.</p>
                                <p className="empty-hint">Click here to add a task!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="exam-countdown-card">
                    <div className="countdown-header">
                        <h2>Exam Countdown</h2>
                        <p>Keep your eyes on the target</p>
                    </div>

                    <div className="countdown-content">
                        {daysRemaining !== null ? (
                            <div className="days-display">
                                <span
                                    className="days-value"
                                    style={{
                                        color: getCountdownColor(daysRemaining),
                                        background: 'none',
                                        WebkitTextFillColor: 'initial'
                                    }}
                                >
                                    {daysRemaining}
                                </span>
                                <span className="days-label">{Math.abs(daysRemaining) === 1 ? 'Day' : 'Days'} {daysRemaining >= 0 ? 'Left' : 'Ago'}</span>
                            </div>
                        ) : (
                            <div className="no-date-message">
                                Set your exam date to start counting down
                            </div>
                        )}

                        <div className="date-input-container">
                            <label htmlFor="exam-date-btn">Target Date:</label>
                            <button
                                id="exam-date-btn"
                                className="date-display-btn"
                                onClick={() => setIsDatePickerOpen(true)}
                            >
                                <span>{formatDateDisplay(examDate)}</span>
                                <Calendar size={18} className="calendar-icon" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="subject-cards">
                {subjects.map(({ key, label, icon, progress, color }) => {
                    const stats = getChapterStats(key);
                    return (
                        <div
                            key={key}
                            className="subject-card"
                            onClick={() => onNavigate(key)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && onNavigate(key)}
                        >
                            <div className="subject-card-header">
                                <span className="subject-icon">{icon}</span>
                                <h3>{label}</h3>
                            </div>
                            <ProgressRing progress={progress} size={100} strokeWidth={6} color={color} />
                            <div className="subject-card-footer">
                                <span className="chapter-count">{stats.total} Chapters</span>
                                <span className="view-link">View Details →</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <AnalyticsPanels
                studySessions={studySessions}
                mockScores={mockScores}
                onAddMockScore={onAddMockScore}
                onDeleteMockScore={onDeleteMockScore}
            />

            <TaskLog tasks={plannerTasks} />

            <div className="motivation-card">
                <div className="motivation-icon"><Zap size={32} /></div>
                <div className="motivation-text">
                    <h3>Keep Going!</h3>
                    <p>Consistency is the key to cracking JEE. Complete at least one chapter today!</p>
                </div>
            </div>

            <DatePickerModal
                isOpen={isDatePickerOpen}
                selectedDate={examDate}
                onSelect={onExamDateChange}
                onClose={() => setIsDatePickerOpen(false)}
                disablePastDates={true}
            />
        </div>
    );
}