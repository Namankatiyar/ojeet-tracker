import { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { ProgressRing } from '../../../shared/components/ui/ProgressBar';
import { Subject, SubjectData, PlannerTask, StudySession, MockScore, ExamEntry } from '../../../shared/types';
import { TaskLog } from '../../planner/components/TaskLog';
import { ExamCountdownModal } from './ExamCountdownModal';
import { AnalyticsPanels } from './AnalyticsPanels';
import { Atom, FlaskConical, Calculator, Calendar, Check, Pencil, Github } from 'lucide-react';
import { formatDateLocal, formatTime12Hour, calculateDaysRemaining } from '../../../shared/utils/date';

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
    examDates: ExamEntry[];
    onAddExam: (exam: Omit<ExamEntry, 'id'>) => void;
    onDeleteExam: (id: string) => void;
    onUpdateExam: (exam: ExamEntry) => void;
    onSetPrimaryExam: (id: string) => void;
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
    examDates,
    onAddExam,
    onDeleteExam,
    onUpdateExam,
    onSetPrimaryExam,
    onQuickAdd,
    studySessions = [],
    mockScores = [],
    onAddMockScore = () => { },
    onDeleteMockScore = () => { }
}: DashboardProps) {
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);

    // Get primary exam
    const primaryExam = examDates.find(e => e.isPrimary) || examDates[0] || null;
    const secondaryExams = useMemo(() => {
        return examDates
            .filter(e => e.id !== primaryExam?.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [examDates, primaryExam]);

    // Track active secondary exam for the cyclical button
    const [secondaryExamIndex, setSecondaryExamIndex] = useLocalStorage('jee-secondary-exam-index', 0);
    const activeSecondaryExam = secondaryExams.length > 0
        ? secondaryExams[secondaryExamIndex % secondaryExams.length]
        : null;

    // Reset primary exam date if it has passed
    useEffect(() => {
        if (primaryExam?.date) {
            const target = new Date(primaryExam.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            target.setHours(0, 0, 0, 0);
            // Don't auto-remove; just let the countdown show negative
        }
    }, [primaryExam]);

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

    const daysRemaining = primaryExam ? calculateDaysRemaining(primaryExam.date) : null;

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
    const todaysTasks = useMemo(() => {
        return plannerTasks
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
    }, [plannerTasks, todayStr]);

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

    const totalStudyTimeStr = useMemo(() => {
        const totalSeconds = studySessions.reduce((acc, s) => acc + s.duration, 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m` : '0m';
    }, [studySessions]);

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
                <div className="glass-panel overall-progress-card">
                    <div className="overall-header">
                        <h2>Overall Progress</h2>
                        <p>Combined progress across all subjects</p>
                    </div>
                    <div className="overall-ring-wrapper">
                        <ProgressRing progress={overallProgress} size={130} strokeWidth={10} color="var(--accent)" />
                        <div className="total-study-time">
                            <span className="study-time-label">Total Studied</span>
                            <span className="study-time-value">
                                {totalStudyTimeStr}
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

                <div className="glass-panel agenda-card">
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

                <div className="glass-panel exam-countdown-card">
                    <div className="countdown-header">
                        <div>
                            <h2>Exam Countdown</h2>
                            <p>Keep your eyes on the target</p>
                        </div>
                        <button
                            className="exam-edit-btn"
                            onClick={() => setIsExamModalOpen(true)}
                            title="Manage exams"
                        >
                            <Pencil size={16} />
                        </button>
                    </div>

                    <div className="countdown-content">
                        {primaryExam && daysRemaining !== null ? (
                            <div className="days-display">
                                <span className="exam-primary-name">{primaryExam.name}</span>
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
                                <span className="exam-date-sub">{formatDateDisplay(primaryExam.date)}</span>
                            </div>
                        ) : (
                            <div className="no-date-message" onClick={() => setIsExamModalOpen(true)} style={{ cursor: 'pointer' }}>
                                <Calendar size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <span>Click to add your first exam</span>
                            </div>
                        )}

                        {activeSecondaryExam && (
                            <div className="exam-secondary-container">
                                <div
                                    className="exam-secondary-cycler"
                                    onClick={() => setSecondaryExamIndex(prev => prev + 1)}
                                    title="Click to view next exam"
                                    role="button"
                                >
                                    <span className="exam-secondary-name">{activeSecondaryExam.name}</span>
                                    {(() => {
                                        const days = calculateDaysRemaining(activeSecondaryExam.date);
                                        return (
                                            <span className={`exam-secondary-days ${days !== null && days <= 7 ? 'urgent' : ''}`}>
                                                {days !== null ? (days >= 0 ? `${days}d` : 'Passed') : '—'}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
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

            <div className="glass-panel credits-panel">
                <span className="credits-text">
                    Made for and by a JEE Aspirant with ❤
                </span>
                <a
                    href="https://github.com/Namankatiyar/ojeet-tracker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="credits-github-link"
                    title="View project on GitHub"
                >
                    <Github size={20} />
                </a>
            </div>

            {isExamModalOpen && (
                <ExamCountdownModal
                    examDates={examDates}
                    onAddExam={onAddExam}
                    onDeleteExam={onDeleteExam}
                    onUpdateExam={onUpdateExam}
                    onSetPrimaryExam={onSetPrimaryExam}
                    onClose={() => setIsExamModalOpen(false)}
                />
            )}
        </div>
    );
}