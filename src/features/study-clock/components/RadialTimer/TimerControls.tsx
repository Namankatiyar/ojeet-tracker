import { Play, Pause, Trash2, CheckCircle2, SkipForward, RotateCcw } from 'lucide-react';
import { EngineState, TimerPhase, TimerMode } from '../../hooks/useTimerEngine';

interface TimerControlsProps {
    engineState: EngineState;
    phase: TimerPhase;
    mode: TimerMode;
    canMarkComplete: boolean;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onEnd: () => void;
    onDiscard: () => void;
    onMarkComplete: () => void;
    onSkipBreak: () => void;
    onResetCycle: () => void;
}

export function TimerControls({
    engineState,
    phase,
    mode,
    canMarkComplete,
    onStart,
    onPause,
    onResume,
    onEnd,
    onDiscard,
    onMarkComplete,
    onSkipBreak,
    onResetCycle,
}: TimerControlsProps) {
    const isBreak = phase === 'shortBreak' || phase === 'longBreak';
    const showSkipBreak = isBreak && (mode === 'pomodoro' || mode === 'custom');
    const showResetCycle = (mode === 'pomodoro' || mode === 'custom') && engineState !== 'idle';

    return (
        <div className="timer-controls">
            {engineState === 'idle' && (
                <button className="timer-btn start" onClick={onStart} title="Start (Space)">
                    <Play size={18} />
                </button>
            )}

            {engineState === 'running' && (
                <>
                    <button className="timer-btn pause" onClick={onPause} title="Pause (Space)">
                        <Pause size={18} />
                    </button>
                    {showSkipBreak && (
                        <button className="timer-btn skip-break" onClick={onSkipBreak} title="Skip Break">
                            <SkipForward size={18} />
                        </button>
                    )}
                    <button className="timer-btn end" onClick={onEnd} title="End Session">
                        <CheckCircle2 size={18} />
                    </button>
                </>
            )}

            {engineState === 'paused' && (
                <>
                    <button className="timer-btn resume" onClick={onResume} title="Resume (Space)">
                        <Play size={18} />
                    </button>
                    {canMarkComplete ? (
                        <button className="timer-btn mark-complete" onClick={onMarkComplete} title="Save Session & Mark Task Complete">
                            <CheckCircle2 size={18} />
                        </button>
                    ) : (
                        <button className="timer-btn end" onClick={onEnd} title="Save & End Session">
                            <CheckCircle2 size={18} />
                        </button>
                    )}
                    <button className="timer-btn discard" onClick={onDiscard} title="Discard Session">
                        <Trash2 size={18} />
                    </button>
                </>
            )}

            {showResetCycle && (
                <button className="timer-btn reset-cycle" onClick={onResetCycle} title="Reset Cycle">
                    <RotateCcw size={16} />
                </button>
            )}
        </div>
    );
}
