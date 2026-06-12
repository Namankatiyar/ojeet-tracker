import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Clock } from 'lucide-react';
import { parse24hTo12h, format12hTo24h } from '../../utils/date';

interface TimePickerProps {
    value: string; // 24h format "HH:mm"
    onChange: (value: string) => void;
}

export interface TimePickerHandle {
    focusHour: () => void;
}

export const TimePicker = forwardRef<TimePickerHandle, TimePickerProps>(
    function TimePicker({ value, onChange }, ref) {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Internal 12h states for the picker UI
    const [selectedHour, setSelectedHour] = useState('12');
    const [selectedMinute, setSelectedMinute] = useState('00');
    const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');

    const containerRef = useRef<HTMLDivElement>(null);
    const hourInputRef = useRef<HTMLInputElement>(null);
    const minuteInputRef = useRef<HTMLInputElement>(null);
    const periodButtonRef = useRef<HTMLButtonElement>(null);
    const hourScrollRef = useRef<HTMLDivElement>(null);
    const minuteScrollRef = useRef<HTMLDivElement>(null);

    // Expose focusHour() to parent components
    useImperativeHandle(ref, () => ({
        focusHour: () => {
            hourInputRef.current?.focus();
            hourInputRef.current?.select();
            setIsFocused(true);
        }
    }));

    // Sync external value (24h) to internal state (12h)
    useEffect(() => {
        if (value) {
            const { hour12, minutes, period } = parse24hTo12h(value);
            setSelectedHour(hour12);
            setSelectedMinute(minutes);
            setSelectedPeriod(period as 'AM' | 'PM');
        }
    }, [value]);

    // Close picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsFocused(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-scroll dropdown lists to selected item when opened or changed
    useEffect(() => {
        if (!isOpen) return;
        const scrollToSelected = (scrollRef: React.RefObject<HTMLDivElement>, val: string, items: string[]) => {
            const idx = items.indexOf(val);
            if (scrollRef.current && idx >= 0) {
                const btn = scrollRef.current.children[idx] as HTMLElement;
                btn?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        };
        const hrs = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
        const mins = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
        setTimeout(() => {
            scrollToSelected(hourScrollRef, selectedHour, hrs);
            scrollToSelected(minuteScrollRef, selectedMinute, mins);
        }, 50);
    }, [isOpen, selectedHour, selectedMinute]);

    // Handle internal changes and notify parent in 24h format
    const handleTimeChange = (h: string, m: string, p: 'AM' | 'PM') => {
        const time24 = format12hTo24h(h, m, p);
        onChange(time24);
    };

    const normalizeHour = (hour: string) => {
        const num = parseInt(hour, 10);
        if (!Number.isFinite(num) || num <= 0) return '12';
        if (num > 12) return '12';
        return num.toString().padStart(2, '0');
    };

    const normalizeMinute = (minute: string) => {
        const num = parseInt(minute, 10);
        if (!Number.isFinite(num) || num < 0) return '00';
        if (num > 59) return '59';
        return num.toString().padStart(2, '0');
    };

    const commitTime = () => {
        const hour = normalizeHour(selectedHour);
        const minute = normalizeMinute(selectedMinute);
        setSelectedHour(hour);
        setSelectedMinute(minute);
        handleTimeChange(hour, minute, selectedPeriod);
    };

    const handleHourInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '');

        if (val.length === 1) {
            const num = parseInt(val, 10);
            if (num >= 2 && num <= 9) {
                // 2–9 are unambiguously complete in 12h format
                const formatted = val.padStart(2, '0');
                setSelectedHour(formatted);
                handleTimeChange(formatted, selectedMinute || '00', selectedPeriod);
                minuteInputRef.current?.focus();
                minuteInputRef.current?.select();
            } else {
                setSelectedHour(val);
            }
        } else if (val.length === 2) {
            const num = parseInt(val, 10);
            if (num >= 1 && num <= 12) {
                setSelectedHour(val);
                handleTimeChange(val, selectedMinute || '00', selectedPeriod);
                minuteInputRef.current?.focus();
                minuteInputRef.current?.select();
            } else if (num === 0) {
                setSelectedHour('12');
                handleTimeChange('12', selectedMinute || '00', selectedPeriod);
                minuteInputRef.current?.focus();
                minuteInputRef.current?.select();
            }
        } else if (val.length === 0) {
            setSelectedHour('');
        }
    };

    const handleMinuteInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '');

        if (val.length <= 2) {
            if (val.length === 2 && parseInt(val, 10) > 59) return;
            setSelectedMinute(val);
            if (val.length === 2) {
                const num = parseInt(val, 10);
                if (num >= 0 && num <= 59) {
                    handleTimeChange(selectedHour || '12', val, selectedPeriod);
                    periodButtonRef.current?.focus();
                }
            }
        }
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        prevRef: React.RefObject<HTMLInputElement> | null,
        nextRef: React.RefObject<HTMLElement> | null
    ) => {
        if (e.key === 'Backspace' && e.currentTarget.value === '' && prevRef) {
            e.preventDefault();
            prevRef.current?.focus();
            prevRef.current?.select();
        } else if (e.key === 'ArrowRight' && nextRef) {
            e.preventDefault();
            nextRef.current?.focus();
            if (nextRef.current instanceof HTMLInputElement) nextRef.current.select();
        } else if (e.key === 'ArrowLeft' && prevRef) {
            e.preventDefault();
            prevRef.current?.focus();
            prevRef.current?.select();
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            e.currentTarget.blur();
        }
    };

    const handleFocusIn = () => setIsFocused(true);

    const setPeriod = (period: 'AM' | 'PM') => {
        const hour = normalizeHour(selectedHour);
        const minute = normalizeMinute(selectedMinute);
        setSelectedHour(hour);
        setSelectedMinute(minute);
        setSelectedPeriod(period);
        handleTimeChange(hour, minute, period);
    };

    const togglePeriod = () => {
        setPeriod(selectedPeriod === 'AM' ? 'PM' : 'AM');
    };

    const handlePeriodKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key.toUpperCase() === 'A') {
            e.preventDefault();
            setPeriod('AM');
        } else if (e.key.toUpperCase() === 'P') {
            e.preventDefault();
            setPeriod('PM');
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            minuteInputRef.current?.focus();
            minuteInputRef.current?.select();
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            e.currentTarget.blur();
        }
    };

    const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            commitTime();
            setIsOpen(false);
            setIsFocused(false);
        }
    };

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    return (
        <div className="time-picker-container" ref={containerRef} onBlur={handleContainerBlur}>
            <div
                className={`time-display-box ${isFocused || isOpen ? 'active' : ''}`}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        hourInputRef.current?.focus();
                        hourInputRef.current?.select();
                    }
                }}
            >
                <span className="time-value">
                    <input
                        ref={hourInputRef}
                        type="text"
                        className="time-segment-input"
                        value={selectedHour}
                        onChange={handleHourInput}
                        onKeyDown={(e) => handleKeyDown(e, null, minuteInputRef)}
                        onFocus={(e) => { handleFocusIn(); e.target.select(); }}
                        placeholder="12"
                        maxLength={2}
                        inputMode="numeric"
                        aria-label="Hour"
                    />
                    <span className="time-segment-separator">:</span>
                    <input
                        ref={minuteInputRef}
                        type="text"
                        className="time-segment-input"
                        value={selectedMinute}
                        onChange={handleMinuteInput}
                        onKeyDown={(e) => handleKeyDown(e, hourInputRef, periodButtonRef)}
                        onFocus={(e) => { handleFocusIn(); e.target.select(); }}
                        placeholder="00"
                        maxLength={2}
                        inputMode="numeric"
                        aria-label="Minute"
                    />
                </span>
                <button
                    ref={periodButtonRef}
                    type="button"
                    className={`period-badge ${selectedPeriod === 'AM' ? 'am' : 'pm'}`}
                    onClick={togglePeriod}
                    onFocus={handleFocusIn}
                    onKeyDown={handlePeriodKeyDown}
                    aria-pressed={selectedPeriod === 'PM'}
                    aria-label={`Current period ${selectedPeriod}. Press to switch to ${selectedPeriod === 'AM' ? 'PM' : 'AM'}`}
                >
                    {selectedPeriod}
                </button>
                <button
                    type="button"
                    className="time-picker-toggle"
                    aria-label={isOpen ? 'Close time picker' : 'Open time picker'}
                    aria-expanded={isOpen}
                    onClick={() => {
                        setIsOpen(prev => !prev);
                        if (!isOpen) hourInputRef.current?.focus();
                    }}
                    onFocus={handleFocusIn}
                >
                    <Clock size={16} className="time-icon" />
                </button>
            </div>

            {isOpen && (
                <div className="custom-time-picker">
                    <div className="time-column">
                        <span className="col-label">Hour</span>
                        <div className="scroll-container" ref={hourScrollRef}>
                            {hours.map(h => (
                                <button
                                    type="button"
                                    key={h}
                                    className={`time-btn ${selectedHour === h ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedHour(h);
                                        handleTimeChange(h, normalizeMinute(selectedMinute), selectedPeriod);
                                        minuteInputRef.current?.focus();
                                        minuteInputRef.current?.select();
                                    }}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="time-column">
                        <span className="col-label">Min</span>
                        <div className="scroll-container" ref={minuteScrollRef}>
                            {minutes.map(m => (
                                <button
                                    type="button"
                                    key={m}
                                    className={`time-btn ${selectedMinute === m ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedMinute(m);
                                        handleTimeChange(normalizeHour(selectedHour), m, selectedPeriod);
                                        periodButtonRef.current?.focus();
                                    }}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="time-column period-col">
                        <span className="col-label">Period</span>
                        <button
                            type="button"
                            className={`period-btn ${selectedPeriod === 'AM' ? 'selected' : ''}`}
                            onClick={() => {
                                setPeriod('AM');
                            }}
                        >
                            AM
                        </button>
                        <button
                            type="button"
                            className={`period-btn ${selectedPeriod === 'PM' ? 'selected' : ''}`}
                            onClick={() => {
                                setPeriod('PM');
                            }}
                        >
                            PM
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});
