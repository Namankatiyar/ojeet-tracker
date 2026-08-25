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
  size = 'default',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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
        <ChevronDown
          size={size === 'small' ? 14 : 16}
          className={`chevron-icon ${isOpen ? 'rotated' : ''}`}
        />
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
    </div>
  );
}
