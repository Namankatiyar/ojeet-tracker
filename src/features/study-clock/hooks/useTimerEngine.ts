import { useState, useEffect, useRef, useCallback } from 'react';

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

interface PersistedTimerState {
    version: 2;
    mode: TimerMode;
    engineState: EngineState;
    phase: TimerPhase;
    runStartedAtMs: number | null;
    accumulatedActiveMs: number;
    durationMs: number;
    cycleCount: number;
    config: TimerConfig;
    currentIntervalIndex: number;
}

interface LegacyPersistedTimerState {
    mode: TimerMode;
    engineState: EngineState;
    phase: TimerPhase;
    startTimestamp: number | null;
    pausedElapsedMs: number;
    durationMs: number;
    cycleCount: number;
    config: TimerConfig;
    currentIntervalIndex: number;
}

interface ReconcileResult {
    nextState: PersistedTimerState;
    elapsedMs: number;
    completedWorkDurations: number[];
}

const STORAGE_KEY = 'jee-timer-engine';
const PRESETS_KEY = 'jee-timer-presets';

function createIdleState(config: TimerConfig = { mode: 'stopwatch' }): PersistedTimerState {
    return {
        version: 2,
        mode: config.mode,
        engineState: 'idle',
        phase: null,
        runStartedAtMs: null,
        accumulatedActiveMs: 0,
        durationMs: 0,
        cycleCount: 0,
        config,
        currentIntervalIndex: 0,
    };
}

function clampDeltaMs(ms: number): number {
    return Number.isFinite(ms) ? Math.max(0, ms) : 0;
}

function statesMatch(a: PersistedTimerState, b: PersistedTimerState): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

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
        default:
            return 0;
    }
}

function migrateState(parsed: unknown): PersistedTimerState | null {
    if (!parsed || typeof parsed !== 'object') return null;

    const candidate = parsed as Partial<PersistedTimerState & LegacyPersistedTimerState>;
    if (candidate.version === 2) {
        if (!candidate.mode || !candidate.engineState || !candidate.config) return null;
        return {
            version: 2,
            mode: candidate.mode,
            engineState: candidate.engineState,
            phase: candidate.phase ?? null,
            runStartedAtMs: candidate.runStartedAtMs ?? null,
            accumulatedActiveMs: clampDeltaMs(candidate.accumulatedActiveMs ?? 0),
            durationMs: clampDeltaMs(candidate.durationMs ?? 0),
            cycleCount: Math.max(0, candidate.cycleCount ?? 0),
            config: candidate.config,
            currentIntervalIndex: Math.max(0, candidate.currentIntervalIndex ?? 0),
        };
    }

    if (!candidate.mode || !candidate.engineState || !candidate.config) return null;
    return {
        version: 2,
        mode: candidate.mode,
        engineState: candidate.engineState,
        phase: candidate.phase ?? null,
        runStartedAtMs: candidate.startTimestamp ?? null,
        accumulatedActiveMs: clampDeltaMs(candidate.pausedElapsedMs ?? 0),
        durationMs: clampDeltaMs(candidate.durationMs ?? 0),
        cycleCount: Math.max(0, candidate.cycleCount ?? 0),
        config: candidate.config,
        currentIntervalIndex: Math.max(0, candidate.currentIntervalIndex ?? 0),
    };
}

function loadState(): PersistedTimerState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return migrateState(JSON.parse(raw));
    } catch {
        return null;
    }
}

function saveState(state: PersistedTimerState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearState() {
    localStorage.removeItem(STORAGE_KEY);
}

function getElapsedMsAt(state: PersistedTimerState, now: number): number {
    if (state.engineState !== 'running' || state.runStartedAtMs === null) {
        return state.accumulatedActiveMs;
    }

    return state.accumulatedActiveMs + clampDeltaMs(now - state.runStartedAtMs);
}

function buildCountdownCompletionState(state: PersistedTimerState): PersistedTimerState {
    return {
        ...state,
        engineState: 'idle',
        phase: null,
        runStartedAtMs: null,
        accumulatedActiveMs: 0,
        durationMs: 0,
        cycleCount: 0,
        currentIntervalIndex: 0,
    };
}

function buildNextPhaseState(state: PersistedTimerState, overflowMs: number, now: number): PersistedTimerState {
    if (state.mode === 'countdown') {
        return buildCountdownCompletionState(state);
    }

    if (state.mode === 'pomodoro') {
        const pom = state.config.pomodoro ?? DEFAULT_POMODORO;
        if (state.phase === 'work') {
            const cycleCount = state.cycleCount + 1;
            const phase: TimerPhase = cycleCount % pom.cyclesBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak';
            return {
                ...state,
                phase,
                cycleCount,
                durationMs: getPhaseDurationMs('pomodoro', phase, state.config, 0),
                runStartedAtMs: now - overflowMs,
                accumulatedActiveMs: 0,
            };
        }

        return {
            ...state,
            phase: 'work',
            durationMs: getPhaseDurationMs('pomodoro', 'work', state.config, 0),
            runStartedAtMs: now - overflowMs,
            accumulatedActiveMs: 0,
        };
    }

    if (state.mode === 'custom') {
        const intervals = state.config.custom?.intervals ?? [];
        const nextIndex = state.currentIntervalIndex + 1;

        if (nextIndex < intervals.length) {
            const nextPhase: TimerPhase = intervals[nextIndex].type === 'work' ? 'work' : 'shortBreak';
            return {
                ...state,
                phase: nextPhase,
                currentIntervalIndex: nextIndex,
                durationMs: getPhaseDurationMs('custom', nextPhase, state.config, nextIndex),
                runStartedAtMs: now - overflowMs,
                accumulatedActiveMs: 0,
            };
        }

        if (state.config.custom?.repeat && intervals.length > 0) {
            const firstPhase: TimerPhase = intervals[0].type === 'work' ? 'work' : 'shortBreak';
            return {
                ...state,
                phase: firstPhase,
                currentIntervalIndex: 0,
                durationMs: getPhaseDurationMs('custom', firstPhase, state.config, 0),
                runStartedAtMs: now - overflowMs,
                accumulatedActiveMs: 0,
            };
        }

        return {
            ...state,
            engineState: 'idle',
            phase: null,
            runStartedAtMs: null,
            accumulatedActiveMs: 0,
            durationMs: 0,
            currentIntervalIndex: 0,
        };
    }

    return state;
}

export function reconcileTimerState(state: PersistedTimerState, now: number): ReconcileResult {
    if (state.engineState !== 'running' || state.runStartedAtMs === null) {
        return {
            nextState: state,
            elapsedMs: state.accumulatedActiveMs,
            completedWorkDurations: [],
        };
    }

    if (state.mode === 'stopwatch' || state.durationMs <= 0) {
        return {
            nextState: state,
            elapsedMs: getElapsedMsAt(state, now),
            completedWorkDurations: [],
        };
    }

    let nextState = state;
    let elapsedMs = getElapsedMsAt(nextState, now);
    const completedWorkDurations: number[] = [];

    while (nextState.engineState === 'running' && nextState.durationMs > 0 && elapsedMs >= nextState.durationMs) {
        const overflowMs = elapsedMs - nextState.durationMs;
        if (nextState.phase === 'work' || nextState.phase === null) {
            completedWorkDurations.push(nextState.durationMs);
        }
        nextState = buildNextPhaseState(nextState, overflowMs, now);
        elapsedMs = getElapsedMsAt(nextState, now);
    }

    return {
        nextState,
        elapsedMs,
        completedWorkDurations,
    };
}

function normaliseRunningState(state: PersistedTimerState, now: number): PersistedTimerState {
    if (state.engineState !== 'running' || state.runStartedAtMs === null) {
        return state;
    }

    const elapsedMs = getElapsedMsAt(state, now);
    return {
        ...state,
        runStartedAtMs: now,
        accumulatedActiveMs: elapsedMs,
    };
}

export interface UseTimerEngineOptions {
    onWorkComplete?: (durationMs: number) => void;
    onPhaseChange?: (phase: TimerPhase) => void;
}

export interface UseTimerEngineReturn {
    mode: TimerMode;
    engineState: EngineState;
    phase: TimerPhase;
    elapsedMs: number;
    remainingMs: number;
    progress: number;
    durationMs: number;
    cycleCount: number;
    config: TimerConfig;
    isCountingDown: boolean;
    start: () => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
    skipBreak: () => void;
    resetCycle: () => void;
    setConfig: (config: TimerConfig) => void;
    presets: TimerPreset[];
    savePreset: (name: string, subject?: string) => void;
    loadPreset: (preset: TimerPreset) => void;
    deletePreset: (id: string) => void;
    formatTime: (ms: number) => string;
}

export function useTimerEngine(options: UseTimerEngineOptions = {}): UseTimerEngineReturn {
    const { onWorkComplete, onPhaseChange } = options;
    const onWorkCompleteRef = useRef(onWorkComplete);
    const onPhaseChangeRef = useRef(onPhaseChange);
    onWorkCompleteRef.current = onWorkComplete;
    onPhaseChangeRef.current = onPhaseChange;

    const [timerState, setTimerState] = useState<PersistedTimerState>(() => createIdleState());
    const [elapsedMs, setElapsedMs] = useState(0);
    const [presets, setPresets] = useState<TimerPreset[]>(() => {
        try {
            const raw = localStorage.getItem(PRESETS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const applyReconcileResult = useCallback((result: ReconcileResult) => {
        if (!statesMatch(result.nextState, timerState)) {
            if (result.nextState.phase !== timerState.phase) {
                onPhaseChangeRef.current?.(result.nextState.phase);
            }
            setTimerState(result.nextState);
        }

        setElapsedMs(result.elapsedMs);

        result.completedWorkDurations.forEach((duration) => {
            onWorkCompleteRef.current?.(duration);
        });
    }, [timerState]);

    const reconcileNow = useCallback((sourceState?: PersistedTimerState) => {
        const currentState = sourceState ?? timerState;
        const result = reconcileTimerState(currentState, Date.now());
        applyReconcileResult(result);
        return result.nextState;
    }, [applyReconcileResult, timerState]);

    useEffect(() => {
        const saved = loadState();
        if (!saved) return;
        applyReconcileResult(reconcileTimerState(saved, Date.now()));
    }, [applyReconcileResult]);

    useEffect(() => {
        if (timerState.engineState === 'idle') {
            clearState();
            return;
        }

        saveState(timerState);
    }, [timerState]);

    useEffect(() => {
        if (timerState.engineState !== 'running') return;

        const tick = () => {
            reconcileNow();
        };

        tick();
        const intervalId = window.setInterval(tick, 1000);
        return () => window.clearInterval(intervalId);
    }, [timerState.engineState, timerState.runStartedAtMs, timerState.durationMs, reconcileNow]);

    useEffect(() => {
        const handleVisibleRefresh = () => {
            reconcileNow();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                reconcileNow();
                return;
            }

            if (document.visibilityState === 'hidden') {
                const currentState = normaliseRunningState(timerState, Date.now());
                if (!statesMatch(currentState, timerState)) {
                    setTimerState(currentState);
                } else if (currentState.engineState !== 'idle') {
                    saveState(currentState);
                }
            }
        };

        const handlePageHide = () => {
            const currentState = normaliseRunningState(timerState, Date.now());
            if (currentState.engineState !== 'idle') {
                saveState(currentState);
            }
        };

        window.addEventListener('focus', handleVisibleRefresh);
        window.addEventListener('pageshow', handleVisibleRefresh);
        window.addEventListener('pagehide', handlePageHide);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleVisibleRefresh);
            window.removeEventListener('pageshow', handleVisibleRefresh);
            window.removeEventListener('pagehide', handlePageHide);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [reconcileNow, timerState]);

    const start = useCallback(() => {
        const mode = timerState.config.mode;
        const now = Date.now();
        const baseState: PersistedTimerState = {
            version: 2,
            mode,
            engineState: 'running',
            phase: null,
            runStartedAtMs: now,
            accumulatedActiveMs: 0,
            durationMs: 0,
            cycleCount: 0,
            config: timerState.config,
            currentIntervalIndex: 0,
        };

        if (mode === 'countdown') {
            baseState.durationMs = getPhaseDurationMs(mode, null, timerState.config, 0);
        } else if (mode === 'pomodoro') {
            baseState.phase = 'work';
            baseState.durationMs = getPhaseDurationMs(mode, 'work', timerState.config, 0);
            onPhaseChangeRef.current?.('work');
        } else if (mode === 'custom') {
            const intervals = timerState.config.custom?.intervals ?? [];
            if (intervals.length === 0) return;
            const firstPhase: TimerPhase = intervals[0].type === 'work' ? 'work' : 'shortBreak';
            baseState.phase = firstPhase;
            baseState.durationMs = getPhaseDurationMs(mode, firstPhase, timerState.config, 0);
            onPhaseChangeRef.current?.(firstPhase);
        }

        setTimerState(baseState);
        setElapsedMs(0);
    }, [timerState.config]);

    const pause = useCallback(() => {
        if (timerState.engineState !== 'running') return;
        const nextElapsedMs = getElapsedMsAt(timerState, Date.now());
        setTimerState({
            ...timerState,
            engineState: 'paused',
            runStartedAtMs: null,
            accumulatedActiveMs: nextElapsedMs,
        });
        setElapsedMs(nextElapsedMs);
    }, [timerState]);

    const resume = useCallback(() => {
        if (timerState.engineState !== 'paused') return;
        setTimerState({
            ...timerState,
            engineState: 'running',
            runStartedAtMs: Date.now(),
        });
    }, [timerState]);

    const reset = useCallback(() => {
        const config = timerState.config;
        setTimerState(createIdleState(config));
        setElapsedMs(0);
        clearState();
    }, [timerState.config]);

    const skipBreak = useCallback(() => {
        if (timerState.phase !== 'shortBreak' && timerState.phase !== 'longBreak') return;

        if (timerState.mode === 'pomodoro') {
            const phase: TimerPhase = 'work';
            setTimerState({
                ...timerState,
                phase,
                durationMs: getPhaseDurationMs('pomodoro', phase, timerState.config, 0),
                runStartedAtMs: Date.now(),
                accumulatedActiveMs: 0,
            });
            setElapsedMs(0);
            onPhaseChangeRef.current?.(phase);
            return;
        }

        if (timerState.mode === 'custom') {
            const intervals = timerState.config.custom?.intervals ?? [];
            let nextIndex = timerState.currentIntervalIndex + 1;

            while (nextIndex < intervals.length && intervals[nextIndex].type === 'break') {
                nextIndex += 1;
            }

            if (nextIndex >= intervals.length) {
                reset();
                return;
            }

            setTimerState({
                ...timerState,
                phase: 'work',
                currentIntervalIndex: nextIndex,
                durationMs: getPhaseDurationMs('custom', 'work', timerState.config, nextIndex),
                runStartedAtMs: Date.now(),
                accumulatedActiveMs: 0,
            });
            setElapsedMs(0);
            onPhaseChangeRef.current?.('work');
        }
    }, [reset, timerState]);

    const resetCycle = useCallback(() => {
        if (timerState.mode === 'pomodoro') {
            setTimerState({
                ...timerState,
                engineState: 'running',
                phase: 'work',
                cycleCount: 0,
                durationMs: getPhaseDurationMs('pomodoro', 'work', timerState.config, 0),
                runStartedAtMs: Date.now(),
                accumulatedActiveMs: 0,
            });
            setElapsedMs(0);
            onPhaseChangeRef.current?.('work');
            return;
        }

        if (timerState.mode === 'custom') {
            const intervals = timerState.config.custom?.intervals ?? [];
            if (intervals.length === 0) return;
            const firstPhase: TimerPhase = intervals[0].type === 'work' ? 'work' : 'shortBreak';
            setTimerState({
                ...timerState,
                engineState: 'running',
                phase: firstPhase,
                cycleCount: 0,
                currentIntervalIndex: 0,
                durationMs: getPhaseDurationMs('custom', firstPhase, timerState.config, 0),
                runStartedAtMs: Date.now(),
                accumulatedActiveMs: 0,
            });
            setElapsedMs(0);
            onPhaseChangeRef.current?.(firstPhase);
        }
    }, [timerState]);

    const setConfig = useCallback((config: TimerConfig) => {
        setTimerState((prevState) => {
            if (prevState.engineState === 'idle') {
                return createIdleState(config);
            }

            return {
                ...prevState,
                config,
            };
        });
    }, []);

    const savePreset = useCallback((name: string, subject?: string) => {
        const preset: TimerPreset = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name,
            subject,
            config: timerState.config,
        };
        const updated = [...presets, preset];
        setPresets(updated);
        localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
    }, [presets, timerState.config]);

    const loadPreset = useCallback((preset: TimerPreset) => {
        setTimerState((prevState) => prevState.engineState === 'idle'
            ? createIdleState(preset.config)
            : { ...prevState, config: preset.config });
    }, []);

    const deletePreset = useCallback((id: string) => {
        const updated = presets.filter((preset) => preset.id !== id);
        setPresets(updated);
        localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
    }, [presets]);

    const isCountingDown = timerState.mode !== 'stopwatch';
    const remainingMs = isCountingDown ? Math.max(0, timerState.durationMs - elapsedMs) : 0;
    const progress = isCountingDown && timerState.durationMs > 0 ? Math.min(1, elapsedMs / timerState.durationMs) : 0;

    const formatTime = useCallback((ms: number): string => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        mode: timerState.mode,
        engineState: timerState.engineState,
        phase: timerState.phase,
        elapsedMs,
        remainingMs,
        progress,
        durationMs: timerState.durationMs,
        cycleCount: timerState.cycleCount,
        config: timerState.config,
        isCountingDown,
        start,
        pause,
        resume,
        reset,
        skipBreak,
        resetCycle,
        setConfig,
        presets,
        savePreset,
        loadPreset,
        deletePreset,
        formatTime,
    };
}
