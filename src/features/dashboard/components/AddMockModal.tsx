import { useState, useMemo, useEffect } from 'react';
import { Calendar, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { MockExamType, MockScore, MockSubjectMarks } from '../../../shared/types';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';
import { formatDateLocal } from '../../../shared/utils/date';
import { getMockPercentage } from '../../../shared/utils/mockScores';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { ManageMockPresetsModal } from './ManageMockPresetsModal';

interface AddMockModalProps {
  defaultExamType: MockExamType;
  onAdd: (score: Omit<MockScore, 'id'>) => void;
  onClose: () => void;
}

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
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))}>
          <ChevronUp size={14} />
        </button>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}>
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
};

export function AddMockModal({ defaultExamType, onAdd, onClose }: AddMockModalProps) {
  const { mockExamPresets } = useUserProgress();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isManagePresetsOpen, setIsManagePresetsOpen] = useState(false);

  const [examType, setExamType] = useState<MockExamType>(defaultExamType);

  useEffect(() => {
    if (!mockExamPresets.find((p) => p.id === examType) && mockExamPresets.length > 0) {
      setExamType(mockExamPresets[0].id);
    }
  }, [mockExamPresets, examType]);

  const activePreset = useMemo(
    () => mockExamPresets.find((p) => p.id === examType) || mockExamPresets[0],
    [mockExamPresets, examType]
  );

  const [name, setName] = useState('');
  const [date, setDate] = useState(formatDateLocal(new Date()));

  const [paper1Marks, setPaper1Marks] = useState<MockSubjectMarks>(createEmptySubjectMarks());
  const [paper2Marks, setPaper2Marks] = useState<MockSubjectMarks>(createEmptySubjectMarks());

  useEffect(() => {
    setPaper1Marks(createEmptySubjectMarks());
    setPaper2Marks(createEmptySubjectMarks());
  }, [examType]);

  if (isManagePresetsOpen) {
    return <ManageMockPresetsModal onClose={() => setIsManagePresetsOpen(false)} />;
  }

  if (!activePreset) return null; // Edge case

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return 'Select Date';
    const selectedDate = new Date(dateString);
    return selectedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isDoublePaper = activePreset.paperCount === 2;
  const sMax = activePreset.subjectMaxMarks;
  const enabledSubjects = activePreset.enabledSubjects || {
    physics: true,
    chemistry: true,
    maths: true,
  };
  const singlePaperMaxMarks =
    (enabledSubjects.physics ? sMax.physics : 0) +
    (enabledSubjects.chemistry ? sMax.chemistry : 0) +
    (enabledSubjects.maths ? sMax.maths : 0);
  const totalMaxMarks = singlePaperMaxMarks * activePreset.paperCount;

  const getEnabledSubjectTotal = (marks: MockSubjectMarks) => {
    return (
      (enabledSubjects.physics ? marks.physics : 0) +
      (enabledSubjects.chemistry ? marks.chemistry : 0) +
      (enabledSubjects.maths ? marks.maths : 0)
    );
  };

  const paper1Total = getEnabledSubjectTotal(paper1Marks);
  const paper2Total = getEnabledSubjectTotal(paper2Marks);
  const combinedTotals = {
    physics: paper1Marks.physics + paper2Marks.physics,
    chemistry: paper1Marks.chemistry + paper2Marks.chemistry,
    maths: paper1Marks.maths + paper2Marks.maths,
  };
  const combinedTotalMarks = paper1Total + (isDoublePaper ? paper2Total : 0);

  const dummyScore: any = {
    examType: activePreset.id,
    totalMarks: combinedTotalMarks,
    maxMarks: totalMaxMarks,
  };
  const percentage = getMockPercentage(dummyScore, mockExamPresets);

  const handleAddMock = () => {
    if (!name.trim()) return;

    const scoreBase = {
      name,
      date,
      examType,
      physicsMarks: enabledSubjects.physics ? combinedTotals.physics : 0,
      chemistryMarks: enabledSubjects.chemistry ? combinedTotals.chemistry : 0,
      mathsMarks: enabledSubjects.maths ? combinedTotals.maths : 0,
      totalMarks: combinedTotalMarks,
      maxMarks: totalMaxMarks,
    };

    if (isDoublePaper) {
      onAdd({
        ...scoreBase,
        paper1Marks,
        paper2Marks,
      });
    } else {
      onAdd(scoreBase);
    }
    onClose();
  };

  const renderSubjectMarksGrid = (
    values: MockSubjectMarks,
    onChange: (updater: (current: MockSubjectMarks) => MockSubjectMarks) => void
  ) => (
    <div className="marks-grid">
      {enabledSubjects.physics && (
        <div className="form-group">
          <label className="text-physics">Physics</label>
          <NumberInput
            min={0}
            max={sMax.physics}
            value={values.physics}
            onChange={(val) => onChange((current) => ({ ...current, physics: val }))}
          />
        </div>
      )}
      {enabledSubjects.chemistry && (
        <div className="form-group">
          <label className="text-chemistry">Chemistry</label>
          <NumberInput
            min={0}
            max={sMax.chemistry}
            value={values.chemistry}
            onChange={(val) => onChange((current) => ({ ...current, chemistry: val }))}
          />
        </div>
      )}
      {enabledSubjects.maths && (
        <div className="form-group">
          <label className="text-maths">Maths</label>
          <NumberInput
            min={0}
            max={sMax.maths}
            value={values.maths}
            onChange={(val) => onChange((current) => ({ ...current, maths: val }))}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="add-mock-modal add-mock-modal-wide" onClick={(e) => e.stopPropagation()}>
          <div className="mock-preset-manager-header">
            <h3>Add Mock Test Score</h3>
            <button
              className="mock-manage-presets-btn"
              onClick={() => setIsManagePresetsOpen(true)}
              title="Manage Presets"
            >
              <Settings size={16} /> Presets
            </button>
          </div>

          <div className="form-group">
            <label>Exam</label>
            <div className="view-toggle-small mock-exam-toggle">
              {mockExamPresets.map((preset) => (
                <button
                  key={preset.id}
                  className={examType === preset.id ? 'active' : ''}
                  onClick={() => setExamType(preset.id)}
                  type="button"
                >
                  {preset.shortName}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Test Name</label>
            <input
              type="text"
              placeholder={`e.g., ${activePreset.name} Mock`}
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

          {!isDoublePaper ? (
            <>
              {renderSubjectMarksGrid(paper1Marks, (updater) =>
                setPaper1Marks((current) => updater(current))
              )}
              <div className="total-display">
                Total: <strong>{combinedTotalMarks}</strong> / {totalMaxMarks}
              </div>
            </>
          ) : (
            <>
              <div className="ja-paper-grid">
                <div className="ja-paper-card">
                  <div className="ja-paper-header">
                    <span>Paper 1</span>
                    <span>
                      {paper1Total}/{singlePaperMaxMarks}
                    </span>
                  </div>
                  {renderSubjectMarksGrid(paper1Marks, (updater) =>
                    setPaper1Marks((current) => updater(current))
                  )}
                </div>

                <div className="ja-paper-card">
                  <div className="ja-paper-header">
                    <span>Paper 2</span>
                    <span>
                      {paper2Total}/{singlePaperMaxMarks}
                    </span>
                  </div>
                  {renderSubjectMarksGrid(paper2Marks, (updater) =>
                    setPaper2Marks((current) => updater(current))
                  )}
                </div>
              </div>

              <div className="ja-subject-summary">
                <span className="text-physics">P {combinedTotals.physics}</span>
                <span className="text-chemistry">C {combinedTotals.chemistry}</span>
                <span className="text-maths">M {combinedTotals.maths}</span>
              </div>

              <div className="total-display">
                Percentage: <strong>{percentage.toFixed(1)}%</strong>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
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
