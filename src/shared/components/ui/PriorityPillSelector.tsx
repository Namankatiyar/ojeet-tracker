import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Priority } from '../../types';

interface PriorityPillSelectorProps {
  priority: Priority;
  onChange: (priority: Priority) => void;
}

const PRIORITY_OPTIONS: { value: Priority | 'none'; label: string; colorVar: string }[] = [
  { value: 'high', label: 'High', colorVar: 'var(--priority-high)' },
  { value: 'medium', label: 'Medium', colorVar: 'var(--priority-medium)' },
  { value: 'low', label: 'Low', colorVar: 'var(--priority-low)' },
  { value: 'none', label: 'None', colorVar: 'var(--text-muted)' },
];

export function PriorityPillSelector({ priority, onChange }: PriorityPillSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, minWidth: 100 });

  const updateMenuPosition = () => {
    const trigger = ref.current?.querySelector('.priority-pill-btn') as HTMLElement | null;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = Math.max(100, rect.width);
    const estimatedHeight = 140;

    let left = rect.right - menuWidth;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - menuWidth - viewportPadding)
    );

    let top = rect.bottom + 4;
    // Adjust if it goes off screen to the bottom
    if (top + estimatedHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, rect.top - estimatedHeight - 4);
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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

  const activeOption =
    PRIORITY_OPTIONS.find((opt) => opt.value === priority) || PRIORITY_OPTIONS[3];

  // Fallback styling if none
  const isNone = priority === 'none' || !priority;
  const pillColor = isNone ? 'var(--text-muted)' : activeOption.colorVar;
  const pillBg = isNone
    ? 'var(--bg-tertiary)'
    : `color-mix(in srgb, ${activeOption.colorVar} 15%, transparent)`;
  const pillBorder = isNone
    ? 'transparent'
    : `color-mix(in srgb, ${activeOption.colorVar} 30%, transparent)`;

  return (
    <div ref={ref} className="priority-pill-wrapper" onClick={(e) => e.stopPropagation()}>
      <button
        className={`priority-pill-btn ${isOpen ? 'open' : ''} ${isNone ? 'none' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) updateMenuPosition();
          setIsOpen(!isOpen);
        }}
        style={{
          color: pillColor,
          backgroundColor: pillBg,
          borderColor: pillBorder,
        }}
        title={`Set Priority (Current: ${activeOption.label})`}
      >
        <span className="priority-pill-text">{activeOption.label}</span>
        <span className="priority-pill-caret">▾</span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="priority-pill-menu filter-dropdown-menu"
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              right: 'auto',
              minWidth: `${menuPosition.minWidth}px`,
              zIndex: 1000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`filter-option-btn ${priority === opt.value ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value as Priority);
                  setIsOpen(false);
                }}
                style={{ color: opt.colorVar }}
              >
                <span>{opt.label}</span>
                {priority === opt.value && <span className="check-icon">✓</span>}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
