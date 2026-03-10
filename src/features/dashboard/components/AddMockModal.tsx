import { useState } from 'react';
import { Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import { MockExamType, MockScore, MockSubjectMarks } from '../../../shared/types';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';
import { formatDateLocal } from '../../../shared/utils/date';
import { getMockPercentage } from '../../../shared/utils/mockScores';

interface AddMockModalProps {
    defaultExamType: MockExamType;
    onAdd: (score: Omit<MockScore, 'id'>) => void;
    onClose: () => void;
}

const JA_SUBJECT_MAX = 60;
const JM_SUBJECT_MAX = 100;
const BT_SUBJECT_MAX = 130;
const BT_TOTAL_MAX = 390;

const createEmptySubjectMarks = (): MockSubjectMarks => ({
    physics: 0,
    chemistry: 0,
    maths: 0,
});

const NumberInput = ({
    value,
    onChange,
    min,
    max,
}: {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
}) => {
    return (
        <div className="number-input-container">
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => {
                    let val = Number(e.target.value);
                    if (Number.isNaN(val)) val = min;
                    if (val < min) val = min;
                    if (val > max) val = max;
                    onChange(val);
                }}
            />
            <div className="number-input-controls">
                <button type="button" onClick={() => onChange(Math.min(max, value + 1))}><ChevronUp size={14} /></button>
                <button type="button" onClick={() => onChange(Math.max(min, value - 1))}><ChevronDown size={14} /></button>
            </div>
        </div>
    );
};

const getSubjectTotal = (marks: MockSubjectMarks) => marks.physics + marks.chemistry + marks.maths;

export function AddMockModal({ defaultExamType, onAdd, onClose }: AddMockModalProps) {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [examType, setExamType] = useState<MockExamType>(defaultExamType);
    const [name, setName] = useState('');
    const [date, setDate] = useState(formatDateLocal(new Date()));
    const [jmMarks, setJmMarks] = useState<MockSubjectMarks>(createEmptySubjectMarks());
    const [jaPaper1Marks, setJaPaper1Marks] = useState<MockSubjectMarks>(createEmptySubjectMarks());
    const [jaPaper2Marks, setJaPaper2Marks] = useState<MockSubjectMarks>(createEmptySubjectMarks());

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return 'Select Date';
        const selectedDate = new Date(dateString);
        return selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const jaTotals = {
        physics: jaPaper1Marks.physics + jaPaper2Marks.physics,
        chemistry: jaPaper1Marks.chemistry + jaPaper2Marks.chemistry,
        maths: jaPaper1Marks.maths + jaPaper2Marks.maths,
        paper1: getSubjectTotal(jaPaper1Marks),
        paper2: getSubjectTotal(jaPaper2Marks),
    };
    const jaTotalMarks = jaTotals.paper1 + jaTotals.paper2;
    const jaPercentage = getMockPercentage({
        id: 'draft',
        name,
        date,
        examType: 'ja',
        physicsMarks: jaTotals.physics,
        chemistryMarks: jaTotals.chemistry,
        mathsMarks: jaTotals.maths,
        totalMarks: jaTotalMarks,
        maxMarks: 360,
        paper1Marks: jaPaper1Marks,
        paper2Marks: jaPaper2Marks,
    });
    const jmTotalMarks = getSubjectTotal(jmMarks);

    const handleAddMock = () => {
        if (!name.trim()) return;

        if (examType === 'ja') {
            onAdd({
                name,
                date,
                examType,
                physicsMarks: jaTotals.physics,
                chemistryMarks: jaTotals.chemistry,
                mathsMarks: jaTotals.maths,
                totalMarks: jaTotalMarks,
                maxMarks: 360,
                paper1Marks: jaPaper1Marks,
                paper2Marks: jaPaper2Marks,
            });
        } else if (examType === 'bt') {
            onAdd({
                name,
                date,
                examType,
                physicsMarks: jmMarks.physics,
                chemistryMarks: jmMarks.chemistry,
                mathsMarks: jmMarks.maths,
                totalMarks: jmTotalMarks,
                maxMarks: BT_TOTAL_MAX,
            });
        } else {
            onAdd({
                name,
                date,
                examType,
                physicsMarks: jmMarks.physics,
                chemistryMarks: jmMarks.chemistry,
                mathsMarks: jmMarks.maths,
                totalMarks: jmTotalMarks,
                maxMarks: 300,
            });
        }

        onClose();
    };

    const renderSubjectMarksGrid = (
        values: MockSubjectMarks,
        onChange: (updater: (current: MockSubjectMarks) => MockSubjectMarks) => void,
        max: number,
    ) => (
        <div className="marks-grid">
            <div className="form-group">
                <label className="text-physics">Physics</label>
                <NumberInput
                    min={0}
                    max={max}
                    value={values.physics}
                    onChange={(val) => onChange((current) => ({ ...current, physics: val }))}
                />
            </div>
            <div className="form-group">
                <label className="text-chemistry">Chemistry</label>
                <NumberInput
                    min={0}
                    max={max}
                    value={values.chemistry}
                    onChange={(val) => onChange((current) => ({ ...current, chemistry: val }))}
                />
            </div>
            <div className="form-group">
                <label className="text-maths">Maths</label>
                <NumberInput
                    min={0}
                    max={max}
                    value={values.maths}
                    onChange={(val) => onChange((current) => ({ ...current, maths: val }))}
                />
            </div>
        </div>
    );

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="add-mock-modal add-mock-modal-wide" onClick={(e) => e.stopPropagation()}>
                    <h3>Add Mock Test Score</h3>

                    <div className="form-group">
                        <label>Exam</label>
                        <div className="view-toggle-small mock-exam-toggle">
                            <button
                                className={examType === 'jm' ? 'active' : ''}
                                onClick={() => setExamType('jm')}
                                type="button"
                            >
                                JM
                            </button>
                            <button
                                className={examType === 'ja' ? 'active' : ''}
                                onClick={() => setExamType('ja')}
                                type="button"
                            >
                                JA
                            </button>
                            <button
                                className={examType === 'bt' ? 'active' : ''}
                                onClick={() => setExamType('bt')}
                                type="button"
                            >
                                BT
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Test Name</label>
                        <input
                            type="text"
                            placeholder={
                                examType === 'ja'
                                    ? 'e.g., Allen JA Mock 4'
                                    : examType === 'bt'
                                        ? 'e.g., BITSAT Mock 1'
                                        : 'e.g., NTA Mock 1'
                            }
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Date</label>
                        <button
                            className="date-display-btn"
                            onClick={() => setIsDatePickerOpen(true)}
                            type="button"
                        >
                            <span>{formatDateDisplay(date)}</span>
                            <Calendar size={18} className="calendar-icon" />
                        </button>
                    </div>

                    {examType === 'jm' ? (
                        <>
                            {renderSubjectMarksGrid(jmMarks, (updater) => setJmMarks((current) => updater(current)), JM_SUBJECT_MAX)}
                            <div className="total-display">
                                Total: <strong>{jmTotalMarks}</strong> / 300
                            </div>
                        </>
                    ) : examType === 'bt' ? (
                        <>
                            {renderSubjectMarksGrid(jmMarks, (updater) => setJmMarks((current) => updater(current)), BT_SUBJECT_MAX)}
                            <div className="total-display">
                                Total: <strong>{jmTotalMarks}</strong> / {BT_TOTAL_MAX}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="ja-paper-grid">
                                <div className="ja-paper-card">
                                    <div className="ja-paper-header">
                                        <span>Paper 1</span>
                                        <span>{jaTotals.paper1}/180</span>
                                    </div>
                                    {renderSubjectMarksGrid(jaPaper1Marks, (updater) => setJaPaper1Marks((current) => updater(current)), JA_SUBJECT_MAX)}
                                </div>

                                <div className="ja-paper-card">
                                    <div className="ja-paper-header">
                                        <span>Paper 2</span>
                                        <span>{jaTotals.paper2}/180</span>
                                    </div>
                                    {renderSubjectMarksGrid(jaPaper2Marks, (updater) => setJaPaper2Marks((current) => updater(current)), JA_SUBJECT_MAX)}
                                </div>
                            </div>

                            <div className="ja-subject-summary">
                                <span className="text-physics">P {jaTotals.physics}</span>
                                <span className="text-chemistry">C {jaTotals.chemistry}</span>
                                <span className="text-maths">M {jaTotals.maths}</span>
                            </div>

                            <div className="total-display">
                                Percentage: <strong>{jaPercentage.toFixed(1)}%</strong>
                            </div>
                        </>
                    )}

                    <div className="modal-actions">
                        <button className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button className="save-btn" onClick={handleAddMock} disabled={!name.trim()}>
                            Save Score
                        </button>
                    </div>
                </div>
            </div>

            <DatePickerModal
                isOpen={isDatePickerOpen}
                selectedDate={date}
                onSelect={(selectedDate) => {
                    setDate(selectedDate);
                    setIsDatePickerOpen(false);
                }}
                onClose={() => setIsDatePickerOpen(false)}
            />
        </>
    );
}
