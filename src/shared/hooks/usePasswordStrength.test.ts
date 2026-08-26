import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { calculatePasswordStrength, usePasswordStrength } from './usePasswordStrength';

describe('calculatePasswordStrength', () => {
  describe('Score 0 - Too short', () => {
    it('returns score 0 for empty password', () => {
      expect(calculatePasswordStrength('')).toEqual({
        score: 0,
        label: 'Too short',
      });
    });

    it('returns score 0 for password shorter than 8 characters even with 4 classes', () => {
      expect(calculatePasswordStrength('Aa1!')).toEqual({
        score: 0,
        label: 'Too short',
      });
      expect(calculatePasswordStrength('Abcd12!')).toEqual({
        score: 0,
        label: 'Too short',
      });
    });
  });

  describe('Score 1 - Weak', () => {
    it('returns score 1 for length >= 8 with only 1 character class', () => {
      expect(calculatePasswordStrength('abcdefgh')).toEqual({
        score: 1,
        label: 'Weak',
      });
      expect(calculatePasswordStrength('1234567890')).toEqual({
        score: 1,
        label: 'Weak',
      });
      expect(calculatePasswordStrength('ABCDEFGHIJKLMNOP')).toEqual({
        score: 1,
        label: 'Weak',
      });
    });
  });

  describe('Score 2 - Fair', () => {
    it('returns score 2 for length >= 8 with 2 character classes', () => {
      expect(calculatePasswordStrength('abcdefg1')).toEqual({
        score: 2,
        label: 'Fair',
      });
      expect(calculatePasswordStrength('abcdefghi1')).toEqual({
        score: 2,
        label: 'Fair',
      });
      expect(calculatePasswordStrength('abcdefghijklmno1')).toEqual({
        score: 2,
        label: 'Fair',
      });
    });

    it('returns score 2 for length < 10 with 3 or 4 character classes', () => {
      // Length 8, 3 classes
      expect(calculatePasswordStrength('Abcdefg1')).toEqual({
        score: 2,
        label: 'Fair',
      });
      // Length 8, 4 classes
      expect(calculatePasswordStrength('Abcd12!@')).toEqual({
        score: 2,
        label: 'Fair',
      });
      // Length 9, 3 classes
      expect(calculatePasswordStrength('Abcdefg12')).toEqual({
        score: 2,
        label: 'Fair',
      });
      // Length 9, 4 classes
      expect(calculatePasswordStrength('Abcd12!@#')).toEqual({
        score: 2,
        label: 'Fair',
      });
    });
  });

  describe('Score 3 - Strong', () => {
    it('returns score 3 for length >= 10 with 3 character classes (length < 16)', () => {
      expect(calculatePasswordStrength('Abcdefghi1')).toEqual({
        score: 3,
        label: 'Strong',
      });
      expect(calculatePasswordStrength('Abcdefghijklmno1')).toEqual({
        score: 3,
        label: 'Strong',
      });
    });

    it('returns score 3 for length 10 or 11 with 4 character classes', () => {
      expect(calculatePasswordStrength('Abcd123!@#')).toEqual({
        score: 3,
        label: 'Strong',
      });
      expect(calculatePasswordStrength('Abcde123!@#')).toEqual({
        score: 3,
        label: 'Strong',
      });
    });
  });

  describe('Score 4 - Very strong', () => {
    it('returns score 4 for length >= 12 with 4 character classes', () => {
      expect(calculatePasswordStrength('Abcdef123!@#')).toEqual({
        score: 4,
        label: 'Very strong',
      });
      expect(calculatePasswordStrength('Password123!@#')).toEqual({
        score: 4,
        label: 'Very strong',
      });
    });

    it('returns score 4 for length >= 16 with 3+ character classes', () => {
      expect(calculatePasswordStrength('Abcdefghijklmnop1')).toEqual({
        score: 4,
        label: 'Very strong',
      });
      expect(calculatePasswordStrength('Abcdefghijklmnop1!')).toEqual({
        score: 4,
        label: 'Very strong',
      });
    });
  });
});

describe('usePasswordStrength hook', () => {
  it('returns memoized result matching calculatePasswordStrength', () => {
    const { result, rerender } = renderHook(
      ({ password }) => usePasswordStrength(password),
      { initialProps: { password: 'InitialPassword1!' } }
    );

    expect(result.current).toEqual({
      score: 4,
      label: 'Very strong',
    });

    rerender({ password: 'short' });
    expect(result.current).toEqual({
      score: 0,
      label: 'Too short',
    });
  });
});
