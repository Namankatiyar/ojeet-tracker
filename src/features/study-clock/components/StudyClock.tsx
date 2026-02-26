import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, Pause, Square, Trash2, Clock, X, Pencil, CheckCircle2, Plus, Calendar } from 'lucide-react';
import { Subject, SubjectData, StudySession, PlannerTask, AppProgress } from '../../../shared/types';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';

interface StudyClockProps {
    subjectData: Record<Subject, SubjectData | null>;
    sessions: StudySession[];
    onAddSession: (session: StudySession) => void;
    onDeleteSession: (sessionId: string) => void;
    onEditSession: (session: StudySession) => void;
    plannerTasks: PlannerTask[];
    progress: AppProgress;
    onToggleTask?: (taskId: string) => void;
}

type TimerState = 'idle' | 'running' | 'paused';

// Interface for persisting paused timer state
interface PausedTimerState {
    elapsedSeconds: number;
    taskType: 'chapter' | 'custom' | 'task';
    selectedSubject: Subject | '';
    selectedChapter: number | '';
    selectedMaterial: string;
    customTitle: string;
    selectedTaskId: string;
    pausedAt: string; // ISO timestamp when paused
}

// Interface for persisting running timer state
interface RunningTimerState {
    startTime: string; // ISO timestamp when timer started
    pausedTimeAccumulated: number; // Time accumulated before current run
    taskType: 'chapter' | 'custom' | 'task';
    selectedSubject: Subject | '';
    selectedChapter: number | '';
    selectedMaterial: string;
    customTitle: string;
    selectedTaskId: string;
}

const PAUSED_TIMER_STORAGE_KEY = 'jee-tracker-paused-timer';
const RUNNING_TIMER_STORAGE_KEY = 'jee-tracker-running-timer';

export function StudyClock({ subjectData, sessions, onAddSession, onDeleteSession, onEditSession, plannerTasks, progress, onToggleTask }: StudyClockProps) {
    // Timer state
    const [timerState, setTimerState] = useState<TimerState>('idle');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [pausedTime, setPausedTime] = useState(0); // Accumulated time before pause
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Task selection state
    const [taskType, setTaskType] = useState<'chapter' | 'custom' | 'task'>('chapter');
    const [selectedSubject, setSelectedSubject] = useState<Subject | ''>('');
    const [selectedChapter, setSelectedChapter] = useState<number | ''>('');
    const [selectedMaterial, setSelectedMaterial] = useState<string>('');
    const [customTitle, setCustomTitle] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');

    // Restore paused or running timer state on mount
    useEffect(() => {
        try {
            // First check for running timer (higher priority)
            const savedRunningState = localStorage.getItem(RUNNING_TIMER_STORAGE_KEY);
            if (savedRunningState) {
                const state: RunningTimerState = JSON.parse(savedRunningState);
                const savedStartTime = new Date(state.startTime);
                const now = new Date();
                const elapsed = Math.floor((now.getTime() - savedStartTime.getTime()) / 1000) + state.pausedTimeAccumulated;

                setElapsedSeconds(elapsed);
                setPausedTime(state.pausedTimeAccumulated);
                setStartTime(savedStartTime);
                setTaskType(state.taskType);
                setSelectedSubject(state.selectedSubject);
                setSelectedChapter(state.selectedChapter);
                setSelectedMaterial(state.selectedMaterial);
                setCustomTitle(state.customTitle);
                setSelectedTaskId(state.selectedTaskId);
                setTimerState('running');
                return;
            }

            // Fall back to paused timer if no running timer
            const savedPausedState = localStorage.getItem(PAUSED_TIMER_STORAGE_KEY);
            if (savedPausedState) {
                const state: PausedTimerState = JSON.parse(savedPausedState);
                setElapsedSeconds(state.elapsedSeconds);
                setPausedTime(state.elapsedSeconds);
                setTaskType(state.taskType);
                setSelectedSubject(state.selectedSubject);
                setSelectedChapter(state.selectedChapter);
                setSelectedMaterial(state.selectedMaterial);
                setCustomTitle(state.customTitle);
                setSelectedTaskId(state.selectedTaskId);
                setTimerState('paused');
            }
        } catch (error) {
            console.error('Error restoring timer state:', error);
            localStorage.removeItem(PAUSED_TIMER_STORAGE_KEY);
            localStorage.removeItem(RUNNING_TIMER_STORAGE_KEY);
        }
    }, []);

    // Auto-select task from URL query parameter (coming from Planner link)
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        const taskId = searchParams.get('taskId');
        if (!taskId || timerState !== 'idle') return;

        const task = plannerTasks.find(t => t.id === taskId);
        if (!task || task.completed) return;

        // Set task type to 'task' and auto-fill all fields
        setTaskType('task');
        setSelectedTaskId(taskId);

        if (task.type === 'chapter' && task.subject) {
            setSelectedSubject(task.subject);
            setSelectedChapter(task.chapterSerial || '');
            setSelectedMaterial(task.material || '');
            setCustomTitle('');
        } else {
            setSelectedSubject('');
            setSelectedChapter('');
            setSelectedMaterial('');
            setCustomTitle(task.title);
        }

        // Consume the query parameter so it doesn't re-trigger
        setSearchParams({}, { replace: true });
    }, [searchParams, plannerTasks, timerState]);

    // Stats filter state
    const [statsSubject, setStatsSubject] = useState<Subject | 'all'>('all');
    const [statsChapter, setStatsChapter] = useState<number | 'all'>('all');
    const [statsMaterial, setStatsMaterial] = useState<string | 'all'>('all');
    const [showDistribution, setShowDistribution] = useState(false);

    // Edit modal state
    const [editingSession, setEditingSession] = useState<StudySession | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editHours, setEditHours] = useState(0);
    const [editMinutes, setEditMinutes] = useState(0);
    const [editSubject, setEditSubject] = useState<Subject | ''>('');
    const [editMaterial, setEditMaterial] = useState('');

    // Manual entry modal state
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualTitle, setManualTitle] = useState('');
    const [manualHours, setManualHours] = useState(0);
    const [manualMinutes, setManualMinutes] = useState(0);
    const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [manualSubject, setManualSubject] = useState<Subject | ''>('');
    const [manualMaterial, setManualMaterial] = useState('');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Track which subject chapter graphs are open (can have multiple)
    const [openChapterGraphs, setOpenChapterGraphs] = useState<Subject[]>([]);

    const timerRef = useRef<number | null>(null);

    // Sync timer with user's system clock
    useEffect(() => {
        if (timerState === 'running' && startTime) {
            const updateTimer = () => {
                const now = new Date();
                const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000) + pausedTime;
                setElapsedSeconds(elapsed);
            };

            // Update immediately
            updateTimer();

            // Update every second, synced to the clock
            timerRef.current = window.setInterval(updateTimer, 1000);

            // Save running state to localStorage for persistence
            const runningState: RunningTimerState = {
                startTime: startTime.toISOString(),
                pausedTimeAccumulated: pausedTime,
                taskType,
                selectedSubject,
                selectedChapter,
                selectedMaterial,
                customTitle,
                selectedTaskId
            };
            localStorage.setItem(RUNNING_TIMER_STORAGE_KEY, JSON.stringify(runningState));

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };
        } else {
            // Clear running state when not running
            localStorage.removeItem(RUNNING_TIMER_STORAGE_KEY);
        }
    }, [timerState, startTime, pausedTime, taskType, selectedSubject, selectedChapter, selectedMaterial, customTitle, selectedTaskId]);

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDuration = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const getTaskTitle = (): string => {
        if (taskType === 'custom') {
            return customTitle || 'Untitled Session';
        }
        const parts: string[] = [];
        if (selectedSubject) {
            parts.push(selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1));
        }
        if (selectedChapter && selectedSubject) {
            const chapter = subjectData[selectedSubject]?.chapters.find(c => c.serial === selectedChapter);
            if (chapter) parts.push(chapter.name);
        }
        if (selectedMaterial) {
            parts.push(selectedMaterial);
        }
        return parts.length > 0 ? parts.join(' > ') : 'Untitled Session';
    };

    const getChapterName = (): string | undefined => {
        if (selectedSubject && selectedChapter) {
            const chapter = subjectData[selectedSubject]?.chapters.find(c => c.serial === selectedChapter);
            return chapter?.name;
        }
        return undefined;
    };

    const handleStart = () => {
        // Clear any saved paused state when starting fresh
        localStorage.removeItem(PAUSED_TIMER_STORAGE_KEY);
        localStorage.removeItem(RUNNING_TIMER_STORAGE_KEY);
        setPausedTime(0);
        setStartTime(new Date());
        setTimerState('running');
    };

    const handlePause = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Calculate precise elapsed time based on wall clock to avoid stale state issues
        let currentElapsed = elapsedSeconds;
        if (startTime && timerState === 'running') {
            const now = new Date();
            const sessionDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            // Ensure we don't get negative time if system clock changed weirdly
            currentElapsed = Math.max(0, sessionDuration + pausedTime);
        }

        setElapsedSeconds(currentElapsed);
        setPausedTime(currentElapsed);
        setTimerState('paused');

        // Save paused state to localStorage for persistence
        const pausedState: PausedTimerState = {
            elapsedSeconds: currentElapsed,
            taskType,
            selectedSubject,
            selectedChapter,
            selectedMaterial,
            customTitle,
            selectedTaskId,
            pausedAt: new Date().toISOString()
        };
        localStorage.setItem(PAUSED_TIMER_STORAGE_KEY, JSON.stringify(pausedState));
    };

    const handleResume = () => {
        // Clear saved paused state when resuming
        localStorage.removeItem(PAUSED_TIMER_STORAGE_KEY);
        localStorage.removeItem(RUNNING_TIMER_STORAGE_KEY);
        setStartTime(new Date());
        setTimerState('running');
    };

    const handleEnd = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Calculate final precise time
        let finalElapsed = elapsedSeconds;
        if (timerState === 'running' && startTime) {
            const now = new Date();
            const sessionDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            finalElapsed = Math.max(0, sessionDuration + pausedTime);
        }

        if (finalElapsed > 0) {
            // Determine session metadata based on task type
            let sessionSubject: typeof selectedSubject | undefined = undefined;
            let sessionChapterSerial: number | undefined = undefined;
            let sessionChapterName: string | undefined = undefined;
            let sessionMaterial: string | undefined = undefined;
            let sessionType: 'chapter' | 'custom' | 'task' = taskType;

            if (taskType === 'chapter' && selectedSubject) {
                // Direct chapter selection
                sessionSubject = selectedSubject;
                sessionChapterSerial = selectedChapter as number || undefined;
                sessionChapterName = getChapterName();
                sessionMaterial = selectedMaterial || undefined;
            } else if (taskType === 'task' && selectedTaskId) {
                // Planner task selected - inherit metadata from the task
                const task = plannerTasks.find(t => t.id === selectedTaskId);
                if (task?.type === 'chapter' && task.subject) {
                    // Task is a chapter task - log under its subject
                    sessionSubject = task.subject;
                    sessionChapterSerial = task.chapterSerial;
                    sessionChapterName = subjectData[task.subject]?.chapters.find(c => c.serial === task.chapterSerial)?.name;
                    sessionMaterial = task.material;
                    sessionType = 'chapter'; // Log as chapter, not task
                } else {
                    // Custom task - log as custom
                    sessionType = 'custom';
                }
            }

            const session: StudySession = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                title: getTaskTitle(),
                subject: sessionSubject,
                chapterSerial: sessionChapterSerial,
                chapterName: sessionChapterName,
                material: sessionMaterial,
                type: sessionType,
                startTime: startTime?.toISOString() || new Date().toISOString(),
                endTime: new Date().toISOString(),
                duration: finalElapsed
            };
            onAddSession(session);
        }

        // Clear all saved timer states
        localStorage.removeItem(PAUSED_TIMER_STORAGE_KEY);
        localStorage.removeItem(RUNNING_TIMER_STORAGE_KEY);

        // Reset timer
        setTimerState('idle');
        setElapsedSeconds(0);
        setPausedTime(0);
        setStartTime(null);
        setIsFullscreen(false);
    };

    const handleDiscard = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Clear all saved timer states without saving session
        localStorage.removeItem(PAUSED_TIMER_STORAGE_KEY);
        localStorage.removeItem(RUNNING_TIMER_STORAGE_KEY);

        // Reset timer
        setTimerState('idle');
        setElapsedSeconds(0);
        setPausedTime(0);
        setStartTime(null);
        setIsFullscreen(false);
        setTaskType('chapter');
        setSelectedSubject('');
        setSelectedChapter('');
        setSelectedMaterial('');
        setCustomTitle('');
        setSelectedTaskId('');
    };

    // Mark Complete: Save session AND mark the planner task as complete
    const handleMarkComplete = () => {
        if (taskType === 'task' && selectedTaskId && onToggleTask) {
            // First save the session
            handleEnd();
            // Then mark the task as complete
            onToggleTask(selectedTaskId);
        }
    };

    // Check if current task is a planner task that can be marked complete
    const canMarkComplete = taskType === 'task' && selectedTaskId && onToggleTask &&
        !plannerTasks.find(t => t.id === selectedTaskId)?.completed;

    const handleFullscreenClick = () => {
        if (isFullscreen) {
            handlePause();
            setIsFullscreen(false);
        }
    };

    const handleTimerClick = () => {
        if (timerState === 'running') {
            setIsFullscreen(true);
        }
    };

    const handleSpacebarToggle = () => {
        if (timerState === 'idle') {
            handleStart();
        } else if (timerState === 'running') {
            handlePause();
        } else if (timerState === 'paused') {
            handleResume();
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                handleSpacebarToggle();
            } else if (e.code === 'KeyF') {
                e.preventDefault();
                setIsFullscreen(prev => !prev);
            } else if (e.code === 'Escape' && isFullscreen) {
                e.preventDefault();
                handlePause();
                setIsFullscreen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [timerState, isFullscreen]);

    // Get available chapters for selected subject
    const availableChapters = selectedSubject ? subjectData[selectedSubject]?.chapters || [] : [];

    // Get available materials for selected subject
    const availableMaterials = selectedSubject ? subjectData[selectedSubject]?.materialNames || [] : [];

    // Stats calculations
    const getFilteredSessions = useCallback(() => {
        return sessions.filter(s => {
            if (statsSubject !== 'all' && s.subject !== statsSubject) return false;
            if (statsChapter !== 'all' && s.chapterSerial !== statsChapter) return false;
            if (statsMaterial !== 'all' && s.material !== statsMaterial) return false;
            return true;
        });
    }, [sessions, statsSubject, statsChapter, statsMaterial]);

    const totalFilteredTime = getFilteredSessions().reduce((acc, s) => acc + s.duration, 0);
    const totalTime = sessions.reduce((acc, s) => acc + s.duration, 0);

    // Calculate subject distribution
    const getSubjectDistribution = useCallback(() => {
        const distribution = {
            physics: 0,
            chemistry: 0,
            maths: 0,
            custom: 0
        };
        sessions.forEach(s => {
            if (s.type === 'custom' || !s.subject) {
                distribution.custom += s.duration;
            } else {
                distribution[s.subject] += s.duration;
            }
        });
        return distribution;
    }, [sessions]);

    const subjectDistribution = getSubjectDistribution();

    // Get unique chapters that have sessions for the stats filter
    const statsAvailableChapters = statsSubject !== 'all'
        ? subjectData[statsSubject]?.chapters.filter(ch =>
            sessions.some(s => s.subject === statsSubject && s.chapterSerial === ch.serial)
        ) || []
        : [];

    // Get all unique materials from sessions - either for specific subject or all
    const statsAvailableMaterials: string[] = statsSubject !== 'all'
        ? Array.from(new Set(sessions.filter(s => s.subject === statsSubject && (statsChapter === 'all' || s.chapterSerial === statsChapter)).map(s => s.material))).filter((m): m is string => !!m)
        : Array.from(new Set(sessions.map(s => s.material))).filter((m): m is string => !!m);

    // Edit session helper functions
    const openEditModal = (session: StudySession) => {
        setEditingSession(session);
        setEditTitle(session.title);
        const hours = Math.floor(session.duration / 3600);
        const mins = Math.floor((session.duration % 3600) / 60);
        setEditHours(hours);
        setEditMinutes(mins);
        setEditSubject(session.subject || '');
        setEditMaterial(session.material || '');
    };

    const closeEditModal = () => {
        setEditingSession(null);
        setEditTitle('');
        setEditHours(0);
        setEditMinutes(0);
        setEditSubject('');
        setEditMaterial('');
    };

    const saveEditedSession = () => {
        if (!editingSession) return;
        const newDuration = editHours * 3600 + editMinutes * 60;
        const updatedSession: StudySession = {
            ...editingSession,
            title: editTitle || editingSession.title,
            duration: newDuration > 0 ? newDuration : editingSession.duration,
            subject: editSubject || undefined,
            material: editMaterial || undefined
        };
        onEditSession(updatedSession);
        closeEditModal();
    };

    // Manual entry helper functions
    const openManualEntryModal = () => {
        setManualTitle('');
        setManualHours(0);
        setManualMinutes(30);
        setManualDate(new Date().toISOString().split('T')[0]);
        setManualSubject('');
        setManualMaterial('');
        setShowManualEntry(true);
    };

    const closeManualEntryModal = () => {
        setShowManualEntry(false);
    };

    const handleAddManualEntry = () => {
        const duration = manualHours * 3600 + manualMinutes * 60;
        if (duration <= 0 || !manualTitle.trim()) return;

        const entryDate = new Date(manualDate);
        entryDate.setHours(12, 0, 0, 0); // Set to noon of that day

        const session: StudySession = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: manualTitle.trim(),
            subject: manualSubject || undefined,
            material: manualMaterial || undefined,
            type: manualSubject ? 'chapter' : 'custom',
            startTime: entryDate.toISOString(),
            endTime: new Date(entryDate.getTime() + duration * 1000).toISOString(),
            duration
        };

        onAddSession(session);
        closeManualEntryModal();
    };

    // Get top 5 chapters by study time for a subject
    const getTopChaptersForSubject = (subject: Subject) => {
        const chapterTimes: Map<number, { name: string; time: number }> = new Map();

        sessions
            .filter(s => s.subject === subject && s.chapterSerial)
            .forEach(s => {
                const current = chapterTimes.get(s.chapterSerial!) || { name: s.chapterName || `Chapter ${s.chapterSerial}`, time: 0 };
                chapterTimes.set(s.chapterSerial!, { name: current.name, time: current.time + s.duration });
            });

        return Array.from(chapterTimes.entries())
            .map(([serial, data]) => ({ serial, ...data }))
            .sort((a, b) => b.time - a.time)
            .slice(0, 5);
    };

    // Toggle a subject's chapter graph
    const toggleChapterGraph = (subject: Subject) => {
        if (subject === 'custom' as any) return; // Custom doesn't have chapters
        setOpenChapterGraphs(prev =>
            prev.includes(subject)
                ? prev.filter(s => s !== subject)
                : [...prev, subject]
        );
    };

    if (isFullscreen) {
        return (
            <div className="fullscreen-timer">
                <div className="fullscreen-clock">
                    <div
                        className="fullscreen-time"
                        onClick={handleFullscreenClick}
                        title="Click to pause & exit fullscreen"
                    >
                        {formatTime(elapsedSeconds)}
                    </div>
                    <div className="fullscreen-title">{getTaskTitle()}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="study-clock-page">
            <div className="study-clock-header">
                <h1><Clock size={28} /> Study Clock</h1>
                <p>Track your study sessions and analyze your progress</p>
            </div>

            <div className="study-clock-grid">
                <div className="timer-card horizontal">
                    {/* Task selector - collapsible when timer is active */}
                    <div className={`task-selector-section ${timerState !== 'idle' ? 'collapsed' : ''}`}>
                        {timerState !== 'idle' ? (
                            <div className="collapsed-task-info">
                                <div className="collapsed-task-label">Studying:</div>
                                <div className="collapsed-task-title">{getTaskTitle()}</div>
                            </div>
                        ) : (
                            <>
                                <h3>What are you studying?</h3>

                                <div className="task-type-toggle">
                                    <button
                                        className={`type-btn ${taskType === 'chapter' ? 'active' : ''}`}
                                        onClick={() => setTaskType('chapter')}
                                        disabled={timerState !== 'idle'}
                                    >
                                        Syllabus
                                    </button>
                                    <button
                                        className={`type-btn ${taskType === 'task' ? 'active' : ''}`}
                                        onClick={() => setTaskType('task')}
                                        disabled={timerState !== 'idle'}
                                    >
                                        From Tasks
                                    </button>
                                    <button
                                        className={`type-btn ${taskType === 'custom' ? 'active' : ''}`}
                                        onClick={() => setTaskType('custom')}
                                        disabled={timerState !== 'idle'}
                                    >
                                        Custom
                                    </button>
                                </div>

                                {taskType === 'chapter' ? (
                                    <div className="chapter-selectors">
                                        <div className="selector-group">
                                            <label>Subject</label>
                                            <CustomSelect
                                                value={selectedSubject}
                                                onChange={(val) => {
                                                    setSelectedSubject(val as Subject | '');
                                                    setSelectedChapter('');
                                                    setSelectedMaterial('');
                                                }}
                                                options={[
                                                    { value: 'physics', label: 'Physics' },
                                                    { value: 'chemistry', label: 'Chemistry' },
                                                    { value: 'maths', label: 'Maths' }
                                                ]}
                                                placeholder="Select Subject"
                                                disabled={timerState !== 'idle'}
                                            />
                                        </div>

                                        <div className="selector-group">
                                            <label>Chapter</label>
                                            <CustomSelect
                                                value={selectedChapter}
                                                onChange={(val) => setSelectedChapter(val ? Number(val) : '')}
                                                options={availableChapters.map(ch => {
                                                    const chapterPriority = selectedSubject ? progress[selectedSubject]?.[ch.serial]?.priority : undefined;
                                                    return {
                                                        value: ch.serial,
                                                        label: ch.name,
                                                        priority: chapterPriority !== 'none' ? chapterPriority : undefined
                                                    };
                                                })}
                                                placeholder="Select Chapter"
                                                disabled={timerState !== 'idle' || !selectedSubject}
                                            />
                                        </div>

                                        <div className="selector-group">
                                            <label>Material</label>
                                            <CustomSelect
                                                value={selectedMaterial}
                                                onChange={(val) => setSelectedMaterial(val)}
                                                options={availableMaterials.map(mat => ({ value: mat, label: mat }))}
                                                placeholder="Select Material"
                                                disabled={timerState !== 'idle' || !selectedSubject}
                                            />
                                        </div>
                                    </div>
                                ) : taskType === 'task' ? (
                                    <div className="task-selector">
                                        <div className="selector-group">
                                            <label>Select Task</label>
                                            <CustomSelect
                                                value={selectedTaskId}
                                                onChange={(taskId) => {
                                                    setSelectedTaskId(taskId);
                                                    const task = plannerTasks.find(t => t.id === taskId);
                                                    if (task) {
                                                        if (task.type === 'chapter' && task.subject) {
                                                            setSelectedSubject(task.subject);
                                                            setSelectedChapter(task.chapterSerial || '');
                                                            setSelectedMaterial(task.material || '');
                                                            setCustomTitle('');
                                                        } else {
                                                            setSelectedSubject('');
                                                            setSelectedChapter('');
                                                            setSelectedMaterial('');
                                                            setCustomTitle(task.title);
                                                        }
                                                    }
                                                }}
                                                options={plannerTasks.filter(t => !t.completed).map(task => ({
                                                    value: task.id,
                                                    label: `${task.title}${task.subtitle ? ` - ${task.subtitle}` : ''}`
                                                }))}
                                                placeholder="Select a task..."
                                                disabled={timerState !== 'idle'}
                                            />
                                        </div>
                                        {selectedTaskId && (() => {
                                            const task = plannerTasks.find(t => t.id === selectedTaskId);
                                            if (task?.type === 'chapter' && task.subject) {
                                                return (
                                                    <div className="task-auto-filled">
                                                        <div className="auto-filled-item"><span>Subject:</span> {task.subject.charAt(0).toUpperCase() + task.subject.slice(1)}</div>
                                                        {task.chapterSerial && <div className="auto-filled-item"><span>Chapter:</span> {subjectData[task.subject]?.chapters.find(c => c.serial === task.chapterSerial)?.name || `#${task.chapterSerial}`}</div>}
                                                        {task.material && <div className="auto-filled-item"><span>Material:</span> {task.material}</div>}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                ) : (
                                    <div className="custom-title-input">
                                        <input
                                            type="text"
                                            placeholder="Enter session title..."
                                            value={customTitle}
                                            onChange={(e) => setCustomTitle(e.target.value)}
                                            disabled={timerState !== 'idle'}
                                        />
                                    </div>
                                )}

                                {(selectedSubject || customTitle) && (
                                    <div className="current-task-preview">
                                        <span>Session:</span> {getTaskTitle()}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="timer-display-section">
                        <div
                            className={`timer-circle ${timerState}`}
                            onClick={handleTimerClick}
                            title={timerState === 'running' ? 'Click to enter fullscreen (or press F)' : ''}
                        >
                            <div className="timer-time">{formatTime(elapsedSeconds)}</div>
                            <div className="timer-state-label">
                                {timerState === 'idle' && 'Ready'}
                                {timerState === 'running' && 'Click for fullscreen'}
                                {timerState === 'paused' && 'Paused'}
                            </div>
                        </div>

                        <div className="timer-controls">
                            {timerState === 'idle' && (
                                <button className="timer-btn start" onClick={handleStart} title="Start (Space)">
                                    <Play size={18} />
                                </button>
                            )}
                            {timerState === 'running' && (
                                <>
                                    <button className="timer-btn pause" onClick={handlePause} title="Pause (Space)">
                                        <Pause size={18} />
                                    </button>
                                    <button className="timer-btn end" onClick={handleEnd} title="End Session">
                                        <Square size={18} />
                                    </button>
                                </>
                            )}
                            {timerState === 'paused' && (
                                <>
                                    <button className="timer-btn resume" onClick={handleResume} title="Resume (Space)">
                                        <Play size={18} />
                                    </button>
                                    {canMarkComplete ? (
                                        <button className="timer-btn mark-complete" onClick={handleMarkComplete} title="Save Session & Mark Task Complete">
                                            <CheckCircle2 size={18} />
                                        </button>
                                    ) : (
                                        <button className="timer-btn end" onClick={handleEnd} title="Save & End Session">
                                            <Square size={18} />
                                        </button>
                                    )}
                                    <button className="timer-btn discard" onClick={handleDiscard} title="Discard Session">
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Statistics and Session Log - Side by Side */}
                <div className="stats-and-log-row">
                    {/* Statistics Panel */}
                    <div className="statistics-card">
                        <h3>Statistics</h3>

                        <div className="stats-total" onClick={() => setShowDistribution(true)}>
                            <div className="stats-total-label">Total Study Time</div>
                            <div className="stats-total-value">{formatDuration(totalTime)}</div>
                            <div className="stats-total-hint">Click to see breakdown</div>
                        </div>

                        <div className="stats-filters">
                            <div className="stats-filter-group">
                                <label>Subject</label>
                                <CustomSelect
                                    value={statsSubject}
                                    onChange={(val) => {
                                        setStatsSubject(val as Subject | 'all');
                                        setStatsChapter('all');
                                        setStatsMaterial('all');
                                    }}
                                    options={[
                                        { value: 'all', label: 'All Subjects' },
                                        { value: 'physics', label: 'Physics' },
                                        { value: 'chemistry', label: 'Chemistry' },
                                        { value: 'maths', label: 'Maths' }
                                    ]}
                                    placeholder="Select Subject"
                                />
                            </div>

                            {statsSubject !== 'all' && (
                                <div className="stats-filter-group">
                                    <label>Chapter</label>
                                    <CustomSelect
                                        value={statsChapter}
                                        onChange={(val) => {
                                            setStatsChapter(val === 'all' ? 'all' : Number(val));
                                            setStatsMaterial('all');
                                        }}
                                        options={[
                                            { value: 'all', label: 'All Chapters' },
                                            ...statsAvailableChapters.map(ch => ({ value: ch.serial, label: ch.name }))
                                        ]}
                                        placeholder="Select Chapter"
                                    />
                                </div>
                            )}

                            <div className="stats-filter-group">
                                <label>Material</label>
                                <CustomSelect
                                    value={statsMaterial}
                                    onChange={(val) => setStatsMaterial(val)}
                                    options={[
                                        { value: 'all', label: 'All Materials' },
                                        ...statsAvailableMaterials.map(mat => ({ value: mat, label: mat }))
                                    ]}
                                    placeholder="Select Material"
                                />
                            </div>
                        </div>

                        <div className="stats-filtered-result">
                            <div className="stats-filtered-label">
                                {statsSubject === 'all' ? 'All Sessions' : (
                                    <>
                                        {statsSubject.charAt(0).toUpperCase() + statsSubject.slice(1)}
                                        {statsChapter !== 'all' && ` > ${subjectData[statsSubject]?.chapters.find(c => c.serial === statsChapter)?.name || ''}`}
                                        {statsMaterial !== 'all' && ` > ${statsMaterial}`}
                                    </>
                                )}
                            </div>
                            <div className="stats-filtered-value">{formatDuration(totalFilteredTime)}</div>
                            <div className="stats-filtered-count">{getFilteredSessions().length} sessions</div>
                        </div>
                    </div>

                    {/* Session Log */}
                    <div className="session-log-card">
                        <div className="session-log-header">
                            <h3>Session Log</h3>
                            <button className="add-entry-btn" onClick={openManualEntryModal} title="Add Manual Entry">
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="session-log-list">
                            {sessions.length === 0 ? (
                                <div className="empty-log">
                                    <Clock size={32} />
                                    <p>No sessions recorded yet</p>
                                    <span>Start a timer to track your study time</span>
                                </div>
                            ) : (
                                sessions.slice().reverse().map(session => (
                                    <div key={session.id} className="session-log-item">
                                        <div className="session-info">
                                            <div className="session-title">{session.title}</div>
                                            <div className="session-meta">
                                                {new Date(session.endTime).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                        <div className="session-duration">{formatDuration(session.duration)}</div>
                                        <div className="session-actions">
                                            <button
                                                className="session-edit-btn"
                                                onClick={() => openEditModal(session)}
                                                title="Edit session"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                className="session-delete-btn"
                                                onClick={() => onDeleteSession(session.id)}
                                                title="Delete session"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Distribution Modal */}
            {showDistribution && (
                <div className="distribution-modal-overlay" onClick={() => setShowDistribution(false)}>
                    <div className="distribution-modal" onClick={e => e.stopPropagation()}>
                        <div className="distribution-modal-header">
                            <h3>Study Time Breakdown</h3>
                            <button className="distribution-modal-close" onClick={() => setShowDistribution(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="distribution-total-time">
                            <div className="distribution-total-label">Total Study Time</div>
                            <div className="distribution-total-value">{formatDuration(totalTime)}</div>
                        </div>

                        <div className="distribution-section-title">Time by Subject</div>
                        <div className="distribution-chart">
                            {[
                                { key: 'physics', label: 'Physics', time: subjectDistribution.physics },
                                { key: 'chemistry', label: 'Chemistry', time: subjectDistribution.chemistry },
                                { key: 'maths', label: 'Maths', time: subjectDistribution.maths },
                                { key: 'custom', label: 'Custom', time: subjectDistribution.custom },
                            ].map(item => {
                                const isOpen = item.key !== 'custom' && openChapterGraphs.includes(item.key as Subject);
                                const topChapters = isOpen ? getTopChaptersForSubject(item.key as Subject) : [];
                                const maxTime = topChapters[0]?.time || 1;

                                return (
                                    <div key={item.key} className="distribution-subject-section">
                                        <div
                                            className="distribution-bar-item"
                                            onClick={() => item.key !== 'custom' && toggleChapterGraph(item.key as Subject)}
                                            title={item.key !== 'custom' ? 'Click to see chapter breakdown' : ''}
                                        >
                                            <div className="distribution-bar-header">
                                                <span className="distribution-bar-label">{item.label}</span>
                                                <span className="distribution-bar-value">
                                                    {formatDuration(item.time)} ({totalTime > 0 ? Math.round((item.time / totalTime) * 100) : 0}%)
                                                </span>
                                            </div>
                                            <div className="distribution-bar-track">
                                                <div
                                                    className={`distribution-bar-fill ${item.key}`}
                                                    style={{ width: `${totalTime > 0 ? (item.time / totalTime) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Chapter Graph - inline below subject */}
                                        {isOpen && (
                                            <div className="chapter-graph-inline">
                                                <div className="chapter-graph-bars">
                                                    {topChapters.length === 0 ? (
                                                        <div className="empty-log empty-log-chapter">
                                                            <span>No chapter data yet</span>
                                                        </div>
                                                    ) : (
                                                        topChapters.map(chapter => (
                                                            <div key={chapter.serial} className="chapter-bar-item">
                                                                <div className="chapter-bar-header">
                                                                    <span className="chapter-bar-name">{chapter.name}</span>
                                                                    <span className="chapter-bar-time">{formatDuration(chapter.time)}</span>
                                                                </div>
                                                                <div className="chapter-bar-track">
                                                                    <div
                                                                        className={`chapter-bar-fill ${item.key}`}
                                                                        style={{ width: `${(chapter.time / maxTime) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Session Modal */}
            {editingSession && (
                <div className="distribution-modal-overlay" onClick={closeEditModal}>
                    <div className="distribution-modal" onClick={e => e.stopPropagation()}>
                        <div className="distribution-modal-header">
                            <h3>Edit Session</h3>
                            <button className="distribution-modal-close" onClick={closeEditModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="edit-session-form">
                            <div className="edit-form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Session title..."
                                    className="edit-input"
                                />
                            </div>

                            <div className="edit-form-group">
                                <label>Subject</label>
                                <CustomSelect
                                    value={editSubject}
                                    onChange={(val) => setEditSubject(val as Subject | '')}
                                    options={[
                                        { value: '', label: 'None' },
                                        { value: 'physics', label: 'Physics' },
                                        { value: 'chemistry', label: 'Chemistry' },
                                        { value: 'maths', label: 'Maths' }
                                    ]}
                                    placeholder="Select Subject"
                                />
                            </div>

                            <div className="edit-form-group">
                                <label>Material</label>
                                <input
                                    type="text"
                                    value={editMaterial}
                                    onChange={(e) => setEditMaterial(e.target.value)}
                                    placeholder="Material name..."
                                    className="edit-input"
                                />
                            </div>

                            <div className="edit-form-actions">
                                <button className="edit-cancel-btn" onClick={closeEditModal}>Cancel</button>
                                <button className="edit-save-btn" onClick={saveEditedSession}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Entry Modal */}
            {showManualEntry && (
                <div className="distribution-modal-overlay" onClick={closeManualEntryModal}>
                    <div className="distribution-modal" onClick={e => e.stopPropagation()}>
                        <div className="distribution-modal-header">
                            <h3>Add Manual Entry</h3>
                            <button className="distribution-modal-close" onClick={closeManualEntryModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="edit-session-form">
                            <div className="edit-form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={manualTitle}
                                    onChange={(e) => setManualTitle(e.target.value)}
                                    placeholder="What did you study?"
                                    className="edit-input"
                                    autoFocus
                                />
                            </div>

                            <div className="edit-form-group">
                                <label>Duration *</label>
                                <div className="duration-input-group">
                                    <input
                                        type="number"
                                        min="0"
                                        max="23"
                                        value={manualHours}
                                        onChange={(e) => setManualHours(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="edit-input duration-input"
                                    />
                                    <span className="duration-label">hours</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={manualMinutes}
                                        onChange={(e) => setManualMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                        className="edit-input duration-input"
                                    />
                                    <span className="duration-label">minutes</span>
                                </div>
                            </div>

                            <div className="edit-form-group">
                                <label>Date</label>
                                <button
                                    type="button"
                                    className="date-picker-btn"
                                    onClick={() => setIsDatePickerOpen(true)}
                                >
                                    <span>{new Date(manualDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    <Calendar size={18} className="calendar-icon" />
                                </button>
                            </div>

                            <div className="edit-form-group">
                                <label>Subject (optional)</label>
                                <CustomSelect
                                    value={manualSubject}
                                    onChange={(val) => setManualSubject(val as Subject | '')}
                                    options={[
                                        { value: '', label: 'None' },
                                        { value: 'physics', label: 'Physics' },
                                        { value: 'chemistry', label: 'Chemistry' },
                                        { value: 'maths', label: 'Maths' }
                                    ]}
                                    placeholder="Select Subject"
                                />
                            </div>

                            <div className="edit-form-group">
                                <label>Material (optional)</label>
                                <input
                                    type="text"
                                    value={manualMaterial}
                                    onChange={(e) => setManualMaterial(e.target.value)}
                                    placeholder="Material name..."
                                    className="edit-input"
                                />
                            </div>

                            <div className="edit-form-actions">
                                <button className="edit-cancel-btn" onClick={closeManualEntryModal}>Cancel</button>
                                <button
                                    className="edit-save-btn"
                                    onClick={handleAddManualEntry}
                                    disabled={!manualTitle.trim() || (manualHours === 0 && manualMinutes === 0)}
                                >
                                    Add Session
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DatePickerModal
                isOpen={isDatePickerOpen}
                selectedDate={manualDate}
                onSelect={(date) => {
                    setManualDate(date);
                    setIsDatePickerOpen(false);
                }}
                onClose={() => setIsDatePickerOpen(false)}
            />
        </div>
    );
}
