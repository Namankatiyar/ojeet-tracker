import React from 'react';
import { Subject, SubjectData } from '../../../shared/types';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { Atom, FlaskConical, Pi, Plus, Pencil, Check } from 'lucide-react';

const subjectConfig: Record<Subject, { label: string; icon: React.ReactNode; color: string }> = {
    physics: { label: 'Physics', icon: <Atom size={32} />, color: '#6366f1' },
    chemistry: { label: 'Chemistry', icon: <FlaskConical size={32} />, color: '#10b981' },
    maths: { label: 'Maths', icon: <Pi size={32} />, color: '#f59e0b' },
};

interface SubjectHeaderProps {
    subject: Subject;
    data: SubjectData;
    subjectProgress: number;
    isEditing: boolean;
    onToggleEditing: () => void;
    canEdit: boolean;
    canAddMaterial: boolean;
    onAddMaterial: () => void;
}

export function SubjectHeader({
    subject,
    data,
    subjectProgress,
    isEditing,
    onToggleEditing,
    canEdit,
    canAddMaterial,
    onAddMaterial
}: SubjectHeaderProps) {
    const config = subjectConfig[subject];

    return (
        <div className="subject-header">
            <div className="subject-title">
                <span className="subject-icon-large">{config.icon}</span>
                <div>
                    <div className="subject-title-row">
                        <h1>{config.label}</h1>
                        {canEdit && (
                            <button
                                onClick={onToggleEditing}
                                className={`edit-toggle-btn ${isEditing ? 'editing' : ''}`}
                                title={isEditing ? "Done Editing" : "Edit Chapters"}
                            >
                                {isEditing ? <Check size={14} /> : <Pencil size={14} />}
                                <span className="edit-toggle-text">
                                    {isEditing ? 'Done' : 'Edit'}
                                </span>
                            </button>
                        )}
                    </div>
                    <p>
                        {data.chapters.length} Chapters • {data.materialNames.length} Study Material(s)
                        {canAddMaterial && !isEditing && (
                            <button
                                className="add-material-btn"
                                onClick={onAddMaterial}
                                title="Add new study material column"
                            >
                                <Plus size={16} style={{ marginRight: '4px' }} />
                                Add Material
                            </button>
                        )}
                    </p>
                </div>
            </div>
            <div className="subject-header-actions">
                <div className="subject-progress-summary">
                    <ProgressBar progress={subjectProgress} height={12} />
                </div>
            </div>
        </div>
    );
}
