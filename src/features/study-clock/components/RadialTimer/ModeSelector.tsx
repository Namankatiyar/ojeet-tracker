import { Timer, Clock, Repeat, Sliders, Plus, Trash2, ChevronUp, ChevronDown, CheckSquare, Square } from 'lucide-react';
import {
    TimerConfig, TimerMode, CountdownConfig, PomodoroConfig,
    CustomInterval, CustomConfig, DEFAULT_POMODORO
} from '../../hooks/useTimerEngine';
import { CustomSelect } from '../../../../shared/components/ui/CustomSelect';

// ── Custom UI Components to replace native styling ──

function CustomNumberInput({ value, onChange, min = 0, max = 999, suffix }: { value: number, onChange: (val: number) => void, min?: number, max?: number, suffix?: string }) {
    const handleUp = () => onChange(Math.min(max, value + 1));
    const handleDown = () => onChange(Math.max(min, value - 1));
    return (
        <div className="custom-number-input">
            <input
                type="text"
                value={value}
                onChange={e => {
                    const val = e.target.value;
                    if (val === '') onChange(min);
                    const parsed = parseInt(val);
                    if (!isNaN(parsed)) onChange(Math.max(min, Math.min(max, parsed)));
                }}
            />
            {suffix && <span className="custom-number-suffix">{suffix}</span>}
            <div className="custom-number-arrows">
                <button type="button" onClick={handleUp}><ChevronUp size={12} /></button>
                <button type="button" onClick={handleDown}><ChevronDown size={12} /></button>
            </div>
        </div>
    );
}

function CustomCheckbox({ checked, onChange, label }: { checked: boolean, onChange: (c: boolean) => void, label: string }) {
    return (
        <div className="custom-checkbox" onClick={() => onChange(!checked)}>
            {checked ? <CheckSquare size={16} className="checkbox-icon checked" /> : <Square size={16} className="checkbox-icon" />}
            <span>{label}</span>
        </div>
    );
}

// ── Main Component ──

interface ModeSelectorProps {
    config: TimerConfig;
    onConfigChange: (config: TimerConfig) => void;
    disabled: boolean;
}

export function ModeSelector({ config, onConfigChange, disabled }: ModeSelectorProps) {
    const currentMode = config.mode;

    const setMode = (mode: TimerMode) => {
        if (disabled) return;
        const newConfig: TimerConfig = { ...config, mode };

        // Initialize defaults for the selected mode if not present
        if (mode === 'countdown' && !newConfig.countdown) {
            newConfig.countdown = { minutes: 25, seconds: 0 };
        }
        if (mode === 'pomodoro' && !newConfig.pomodoro) {
            newConfig.pomodoro = { ...DEFAULT_POMODORO };
        }
        if (mode === 'custom' && !newConfig.custom) {
            newConfig.custom = {
                intervals: [
                    { type: 'work', durationMinutes: 25 },
                    { type: 'break', durationMinutes: 5 },
                ],
                repeat: false,
            };
        }

        onConfigChange(newConfig);
    };

    const updateCountdown = (updates: Partial<CountdownConfig>) => {
        onConfigChange({
            ...config,
            countdown: { ...(config.countdown ?? { minutes: 25, seconds: 0 }), ...updates },
        });
    };

    const updatePomodoro = (updates: Partial<PomodoroConfig>) => {
        onConfigChange({
            ...config,
            pomodoro: { ...(config.pomodoro ?? DEFAULT_POMODORO), ...updates },
        });
    };

    const updateCustom = (updates: Partial<CustomConfig>) => {
        const current = config.custom ?? { intervals: [], repeat: false };
        onConfigChange({
            ...config,
            custom: { ...current, ...updates },
        });
    };

    const addCustomInterval = () => {
        const intervals = [...(config.custom?.intervals ?? [])];
        const lastType = intervals.length > 0 ? intervals[intervals.length - 1].type : 'break';
        intervals.push({ type: lastType === 'work' ? 'break' : 'work', durationMinutes: lastType === 'work' ? 5 : 25 });
        updateCustom({ intervals });
    };

    const removeCustomInterval = (index: number) => {
        const intervals = [...(config.custom?.intervals ?? [])];
        intervals.splice(index, 1);
        updateCustom({ intervals });
    };

    const updateCustomInterval = (index: number, updates: Partial<CustomInterval>) => {
        const intervals = [...(config.custom?.intervals ?? [])];
        intervals[index] = { ...intervals[index], ...updates };
        updateCustom({ intervals });
    };

    const modes: { key: TimerMode; label: string; icon: React.ReactNode }[] = [
        { key: 'stopwatch', label: 'Stopwatch', icon: <Clock size={18} /> },
        { key: 'countdown', label: 'Countdown', icon: <Timer size={18} /> },
        { key: 'pomodoro', label: 'Pomodoro', icon: <Repeat size={18} /> },
        { key: 'custom', label: 'Custom', icon: <Sliders size={18} /> },
    ];

    const typeOptions = [
        { value: 'work', label: 'Work' },
        { value: 'break', label: 'Break' }
    ];

    return (
        <div className="mode-selector-wrapper">
            <div className="mode-selector">
                {modes.map(m => (
                    <button
                        key={m.key}
                        className={`mode-tab ${currentMode === m.key ? 'active' : ''}`}
                        onClick={() => setMode(m.key)}
                        disabled={disabled}
                    >
                        {m.icon}
                        <span>{m.label}</span>
                    </button>
                ))}
            </div>

            {/* Mode-specific config panels */}
            {!disabled && currentMode === 'countdown' && (
                <div className="mode-config countdown-setup">
                    <div className="config-row">
                        <label>Minutes</label>
                        <CustomNumberInput
                            value={config.countdown?.minutes ?? 25}
                            onChange={val => updateCountdown({ minutes: val })}
                            min={0} max={999}
                        />
                    </div>
                    <div className="config-row">
                        <label>Seconds</label>
                        <CustomNumberInput
                            value={config.countdown?.seconds ?? 0}
                            onChange={val => updateCountdown({ seconds: val })}
                            min={0} max={59}
                        />
                    </div>
                </div>
            )}

            {!disabled && currentMode === 'pomodoro' && (
                <div className="mode-config pomodoro-config">
                    <div className="config-row">
                        <label>Work</label>
                        <CustomNumberInput
                            value={config.pomodoro?.workMinutes ?? 25}
                            onChange={val => updatePomodoro({ workMinutes: val })}
                            min={1} max={120} suffix="min"
                        />
                    </div>
                    <div className="config-row">
                        <label>Short Break</label>
                        <CustomNumberInput
                            value={config.pomodoro?.shortBreakMinutes ?? 5}
                            onChange={val => updatePomodoro({ shortBreakMinutes: val })}
                            min={1} max={60} suffix="min"
                        />
                    </div>
                    <div className="config-row">
                        <label>Long Break</label>
                        <CustomNumberInput
                            value={config.pomodoro?.longBreakMinutes ?? 15}
                            onChange={val => updatePomodoro({ longBreakMinutes: val })}
                            min={1} max={60} suffix="min"
                        />
                    </div>
                    <div className="config-row">
                        <label>Cycles before long break</label>
                        <CustomNumberInput
                            value={config.pomodoro?.cyclesBeforeLongBreak ?? 4}
                            onChange={val => updatePomodoro({ cyclesBeforeLongBreak: val })}
                            min={1} max={10}
                        />
                    </div>
                </div>
            )}

            {!disabled && currentMode === 'custom' && (
                <div className="mode-config custom-interval-builder">
                    <div className="custom-intervals-list">
                        {(config.custom?.intervals ?? []).map((interval, idx) => (
                            <div key={idx} className="custom-interval-row">
                                <div style={{ width: '100px' }}>
                                    <CustomSelect
                                        value={interval.type}
                                        onChange={val => updateCustomInterval(idx, { type: val as 'work' | 'break' })}
                                        options={typeOptions}
                                        size="small"
                                    />
                                </div>
                                <CustomNumberInput
                                    value={interval.durationMinutes}
                                    onChange={val => updateCustomInterval(idx, { durationMinutes: val })}
                                    min={1} max={999} suffix="min"
                                />
                                <button
                                    className="interval-remove-btn"
                                    onClick={() => removeCustomInterval(idx)}
                                    title="Remove interval"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button className="add-interval-btn" onClick={addCustomInterval}>
                        <Plus size={16} /> Add Interval
                    </button>

                    <CustomCheckbox
                        checked={config.custom?.repeat ?? false}
                        onChange={val => updateCustom({ repeat: val })}
                        label="Repeat cycle"
                    />
                </div>
            )}
        </div>
    );
}
