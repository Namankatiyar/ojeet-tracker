import { X, BookOpen, Type, Search, ChevronRight } from 'lucide-react';
import { Subject, SubjectData, PlannerTask, AppProgress } from '../../../shared/types';
import { useTaskForm, TaskType } from '../hooks/useTaskForm';
import { TimePicker } from '../../../shared/components/ui/TimePicker';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: PlannerTask) => void;
    initialDate: string;
    subjectData: Record<Subject, SubjectData | null>;
    taskToEdit?: PlannerTask | null;
    progress: AppProgress;
}

export function TaskModal({ isOpen, onClose, onSave, initialDate, subjectData, taskToEdit, progress }: TaskModalProps) {
    const form = useTaskForm({ isOpen, initialDate, taskToEdit, subjectData, progress });

    if (!isOpen) return null;

    const handleSave = () => {
        if (!form.time) return;

        const baseTask = {
            id: taskToEdit ? taskToEdit.id : crypto.randomUUID(),
            date: form.date,
            time: form.time,
            completed: taskToEdit ? taskToEdit.completed : false,
            type: form.taskType
        };

        if (form.taskType === 'custom') {
            onSave({
                ...baseTask,
                title: form.customTitle,
                subject: form.customSubject === 'none' ? undefined : form.customSubject
            });
        } else {
            if (!form.selectedSubject || form.selectedChapterSerial === '') return;
            const subjectInfo = subjectData[form.selectedSubject as Subject];
            const chapter = subjectInfo?.chapters.find((c: any) => c.serial === form.selectedChapterSerial);
            if (!chapter) return;

            if (form.selectedMaterial.length === 0) {
                onSave({
                    ...baseTask,
                    title: chapter.name,
                    subject: form.selectedSubject,
                    chapterSerial: form.selectedChapterSerial as number,
                });
            } else {
                form.selectedMaterial.forEach((material, index) => {
                    onSave({
                        ...baseTask,
                        id: index === 0 ? baseTask.id : crypto.randomUUID(),
                        title: chapter.name,
                        subtitle: material,
                        subject: form.selectedSubject as Subject,
                        chapterSerial: form.selectedChapterSerial as number,
                        material: material
                    });
                });
            }
        }
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'center' }}>
            <div className="modal-content input-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{taskToEdit ? 'Edit Task' : 'Add New Task'}</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body-scrollable">
                    <TaskTypeToggle activeType={form.taskType} onChange={form.setTaskType} />

                    <div className="task-form">
                        {form.taskType === 'chapter' ? (
                            <ChapterTaskFields form={form} progress={progress} subjectData={subjectData} />
                        ) : (
                            <CustomTaskFields form={form} />
                        )}

                        <div className="form-group">
                            <label>Till when? (Deadline)</label>
                            <TimePicker value={form.time} onChange={form.setTime} />
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

function TaskTypeToggle({ activeType, onChange }: { activeType: TaskType, onChange: (type: TaskType) => void }) {
    return (
        <div className="task-type-toggle">
            <button className={`type-toggle-btn ${activeType === 'chapter' ? 'active' : ''}`} onClick={() => onChange('chapter')}>
                <BookOpen size={18} /> <span>Chapter</span>
            </button>
            <button className={`type-toggle-btn ${activeType === 'custom' ? 'active' : ''}`} onClick={() => onChange('custom')}>
                <Type size={18} /> <span>Custom</span>
            </button>
        </div>
    );
}

function CustomTaskFields({ form }: { form: ReturnType<typeof useTaskForm> }) {
    return (
        <>
            <div className="form-group">
                <label>Task Name</label>
                <input
                    type="text"
                    value={form.customTitle}
                    onChange={e => form.setCustomTitle(e.target.value)}
                    placeholder="Enter task details..."
                    autoFocus
                    className="large-input"
                />
            </div>
            <div className="form-group">
                <label>Subject <span className="optional-label">(optional)</span></label>
                <div className="material-pills">
                    {(['physics', 'chemistry', 'maths'] as Subject[]).map((subj) => (
                        <button
                            key={subj}
                            className={`material-pill custom-subject-pill ${form.customSubject === subj ? 'selected' : ''}`}
                            onClick={() => form.setCustomSubject(subj)}
                            style={{ '--pill-color': `var(--${subj})` } as any}
                        >
                            {subj.charAt(0).toUpperCase() + subj.slice(1)}
                        </button>
                    ))}
                    <button
                        className={`material-pill custom-subject-pill ${form.customSubject === 'none' ? 'selected' : ''}`}
                        onClick={() => form.setCustomSubject('none')}
                        style={{ '--pill-color': 'var(--text-secondary)' } as any}
                    >
                        None
                    </button>
                </div>
            </div>
        </>
    );
}

function ChapterTaskFields({ form, progress, subjectData }: { form: ReturnType<typeof useTaskForm>, progress: AppProgress, subjectData: Record<Subject, SubjectData | null> }) {
    return (
        <>
            <div className="form-group">
                <label>Subject</label>
                <div className="subject-selector">
                    {(['physics', 'chemistry', 'maths'] as Subject[]).map(subj => (
                        <button
                            key={subj}
                            className={`subject-option ${form.selectedSubject === subj ? 'selected' : ''}`}
                            onClick={() => {
                                form.setSelectedSubject(subj);
                                form.resetChapterSelection();
                                form.setChapterSearch('');
                            }}
                            style={{ '--subj-color': `var(--${subj})` } as any}
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
                                    onChange={e => form.setChapterSearch(e.target.value)}
                                    autoFocus
                                    className="search-input"
                                />
                            </div>
                            <div className="chapter-list">
                                {form.filteredChapters.map((c) => {
                                    const chapterPriority = form.selectedSubject ? progress[form.selectedSubject as Subject]?.[c.serial]?.priority || 'none' : 'none';
                                    const priorityClass = chapterPriority !== 'none' ? `priority-${chapterPriority}` : '';
                                    return (
                                        <button
                                            key={c.serial}
                                            className={`chapter-item ${priorityClass}`}
                                            onClick={() => form.setSelectedChapterSerial(c.serial)}
                                        >
                                            <span><span className="bullet-icon">•</span> {c.name}</span>
                                            <ChevronRight size={16} className="chevron" />
                                        </button>
                                    );
                                })}
                                {form.filteredChapters.length === 0 && <div className="no-chapters">No chapters found</div>}
                            </div>
                        </div>
                    ) : (
                        <div className="selected-chapter-display">
                            <span>{subjectData[form.selectedSubject as Subject]?.chapters.find(c => c.serial === form.selectedChapterSerial)?.name}</span>
                            <button className="change-btn" onClick={form.resetChapterSelection}>Change</button>
                        </div>
                    )}
                </div>
            )}

            {form.selectedChapterSerial !== '' && (
                <div className="form-group">
                    <label>Materials <span className="optional-label">(optional)</span></label>
                    <div className="material-pills">
                        {form.availableMaterials.map((m) => (
                            <button
                                key={m}
                                className={`material-pill ${form.selectedMaterial.includes(m) ? 'selected' : ''}`}
                                onClick={() => form.setSelectedMaterial(prev =>
                                    prev.includes(m) ? prev.filter(mat => mat !== m) : [...prev, m]
                                )}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    {form.selectedMaterial.length === 0 && form.availableMaterials.length > 0 && (
                        <div className="material-hint">Leave empty for general chapter task</div>
                    )}
                </div>
            )}
        </>
    );
}
