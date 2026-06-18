import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Chapter, ChapterProgress, Priority } from '../../../shared/types';
import { PrioritySelector } from '../../../shared/components/ui/PrioritySelector';
import { Trash2, GripVertical, Star } from 'lucide-react';
import { getTotalAttemptedQuestions, hasChapterDetailData } from '../utils/chapterDetail';

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
        5: 'var(--confidence-green)'
    };

    const attemptedEntries = detail?.attemptedByMaterial ? Object.entries(detail.attemptedByMaterial).filter(([_, count]) => count > 0) : [];
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
                                fill={star <= detail.confidence! ? confidenceColors[detail.confidence!] : 'transparent'} 
                                color={star <= detail.confidence! ? confidenceColors[detail.confidence!] : 'color-mix(in srgb, var(--text-muted), transparent 50%)'}
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

                {(detail?.revisionCount !== undefined && detail?.revisionCount > 0) || detail?.lastRevised ? (
                    <div className="chp-section chp-row-stats">
                        {detail?.revisionCount !== undefined && detail?.revisionCount > 0 && (
                            <div className="chp-stat">
                                <span>Revisions</span>
                                <span className="chp-stat-val">{detail.revisionCount}</span>
                            </div>
                        )}
                        {detail?.lastRevised && (
                            <div className="chp-stat">
                                <span>Last Revised</span>
                                <span className="chp-stat-val">{new Date(detail.lastRevised).toLocaleDateString()}</span>
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

// ─── Main ChapterRow Component ───────────────────────────────────────────────

interface ChapterRowProps {
    chapter: Chapter;
    materialNames: string[];
    progress: ChapterProgress | undefined;
    onToggleMaterial: (chapterSerial: number, material: string) => void;
    onSetPriority: (chapterSerial: number, priority: Priority) => void;
    onOpenDetails?: () => void;
    isEditing?: boolean;
    onRename?: (newName: string) => void;
    onDelete?: () => void;
    isFirst?: boolean;
    isLast?: boolean;
    index?: number;
    onDragStart?: (e: React.DragEvent<HTMLTableRowElement>) => void;
    onDragEnter?: (e: React.DragEvent<HTMLTableRowElement>) => void;
    onDragEnd?: (e: React.DragEvent<HTMLTableRowElement>) => void;
}

function ChapterRowComponent({
    chapter,
    materialNames,
    progress,
    onToggleMaterial,
    onSetPriority,
    onOpenDetails,
    isEditing = false,
    onRename,
    onDelete,
    index,
    onDragStart,
    onDragEnter,
    onDragEnd
}: ChapterRowProps) {
    const completed = progress?.completed || {};
    const priority = progress?.priority || 'none';

    const completedCount = materialNames.filter(m => completed[m]).length;
    const isFullyCompleted = completedCount === materialNames.length && materialNames.length > 0;
    const hasDetailData = hasChapterDetailData(progress);
    const totalAttempted = getTotalAttemptedQuestions(progress);

    const getPriorityClass = () => {
        if (isEditing) return ''; // No priority styling in edit mode
        if (isFullyCompleted) return 'completed';
        return priority !== 'none' ? `priority-${priority}` : '';
    };

    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
        if (isEditing) return;
        if (!hasDetailData && priority === 'none') return;
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        setHoverPos({ x: e.clientX, y: e.clientY });
    }, [isEditing, hasDetailData, priority]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isEditing) return;
        if (!hasDetailData && priority === 'none') return;
        setHoverPos({ x: e.clientX, y: e.clientY });
    }, [isEditing, hasDetailData, priority]);

    const handleMouseLeave = useCallback(() => {
        leaveTimerRef.current = setTimeout(() => setHoverPos(null), 80);
    }, []);

    return (
        <>
            <tr
                className={`chapter-row ${getPriorityClass()}`}
                draggable={isEditing}
                onDragStart={isEditing ? onDragStart : undefined}
                onDragEnter={isEditing ? onDragEnter : undefined}
                onDragEnd={isEditing ? onDragEnd : undefined}
                onDragOver={isEditing ? (e) => e.preventDefault() : undefined}
                onClick={!isEditing ? onOpenDetails : undefined}
                onKeyDown={!isEditing ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenDetails?.();
                    }
                } : undefined}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                role={!isEditing ? 'button' : undefined}
                tabIndex={!isEditing ? 0 : undefined}
                style={isEditing ? { cursor: 'grab' } : undefined}
            >
                <td className="serial-cell">
                    {isEditing ? (
                        <div className="grip-icon-wrapper">
                            <GripVertical size={20} />
                        </div>
                    ) : (
                        index !== undefined ? index + 1 : chapter.serial
                    )}
                </td>
                <td className="chapter-cell">
                    {isEditing ? (
                        <input
                            type="text"
                            value={chapter.name}
                            onChange={(e) => onRename?.(e.target.value)}
                            className="modal-input chapter-edit-input"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <>
                            <span className="chapter-name-wrap">
                                <span className={isFullyCompleted ? 'chapter-name completed' : 'chapter-name'}>
                                    {chapter.name}
                                </span>
                                {hasDetailData && <span className="chapter-detail-dot" aria-label="Has detail tracking">•</span>}
                                {totalAttempted > 0 && <span className="chapter-question-badge">{totalAttempted} qs</span>}
                            </span>
                            {isFullyCompleted && <span className="completed-badge">✓</span>}
                        </>
                    )}
                </td>
                {materialNames.map((material) => (
                    <td key={material} className="material-cell">
                        <label className="checkbox-container" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={!!completed[material]}
                                onChange={() => onToggleMaterial(chapter.serial, material)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <span className="checkmark"></span>
                        </label>
                    </td>
                ))}
                <td className="priority-cell" onClick={(e) => e.stopPropagation()}>
                    {isEditing ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.();
                            }}
                            className="chapter-delete-btn"
                        >
                            <Trash2 size={14} />
                            Delete
                        </button>
                    ) : (
                        <PrioritySelector
                            priority={priority}
                            onChange={(p) => onSetPriority(chapter.serial, p)}
                        />
                    )}
                </td>
            </tr>
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

export const ChapterRow = React.memo(ChapterRowComponent);
