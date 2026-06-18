import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    formatTime12Hour, 
    formatDateLocal, 
    parse24hTo12h, 
    format12hTo24h, 
    calculateDaysRemaining,
    formatRelativeTime
} from './date';

describe('formatTime12Hour', () => {
    it('should correctly format a morning time (AM)', () => {
        expect(formatTime12Hour('09:30')).toBe('09:30 AM');
    });

    it('should correctly format an afternoon time (PM)', () => {
        expect(formatTime12Hour('14:45')).toBe('02:45 PM');
    });

    it('should correctly format midnight', () => {
        expect(formatTime12Hour('00:00')).toBe('12:00 AM');
    });

    it('should correctly format noon', () => {
        expect(formatTime12Hour('12:00')).toBe('12:00 PM');
    });

    it('should handle single digit minutes correctly', () => {
        expect(formatTime12Hour('08:05')).toBe('08:05 AM');
    });

    it('should return an empty string if provided time is falsy', () => {
        expect(formatTime12Hour('')).toBe('');
    });
});

describe('formatDateLocal', () => {
    it('should format a date as YYYY-MM-DD', () => {
        const date = new Date(2025, 2, 1); // March 1st, 2025
        expect(formatDateLocal(date)).toBe('2025-03-01');
    });

    it('should handle end of year dates', () => {
        const date = new Date(2025, 11, 31); // Dec 31st, 2025
        expect(formatDateLocal(date)).toBe('2025-12-31');
    });
});

describe('parse24hTo12h', () => {
    it('should parse 24h string to 12h object', () => {
        expect(parse24hTo12h('13:05')).toEqual({
            hour12: '01',
            minutes: '05',
            period: 'PM'
        });
    });

    it('should handle midnight correctly', () => {
        expect(parse24hTo12h('00:30')).toEqual({
            hour12: '12',
            minutes: '30',
            period: 'AM'
        });
    });
});

describe('format12hTo24h', () => {
    it('should format 12h PM to 24h', () => {
        expect(format12hTo24h('02', '45', 'PM')).toBe('14:45');
    });

    it('should format 12h AM (midnight hour) to 24h', () => {
        expect(format12hTo24h('12', '15', 'AM')).toBe('00:15');
    });

    it('should handle numeric inputs', () => {
        expect(format12hTo24h(9, 5, 'AM')).toBe('09:05');
    });
});

describe('calculateDaysRemaining', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        const date = new Date(2025, 2, 1); // Mock today as March 1st, 2025
        vi.setSystemTime(date);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return null for empty date string', () => {
        expect(calculateDaysRemaining('')).toBeNull();
    });

    it('should return 0 for today', () => {
        expect(calculateDaysRemaining('2025-03-01')).toBe(0);
    });

    it('should return 1 for tomorrow', () => {
        expect(calculateDaysRemaining('2025-03-02')).toBe(1);
    });

    it('should return 0 for past dates', () => {
        expect(calculateDaysRemaining('2025-02-28')).toBe(0);
    });
});

describe('formatRelativeTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        const date = new Date(2025, 2, 10); // Mock today as March 10th, 2025
        vi.setSystemTime(date);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return empty string for falsy/invalid dates', () => {
        expect(formatRelativeTime('')).toBe('');
        expect(formatRelativeTime('invalid')).toBe('');
    });

    it('should return today for today date', () => {
        expect(formatRelativeTime('2025-03-10')).toBe('today');
    });

    it('should return 1 day ago for yesterday', () => {
        expect(formatRelativeTime('2025-03-09')).toBe('1 day ago');
    });

    it('should return days ago for recent dates', () => {
        expect(formatRelativeTime('2025-03-07')).toBe('3 days ago');
        expect(formatRelativeTime('2025-03-04')).toBe('6 days ago');
    });

    it('should return weeks ago for older dates within a month', () => {
        expect(formatRelativeTime('2025-03-03')).toBe('1 week ago');
        expect(formatRelativeTime('2025-02-24')).toBe('2 weeks ago');
        expect(formatRelativeTime('2025-02-10')).toBe('4 weeks ago');
    });

    it('should return months ago for older dates within a year', () => {
        expect(formatRelativeTime('2025-02-08')).toBe('1 month ago');
        expect(formatRelativeTime('2024-12-10')).toBe('3 months ago');
        expect(formatRelativeTime('2024-04-10')).toBe('11 months ago');
    });

    it('should return 1 year ago for dates exactly or around 1 year ago', () => {
        expect(formatRelativeTime('2024-03-10')).toBe('1 year ago');
        expect(formatRelativeTime('2024-02-10')).toBe('1 year ago');
    });

    it('should return years ago for older dates', () => {
        expect(formatRelativeTime('2023-03-10')).toBe('2 years ago');
        expect(formatRelativeTime('2020-03-10')).toBe('5 years ago');
    });

    it('should return in the future for future dates', () => {
        expect(formatRelativeTime('2025-03-11')).toBe('in the future');
    });
});

