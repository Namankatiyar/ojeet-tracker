import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────
export type TimerMode = 'stopwatch' | 'countdown' | 'pomodoro' | 'custom';
export type TimerPhase = 'work' | 'shortBreak' | 'longBreak' | null;
export type EngineState = 'idle' | 'running' | 'paused' | 'completed';

export interface PomodoroConfig {
    workMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    cyclesBeforeLongBreak: number;
}

export interface CountdownConfig {
    minutes: number;
    seconds: number;
}

export interface CustomInterval {
    type: 'work' | 'break';
    durationMinutes: number;
}

export interface CustomConfig {
    intervals: CustomInterval[];
    repeat: boolean;
}

export interface TimerConfig {
    mode: TimerMode;
    countdown?: CountdownConfig;
    pomodoro?: PomodoroConfig;
    custom?: CustomConfig;
}

export interface TimerPreset {
    id: string;
    name: string;
    subject?: string;
    config: TimerConfig;
}

export const DEFAULT_POMODORO: PomodoroConfig = {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
};

// Persisted state shape
interface PersistedTimerState {
    mode: TimerMode;
    engineState: EngineState;
    phase: TimerPhase;
    startTimestamp: number | null;     // When the current run started
    pausedElapsedMs: number;           // Elapsed ms accumulated before current run
    durationMs: number;                // Total duration for countdown modes (0 = stopwatch)
    cycleCount: number;
    config: TimerConfig;
    // For custom mode
    currentIntervalIndex: number;
}

const STORAGE_KEY = 'jee-timer-engine';
const PRESETS_KEY = 'jee-timer-presets';

function loadState(): PersistedTimerState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
}

function saveState(state: PersistedTimerState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearState() {
    localStorage.removeItem(STORAGE_KEY);
}

// Get duration in ms for the current phase/interval
function getPhaseDurationMs(
    mode: TimerMode,
    phase: TimerPhase,
    config: TimerConfig,
    intervalIndex: number
): number {
    switch (mode) {
        case 'countdown':
            return ((config.countdown?.minutes ?? 0) * 60 + (config.countdown?.seconds ?? 0)) * 1000;
        case 'pomodoro': {
            const pom = config.pomodoro ?? DEFAULT_POMODORO;
            if (phase === 'shortBreak') return pom.shortBreakMinutes * 60 * 1000;
            if (phase === 'longBreak') return pom.longBreakMinutes * 60 * 1000;
            return pom.workMinutes * 60 * 1000;
        }
        case 'custom': {
            const intervals = config.custom?.intervals ?? [];
            if (intervalIndex < intervals.length) {
                return intervals[intervalIndex].durationMinutes * 60 * 1000;
            }
            return 0;
        }
        default: // stopwatch
            return 0;
    }
}

// ── Hook ──────────────────────────────────────────────────────
export interface UseTimerEngineOptions {
    onWorkComplete?: (durationMs: number) => void;
    onPhaseChange?: (phase: TimerPhase) => void;
}

export interface UseTimerEngineReturn {
    // State
    mode: TimerMode;
    engineState: EngineState;
    phase: TimerPhase;
    elapsedMs: number;
    remainingMs: number;
    progress: number;        // 0 → 1 (for countdown modes)
    durationMs: number;
    cycleCount: number;
    config: TimerConfig;
    isCountingDown: boolean; // true if mode has a finite duration

    // Controls
    start: () => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
    skipBreak: () => void;
    resetCycle: () => void;
    setConfig: (config: TimerConfig) => void;

    // Presets
    presets: TimerPreset[];
    savePreset: (name: string, subject?: string) => void;
    loadPreset: (preset: TimerPreset) => void;
    deletePreset: (id: string) => void;

    // Convenience
    formatTime: (ms: number) => string;
}

export function useTimerEngine(options: UseTimerEngineOptions = {}): UseTimerEngineReturn {
    const { onWorkComplete, onPhaseChange } = options;
    const onWorkCompleteRef = useRef(onWorkComplete);
    const onPhaseChangeRef = useRef(onPhaseChange);
    onWorkCompleteRef.current = onWorkComplete;
    onPhaseChangeRef.current = onPhaseChange;

    // ── Initialise from persisted state ──
    const [mode, setMode] = useState<TimerMode>('stopwatch');
    const [engineState, setEngineState] = useState<EngineState>('idle');
    const [phase, setPhase] = useState<TimerPhase>(null);
    const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
    const [pausedElapsedMs, setPausedElapsedMs] = useState(0);
    const [durationMs, setDurationMs] = useState(0);
    const [cycleCount, setCycleCount] = useState(0);
    const [config, setConfigState] = useState<TimerConfig>({ mode: 'stopwatch' });
    const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);

    // Presets
    const [presets, setPresets] = useState<TimerPreset[]>(() => {
        try {
            const raw = localStorage.getItem(PRESETS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    });

    // Flag to prevent double-firing completion
    const completionFiredRef = useRef(false);
    const intervalRef = useRef<number | null>(null);

    // ── Hydrate from localStorage on mount ──
    useEffect(() => {
        const saved = loadState();
        if (!saved) return;

        setMode(saved.mode);
        setPhase(saved.phase);
        setCycleCount(saved.cycleCount);
        setConfigState(saved.config);
        setDurationMs(saved.durationMs);
        setCurrentIntervalIndex(saved.currentIntervalIndex);

        if (saved.engineState === 'running' && saved.startTimestamp) {
            // Timer was running — reconstruct elapsed
            const now = Date.now();
            const elapsed = (now - saved.startTimestamp) + saved.pausedElapsedMs;
            setPausedElapsedMs(saved.pausedElapsedMs);
            setStartTimestamp(saved.startTimestamp);
            setElapsedMs(elapsed);
            setEngineState('running');
        } else if (saved.engineState === 'paused') {
            setPausedElapsedMs(saved.pausedElapsedMs);
            setElapsedMs(saved.pausedElapsedMs);
            setStartTimestamp(null);
            setEngineState('paused');
        }
    }, []);

    // ── Persist state on change ──
    useEffect(() => {
        if (engineState === 'idle') {
            clearState();
            return;
        }
        const state: PersistedTimerState = {
            mode, engineState, phase, startTimestamp, pausedElapsedMs,
            durationMs, cycleCount, config, currentIntervalIndex,
        };
        saveState(state);
    }, [mode, engineState, phase, startTimestamp, pausedElapsedMs, durationMs, cycleCount, config, currentIntervalIndex]);

    // ── Phase transition logic ──
    const transitionToNextPhase = useCallback(() => {
        if (mode === 'countdown') {
            // Single countdown — just complete
            setEngineState('idle');
            clearState();
            return;
        }

        if (mode === 'pomodoro') {
            const pom = config.pomodoro ?? DEFAULT_POMODORO;
            if (phase === 'work') {
                const newCycleCount = cycleCount + 1;
                setCycleCount(newCycleCount);
                // Decide break type
                const nextPhase: TimerPhase = (newCycleCount % pom.cyclesBeforeLongBreak === 0)
                    ? 'longBreak'
                    : 'shortBreak';
                setPhase(nextPhase);
                onPhaseChangeRef.current?.(nextPhase);
                const dur = getPhaseDurationMs(mode, nextPhase, config, 0);
                setDurationMs(dur);
                setPausedElapsedMs(0);
                setStartTimestamp(Date.now());
                setElapsedMs(0);
                setEngineState('running');
                completionFiredRef.current = false;
            } else {
                // Break finished — start next work
                setPhase('work');
                onPhaseChangeRef.current?.('work');
                const dur = getPhaseDurationMs(mode, 'work', config, 0);
                setDurationMs(dur);
                setPausedElapsedMs(0);
                setStartTimestamp(Date.now());
                setElapsedMs(0);
                setEngineState('running');
                completionFiredRef.current = false;
            }
            return;
        }

        if (mode === 'custom') {
            const intervals = config.custom?.intervals ?? [];
            const nextIdx = currentIntervalIndex + 1;
            if (nextIdx < intervals.length) {
                setCurrentIntervalIndex(nextIdx);
                const interval = intervals[nextIdx];
                const nextPhase: TimerPhase = interval.type === 'work' ? 'work' : 'shortBreak';
                setPhase(nextPhase);
                onPhaseChangeRef.current?.(nextPhase);
                const dur = getPhaseDurationMs(mode, nextPhase, config, nextIdx);
                setDurationMs(dur);
                setPausedElapsedMs(0);
                setStartTimestamp(Date.now());
                setElapsedMs(0);
                setEngineState('running');
                completionFiredRef.current = false;
            } else if (config.custom?.repeat && intervals.length > 0) {
                // Restart from beginning
                setCurrentIntervalIndex(0);
                const interval = intervals[0];
                const nextPhase: TimerPhase = interval.type === 'work' ? 'work' : 'shortBreak';
                setPhase(nextPhase);
                onPhaseChangeRef.current?.(nextPhase);
                const dur = getPhaseDurationMs(mode, nextPhase, config, 0);
                setDurationMs(dur);
                setPausedElapsedMs(0);
                setStartTimestamp(Date.now());
                setElapsedMs(0);
                setEngineState('running');
                completionFiredRef.current = false;
            } else {
                // All intervals done
                setEngineState('idle');
                clearState();
            }
            return;
        }
    }, [mode, phase, cycleCount, config, currentIntervalIndex]);

    // ── Tick loop ──
    useEffect(() => {
        if (engineState !== 'running' || startTimestamp === null) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const tick = () => {
            const now = Date.now();
            const elapsed = (now - startTimestamp) + pausedElapsedMs;
            setElapsedMs(elapsed);

            // Check completion for countdown modes
            if (durationMs > 0 && elapsed >= durationMs && !completionFiredRef.current) {
                completionFiredRef.current = true;

                // Fire work complete callback only for work phases
                if (phase === 'work' || phase === null) {
                    onWorkCompleteRef.current?.(Math.min(elapsed, durationMs));
                }

                // Transition
                transitionToNextPhase();
            }
        };

        tick(); // Immediate tick
        intervalRef.current = window.setInterval(tick, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [engineState, startTimestamp, pausedElapsedMs, durationMs, phase, transitionToNextPhase]);

    // ── Controls ──
    const start = useCallback(() => {
        completionFiredRef.current = false;
        const m = config.mode;
        setMode(m);

        if (m === 'stopwatch') {
            setPhase(null);
            setDurationMs(0);
        } else if (m === 'countdown') {
            setPhase(null);
            const dur = getPhaseDurationMs(m, null, config, 0);
            setDurationMs(dur);
        } else if (m === 'pomodoro') {
            setPhase('work');
            onPhaseChangeRef.current?.('work');
            const dur = getPhaseDurationMs(m, 'work', config, 0);
            setDurationMs(dur);
        } else if (m === 'custom') {
            const intervals = config.custom?.intervals ?? [];
            if (intervals.length === 0) return;
            setCurrentIntervalIndex(0);
            const firstPhase: TimerPhase = intervals[0].type === 'work' ? 'work' : 'shortBreak';
            setPhase(firstPhase);
            onPhaseChangeRef.current?.(firstPhase);
            const dur = getPhaseDurationMs(m, firstPhase, config, 0);
            setDurationMs(dur);
        }

        setCycleCount(0);
        setPausedElapsedMs(0);
        setStartTimestamp(Date.now());
        setElapsedMs(0);
        setEngineState('running');
    }, [config]);

    const pause = useCallback(() => {
        if (engineState !== 'running' || startTimestamp === null) return;
        const now = Date.now();
        const elapsed = (now - startTimestamp) + pausedElapsedMs;
        setPausedElapsedMs(elapsed);
        setElapsedMs(elapsed);
        setStartTimestamp(null);
        setEngineState('paused');
    }, [engineState, startTimestamp, pausedElapsedMs]);

    const resume = useCallback(() => {
        if (engineState !== 'paused') return;
        completionFiredRef.current = false;
        setStartTimestamp(Date.now());
        setEngineState('running');
    }, [engineState]);

    const reset = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setEngineState('idle');
        setPhase(null);
        setStartTimestamp(null);
        setPausedElapsedMs(0);
        setElapsedMs(0);
        setDurationMs(0);
        setCycleCount(0);
        setCurrentIntervalIndex(0);
        completionFiredRef.current = false;
        clearState();
    }, []);

    const skipBreak = useCallback(() => {
        if (phase !== 'shortBreak' && phase !== 'longBreak') return;
        completionFiredRef.current = false;

        if (mode === 'pomodoro') {
            setPhase('work');
            onPhaseChangeRef.current?.('work');
            const dur = getPhaseDurationMs(mode, 'work', config, 0);
            setDurationMs(dur);
            setPausedElapsedMs(0);
            setStartTimestamp(Date.now());
            setElapsedMs(0);
            setEngineState('running');
        } else if (mode === 'custom') {
            // Skip to next work interval or finish
            const intervals = config.custom?.intervals ?? [];
            let nextIdx = currentIntervalIndex + 1;
            while (nextIdx < intervals.length && intervals[nextIdx].type === 'break') {
                nextIdx++;
            }
            if (nextIdx < intervals.length) {
                setCurrentIntervalIndex(nextIdx);
                setPhase('work');
                onPhaseChangeRef.current?.('work');
                const dur = getPhaseDurationMs(mode, 'work', config, nextIdx);
                setDurationMs(dur);
                setPausedElapsedMs(0);
                setStartTimestamp(Date.now());
                setElapsedMs(0);
                setEngineState('running');
            } else {
                reset();
            }
        }
    }, [phase, mode, config, currentIntervalIndex, reset]);

    const resetCycle = useCallback(() => {
        setCycleCount(0);
        completionFiredRef.current = false;

        if (mode === 'pomodoro') {
            setPhase('work');
            onPhaseChangeRef.current?.('work');
            const dur = getPhaseDurationMs(mode, 'work', config, 0);
            setDurationMs(dur);
            setPausedElapsedMs(0);
            setStartTimestamp(Date.now());
            setElapsedMs(0);
            setEngineState('running');
        } else if (mode === 'custom') {
            setCurrentIntervalIndex(0);
            const intervals = config.custom?.intervals ?? [];
            if (intervals.length > 0) {
                const firstPhase: TimerPhase = intervals[0].type === 'work' ? 'work' : 'shortBreak';
                setPhase(firstPhase);
                onPhaseChangeRef.current?.(firstPhase);
                const dur = getPhaseDurationMs(mode, firstPhase, config, 0);
                setDurationMs(dur);
                setPausedElapsedMs(0);
                setStartTimestamp(Date.now());
                setElapsedMs(0);
                setEngineState('running');
            }
        }
    }, [mode, config]);

    const setConfig = useCallback((newConfig: TimerConfig) => {
        setConfigState(newConfig);
        // If idle, update mode to match
        if (engineState === 'idle') {
            setMode(newConfig.mode);
        }
    }, [engineState]);

    // ── Presets ──
    const savePreset = useCallback((name: string, subject?: string) => {
        const preset: TimerPreset = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name,
            subject,
            config,
        };
        const updated = [...presets, preset];
        setPresets(updated);
        localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
    }, [config, presets]);

    const loadPreset = useCallback((preset: TimerPreset) => {
        setConfigState(preset.config);
        setMode(preset.config.mode);
    }, []);

    const deletePreset = useCallback((id: string) => {
        const updated = presets.filter(p => p.id !== id);
        setPresets(updated);
        localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
    }, [presets]);

    // ── Computed values ──
    const isCountingDown = mode !== 'stopwatch';
    const remainingMs = isCountingDown ? Math.max(0, durationMs - elapsedMs) : 0;
    const progress = isCountingDown && durationMs > 0 ? Math.min(1, elapsedMs / durationMs) : 0;

    // ── Format ──
    const formatTime = useCallback((ms: number): string => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        mode, engineState, phase, elapsedMs, remainingMs, progress, durationMs,
        cycleCount, config, isCountingDown,
        start, pause, resume, reset, skipBreak, resetCycle, setConfig,
        presets, savePreset, loadPreset, deletePreset,
        formatTime,
    };
}
