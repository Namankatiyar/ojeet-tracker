import { describe, it, expect } from 'vitest';
import { formatTime12Hour } from './date';

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
