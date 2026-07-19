import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Subject, StudySession, MockScore, ProgressCardSettings } from '../../types';
import {
  LayoutDashboard,
  Atom,
  FlaskConical,
  Pi,
  Sun,
  Moon,
  Zap,
  Palette,
  Settings,
  Calendar,
  Clock,
  Menu,
  BarChart2,
  Heart,
  Users,
  X,
  BookOpen,
  Target,
  Dna,
} from 'lucide-react';
import { useActiveSubjects } from '../../hooks/useActiveSubjects';
import { SettingsModal } from '../ui/SettingsModal';
import { ColorPickerModal } from '../ui/ColorPickerModal';
import { UserAvatar } from '../ui/Avatar';
import { ProgressCardModal } from '../ui/ProgressCardModal';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { CloudSyncIndicator } from './CloudSyncIndicator';
import { CloudSyncPromptModal } from '../../../features/sync/CloudSyncPromptModal';

interface HeaderProps {
  currentView:
    | 'dashboard'
    | 'planner'
    | 'studyclock'
    | 'reports'
    | 'mockscores'
    | 'support'
    | 'community'
    | Subject;
  onNavigate: (
    view: 'dashboard' | 'planner' | 'studyclock' | 'reports' | 'mockscores' | 'support' | 'community' | Subject
  ) => void;
  theme: 'light' | 'dark-glass' | 'dark-solid';
  onThemeChange: (theme: 'light' | 'dark-glass' | 'dark-solid') => void;
  onThemeToggle: () => void;
  accentColor: string;
  onAccentChange: (color: string) => void;
  useGridBackground: boolean;
  onUseGridBackgroundChange: (value: boolean) => void;
  // New Settings Props
  disableAutoShift: boolean;
  onDisableAutoShiftChange: (value: boolean) => void;
  enableAIAgent: boolean;
  onEnableAIAgentChange: (value: boolean) => void;
  enableMusicPlayer: boolean;
  onEnableMusicPlayerChange: (value: boolean) => void;
  dailyResetHour: number;
  onDailyResetHourChange: (hour: number) => void;
  backgroundUrl: string;
  onBackgroundUrlChange: (url: string) => void;
  dimLevel: number;
  onDimLevelChange: (level: number) => void;
  glassIntensity: number;
  onGlassIntensityChange: (intensity: number) => void;
  glassRefraction: number;
  onGlassRefractionChange: (refraction: number) => void;
  // Progress Card Props
  studySessions: StudySession[];
  mockScores: MockScore[];
  physicsProgress: number;
  chemistryProgress: number;
  mathsProgress: number;
  biologyProgress?: number;
  examDate: string;
  progressCardSettings: ProgressCardSettings;
  onProgressCardSettingsChange: (settings: ProgressCardSettings) => void;
}

const ACCENT_COLORS = [
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Cyan', value: '#00F0FF' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Cyan (Deep)', value: '#06b6d4' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Fuchsia', value: '#d946ef' },
];

export function Header({
  currentView,
  onNavigate,
  theme,
  onThemeChange,
  onThemeToggle,
  accentColor,
  onAccentChange,
  useGridBackground,
  onUseGridBackgroundChange,
  disableAutoShift,
  onDisableAutoShiftChange,
  enableAIAgent,
  onEnableAIAgentChange,
  enableMusicPlayer,
  onEnableMusicPlayerChange,
  dailyResetHour,
  onDailyResetHourChange,
  backgroundUrl,
  onBackgroundUrlChange,
  dimLevel,
  onDimLevelChange,
  glassIntensity,
  onGlassIntensityChange,
  glassRefraction,
  onGlassRefractionChange,
  studySessions,
  mockScores,
  physicsProgress,
  chemistryProgress,
  mathsProgress,
  biologyProgress,
  examDate,
  progressCardSettings,
  onProgressCardSettingsChange,
}: HeaderProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomColorModalOpen, setIsCustomColorModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubjectsMenuOpen, setIsSubjectsMenuOpen] = useState(false);
  const [isProgressCardOpen, setIsProgressCardOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { signInWithGoogle } = useRemoteAuth();
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const subjectsMenuRef = useRef<HTMLDivElement>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
      setIsSignInModalOpen(false);
    }
  };

  // Manage body class for drawer open state so external FABs can adapt
  useEffect(() => {
    if (isMobileMenuOpen || isSubjectsMenuOpen) {
      document.body.classList.add('has-mobile-drawer-open');
    } else {
      document.body.classList.remove('has-mobile-drawer-open');
    }
    return () => {
      document.body.classList.remove('has-mobile-drawer-open');
    };
  }, [isMobileMenuOpen, isSubjectsMenuOpen]);

  // Close on outside click for Color Picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };

    if (isColorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorPickerOpen]);

  // Close on outside click for Mobile Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        if (!(target instanceof Element && target.closest('.mobile-menu-toggle'))) {
          setIsMobileMenuOpen(false);
        }
      }
      if (subjectsMenuRef.current && !subjectsMenuRef.current.contains(target)) {
        if (!(target instanceof Element && target.closest('.mobile-bottom-nav-item'))) {
          setIsSubjectsMenuOpen(false);
        }
      }
    };

    if (isMobileMenuOpen || isSubjectsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, isSubjectsMenuOpen]);

  const { subjects, subjectMeta } = useActiveSubjects();

  const SUBJECT_ICON_MAP: Record<string, React.ComponentType<any>> = {
    atom: Atom,
    'flask-conical': FlaskConical,
    pi: Pi,
    dna: Dna,
  };

  const subjectNavItems = subjectMeta.map((meta) => {
    const Icon = SUBJECT_ICON_MAP[meta.iconKey] ?? FlaskConical;
    return {
      key: meta.key,
      label: meta.label,
      icon: <Icon size={20} />,
    };
  });

  const navItems: {
    key: 'dashboard' | 'planner' | 'studyclock' | 'reports' | 'mockscores' | 'community' | Subject;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    ...subjectNavItems,
    { key: 'planner', label: 'Planner', icon: <Calendar size={20} /> },
    { key: 'studyclock', label: 'Study Clock', icon: <Clock size={20} /> },
    { key: 'reports', label: 'Reports', icon: <BarChart2 size={20} /> },
    { key: 'mockscores', label: 'Mock Scores', icon: <Target size={20} /> },
    { key: 'community', label: 'Community', icon: <Users size={20} /> },
  ];

  const isCustomColor = !ACCENT_COLORS.some((c) => c.value === accentColor);

  const handleCustomColorConfirm = (color: string) => {
    onAccentChange(color);
    setIsCustomColorModalOpen(false);
    setIsColorPickerOpen(false);
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-avatar-mobile">
          <UserAvatar
            name={progressCardSettings.userName || 'Student'}
            size={32}
            customImageUrl={progressCardSettings.customAvatarUrl}
            accentColor={accentColor}
            onClick={() => setIsProgressCardOpen(true)}
          />
        </div>

        <div className="logo">
          <span className="logo-text">OJEE Tracker</span>
          <div className="header-avatar">
            <UserAvatar
              name={progressCardSettings.userName || 'Student'}
              size={32}
              customImageUrl={progressCardSettings.customAvatarUrl}
              accentColor={accentColor}
              onClick={() => setIsProgressCardOpen(true)}
            />
          </div>
        </div>

        <nav className="nav">
          {navItems.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`nav-item ${currentView === key ? 'active' : ''}`}
              onClick={() => onNavigate(key)}
            >
              {currentView === key && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="nav-item-active-bg"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="nav-icon">{icon}</span>
              <span className="nav-label-wrapper">
                <span className="nav-label">{label}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          {/* Desktop Actions */}
          <div className="desktop-actions">
            <CloudSyncIndicator onOpenSignIn={() => setIsSignInModalOpen(true)} />

            <div className="color-picker-container" ref={colorPickerRef}>
              <button
                className="color-picker-toggle"
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                aria-label="Change accent color"
                title="Change accent color"
              >
                <div
                  className="current-color-indicator"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <Palette size={20} color="var(--accent-text)" style={{ opacity: 0.8 }} />
                </div>
              </button>

              {isColorPickerOpen && (
                <div className="color-picker-popup">
                  <div className="color-grid">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        className={`color-option ${accentColor === color.value ? 'selected' : ''}`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => {
                          onAccentChange(color.value);
                          setIsColorPickerOpen(false);
                        }}
                        title={color.name}
                        aria-label={`Select ${color.name}`}
                      />
                    ))}
                    <button
                      className={`color-option custom-color-option ${isCustomColor ? 'selected' : ''}`}
                      style={
                        isCustomColor
                          ? { background: accentColor, border: '2px solid var(--text-primary)' }
                          : {}
                      }
                      onClick={() => {
                        setIsCustomColorModalOpen(true);
                        setIsColorPickerOpen(false);
                      }}
                      title="Custom Color"
                      aria-label="Pick a custom color"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isCustomColor ? 'var(--accent-text)' : 'var(--text-muted)'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              className="theme-toggle"
              onClick={onThemeToggle}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <span className="theme-toggle-icon">
                {theme === 'light' ? (
                  <Moon size={20} />
                ) : theme === 'dark-solid' ? (
                  <Zap size={20} />
                ) : (
                  <Sun size={20} />
                )}
              </span>
            </button>

            <button
              className="theme-toggle"
              onClick={() => onNavigate('support')}
              aria-label="Support OJEE-Tracker"
              title="Support OJEE-Tracker"
            >
              <span className="theme-toggle-icon">
                <Heart
                  size={20}
                  color="#e63946"
                  fill={currentView === 'support' ? '#e63946' : 'transparent'}
                />
              </span>
            </button>

            <button
              className="theme-toggle"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              title="Settings & Data Backup"
            >
              <span className="theme-toggle-icon">
                <Settings size={20} />
              </span>
            </button>
          </div>

          <span className="mobile-header-sync">
            <CloudSyncIndicator compact onOpenSignIn={() => setIsSignInModalOpen(true)} />
          </span>

          {/* Tablet/Desktop Menu Toggle (Visible only between 48rem and 64rem) */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Open menu"
          >
            <Menu size={24} color="var(--text-primary)" />
          </button>
        </div>

        <button
          className="header-support-mobile"
          onClick={() => onNavigate('support')}
          aria-label="Support OJEE-Tracker"
          title="Support OJEE-Tracker"
        >
          <Heart
            size={20}
            color="#e63946"
            fill={currentView === 'support' ? '#e63946' : 'transparent'}
          />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible only on widths <= 48rem) */}
      {createPortal(
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          <button
            type="button"
            className={`mobile-bottom-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              onNavigate('dashboard');
              setIsMobileMenuOpen(false);
              setIsSubjectsMenuOpen(false);
            }}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${currentView === 'planner' ? 'active' : ''}`}
            onClick={() => {
              onNavigate('planner');
              setIsMobileMenuOpen(false);
              setIsSubjectsMenuOpen(false);
            }}
          >
            <Calendar size={20} />
            <span>Planner</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${currentView === 'studyclock' ? 'active' : ''}`}
            onClick={() => {
              onNavigate('studyclock');
              setIsMobileMenuOpen(false);
              setIsSubjectsMenuOpen(false);
            }}
          >
            <Clock size={20} />
            <span>Timer</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${subjects.includes(currentView as Subject) || isSubjectsMenuOpen ? 'active' : ''}`}
            onClick={() => {
              setIsSubjectsMenuOpen(!isSubjectsMenuOpen);
              setIsMobileMenuOpen(false);
            }}
          >
            <BookOpen size={20} />
            <span>Subjects</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              setIsSubjectsMenuOpen(false);
            }}
          >
            <Menu size={20} />
            <span>Menu</span>
          </button>
        </nav>,
        document.body
      )}

      {/* Mobile Subjects Bottom Sheet */}
      {isSubjectsMenuOpen &&
        createPortal(
          <>
            <div className="mobile-sidebar-overlay" onClick={() => setIsSubjectsMenuOpen(false)} />
            <div className="mobile-subjects-sheet" ref={subjectsMenuRef}>
              <div className="mobile-subjects-sheet-head">
                <h4>Select Subject</h4>
                <button
                  type="button"
                  className="mobile-sidebar-close"
                  onClick={() => setIsSubjectsMenuOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mobile-subjects-grid">
                {subjectMeta.map((meta) => {
                  let progress = 0;
                  if (meta.key === 'physics') progress = physicsProgress;
                  else if (meta.key === 'chemistry') progress = chemistryProgress;
                  else if (meta.key === 'maths') progress = mathsProgress;
                  else if (meta.key === 'biology') progress = biologyProgress ?? 0;

                  const color = meta.colorVar;
                  const Icon = SUBJECT_ICON_MAP[meta.iconKey] ?? FlaskConical;

                  return (
                    <button
                      key={meta.key}
                      type="button"
                      className={`mobile-subject-card ${currentView === meta.key ? 'active' : ''}`}
                      onClick={() => {
                        onNavigate(meta.key);
                        setIsSubjectsMenuOpen(false);
                      }}
                    >
                      <div className="mobile-subject-icon" style={{ color }}>
                        <Icon size={22} />
                      </div>
                      <div className="mobile-subject-info">
                        <span className="mobile-subject-name">{meta.label}</span>
                        <div className="mobile-subject-progress-bar">
                          <div
                            className="mobile-subject-progress-fill"
                            style={{
                              width: `${Math.min(100, Math.max(0, progress))}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                      <span className="mobile-subject-percent">{Math.round(progress)}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Mobile Sidebar Navigation Drawer */}
      {isMobileMenuOpen &&
        createPortal(
          <>
            <div className="mobile-sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="mobile-sidebar-drawer" ref={mobileMenuRef}>
              <div className="mobile-sidebar-header">
                <div className="mobile-sidebar-profile">
                  <UserAvatar
                    name={progressCardSettings.userName || 'Student'}
                    size={40}
                    customImageUrl={progressCardSettings.customAvatarUrl}
                    accentColor={accentColor}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsProgressCardOpen(true);
                    }}
                  />
                  <div>
                    <h4 className="mobile-sidebar-user-name">{progressCardSettings.userName || 'Student'}</h4>
                  </div>
                </div>
                <button
                  type="button"
                  className="mobile-sidebar-close"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close navigation drawer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mobile-sidebar-body">
                <div className="mobile-sidebar-sync-row">
                  <CloudSyncIndicator
                    showLabel={true}
                    onOpenSignIn={() => {
                      setIsMobileMenuOpen(false);
                      setIsSignInModalOpen(true);
                    }}
                  />
                </div>
                <div className="mobile-sidebar-section">
                  <span className="mobile-sidebar-label">Navigation</span>
                  <div className="mobile-sidebar-list">
                    {navItems.map(({ key, label, icon }) => (
                      <button
                        key={key}
                        type="button"
                        className={`mobile-sidebar-item ${currentView === key ? 'active' : ''}`}
                        onClick={() => {
                          onNavigate(key);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <span className="mobile-sidebar-item-icon">{icon}</span>
                        <span className="mobile-sidebar-item-label">{label}</span>
                        {subjects.includes(key as Subject) && (
                          <span className="mobile-sidebar-item-badge">
                            {key === 'physics'
                              ? `${Math.round(physicsProgress)}%`
                              : key === 'chemistry'
                              ? `${Math.round(chemistryProgress)}%`
                              : key === 'maths'
                              ? `${Math.round(mathsProgress)}%`
                              : `${Math.round(biologyProgress ?? 0)}%`}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mobile-sidebar-divider" />

                <div className="mobile-sidebar-section">
                  <span className="mobile-sidebar-label">Floating Assistants (FABs)</span>
                  <div className="mobile-sidebar-toggles">
                    <div className="mobile-sidebar-toggle-row">
                      <div className="mobile-sidebar-toggle-info">
                        <span className="mobile-sidebar-toggle-title">AI Study Agent</span>
                        <span className="mobile-sidebar-toggle-desc">Bottom-right floating assistant</span>
                      </div>
                      <button
                        type="button"
                        className={`switch-pill ${enableAIAgent ? 'active' : ''}`}
                        onClick={() => onEnableAIAgentChange(!enableAIAgent)}
                      >
                        <span className="switch-knob" />
                      </button>
                    </div>
                    <div className="mobile-sidebar-toggle-row">
                      <div className="mobile-sidebar-toggle-info">
                        <span className="mobile-sidebar-toggle-title">Music Player</span>
                        <span className="mobile-sidebar-toggle-desc">Bottom-left floating player</span>
                      </div>
                      <button
                        type="button"
                        className={`switch-pill ${enableMusicPlayer ? 'active' : ''}`}
                        onClick={() => onEnableMusicPlayerChange(!enableMusicPlayer)}
                      >
                        <span className="switch-knob" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mobile-sidebar-divider" />

                <div className="mobile-sidebar-section">
                  <span className="mobile-sidebar-label">Appearance & Theme</span>
                  <button
                    type="button"
                    className="mobile-sidebar-theme-btn"
                    onClick={onThemeToggle}
                  >
                    <span>
                      {theme === 'light'
                        ? 'Switch to Dark Mode (Solid)'
                        : theme === 'dark-solid'
                          ? 'Switch to Dark Mode (Glass)'
                          : 'Switch to Light Mode'}
                    </span>
                    {theme === 'light' ? (
                      <Moon size={18} />
                    ) : theme === 'dark-solid' ? (
                      <Zap size={18} />
                    ) : (
                      <Sun size={18} />
                    )}
                  </button>

                  <span className="mobile-sidebar-label" style={{ marginTop: '1rem' }}>Accent Color</span>
                  <div className="mobile-color-grid">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`color-option ${accentColor === color.value ? 'selected' : ''}`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => {
                          onAccentChange(color.value);
                        }}
                      />
                    ))}
                    <button
                      type="button"
                      className={`color-option custom-color-option ${isCustomColor ? 'selected' : ''}`}
                      style={
                        isCustomColor
                          ? { background: accentColor, border: '2px solid var(--text-primary)' }
                          : {}
                      }
                      onClick={() => {
                        setIsCustomColorModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mobile-sidebar-divider" />

                <div className="mobile-sidebar-section">
                  <div className="mobile-sidebar-footer-actions">
                    <button
                      type="button"
                      className="mobile-sidebar-action-btn"
                      onClick={() => {
                        onNavigate('support');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Heart size={18} color="#e63946" fill={currentView === 'support' ? '#e63946' : 'transparent'} />
                      <span>Support Project</span>
                    </button>
                    <button
                      type="button"
                      className="mobile-sidebar-action-btn"
                      onClick={() => {
                        setIsSettingsOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Settings size={18} />
                      <span>Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={onThemeChange}
        disableAutoShift={disableAutoShift}
        onDisableAutoShiftChange={onDisableAutoShiftChange}
        enableAIAgent={enableAIAgent}
        onEnableAIAgentChange={onEnableAIAgentChange}
        enableMusicPlayer={enableMusicPlayer}
        onEnableMusicPlayerChange={onEnableMusicPlayerChange}
        dailyResetHour={dailyResetHour}
        onDailyResetHourChange={onDailyResetHourChange}
        backgroundUrl={backgroundUrl}
        onBackgroundUrlChange={onBackgroundUrlChange}
        useGridBackground={useGridBackground}
        onUseGridBackgroundChange={onUseGridBackgroundChange}
        dimLevel={dimLevel}
        onDimLevelChange={onDimLevelChange}
        glassIntensity={glassIntensity}
        onGlassIntensityChange={onGlassIntensityChange}
        glassRefraction={glassRefraction}
        onGlassRefractionChange={onGlassRefractionChange}
        onAccentChange={onAccentChange}
      />
      <ColorPickerModal
        isOpen={isCustomColorModalOpen}
        currentColor={accentColor}
        onConfirm={handleCustomColorConfirm}
        onClose={() => setIsCustomColorModalOpen(false)}
      />
      <ProgressCardModal
        isOpen={isProgressCardOpen}
        onClose={() => setIsProgressCardOpen(false)}
        accentColor={accentColor}
        settings={progressCardSettings}
        onSettingsChange={onProgressCardSettingsChange}
        studySessions={studySessions}
        mockScores={mockScores}
        physicsProgress={physicsProgress}
        chemistryProgress={chemistryProgress}
        mathsProgress={mathsProgress}
        examDate={examDate}
      />
      <CloudSyncPromptModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        onSignIn={handleSignIn}
        isBusy={isSigningIn}
      />
    </header>
  );
}
