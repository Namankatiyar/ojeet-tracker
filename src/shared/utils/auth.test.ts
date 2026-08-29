import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  getDisplayName,
  getAvatarUrl,
  validatePassword,
  formatAuthError,
  isUnconfirmedEmailError,
} from './auth';

describe('auth utils', () => {
  describe('isUnconfirmedEmailError', () => {
    it('returns false when error is falsy', () => {
      expect(isUnconfirmedEmailError('')).toBe(false);
      expect(isUnconfirmedEmailError(null)).toBe(false);
      expect(isUnconfirmedEmailError(undefined)).toBe(false);
    });

    it('returns false for unrelated errors', () => {
      expect(isUnconfirmedEmailError('Invalid login credentials')).toBe(false);
      expect(isUnconfirmedEmailError(new Error('Network error'))).toBe(false);
      expect(isUnconfirmedEmailError({ message: 'User already registered' })).toBe(false);
    });

    it('detects unconfirmed email strings, errors, and error objects', () => {
      expect(isUnconfirmedEmailError('Email not confirmed')).toBe(true);
      expect(isUnconfirmedEmailError('email_not_confirmed')).toBe(true);
      expect(isUnconfirmedEmailError('User email is not confirmed.')).toBe(true);
      expect(isUnconfirmedEmailError(new Error('Email not confirmed'))).toBe(true);
      expect(isUnconfirmedEmailError({ message: 'Email not confirmed' })).toBe(true);
      expect(isUnconfirmedEmailError({ message: 'email_not_confirmed' })).toBe(true);
    });
  });
  describe('formatAuthError', () => {
    it('returns empty string when error is falsy', () => {
      expect(formatAuthError('')).toBe('');
      expect(formatAuthError(null)).toBe('');
      expect(formatAuthError(undefined)).toBe('');
    });

    it('maps invalid login credentials error', () => {
      expect(formatAuthError('Invalid login credentials')).toBe(
        'Incorrect email or password. Please try again.'
      );
      expect(formatAuthError('invalid credentials')).toBe(
        'Incorrect email or password. Please try again.'
      );
      expect(formatAuthError(new Error('Invalid login credentials provided'))).toBe(
        'Incorrect email or password. Please try again.'
      );
    });

    it('maps user already registered error', () => {
      expect(formatAuthError('User already registered')).toBe(
        'An account with this email already exists. Try signing in instead.'
      );
      expect(formatAuthError({ message: 'User already registered' })).toBe(
        'An account with this email already exists. Try signing in instead.'
      );
    });

    it('maps unconfirmed email error', () => {
      expect(formatAuthError('Email not confirmed')).toBe(
        'Your email has not been confirmed yet. Please check your inbox or resend the link.'
      );
      expect(formatAuthError('email_not_confirmed')).toBe(
        'Your email has not been confirmed yet. Please check your inbox or resend the link.'
      );
    });

    it('maps rate limit error', () => {
      expect(formatAuthError('over_email_send_rate_limit')).toBe(
        'Too many requests. Please wait a moment before trying again.'
      );
      expect(formatAuthError('Rate limit exceeded')).toBe(
        'Too many requests. Please wait a moment before trying again.'
      );
      expect(formatAuthError('Too many requests')).toBe(
        'Too many requests. Please wait a moment before trying again.'
      );
    });

    it('maps password character length error', () => {
      expect(formatAuthError('Password should be at least 8 characters')).toBe(
        'Password must be at least 8 characters long.'
      );
    });

    it('falls back to raw message for unmapped errors', () => {
      expect(formatAuthError('Network error connecting to database')).toBe(
        'Network error connecting to database'
      );
      expect(formatAuthError(new Error('Something unexpected happened'))).toBe(
        'Something unexpected happened'
      );
    });
  });

  describe('validatePassword', () => {
    it('rejects passwords shorter than 8 characters', () => {
      const res = validatePassword('Ab1!');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Password must be at least 8 characters long.');
    });

    it('rejects weak passwords with score < 2', () => {
      const res = validatePassword('aaaaaaaa');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Please choose a stronger password.');
    });

    it('rejects mismatched confirm password', () => {
      const res = validatePassword('StrongPass123!', 'DifferentPass123!');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Passwords do not match.');
    });

    it('accepts strong valid password matching confirmation', () => {
      const res = validatePassword('StrongPass123!', 'StrongPass123!');
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });
  });

  describe('getDisplayName', () => {
    it('returns empty string when user and fallback are null/undefined', () => {
      expect(getDisplayName(null)).toBe('');
      expect(getDisplayName(undefined)).toBe('');
    });

    it('prioritizes non-empty fallbackName', () => {
      const user = {
        email: 'user@example.com',
        user_metadata: { full_name: 'Google User' },
      } as unknown as User;
      expect(getDisplayName(user, 'Custom Name')).toBe('Custom Name');
    });

    it('falls back to full_name in user_metadata', () => {
      const user = {
        email: 'user@example.com',
        user_metadata: { full_name: 'Full Name' },
      } as unknown as User;
      expect(getDisplayName(user)).toBe('Full Name');
    });

    it('falls back to name in user_metadata', () => {
      const user = {
        email: 'user@example.com',
        user_metadata: { name: 'Given Name' },
      } as unknown as User;
      expect(getDisplayName(user)).toBe('Given Name');
    });

    it('falls back to display_name in user_metadata', () => {
      const user = {
        email: 'user@example.com',
        user_metadata: { display_name: 'Display Name' },
      } as unknown as User;
      expect(getDisplayName(user)).toBe('Display Name');
    });

    it('falls back to email prefix if metadata has no names', () => {
      const user = {
        email: 'student.jee2026@gmail.com',
        user_metadata: {},
      } as unknown as User;
      expect(getDisplayName(user)).toBe('student.jee2026');
    });

    it('ignores empty fallbackName and uses user metadata/email', () => {
      const user = {
        email: 'naman@ojeet.tech',
        user_metadata: { full_name: 'Naman K' },
      } as unknown as User;
      expect(getDisplayName(user, '   ')).toBe('Naman K');
    });
  });

  describe('getAvatarUrl', () => {
    it('returns null when user and fallback are null/undefined', () => {
      expect(getAvatarUrl(null)).toBeNull();
      expect(getAvatarUrl(undefined)).toBeNull();
    });

    it('prioritizes non-empty fallbackAvatar', () => {
      const user = {
        user_metadata: { avatar_url: 'https://google.com/photo.jpg' },
      } as unknown as User;
      expect(getAvatarUrl(user, 'https://cdn.example.com/avatar.png')).toBe(
        'https://cdn.example.com/avatar.png'
      );
    });

    it('falls back to avatar_url in user_metadata', () => {
      const user = {
        user_metadata: { avatar_url: 'https://google.com/avatar.jpg' },
      } as unknown as User;
      expect(getAvatarUrl(user)).toBe('https://google.com/avatar.jpg');
    });

    it('falls back to picture in user_metadata', () => {
      const user = {
        user_metadata: { picture: 'https://google.com/picture.jpg' },
      } as unknown as User;
      expect(getAvatarUrl(user)).toBe('https://google.com/picture.jpg');
    });

    it('returns null if no avatar metadata exists', () => {
      const user = {
        email: 'user@example.com',
        user_metadata: {},
      } as unknown as User;
      expect(getAvatarUrl(user)).toBeNull();
    });
  });
});
