import React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Chapter, ChapterProgress, Priority } from '../../../shared/types';
import { GripVertical, ChevronRight } from 'lucide-react';
import { getTotalAttemptedQuestions, hasChapterDetailData } from '../utils/chapterDetail';

interface MobileChapterCardProps {
  chapter: Chapter;
  index: number;
  materialNames: string[];
  progress: ChapterProgress | undefined;
  isEditing: boolean;
  canReorder: boolean;
  onOpenDetails: (serial: number) => void;
  onDragEnd?: () => void;
}

function getPriorityLabel(priority: Priority): string {
  if (priority === 'none') return 'No Priority';
  return `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`;
}

function MobileChapterCardComponent({
  chapter,
  index,
  materialNames,
  progress,
  isEditing,
  canReorder,
  onOpenDetails,
  onDragEnd,
}: MobileChapterCardProps) {
  const dragControls = useDragControls();
  const completed = progress?.completed || {};
  const priority = progress?.priority || 'none';
  const subtopics = chapter.subtopics || [];

  const completedCount =
    subtopics.length > 0
      ? subtopics.reduce((acc, sub) => {
          const subState = progress?.subtopics?.[sub];
          materialNames.forEach((mat) => {
            if (subState?.completed?.[mat]) acc++;
          });
          return acc;
        }, 0)
      : materialNames.filter((m) => completed[m]).length;

  const totalCount =
    subtopics.length > 0 ? subtopics.length * materialNames.length : materialNames.length;

  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFullyCompleted = totalCount > 0 && completedCount === totalCount;
  const hasDetailData = hasChapterDetailData(progress);
  const totalAttempted = getTotalAttemptedQuestions(progress);

  const cardStateClass = isFullyCompleted
    ? 'completed'
    : priority !== 'none'
      ? `priority-${priority}`
      : '';

  const isDragEnabled = isEditing && canReorder;

  const cardProps = {
    className: `mobile-chapter-card ${cardStateClass}`,
    onClick: () => onOpenDetails(chapter.serial),
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') onOpenDetails(chapter.serial);
    },
  };

  const innerContent = (
    <>
      <div className="mobile-chapter-card-top">
        <div className="mobile-chapter-title-wrap">
          {isDragEnabled && (
            <span 
              className="mobile-chapter-drag-handle" 
              aria-hidden="true"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
            >
              <GripVertical size={18} />
            </span>
          )}
          <span className="mobile-chapter-index">#{index + 1}</span>
          <span className={`mobile-chapter-name ${isFullyCompleted ? 'completed' : ''}`}>
            {chapter.name}
          </span>
          {hasDetailData && (
            <span className="chapter-detail-dot" aria-label="Has detail tracking">
              •
            </span>
          )}
        </div>
        <ChevronRight size={18} className="mobile-chapter-chevron" />
      </div>

      <div className="mobile-chapter-meta">
        <span
          className={`mobile-priority-badge ${priority !== 'none' ? `priority-${priority}` : ''}`}
        >
          {getPriorityLabel(priority)}
        </span>
        <span className="mobile-completion-label">
          {completedCount}/{totalCount} done
        </span>
        {totalAttempted > 0 && <span className="chapter-question-badge">{totalAttempted} qs</span>}
      </div>

      <div className="mobile-progress-track" aria-hidden="true">
        <span className="mobile-progress-fill" style={{ width: `${completionPct}%` }} />
      </div>
    </>
  );

  if (isDragEnabled) {
    return (
      <Reorder.Item
        as="div"
        value={chapter}
        dragListener={false}
        dragControls={dragControls}
        onDragEnd={onDragEnd}
        style={{ userSelect: 'none' }}
        {...cardProps}
      >
        {innerContent}
      </Reorder.Item>
    );
  }

  return (
    <div
      {...cardProps}
    >
      {innerContent}
    </div>
  );
}

export const MobileChapterCard = React.memo(MobileChapterCardComponent);
