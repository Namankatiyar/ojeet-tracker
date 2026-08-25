import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../shared/components/layout/Header';
import { Footer } from '../shared/components/layout/Footer';
import { DiscordInviteModal } from '../shared/components/ui/DiscordInviteModal';
import { ThemeOnboardingModal } from '../shared/components/ui/ThemeOnboardingModal';
import { TopLoader } from '../shared/components/ui/TopLoader';
import { topLoader } from '../shared/hooks/useTopLoader';
import { Subject } from '../shared/types';
import { getLogicalTodayStr } from '../shared/utils/date';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SubjectDataProvider } from './context/SubjectDataContext';
import { UserProgressProvider, useUserProgress } from './context/UserProgressContext';
import { RemoteAuthProvider } from './context/RemoteAuthContext';
import { RemoteSyncProvider } from './context/RemoteSyncContext';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useDocumentMetadata } from './hooks/useDocumentMetadata';
import { useAutoShiftTasks } from './hooks/useAutoShiftTasks';
import { useProfileSync } from '../features/community/hooks/useProfileSync';

import { AppRoutes } from './AppRoutes';
const ChatDrawer = lazy(() =>
  import('../features/chat/components/ChatDrawer').then((m) => ({ default: m.ChatDrawer }))
);
const MusicPlayerDrawer = lazy(() =>
  import('../features/music/components/MusicPlayerDrawer').then((m) => ({
    default: m.MusicPlayerDrawer,
  }))
);

const OnboardingFlow = lazy(() =>
  import('../features/onboarding/OnboardingFlow').then((m) => ({
    default: m.OnboardingFlow,
  }))
);

type View = 'dashboard' | 'planner' | 'studyclock' | 'reports' | 'mockscores' | 'support' | 'community' | Subject;

function ProfileSyncManager() {
  useProfileSync();
  return null;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    theme,
    setTheme,
    toggleTheme,
    accentColor,
    setAccentColor,
    backgroundUrl,
    setBackgroundUrl,
    dimLevel,
    setDimLevel,
    glassIntensity,
    setGlassIntensity,
    glassRefraction,
    setGlassRefraction,
    useGridBackground,
    setUseGridBackground,
  } = useTheme();

  const {
    plannerTasks,
    setPlannerTasks,
    studySessions,
    mockScores,
    primaryExamDate,
    disableAutoShift,
    setDisableAutoShift,
    enableAIAgent,
    setEnableAIAgent,
    enableMusicPlayer,
    setEnableMusicPlayer,
    dailyResetHour,
    setDailyResetHour,
    physicsProgress,
    chemistryProgress,
    mathsProgress,
    biologyProgress,
    progressCardSettings,
    setProgressCardSettings,
    examMode,
  } = useUserProgress();

  const [plannerDateToOpen, setPlannerDateToOpen] = useState<string | null>(null);
  const isNeet = examMode === 'neet';

  // Determine current view from path
  const getCurrentView = (): View => {
    const path = location.pathname.substring(1);
    if (path === 'jee-syllabus-tracker' || path === 'neet-syllabus-tracker') return 'dashboard';
    if (path === 'jee-study-planner' || path === 'neet-study-planner') return 'planner';
    if (path === 'jee-study-timer' || path === 'neet-study-timer') return 'studyclock';
    if (path === 'reports') return 'reports';
    if (path === 'jee-mock-scores' || path === 'neet-mock-scores') return 'mockscores';
    if (path === 'support') return 'support';
    if (path === 'community') return 'community';
    return path as View;
  };

  const currentView = getCurrentView();

  const handleNavigate = useCallback(
    (view: View) => {
      topLoader.start();
      if (view === 'dashboard')
        navigate(isNeet ? '/neet-syllabus-tracker' : '/jee-syllabus-tracker');
      else if (view === 'planner')
        navigate(isNeet ? '/neet-study-planner' : '/jee-study-planner');
      else if (view === 'studyclock')
        navigate(isNeet ? '/neet-study-timer' : '/jee-study-timer');
      else if (view === 'reports') navigate('/reports');
      else if (view === 'mockscores')
        navigate(isNeet ? '/neet-mock-scores' : '/jee-mock-scores');
      else if (view === 'support') navigate('/support');
      else if (view === 'community') navigate('/community');
      else navigate(`/${view}`);
    },
    [isNeet, navigate]
  );

  const handleQuickAddTask = useCallback(
    (date: string) => {
      topLoader.start();
      setPlannerDateToOpen(date);
      navigate(isNeet ? '/neet-study-planner' : '/jee-study-planner');
    },
    [navigate, isNeet]
  );

  // Sync mode-specific routes when examMode changes
  useEffect(() => {
    const currentPath = location.pathname;
    if (isNeet) {
      if (currentPath === '/jee-syllabus-tracker') navigate('/neet-syllabus-tracker', { replace: true });
      else if (currentPath === '/jee-study-planner') navigate('/neet-study-planner', { replace: true });
      else if (currentPath === '/jee-study-timer') navigate('/neet-study-timer', { replace: true });
      else if (currentPath === '/jee-mock-scores') navigate('/neet-mock-scores', { replace: true });
    } else {
      if (currentPath === '/neet-syllabus-tracker') navigate('/jee-syllabus-tracker', { replace: true });
      else if (currentPath === '/neet-study-planner') navigate('/jee-study-planner', { replace: true });
      else if (currentPath === '/neet-study-timer') navigate('/jee-study-timer', { replace: true });
      else if (currentPath === '/neet-mock-scores') navigate('/jee-mock-scores', { replace: true });
    }
  }, [isNeet, location.pathname, navigate]);

  const onQuickAddTaskStatic = useCallback(() => {
    handleQuickAddTask(getLogicalTodayStr(dailyResetHour));
  }, [handleQuickAddTask, dailyResetHour]);

  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);

  useEffect(() => {
    // Track the number of user visits (sessions) to the site
    const isNewSession = !sessionStorage.getItem('ojee_session_active');
    let currentVisits = parseInt(localStorage.getItem('ojee_visit_count') || '0', 10);

    if (isNewSession) {
      sessionStorage.setItem('ojee_session_active', 'true');
      currentVisits += 1;
      localStorage.setItem('ojee_visit_count', currentVisits.toString());
    }

    const dismissed = localStorage.getItem('ojee_discord_dismissed');
    // Only show the modal on the second visit (or subsequent visits if not dismissed)
    if (!dismissed && currentVisits >= 2) {
      const timer = setTimeout(() => {
        setIsDiscordModalOpen(true);
      }, 3000); // 3 seconds delay
      return () => clearTimeout(timer);
    }
  }, []);

  // Custom Hooks
  useGlobalShortcuts(handleQuickAddTask);
  useAutoShiftTasks(plannerTasks, setPlannerTasks, disableAutoShift, dailyResetHour);
  useDocumentMetadata();

  return (
    <div className={`app ${enableAIAgent ? 'has-chat-fab' : ''}`}>
      <TopLoader />
      <ProfileSyncManager />
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        theme={theme}
        onThemeChange={setTheme}
        onThemeToggle={toggleTheme}
        accentColor={accentColor}
        onAccentChange={setAccentColor}
        useGridBackground={useGridBackground}
        onUseGridBackgroundChange={setUseGridBackground}
        disableAutoShift={disableAutoShift}
        onDisableAutoShiftChange={setDisableAutoShift}
        enableAIAgent={enableAIAgent}
        onEnableAIAgentChange={setEnableAIAgent}
        enableMusicPlayer={enableMusicPlayer}
        onEnableMusicPlayerChange={setEnableMusicPlayer}
        dailyResetHour={dailyResetHour}
        onDailyResetHourChange={setDailyResetHour}
        backgroundUrl={backgroundUrl}
        onBackgroundUrlChange={setBackgroundUrl}
        dimLevel={dimLevel}
        onDimLevelChange={setDimLevel}
        glassIntensity={glassIntensity}
        onGlassIntensityChange={setGlassIntensity}
        glassRefraction={glassRefraction}
        onGlassRefractionChange={setGlassRefraction}
        studySessions={studySessions}
        mockScores={mockScores}
        physicsProgress={physicsProgress}
        chemistryProgress={chemistryProgress}
        mathsProgress={mathsProgress}
        biologyProgress={biologyProgress}
        examDate={primaryExamDate}
        progressCardSettings={progressCardSettings}
        onProgressCardSettingsChange={setProgressCardSettings}
      />
      <main className="main-content">
        <AppRoutes
          onNavigate={handleNavigate}
          plannerDateToOpen={plannerDateToOpen}
          onConsumeInitialDate={() => setPlannerDateToOpen(null)}
          onQuickAddTask={onQuickAddTaskStatic}
        />
      </main>
      <Footer />
      <DiscordInviteModal
        isOpen={isDiscordModalOpen}
        onClose={() => setIsDiscordModalOpen(false)}
      />
      <ThemeOnboardingModal />
      {enableAIAgent && (
        <Suspense fallback={null}>
          <ChatDrawer />
        </Suspense>
      )}
      {enableMusicPlayer && (
        <Suspense fallback={null}>
          <MusicPlayerDrawer />
        </Suspense>
      )}
    </div>
  );
}

function AppShell() {
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem('jee-tracker-onboarding-complete') === 'true';
  });

  if (!onboardingComplete) {
    return (
      <Suspense fallback={null}>
        <OnboardingFlow onComplete={() => setOnboardingComplete(true)} />
      </Suspense>
    );
  }

  return (
    <RemoteSyncProvider>
      <AppContent />
    </RemoteSyncProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <RemoteAuthProvider>
        <SubjectDataProvider>
          <UserProgressProvider>
            <AppShell />
          </UserProgressProvider>
        </SubjectDataProvider>
      </RemoteAuthProvider>
    </ThemeProvider>
  );
}

export default App;
