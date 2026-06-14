import { useState } from 'react';
import { Plus, Trash2, X, Pencil } from 'lucide-react';
import { MockExamPreset } from '../../../shared/types';
import { useUserProgress } from '../../../core/context/UserProgressContext';

interface ManageMockPresetsModalProps {
    onClose: () => void;
}

export function ManageMockPresetsModal({ onClose }: ManageMockPresetsModalProps) {
    const { mockExamPresets, handleAddMockExamPreset, handleDeleteMockExamPreset, handleUpdateMockExamPreset } = useUserProgress();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<MockExamPreset>>({});

    const handleStartEdit = (preset: MockExamPreset) => {
        setEditingId(preset.id);
        setEditForm({ ...preset });
    };

    const handleStartAdd = () => {
        setEditingId('new');
        setEditForm({
            id: 'custom-' + Date.now().toString(36),
            name: '',
            shortName: '',
            paperCount: 1,
            subjectMaxMarks: { physics: 100, chemistry: 100, maths: 100 },
            enabledSubjects: { physics: true, chemistry: true, maths: true }
        });
    };

    const handleSave = () => {
        if (!editForm.name?.trim() || !editForm.shortName?.trim() || !editForm.subjectMaxMarks) return;

        const preset = editForm as MockExamPreset;

        if (editingId === 'new') {
            handleAddMockExamPreset(preset);
        } else {
            handleUpdateMockExamPreset(preset);
        }
        setEditingId(null);
    };

    const updateSubjectMax = (subject: 'physics' | 'chemistry' | 'maths', value: number) => {
        const clamped = Math.max(1, isNaN(value) ? 1 : value);
        setEditForm(prev => ({
            ...prev,
            subjectMaxMarks: {
                ...prev.subjectMaxMarks!,
                [subject]: clamped
            }
        }));
    };

    const toggleSubject = (subject: 'physics' | 'chemistry' | 'maths') => {
        setEditForm(prev => {
            const currentEnabled = prev.enabledSubjects || { physics: true, chemistry: true, maths: true };
            return {
                ...prev,
                enabledSubjects: {
                    ...currentEnabled,
                    [subject]: !currentEnabled[subject]
                }
            };
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="add-mock-modal mock-preset-manager-modal" onClick={e => e.stopPropagation()}>
                <div className="mock-preset-manager-header">
                    <h3>Manage Exam Presets</h3>
                    <button className="mock-preset-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {editingId ? (
                    <div className="mock-preset-editor">
                        <h4 className="mock-preset-editor-title">
                            {editingId === 'new' ? 'Create New Preset' : 'Edit Preset'}
                        </h4>

                        <div className="form-group">
                            <label>Exam Name</label>
                            <input
                                type="text"
                                placeholder="e.g., BITSAT, WBJEE, MHT CET"
                                value={editForm.name || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div className="mock-preset-editor-row">
                            <div className="form-group mock-preset-editor-field">
                                <label>Short Name</label>
                                <input
                                    type="text"
                                    maxLength={4}
                                    placeholder="e.g., BT"
                                    value={editForm.shortName || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, shortName: e.target.value.toUpperCase() }))}
                                />
                            </div>
                            <div className="form-group mock-preset-editor-field">
                                <label>Paper Count</label>
                                <select
                                    className="mock-preset-select"
                                    value={editForm.paperCount}
                                    onChange={e => setEditForm(prev => ({ ...prev, paperCount: Number(e.target.value) as 1 | 2 }))}
                                >
                                    <option value={1}>1 Paper</option>
                                    <option value={2}>2 Papers</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Max Marks Per Subject (per paper)</label>
                            <div className="marks-grid">
                                {(['physics', 'chemistry', 'maths'] as const).map(subject => {
                                    const isEnabled = editForm.enabledSubjects?.[subject] ?? true;
                                    return (
                                        <div className="form-group" key={subject}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <label className="checkbox-container" style={{ margin: 0 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isEnabled}
                                                        onChange={() => toggleSubject(subject)}
                                                    />
                                                    <span className="checkmark"></span>
                                                </label>
                                                <span className={`text-${subject}`} style={{ marginBottom: 0, cursor: 'pointer', userSelect: 'none', fontWeight: 600, fontSize: 'var(--text-sm)' }} onClick={() => toggleSubject(subject)}>
                                                    {subject.charAt(0).toUpperCase() + subject.slice(1)}
                                                </span>
                                            </div>
                                            <input
                                                type="number" min={1}
                                                value={editForm.subjectMaxMarks?.[subject] || 0}
                                                onChange={e => updateSubjectMax(subject, Number(e.target.value))}
                                                disabled={!isEnabled}
                                                style={{ opacity: isEnabled ? 1 : 0.5 }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                            <button
                                className="save-btn"
                                onClick={handleSave}
                                disabled={!editForm.name?.trim() || !editForm.shortName?.trim()}
                            >
                                {editingId === 'new' ? 'Create Preset' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mock-preset-list">
                            {mockExamPresets.map(preset => (
                                <div key={preset.id} className="mock-preset-item">
                                    <div className="mock-preset-item-info">
                                        <span className="mock-preset-item-name">
                                            {preset.name}
                                            <span className="mock-preset-item-short">{preset.shortName}</span>
                                        </span>
                                        <span className="mock-preset-item-meta">
                                            {preset.paperCount} {preset.paperCount === 1 ? 'Paper' : 'Papers'}
                                            {(preset.enabledSubjects?.physics ?? true) && <span className="text-physics"> · P:{preset.subjectMaxMarks.physics}</span>}
                                            {(preset.enabledSubjects?.chemistry ?? true) && <span className="text-chemistry"> · C:{preset.subjectMaxMarks.chemistry}</span>}
                                            {(preset.enabledSubjects?.maths ?? true) && <span className="text-maths"> · M:{preset.subjectMaxMarks.maths}</span>}
                                        </span>
                                    </div>
                                    <div className="mock-preset-item-actions">
                                        <button className="mock-preset-action-btn mock-preset-edit-btn" onClick={() => handleStartEdit(preset)}>
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="mock-preset-action-btn mock-preset-delete-btn"
                                            onClick={() => handleDeleteMockExamPreset(preset.id)}
                                            disabled={mockExamPresets.length <= 1}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mock-preset-add-btn" onClick={handleStartAdd}>
                            <Plus size={16} />
                            Add Custom Preset
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
