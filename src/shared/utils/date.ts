export const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const formatTime12Hour = (time24: string): string => {
    if (!time24) return '';
    const { hour12, minutes, period } = parse24hTo12h(time24);
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const parse24hTo12h = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return {
        hour12: hour12.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        period
    };
};

export const format12hTo24h = (hour12: string | number, minutes: string | number, period: 'AM' | 'PM'): string => {
    let h = typeof hour12 === 'string' ? parseInt(hour12) : hour12;
    const m = typeof minutes === 'string' ? minutes.padStart(2, '0') : minutes.toString().padStart(2, '0');

    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;

    return `${h.toString().padStart(2, '0')}:${m}`;
};
