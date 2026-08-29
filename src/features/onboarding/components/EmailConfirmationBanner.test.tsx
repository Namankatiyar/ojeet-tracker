import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailConfirmationBanner } from './EmailConfirmationBanner';

const mockResendConfirmationEmail = vi.fn();
let mockUser: any = null;
let mockUnconfirmedEmail: string | null = null;

vi.mock('../../../core/context/RemoteAuthContext', () => ({
  useRemoteAuth: () => ({
    user: mockUser,
    unconfirmedEmail: mockUnconfirmedEmail,
    resendConfirmationEmail: mockResendConfirmationEmail,
  }),
}));

describe('EmailConfirmationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockUnconfirmedEmail = null;
  });

  it('renders with email prop provided', () => {
    render(<EmailConfirmationBanner email="student@example.com" />);

    expect(
      screen.getByText('Check your inbox at student@example.com to confirm your account.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend link/i })).toBeInTheDocument();
  });

  it('renders with unconfirmedEmail from context when prop is omitted', () => {
    mockUnconfirmedEmail = 'context-user@example.com';
    render(<EmailConfirmationBanner />);

    expect(
      screen.getByText('Check your inbox at context-user@example.com to confirm your account.')
    ).toBeInTheDocument();
  });

  it('resends confirmation email on button click and shows success status', async () => {
    mockResendConfirmationEmail.mockResolvedValue({ error: null });
    render(<EmailConfirmationBanner email="student@example.com" />);

    const resendBtn = screen.getByRole('button', { name: /resend link/i });
    fireEvent.click(resendBtn);

    expect(mockResendConfirmationEmail).toHaveBeenCalledWith('student@example.com');

    await waitFor(() => {
      expect(screen.getByText('Confirmation email resent!')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
    });
  });

  it('displays error message when resend fails', async () => {
    mockResendConfirmationEmail.mockResolvedValue({
      error: 'Rate limit exceeded. Please wait.',
    });
    render(<EmailConfirmationBanner email="student@example.com" />);

    const resendBtn = screen.getByRole('button', { name: /resend link/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Too many requests. Please wait a moment before trying again.')
      ).toBeInTheDocument();
    });
  });

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<EmailConfirmationBanner email="student@example.com" onDismiss={onDismiss} />);

    const closeBtn = screen.getByLabelText('Dismiss email confirmation banner');
    fireEvent.click(closeBtn);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
