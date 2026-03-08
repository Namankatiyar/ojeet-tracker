import React from 'react';
import { Chapter, ChapterProgress, Priority } from '../../../shared/types';
import { GripVertical, ChevronRight } from 'lucide-react';

interface MobileChapterCardProps {
    chapter: Chapter;
    index: number;
    materialNames: string[];
    progress: ChapterProgress | undefined;
    isEditing: boolean;
    canReorder: boolean;
    onOpenDetails: () => void;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
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
    onDragStart,
    onDragEnter,
    onDragEnd
}: MobileChapterCardProps) {
    const completed = progress?.completed || {};
    const priority = progress?.priority || 'none';
    const completedCount = materialNames.filter((m) => completed[m]).length;
    const totalCount = materialNames.length;
    const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isFullyCompleted = totalCount > 0 && completedCount === totalCount;

    const cardStateClass = isFullyCompleted
        ? 'completed'
        : priority !== 'none'
            ? `priority-${priority}`
            : '';

    return (
        <div
            className={`mobile-chapter-card ${cardStateClass}`}
            onClick={onOpenDetails}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onOpenDetails();
            }}
            draggable={isEditing && canReorder}
            onDragStart={isEditing && canReorder ? onDragStart : undefined}
            onDragEnter={isEditing && canReorder ? onDragEnter : undefined}
            onDragEnd={isEditing && canReorder ? onDragEnd : undefined}
            onDragOver={isEditing && canReorder ? (e) => e.preventDefault() : undefined}
        >
            <div className="mobile-chapter-card-top">
                <div className="mobile-chapter-title-wrap">
                    {isEditing && canReorder && (
                        <span className="mobile-chapter-drag-handle" aria-hidden="true">
                            <GripVertical size={18} />
                        </span>
                    )}
                    <span className="mobile-chapter-index">#{index + 1}</span>
                    <span className={`mobile-chapter-name ${isFullyCompleted ? 'completed' : ''}`}>{chapter.name}</span>
                </div>
                <ChevronRight size={18} className="mobile-chapter-chevron" />
            </div>

            <div className="mobile-chapter-meta">
                <span className={`mobile-priority-badge ${priority !== 'none' ? `priority-${priority}` : ''}`}>
                    {getPriorityLabel(priority)}
                </span>
                <span className="mobile-completion-label">{completedCount}/{totalCount} done</span>
            </div>

            <div className="mobile-progress-track" aria-hidden="true">
                <span className="mobile-progress-fill" style={{ width: `${completionPct}%` }} />
            </div>
        </div>
    );
}

export const MobileChapterCard = React.memo(MobileChapterCardComponent);
