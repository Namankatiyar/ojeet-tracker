import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { Chapter, ChapterProgress, Priority } from '../../../shared/types';
import { PriorityPillSelector } from '../../../shared/components/ui/PriorityPillSelector';
import { Trash2, GripVertical, Star } from 'lucide-react';
import { getTotalAttemptedQuestions, hasChapterDetailData } from '../utils/chapterDetail';
import { formatRelativeTime } from '../../../shared/utils/date';

// ─── Cursor-anchored hover panel (portalled to body) ───────────────────────
interface HoverPanelProps {
  x: number;
  y: number;
  chapterName: string;
  progress?: ChapterProgress;
}

function HoverPanel({ x, y, chapterName, progress }: HoverPanelProps) {
  const PANEL_WIDTH = 280;
  const GAP = 4;

  const leftRaw = x + GAP;
  const overflowsRight = leftRaw + PANEL_WIDTH > window.innerWidth - 12;
  const left = overflowsRight ? x - PANEL_WIDTH - GAP : leftRaw;

  const topRaw = y - 4;
  const ESTIMATED_HEIGHT = 180;
  const overflowsBottom = topRaw + ESTIMATED_HEIGHT > window.innerHeight - 12;
  const top = overflowsBottom ? y - ESTIMATED_HEIGHT + 4 : topRaw;

  const detail = progress?.detail;

  // Confidence color logic
  const confidenceColors: Record<number, string> = {
    1: 'var(--confidence-red)',
    2: 'var(--confidence-amber)',
    3: 'var(--confidence-yellow)',
    4: 'var(--confidence-purple)',
    5: 'var(--confidence-green)',
  };

  const attemptedEntries = detail?.attemptedByMaterial
    ? Object.entries(detail.attemptedByMaterial).filter(([_, count]) => count > 0)
    : [];
  const hasAttempted = attemptedEntries.length > 0;

  const panel = (
    <div
      className="chapter-hover-panel colored-panel"
      style={{ left, top, width: PANEL_WIDTH }}
      role="tooltip"
    >
      <div className="chp-header">
        <span className="chp-title">{chapterName}</span>
        {detail?.confidence && (
          <div className="chp-confidence-stars" title={`Confidence: Level ${detail.confidence}`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                fill={
                  star <= detail.confidence! ? confidenceColors[detail.confidence!] : 'transparent'
                }
                color={
                  star <= detail.confidence!
                    ? confidenceColors[detail.confidence!]
                    : 'color-mix(in srgb, var(--text-muted), transparent 50%)'
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className="chp-body">
        {hasAttempted && (
          <div className="chp-section">
            <div className="chp-section-title">Attempted Questions</div>
            <div className="chp-breakdown">
              {attemptedEntries.map(([material, count]) => (
                <div key={material} className="chp-breakdown-item">
                  <span className="chp-material-name">{material}</span>
                  <span className="chp-material-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(detail?.revisionCount !== undefined && detail?.revisionCount > 0) ||
        (detail?.targetRevisionCount !== undefined && detail?.targetRevisionCount > 0) ||
        (detail?.lectureCount !== undefined && detail?.lectureCount > 0) ||
        (detail?.targetLectureCount !== undefined && detail?.targetLectureCount > 0) ||
        detail?.lastRevised ? (
          <div className="chp-section chp-row-stats">
            {((detail?.revisionCount !== undefined && detail?.revisionCount > 0) ||
              (detail?.targetRevisionCount !== undefined && detail?.targetRevisionCount > 0)) && (
              <div className="chp-stat">
                <span>Revisions</span>
                <span className="chp-stat-val">
                  {detail?.targetRevisionCount !== undefined && detail.targetRevisionCount > 0
                    ? `${detail.revisionCount || 0}/${detail.targetRevisionCount}`
                    : detail.revisionCount}
                </span>
              </div>
            )}
            {((detail?.lectureCount !== undefined && detail?.lectureCount > 0) ||
              (detail?.targetLectureCount !== undefined && detail?.targetLectureCount > 0)) && (
              <div className="chp-stat">
                <span>Lectures</span>
                <span className="chp-stat-val">
                  {detail?.targetLectureCount !== undefined && detail.targetLectureCount > 0
                    ? `${detail.lectureCount || 0}/${detail.targetLectureCount}`
                    : detail.lectureCount}
                </span>
              </div>
            )}
            {detail?.lastRevised && (
              <div className="chp-stat">
                <span>Last Revised</span>
                <span className="chp-stat-val">{formatRelativeTime(detail.lastRevised)}</span>
              </div>
            )}
          </div>
        ) : null}

        {detail?.notes && (
          <div className="chp-section chp-notes">
            <div className="chp-section-title">Notes</div>
            <div className="chp-note-text">{detail.notes}</div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

// ─── Split Row Components ───────────────────────────────────────────────

interface LeftChapterRowProps {
  chapter: Chapter;
  index?: number;
  progress: ChapterProgress | undefined;
  isEditing?: boolean;
  onRename?: (serial: number, newName: string) => void;
  onOpenDetails?: (serial: number) => void;
  isHovered: boolean;
  onMouseEnter: (serial: number) => void;
  onMouseLeave: () => void;
  priorityClass: string;
  onDragEnd?: () => void;
}

export const LeftChapterRow = React.memo(
  ({
    chapter,
    index,
    progress,
    isEditing = false,
    onRename,
    onOpenDetails,
    isHovered,
    onMouseEnter,
    onMouseLeave,
    priorityClass,
    onDragEnd,
  }: LeftChapterRowProps) => {
    const dragControls = useDragControls();
    const hasDetailData = hasChapterDetailData(progress);
    const totalAttempted = getTotalAttemptedQuestions(progress);
    const priority = progress?.priority || 'none';

    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [localName, setLocalName] = useState(chapter.name);
    useEffect(() => {
      setLocalName(chapter.name);
    }, [chapter.name]);

    const handleMouseEnterLocal = useCallback(
      (e: React.MouseEvent) => {
        onMouseEnter(chapter.serial);
        if (isEditing) return;
        if (!hasDetailData && priority === 'none') return;
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        setHoverPos({ x: e.clientX, y: e.clientY });
      },
      [isEditing, hasDetailData, priority, onMouseEnter, chapter.serial]
    );

    const handleMouseMoveLocal = useCallback(
      (e: React.MouseEvent) => {
        if (isEditing) return;
        if (!hasDetailData && priority === 'none') return;
        setHoverPos({ x: e.clientX, y: e.clientY });
      },
      [isEditing, hasDetailData, priority]
    );

    const handleMouseLeaveLocal = useCallback(() => {
      onMouseLeave();
      leaveTimerRef.current = setTimeout(() => setHoverPos(null), 80);
    }, [onMouseLeave]);

    const rowClass = `chapter-row ${priorityClass} ${isHovered ? 'hovered' : ''}`;
    const rowProps = {
      className: rowClass,
      onClick: !isEditing && onOpenDetails ? () => onOpenDetails(chapter.serial) : undefined,
      onKeyDown: !isEditing
        ? (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenDetails?.(chapter.serial);
            }
          }
        : undefined,
      role: !isEditing ? 'button' : undefined,
      tabIndex: !isEditing ? 0 : undefined,
      onMouseEnter: handleMouseEnterLocal,
      onMouseLeave: handleMouseLeaveLocal,
      onMouseMove: handleMouseMoveLocal,
    };

    if (!isEditing) {
      return (
        <>
          <motion.tr
            {...rowProps}
          >
            <td className="serial-cell">
              {index !== undefined ? index + 1 : chapter.serial}
            </td>
            <td className="chapter-cell">
              <span className="chapter-name-wrap">
                <span
                  className={
                    priorityClass === 'completed' ? 'chapter-name completed' : 'chapter-name'
                  }
                >
                  {chapter.name}
                </span>
                {hasDetailData && (
                  <span className="chapter-detail-dot" aria-label="Has detail tracking">
                    •
                  </span>
                )}
                {totalAttempted > 0 && (
                  <span className="chapter-question-badge">{totalAttempted} Qs</span>
                )}
                {priorityClass === 'completed' && <span className="completed-badge">✓</span>}
              </span>
            </td>
          </motion.tr>
          {hoverPos && (hasDetailData || priority !== 'none') && (
            <HoverPanel
              x={hoverPos.x}
              y={hoverPos.y}
              chapterName={chapter.name}
              progress={progress}
            />
          )}
        </>
      );
    }

    return (
      <>
        <Reorder.Item
          as="tr"
          value={chapter}
          dragListener={false}
          dragControls={dragControls}
          onDragEnd={onDragEnd}
          style={{ userSelect: 'none' }}
          {...rowProps}
        >
          <td className="serial-cell">
            <div 
              className="grip-icon-wrapper"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ cursor: 'grab', touchAction: 'none' }}
            >
              <GripVertical size={20} />
            </div>
          </td>
          <td className="chapter-cell">
            <input
              type="text"
              value={localName}
              onChange={(e) => {
                setLocalName(e.target.value);
                onRename?.(chapter.serial, e.target.value);
              }}
              onBlur={(e) => {
                const trimmed = e.target.value.trim();
                setLocalName(trimmed);
                onRename?.(chapter.serial, trimmed);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="modal-input chapter-edit-input"
              onClick={(e) => e.stopPropagation()}
            />
          </td>
        </Reorder.Item>
        {hoverPos && (hasDetailData || priority !== 'none') && (
          <HoverPanel
            x={hoverPos.x}
            y={hoverPos.y}
            chapterName={chapter.name}
            progress={progress}
          />
        )}
      </>
    );
  }
);

export function getChapterProgressPercent(
  progress: ChapterProgress | undefined,
  chapter: Chapter,
  materialNames: string[]
): number {
  const subtopics = chapter.subtopics || [];
  if (subtopics.length > 0) {
    let completedCount = 0;
    const totalCount = subtopics.length * materialNames.length;
    subtopics.forEach((sub) => {
      const subState = progress?.subtopics?.[sub];
      materialNames.forEach((mat) => {
        if (subState?.completed?.[mat]) {
          completedCount++;
        }
      });
    });
    return totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  } else {
    const completed = progress?.completed || {};
    const completedCount = materialNames.filter((m) => completed[m]).length;
    return materialNames.length > 0 ? Math.round((completedCount / materialNames.length) * 100) : 0;
  }
}

interface MiddleChapterRowProps {
  chapter: Chapter;
  materialNames: string[];
  progress: ChapterProgress | undefined;
  onToggleMaterial: (chapterSerial: number, material: string) => void;
  isHovered: boolean;
  onMouseEnter: (serial: number) => void;
  onMouseLeave: () => void;
  priorityClass: string;
  onOpenDetails?: (serial: number) => void;
  isEditing?: boolean;
}

export const MiddleChapterRow = React.memo(
  ({
    chapter,
    materialNames,
    progress,
    onToggleMaterial,
    isHovered,
    onMouseEnter,
    onMouseLeave,
    priorityClass,
    onOpenDetails,
    isEditing = false,
  }: MiddleChapterRowProps) => {
    const subtopics = chapter.subtopics || [];

    const isMaterialChecked = (material: string) => {
      if (subtopics.length > 0) {
        return subtopics.every((sub) => !!progress?.subtopics?.[sub]?.completed?.[material]);
      }
      return !!progress?.completed?.[material];
    };

    const isMaterialIndeterminate = (material: string) => {
      if (subtopics.length === 0) return false;
      const completedCount = subtopics.filter(
        (sub) => !!progress?.subtopics?.[sub]?.completed?.[material]
      ).length;
      return completedCount > 0 && completedCount < subtopics.length;
    };

    return (
      <motion.tr
        layout={isEditing ? 'position' : false}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`chapter-row ${priorityClass} ${isHovered ? 'hovered' : ''}`}
        onClick={!isEditing && onOpenDetails ? () => onOpenDetails(chapter.serial) : undefined}
        onKeyDown={
          !isEditing
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenDetails?.(chapter.serial);
                }
              }
            : undefined
        }
        role={!isEditing ? 'button' : undefined}
        tabIndex={!isEditing ? 0 : undefined}
        onMouseEnter={() => onMouseEnter(chapter.serial)}
        onMouseLeave={onMouseLeave}
      >
        {materialNames.map((material) => {
          const isChecked = isMaterialChecked(material);
          const isIndeterminate = isMaterialIndeterminate(material);

          return (
            <td key={material} className="material-cell">
              <label
                className={`checkbox-container ${isIndeterminate ? 'indeterminate' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={() => onToggleMaterial(chapter.serial, material)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="checkmark"></span>
              </label>
            </td>
          );
        })}
      </motion.tr>
    );
  }
);

interface RightChapterRowProps {
  chapter: Chapter;
  materialNames: string[];
  progress: ChapterProgress | undefined;
  onSetPriority: (chapterSerial: number, priority: Priority) => void;
  isEditing?: boolean;
  onDelete?: (serial: number, name: string) => void;
  isHovered: boolean;
  onMouseEnter: (serial: number) => void;
  onMouseLeave: () => void;
  priorityClass: string;
  onOpenDetails?: (serial: number) => void;
}

export const RightChapterRow = React.memo(
  ({
    chapter,
    materialNames,
    progress,
    onSetPriority,
    isEditing = false,
    onDelete,
    isHovered,
    onMouseEnter,
    onMouseLeave,
    priorityClass,
    onOpenDetails,
  }: RightChapterRowProps) => {
    const priority = progress?.priority || 'none';
    const percent = getChapterProgressPercent(progress, chapter, materialNames);

    return (
      <motion.tr
        layout={isEditing ? 'position' : false}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`chapter-row ${priorityClass} ${isHovered ? 'hovered' : ''}`}
        onClick={!isEditing && onOpenDetails ? () => onOpenDetails(chapter.serial) : undefined}
        onKeyDown={
          !isEditing
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenDetails?.(chapter.serial);
                }
              }
            : undefined
        }
        role={!isEditing ? 'button' : undefined}
        tabIndex={!isEditing ? 0 : undefined}
        onMouseEnter={() => onMouseEnter(chapter.serial)}
        onMouseLeave={onMouseLeave}
      >
        <td className="priority-cell" onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(chapter.serial, chapter.name);
              }}
              className="chapter-delete-btn"
            >
              <Trash2 size={14} />
              Delete
            </button>
          ) : (
            <div className="status-cell-content">
              <div className="mini-progress-bar" title={`Progress: ${percent}%`}>
                <div className="mini-progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <PriorityPillSelector
                priority={priority}
                onChange={(p) => onSetPriority(chapter.serial, p)}
              />
            </div>
          )}
        </td>
      </motion.tr>
    );
  }
);
