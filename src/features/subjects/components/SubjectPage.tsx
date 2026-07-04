import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, Reorder } from 'framer-motion';
import {
  Subject,
  SubjectData,
  SubjectProgress,
  Priority,
  Chapter,
  ChapterDetailProgress,
} from '../../../shared/types';
import { LeftChapterRow, MiddleChapterRow, RightChapterRow } from './ChapterRow';
import { SubjectHeader } from './SubjectHeader';
import { PriorityFilterDropdown } from './PriorityFilterDropdown';
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal';
import { InputModal } from '../../../shared/components/ui/InputModal';
import { triggerConfetti } from '../../../shared/utils/confetti';
import { Plus, X as XIcon } from 'lucide-react';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { useChapterSort } from '../hooks/useChapterSort';

import { useTheme } from '../../../core/context/ThemeContext';
import { MobileChapterCard } from './MobileChapterCard';
import { ChapterDetailDrawer } from './ChapterDetailDrawer';

interface SubjectPageProps {
  subject: Subject;
  data: SubjectData | null;
  progress: SubjectProgress;
  subjectProgress: number;
  onToggleMaterial: (chapterSerial: number, material: string) => void;
  onSetPriority: (chapterSerial: number, priority: Priority) => void;
  onUpdateChapterDetail: (chapterSerial: number, patch: Partial<ChapterDetailProgress>) => void;
  onToggleSubtopicMaterial: (chapterSerial: number, subtopicName: string, material: string) => void;
  onUpdateSubtopicAttempted: (
    chapterSerial: number,
    subtopicName: string,
    material: string,
    count: number
  ) => void;
  onSetSubtopicLastRevised: (
    chapterSerial: number,
    subtopicName: string,
    date: string | undefined
  ) => void;
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
  onUpdateChapterDetail,
  onToggleSubtopicMaterial,
  onUpdateSubtopicAttempted,
  onSetSubtopicLastRevised,
  onAddMaterial,
  onRemoveMaterial,
  onAddChapter,
  onRemoveChapter,
  onRenameChapter,
  onReorderChapters,
  onReorderMaterials,
}: SubjectPageProps) {
  const { accentColor } = useTheme();
  const [isEditing, setIsEditing] = useState(false);

  // Priority Filter State - Persistent per subject
  const [priorityFilter, setPriorityFilter] = useLocalStorage<Priority | 'all'>(
    `jee-tracker-filter-${subject}`,
    'all'
  );

  // Material Modals
  const [deleteMaterialState, setDeleteMaterialState] = useState<{
    isOpen: boolean;
    material: string | null;
  }>({
    isOpen: false,
    material: null,
  });
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);

  // Chapter Modals
  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<{
    isOpen: boolean;
    serial: number | null;
    name: string;
  }>({
    isOpen: false,
    serial: null,
    name: '',
  });
  const [selectedChapterSerial, setSelectedChapterSerial] = useState<number | null>(null);
  const [hoveredChapterSerial, setHoveredChapterSerial] = useState<number | null>(null);

  // Hooks
  const sortedChapters = useChapterSort(data?.chapters || [], progress, priorityFilter);

  // Sync top and bottom horizontal scrollbars
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const [hasScrollbar, setHasScrollbar] = useState(false);

  const updateTableWidth = useCallback(() => {
    if (tableRef.current && tableContainerRef.current) {
      const width = tableRef.current.scrollWidth;
      const containerWidth = tableContainerRef.current.clientWidth;
      setTableWidth(width);
      setHasScrollbar(width > containerWidth);
    }
  }, []);

  useEffect(() => {
    updateTableWidth();

    const observer = new ResizeObserver(updateTableWidth);
    const container = tableContainerRef.current;
    if (container) observer.observe(container);

    const table = tableRef.current;
    if (table) observer.observe(table);

    return () => {
      observer.disconnect();
    };
  }, [data, sortedChapters, isEditing, updateTableWidth]);

  const [localChapters, setLocalChapters] = useState<Chapter[]>(sortedChapters);
  useEffect(() => {
    setLocalChapters(sortedChapters);
  }, [sortedChapters]);

  const [localMaterials, setLocalMaterials] = useState<string[]>(data?.materialNames || []);
  useEffect(() => {
    setLocalMaterials(data?.materialNames || []);
  }, [data?.materialNames]);


  // Stabilized callbacks for ChapterRow memoization
  const handleToggleMaterialWithConfetti = useCallback(
    (chapterSerial: number, material: string) => {
      if (!data) return;

      const chapterProgress = progress[chapterSerial]?.completed || {};
      const wasCompleted = !!chapterProgress[material];

      // Check if this toggle will complete the chapter
      if (!wasCompleted) {
        const completedCount = data.materialNames.filter((m) => chapterProgress[m]).length;
        const willBeComplete = completedCount + 1 === data.materialNames.length;

        if (willBeComplete) {
          setTimeout(() => triggerConfetti(accentColor), 50);
        }
      }

      onToggleMaterial(chapterSerial, material);
    },
    [data, progress, onToggleMaterial]
  );

  const handleAddMaterial = useCallback(
    (name: string) => {
      if (onAddMaterial && name && name.trim()) {
        onAddMaterial(name.trim());
      }
      setIsAddMaterialModalOpen(false);
    },
    [onAddMaterial]
  );

  const confirmDeleteMaterial = useCallback(() => {
    if (onRemoveMaterial && deleteMaterialState.material) {
      onRemoveMaterial(deleteMaterialState.material);
    }
    setDeleteMaterialState({ isOpen: false, material: null });
  }, [onRemoveMaterial, deleteMaterialState.material]);

  const handleAddChapter = useCallback(
    (name: string) => {
      if (onAddChapter && name && name.trim()) {
        onAddChapter(name.trim());
      }
      setIsAddChapterModalOpen(false);
    },
    [onAddChapter]
  );

  const confirmDeleteChapter = useCallback(() => {
    if (onRemoveChapter && chapterToDelete.serial !== null) {
      onRemoveChapter(chapterToDelete.serial);
    }
    setChapterToDelete({ isOpen: false, serial: null, name: '' });
  }, [onRemoveChapter, chapterToDelete.serial]);

  const localChaptersRef = useRef(localChapters);
  useEffect(() => {
    localChaptersRef.current = localChapters;
  }, [localChapters]);

  const handleOpenDetails = useCallback((serial: number) => {
    setSelectedChapterSerial(serial);
  }, []);

  const handleMouseEnterRow = useCallback((serial: number) => {
    setHoveredChapterSerial(serial);
  }, []);

  const handleMouseLeaveRow = useCallback(() => {
    setHoveredChapterSerial(null);
  }, []);

  const handleDeleteClick = useCallback((serial: number, name: string) => {
    setChapterToDelete({
      isOpen: true,
      serial,
      name,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    if (onReorderChapters) {
      onReorderChapters(localChaptersRef.current);
    }
  }, [onReorderChapters]);

  // Loading state
  if (!data) {
    return (
      <div className="subject-page loading">
        <div className="loader"></div>
        <p>Loading chapters...</p>
      </div>
    );
  }

  const selectedChapter =
    selectedChapterSerial !== null
      ? data.chapters.find((ch) => ch.serial === selectedChapterSerial) || null
      : null;

  const selectedChapterProgress = selectedChapter ? progress[selectedChapter.serial] : undefined;

  return (
    <div className="subject-page">
      <div>
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
      </div>

      {hasScrollbar && (
        <div className="double-scroll-row">
          <div className="left-scroll-spacer" />
          <div
            className="double-scroll-wrapper"
            ref={topScrollRef}
            onScroll={() => {
              if (topScrollRef.current && tableContainerRef.current) {
                tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
              }
            }}
          >
            <div style={{ width: tableWidth, height: '1px' }} />
          </div>
          <div className="right-scroll-spacer" />
        </div>
      )}
      <div className="chapter-table-container desktop-chapter-table">
        {/* Left Table: Serial & Chapter */}
        <div className="left-table-section">
          <table className="chapter-table">
            <thead>
              <tr>
                <th className="serial-header">#</th>
                <th className="chapter-header">Chapter</th>
              </tr>
            </thead>
            {(() => {
              const rows = data && localChapters.map((chapter, index) => {
                const chProgress = progress[chapter.serial];
                const completed = chProgress?.completed || {};
                const completedCount = data.materialNames.filter((m) => completed[m]).length;
                const isFullyCompleted =
                  completedCount === data.materialNames.length && data.materialNames.length > 0;
                const priority = chProgress?.priority || 'none';
                const priorityClass = isEditing
                  ? ''
                  : isFullyCompleted
                    ? 'completed'
                    : priority !== 'none'
                      ? `priority-${priority}`
                      : '';

                return (
                  <LeftChapterRow
                    key={chapter.serial}
                    chapter={chapter}
                    index={index}
                    progress={chProgress}
                    isEditing={isEditing}
                    onRename={onRenameChapter}
                    onOpenDetails={handleOpenDetails}
                    isHovered={hoveredChapterSerial === chapter.serial}
                    onMouseEnter={handleMouseEnterRow}
                    onMouseLeave={handleMouseLeaveRow}
                    priorityClass={priorityClass}
                    onDragEnd={onReorderChapters ? handleDragEnd : undefined}
                  />
                );
              });

              return isEditing && priorityFilter === 'all' ? (
                <Reorder.Group
                  as="tbody"
                  axis="y"
                  values={localChapters}
                  onReorder={setLocalChapters}
                >
                  {rows}
                </Reorder.Group>
              ) : (
                <tbody>
                  {rows}
                </tbody>
              );
            })()}
          </table>
        </div>

        {/* Middle Table: Study Materials (scrollable) */}
        <div
          className="middle-table-section"
          ref={tableContainerRef}
          onScroll={() => {
            if (tableContainerRef.current && topScrollRef.current) {
              topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
            }
          }}
        >
          <table className="chapter-table" ref={tableRef}>
            <thead>
              {isEditing ? (
                <Reorder.Group
                  as="tr"
                  axis="x"
                  values={localMaterials}
                  onReorder={setLocalMaterials}
                >
                  {data &&
                    localMaterials.map((material) => (
                      <Reorder.Item
                        as="th"
                        key={material}
                        value={material}
                        dragListener={isEditing}
                        onDragEnd={() => onReorderMaterials?.(localMaterials)}
                        className={`material-header ${isEditing ? 'material-header-draggable' : ''}`}
                      >
                        <div className="material-header-content">
                          <span>{material}</span>
                        </div>
                      </Reorder.Item>
                    ))}
                </Reorder.Group>
              ) : (
                <tr>
                  {data &&
                    localMaterials.map((material) => (
                      <th
                        key={material}
                        className="material-header"
                      >
                        <div className="material-header-content">
                          <span>{material}</span>
                          {onRemoveMaterial && (
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
                </tr>
              )}
            </thead>
            <tbody>
              {data &&
                localChapters.map((chapter) => {
                  const chProgress = progress[chapter.serial];
                  const completed = chProgress?.completed || {};
                  const completedCount = data.materialNames.filter((m) => completed[m]).length;
                  const isFullyCompleted =
                    completedCount === data.materialNames.length && data.materialNames.length > 0;
                  const priority = chProgress?.priority || 'none';
                  const priorityClass = isEditing
                    ? ''
                    : isFullyCompleted
                      ? 'completed'
                      : priority !== 'none'
                        ? `priority-${priority}`
                        : '';

                  return (
                    <MiddleChapterRow
                      key={chapter.serial}
                      chapter={chapter}
                      materialNames={localMaterials}
                      progress={chProgress}
                      onToggleMaterial={handleToggleMaterialWithConfetti}
                      isHovered={hoveredChapterSerial === chapter.serial}
                      onMouseEnter={handleMouseEnterRow}
                      onMouseLeave={handleMouseLeaveRow}
                      priorityClass={priorityClass}
                      onOpenDetails={handleOpenDetails}
                      isEditing={isEditing}
                    />
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Right Table: Priority */}
        <div className="right-table-section">
          <table className="chapter-table">
            <thead>
              <tr>
                <th className="priority-header">
                  {isEditing ? (
                    'Actions'
                  ) : (
                    <div className="priority-header-content">
                      <span>Status</span>
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
              {data &&
                localChapters.map((chapter) => {
                  const chProgress = progress[chapter.serial];
                  const completed = chProgress?.completed || {};
                  const completedCount = data.materialNames.filter((m) => completed[m]).length;
                  const isFullyCompleted =
                    completedCount === data.materialNames.length && data.materialNames.length > 0;
                  const priority = chProgress?.priority || 'none';
                  const priorityClass = isEditing
                    ? ''
                    : isFullyCompleted
                      ? 'completed'
                      : priority !== 'none'
                        ? `priority-${priority}`
                        : '';

                  return (
                    <RightChapterRow
                      key={chapter.serial}
                      chapter={chapter}
                      materialNames={localMaterials}
                      progress={chProgress}
                      onSetPriority={onSetPriority}
                      isEditing={isEditing}
                      onDelete={handleDeleteClick}
                      isHovered={hoveredChapterSerial === chapter.serial}
                      onMouseEnter={handleMouseEnterRow}
                      onMouseLeave={handleMouseLeaveRow}
                      priorityClass={priorityClass}
                      onOpenDetails={handleOpenDetails}
                    />
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

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

        {isEditing && priorityFilter === 'all' ? (
          <Reorder.Group
            as="div"
            axis="y"
            values={localChapters}
            onReorder={setLocalChapters}
            className="mobile-chapter-list"
          >
            {localChapters.map((chapter, index) => (
              <MobileChapterCard
                key={chapter.serial}
                chapter={chapter}
                index={index}
                materialNames={localMaterials}
                progress={progress[chapter.serial]}
                isEditing={isEditing}
                canReorder={true}
                onOpenDetails={handleOpenDetails}
                onDragEnd={onReorderChapters ? handleDragEnd : undefined}
              />
            ))}
          </Reorder.Group>
        ) : (
          <div className="mobile-chapter-list">
            {localChapters.map((chapter, index) => (
              <MobileChapterCard
                key={chapter.serial}
                chapter={chapter}
                index={index}
                materialNames={localMaterials}
                progress={progress[chapter.serial]}
                isEditing={isEditing}
                canReorder={false}
                onOpenDetails={handleOpenDetails}
              />
            ))}
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

      <AnimatePresence>
        {selectedChapter && (
          <ChapterDetailDrawer
            key={`${subject}-${selectedChapter.serial}`}
            chapter={selectedChapter}
            materialNames={data.materialNames}
            progress={selectedChapterProgress}
            onClose={() => setSelectedChapterSerial(null)}
            onToggleMaterial={handleToggleMaterialWithConfetti}
            onSetPriority={onSetPriority}
            onUpdateDetail={onUpdateChapterDetail}
            onToggleSubtopicMaterial={(subtopicName, material) =>
              onToggleSubtopicMaterial(selectedChapter.serial, subtopicName, material)
            }
            onUpdateSubtopicAttempted={(subtopicName, material, count) =>
              onUpdateSubtopicAttempted(selectedChapter.serial, subtopicName, material, count)
            }
            onSetSubtopicLastRevised={(subtopicName, date) =>
              onSetSubtopicLastRevised(selectedChapter.serial, subtopicName, date)
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
