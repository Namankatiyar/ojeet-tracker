import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageLoader } from '../shared/components/ui/PageLoader';
import { Subject } from '../shared/types';
import { useSubjectData } from './context/SubjectDataContext';
import { useUserProgress } from './context/UserProgressContext';
import { useDailyQuote } from './hooks/useDailyQuote';

// Lazy load feature components
const Dashboard = lazy(() => import('../features/dashboard/components/Dashboard').then(module => ({ default: module.Dashboard })));
const SubjectPage = lazy(() => import('../features/subjects/components/SubjectPage').then(module => ({ default: module.SubjectPage })));
const Planner = lazy(() => import('../features/planner/components/Planner').then(module => ({ default: module.Planner })));
const StudyClock = lazy(() => import('../features/study-clock/components/StudyClock').then(module => ({ default: module.StudyClock })));

interface AppRoutesProps {
    onNavigate: (view: any) => void;
    plannerDateToOpen: string | null;
    onConsumeInitialDate: () => void;
    onQuickAddTask: () => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
    onNavigate,
    plannerDateToOpen,
    onConsumeInitialDate,
    onQuickAddTask
}) => {
    const { mergedSubjectData, handleAddColumn, handleRemoveColumn, handleAddChapter, handleRemoveChapter, handleRenameChapter, handleReorderChapters, handleReorderMaterials } = useSubjectData();
    const { 
        progress, plannerTasks, studySessions, mockScores, examDate, setExamDate,
        physicsProgress, chemistryProgress, mathsProgress, overallProgress, calculateSubjectProgress,
        handleToggleMaterial, handleSetPriority, handleAddPlannerTask, handleTogglePlannerTask,
        handleDeletePlannerTask, handleEditPlannerTask, handleAddStudySession, handleDeleteStudySession,
        handleEditStudySession, handleAddMockScore, handleDeleteMockScore
    } = useUserProgress();
    
    const dailyQuote = useDailyQuote();

    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={
                    <Dashboard
                        physicsProgress={physicsProgress}
                        chemistryProgress={chemistryProgress}
                        mathsProgress={mathsProgress}
                        overallProgress={overallProgress}
                        subjectData={mergedSubjectData}
                        onNavigate={onNavigate}
                        quote={dailyQuote}
                        plannerTasks={plannerTasks}
                        onToggleTask={handleTogglePlannerTask}
                        examDate={examDate}
                        onExamDateChange={setExamDate}
                        onQuickAdd={onQuickAddTask}
                        studySessions={studySessions}
                        mockScores={mockScores}
                        onAddMockScore={handleAddMockScore}
                        onDeleteMockScore={handleDeleteMockScore}
                    />
                } />

                <Route path="/planner" element={
                    <Planner
                        tasks={plannerTasks}
                        onAddTask={handleAddPlannerTask}
                        onEditTask={handleEditPlannerTask}
                        onToggleTask={handleTogglePlannerTask}
                        onDeleteTask={handleDeletePlannerTask}
                        subjectData={mergedSubjectData}
                        examDate={examDate}
                        initialOpenDate={plannerDateToOpen}
                        onConsumeInitialDate={onConsumeInitialDate}
                        sessions={studySessions}
                        progress={progress}
                    />
                } />

                <Route path="/studyclock" element={
                    <StudyClock
                        subjectData={mergedSubjectData}
                        sessions={studySessions}
                        onAddSession={handleAddStudySession}
                        onDeleteSession={handleDeleteStudySession}
                        onEditSession={handleEditStudySession}
                        plannerTasks={plannerTasks}
                        progress={progress}
                        onToggleTask={handleTogglePlannerTask}
                    />
                } />

                {/* Subject Routes */}
                {(['physics', 'chemistry', 'maths'] as Subject[]).map(subject => (
                    <Route key={subject} path={`/${subject}`} element={
                        <SubjectPage
                            subject={subject}
                            data={mergedSubjectData[subject]}
                            progress={progress[subject]}
                            subjectProgress={calculateSubjectProgress(subject)}
                            onToggleMaterial={(serial, material) => handleToggleMaterial(subject, serial, material)}
                            onSetPriority={(serial, priority) => handleSetPriority(subject, serial, priority)}
                            onAddMaterial={(name) => handleAddColumn(subject, name)}
                            onRemoveMaterial={(name) => handleRemoveColumn(subject, name)}
                            onAddChapter={(name) => handleAddChapter(subject, name)}
                            onRemoveChapter={(serial) => handleRemoveChapter(subject, serial)}
                            onRenameChapter={(serial, name) => handleRenameChapter(subject, serial, name)}
                            onReorderChapters={(chapters) => handleReorderChapters(subject, chapters)}
                            onReorderMaterials={(materials) => handleReorderMaterials(subject, materials)}
                        />
                    } />
                ))}

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
};
