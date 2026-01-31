import { useState, useRef, useEffect } from 'react';
import { Subject, SubjectData, SubjectProgress, Priority, Chapter } from '../../../shared/types';
import { ChapterRow } from './ChapterRow';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal';
import { InputModal } from '../../../shared/components/ui/InputModal';
import { triggerConfetti } from '../../../shared/utils/confetti';
import { Atom, FlaskConical, Calculator, Plus, X as XIcon, Pencil, Check, Filter } from 'lucide-react';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';

interface SubjectPageProps {
    subject: Subject;
    data: SubjectData | null;
    progress: SubjectProgress;
    subjectProgress: number;
    onToggleMaterial: (chapterSerial: number, material: string) => void;
    onSetPriority: (chapterSerial: number, priority: Priority) => void;
    onAddMaterial?: (name: string) => void;
    onRemoveMaterial?: (name: string) => void;
    onAddChapter?: (name: string) => void;
    onRemoveChapter?: (serial: number) => void;
    onRenameChapter?: (serial: number, name: string) => void;
    onReorderChapters?: (chapters: Chapter[]) => void;
    onReorderMaterials?: (materials: string[]) => void;
}

const subjectConfig: Record<Subject, { label: string; icon: React.ReactNode; color: string }> = {
    physics: { label: 'Physics', icon: <Atom size={32} />, color: '#6366f1' },
    chemistry: { label: 'Chemistry', icon: <FlaskConical size={32} />, color: '#10b981' },
    maths: { label: 'Maths', icon: <Calculator size={32} />, color: '#f59e0b' },
};

export function SubjectPage({
    subject,
    data,
    progress,
    subjectProgress,
    onToggleMaterial,
    onSetPriority,
    onAddMaterial,
    onRemoveMaterial,
    onAddChapter,
    onRemoveChapter,
    onRenameChapter,
    onReorderChapters,
    onReorderMaterials
}: SubjectPageProps) {
    const config = subjectConfig[subject];
    const [isEditing, setIsEditing] = useState(false);

    // Priority Filter State - Persistent per subject
    const [priorityFilter, setPriorityFilter] = useLocalStorage<Priority | 'all'>(`jee-tracker-filter-${subject}`, 'all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // Material Modals
    const [deleteMaterialState, setDeleteMaterialState] = useState<{ isOpen: boolean; material: string | null }>({
        isOpen: false,
        material: null
    });
    const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);

    // Chapter Modals
    const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
    const [chapterToDelete, setChapterToDelete] = useState<{ isOpen: boolean; serial: number | null; name: string }>({
        isOpen: false,
        serial: null,
        name: ''
    });

    // Drag and Drop (Rows)
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Drag and Drop (Materials/Columns)
    const dragMaterial = useRef<number | null>(null);
    const dragOverMaterial = useRef<number | null>(null);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!data) {
        return (
            <div className="subject-page loading">
                <div className="loader"></div>
                <p>Loading {config.label} chapters...</p>
            </div>
        );
    }

    const handleAddMaterial = (name: string) => {
        if (onAddMaterial && name && name.trim()) {
            onAddMaterial(name.trim());
        }
        setIsAddMaterialModalOpen(false);
    };

    // Wrapper to trigger confetti when completing a chapter
    const handleToggleMaterialWithConfetti = (chapterSerial: number, material: string) => {
        if (!data) return;

        const chapterProgress = progress[chapterSerial]?.completed || {};
        const wasCompleted = !!chapterProgress[material];

        // Check if this toggle will complete the chapter
        if (!wasCompleted) {
            const completedCount = data.materialNames.filter(m => chapterProgress[m]).length;
            const willBeComplete = completedCount + 1 === data.materialNames.length;

            if (willBeComplete) {
                const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6366f1';
                // Delay confetti slightly so the UI updates first
                setTimeout(() => triggerConfetti(accentColor), 50);
            }
        }

        onToggleMaterial(chapterSerial, material);
    };

    const confirmDeleteMaterial = () => {
        if (onRemoveMaterial && deleteMaterialState.material) {
            onRemoveMaterial(deleteMaterialState.material);
        }
        setDeleteMaterialState({ isOpen: false, material: null });
    };

    const handleAddChapter = (name: string) => {
        if (onAddChapter && name && name.trim()) {
            onAddChapter(name.trim());
        }
        setIsAddChapterModalOpen(false);
    };

    const confirmDeleteChapter = () => {
        if (onRemoveChapter && chapterToDelete.serial !== null) {
            onRemoveChapter(chapterToDelete.serial);
        }
        setChapterToDelete({ isOpen: false, serial: null, name: '' });
    };

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = "move";
        // Make the drag image transparent or styled if needed, but default is usually okay
        // e.dataTransfer.setDragImage(e.currentTarget, 0, 0); 
    };

    const handleDragEnter = (_e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        dragOverItem.current = index;

        // Disable reordering if filtered
        if (priorityFilter !== 'all') return;

        // Optional: Implement live reordering here for smoother feel
        // For now, we will stick to reorder on drop or we can try live swap
        if (!onReorderChapters || !data) return;

        if (dragItem.current !== null && dragItem.current !== index) {
            const newChapters = [...data.chapters];
            const draggedItemContent = newChapters[dragItem.current];
            newChapters.splice(dragItem.current, 1);
            newChapters.splice(index, 0, draggedItemContent);

            onReorderChapters(newChapters);
            dragItem.current = index;
        }
    };

    const handleDragEnd = () => {
        dragItem.current = null;
        dragOverItem.current = null;
    };

    // Material Column Drag Handlers
    const handleDragStartMaterial = (e: React.DragEvent<HTMLTableHeaderCellElement>, index: number) => {
        dragMaterial.current = index;
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnterMaterial = (_e: React.DragEvent<HTMLTableHeaderCellElement>, index: number) => {
        dragOverMaterial.current = index;
        if (!onReorderMaterials || !data || dragMaterial.current === null) return;

        if (dragMaterial.current !== index) {
            const newMaterials = [...data.materialNames];
            const draggedItemContent = newMaterials[dragMaterial.current];
            newMaterials.splice(dragMaterial.current, 1);
            newMaterials.splice(index, 0, draggedItemContent);

            onReorderMaterials(newMaterials);
            dragMaterial.current = index;
        }
    };

    const handleDragEndMaterial = () => {
        dragMaterial.current = null;
        dragOverMaterial.current = null;
    };

    return (
        <div className="subject-page">
            <div className="subject-header">
                <div className="subject-title">
                    <span className="subject-icon-large">{config.icon}</span>
                    <div>
                        <div className="subject-title-row">
                            <h1>{config.label}</h1>
                            {onAddChapter && (
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
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
                            {onAddMaterial && !isEditing && (
                                <button
                                    className="add-material-btn"
                                    onClick={() => setIsAddMaterialModalOpen(true)}
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

            <div className="chapter-table-container">
                <table className="chapter-table">
                    <thead>
                        <tr>
                            <th className="serial-header">#</th>
                            <th className="chapter-header">Chapter</th>
                            {data.materialNames.map((material, mIndex) => (
                                <th
                                    key={material}
                                    className={`material-header ${isEditing ? 'material-header-draggable' : ''}`}
                                    draggable={isEditing}
                                    onDragStart={(e) => handleDragStartMaterial(e, mIndex)}
                                    onDragEnter={(e) => handleDragEnterMaterial(e, mIndex)}
                                    onDragEnd={handleDragEndMaterial}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <div className="material-header-content">
                                        <span>{material}</span>

                                        {!isEditing && onRemoveMaterial && (
                                            <button
                                                className="remove-material-btn"
                                                onClick={() => setDeleteMaterialState({ isOpen: true, material })}
                                                title="Remove column"
                                            >
                                                <XIcon size={14} />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="priority-header">
                                {isEditing ? 'Actions' : (
                                    <div className="priority-header-content">
                                        <span>Priority</span>
                                        <div ref={filterRef} className="filter-wrapper">
                                            <button
                                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                                className="filter-icon-btn"
                                                title={`Filter: ${priorityFilter === 'all' ? 'All' : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}`}
                                            >
                                                <Filter size={16} />
                                                {priorityFilter !== 'all' && (
                                                    <span className="filter-dot" />
                                                )}
                                            </button>
                                            {isFilterOpen && (
                                                <div className="filter-dropdown-menu">
                                                    {[
                                                        { value: 'all', label: 'All', color: 'var(--text-muted)' },
                                                        { value: 'high', label: 'High', color: 'var(--priority-high)' },
                                                        { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
                                                        { value: 'low', label: 'Low', color: 'var(--priority-low)' },
                                                        { value: 'none', label: 'None', color: 'var(--text-muted)' }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => {
                                                                setPriorityFilter(opt.value as Priority | 'all');
                                                                setIsFilterOpen(false);
                                                            }}
                                                            className={`filter-option-btn ${priorityFilter === opt.value ? 'active' : ''}`}
                                                            style={{ color: opt.color }}
                                                        >
                                                            <span>{opt.label}</span>
                                                            {priorityFilter === opt.value && <span className="check-icon">✓</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            let sortedChapters = [...data.chapters];

                            if (priorityFilter !== 'all') {
                                const getPriorityWeight = (p: Priority) => {
                                    switch (p) {
                                        case 'high': return 3;
                                        case 'medium': return 2;
                                        case 'low': return 1;
                                        default: return 0;
                                    }
                                };

                                sortedChapters.sort((a, b) => {
                                    const pA = progress[a.serial]?.priority || 'none';
                                    const pB = progress[b.serial]?.priority || 'none';

                                    // If one matches the filter and the other doesn't, the match comes first
                                    if (pA === priorityFilter && pB !== priorityFilter) return -1;
                                    if (pA !== priorityFilter && pB === priorityFilter) return 1;

                                    // Otherwise sort by weight descending (High > Medium > Low > None)
                                    return getPriorityWeight(pB) - getPriorityWeight(pA);
                                });
                            }

                            return sortedChapters.map((chapter, index) => (
                                <ChapterRow
                                    key={chapter.serial}
                                    chapter={chapter}
                                    index={index}
                                    materialNames={data.materialNames}
                                    progress={progress[chapter.serial]}
                                    onToggleMaterial={handleToggleMaterialWithConfetti}
                                    onSetPriority={onSetPriority}
                                    isEditing={isEditing}
                                    onRename={(name) => onRenameChapter?.(chapter.serial, name)}
                                    onDelete={() => setChapterToDelete({ isOpen: true, serial: chapter.serial, name: chapter.name })}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                    onDragEnd={handleDragEnd}
                                />
                            ));
                        })()}
                    </tbody>
                </table>
                {isEditing && (
                    <div className="edit-actions-container">
                        <button
                            onClick={() => setIsAddChapterModalOpen(true)}
                            className="primary-btn add-chapter-btn-wrapper"
                        >
                            <Plus size={18} />
                            Add New Chapter
                        </button>
                    </div>
                )}
            </div>

            <div className="legend">
                <h4>Priority Legend</h4>
                <div className="legend-items">
                    <div className="legend-item">
                        <span className="legend-color high"></span>
                        <span>High Priority</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color medium"></span>
                        <span>Medium Priority</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color low"></span>
                        <span>Low Priority</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color completed"></span>
                        <span>Completed</span>
                    </div>
                </div>
            </div>

            {/* Material Modals */}
            <ConfirmationModal
                isOpen={deleteMaterialState.isOpen}
                title="Remove Study Material"
                message={`Are you sure you want to remove the '${deleteMaterialState.material}' column? This will hide it from your view.`}
                onConfirm={confirmDeleteMaterial}
                onCancel={() => setDeleteMaterialState({ isOpen: false, material: null })}
            />

            <InputModal
                isOpen={isAddMaterialModalOpen}
                title="Add Study Material"
                message="Enter the name of the new study material (e.g., 'YouTube', 'Notes'):"
                placeholder="Material Name"
                onConfirm={handleAddMaterial}
                onCancel={() => setIsAddMaterialModalOpen(false)}
            />

            {/* Chapter Modals */}
            <ConfirmationModal
                isOpen={chapterToDelete.isOpen}
                title="Delete Chapter"
                message={`Are you sure you want to delete '${chapterToDelete.name}'? This action cannot be undone and you will lose all progress for this chapter.`}
                onConfirm={confirmDeleteChapter}
                onCancel={() => setChapterToDelete({ isOpen: false, serial: null, name: '' })}
            />

            <InputModal
                isOpen={isAddChapterModalOpen}
                title="Add New Chapter"
                message="Enter the name of the new chapter:"
                placeholder="Chapter Name"
                onConfirm={handleAddChapter}
                onCancel={() => setIsAddChapterModalOpen(false)}
            />
        </div >
    );
}
