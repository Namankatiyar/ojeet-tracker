import type { User } from '@supabase/supabase-js';
import { calculatePasswordStrength } from '../hooks/usePasswordStrength';

export interface PasswordValidationResult {
  valid: boolean;
  error: string | null;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/i.test(username.trim());
}

export function toSupabaseEmail(username: string): string {
  return `${normalizeUsername(username)}@ojeet.local`;
}

export function validateUsername(username: string): { valid: boolean; error: string | null } {
  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long.' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be at most 20 characters long.' };
  }

  if (!isValidUsername(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, and underscores.',
    };
  }

  return { valid: true, error: null };
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

/**
 * Resolves a user's display name with robust fallback hierarchy.
 * Order: fallbackName -> user_metadata.full_name -> user_metadata.name -> user_metadata.display_name -> email prefix -> ''
 */
export function getDisplayName(
  user?: User | null,
  fallbackName?: string | null
): string {
  if (fallbackName && fallbackName.trim() !== '') {
    return fallbackName.trim();
  }

  if (user) {
    const meta = user.user_metadata;
    if (meta) {
      if (typeof meta.full_name === 'string' && meta.full_name.trim() !== '') {
        return meta.full_name.trim();
      }
      if (typeof meta.name === 'string' && meta.name.trim() !== '') {
        return meta.name.trim();
      }
      if (typeof meta.display_name === 'string' && meta.display_name.trim() !== '') {
        return meta.display_name.trim();
      }
    }

    if (user.email && user.email.includes('@')) {
      const emailPrefix = user.email.split('@')[0]?.trim();
      if (emailPrefix) {
        return emailPrefix;
      }
    }
  }

  return '';
}

/**
 * Resolves a user's avatar URL with fallback hierarchy.
 * Order: fallbackAvatar -> user_metadata.avatar_url -> user_metadata.picture -> null
 */
export function getAvatarUrl(
  user?: User | null,
  fallbackAvatar?: string | null
): string | null {
  if (fallbackAvatar && fallbackAvatar.trim() !== '') {
    return fallbackAvatar.trim();
  }

  if (user) {
    const meta = user.user_metadata;
    if (meta) {
      if (typeof meta.avatar_url === 'string' && meta.avatar_url.trim() !== '') {
        return meta.avatar_url.trim();
      }
      if (typeof meta.picture === 'string' && meta.picture.trim() !== '') {
        return meta.picture.trim();
      }
    }
  }

  return null;
}

export function isUnconfirmedEmailError(error: unknown): boolean {
  if (!error) return false;

  let rawMessage = '';
  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    rawMessage = (error as { message: string }).message;
  } else {
    rawMessage = String(error);
  }

  const normalized = rawMessage.toLowerCase().trim();

  return (
    normalized.includes('email not confirmed') ||
    normalized.includes('not confirmed') ||
    normalized.includes('email_not_confirmed')
  );
}

export function formatAuthError(error: unknown): string {
  if (!error) return '';

  let rawMessage = '';
  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    rawMessage = (error as { message: string }).message;
  } else {
    rawMessage = String(error);
  }

  const normalized = rawMessage.toLowerCase().trim();

  if (normalized.includes('invalid login credentials') || normalized.includes('invalid credentials')) {
    return 'Incorrect username or password. Please try again.';
  }

  if (
    normalized.includes('user already registered') ||
    normalized.includes('already registered') ||
    normalized.includes('email address already in use')
  ) {
    return 'This username is already taken.';
  }

  if (normalized.includes('username') && normalized.includes('already')) {
    return 'This username is already taken.';
  }

  if (
    normalized.includes('over_email_send_rate_limit') ||
    normalized.includes('rate limit exceeded') ||
    normalized.includes('rate limit') ||
    normalized.includes('too many requests')
  ) {
    return 'Too many requests. Please wait a moment before trying again.';
  }

  if (
    normalized.includes('password should be at least 8 characters') ||
    normalized.includes('password must be at least 8 characters')
  ) {
    return 'Password must be at least 8 characters long.';
  }

  return rawMessage;
}
