import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { ProgressRing } from '../../../shared/components/ui/ProgressBar';
import { Subject, SubjectData, PlannerTask, StudySession, MockScore, ExamEntry } from '../../../shared/types';
import { TaskLog } from '../../planner/components/TaskLog';
import { ExamCountdownModal } from './ExamCountdownModal';
import { AnalyticsPanels } from './AnalyticsPanels';
import { Atom, FlaskConical, Pi, Calendar, Check, Pencil, Github } from 'lucide-react';
import { formatDateLocal, formatTime12Hour, calculateDaysRemaining } from '../../../shared/utils/date';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { CloudSyncPromptModal } from '../../sync/CloudSyncPromptModal';
import { PwaInstallPromptModal } from '../../sync/PwaInstallPromptModal';
import { useRemoteSync } from '../../../core/context/RemoteSyncContext';
import { applyPwaUpdate, getPwaBridgeState, subscribePwaBridge } from '../../../shared/utils/pwaBridge';
import { DashboardNotificationCenter, DashboardNotificationItem } from './DashboardNotificationCenter';

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
    const navigate = useNavigate();

    interface BeforeInstallPromptEvent extends Event {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    }

    interface DashboardNotificationMeta {
        dismissedContexts: Record<string, true>;
        readContexts: Record<string, true>;
        lastAcknowledgedReleaseId?: string;
        lastAcknowledgedVersion?: string;
    }

    const DASHBOARD_NOTIFICATION_META_KEY = 'ojeet-dashboard-notification-meta-v1';
    const CHANGELOG_CONTEXT = `changelog:${__APP_BUILD_ID__}`;
    const CLOUD_SYNC_CONTEXT = 'cloud_sync:eligible';
    const PWA_INSTALL_CONTEXT = 'pwa_install:available';
    const PWA_UPDATE_CONTEXT = `pwa_update:${__APP_BUILD_ID__}`;

    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [isSyncPromptOpen, setIsSyncPromptOpen] = useState(false);
    const [isPwaPromptOpen, setIsPwaPromptOpen] = useState(false);
    const [isPwaInstallBusy, setIsPwaInstallBusy] = useState(false);
    const [isPwaUpdateBusy, setIsPwaUpdateBusy] = useState(false);
    const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [notificationMeta, setNotificationMeta] = useLocalStorage<DashboardNotificationMeta>(
        DASHBOARD_NOTIFICATION_META_KEY,
        {
            dismissedContexts: {},
            readContexts: {},
            lastAcknowledgedReleaseId: __APP_BUILD_ID__,
            lastAcknowledgedVersion: __APP_VERSION__,
        }
    );
    const [pwaBridge, setPwaBridge] = useState(getPwaBridgeState());
    const [isAuthBusy, setIsAuthBusy] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const { user, isConfigured, isPromptDismissed, dismissPrompt, signInWithGoogle } = useRemoteAuth();
    const { remoteStudyAggregate } = useRemoteSync();
    const syncPromptEligible = isConfigured && !user && !isPromptDismissed;
    const lastAcknowledgedReleaseId = notificationMeta.lastAcknowledgedReleaseId
        ?? notificationMeta.lastAcknowledgedVersion
        ?? __APP_BUILD_ID__;

    const markNotificationContextsRead = useCallback((contexts: string[]) => {
        if (contexts.length === 0) return;
        setNotificationMeta((prev) => {
            const nextRead = { ...prev.readContexts };
            contexts.forEach((context) => {
                nextRead[context] = true;
            });
            return { ...prev, readContexts: nextRead };
        });
    }, [setNotificationMeta]);

    const dismissNotificationContext = useCallback((context: string) => {
        setNotificationMeta((prev) => ({
            ...prev,
            dismissedContexts: {
                ...prev.dismissedContexts,
                [context]: true,
            },
            readContexts: {
                ...prev.readContexts,
                [context]: true,
            },
        }));
    }, [setNotificationMeta]);

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

    useEffect(() => subscribePwaBridge(setPwaBridge), []);

    useEffect(() => {
        const nav = window.navigator as Navigator & { standalone?: boolean };
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
        if (isStandalone) {
            setDeferredInstallPrompt(null);
            return;
        }

        const handleBeforeInstallPrompt = (event: Event) => {
            const promptEvent = event as BeforeInstallPromptEvent;
            promptEvent.preventDefault();
            setDeferredInstallPrompt(promptEvent);
        };

        const handleAppInstalled = () => {
            setDeferredInstallPrompt(null);
            setIsPwaPromptOpen(false);
            dismissNotificationContext(PWA_INSTALL_CONTEXT);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [dismissNotificationContext]);

    useEffect(() => {
        if (!deferredInstallPrompt) {
            setIsPwaPromptOpen(false);
        }
    }, [deferredInstallPrompt]);

    useEffect(() => {
        if (!syncPromptEligible) {
            setIsSyncPromptOpen(false);
        }
    }, [syncPromptEligible]);

    const subjects: { key: Subject; label: string; icon: React.ReactNode; progress: number; color: string }[] = [
        { key: 'physics', label: 'Physics', icon: <Atom size={24} />, progress: physicsProgress, color: 'var(--accent)' },
        { key: 'chemistry', label: 'Chemistry', icon: <FlaskConical size={24} />, progress: chemistryProgress, color: 'var(--accent)' },
        { key: 'maths', label: 'Maths', icon: <Pi size={24} />, progress: mathsProgress, color: 'var(--accent)' },
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
        const localSeconds = studySessions.reduce((acc, s) => acc + s.duration, 0);
        const totalSeconds = remoteStudyAggregate?.total_seconds_overall ?? localSeconds;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m` : '0m';
    }, [remoteStudyAggregate?.total_seconds_overall, studySessions]);

    const handleSyncPromptClose = () => {
        setIsSyncPromptOpen(false);
    };

    const handleGoogleSignIn = async () => {
        setIsAuthBusy(true);
        setAuthError(null);
        const { error } = await signInWithGoogle();
        if (error) {
            setAuthError(error);
            setIsAuthBusy(false);
        }
    };

    const handlePwaPromptClose = () => {
        setIsPwaPromptOpen(false);
    };

    const handleInstallPwa = async () => {
        if (!deferredInstallPrompt) return;
        setIsPwaInstallBusy(true);

        try {
            await deferredInstallPrompt.prompt();
            const choiceResult = await deferredInstallPrompt.userChoice;

                if (choiceResult.outcome === 'accepted') {
                    dismissNotificationContext(PWA_INSTALL_CONTEXT);
                }

            setIsPwaPromptOpen(false);
            setDeferredInstallPrompt(null);
        } catch {
            // Keep modal state unchanged on prompt failure.
        } finally {
            setIsPwaInstallBusy(false);
        }
    };

    const handleApplyPwaUpdate = async () => {
        setIsPwaUpdateBusy(true);
        try {
            await applyPwaUpdate();
        } finally {
            setIsPwaUpdateBusy(false);
        }
    };

    const handleDismissChangelogNotification = () => {
        setNotificationMeta((prev) => ({
            ...prev,
            readContexts: {
                ...prev.readContexts,
                [CHANGELOG_CONTEXT]: true,
            },
            lastAcknowledgedReleaseId: __APP_BUILD_ID__,
            lastAcknowledgedVersion: __APP_VERSION__,
        }));
    };

    const notificationItems = useMemo<DashboardNotificationItem[]>(() => {
        const items: DashboardNotificationItem[] = [];

        if (syncPromptEligible && !notificationMeta.dismissedContexts[CLOUD_SYNC_CONTEXT]) {
            items.push({
                id: CLOUD_SYNC_CONTEXT,
                title: 'Sync Across Devices',
                message: authError
                    ? `Sign-in error: ${authError}`
                    : 'Sign in with Google to back up progress and access it from multiple devices.',
                unread: !notificationMeta.readContexts[CLOUD_SYNC_CONTEXT],
                primaryAction: {
                    label: 'Open Sign In',
                    onClick: () => setIsSyncPromptOpen(true),
                },
                onDismiss: () => {
                    dismissPrompt();
                    dismissNotificationContext(CLOUD_SYNC_CONTEXT);
                    setIsSyncPromptOpen(false);
                },
            });
        }

        if (deferredInstallPrompt && !notificationMeta.dismissedContexts[PWA_INSTALL_CONTEXT]) {
            items.push({
                id: PWA_INSTALL_CONTEXT,
                title: 'Install As App',
                message: 'Install OJEE Tracker for faster access and an app-like fullscreen experience.',
                unread: !notificationMeta.readContexts[PWA_INSTALL_CONTEXT],
                primaryAction: {
                    label: 'Open Install Prompt',
                    onClick: () => setIsPwaPromptOpen(true),
                },
                onDismiss: () => {
                    dismissNotificationContext(PWA_INSTALL_CONTEXT);
                    setIsPwaPromptOpen(false);
                },
            });
        }

        if (pwaBridge.needRefresh && !notificationMeta.dismissedContexts[PWA_UPDATE_CONTEXT]) {
            items.push({
                id: PWA_UPDATE_CONTEXT,
                title: 'Update Available',
                message: 'A newer app build is ready. Update now for the latest fixes and improvements.',
                unread: !notificationMeta.readContexts[PWA_UPDATE_CONTEXT],
                primaryAction: {
                    label: isPwaUpdateBusy ? 'Updating...' : 'Update Now',
                    onClick: handleApplyPwaUpdate,
                    disabled: isPwaUpdateBusy,
                },
                secondaryAction: {
                    label: 'Later',
                    onClick: () => dismissNotificationContext(PWA_UPDATE_CONTEXT),
                    disabled: isPwaUpdateBusy,
                },
                onDismiss: () => dismissNotificationContext(PWA_UPDATE_CONTEXT),
            });
        }

        if (lastAcknowledgedReleaseId !== __APP_BUILD_ID__) {
            items.push({
                id: CHANGELOG_CONTEXT,
                title: 'New Release Notes',
                message: `A newer ${__APP_VERSION__} build is available. Review the changelog for the latest updates.`,
                unread: !notificationMeta.readContexts[CHANGELOG_CONTEXT],
                primaryAction: {
                    label: 'View Changelog',
                    onClick: () => navigate('/changelog?updated=1'),
                },
                onDismiss: handleDismissChangelogNotification,
            });
        }

        return items;
    }, [
        syncPromptEligible,
        notificationMeta.dismissedContexts,
        notificationMeta.readContexts,
        lastAcknowledgedReleaseId,
        authError,
        deferredInstallPrompt,
        pwaBridge.needRefresh,
        isPwaUpdateBusy,
        dismissPrompt,
        dismissNotificationContext,
        navigate,
    ]);

    const handleNotificationPanelOpen = useCallback(() => {
        markNotificationContextsRead(notificationItems.map((item) => item.id));
    }, [markNotificationContextsRead, notificationItems]);

    return (
        <div className="dashboard">
            <h1 className="sr-only">The Ultimate Offline-First JEE Tracker for Aspirants</h1>
            <div className="dashboard-header">
                {quote ? (
                    <div className="quote-container">
                        <p className="quote-text">"{quote.quote}"</p>
                        <p className="quote-author">- {quote.author}</p>
                    </div>
                ) : (
                    <p className="dashboard-title">Your Progress</p>
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
                                <span className="days-label">{daysRemaining === 1 ? 'Day' : 'Days'} Left</span>
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
                                                {days !== null ? `${days}d` : '—'}
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
                <Link
                    to="/privacy-policy"
                    className="credits-legal-link"
                    title="Read Privacy Policy"
                >
                    Privacy Policy
                </Link>
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

            <DashboardNotificationCenter
                items={notificationItems}
                onPanelOpen={handleNotificationPanelOpen}
            />

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
            <CloudSyncPromptModal
                isOpen={isSyncPromptOpen}
                onClose={handleSyncPromptClose}
                onSignIn={handleGoogleSignIn}
                isBusy={isAuthBusy}
            />
            <PwaInstallPromptModal
                isOpen={isPwaPromptOpen}
                onClose={handlePwaPromptClose}
                onInstall={handleInstallPwa}
                isBusy={isPwaInstallBusy}
            />
        </div>
    );
}
