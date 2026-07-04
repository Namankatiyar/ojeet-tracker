import { useState, useMemo, useEffect } from 'react';
import { Calendar, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { MockExamType, MockScore, MockSubjectMarks, Subject } from '../../../shared/types';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';
import { formatDateLocal } from '../../../shared/utils/date';
import { getMockPercentage } from '../../../shared/utils/mockScores';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { ManageMockPresetsModal } from './ManageMockPresetsModal';

interface AddMockModalProps {
  defaultExamType: MockExamType;
  onAdd: (score: Omit<MockScore, 'id'>) => void;
  onEdit?: (score: MockScore) => void;
  initialScore?: MockScore;
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

export function AddMockModal({ defaultExamType, onAdd, onEdit, initialScore, onClose }: AddMockModalProps) {
  const { mockExamPresets } = useUserProgress();
  const { mergedSubjectData } = useSubjectData();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isManagePresetsOpen, setIsManagePresetsOpen] = useState(false);

  const [examType, setExamType] = useState<MockExamType>(initialScore?.examType || defaultExamType);

  useEffect(() => {
    if (!mockExamPresets.find((p) => p.id === examType) && mockExamPresets.length > 0) {
      setExamType(mockExamPresets[0].id);
    }
  }, [mockExamPresets, examType]);

  const activePreset = useMemo(
    () => mockExamPresets.find((p) => p.id === examType) || mockExamPresets[0],
    [mockExamPresets, examType]
  );

  const [name, setName] = useState(initialScore?.name || '');
  const [date, setDate] = useState(initialScore?.date || formatDateLocal(new Date()));

  const [paper1Marks, setPaper1Marks] = useState<MockSubjectMarks>(() => {
    if (initialScore?.paper1Marks) return initialScore.paper1Marks;
    if (initialScore) {
      return {
        physics: initialScore.physicsMarks,
        chemistry: initialScore.chemistryMarks,
        maths: initialScore.mathsMarks,
      };
    }
    return createEmptySubjectMarks();
  });
  const [paper2Marks, setPaper2Marks] = useState<MockSubjectMarks>(
    () => initialScore?.paper2Marks || createEmptySubjectMarks()
  );

  const [prevExamType, setPrevExamType] = useState(examType);
  if (examType !== prevExamType) {
    setPrevExamType(examType);
    setPaper1Marks(createEmptySubjectMarks());
    setPaper2Marks(createEmptySubjectMarks());
  }

  // Advanced Analytics State
  const [attemptedQuestions, setAttemptedQuestions] = useState<MockSubjectMarks>(
    initialScore?.attemptedQuestions || createEmptySubjectMarks()
  );
  const [wrongQuestions, setWrongQuestions] = useState<MockSubjectMarks>(
    initialScore?.wrongQuestions || createEmptySubjectMarks()
  );
  const [totalTimeAllotted, setTotalTimeAllotted] = useState<number>(
    initialScore?.totalTimeAllotted || 180
  );
  const [timeSpent, setTimeSpent] = useState<MockSubjectMarks>(
    initialScore?.timeSpent || createEmptySubjectMarks()
  );
  const [weakChapters, setWeakChapters] = useState<
    Array<{ subject: Subject; chapterSerial: number; chapterName: string }>
  >(initialScore?.weakChapters || []);
  const [weakSubtopics, setWeakSubtopics] = useState<
    Array<{ subject: Subject; chapterSerial: number; chapterName: string; subtopicName: string }>
  >(initialScore?.weakSubtopics || []);
  const [footnotes, setFootnotes] = useState<string>(initialScore?.footnotes || '');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(
    Boolean(
      initialScore?.attemptedQuestions ||
        initialScore?.wrongQuestions ||
        initialScore?.timeSpent ||
        initialScore?.weakChapters?.length ||
        initialScore?.weakSubtopics?.length ||
        initialScore?.footnotes
    )
  );

  // Weak Area Tagging Selector State
  const [selectedSubject, setSelectedSubject] = useState<Subject>('physics');
  const [selectedChapterSerial, setSelectedChapterSerial] = useState<number>(1);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');

  const chaptersForSubject = mergedSubjectData[selectedSubject]?.chapters || [];
  const currentChapter =
    chaptersForSubject.find((c) => c.serial === Number(selectedChapterSerial)) ||
    chaptersForSubject[0];
  const subtopicsForChapter = currentChapter?.subtopics || [];

  const handleAddWeakArea = () => {
    if (!currentChapter) return;
    if (selectedSubtopic) {
      if (
        !weakSubtopics.some(
          (w) =>
            w.subject === selectedSubject &&
            w.chapterSerial === currentChapter.serial &&
            w.subtopicName === selectedSubtopic
        )
      ) {
        setWeakSubtopics([
          ...weakSubtopics,
          {
            subject: selectedSubject,
            chapterSerial: currentChapter.serial,
            chapterName: currentChapter.name,
            subtopicName: selectedSubtopic,
          },
        ]);
      }
    } else {
      if (
        !weakChapters.some(
          (w) => w.subject === selectedSubject && w.chapterSerial === currentChapter.serial
        )
      ) {
        setWeakChapters([
          ...weakChapters,
          {
            subject: selectedSubject,
            chapterSerial: currentChapter.serial,
            chapterName: currentChapter.name,
          },
        ]);
      }
    }
  };

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

    const scoreBase: Omit<MockScore, 'id'> = {
      name,
      date,
      examType,
      physicsMarks: enabledSubjects.physics ? combinedTotals.physics : 0,
      chemistryMarks: enabledSubjects.chemistry ? combinedTotals.chemistry : 0,
      mathsMarks: enabledSubjects.maths ? combinedTotals.maths : 0,
      totalMarks: combinedTotalMarks,
      maxMarks: totalMaxMarks,
      attemptedQuestions: showAdvanced ? attemptedQuestions : undefined,
      wrongQuestions: showAdvanced ? wrongQuestions : undefined,
      totalTimeAllotted: showAdvanced ? totalTimeAllotted : undefined,
      timeSpent: showAdvanced ? timeSpent : undefined,
      weakChapters: showAdvanced && weakChapters.length > 0 ? weakChapters : undefined,
      weakSubtopics: showAdvanced && weakSubtopics.length > 0 ? weakSubtopics : undefined,
      footnotes: showAdvanced && footnotes.trim() ? footnotes.trim() : undefined,
    };

    const finalPayload = isDoublePaper
      ? { ...scoreBase, paper1Marks, paper2Marks }
      : scoreBase;

    if (initialScore && onEdit) {
      onEdit({ ...finalPayload, id: initialScore.id });
    } else {
      onAdd(finalPayload);
    }
    onClose();
  };

  const renderNumberGrid = (
    values: MockSubjectMarks,
    onChange: (updater: (current: MockSubjectMarks) => MockSubjectMarks) => void,
    maxLimit?: MockSubjectMarks
  ) => (
    <div className="marks-grid">
      {enabledSubjects.physics && (
        <div className="form-group">
          <label className="text-physics">Physics</label>
          <NumberInput
            min={0}
            max={maxLimit ? maxLimit.physics : 500}
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
            max={maxLimit ? maxLimit.chemistry : 500}
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
            max={maxLimit ? maxLimit.maths : 500}
            value={values.maths}
            onChange={(val) => onChange((current) => ({ ...current, maths: val }))}
          />
        </div>
      )}
    </div>
  );

  const renderSubjectMarksGrid = (
    values: MockSubjectMarks,
    onChange: (updater: (current: MockSubjectMarks) => MockSubjectMarks) => void
  ) => renderNumberGrid(values, onChange, sMax);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="add-mock-modal add-mock-modal-wide" onClick={(e) => e.stopPropagation()}>
          <div className="mock-preset-manager-header">
            <h3>{initialScore ? 'Edit Mock Test Score' : 'Add Mock Test Score'}</h3>
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

          <div className="advanced-analytics-toggle-wrapper" style={{ margin: '1rem 0' }}>
            <button
              type="button"
              className="view-toggle-btn"
              style={{ width: '100%', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span>{showAdvanced ? '− Hide' : '+ Add'} Advanced Analytics (Optional)</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Questions, Time, Weak Areas</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="advanced-analytics-panel" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Attempted Questions (Count)</label>
                {renderNumberGrid(attemptedQuestions, (updater) => setAttemptedQuestions((current) => updater(current)))}
              </div>

              <div className="form-group">
                <label>Wrong Questions (Count)</label>
                {renderNumberGrid(wrongQuestions, (updater) => setWrongQuestions((current) => updater(current)))}
              </div>

              <div className="form-group">
                <label>Time Allotted & Spent (Minutes)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Allotted:</label>
                  <input
                    type="number"
                    style={{ width: '80px', padding: '0.25rem 0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                    value={totalTimeAllotted}
                    onChange={(e) => setTotalTimeAllotted(Math.max(0, Number(e.target.value)))}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mins</span>
                </div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Time Spent per Subject (mins):</label>
                {renderNumberGrid(timeSpent, (updater) => setTimeSpent((current) => updater(current)))}
              </div>

              <div className="form-group">
                <label>Tag Weak Chapters / Subtopics</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <select
                    style={{ padding: '0.35rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value as Subject);
                      setSelectedChapterSerial(1);
                      setSelectedSubtopic('');
                    }}
                  >
                    <option value="physics">Physics</option>
                    <option value="chemistry">Chemistry</option>
                    <option value="maths">Maths</option>
                  </select>

                  <select
                    style={{ flex: 1, minWidth: '140px', padding: '0.35rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    value={selectedChapterSerial}
                    onChange={(e) => {
                      setSelectedChapterSerial(Number(e.target.value));
                      setSelectedSubtopic('');
                    }}
                  >
                    {chaptersForSubject.map((c) => (
                      <option key={c.serial} value={c.serial}>{c.serial}. {c.name}</option>
                    ))}
                  </select>

                  {subtopicsForChapter.length > 0 && (
                    <select
                      style={{ flex: 1, minWidth: '140px', padding: '0.35rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                      value={selectedSubtopic}
                      onChange={(e) => setSelectedSubtopic(e.target.value)}
                    >
                      <option value="">All Subtopics (Entire Chapter)</option>
                      {subtopicsForChapter.map((st, idx) => (
                        <option key={idx} value={st}>{st}</option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    style={{ padding: '0.35rem 0.75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}
                    onClick={handleAddWeakArea}
                  >
                    + Tag
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {weakChapters.map((w, idx) => (
                    <span key={`wc-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                      <strong style={{ textTransform: 'capitalize', color: 'var(--accent)' }}>{w.subject[0].toUpperCase()}:</strong> {w.chapterName}
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} onClick={() => setWeakChapters(weakChapters.filter((_, i) => i !== idx))}>×</button>
                    </span>
                  ))}
                  {weakSubtopics.map((w, idx) => (
                    <span key={`wst-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                      <strong style={{ textTransform: 'capitalize', color: 'var(--accent)' }}>{w.subject[0].toUpperCase()}:</strong> {w.chapterName} › {w.subtopicName}
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} onClick={() => setWeakSubtopics(weakSubtopics.filter((_, i) => i !== idx))}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Footnotes / Reflections</label>
                <textarea
                  style={{ width: '100%', minHeight: '60px', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical' }}
                  placeholder="What went well? Where did you lose silly marks?"
                  value={footnotes}
                  onChange={(e) => setFootnotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="save-btn" onClick={handleAddMock} disabled={!name.trim()}>
              {initialScore ? 'Update Score' : 'Save Score'}
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
