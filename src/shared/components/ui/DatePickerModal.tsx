import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
                setViewDate(new Date(selectedDate));
            }
        } else {
            setViewDate(new Date());
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

    const isSameDate = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const today = new Date();
    const selected = selectedDate ? new Date(selectedDate) : null;

    const renderCalendarDays = () => {
        const days = [];
        // Empty slots for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
            const isToday = isSameDate(date, today);
            const isSelected = selected && isSameDate(date, selected);

            // Allow today's date, but disable any date strictly before today (at 00:00:00)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const isPast = date < todayStart;
            const isDisabled = disablePastDates && isPast;

            days.push(
                <button
                    key={day}
                    className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !isDisabled && handleDateClick(day)}
                    disabled={isDisabled}
                >
                    {day}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Select Date</h3>
                </div>
                <div className="modal-body">
                    <div className="date-picker-header">
                        <button onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                        <span>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                        <button onClick={handleNextMonth}><ChevronRight size={20} /></button>
                    </div>
                    <div className="calendar-grid">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <div key={d} className="calendar-day-header">{d}</div>
                        ))}
                        {renderCalendarDays()}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="modal-btn cancel" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
