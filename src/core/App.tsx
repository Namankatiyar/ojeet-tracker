import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../shared/components/layout/Header';
import { PwaUpdateBanner } from '../shared/components/ui/PwaUpdateBanner';
import { Subject } from '../shared/types';
import { formatDateLocal } from '../shared/utils/date';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SubjectDataProvider } from './context/SubjectDataContext';
import { UserProgressProvider, useUserProgress } from './context/UserProgressContext';
import { RemoteAuthProvider } from './context/RemoteAuthContext';
import { RemoteSyncProvider } from './context/RemoteSyncContext';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useAutoShiftTasks } from './hooks/useAutoShiftTasks';
import { AppRoutes } from './AppRoutes';

type View = 'dashboard' | 'planner' | 'studyclock' | Subject;
const LAST_SEEN_VERSION_KEY = 'pcm-tracker-last-seen-version';

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        theme, toggleTheme, accentColor, setAccentColor, backgroundUrl, setBackgroundUrl,
        dimLevel, setDimLevel, glassIntensity, setGlassIntensity, glassRefraction, setGlassRefraction
    } = useTheme();

    const {
        setPlannerTasks, studySessions, mockScores, primaryExamDate, disableAutoShift, setDisableAutoShift,
        physicsProgress, chemistryProgress, mathsProgress, progressCardSettings, setProgressCardSettings
    } = useUserProgress();

    const [plannerDateToOpen, setPlannerDateToOpen] = useState<string | null>(null);

    // Determine current view from path
    const getCurrentView = (): View => {
        const path = location.pathname.substring(1);
        if (!path) return 'dashboard';
        return path as View;
    };

    const currentView = getCurrentView();

    useEffect(() => {
        const currentVersion = __APP_VERSION__;
        const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);

        if (!lastSeenVersion) {
            localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
            return;
        }

        if (lastSeenVersion !== currentVersion) {
            localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
            if (location.pathname !== '/changelog') {
                navigate('/changelog?updated=1', { replace: true });
            }
        }
    }, [location.pathname, navigate]);

    const handleNavigate = (view: View) => {
        if (view === 'dashboard') navigate('/');
        else navigate(`/${view}`);
    };

    const handleQuickAddTask = useCallback((date: string) => {
        setPlannerDateToOpen(date);
        navigate('/planner');
    }, [navigate]);

    const onQuickAddTaskStatic = useCallback(() => {
        handleQuickAddTask(formatDateLocal(new Date()));
    }, [handleQuickAddTask]);

    // Custom Hooks
    useGlobalShortcuts(handleQuickAddTask);
    useAutoShiftTasks(setPlannerTasks, disableAutoShift);

    return (
        <div className="app">
            <Header
                currentView={currentView}
                onNavigate={handleNavigate}
                theme={theme}
                onThemeToggle={toggleTheme}
                accentColor={accentColor}
                onAccentChange={setAccentColor}
                disableAutoShift={disableAutoShift}
                onDisableAutoShiftChange={setDisableAutoShift}
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
                examDate={primaryExamDate}
                progressCardSettings={progressCardSettings}
                onProgressCardSettingsChange={setProgressCardSettings}
            />
            <PwaUpdateBanner />
            <main className="main-content">
                <AppRoutes
                    onNavigate={handleNavigate}
                    plannerDateToOpen={plannerDateToOpen}
                    onConsumeInitialDate={() => setPlannerDateToOpen(null)}
                    onQuickAddTask={onQuickAddTaskStatic}
                />
            </main>
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <RemoteAuthProvider>
                <SubjectDataProvider>
                    <UserProgressProvider>
                        <RemoteSyncProvider>
                            <AppContent />
                        </RemoteSyncProvider>
                    </UserProgressProvider>
                </SubjectDataProvider>
            </RemoteAuthProvider>
        </ThemeProvider>
    );
}

export default App;
