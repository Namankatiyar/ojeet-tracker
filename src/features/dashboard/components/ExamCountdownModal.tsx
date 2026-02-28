import { useState } from 'react';
import { Calendar, Star, Trash2, Plus, X, Pencil } from 'lucide-react';
import { ExamEntry } from '../../../shared/types';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';

interface ExamCountdownModalProps {
    examDates: ExamEntry[];
    onAddExam: (exam: Omit<ExamEntry, 'id'>) => void;
    onDeleteExam: (id: string) => void;
    onUpdateExam: (exam: ExamEntry) => void;
    onSetPrimaryExam: (id: string) => void;
    onClose: () => void;
}

export function ExamCountdownModal({
    examDates,
    onAddExam,
    onDeleteExam,
    onUpdateExam,
    onSetPrimaryExam,
    onClose
}: ExamCountdownModalProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newDate, setNewDate] = useState('');
    const [editName, setEditName] = useState('');
    const [editDate, setEditDate] = useState('');
    const [datePickerTarget, setDatePickerTarget] = useState<'new' | string | null>(null);

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return 'Select Date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const calculateDays = (dateString: string) => {
        if (!dateString) return null;
        const target = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diffTime = target.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const handleAdd = () => {
        if (!newName.trim() || !newDate) return;
        onAddExam({
            name: newName.trim(),
            date: newDate,
            isPrimary: examDates.length === 0
        });
        setNewName('');
        setNewDate('');
        setIsAdding(false);
    };

    const handleStartEdit = (exam: ExamEntry) => {
        setEditingId(exam.id);
        setEditName(exam.name);
        setEditDate(exam.date);
    };

    const handleSaveEdit = (exam: ExamEntry) => {
        if (!editName.trim() || !editDate) return;
        onUpdateExam({ ...exam, name: editName.trim(), date: editDate });
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleDateSelect = (date: string) => {
        if (datePickerTarget === 'new') {
            setNewDate(date);
        } else if (datePickerTarget) {
            setEditDate(date);
        }
        setDatePickerTarget(null);
    };

    // Sort: primary first, then by date ascending
    const sortedExams = [...examDates].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="exam-modal" onClick={e => e.stopPropagation()}>
                    <div className="exam-modal-header">
                        <h3>Manage Exams</h3>
                        <button className="close-btn" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="exam-modal-body">
                        {sortedExams.length === 0 && !isAdding && (
                            <div className="exam-empty-state">
                                <Calendar size={32} />
                                <p>No exams added yet</p>
                                <p className="exam-empty-hint">Add your first exam to start the countdown!</p>
                            </div>
                        )}

                        <div className="exam-list">
                            {sortedExams.map(exam => {
                                const days = calculateDays(exam.date);
                                const isEditing = editingId === exam.id;

                                return (
                                    <div key={exam.id} className={`exam-item ${exam.isPrimary ? 'primary' : ''}`}>
                                        {isEditing ? (
                                            <div className="exam-item-edit">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    placeholder="Exam Name"
                                                    className="exam-name-input"
                                                    autoFocus
                                                />
                                                <button
                                                    className="date-display-btn compact"
                                                    onClick={() => setDatePickerTarget(exam.id)}
                                                    type="button"
                                                >
                                                    <span>{formatDateDisplay(editDate)}</span>
                                                    <Calendar size={14} />
                                                </button>
                                                <div className="exam-edit-actions">
                                                    <button className="save-btn small" onClick={() => handleSaveEdit(exam)} disabled={!editName.trim() || !editDate}>
                                                        Save
                                                    </button>
                                                    <button className="cancel-btn small" onClick={handleCancelEdit}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    className={`exam-primary-btn ${exam.isPrimary ? 'active' : ''}`}
                                                    onClick={() => onSetPrimaryExam(exam.id)}
                                                    title={exam.isPrimary ? 'Primary exam' : 'Set as primary'}
                                                >
                                                    <Star size={16} fill={exam.isPrimary ? 'currentColor' : 'none'} />
                                                </button>
                                                <div className="exam-item-info">
                                                    <span className="exam-item-name">{exam.name}</span>
                                                    <span className="exam-item-date">{formatDateDisplay(exam.date)}</span>
                                                </div>
                                                <div className="exam-item-countdown">
                                                    {days !== null && (
                                                        <span className={`exam-days-badge ${days <= 7 ? 'urgent' : days <= 30 ? 'soon' : ''}`}>
                                                            {days >= 0 ? `${days}d` : 'Passed'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="exam-item-actions">
                                                    <button
                                                        className="exam-action-btn"
                                                        onClick={() => handleStartEdit(exam)}
                                                        title="Edit"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        className="exam-action-btn danger"
                                                        onClick={() => onDeleteExam(exam.id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {isAdding ? (
                            <div className="exam-add-form">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g., JEE Mains April"
                                    className="exam-name-input"
                                    autoFocus
                                />
                                <button
                                    className="date-display-btn compact"
                                    onClick={() => setDatePickerTarget('new')}
                                    type="button"
                                >
                                    <span>{newDate ? formatDateDisplay(newDate) : 'Pick Date'}</span>
                                    <Calendar size={14} />
                                </button>
                                <div className="exam-add-actions">
                                    <button className="save-btn small" onClick={handleAdd} disabled={!newName.trim() || !newDate}>
                                        Add
                                    </button>
                                    <button className="cancel-btn small" onClick={() => { setIsAdding(false); setNewName(''); setNewDate(''); }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button className="exam-add-btn" onClick={() => setIsAdding(true)}>
                                <Plus size={16} />
                                Add Exam
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <DatePickerModal
                isOpen={datePickerTarget !== null}
                selectedDate={datePickerTarget === 'new' ? newDate : editDate}
                onSelect={handleDateSelect}
                onClose={() => setDatePickerTarget(null)}
                disablePastDates={true}
            />
        </>
    );
}
