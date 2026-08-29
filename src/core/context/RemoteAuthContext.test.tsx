import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteAuthProvider, useRemoteAuth } from './RemoteAuthContext';

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockResend = vi.fn();
const mockSignOut = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('../../shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      resend: (...args: any[]) => mockResend(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      updateUser: (...args: any[]) => mockUpdateUser(...args),
    },
  },
}));

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RemoteAuthProvider>{children}</RemoteAuthProvider>
);

describe('RemoteAuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('initializes unconfirmedEmail from localStorage if available', () => {
    localStorage.setItem('ojeet-pending-unconfirmed-email', 'stored@example.com');
    const { result } = renderHook(() => useRemoteAuth(), { wrapper });

    expect(result.current.unconfirmedEmail).toBe('stored@example.com');

  });

  it('sets unconfirmedEmail when signUp requires confirmation', async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'newuser@example.com', email_confirmed_at: null },
        session: null,
      },
      error: null,
    });

    const { result } = renderHook(() => useRemoteAuth(), { wrapper });

    let signUpRes: any;
    await act(async () => {
      signUpRes = await result.current.signUpWithEmail('newuser@example.com', 'StrongPass123!');
    });

    expect(signUpRes.confirmationRequired).toBe(true);
    expect(result.current.unconfirmedEmail).toBe('newuser@example.com');
    expect(localStorage.getItem('ojeet-pending-unconfirmed-email')).toBe('newuser@example.com');
  });

  it('sets unconfirmedEmail when signInWithPassword returns unconfirmed email error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email not confirmed' },
    });

    const { result } = renderHook(() => useRemoteAuth(), { wrapper });

    await act(async () => {
      const res = await result.current.signInWithPassword('unconfirmed@example.com', 'Pass12345!');
      expect(res.error).toBe('Email not confirmed');
    });

    expect(result.current.unconfirmedEmail).toBe('unconfirmed@example.com');
    expect(localStorage.getItem('ojeet-pending-unconfirmed-email')).toBe('unconfirmed@example.com');
  });



  it('calls resend with unconfirmedEmail when no email param is passed', async () => {
    mockResend.mockResolvedValue({ data: {}, error: null });
    localStorage.setItem('ojeet-pending-unconfirmed-email', 'resendme@example.com');

    const { result } = renderHook(() => useRemoteAuth(), { wrapper });

    await act(async () => {
      const res = await result.current.resendConfirmationEmail();
      expect(res.error).toBeNull();
    });

    expect(mockResend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'signup',
        email: 'resendme@example.com',
      })
    );
  });

  it('clears unconfirmed email on signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    localStorage.setItem('ojeet-pending-unconfirmed-email', 'signout@example.com');

    const { result } = renderHook(() => useRemoteAuth(), { wrapper });
    expect(result.current.unconfirmedEmail).toBe('signout@example.com');

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.unconfirmedEmail).toBeNull();
    expect(localStorage.getItem('ojeet-pending-unconfirmed-email')).toBeNull();
  });
});
