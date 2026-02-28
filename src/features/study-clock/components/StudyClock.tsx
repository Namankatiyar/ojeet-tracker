import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Subject, SubjectData, StudySession, PlannerTask, AppProgress } from '../../../shared/types';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';
import { triggerConfetti } from '../../../shared/utils/confetti';
import { playCompletionBell } from '../utils/timerAudio';
import { useTimerEngine } from '../hooks/useTimerEngine';
import { TimerControls } from './RadialTimer/TimerControls';
import { ModeSelector } from './RadialTimer/ModeSelector';
import { PresetManager } from './Presets/PresetManager';
import { SessionHistory } from './SessionHistory';
import { SessionStatistics } from './SessionStatistics';

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
    // ── Task selection state ──
    const [taskType, setTaskType] = useState<'chapter' | 'custom' | 'task'>('chapter');
    const [selectedSubject, setSelectedSubject] = useState<Subject | ''>('');
    const [selectedChapter, setSelectedChapter] = useState<number | ''>('');
    const [selectedMaterial, setSelectedMaterial] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

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
        onWorkComplete: (durationMs) => {
            const durationSec = Math.floor(durationMs / 1000);
            if (durationSec <= 0) return;

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
                if (task?.type === 'chapter' && task.subject) {
                    sessionSubject = task.subject;
                    sessionChapterSerial = task.chapterSerial;
                    sessionChapterName = subjectData[task.subject]?.chapters.find(c => c.serial === task.chapterSerial)?.name;
                    sessionMaterial = task.material;
                    sessionType = 'chapter';
                } else {
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
                startTime: new Date(Date.now() - durationMs).toISOString(),
                endTime: new Date().toISOString(),
                duration: durationSec,
                timerMode: engine.mode,
            };
            onAddSession(session);

            // Completion effects
            triggerConfetti();
            playCompletionBell();
        },
    });

    // ── Manual end (stopwatch) — creates session from elapsed time ──
    const handleEnd = useCallback(() => {
        const elapsedSec = Math.floor(engine.elapsedMs / 1000);
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
                if (task?.type === 'chapter' && task.subject) {
                    sessionSubject = task.subject;
                    sessionChapterSerial = task.chapterSerial;
                    sessionChapterName = subjectData[task.subject]?.chapters.find(c => c.serial === task.chapterSerial)?.name;
                    sessionMaterial = task.material;
                    sessionType = 'chapter';
                } else {
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
                startTime: new Date(Date.now() - engine.elapsedMs).toISOString(),
                endTime: new Date().toISOString(),
                duration: elapsedSec,
                timerMode: engine.mode,
            };
            onAddSession(session);
            triggerConfetti();
        }
        engine.reset();
        setIsFullscreen(false);
    }, [engine, taskType, selectedSubject, selectedChapter, selectedMaterial, selectedTaskId, plannerTasks, subjectData, getTaskTitle, getChapterName, onAddSession]);

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

    const handleMarkComplete = useCallback(() => {
        if (taskType === 'task' && selectedTaskId && onToggleTask) {
            handleEnd();
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
        setSearchParams({}, { replace: true });
    }, [searchParams, plannerTasks, engine.engineState]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
            if (e.code === 'Space') {
                e.preventDefault();
                if (engine.engineState === 'idle') engine.start();
                else if (engine.engineState === 'running') engine.pause();
                else if (engine.engineState === 'paused') engine.resume();
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
                <div className="fullscreen-clock" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                        className={`timer-time ${engine.engineState === 'running' ? 'running' : ''} ${engine.engineState === 'paused' ? 'paused' : ''}`}
                        onClick={() => {
                            engine.pause();
                            setIsFullscreen(false);
                        }}
                        style={{ cursor: 'pointer', fontSize: '10rem', lineHeight: 1 }}
                    >
                        {displayTime}
                    </div>
                    <div className="fullscreen-title" style={{ marginTop: '1rem' }}>{getTaskTitle()}</div>
                    <div className="timer-state-label" style={{ fontSize: '1.2rem', marginTop: '0.5rem', opacity: 0.8, fontWeight: 700, letterSpacing: '2px' }}>
                        {phaseLabel}
                        {engine.mode === 'pomodoro' && ` • CYCLE ${engine.cycleCount + 1}`}
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
                                                    label: `${task.title}${task.subtitle ? ` - ${task.subtitle}` : ''}`,
                                                }))}
                                                placeholder="Select a task..."
                                                disabled={!isIdle}
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
                            onStart={engine.start}
                            onPause={engine.pause}
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
