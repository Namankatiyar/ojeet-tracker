import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../shared/components/layout/Header';
import { Footer } from '../shared/components/layout/Footer';
import { DiscordInviteModal } from '../shared/components/ui/DiscordInviteModal';
import { Subject } from '../shared/types';
import { formatDateLocal } from '../shared/utils/date';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SubjectDataProvider } from './context/SubjectDataContext';
import { UserProgressProvider, useUserProgress } from './context/UserProgressContext';
import { RemoteAuthProvider } from './context/RemoteAuthContext';
import { RemoteSyncProvider } from './context/RemoteSyncContext';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useDocumentMetadata } from './hooks/useDocumentMetadata';
import { useAutoShiftTasks } from './hooks/useAutoShiftTasks';

import { AppRoutes } from './AppRoutes';

type View = 'dashboard' | 'planner' | 'studyclock' | Subject;

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
        if (!path || path === 'jee-syllabus-tracker') return 'dashboard';
        if (path === 'jee-study-planner') return 'planner';
        if (path === 'jee-study-timer') return 'studyclock';
        return path as View;
    };

    const currentView = getCurrentView();

    const handleNavigate = (view: View) => {
        if (view === 'dashboard') navigate('/jee-syllabus-tracker');
        else if (view === 'planner') navigate('/jee-study-planner');
        else if (view === 'studyclock') navigate('/jee-study-timer');
        else navigate(`/${view}`);
    };

    const handleQuickAddTask = useCallback((date: string) => {
        setPlannerDateToOpen(date);
        navigate('/jee-study-planner');
    }, [navigate]);

    const onQuickAddTaskStatic = useCallback(() => {
        handleQuickAddTask(formatDateLocal(new Date()));
    }, [handleQuickAddTask]);

    const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem('ojee_discord_dismissed');
        if (!dismissed) {
            const timer = setTimeout(() => {
                setIsDiscordModalOpen(true);
            }, 3000); // 3 seconds delay
            return () => clearTimeout(timer);
        }
    }, []);

    // Custom Hooks
    useGlobalShortcuts(handleQuickAddTask);
    useAutoShiftTasks(setPlannerTasks, disableAutoShift);
    useDocumentMetadata();

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
