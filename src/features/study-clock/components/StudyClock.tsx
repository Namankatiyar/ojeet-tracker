import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useTheme } from '../../../core/context/ThemeContext';
import { Subject, SubjectData, StudySession, PlannerTask, AppProgress } from '../../../shared/types';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';
import { triggerSmallConfetti } from '../../../shared/utils/confetti';
import { playCompletionBell, playStartBell, playPauseSound, playSaveAndEndSound } from '../utils/timerAudio';
import { useTimerEngine, TimerPhase } from '../hooks/useTimerEngine';
import { TimerControls } from './Timer/TimerControls';
import { ModeSelector } from './Timer/ModeSelector';
import { PresetManager } from './Presets/PresetManager';
import { SessionHistory } from './SessionHistory';
import { SessionStatistics } from './SessionStatistics';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { requestNotificationPermission, dispatchNotification } from '../../../shared/utils/notifications';
import { formatDateLocal } from '../../../shared/utils/date';

function plannerTaskSessionMeta(
    task: PlannerTask,
    subjectData: Record<Subject, SubjectData | null>,
): {
    sessionSubject?: Subject;
    sessionChapterSerial?: number;
    sessionChapterName?: string;
    sessionMaterial?: string;
    sessionType: 'chapter' | 'custom';
} {
    if (!task.subject) {
        return { sessionType: 'custom' };
    }
    if (task.chapterSerial != null) {
        return {
            sessionSubject: task.subject,
            sessionChapterSerial: task.chapterSerial,
            sessionChapterName: subjectData[task.subject]?.chapters.find(c => c.serial === task.chapterSerial)?.name,
            sessionMaterial: task.material,
            sessionType: 'chapter',
        };
    }
    return {
        sessionSubject: task.subject,
        sessionType: 'custom',
    };
}

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

export function StudyClock({
    subjectData, sessions, onAddSession, onDeleteSession, onEditSession,
    plannerTasks, progress, onToggleTask,
}: StudyClockProps) {
    const { accentColor } = useTheme();

    // ── Task selection state (Persisted for Pomodoro cycle transitions) ──
    const [taskType, setTaskType] = useLocalStorage<'chapter' | 'custom' | 'task'>('studyClock_taskType', 'chapter');
    const [selectedSubject, setSelectedSubject] = useLocalStorage<Subject | ''>('studyClock_selectedSubject', '');
    const [selectedChapter, setSelectedChapter] = useLocalStorage<number | ''>('studyClock_selectedChapter', '');
    const [selectedMaterial, setSelectedMaterial] = useLocalStorage<string>('studyClock_selectedMaterial', '');
    const [customTitle, setCustomTitle] = useLocalStorage<string>('studyClock_customTitle', '');
    const [selectedTaskId, setSelectedTaskId] = useLocalStorage<string>('studyClock_selectedTaskId', '');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Toggle body class to hide distracting global FABs in fullscreen mode
    useEffect(() => {
        if (isFullscreen) {
            document.body.classList.add('hide-global-fabs');
        } else {
            document.body.classList.remove('hide-global-fabs');
        }
        return () => document.body.classList.remove('hide-global-fabs');
    }, [isFullscreen]);

    // ── Task title helper ──
    const getTaskTitle = useCallback((): string => {
        if (taskType === 'custom') return customTitle || 'Untitled Session';
        if (taskType === 'task' && selectedTaskId) {
            const task = plannerTasks.find(t => t.id === selectedTaskId);
            if (task) return task.title + (task.subtitle ? ` - ${task.subtitle}` : '');
        }
        const parts: string[] = [];
        if (selectedSubject) parts.push(selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1));
        if (selectedChapter && selectedSubject) {
            const chapter = subjectData[selectedSubject]?.chapters.find(c => c.serial === selectedChapter);
            if (chapter) parts.push(chapter.name);
        }
        if (selectedMaterial) parts.push(selectedMaterial);
        return parts.length > 0 ? parts.join(' > ') : 'Untitled Session';
    }, [taskType, customTitle, selectedSubject, selectedChapter, selectedMaterial, selectedTaskId, plannerTasks, subjectData]);

    const getChapterName = useCallback((): string | undefined => {
        if (selectedSubject && selectedChapter) {
            return subjectData[selectedSubject]?.chapters.find(c => c.serial === selectedChapter)?.name;
        }
        return undefined;
    }, [selectedSubject, selectedChapter, subjectData]);

    // ── Timer engine ──
    const engine = useTimerEngine({
        onPhaseChange: useCallback((newPhase: TimerPhase) => {
            if (newPhase === 'shortBreak' || newPhase === 'longBreak') {
                playCompletionBell();
                dispatchNotification('Break Time!', { body: 'Time to take a short rest.' });
            } else if (newPhase === 'work') {
                playStartBell();
                dispatchNotification('Back to Work!', { body: 'Your break is over. Let\'s get back to it!' });
            }
        }, []),
        onWorkComplete: (durationMs, completedAtMs) => {
            const durationSec = Math.floor(durationMs / 1000);
            if (durationSec <= 0) return;
            const endAtMs = completedAtMs ?? Date.now();

            // Build session metadata
            let sessionSubject: Subject | undefined = undefined;
            let sessionChapterSerial: number | undefined = undefined;
            let sessionChapterName: string | undefined = undefined;
            let sessionMaterial: string | undefined = undefined;
            let sessionType: 'chapter' | 'custom' | 'task' = taskType;

            if (taskType === 'chapter' && selectedSubject) {
                sessionSubject = selectedSubject;
                sessionChapterSerial = selectedChapter as number || undefined;
                sessionChapterName = getChapterName();
                sessionMaterial = selectedMaterial || undefined;
            } else if (taskType === 'task' && selectedTaskId) {
                const task = plannerTasks.find(t => t.id === selectedTaskId);
                if (task) {
                    const meta = plannerTaskSessionMeta(task, subjectData);
                    sessionSubject = meta.sessionSubject;
                    sessionChapterSerial = meta.sessionChapterSerial;
                    sessionChapterName = meta.sessionChapterName;
                    sessionMaterial = meta.sessionMaterial;
                    sessionType = meta.sessionType;
                } else {
                    sessionType = 'custom';
                }
            }

            const session: StudySession = {
                id: crypto.randomUUID(),
                title: getTaskTitle(),
                subject: sessionSubject,
                chapterSerial: sessionChapterSerial,
                chapterName: sessionChapterName,
                material: sessionMaterial,
                type: sessionType,
                startTime: new Date(endAtMs - durationMs).toISOString(),
                endTime: new Date(endAtMs).toISOString(),
                localDate: formatDateLocal(new Date(endAtMs)),
                duration: durationSec,
                timerMode: engine.mode,
            };
            onAddSession(session);

            // Completion effects
            triggerSmallConfetti(accentColor);
            playCompletionBell();
            dispatchNotification('Session Complete!', { body: `Great job focusing on ${session.title}` });
        },
    });

    // ── Manual end (stopwatch) — creates session from elapsed time ──
    const handleEnd = useCallback((e?: React.MouseEvent) => {
        const latestElapsedMs = engine.syncNow();
        const elapsedSec = Math.floor(latestElapsedMs / 1000);
        if (elapsedSec > 0) {
            let sessionSubject: Subject | undefined = undefined;
            let sessionChapterSerial: number | undefined = undefined;
            let sessionChapterName: string | undefined = undefined;
            let sessionMaterial: string | undefined = undefined;
            let sessionType: 'chapter' | 'custom' | 'task' = taskType;

            if (taskType === 'chapter' && selectedSubject) {
                sessionSubject = selectedSubject;
                sessionChapterSerial = selectedChapter as number || undefined;
                sessionChapterName = getChapterName();
                sessionMaterial = selectedMaterial || undefined;
            } else if (taskType === 'task' && selectedTaskId) {
                const task = plannerTasks.find(t => t.id === selectedTaskId);
                if (task) {
                    const meta = plannerTaskSessionMeta(task, subjectData);
                    sessionSubject = meta.sessionSubject;
                    sessionChapterSerial = meta.sessionChapterSerial;
                    sessionChapterName = meta.sessionChapterName;
                    sessionMaterial = meta.sessionMaterial;
                    sessionType = meta.sessionType;
                } else {
                    sessionType = 'custom';
                }
            }

            const session: StudySession = {
                id: crypto.randomUUID(),
                title: getTaskTitle(),
                subject: sessionSubject,
                chapterSerial: sessionChapterSerial,
                chapterName: sessionChapterName,
                material: sessionMaterial,
                type: sessionType,
                startTime: new Date(Date.now() - latestElapsedMs).toISOString(),
                endTime: new Date().toISOString(),
                localDate: formatDateLocal(new Date()),
                duration: elapsedSec,
                timerMode: engine.mode,
            };
            onAddSession(session);

            let x: number | undefined;
            let y: number | undefined;
            if (e) {
                x = e.clientX / window.innerWidth;
                y = e.clientY / window.innerHeight;
            }

            triggerSmallConfetti(accentColor, x, y);
            playSaveAndEndSound();
        }
        engine.reset();
        setIsFullscreen(false);
    }, [engine, taskType, selectedSubject, selectedChapter, selectedMaterial, selectedTaskId, plannerTasks, subjectData, getTaskTitle, getChapterName, onAddSession, accentColor]);

    const handleDiscard = useCallback(() => {
        engine.reset();
        setIsFullscreen(false);
        setTaskType('chapter');
        setSelectedSubject('');
        setSelectedChapter('');
        setSelectedMaterial('');
        setCustomTitle('');
        setSelectedTaskId('');
    }, [engine]);

    const handleMarkComplete = useCallback((e?: React.MouseEvent) => {
        if (taskType === 'task' && selectedTaskId && onToggleTask) {
            handleEnd(e);
            onToggleTask(selectedTaskId);
        }
    }, [taskType, selectedTaskId, onToggleTask, handleEnd]);

    const canMarkComplete = taskType === 'task' && selectedTaskId && onToggleTask &&
        !plannerTasks.find(t => t.id === selectedTaskId)?.completed;

    // ── URL task auto-select ──
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        const taskId = searchParams.get('taskId');
        if (!taskId || engine.engineState !== 'idle') return;
        const task = plannerTasks.find(t => t.id === taskId);
        if (!task || task.completed) return;
        setTaskType('task');
        setSelectedTaskId(taskId);
        if (task.subject) {
            setSelectedSubject(task.subject);
            if (task.chapterSerial != null) {
                setSelectedChapter(task.chapterSerial);
                setSelectedMaterial(task.material || '');
                setCustomTitle('');
            } else {
                setSelectedChapter('');
                setSelectedMaterial('');
                setCustomTitle(task.title);
            }
        } else {
            setSelectedSubject('');
            setSelectedChapter('');
            setSelectedMaterial('');
            setCustomTitle(task.title);
        }
        setSearchParams({}, { replace: true });
    }, [searchParams, plannerTasks, engine.engineState]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
            if (e.code === 'Space') {
                e.preventDefault();
                if (engine.engineState === 'idle') {
                    engine.start();
                } else if (engine.engineState === 'running') {
                    playPauseSound();
                    engine.pause();
                } else if (engine.engineState === 'paused') {
                    engine.resume();
                }
            } else if (e.code === 'KeyF') {
                e.preventDefault();
                setIsFullscreen(prev => !prev);
            } else if (e.code === 'Escape' && isFullscreen) {
                e.preventDefault();
                engine.pause();
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [engine, isFullscreen]);

    // Available options for selectors
    const availableChapters = selectedSubject ? subjectData[selectedSubject]?.chapters || [] : [];
    const availableMaterials = selectedSubject ? subjectData[selectedSubject]?.materialNames || [] : [];

    // Display time
    const displayTime = engine.isCountingDown
        ? engine.formatTime(engine.remainingMs)
        : engine.formatTime(engine.elapsedMs);

    const phaseLabel = (() => {
        if (engine.engineState === 'idle') return 'READY';
        if (engine.engineState === 'paused') return 'PAUSED';
        if (engine.phase === 'work') return 'WORK';
        if (engine.phase === 'shortBreak') return 'SHORT BREAK';
        if (engine.phase === 'longBreak') return 'LONG BREAK';
        if (engine.engineState === 'running') return engine.isCountingDown ? 'COUNTDOWN' : (isFullscreen ? 'STOPWATCH' : 'CLICK FOR FULLSCREEN');
        return '';
    })();

    // ── Fullscreen render ──
    if (isFullscreen) {
        return (
            <div className="fullscreen-timer">
                <div className="fullscreen-clock">
                    <div
                        className={`fullscreen-time ${engine.engineState === 'running' ? 'running' : ''} ${engine.engineState === 'paused' ? 'paused' : ''}`}
                        onClick={() => {
                            engine.pause();
                            setIsFullscreen(false);
                        }}
                        title="Click to Pause & Exit Fullscreen"
                    >
                        {displayTime}
                    </div>
                    <div className="fullscreen-info-group">
                        <h2 className="fullscreen-title">{getTaskTitle()}</h2>
                        <div className="fullscreen-state-label">
                            {phaseLabel}
                            {engine.mode === 'pomodoro' && ` • CYCLE ${engine.cycleCount + 1}`}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main render ──
    const isIdle = engine.engineState === 'idle';

    return (
        <div className="study-clock-page">
            <div className="study-clock-header">
                <h1><Clock size={28} /> Study Clock</h1>
                <h2 className="sr-only">JEE Pomodoro Timer and Free Digital Study Stopwatch to log study hours for JEE Main exam</h2>
                <p>Track your study sessions and analyze your progress</p>
            </div>

            <div className="study-clock-grid">
                <div className="timer-card horizontal">
                    {/* Task selector - collapsible when timer is active */}
                    <div className={`task-selector-section ${!isIdle ? 'collapsed' : ''}`}>
                        {!isIdle ? (
                            <div className="collapsed-task-info">
                                <div className="collapsed-task-label">Studying:</div>
                                <div className="collapsed-task-title">{getTaskTitle()}</div>
                                {engine.mode !== 'stopwatch' && (
                                    <div className="collapsed-mode-badge">{engine.mode}</div>
                                )}
                                {engine.mode === 'pomodoro' && (
                                    <div className="collapsed-cycle-info">Cycle {engine.cycleCount + 1}</div>
                                )}
                            </div>
                        ) : (
                            <>
                                <h3>What are you studying?</h3>

                                {/* Mode Selector */}
                                <ModeSelector
                                    config={engine.config}
                                    onConfigChange={engine.setConfig}
                                    disabled={!isIdle}
                                />

                                {/* Preset Manager */}
                                {engine.mode !== 'stopwatch' && (
                                    <PresetManager
                                        presets={engine.presets}
                                        onSavePreset={engine.savePreset}
                                        onLoadPreset={engine.loadPreset}
                                        onDeletePreset={engine.deletePreset}
                                        disabled={!isIdle}
                                    />
                                )}

                                <div className="task-type-toggle">
                                    <button
                                        className={`type-btn ${taskType === 'chapter' ? 'active' : ''}`}
                                        onClick={() => setTaskType('chapter')}
                                        disabled={!isIdle}
                                    >
                                        Syllabus
                                    </button>
                                    <button
                                        className={`type-btn ${taskType === 'task' ? 'active' : ''}`}
                                        onClick={() => setTaskType('task')}
                                        disabled={!isIdle}
                                    >
                                        From Tasks
                                    </button>
                                    <button
                                        className={`type-btn ${taskType === 'custom' ? 'active' : ''}`}
                                        onClick={() => setTaskType('custom')}
                                        disabled={!isIdle}
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
                                                    { value: 'maths', label: 'Maths' },
                                                ]}
                                                placeholder="Select Subject"
                                                disabled={!isIdle}
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
                                                        priority: chapterPriority !== 'none' ? chapterPriority : undefined,
                                                    };
                                                })}
                                                placeholder="Select Chapter"
                                                disabled={!isIdle || !selectedSubject}
                                            />
                                        </div>
                                        <div className="selector-group">
                                            <label>Material</label>
                                            <CustomSelect
                                                value={selectedMaterial}
                                                onChange={(val) => setSelectedMaterial(val)}
                                                options={availableMaterials.map(mat => ({ value: mat, label: mat }))}
                                                placeholder="Select Material"
                                                disabled={!isIdle || !selectedSubject}
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
                                                        if (task.subject) {
                                                            setSelectedSubject(task.subject);
                                                            if (task.chapterSerial != null) {
                                                                setSelectedChapter(task.chapterSerial);
                                                                setSelectedMaterial(task.material || '');
                                                                setCustomTitle('');
                                                            } else {
                                                                setSelectedChapter('');
                                                                setSelectedMaterial('');
                                                                setCustomTitle(task.title);
                                                            }
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
                                                    label: `${task.title}${task.subtitle ? ` - ${task.subtitle}` : ''}`,
                                                }))}
                                                placeholder="Select a task..."
                                                disabled={!isIdle}
                                            />
                                        </div>
                                        {selectedTaskId && (() => {
                                            const task = plannerTasks.find(t => t.id === selectedTaskId);
                                            if (task?.subject) {
                                                return (
                                                    <div className="task-auto-filled">
                                                        <div className="auto-filled-item"><span>Subject:</span> {task.subject.charAt(0).toUpperCase() + task.subject.slice(1)}</div>
                                                        {task.chapterSerial != null && <div className="auto-filled-item"><span>Chapter:</span> {subjectData[task.subject]?.chapters.find(c => c.serial === task.chapterSerial)?.name || `#${task.chapterSerial}`}</div>}
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
                                            onChange={e => setCustomTitle(e.target.value)}
                                            disabled={!isIdle}
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
                            className={`timer-circle ${engine.engineState === 'running' ? 'running' : ''} ${engine.engineState === 'paused' ? 'paused' : ''}`}
                            onClick={() => {
                                if (engine.engineState === 'running') setIsFullscreen(true);
                            }}
                            title={engine.engineState === 'running' ? 'Click to enter fullscreen (or press F)' : ''}
                        >
                            <div className="timer-time">{displayTime}</div>
                            <div className="timer-state-label" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{phaseLabel}</div>
                        </div>

                        <TimerControls
                            engineState={engine.engineState}
                            phase={engine.phase}
                            mode={engine.mode}
                            canMarkComplete={!!canMarkComplete}
                            onStart={() => {
                                playStartBell();
                                dispatchNotification('Timer Started', { body: 'Focus session has begun!' });
                                engine.start();
                            }}
                            onPause={() => {
                                playPauseSound();
                                engine.pause();
                            }}
                            onResume={engine.resume}
                            onEnd={handleEnd}
                            onDiscard={handleDiscard}
                            onMarkComplete={handleMarkComplete}
                            onSkipBreak={engine.skipBreak}
                            onResetCycle={engine.resetCycle}
                        />
                    </div>
                </div>

                {/* Statistics and Session Log */}
                <div className="stats-and-log-row">
                    <SessionStatistics
                        sessions={sessions}
                        subjectData={subjectData}
                    />
                    <SessionHistory
                        sessions={sessions}
                        subjectData={subjectData}
                        onDeleteSession={onDeleteSession}
                        onEditSession={onEditSession}
                        onAddSession={onAddSession}
                    />
                </div>
            </div>
        </div>
    );
}
