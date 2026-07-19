import React, { useRef, useEffect } from 'react';
import { X, BookOpen, Type, Search, ChevronRight, Minus, Plus } from 'lucide-react';
import { Subject, SubjectData, PlannerTask, AppProgress } from '../../../shared/types';
import { useTaskForm, TaskType } from '../hooks/useTaskForm';
import { TimePicker, TimePickerHandle } from '../../../shared/components/ui/TimePicker';
import { useActiveSubjects } from '../../../shared/hooks/useActiveSubjects';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: PlannerTask) => void;
  initialDate: string;
  subjectData: Record<Subject, SubjectData | null>;
  taskToEdit?: PlannerTask | null;
  progress: AppProgress;
}

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
  subjectData,
  taskToEdit,
  progress,
}: TaskModalProps) {
  const form = useTaskForm({ isOpen, initialDate, taskToEdit, subjectData, progress });
  const timePickerRef = useRef<TimePickerHandle>(null);

  // Auto-focus hour input when chapter selection is completed and no material choice is shown.
  useEffect(() => {
    if (
      isOpen &&
      !taskToEdit &&
      form.selectedChapterSerial !== '' &&
      form.availableMaterials.length === 0
    ) {
      // Small delay to let the selected chapter state render first.
      const timer = setTimeout(() => timePickerRef.current?.focusHour(), 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, taskToEdit, form.selectedChapterSerial, form.availableMaterials.length]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!form.time) return;

    const baseTask = {
      id: taskToEdit ? taskToEdit.id : crypto.randomUUID(),
      date: form.date,
      time: form.time,
      completed: taskToEdit ? taskToEdit.completed : false,
      type: form.taskType,
      questions: form.questions > 0 ? form.questions : undefined,
      isLecture: form.isLecture,
      isRevision: form.isRevision,
    };

    let prefix = '';
    if (form.isRevision && form.isLecture) {
      prefix = 'Revision Lecture: ';
    } else if (form.isRevision) {
      prefix = 'Revision: ';
    } else if (form.isLecture) {
      prefix = 'Lecture: ';
    }

    if (form.taskType === 'custom') {
      const cleanTitle = form.customTitle
        .replace(/\s*\(\d+\s*Qs\)$/, '')
        .replace(/^(Revision Lecture|Lecture|Revision):\s*/i, '');
      const baseTitleWithPrefix = `${prefix}${cleanTitle}`;
      const finalTitle = form.questions > 0 ? `${baseTitleWithPrefix} (${form.questions} Qs)` : baseTitleWithPrefix;
      onSave({
        ...baseTask,
        title: finalTitle,
        subject: form.resolveSubject(),
      });
    } else {
      if (!form.selectedSubject || form.selectedChapterSerial === '') return;
      const subjectInfo = subjectData[form.selectedSubject as Subject];
      const chapter = subjectInfo?.chapters.find(
        (c: any) => c.serial === form.selectedChapterSerial
      );
      if (!chapter) return;

      const baseTitle = chapter.name;
      const baseTitleWithPrefix = `${prefix}${baseTitle}`;
      const finalTitle = form.questions > 0 ? `${baseTitleWithPrefix} (${form.questions} Qs)` : baseTitleWithPrefix;

      if (form.selectedMaterial.length === 0) {
        onSave({
          ...baseTask,
          title: finalTitle,
          subject: form.selectedSubject,
          chapterSerial: form.selectedChapterSerial as number,
        });
      } else {
        form.selectedMaterial.forEach((material, index) => {
          onSave({
            ...baseTask,
            id: index === 0 ? baseTask.id : crypto.randomUUID(),
            title: finalTitle,
            subtitle: material,
            subject: form.selectedSubject as Subject,
            chapterSerial: form.selectedChapterSerial as number,
            material: material,
          });
        });
      }
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'center' }}>
      <div className="modal-content input-modal task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{taskToEdit ? 'Edit Task' : 'Add New Task'}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-scrollable">
          <TaskTypeToggle activeType={form.taskType} onChange={form.changeTaskType} />

          <div className="task-form">
            {form.taskType === 'chapter' ? (
              <ChapterTaskFields form={form} progress={progress} subjectData={subjectData} />
            ) : (
              <CustomTaskFields form={form} />
            )}

            <div className="form-group deadline-form-group">
              <label>Till when? (Deadline)</label>
              <TimePicker ref={timePickerRef} value={form.time} onChange={form.setTime} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-btn" onClick={handleSave} disabled={form.isSaveDisabled}>
            {taskToEdit ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskTypeToggle({
  activeType,
  onChange,
}: {
  activeType: TaskType;
  onChange: (type: TaskType) => void;
}) {
  return (
    <div className="task-type-toggle">
      <button
        className={`type-toggle-btn ${activeType === 'chapter' ? 'active' : ''}`}
        onClick={() => onChange('chapter')}
      >
        <BookOpen size={18} /> <span>Chapter</span>
      </button>
      <button
        className={`type-toggle-btn ${activeType === 'custom' ? 'active' : ''}`}
        onClick={() => onChange('custom')}
      >
        <Type size={18} /> <span>Custom</span>
      </button>
    </div>
  );
}

function CustomTaskFields({ form }: { form: ReturnType<typeof useTaskForm> }) {
  const { subjects } = useActiveSubjects();

  return (
    <>
      <div className="form-group">
        <label>Task Name</label>
        <input
          type="text"
          value={form.customTitle}
          onChange={(e) => form.setCustomTitle(e.target.value)}
          placeholder="Enter task details..."
          autoFocus
          className="large-input"
        />
      </div>
      <div className="form-group">
        <label>
          Subject <span className="optional-label">(optional)</span>
        </label>
        <div className="material-pills">
          {subjects.map((subj) => (
            <button
              key={subj}
              className={`material-pill custom-subject-pill ${form.customSubject === subj ? 'selected' : ''}`}
              onClick={() => form.selectCustomSubject(subj)}
              style={{ '--pill-color': `var(--color-${subj})` } as React.CSSProperties}
            >
              {subj.charAt(0).toUpperCase() + subj.slice(1)}
            </button>
          ))}
          <button
            className={`material-pill custom-subject-pill ${form.customSubject === 'none' ? 'selected' : ''}`}
            onClick={() => form.selectCustomSubject('none')}
            style={{ '--pill-color': 'var(--text-secondary)' } as React.CSSProperties}
          >
            None
          </button>
        </div>
      </div>
      {form.customSubject !== 'none' && (
        <>
          <div className="form-group-inline" style={{ marginBottom: 'var(--space-4)' }}>
            <label>Lecture</label>
            <label className="checkbox-container" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={form.isLecture}
                onChange={(e) => form.setIsLecture(e.target.checked)}
              />
              <span className="checkmark"></span>
            </label>
          </div>
          <div className="form-group-inline" style={{ marginBottom: 'var(--space-4)' }}>
            <label>Revision</label>
            <label className="checkbox-container" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={form.isRevision}
                onChange={(e) => form.setIsRevision(e.target.checked)}
              />
              <span className="checkmark"></span>
            </label>
          </div>
          <QuestionStepper value={form.questions} onChange={form.setQuestions} />
        </>
      )}
    </>
  );
}

function ChapterTaskFields({
  form,
  progress,
  subjectData,
}: {
  form: ReturnType<typeof useTaskForm>;
  progress: AppProgress;
  subjectData: Record<Subject, SubjectData | null>;
}) {
  const { subjects } = useActiveSubjects();

  return (
    <>
      <div className="form-group">
        <label>Subject</label>
        <div className="subject-selector">
          {subjects.map((subj) => (
            <button
              key={subj}
              className={`subject-option ${form.selectedSubject === subj ? 'selected' : ''}`}
              onClick={() => form.selectChapterSubject(subj)}
              style={{ '--subj-color': `var(--color-${subj})` } as React.CSSProperties}
            >
              {subj.charAt(0).toUpperCase() + subj.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {form.selectedSubject && (
        <div className="form-group">
          <label>Chapter</label>
          {form.selectedChapterSerial === '' ? (
            <div className="chapter-picker">
              <div className="chapter-search-box">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search chapters..."
                  value={form.chapterSearch}
                  onChange={(e) => form.setChapterSearch(e.target.value)}
                  autoFocus
                  className="search-input"
                />
              </div>
              <div className="chapter-list">
                {form.filteredChapters.map((c) => {
                  const chapterPriority = form.selectedSubject
                    ? progress[form.selectedSubject as Subject]?.[c.serial]?.priority || 'none'
                    : 'none';
                  const priorityClass =
                    chapterPriority !== 'none' ? `priority-${chapterPriority}` : '';
                  return (
                    <button
                      key={c.serial}
                      className={`chapter-item ${priorityClass}`}
                      onClick={() => form.setSelectedChapterSerial(c.serial)}
                    >
                      <span className="chapter-item-title">
                        <span className="bullet-icon">•</span>
                        <span className="chapter-name">{c.name}</span>
                      </span>
                      <ChevronRight size={16} className="chevron" />
                    </button>
                  );
                })}
                {form.filteredChapters.length === 0 && (
                  <div className="no-chapters">No chapters found</div>
                )}
              </div>
            </div>
          ) : (
            <div className="selected-chapter-display">
              <span>
                {
                  subjectData[form.selectedSubject as Subject]?.chapters.find(
                    (c) => c.serial === form.selectedChapterSerial
                  )?.name
                }
              </span>
              <button className="change-btn" onClick={form.resetChapterSelection}>
                Change
              </button>
            </div>
          )}
        </div>
      )}

      {form.selectedChapterSerial !== '' && (
        <>
          <div className="form-group">
            <label>
              Materials <span className="optional-label">(optional)</span>
            </label>
            <div className="material-pills">
              {form.availableMaterials.map((m) => (
                <button
                  key={m}
                  className={`material-pill ${form.selectedMaterial.includes(m) ? 'selected' : ''}`}
                  onClick={() =>
                    form.setSelectedMaterial((prev) =>
                      prev.includes(m) ? prev.filter((mat) => mat !== m) : [...prev, m]
                    )
                  }
                >
                  {m}
                </button>
              ))}
            </div>
            {form.selectedMaterial.length === 0 && form.availableMaterials.length > 0 && (
              <div className="material-hint">Leave empty for general chapter task</div>
            )}
          </div>
          <div className="form-group-inline" style={{ marginBottom: 'var(--space-4)' }}>
            <label>Lecture</label>
            <label className="checkbox-container" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={form.isLecture}
                onChange={(e) => form.setIsLecture(e.target.checked)}
              />
              <span className="checkmark"></span>
            </label>
          </div>
          <div className="form-group-inline" style={{ marginBottom: 'var(--space-4)' }}>
            <label>Revision</label>
            <label className="checkbox-container" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={form.isRevision}
                onChange={(e) => form.setIsRevision(e.target.checked)}
              />
              <span className="checkmark"></span>
            </label>
          </div>
          <QuestionStepper value={form.questions} onChange={form.setQuestions} />
        </>
      )}
    </>
  );
}

function QuestionStepper({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <div className="form-group-inline">
      <label>Questions</label>
      <div className="modern-stepper">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 5))}
          disabled={value <= 0}
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          min="0"
        />
        <button type="button" onClick={() => onChange(value + 5)}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
