import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CloudSyncIndicator } from './CloudSyncIndicator';

const mockUseRemoteAuth = vi.fn();
const mockUseRemoteSync = vi.fn();
const mockUseNetworkStatus = vi.fn();

vi.mock('../../../core/context/RemoteAuthContext', () => ({
  useRemoteAuth: () => mockUseRemoteAuth(),
}));

vi.mock('../../../core/context/RemoteSyncContext', () => ({
  useRemoteSync: () => mockUseRemoteSync(),
}));

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));

describe('CloudSyncIndicator', () => {
  const mockSyncNow = vi.fn();
  const mockOnOpenSignIn = vi.fn();
  const mockHasPendingChanges = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNetworkStatus.mockReturnValue({ isOnline: true });
    mockUseRemoteAuth.mockReturnValue({ user: { id: 'user-1', email: 'test@example.com' } });
    mockHasPendingChanges.mockReturnValue(false);
    mockUseRemoteSync.mockReturnValue({
      status: 'synced',
      lastSyncedAt: '2026-01-01T00:00:00.000Z',
      lastError: null,
      syncNow: mockSyncNow,
      hasPendingChanges: mockHasPendingChanges,
    });
  });

  it('renders re-auth prompt (not Synced) and triggers onOpenSignIn instead of syncNow when status is auth_error', () => {
    mockHasPendingChanges.mockReturnValue(true);
    mockUseRemoteSync.mockReturnValue({
      status: 'auth_error',
      lastSyncedAt: '2026-01-01T00:00:00.000Z',
      lastError: 'Session expired',
      syncNow: mockSyncNow,
      hasPendingChanges: mockHasPendingChanges,
    });

    render(<CloudSyncIndicator onOpenSignIn={mockOnOpenSignIn} />);

    const button = screen.getByRole('button', {
      name: 'Cloud Sync Status: Session Expired',
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('state-auth-error');
    expect(screen.queryByRole('button', { name: 'Cloud Sync Status: Synced' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cloud Sync Status: Sync Queued' })).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(mockOnOpenSignIn).toHaveBeenCalledTimes(1);
    expect(mockSyncNow).not.toHaveBeenCalled();
  });

  it('renders Session Expired label when showLabel is true and triggers onOpenSignIn once on click', () => {
    mockUseRemoteSync.mockReturnValue({
      status: 'auth_error',
      lastSyncedAt: null,
      lastError: 'JWT expired',
      syncNow: mockSyncNow,
      hasPendingChanges: mockHasPendingChanges,
    });

    render(<CloudSyncIndicator showLabel={true} onOpenSignIn={mockOnOpenSignIn} />);

    expect(screen.getByText('Session Expired')).toBeInTheDocument();
    expect(screen.queryByText('Synced')).not.toBeInTheDocument();

    const button = screen.getByRole('button', {
      name: 'Cloud Sync Status: Session Expired',
    });
    fireEvent.click(button);

    expect(mockOnOpenSignIn).toHaveBeenCalledTimes(1);
    expect(mockSyncNow).not.toHaveBeenCalled();
  });

  it('renders Synced state and calls syncNow on click when healthy', () => {
    render(<CloudSyncIndicator showLabel={true} onOpenSignIn={mockOnOpenSignIn} />);

    expect(screen.getByText('Synced')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Cloud Sync Status: Synced' });
    fireEvent.click(button);

    expect(mockSyncNow).toHaveBeenCalledTimes(1);
    expect(mockOnOpenSignIn).not.toHaveBeenCalled();
  });

  it('renders Sync Error and retries syncNow on click when status is error', () => {
    mockUseRemoteSync.mockReturnValue({
      status: 'error',
      lastSyncedAt: null,
      lastError: 'Network timeout',
      syncNow: mockSyncNow,
      hasPendingChanges: mockHasPendingChanges,
    });

    render(<CloudSyncIndicator showLabel={true} onOpenSignIn={mockOnOpenSignIn} />);

    expect(screen.getByText('Sync Error')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Cloud Sync Status: Sync Error' });
    fireEvent.click(button);

    expect(mockSyncNow).toHaveBeenCalledTimes(1);
    expect(mockOnOpenSignIn).not.toHaveBeenCalled();
  });

  it('renders Local Only when signed out and triggers onOpenSignIn on click', () => {
    mockUseRemoteAuth.mockReturnValue({ user: null });

    render(<CloudSyncIndicator showLabel={true} onOpenSignIn={mockOnOpenSignIn} />);

    expect(screen.getByText('Local Only')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Cloud Sync Status: Local Only' });
    fireEvent.click(button);

    expect(mockOnOpenSignIn).toHaveBeenCalledTimes(1);
    expect(mockSyncNow).not.toHaveBeenCalled();
  });

  it('renders Offline when network is offline and does not trigger syncNow or onOpenSignIn', () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    mockUseRemoteSync.mockReturnValue({
      status: 'auth_error',
      lastSyncedAt: null,
      lastError: null,
      syncNow: mockSyncNow,
      hasPendingChanges: mockHasPendingChanges,
    });

    render(<CloudSyncIndicator showLabel={true} onOpenSignIn={mockOnOpenSignIn} />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Cloud Sync Status: Offline' });
    fireEvent.click(button);

    expect(mockSyncNow).not.toHaveBeenCalled();
    expect(mockOnOpenSignIn).not.toHaveBeenCalled();
  });
});
