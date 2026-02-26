import React from 'react';
import { Chapter, ChapterProgress, Priority } from '../../../shared/types';
import { PrioritySelector } from '../../../shared/components/ui/PrioritySelector';
import { Trash2, GripVertical } from 'lucide-react';

interface ChapterRowProps {
    chapter: Chapter;
    materialNames: string[];
    progress: ChapterProgress | undefined;
    onToggleMaterial: (chapterSerial: number, material: string) => void;
    onSetPriority: (chapterSerial: number, priority: Priority) => void;
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

    const getPriorityClass = () => {
        if (isEditing) return ''; // No priority styling in edit mode
        if (isFullyCompleted) return 'completed';
        return priority !== 'none' ? `priority-${priority}` : '';
    };

    return (
        <tr
            className={`chapter-row ${getPriorityClass()}`}
            draggable={isEditing}
            onDragStart={isEditing ? onDragStart : undefined}
            onDragEnter={isEditing ? onDragEnter : undefined}
            onDragEnd={isEditing ? onDragEnd : undefined}
            onDragOver={isEditing ? (e) => e.preventDefault() : undefined}
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
                    />
                ) : (
                    <>
                        <span className={isFullyCompleted ? 'chapter-name completed' : 'chapter-name'}>
                            {chapter.name}
                        </span>
                        {isFullyCompleted && <span className="completed-badge">✓</span>}
                    </>
                )}
            </td>
            {materialNames.map((material) => (
                <td key={material} className="material-cell">
                    <label className="checkbox-container">
                        <input
                            type="checkbox"
                            checked={!!completed[material]}
                            onChange={() => onToggleMaterial(chapter.serial, material)}
                        />
                        <span className="checkmark"></span>
                    </label>
                </td>
            ))}
            <td className="priority-cell">
                {isEditing ? (
                    <button
                        onClick={onDelete}
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
    );
}

export const ChapterRow = React.memo(ChapterRowComponent);
