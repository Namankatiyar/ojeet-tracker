import { calculatePasswordStrength } from '../hooks/usePasswordStrength';

export interface PasswordValidationResult {
  valid: boolean;
  error: string | null;
}

export function validatePassword(
  password: string,
  confirmPassword?: string
): PasswordValidationResult {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }

  const { score } = calculatePasswordStrength(password);
  if (score < 2) {
    return { valid: false, error: 'Please choose a stronger password.' };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match.' };
  }

  return { valid: true, error: null };
}
