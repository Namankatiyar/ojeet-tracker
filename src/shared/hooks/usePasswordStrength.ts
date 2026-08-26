import { useMemo } from 'react';

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrengthResult {
  score: PasswordScore;
  label: string;
}

export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const length = password.length;

  if (length < 8) {
    return {
      score: 0,
      label: 'Too short',
    };
  }

  let classCount = 0;
  if (/[a-z]/.test(password)) classCount++;
  if (/[A-Z]/.test(password)) classCount++;
  if (/[0-9]/.test(password)) classCount++;
  if (/[^a-zA-Z0-9]/.test(password)) classCount++;

  // Score 4: length >= 12 with 4 character classes OR length >= 16 with 3+ classes
  if ((length >= 12 && classCount >= 4) || (length >= 16 && classCount >= 3)) {
    return {
      score: 4,
      label: 'Very strong',
    };
  }

  // Score 3: length >= 10, 3 character classes (or 4 classes with length 10-11)
  if (length >= 10 && classCount >= 3) {
    return {
      score: 3,
      label: 'Strong',
    };
  }

  // Score 2: length >= 8, 2 character classes (or 3+ classes if length < 10)
  if (classCount === 2 || (length < 10 && classCount >= 3)) {
    return {
      score: 2,
      label: 'Fair',
    };
  }

  // Score 1: length >= 8, <= 1 character class
  return {
    score: 1,
    label: 'Weak',
  };
}

export function usePasswordStrength(password: string): PasswordStrengthResult {
  return useMemo(() => calculatePasswordStrength(password), [password]);
}
