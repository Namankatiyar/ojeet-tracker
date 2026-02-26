import { useState, useRef, useEffect } from 'react';
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filterLabel = priorityFilter === 'all'
        ? 'All'
        : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1);

    return (
        <div ref={ref} className="filter-wrapper">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="filter-icon-btn"
                title={`Filter: ${filterLabel}`}
            >
                <Filter size={16} />
                {priorityFilter !== 'all' && (
                    <span className="filter-dot" />
                )}
            </button>
            {isOpen && (
                <div className="filter-dropdown-menu">
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
                </div>
            )}
        </div>
    );
}
