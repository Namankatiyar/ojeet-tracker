import { useState } from 'react';
import { Save, Trash2, Upload, X } from 'lucide-react';
import { TimerPreset, TimerConfig } from '../../hooks/useTimerEngine';

interface PresetManagerProps {
    presets: TimerPreset[];
    onSavePreset: (name: string, subject?: string) => void;
    onLoadPreset: (preset: TimerPreset) => void;
    onDeletePreset: (id: string) => void;
    disabled: boolean;
}

export function PresetManager({
    presets,
    onSavePreset,
    onLoadPreset,
    onDeletePreset,
    disabled,
}: PresetManagerProps) {
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [presetName, setPresetName] = useState('');

    const handleSave = () => {
        if (!presetName.trim()) return;
        onSavePreset(presetName.trim());
        setPresetName('');
        setShowSaveForm(false);
    };

    const getModeLabel = (config: TimerConfig): string => {
        switch (config.mode) {
            case 'countdown': {
                const mins = config.countdown?.minutes ?? 0;
                const secs = config.countdown?.seconds ?? 0;
                return `Countdown ${mins}:${secs.toString().padStart(2, '0')}`;
            }
            case 'pomodoro': {
                const work = config.pomodoro?.workMinutes ?? 25;
                const brk = config.pomodoro?.shortBreakMinutes ?? 5;
                return `Pomodoro ${work}/${brk}`;
            }
            case 'custom':
                return `Custom (${config.custom?.intervals?.length ?? 0} intervals)`;
            default:
                return 'Stopwatch';
        }
    };

    return (
        <div className="preset-panel">
            <div className="preset-header">
                <h4>Presets</h4>
                {!disabled && (
                    <button
                        className="preset-save-toggle"
                        onClick={() => setShowSaveForm(!showSaveForm)}
                        title={showSaveForm ? 'Cancel' : 'Save current config as preset'}
                    >
                        {showSaveForm ? <X size={14} /> : <Save size={14} />}
                    </button>
                )}
            </div>

            {showSaveForm && !disabled && (
                <div className="preset-save-form">
                    <input
                        type="text"
                        placeholder="Preset name..."
                        value={presetName}
                        onChange={e => setPresetName(e.target.value)}
                        className="preset-name-input"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                    />
                    <button
                        className="preset-save-btn"
                        onClick={handleSave}
                        disabled={!presetName.trim()}
                    >
                        Save
                    </button>
                </div>
            )}

            {presets.length === 0 ? (
                <div className="preset-empty">No saved presets</div>
            ) : (
                <div className="preset-list">
                    {presets.map(preset => (
                        <div key={preset.id} className="preset-item">
                            <button
                                className="preset-load-btn"
                                onClick={() => onLoadPreset(preset)}
                                disabled={disabled}
                                title="Load preset"
                            >
                                <Upload size={12} />
                                <div className="preset-info">
                                    <span className="preset-name">{preset.name}</span>
                                    <span className="preset-mode">{getModeLabel(preset.config)}</span>
                                </div>
                            </button>
                            <button
                                className="preset-delete-btn"
                                onClick={() => onDeletePreset(preset.id)}
                                title="Delete preset"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
