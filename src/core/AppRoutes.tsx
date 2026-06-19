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
const ReportsPage = lazy(() => import('../features/reports/components/ReportsPage').then(module => ({ default: module.ReportsPage })));
const ImportSyncPage = lazy(() => import('../features/sync/ImportSyncPage').then(module => ({ default: module.ImportSyncPage })));
const PrivacyPolicyPage = lazy(() => import('../features/legal/components/PrivacyPolicyPage').then(module => ({ default: module.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('../features/legal/components/TermsOfServicePage').then(module => ({ default: module.TermsOfServicePage })));
const ChangelogPage = lazy(() => import('../features/legal/components/ChangelogPage').then(module => ({ default: module.ChangelogPage })));

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
        progress, plannerTasks, studySessions, mockScores, examDates, primaryExamDate,
        physicsProgress, chemistryProgress, mathsProgress, overallProgress, calculateSubjectProgress,
        handleToggleMaterial, handleSetPriority, handleUpdateChapterDetail, handleAddPlannerTask, handleTogglePlannerTask,
        handleToggleSubtopicMaterial, handleUpdateSubtopicAttempted, handleSetSubtopicLastRevised,
        handleDeletePlannerTask, handleEditPlannerTask, handleAddStudySession, handleDeleteStudySession,
        handleEditStudySession, handleAddMockScore, handleDeleteMockScore,
        handleAddExam, handleDeleteExam, handleUpdateExam, handleSetPrimaryExam
    } = useUserProgress();

    const dailyQuote = useDailyQuote();

    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Redirects from old paths to SEO paths */}
                <Route path="/" element={<Navigate to="/jee-syllabus-tracker" replace />} />
                <Route path="/planner" element={<Navigate to="/jee-study-planner" replace />} />
                <Route path="/studyclock" element={<Navigate to="/jee-study-timer" replace />} />

                <Route path="/jee-syllabus-tracker" element={
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
                        examDates={examDates}
                        onAddExam={handleAddExam}
                        onDeleteExam={handleDeleteExam}
                        onUpdateExam={handleUpdateExam}
                        onSetPrimaryExam={handleSetPrimaryExam}
                        onQuickAdd={onQuickAddTask}
                        studySessions={studySessions}
                        mockScores={mockScores}
                        onAddMockScore={handleAddMockScore}
                        onDeleteMockScore={handleDeleteMockScore}
                    />
                } />

                <Route path="/jee-study-planner" element={
                    <Planner
                        tasks={plannerTasks}
                        onAddTask={handleAddPlannerTask}
                        onEditTask={handleEditPlannerTask}
                        onToggleTask={handleTogglePlannerTask}
                        onDeleteTask={handleDeletePlannerTask}
                        subjectData={mergedSubjectData}
                        examDate={primaryExamDate}
                        examDates={examDates}
                        initialOpenDate={plannerDateToOpen}
                        onConsumeInitialDate={onConsumeInitialDate}
                        sessions={studySessions}
                        progress={progress}
                    />
                } />

                <Route path="/jee-study-timer" element={
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

                <Route path="/reports" element={<ReportsPage />} />

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
                            onUpdateChapterDetail={(serial, patch) => handleUpdateChapterDetail(subject, serial, patch)}
                            onToggleSubtopicMaterial={(serial, subtopic, material) => handleToggleSubtopicMaterial(subject, serial, subtopic, material)}
                            onUpdateSubtopicAttempted={(serial, subtopic, material, count) => handleUpdateSubtopicAttempted(subject, serial, subtopic, material, count)}
                            onSetSubtopicLastRevised={(serial, subtopic, date) => handleSetSubtopicLastRevised(subject, serial, subtopic, date)}
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

                <Route path="/import" element={
                    <ImportSyncPage onAddSession={handleAddStudySession} />
                } />

                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                <Route path="/changelog" element={<ChangelogPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
};
