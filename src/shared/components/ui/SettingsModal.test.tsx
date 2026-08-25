import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SettingsModal } from './SettingsModal';
import { BrowserRouter } from 'react-router-dom';

// Manual mock for pwaBridge to bypass virtual imports
vi.mock('../../utils/pwaBridge');

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Download: () => <div data-testid="icon-download" />,
  Upload: () => <div data-testid="icon-upload" />,
  X: () => <div data-testid="icon-x" />,
  AlertTriangle: () => <div data-testid="icon-alert" />,
  Check: () => <div data-testid="icon-check" />,
  Image: () => <div data-testid="icon-image" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Cloud: () => <div data-testid="icon-cloud" />,
  LogOut: () => <div data-testid="icon-logout" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
}));

// Mock Contexts
const mockSignInWithGoogle = vi.fn();
const mockSignOut = vi.fn();
const mockResetPrompt = vi.fn();
vi.mock('../../../core/context/RemoteAuthContext', () => ({
  useRemoteAuth: () => ({
    user: { email: 'test@example.com' },
    isConfigured: true,
    signInWithGoogle: mockSignInWithGoogle,
    signOut: mockSignOut,
    resetPrompt: mockResetPrompt,
  }),
}));

const mockSetExamMode = vi.fn();
vi.mock('../../../core/context/UserProgressContext', () => ({
  useUserProgress: () => ({
    examMode: 'jee',
    setExamMode: mockSetExamMode,
  }),
  useSettings: () => ({
    examMode: 'jee',
    setExamMode: mockSetExamMode,
  }),
}));

const mockSyncNow = vi.fn();
vi.mock('../../../core/context/RemoteSyncContext', () => ({
  useRemoteSync: () => ({
    status: 'idle',
    lastSyncedAt: null,
    lastError: null,
    remoteStudyAggregate: null,
    syncNow: mockSyncNow,
  }),
}));

// Mock Navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock PWA bridge
vi.mock('../../utils/pwaBridge', () => ({
  runPwaRecoveryAndReload: vi.fn(),
}));

// Mock Vibrant
vi.mock('node-vibrant/browser', () => ({
  Vibrant: {
    from: vi.fn().mockReturnValue({
      getPalette: vi.fn().mockResolvedValue({
        Vibrant: { hex: '#ff0000' },
      }),
    }),
  },
}));

describe('SettingsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    theme: 'light' as const,
    onThemeChange: vi.fn(),
    disableAutoShift: false,
    onDisableAutoShiftChange: vi.fn(),
    enableAIAgent: true,
    onEnableAIAgentChange: vi.fn(),
    enableMusicPlayer: true,
    onEnableMusicPlayerChange: vi.fn(),
    dailyResetHour: 0,
    onDailyResetHourChange: vi.fn(),
    backgroundUrl: '',
    onBackgroundUrlChange: vi.fn(),
    useGridBackground: true,
    onUseGridBackgroundChange: vi.fn(),
    dimLevel: 20,
    onDimLevelChange: vi.fn(),
    glassIntensity: 50,
    onGlassIntensityChange: vi.fn(),
    glassRefraction: 30,
    onGlassRefractionChange: vi.fn(),
    onAccentChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Create modal root for portal
    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  });

  afterEach(() => {
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) document.body.removeChild(modalRoot);
  });

  it('renders nothing when closed', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} isOpen={false} />
      </BrowserRouter>
    );
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('renders correctly when open', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Behavior')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('triggers onDisableAutoShiftChange when toggle is clicked', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(defaultProps.onDisableAutoShiftChange).toHaveBeenCalledWith(true);
  });

  it('triggers onEnableAIAgentChange when toggle is clicked', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(defaultProps.onEnableAIAgentChange).toHaveBeenCalledWith(false);
  });

  it('triggers onEnableMusicPlayerChange when toggle is clicked', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[2]);
    expect(defaultProps.onEnableMusicPlayerChange).toHaveBeenCalledWith(false);
  });

  it('triggers onThemeChange when theme buttons are clicked', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );

    const solidBtn = screen.getByText('Dark (Solid)');
    fireEvent.click(solidBtn);
    expect(defaultProps.onThemeChange).toHaveBeenCalledWith('dark-solid');

    const glassBtn = screen.getByText('Dark (Glass)');
    fireEvent.click(glassBtn);
    expect(defaultProps.onThemeChange).toHaveBeenCalledWith('dark-glass');
  });

  it('triggers appearance change handlers on slider input', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );

    const dimSlider = document.querySelector('.dim-slider') as HTMLInputElement;
    expect(dimSlider).toBeTruthy();
    fireEvent.change(dimSlider, { target: { value: '40' } });
    expect(defaultProps.onDimLevelChange).toHaveBeenCalledWith(40);

    const glassSlider = document.querySelector(
      '.glass-slider:not(.refraction-slider)'
    ) as HTMLInputElement;
    expect(glassSlider).toBeTruthy();
    fireEvent.change(glassSlider, { target: { value: '60' } });
    expect(defaultProps.onGlassIntensityChange).toHaveBeenCalledWith(60);

    const refractionSlider = document.querySelector('.refraction-slider') as HTMLInputElement;
    expect(refractionSlider).toBeTruthy();
    fireEvent.change(refractionSlider, { target: { value: '75' } });
    expect(defaultProps.onGlassRefractionChange).toHaveBeenCalledWith(75);
  });

  it('handles navigation items correctly', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );

    fireEvent.click(
      screen.getByText('Changelog').closest('.settings-row')!.querySelector('button')!
    );
    expect(mockNavigate).toHaveBeenCalledWith('/changelog');
    expect(defaultProps.onClose).toHaveBeenCalled();

    fireEvent.click(
      screen.getByText('Privacy Policy').closest('.settings-row')!.querySelector('button')!
    );
    expect(mockNavigate).toHaveBeenCalledWith('/privacy-policy');

    fireEvent.click(
      screen.getByText('Terms of Service').closest('.settings-row')!.querySelector('button')!
    );
    expect(mockNavigate).toHaveBeenCalledWith('/terms-of-service');
  });

  it('triggers sync when Sync Now is clicked', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );
    const syncBtn = screen.getByText('Sync Now').closest('button');
    if (syncBtn) fireEvent.click(syncBtn);
    expect(mockSyncNow).toHaveBeenCalled();
  });

  it('calls signOut when Sign Out is clicked', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );
    const signOutBtn = screen.getByText('Sign Out').closest('button');
    if (signOutBtn) fireEvent.click(signOutBtn);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('renders daily progress reset time setting', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );
    expect(screen.getByText('Daily Progress Reset Time')).toBeDefined();
    expect(screen.getByText('12:00 AM (Midnight - Default)')).toBeDefined();
  });

  it('renders exam mode toggle and triggers setExamMode on click', () => {
    render(
      <BrowserRouter>
        <SettingsModal {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('Exam Mode')).toBeDefined();

    const jeeBtn = screen.getByText('JEE');
    const neetBtn = screen.getByText('NEET');

    expect(jeeBtn).toBeDefined();
    expect(neetBtn).toBeDefined();

    fireEvent.click(neetBtn);
    expect(mockSetExamMode).toHaveBeenCalledWith('neet');
  });
});
