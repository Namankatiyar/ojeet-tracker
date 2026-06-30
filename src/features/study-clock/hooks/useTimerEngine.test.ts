import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  reconcileTimerState,
  useTimerEngine,
  DEFAULT_POMODORO,
  type TimerConfig,
} from './useTimerEngine';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('reconcileTimerState', () => {
  it('keeps stopwatch elapsed accurate across sleep or app close', () => {
    const state = {
      version: 2 as const,
      mode: 'stopwatch' as const,
      engineState: 'running' as const,
      phase: null,
      runStartedAtMs: 1_000,
      accumulatedActiveMs: 30_000,
      durationMs: 0,
      cycleCount: 0,
      config: { mode: 'stopwatch' as const },
      currentIntervalIndex: 0,
    };

    const result = reconcileTimerState(state, 91_000);

    expect(result.elapsedMs).toBe(120_000);
    expect(result.nextState.engineState).toBe('running');
  });

  it('completes countdowns that expire while the app is away', () => {
    const config: TimerConfig = {
      mode: 'countdown',
      countdown: { minutes: 25, seconds: 0 },
    };
    const state = {
      version: 2 as const,
      mode: 'countdown' as const,
      engineState: 'running' as const,
      phase: null,
      runStartedAtMs: 10_000,
      accumulatedActiveMs: 0,
      durationMs: 25 * 60 * 1000,
      cycleCount: 0,
      config,
      currentIntervalIndex: 0,
    };

    const result = reconcileTimerState(state, 10_000 + 26 * 60 * 1000);

    expect(result.nextState.engineState).toBe('idle');
    expect(result.elapsedMs).toBe(0);
    expect(result.completedWorkDurations).toEqual([25 * 60 * 1000]);
  });

  it('does not advance paused timers while the device is asleep', () => {
    const state = {
      version: 2 as const,
      mode: 'stopwatch' as const,
      engineState: 'paused' as const,
      phase: null,
      runStartedAtMs: null,
      accumulatedActiveMs: 45_000,
      durationMs: 0,
      cycleCount: 0,
      config: { mode: 'stopwatch' as const },
      currentIntervalIndex: 0,
    };

    const result = reconcileTimerState(state, 5_000_000);

    expect(result.elapsedMs).toBe(45_000);
    expect(result.nextState.engineState).toBe('paused');
  });

  it('clamps negative elapsed time if the system clock moves backward', () => {
    const state = {
      version: 2 as const,
      mode: 'stopwatch' as const,
      engineState: 'running' as const,
      phase: null,
      runStartedAtMs: 100_000,
      accumulatedActiveMs: 5_000,
      durationMs: 0,
      cycleCount: 0,
      config: { mode: 'stopwatch' as const },
      currentIntervalIndex: 0,
    };

    const result = reconcileTimerState(state, 95_000);

    expect(result.elapsedMs).toBe(5_000);
  });

  it('carries pomodoro overflow into the correct break phase', () => {
    const config: TimerConfig = {
      mode: 'pomodoro',
      pomodoro: DEFAULT_POMODORO,
    };
    const workMs = DEFAULT_POMODORO.workMinutes * 60 * 1000;
    const state = {
      version: 2 as const,
      mode: 'pomodoro' as const,
      engineState: 'running' as const,
      phase: 'work' as const,
      runStartedAtMs: 100_000,
      accumulatedActiveMs: 0,
      durationMs: workMs,
      cycleCount: 0,
      config,
      currentIntervalIndex: 0,
    };

    const result = reconcileTimerState(state, 100_000 + workMs + 2 * 60 * 1000);

    expect(result.nextState.phase).toBe('shortBreak');
    expect(result.nextState.cycleCount).toBe(1);
    expect(result.elapsedMs).toBe(2 * 60 * 1000);
    expect(result.completedWorkDurations).toEqual([workMs]);
  });

  it('advances through multiple custom intervals after a long sleep', () => {
    const config: TimerConfig = {
      mode: 'custom',
      custom: {
        intervals: [
          { type: 'work', durationMinutes: 20 },
          { type: 'break', durationMinutes: 5 },
          { type: 'work', durationMinutes: 10 },
        ],
        repeat: false,
      },
    };
    const state = {
      version: 2 as const,
      mode: 'custom' as const,
      engineState: 'running' as const,
      phase: 'work' as const,
      runStartedAtMs: 50_000,
      accumulatedActiveMs: 0,
      durationMs: 20 * 60 * 1000,
      cycleCount: 0,
      config,
      currentIntervalIndex: 0,
    };

    const result = reconcileTimerState(state, 50_000 + 28 * 60 * 1000);

    expect(result.nextState.phase).toBe('work');
    expect(result.nextState.currentIntervalIndex).toBe(2);
    expect(result.elapsedMs).toBe(3 * 60 * 1000);
    expect(result.completedWorkDurations).toEqual([20 * 60 * 1000]);
  });
});

describe('useTimerEngine syncNow', () => {
  it('reconciles elapsed time after long inactivity and persists a snapshot', () => {
    vi.useFakeTimers();
    const startMs = 1_000_000;
    vi.setSystemTime(startMs);

    const { result } = renderHook(() => useTimerEngine());

    act(() => {
      result.current.start();
    });

    const laterMs = startMs + 2 * 60 * 1000;
    vi.setSystemTime(laterMs);

    let elapsed = 0;
    act(() => {
      elapsed = result.current.syncNow();
    });

    expect(elapsed).toBe(2 * 60 * 1000);
    expect(result.current.elapsedMs).toBe(2 * 60 * 1000);

    const savedRaw = localStorage.getItem('jee-timer-engine');
    expect(savedRaw).not.toBeNull();
    const saved = JSON.parse(savedRaw ?? '{}');
    expect(saved.accumulatedActiveMs).toBe(2 * 60 * 1000);
    expect(saved.runStartedAtMs).toBe(laterMs);
  });
});
