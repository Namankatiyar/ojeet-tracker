import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { parse24hTo12h, format12hTo24h } from '../../utils/date';

interface TimePickerProps {
    value: string; // 24h format "HH:mm"
    onChange: (value: string) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Internal 12h states for the picker UI
    const [selectedHour, setSelectedHour] = useState('12');
    const [selectedMinute, setSelectedMinute] = useState('00');
    const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');

    // Sync external value (24h) to internal state (12h)
    useEffect(() => {
        if (value) {
            const { hour12, minutes, period } = parse24hTo12h(value);
            setSelectedHour(hour12);
            setSelectedMinute(minutes);
            setSelectedPeriod(period as 'AM' | 'PM');
        }
    }, [value]);

    // Handle internal changes and notify parent in 24h format
    const handleTimeChange = (h: string, m: string, p: 'AM' | 'PM') => {
        const time24 = format12hTo24h(h, m, p);
        onChange(time24);
    };

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    return (
        <div className="time-picker-container">
            <div
                className={`time-display-box ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="time-value">
                    {selectedHour}:{selectedMinute} <span className="period">{selectedPeriod}</span>
                </span>
                <Clock size={20} className="time-icon" />
            </div>

            {isOpen && (
                <div className="custom-time-picker">
                    <div className="time-column">
                        <span className="col-label">Hour</span>
                        <div className="scroll-container">
                            {hours.map(h => (
                                <button
                                    key={h}
                                    className={`time-btn ${selectedHour === h ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedHour(h);
                                        handleTimeChange(h, selectedMinute, selectedPeriod);
                                    }}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="time-column">
                        <span className="col-label">Min</span>
                        <div className="scroll-container">
                            {minutes.map(m => (
                                <button
                                    key={m}
                                    className={`time-btn ${selectedMinute === m ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedMinute(m);
                                        handleTimeChange(selectedHour, m, selectedPeriod);
                                    }}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="time-column period-col">
                        <button
                            className={`period-btn ${selectedPeriod === 'AM' ? 'selected' : ''}`}
                            onClick={() => {
                                setSelectedPeriod('AM');
                                handleTimeChange(selectedHour, selectedMinute, 'AM');
                            }}
                        >
                            AM
                        </button>
                        <button
                            className={`period-btn ${selectedPeriod === 'PM' ? 'selected' : ''}`}
                            onClick={() => {
                                setSelectedPeriod('PM');
                                handleTimeChange(selectedHour, selectedMinute, 'PM');
                            }}
                        >
                            PM
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
