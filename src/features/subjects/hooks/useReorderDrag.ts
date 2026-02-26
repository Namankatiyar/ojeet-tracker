import { useRef, useCallback } from 'react';

interface ReorderDragHandlers<E extends HTMLElement> {
    onDragStart: (e: React.DragEvent<E>, index: number) => void;
    onDragEnter: (e: React.DragEvent<E>, index: number) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent<E>) => void;
}

/**
 * Generic hook for drag-to-reorder lists.
 * Replaces the duplicated row-drag and material-column-drag logic in SubjectPage.
 */
export function useReorderDrag<T, E extends HTMLElement = HTMLElement>(
    items: T[],
    onReorder: ((items: T[]) => void) | undefined,
    enabled: boolean
): ReorderDragHandlers<E> {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const onDragStart = useCallback((e: React.DragEvent<E>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const onDragEnter = useCallback((_e: React.DragEvent<E>, index: number) => {
        dragOverItem.current = index;
        if (!onReorder || !enabled) return;

        if (dragItem.current !== null && dragItem.current !== index) {
            const newItems = [...items];
            const draggedItemContent = newItems[dragItem.current];
            newItems.splice(dragItem.current, 1);
            newItems.splice(index, 0, draggedItemContent);

            onReorder(newItems);
            dragItem.current = index;
        }
    }, [items, onReorder, enabled]);

    const onDragEnd = useCallback(() => {
        dragItem.current = null;
        dragOverItem.current = null;
    }, []);

    const onDragOver = useCallback((e: React.DragEvent<E>) => {
        e.preventDefault();
    }, []);

    return { onDragStart, onDragEnter, onDragEnd, onDragOver };
}
