import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDateLocal } from '../../utils/date.ts';

interface DatePickerModalProps {
    isOpen: boolean;
    selectedDate: string;
    onSelect: (date: string) => void;
    onClose: () => void;
    disablePastDates?: boolean;
}

export function DatePickerModal({ isOpen, selectedDate, onSelect, onClose, disablePastDates = false }: DatePickerModalProps) {
    const [viewDate, setViewDate] = useState(new Date());

    useEffect(() => {
        if (isOpen) {
            if (selectedDate) {
                // Parse without timezone shift
                const parts = selectedDate.split('-').map(Number);
                setViewDate(new Date(parts[0], parts[1] - 1, parts[2]));
            } else {
                setViewDate(new Date());
            }
        }
    }, [isOpen, selectedDate]);

    if (!isOpen) return null;

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const formattedDate = formatDateLocal(date);
        onSelect(formattedDate);
        onClose();
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const isSameDate = (d1: Date, d2: Date) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    const today = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const selected = selectedDate
        ? (() => { const p = selectedDate.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); })()
        : null;

    const renderCalendarDays = () => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="dp-day empty" />);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
            const isToday = isSameDate(date, today);
            const isSelected = selected ? isSameDate(date, selected) : false;
            const isPast = date < todayStart;
            const isDisabled = disablePastDates && isPast;

            days.push(
                <button
                    key={day}
                    className={[
                        'dp-day',
                        isToday ? 'today' : '',
                        isSelected ? 'selected' : '',
                        isDisabled ? 'disabled' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => !isDisabled && handleDateClick(day)}
                    disabled={isDisabled}
                    aria-label={`${day} ${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
                    aria-pressed={isSelected}
                >
                    {day}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="dp-wrapper">
            <div className="dp-backdrop" onClick={onClose} />
            <div className="dp-panel">
                {/* Header */}
                <div className="dp-header">
                    <span className="dp-title">Select Date</span>
                    <button className="dp-close-btn" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>

                {/* Month navigation */}
                <div className="dp-nav">
                    <button className="dp-nav-btn" onClick={handlePrevMonth} aria-label="Previous month">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="dp-month-label">
                        {monthNames[viewDate.getMonth()]} <em>{viewDate.getFullYear()}</em>
                    </span>
                    <button className="dp-nav-btn" onClick={handleNextMonth} aria-label="Next month">
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Calendar */}
                <div className="dp-grid">
                    {dayLabels.map(d => (
                        <div key={d} className="dp-weekday">{d}</div>
                    ))}
                    {renderCalendarDays()}
                </div>

                {/* Footer */}
                <div className="dp-footer">
                    <button className="dp-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="dp-today-btn"
                        onClick={() => {
                            onSelect(formatDateLocal(today));
                            onClose();
                        }}
                    >
                        Today
                    </button>
                </div>
            </div>
        </div>
    );
}
