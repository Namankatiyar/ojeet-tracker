import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
    color?: string; // Optional color for the text/icon
    priority?: 'high' | 'medium' | 'low'; // Optional priority level for highlighting
}

interface CustomSelectProps {
    value: string | number;
    options: Option[];
    onChange: (value: any) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode; // Optional leading icon
    size?: 'default' | 'small';
}

export function CustomSelect({
    value,
    options,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    className = '',
    icon,
    size = 'default'
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div
            className={`custom-select-container ${size} ${disabled ? 'disabled' : ''} ${className}`}
            ref={containerRef}
        >
            <div
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="custom-select-value">
                    {icon && <span className="select-leading-icon">{icon}</span>}
                    {selectedOption ? (
                        <span style={{ color: selectedOption.color }}>{selectedOption.label}</span>
                    ) : (
                        <span className="placeholder">{placeholder}</span>
                    )}
                </div>
                <ChevronDown size={size === 'small' ? 14 : 16} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
            </div>

            {isOpen && (
                <div className="custom-select-options">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`custom-select-option ${option.value === value ? 'selected' : ''} ${option.priority ? `priority-${option.priority}` : ''}`}
                            onClick={() => handleSelect(option.value)}
                        >
                            <span style={{ color: option.color }}>{option.label}</span>
                            {option.value === value && <Check size={14} className="check-icon" />}
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .custom-select-container {
                    position: relative;
                    width: 100%;
                    font-size: 0.9rem;
                    font-family: 'Inter', sans-serif;
                }
                
                .custom-select-container.small {
                    font-size: 0.8rem;
                }

                .custom-select-container.disabled {
                    opacity: 0.6;
                    pointer-events: none;
                }

                .custom-select-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.5rem 0.75rem;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    user-select: none;
                    min-height: 36px;
                }

                .custom-select-container.small .custom-select-trigger {
                    padding: 0.25rem 0.5rem;
                    min-height: 28px;
                    height: 28px;
                    border-radius: 6px;
                }

                .custom-select-trigger:hover {
                    border-color: var(--accent);
                }

                .custom-select-trigger.open {
                    border-color: var(--accent);
                    box-shadow: 0 0 0 2px var(--accent-light);
                }

                .custom-select-value {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    color: var(--text-primary);
                    flex: 1;
                }

                .placeholder {
                    color: var(--text-secondary);
                }

                .chevron-icon {
                    color: var(--text-secondary);
                    transition: transform 0.2s;
                    flex-shrink: 0;
                    margin-left: 0.5rem;
                }

                .chevron-icon.rotated {
                    transform: rotate(180deg);
                }

                .custom-select-options {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    right: 0;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(40px);
                    -webkit-backdrop-filter: blur(40px);
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    box-shadow: var(--shadow-lg);
                    z-index: 9999;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 3px;
                    animation: fadeIn 0.15s ease;
                }

                [data-theme="dark"] .custom-select-options {
                    background: rgba(18, 18, 26, 0.9);
                }

                .custom-select-option {
                    padding: 0.35rem 0.6rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-radius: 5px;
                    transition: background 0.15s;
                    color: var(--text-primary);
                    font-size: 0.8rem;
                }

                .custom-select-option:hover {
                    background: var(--bg-tertiary);
                }

                .custom-select-option.selected {
                    background: var(--accent-light);
                    color: var(--accent);
                    font-weight: 500;
                }

                .check-icon {
                    color: var(--accent);
                }

                /* Priority highlighting */
                .custom-select-option.priority-high {
                    background: var(--priority-high-bg);
                    border-left: 3px solid var(--priority-high);
                }
                .custom-select-option.priority-medium {
                    background: var(--priority-medium-bg);
                    border-left: 3px solid var(--priority-medium);
                }
                .custom-select-option.priority-low {
                    background: var(--priority-low-bg);
                    border-left: 3px solid var(--priority-low);
                }

                /* Scrollbar for options */
                .custom-select-options::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-select-options::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-select-options::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 4px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
