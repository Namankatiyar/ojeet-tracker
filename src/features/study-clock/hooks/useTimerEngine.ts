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
    completedWorkAtMs: number[];
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
        const nextState: PersistedTimerState = {
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
        if (nextState.engineState === 'running' && nextState.runStartedAtMs === null) {
            nextState.engineState = 'paused';
        }
        return nextState;
    }

    if (!candidate.mode || !candidate.engineState || !candidate.config) return null;
    const nextState: PersistedTimerState = {
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
    if (nextState.engineState === 'running' && nextState.runStartedAtMs === null) {
        nextState.engineState = 'paused';
    }
    return nextState;
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
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('jee-timer-state-change'));
    }
}

function clearState() {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('jee-timer-state-change'));
    }
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
    if (state.engineState === 'running' && state.runStartedAtMs === null) {
        const nextState = { ...state, engineState: 'paused' as const };
        return {
            nextState,
            elapsedMs: nextState.accumulatedActiveMs,
            completedWorkDurations: [],
            completedWorkAtMs: [],
        };
    }

    if (state.engineState !== 'running' || state.runStartedAtMs === null) {
        return {
            nextState: state,
            elapsedMs: state.accumulatedActiveMs,
            completedWorkDurations: [],
            completedWorkAtMs: [],
        };
    }

    if (state.mode !== 'stopwatch' && state.durationMs <= 0) {
        if (state.mode === 'countdown') {
            const nextState = buildCountdownCompletionState(state);
            return {
                nextState,
                elapsedMs: 0,
                completedWorkDurations: [],
                completedWorkAtMs: [],
            };
        }

        if (state.mode === 'pomodoro') {
            const phase = state.phase ?? 'work';
            const durationMs = getPhaseDurationMs('pomodoro', phase, state.config, 0);
            if (durationMs > 0) {
                const nextState = { ...state, phase, durationMs };
                return {
                    nextState,
                    elapsedMs: getElapsedMsAt(nextState, now),
                    completedWorkDurations: [],
                    completedWorkAtMs: [],
                };
            }

            const nextState = createIdleState(state.config);
            return {
                nextState,
                elapsedMs: 0,
                completedWorkDurations: [],
                completedWorkAtMs: [],
            };
        }

        if (state.mode === 'custom') {
            const intervals = state.config.custom?.intervals ?? [];
            if (intervals.length === 0) {
                const nextState = createIdleState(state.config);
                return {
                    nextState,
                    elapsedMs: 0,
                    completedWorkDurations: [],
                    completedWorkAtMs: [],
                };
            }

            let nextIndex = Math.max(0, state.currentIntervalIndex);
            let nextPhase: TimerPhase = intervals[nextIndex].type === 'work' ? 'work' : 'shortBreak';
            let durationMs = getPhaseDurationMs('custom', nextPhase, state.config, nextIndex);

            while (durationMs <= 0 && nextIndex < intervals.length - 1) {
                nextIndex += 1;
                nextPhase = intervals[nextIndex].type === 'work' ? 'work' : 'shortBreak';
                durationMs = getPhaseDurationMs('custom', nextPhase, state.config, nextIndex);
            }

            if (durationMs <= 0) {
                const nextState = createIdleState(state.config);
                return {
                    nextState,
                    elapsedMs: 0,
                    completedWorkDurations: [],
                    completedWorkAtMs: [],
                };
            }

            const nextState = {
                ...state,
                phase: nextPhase,
                currentIntervalIndex: nextIndex,
                durationMs,
            };
            return {
                nextState,
                elapsedMs: getElapsedMsAt(nextState, now),
                completedWorkDurations: [],
                completedWorkAtMs: [],
            };
        }
    }

    if (state.mode === 'stopwatch') {
        return {
            nextState: state,
            elapsedMs: getElapsedMsAt(state, now),
            completedWorkDurations: [],
            completedWorkAtMs: [],
        };
    }

    let nextState = state;
    let elapsedMs = getElapsedMsAt(nextState, now);
    const completedWorkDurations: number[] = [];
    const completedWorkAtMs: number[] = [];

    while (nextState.engineState === 'running' && nextState.durationMs > 0 && elapsedMs >= nextState.durationMs) {
        const overflowMs = elapsedMs - nextState.durationMs;
        if (nextState.phase === 'work' || nextState.phase === null) {
            completedWorkDurations.push(nextState.durationMs);
            completedWorkAtMs.push(Math.max(0, now - overflowMs));
        }
        nextState = buildNextPhaseState(nextState, overflowMs, now);
        elapsedMs = getElapsedMsAt(nextState, now);
    }

    return {
        nextState,
        elapsedMs,
        completedWorkDurations,
        completedWorkAtMs,
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
    onWorkComplete?: (durationMs: number, completedAtMs?: number) => void;
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
    syncNow: () => number;
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
    const timerStateRef = useRef(timerState);
    timerStateRef.current = timerState;
    const [elapsedMs, setElapsedMs] = useState(0);
    const [presets, setPresets] = useState<TimerPreset[]>(() => {
        try {
            const raw = localStorage.getItem(PRESETS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const setTimerStateImmediate = useCallback((nextState: PersistedTimerState) => {
        timerStateRef.current = nextState;
        setTimerState(nextState);
    }, []);

    const persistSnapshot = useCallback((state: PersistedTimerState, now: number) => {
        if (state.engineState === 'idle') {
            clearState();
            return;
        }

        const snapshot = normaliseRunningState(state, now);
        saveState(snapshot);
    }, []);

    const applyReconcileResult = useCallback((result: ReconcileResult) => {
        const currentState = timerStateRef.current;
        if (!statesMatch(result.nextState, currentState)) {
            if (result.nextState.phase !== currentState.phase) {
                onPhaseChangeRef.current?.(result.nextState.phase);
            }
            setTimerStateImmediate(result.nextState);
        }

        setElapsedMs(result.elapsedMs);

        result.completedWorkDurations.forEach((duration, index) => {
            const completedAtMs = result.completedWorkAtMs[index];
            onWorkCompleteRef.current?.(duration, completedAtMs);
        });
    }, [setTimerStateImmediate]);

    const reconcileNow = useCallback((sourceState?: PersistedTimerState, nowOverride?: number) => {
        const currentState = sourceState ?? timerStateRef.current;
        const now = nowOverride ?? Date.now();
        const result = reconcileTimerState(currentState, now);
        applyReconcileResult(result);
        persistSnapshot(result.nextState, now);
        return result.nextState;
    }, [applyReconcileResult, persistSnapshot]);

    const syncNow = useCallback(() => {
        const now = Date.now();
        const currentState = timerStateRef.current;
        const result = reconcileTimerState(currentState, now);
        applyReconcileResult(result);
        persistSnapshot(result.nextState, now);
        return result.elapsedMs;
    }, [applyReconcileResult, persistSnapshot]);

    useEffect(() => {
        const saved = loadState();
        if (!saved) return;
        reconcileNow(saved, Date.now());
    }, [reconcileNow]);

    useEffect(() => {
        persistSnapshot(timerState, Date.now());
    }, [persistSnapshot, timerState]);

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
                const now = Date.now();
                const currentState = normaliseRunningState(timerStateRef.current, now);
                if (!statesMatch(currentState, timerStateRef.current)) {
                    setTimerStateImmediate(currentState);
                }
                persistSnapshot(currentState, now);
            }
        };

        const handlePageHide = () => {
            const now = Date.now();
            const currentState = normaliseRunningState(timerStateRef.current, now);
            persistSnapshot(currentState, now);
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
    }, [persistSnapshot, reconcileNow, setTimerStateImmediate]);

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

        setTimerStateImmediate(baseState);
        setElapsedMs(0);
    }, [setTimerStateImmediate, timerState.config]);

    const pause = useCallback(() => {
        if (timerState.engineState !== 'running') return;
        const nextElapsedMs = getElapsedMsAt(timerState, Date.now());
        setTimerStateImmediate({
            ...timerState,
            engineState: 'paused',
            runStartedAtMs: null,
            accumulatedActiveMs: nextElapsedMs,
        });
        setElapsedMs(nextElapsedMs);
    }, [setTimerStateImmediate, timerState]);

    const resume = useCallback(() => {
        if (timerState.engineState !== 'paused') return;
        setTimerStateImmediate({
            ...timerState,
            engineState: 'running',
            runStartedAtMs: Date.now(),
        });
    }, [setTimerStateImmediate, timerState]);

    const reset = useCallback(() => {
        const config = timerState.config;
        setTimerStateImmediate(createIdleState(config));
        setElapsedMs(0);
        clearState();
    }, [setTimerStateImmediate, timerState.config]);

    const skipBreak = useCallback(() => {
        if (timerState.phase !== 'shortBreak' && timerState.phase !== 'longBreak') return;

        if (timerState.mode === 'pomodoro') {
            const phase: TimerPhase = 'work';
            setTimerStateImmediate({
                ...timerState,
                engineState: 'running',
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

            setTimerStateImmediate({
                ...timerState,
                engineState: 'running',
                phase: 'work',
                currentIntervalIndex: nextIndex,
                durationMs: getPhaseDurationMs('custom', 'work', timerState.config, nextIndex),
                runStartedAtMs: Date.now(),
                accumulatedActiveMs: 0,
            });
            setElapsedMs(0);
            onPhaseChangeRef.current?.('work');
        }
    }, [reset, setTimerStateImmediate, timerState]);

    const resetCycle = useCallback(() => {
        if (timerState.mode === 'pomodoro') {
            setTimerStateImmediate({
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
            setTimerStateImmediate({
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
    }, [setTimerStateImmediate, timerState]);

    const setConfig = useCallback((config: TimerConfig) => {
        setTimerState((prevState) => {
            if (prevState.engineState === 'idle') {
                const nextState = createIdleState(config);
                timerStateRef.current = nextState;
                return nextState;
            }

            if (prevState.mode !== config.mode) {
                const nextState = createIdleState(config);
                timerStateRef.current = nextState;
                return nextState;
            }

            const nextState = {
                ...prevState,
                mode: config.mode,
                config,
            };
            timerStateRef.current = nextState;
            return nextState;
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
        setTimerState((prevState) => {
            const nextState = prevState.engineState === 'idle'
                ? createIdleState(preset.config)
                : { ...prevState, config: preset.config };
            timerStateRef.current = nextState;
            return nextState;
        });
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
        syncNow,
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
