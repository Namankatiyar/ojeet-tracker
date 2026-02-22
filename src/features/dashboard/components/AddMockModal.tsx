import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { MockScore } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';

interface AddMockModalProps {
    onAdd: (score: Omit<MockScore, 'id'>) => void;
    onClose: () => void;
}

export function AddMockModal({ onAdd, onClose }: AddMockModalProps) {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [newMock, setNewMock] = useState({
        name: '',
        date: formatDateLocal(new Date()),
        physicsMarks: 0,
        chemistryMarks: 0,
        mathsMarks: 0,
        maxMarks: 300
    });

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return 'Select Date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleAddMock = () => {
        if (!newMock.name.trim()) return;

        onAdd({
            name: newMock.name,
            date: newMock.date,
            physicsMarks: newMock.physicsMarks,
            chemistryMarks: newMock.chemistryMarks,
            mathsMarks: newMock.mathsMarks,
            totalMarks: newMock.physicsMarks + newMock.chemistryMarks + newMock.mathsMarks,
            maxMarks: newMock.maxMarks
        });

        onClose();
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="add-mock-modal" onClick={e => e.stopPropagation()}>
                    <h3>Add Mock Test Score</h3>

                    <div className="form-group">
                        <label>Test Name</label>
                        <input
                            type="text"
                            placeholder="e.g., NTA Mock 1"
                            value={newMock.name}
                            onChange={e => setNewMock(m => ({ ...m, name: e.target.value }))}
                        />
                    </div>

                    <div className="form-group">
                        <label>Date</label>
                        <button
                            className="date-display-btn"
                            onClick={() => setIsDatePickerOpen(true)}
                            type="button"
                        >
                            <span>{formatDateDisplay(newMock.date)}</span>
                            <Calendar size={18} className="calendar-icon" />
                        </button>
                    </div>

                    <div className="marks-grid">
                        <div className="form-group">
                            <label className="text-physics">Physics</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={newMock.physicsMarks}
                                onChange={e => setNewMock(m => ({ ...m, physicsMarks: Number(e.target.value) }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-chemistry">Chemistry</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={newMock.chemistryMarks}
                                onChange={e => setNewMock(m => ({ ...m, chemistryMarks: Number(e.target.value) }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-maths">Maths</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={newMock.mathsMarks}
                                onChange={e => setNewMock(m => ({ ...m, mathsMarks: Number(e.target.value) }))}
                            />
                        </div>
                    </div>

                    <div className="total-display">
                        Total: <strong>{newMock.physicsMarks + newMock.chemistryMarks + newMock.mathsMarks}</strong> / 300
                    </div>

                    <div className="modal-actions">
                        <button className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button className="save-btn" onClick={handleAddMock} disabled={!newMock.name.trim()}>
                            Save Score
                        </button>
                    </div>
                </div>
            </div>

            <DatePickerModal
                isOpen={isDatePickerOpen}
                selectedDate={newMock.date}
                onSelect={(date) => {
                    setNewMock(m => ({ ...m, date }));
                    setIsDatePickerOpen(false);
                }}
                onClose={() => setIsDatePickerOpen(false)}
            />
        </>
    );
}
