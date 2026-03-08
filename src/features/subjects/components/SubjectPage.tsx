import { useState, useCallback } from 'react';
import { Subject, SubjectData, SubjectProgress, Priority, Chapter } from '../../../shared/types';
import { ChapterRow } from './ChapterRow';
import { SubjectHeader } from './SubjectHeader';
import { PriorityFilterDropdown } from './PriorityFilterDropdown';
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal';
import { InputModal } from '../../../shared/components/ui/InputModal';
import { triggerConfetti } from '../../../shared/utils/confetti';
import { Plus, X as XIcon, Square, CheckSquare } from 'lucide-react';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { useChapterSort } from '../hooks/useChapterSort';
import { useReorderDrag } from '../hooks/useReorderDrag';
import { useTheme } from '../../../core/context/ThemeContext';
import { PrioritySelector } from '../../../shared/components/ui/PrioritySelector';
import { MobileChapterCard } from './MobileChapterCard';

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
    const { accentColor } = useTheme();
    const [isEditing, setIsEditing] = useState(false);

    // Priority Filter State - Persistent per subject
    const [priorityFilter, setPriorityFilter] = useLocalStorage<Priority | 'all'>(`jee-tracker-filter-${subject}`, 'all');

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
    const [selectedChapterSerial, setSelectedChapterSerial] = useState<number | null>(null);

    // Hooks
    const sortedChapters = useChapterSort(data?.chapters || [], progress, priorityFilter);

    const chapterDrag = useReorderDrag<Chapter, HTMLTableRowElement>(
        data?.chapters || [],
        onReorderChapters,
        isEditing && priorityFilter === 'all'
    );

    const chapterDragMobile = useReorderDrag<Chapter, HTMLDivElement>(
        data?.chapters || [],
        onReorderChapters,
        isEditing && priorityFilter === 'all'
    );

    const materialDrag = useReorderDrag<string, HTMLTableHeaderCellElement>(
        data?.materialNames || [],
        onReorderMaterials,
        isEditing
    );

    // Loading state
    if (!data) {
        return (
            <div className="subject-page loading">
                <div className="loader"></div>
                <p>Loading chapters...</p>
            </div>
        );
    }

    // Stabilized callbacks for ChapterRow memoization
    const handleToggleMaterialWithConfetti = useCallback((chapterSerial: number, material: string) => {
        if (!data) return;

        const chapterProgress = progress[chapterSerial]?.completed || {};
        const wasCompleted = !!chapterProgress[material];

        // Check if this toggle will complete the chapter
        if (!wasCompleted) {
            const completedCount = data.materialNames.filter(m => chapterProgress[m]).length;
            const willBeComplete = completedCount + 1 === data.materialNames.length;

            if (willBeComplete) {
                setTimeout(() => triggerConfetti(accentColor), 50);
            }
        }

        onToggleMaterial(chapterSerial, material);
    }, [data, progress, onToggleMaterial]);

    const handleAddMaterial = useCallback((name: string) => {
        if (onAddMaterial && name && name.trim()) {
            onAddMaterial(name.trim());
        }
        setIsAddMaterialModalOpen(false);
    }, [onAddMaterial]);

    const confirmDeleteMaterial = useCallback(() => {
        if (onRemoveMaterial && deleteMaterialState.material) {
            onRemoveMaterial(deleteMaterialState.material);
        }
        setDeleteMaterialState({ isOpen: false, material: null });
    }, [onRemoveMaterial, deleteMaterialState.material]);

    const handleAddChapter = useCallback((name: string) => {
        if (onAddChapter && name && name.trim()) {
            onAddChapter(name.trim());
        }
        setIsAddChapterModalOpen(false);
    }, [onAddChapter]);

    const confirmDeleteChapter = useCallback(() => {
        if (onRemoveChapter && chapterToDelete.serial !== null) {
            onRemoveChapter(chapterToDelete.serial);
        }
        setChapterToDelete({ isOpen: false, serial: null, name: '' });
    }, [onRemoveChapter, chapterToDelete.serial]);

    const selectedChapter = selectedChapterSerial !== null
        ? data.chapters.find((ch) => ch.serial === selectedChapterSerial) || null
        : null;

    const selectedChapterProgress = selectedChapter ? progress[selectedChapter.serial] : undefined;

    return (
        <div className="subject-page">
            <SubjectHeader
                subject={subject}
                data={data}
                subjectProgress={subjectProgress}
                isEditing={isEditing}
                onToggleEditing={() => setIsEditing(!isEditing)}
                canEdit={!!onAddChapter}
                canAddMaterial={!!onAddMaterial}
                onAddMaterial={() => setIsAddMaterialModalOpen(true)}
            />

            <div className="chapter-table-container desktop-chapter-table">
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
                                    onDragStart={(e) => materialDrag.onDragStart(e, mIndex)}
                                    onDragEnter={(e) => materialDrag.onDragEnter(e, mIndex)}
                                    onDragEnd={materialDrag.onDragEnd}
                                    onDragOver={materialDrag.onDragOver}
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
                                        <PriorityFilterDropdown
                                            priorityFilter={priorityFilter}
                                            onFilterChange={setPriorityFilter}
                                        />
                                    </div>
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedChapters.map((chapter, index) => (
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
                                onDragStart={(e) => chapterDrag.onDragStart(e, index)}
                                onDragEnter={(e) => chapterDrag.onDragEnter(e, index)}
                                onDragEnd={chapterDrag.onDragEnd}
                            />
                        ))}
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

            <div className="mobile-chapter-view">
                <div className="mobile-chapter-controls">
                    <div className="mobile-priority-filter">
                        <span className="mobile-control-label">Filter</span>
                        <PriorityFilterDropdown
                            priorityFilter={priorityFilter}
                            onFilterChange={setPriorityFilter}
                        />
                    </div>
                    {isEditing && (
                        <button
                            onClick={() => setIsAddChapterModalOpen(true)}
                            className="primary-btn mobile-add-chapter-btn"
                        >
                            <Plus size={16} />
                            Add Chapter
                        </button>
                    )}
                </div>

                <div className="mobile-material-strip">
                    {data.materialNames.map((material) => (
                        <button
                            key={material}
                            className="mobile-material-pill"
                            onClick={() => {
                                if (!isEditing && onRemoveMaterial) {
                                    setDeleteMaterialState({ isOpen: true, material });
                                }
                            }}
                            title={!isEditing && onRemoveMaterial ? 'Tap to remove this material column' : material}
                            disabled={isEditing || !onRemoveMaterial}
                        >
                            <span>{material}</span>
                            {!isEditing && onRemoveMaterial && <XIcon size={14} />}
                        </button>
                    ))}
                </div>

                <div className="mobile-chapter-list">
                    {sortedChapters.map((chapter, index) => (
                        <MobileChapterCard
                            key={chapter.serial}
                            chapter={chapter}
                            index={index}
                            materialNames={data.materialNames}
                            progress={progress[chapter.serial]}
                            isEditing={isEditing}
                            canReorder={priorityFilter === 'all'}
                            onOpenDetails={() => setSelectedChapterSerial(chapter.serial)}
                            onDragStart={(e) => chapterDragMobile.onDragStart(e, index)}
                            onDragEnter={(e) => chapterDragMobile.onDragEnter(e, index)}
                            onDragEnd={chapterDragMobile.onDragEnd}
                        />
                    ))}
                </div>
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

            {selectedChapter && (
                <div className="modal-overlay" onClick={() => setSelectedChapterSerial(null)}>
                    <div className="modal-content chapter-detail-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Chapter #{selectedChapter.serial}</h3>
                            <button className="close-btn" onClick={() => setSelectedChapterSerial(null)} aria-label="Close chapter details">
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div className="modal-body chapter-detail-body">
                            <div className="chapter-detail-section">
                                <label>Chapter Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="modal-input"
                                        value={selectedChapter.name}
                                        onChange={(e) => onRenameChapter?.(selectedChapter.serial, e.target.value)}
                                    />
                                ) : (
                                    <p className="chapter-detail-title">{selectedChapter.name}</p>
                                )}
                            </div>

                            <div className="chapter-detail-section">
                                <label>Priority</label>
                                <PrioritySelector
                                    priority={selectedChapterProgress?.priority || 'none'}
                                    onChange={(p) => onSetPriority(selectedChapter.serial, p)}
                                />
                            </div>

                            <div className="chapter-detail-section">
                                <label>Materials</label>
                                <div className="chapter-material-list">
                                    {data.materialNames.map((material) => (
                                        <div key={material} className="chapter-material-item">
                                            <span>{material}</span>
                                            <button
                                                type="button"
                                                className="chapter-material-toggle"
                                                onClick={() => handleToggleMaterialWithConfetti(selectedChapter.serial, material)}
                                                aria-label={`Toggle ${material} completion`}
                                                aria-pressed={!!selectedChapterProgress?.completed?.[material]}
                                            >
                                                {selectedChapterProgress?.completed?.[material] ? (
                                                    <CheckSquare size={18} />
                                                ) : (
                                                    <Square size={18} />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {isEditing && (
                            <div className="modal-footer">
                                <button
                                    className="modal-btn confirm"
                                    onClick={() => {
                                        setChapterToDelete({ isOpen: true, serial: selectedChapter.serial, name: selectedChapter.name });
                                        setSelectedChapterSerial(null);
                                    }}
                                >
                                    Delete Chapter
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
