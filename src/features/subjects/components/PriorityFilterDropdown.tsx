import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Priority } from '../../../shared/types';
import { Filter } from 'lucide-react';

interface PriorityFilterDropdownProps {
    priorityFilter: Priority | 'all';
    onFilterChange: (filter: Priority | 'all') => void;
}

const FILTER_OPTIONS: { value: Priority | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'var(--text-muted)' },
    { value: 'high', label: 'High', color: 'var(--priority-high)' },
    { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
    { value: 'low', label: 'Low', color: 'var(--priority-low)' },
    { value: 'none', label: 'None', color: 'var(--text-muted)' }
];

export function PriorityFilterDropdown({ priorityFilter, onFilterChange }: PriorityFilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, minWidth: 120 });

    const updateMenuPosition = () => {
        const trigger = ref.current?.querySelector('.filter-icon-btn') as HTMLElement | null;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const viewportPadding = 8;
        const menuWidth = 132;
        const estimatedHeight = 220;

        let left = rect.right - menuWidth;
        left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

        let top = rect.bottom + 6;
        if (top + estimatedHeight > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, rect.top - estimatedHeight - 6);
        }

        setMenuPosition({ top, left, minWidth: menuWidth });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedTrigger = !!ref.current && ref.current.contains(target);
            const clickedMenu = !!menuRef.current && menuRef.current.contains(target);

            if (!clickedTrigger && !clickedMenu) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        updateMenuPosition();

        const handleWindowChange = () => updateMenuPosition();
        window.addEventListener('resize', handleWindowChange);
        window.addEventListener('scroll', handleWindowChange, true);

        return () => {
            window.removeEventListener('resize', handleWindowChange);
            window.removeEventListener('scroll', handleWindowChange, true);
        };
    }, [isOpen]);

    const filterLabel = priorityFilter === 'all'
        ? 'All'
        : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1);

    return (
        <div ref={ref} className="filter-wrapper">
            <button
                onClick={() => {
                    if (!isOpen) updateMenuPosition();
                    setIsOpen(!isOpen);
                }}
                className="filter-icon-btn"
                title={`Filter: ${filterLabel}`}
                aria-label={`Filter chapters by priority (current: ${filterLabel})`}
            >
                <Filter size={16} />
                {priorityFilter !== 'all' && (
                    <span className="filter-dot" />
                )}
            </button>
            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="filter-dropdown-menu"
                    style={{
                        position: 'fixed',
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                        minWidth: `${menuPosition.minWidth}px`
                    }}
                >
                    {FILTER_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                onFilterChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`filter-option-btn ${priorityFilter === opt.value ? 'active' : ''}`}
                            style={{ color: opt.color }}
                        >
                            <span>{opt.label}</span>
                            {priorityFilter === opt.value && <span className="check-icon">✓</span>}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
