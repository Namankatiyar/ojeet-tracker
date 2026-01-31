import { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, Type, Clock, Search, ChevronRight } from 'lucide-react';
import { Subject, SubjectData, PlannerTask } from '../../../shared/types';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: PlannerTask) => void;
    initialDate: string;
    subjectData: Record<Subject, SubjectData | null>;
    taskToEdit?: PlannerTask | null;
}

type TaskType = 'chapter' | 'custom' | null;

export function TaskModal({ isOpen, onClose, onSave, initialDate, subjectData, taskToEdit }: TaskModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [taskType, setTaskType] = useState<TaskType>(null);

    // Form States
    const [customTitle, setCustomTitle] = useState('');
    const [customSubject, setCustomSubject] = useState<Subject | 'none'>('none');
    const [selectedSubject, setSelectedSubject] = useState<Subject | ''>('');
    const [selectedChapterSerial, setSelectedChapterSerial] = useState<number | ''>('');
    const [selectedMaterial, setSelectedMaterial] = useState<string[]>([]);
    const [time, setTime] = useState('');
    const [date, setDate] = useState(initialDate);
    const [chapterSearch, setChapterSearch] = useState('');

    // Time Picker States
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [selectedHour, setSelectedHour] = useState('12');
    const [selectedMinute, setSelectedMinute] = useState('00');
    const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');

    useEffect(() => {
        if (isOpen) {
            setChapterSearch('');
            setIsTimePickerOpen(false);
            if (taskToEdit) {
                setTaskType(taskToEdit.type);
                setStep(2);
                setTime(taskToEdit.time);

                // Parse time for picker
                const [h, m] = taskToEdit.time.split(':');
                let hour = parseInt(h);
                const period = hour >= 12 ? 'PM' : 'AM';
                if (hour > 12) hour -= 12;
                if (hour === 0) hour = 12;

                setSelectedHour(hour.toString().padStart(2, '0'));
                setSelectedMinute(m);
                setSelectedPeriod(period);

                setDate(taskToEdit.date);

                if (taskToEdit.type === 'custom') {
                    setCustomTitle(taskToEdit.title);
                    setCustomSubject(taskToEdit.subject || 'none');
                } else {
                    setSelectedSubject(taskToEdit.subject || '');
                    setSelectedChapterSerial(taskToEdit.chapterSerial || '');
                    setSelectedMaterial(taskToEdit.material ? [taskToEdit.material] : []);
                }
            } else {
                setStep(1);
                setTaskType(null);
                setCustomTitle('');
                setCustomSubject('none');
                setSelectedSubject('');
                setSelectedChapterSerial('');
                setSelectedMaterial([]);
                setTime('');
                setDate(initialDate);

                // Default time states
                const now = new Date();
                let h = now.getHours();
                let m = Math.ceil(now.getMinutes() / 5) * 5; // Round to nearest 5

                if (m === 60) {
                    m = 0;
                    h += 1;
                    if (h === 24) h = 0;
                }

                const p = h >= 12 ? 'PM' : 'AM';
                if (h > 12) h -= 12;
                if (h === 0) h = 12;

                setSelectedHour(h.toString().padStart(2, '0'));
                setSelectedMinute(m.toString().padStart(2, '0'));
                setSelectedPeriod(p);
            }
        }
    }, [isOpen, initialDate, taskToEdit]);

    // Update time string when picker components change
    useEffect(() => {
        if (step === 2) {
            let h = parseInt(selectedHour);
            if (selectedPeriod === 'PM' && h !== 12) h += 12;
            if (selectedPeriod === 'AM' && h === 12) h = 0;
            setTime(`${h.toString().padStart(2, '0')}:${selectedMinute}`);
        }
    }, [selectedHour, selectedMinute, selectedPeriod, step]);

    const handleNext = (type: 'chapter' | 'custom') => {
        setTaskType(type);
        setStep(2);
    };

    const handleSave = () => {
        if (!time) return;

        const baseTask = {
            id: taskToEdit ? taskToEdit.id : crypto.randomUUID(),
            date,
            time,
            completed: taskToEdit ? taskToEdit.completed : false,
            type: taskType!
        };

        if (taskType === 'custom') {
            if (!customTitle.trim()) return;
            onSave({
                ...baseTask,
                title: customTitle,
                subject: customSubject === 'none' ? undefined : customSubject
            });
        } else {
            if (!selectedSubject || selectedChapterSerial === '' || selectedMaterial.length === 0) return;

            const subjectInfo = subjectData[selectedSubject as Subject];
            const chapter = subjectInfo?.chapters.find(c => c.serial === selectedChapterSerial);

            if (!chapter) return;

            // Create a task for each selected material
            selectedMaterial.forEach((material, index) => {
                onSave({
                    ...baseTask,
                    id: index === 0 ? baseTask.id : crypto.randomUUID(), // Keep original ID for first, new IDs for rest
                    title: chapter.name,
                    subtitle: material,
                    subject: selectedSubject,
                    chapterSerial: selectedChapterSerial,
                    material: material
                });
            });
        }
        onClose();
    };

    const filteredChapters = useMemo(() => {
        if (!selectedSubject) return [];
        const chapters = subjectData[selectedSubject as Subject]?.chapters || [];
        if (!chapterSearch) return chapters;
        return chapters.filter(c => c.name.toLowerCase().includes(chapterSearch.toLowerCase()));
    }, [selectedSubject, subjectData, chapterSearch]);

    const availableMaterials = useMemo(() => {
        if (!selectedSubject || selectedChapterSerial === '') return [];
        return subjectData[selectedSubject as Subject]?.chapters
            .find(c => c.serial === selectedChapterSerial)?.materials || [];
    }, [selectedSubject, selectedChapterSerial, subjectData]);

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'center' }}>
            <div className="modal-content input-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{step === 1 ? 'Add New Task' : `Add ${taskType === 'chapter' ? 'Chapter' : 'Task'}`}</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body-scrollable">
                    {step === 1 ? (
                        <div className="task-type-selection">
                            <button className="type-btn" onClick={() => handleNext('chapter')}>
                                <BookOpen size={28} />
                                <span>Add Chapter</span>
                            </button>
                            <button className="type-btn" onClick={() => handleNext('custom')}>
                                <Type size={28} />
                                <span>Add Other</span>
                            </button>
                        </div>
                    ) : (
                        <div className="task-form">
                            {taskType === 'chapter' ? (
                                <>
                                    <div className="form-group">
                                        <label>Subject</label>
                                        <div className="subject-selector">
                                            {(['physics', 'chemistry', 'maths'] as Subject[]).map(subj => (
                                                <button
                                                    key={subj}
                                                    className={`subject-option ${selectedSubject === subj ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setSelectedSubject(subj);
                                                        setSelectedChapterSerial('');
                                                        setSelectedMaterial([]);
                                                        setChapterSearch('');
                                                    }}
                                                    style={{ '--subj-color': `var(--${subj})` } as any}
                                                >
                                                    {subj.charAt(0).toUpperCase() + subj.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedSubject && (
                                        <div className="form-group">
                                            <label>Chapter</label>
                                            {selectedChapterSerial === '' ? (
                                                <div className="chapter-picker">
                                                    <div className="chapter-search-box">
                                                        <Search size={18} className="search-icon" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search chapters..."
                                                            value={chapterSearch}
                                                            onChange={e => setChapterSearch(e.target.value)}
                                                            autoFocus
                                                            className="search-input"
                                                        />
                                                    </div>
                                                    <div className="chapter-list">
                                                        {filteredChapters.map((c) => (
                                                            <button
                                                                key={c.serial}
                                                                className="chapter-item"
                                                                onClick={() => setSelectedChapterSerial(c.serial)}
                                                            >
                                                                <span><span className="bullet-icon">•</span> {c.name}</span>
                                                                <ChevronRight size={16} className="chevron" />
                                                            </button>
                                                        ))}
                                                        {filteredChapters.length === 0 && (
                                                            <div className="no-chapters">No chapters found</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="selected-chapter-display">
                                                    <span>
                                                        {subjectData[selectedSubject as Subject]?.chapters.find(c => c.serial === selectedChapterSerial)?.name}
                                                    </span>
                                                    <button className="change-btn" onClick={() => {
                                                        setSelectedChapterSerial('');
                                                        setSelectedMaterial([]);
                                                    }}>Change</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedChapterSerial !== '' && (
                                        <div className="form-group">
                                            <label>Materials (select multiple)</label>
                                            <div className="material-pills">
                                                {availableMaterials.map((m) => (
                                                    <button
                                                        key={m}
                                                        className={`material-pill ${selectedMaterial.includes(m) ? 'selected' : ''}`}
                                                        onClick={() => setSelectedMaterial(prev =>
                                                            prev.includes(m)
                                                                ? prev.filter(mat => mat !== m)
                                                                : [...prev, m]
                                                        )}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                                {availableMaterials.length === 0 && (
                                                    <div className="no-materials">No materials available</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>Task Name</label>
                                        <input
                                            type="text"
                                            value={customTitle}
                                            onChange={e => setCustomTitle(e.target.value)}
                                            placeholder="Enter task details..."
                                            autoFocus
                                            className="large-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Subject (Optional)</label>
                                        <div className="material-pills">
                                            {(['physics', 'chemistry', 'maths'] as Subject[]).map((subj) => (
                                                <button
                                                    key={subj}
                                                    className={`material-pill custom-subject-pill ${customSubject === subj ? 'selected' : ''}`}
                                                    onClick={() => setCustomSubject(subj)}
                                                    style={{ '--pill-color': `var(--${subj})` } as any}
                                                >
                                                    {subj.charAt(0).toUpperCase() + subj.slice(1)}
                                                </button>
                                            ))}
                                            <button
                                                className={`material-pill custom-subject-pill ${customSubject === 'none' ? 'selected' : ''}`}
                                                onClick={() => setCustomSubject('none')}
                                                style={{ '--pill-color': 'var(--text-secondary)' } as any}
                                            >
                                                None
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label>Till when? (Deadline)</label>
                                <div
                                    className={`time-display-box ${isTimePickerOpen ? 'active' : ''}`}
                                    onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
                                >
                                    <span className="time-value">
                                        {selectedHour}:{selectedMinute} <span className="period">{selectedPeriod}</span>
                                    </span>
                                    <Clock size={20} className="time-icon" />
                                </div>

                                {isTimePickerOpen && (
                                    <div className="custom-time-picker">
                                        <div className="time-column">
                                            <span className="col-label">Hour</span>
                                            <div className="scroll-container">
                                                {hours.map(h => (
                                                    <button
                                                        key={h}
                                                        className={`time-btn ${selectedHour === h ? 'selected' : ''}`}
                                                        onClick={() => setSelectedHour(h)}
                                                    >
                                                        {h}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="time-column">
                                            <span className="col-label">Min</span>
                                            <div className="scroll-container">
                                                {minutes.map(m => (
                                                    <button
                                                        key={m}
                                                        className={`time-btn ${selectedMinute === m ? 'selected' : ''}`}
                                                        onClick={() => setSelectedMinute(m)}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="time-column period-col">
                                            <button
                                                className={`period-btn ${selectedPeriod === 'AM' ? 'selected' : ''}`}
                                                onClick={() => setSelectedPeriod('AM')}
                                            >
                                                AM
                                            </button>
                                            <button
                                                className={`period-btn ${selectedPeriod === 'PM' ? 'selected' : ''}`}
                                                onClick={() => setSelectedPeriod('PM')}
                                            >
                                                PM
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {step === 2 && (
                        <>
                            <button className="secondary-btn" onClick={() => setStep(1)}>Back</button>
                            <button
                                className="primary-btn"
                                onClick={handleSave}
                                disabled={
                                    (taskType === 'custom' && !customTitle) ||
                                    (taskType === 'chapter' && (!selectedSubject || !selectedChapterSerial || selectedMaterial.length === 0))
                                }
                            >
                                {taskToEdit ? 'Save Changes' : 'Add Task'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div >
    );
}
