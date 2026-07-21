import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PageLoader } from '../shared/components/ui/PageLoader';
import { Subject } from '../shared/types';
import { useSubjectData } from './context/SubjectDataContext';
import { useUserProgress } from './context/UserProgressContext';
import { useDailyQuote } from './hooks/useDailyQuote';

// Lazy load feature components
const Dashboard = lazy(() =>
  import('../features/dashboard/components/Dashboard').then((module) => ({
    default: module.Dashboard,
  }))
);
const SubjectPage = lazy(() =>
  import('../features/subjects/components/SubjectPage').then((module) => ({
    default: module.SubjectPage,
  }))
);
const Planner = lazy(() =>
  import('../features/planner/components/Planner').then((module) => ({ default: module.Planner }))
);
const StudyClock = lazy(() =>
  import('../features/study-clock/components/StudyClock').then((module) => ({
    default: module.StudyClock,
  }))
);
const ReportsPage = lazy(() =>
  import('../features/reports/components/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  }))
);
const MockScoresPage = lazy(() =>
  import('../features/mock-scores/components/MockScoresPage').then((module) => ({
    default: module.MockScoresPage,
  }))
);
const ImportSyncPage = lazy(() =>
  import('../features/sync/ImportSyncPage').then((module) => ({ default: module.ImportSyncPage }))
);
const PrivacyPolicyPage = lazy(() =>
  import('../features/legal/components/PrivacyPolicyPage').then((module) => ({
    default: module.PrivacyPolicyPage,
  }))
);
const TermsOfServicePage = lazy(() =>
  import('../features/legal/components/TermsOfServicePage').then((module) => ({
    default: module.TermsOfServicePage,
  }))
);
const ChangelogPage = lazy(() =>
  import('../features/legal/components/ChangelogPage').then((module) => ({
    default: module.ChangelogPage,
  }))
);
const SupportPage = lazy(() =>
  import('../features/support/components/SupportPage').then((module) => ({
    default: module.SupportPage,
  }))
);
const CommunityPage = lazy(() =>
  import('../features/community/components/CommunityPage').then((module) => ({
    default: module.CommunityPage,
  }))
);
const InviteHandler = lazy(() =>
  import('../features/community/components/InviteHandler').then((module) => ({
    default: module.InviteHandler,
  }))
);

interface AppRoutesProps {
  onNavigate: (view: any) => void;
  plannerDateToOpen: string | null;
  onConsumeInitialDate: () => void;
  onQuickAddTask: () => void;
}

const RedirectWithHash = ({ to }: { to: string }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const authKeys = [
    'code',
    'state',
    'access_token',
    'refresh_token',
    'expires_in',
    'expires_at',
    'token_type',
    'provider_token',
    'error',
    'error_description',
    'error_code',
  ];
  authKeys.forEach((key) => searchParams.delete(key));
  const cleanSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

  let cleanHash = location.hash;
  if (cleanHash && cleanHash.startsWith('#')) {
    const hashParams = new URLSearchParams(cleanHash.substring(1));
    let hashModified = false;
    authKeys.forEach((key) => {
      if (hashParams.has(key)) {
        hashParams.delete(key);
        hashModified = true;
      }
    });
    if (hashModified) {
      const rem = hashParams.toString();
      cleanHash = rem ? `#${rem}` : '';
    }
  }

  return <Navigate to={`${to}${cleanSearch}${cleanHash}`} replace />;
};

export const AppRoutes: React.FC<AppRoutesProps> = ({
  onNavigate,
  plannerDateToOpen,
  onConsumeInitialDate,
  onQuickAddTask,
}) => {
  const {
    mergedSubjectData,
    handleAddColumn,
    handleRemoveColumn,
    handleAddChapter,
    handleRemoveChapter,
    handleRenameChapter,
    handleReorderChapters,
    handleReorderMaterials,
  } = useSubjectData();
  const {
    progress,
    plannerTasks,
    studySessions,
    mockScores,
    examDates,
    primaryExamDate,
    physicsProgress,
    chemistryProgress,
    mathsProgress,
    overallProgress,
    calculateSubjectProgress,
    handleToggleMaterial,
    handleSetPriority,
    handleUpdateChapterDetail,
    handleAddPlannerTask,
    handleTogglePlannerTask,
    handleToggleSubtopicMaterial,
    handleUpdateSubtopicAttempted,
    handleSetSubtopicLastRevised,
    handleDeletePlannerTask,
    handleEditPlannerTask,
    handleAddStudySession,
    handleDeleteStudySession,
    handleEditStudySession,
    handleAddMockScore,
    handleDeleteMockScore,
    handleAddExam,
    handleDeleteExam,
    handleUpdateExam,
    handleSetPrimaryExam,
    handleSetFavouriteExam,
    handleSetExamSyllabus,
    examMode,
  } = useUserProgress();

  const dailyQuote = useDailyQuote();
  const isNeet = examMode === 'neet';
  const defaultDashboardPath = isNeet ? '/neet-syllabus-tracker' : '/jee-syllabus-tracker';
  const defaultPlannerPath = isNeet ? '/neet-study-planner' : '/jee-study-planner';
  const defaultStudyTimerPath = isNeet ? '/neet-study-timer' : '/jee-study-timer';

  const dashboardElement = (
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
      onSetFavouriteExam={handleSetFavouriteExam}
      onSetExamSyllabus={handleSetExamSyllabus}
      onQuickAdd={onQuickAddTask}
      studySessions={studySessions}
      mockScores={mockScores}
      onAddMockScore={handleAddMockScore}
      onDeleteMockScore={handleDeleteMockScore}
    />
  );

  const plannerElement = (
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
  );

  const studyClockElement = (
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
  );

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Redirects from old paths to SEO paths based on active mode */}
        <Route path="/" element={<RedirectWithHash to={defaultDashboardPath} />} />
        <Route path="/planner" element={<RedirectWithHash to={defaultPlannerPath} />} />
        <Route path="/studyclock" element={<RedirectWithHash to={defaultStudyTimerPath} />} />

        {/* Dashboard Routes */}
        <Route path="/jee-syllabus-tracker" element={dashboardElement} />
        <Route path="/neet-syllabus-tracker" element={dashboardElement} />

        {/* Planner Routes */}
        <Route path="/jee-study-planner" element={plannerElement} />
        <Route path="/neet-study-planner" element={plannerElement} />

        {/* Study Timer Routes */}
        <Route path="/jee-study-timer" element={studyClockElement} />
        <Route path="/neet-study-timer" element={studyClockElement} />

        <Route path="/reports" element={<ReportsPage />} />

        {/* Mock Score Routes */}
        <Route path="/jee-mock-scores" element={<MockScoresPage />} />
        <Route path="/neet-mock-scores" element={<MockScoresPage />} />

        {/* Subject Routes */}
        {(['physics', 'chemistry', 'maths', 'biology'] as Subject[]).map((subject) => (
          <Route
            key={subject}
            path={`/${subject}`}
            element={
              <SubjectPage
                subject={subject}
                data={mergedSubjectData[subject]}
                progress={progress[subject]}
                subjectProgress={calculateSubjectProgress(subject)}
                onToggleMaterial={(serial, material) =>
                  handleToggleMaterial(subject, serial, material)
                }
                onSetPriority={(serial, priority) => handleSetPriority(subject, serial, priority)}
                onUpdateChapterDetail={(serial, patch) =>
                  handleUpdateChapterDetail(subject, serial, patch)
                }
                onToggleSubtopicMaterial={(serial, subtopic, material) =>
                  handleToggleSubtopicMaterial(subject, serial, subtopic, material)
                }
                onUpdateSubtopicAttempted={(serial, subtopic, material, count) =>
                  handleUpdateSubtopicAttempted(subject, serial, subtopic, material, count)
                }
                onSetSubtopicLastRevised={(serial, subtopic, date) =>
                  handleSetSubtopicLastRevised(subject, serial, subtopic, date)
                }
                onAddMaterial={(name) => handleAddColumn(subject, name)}
                onRemoveMaterial={(name) => handleRemoveColumn(subject, name)}
                onAddChapter={(name) => handleAddChapter(subject, name)}
                onRemoveChapter={(serial) => handleRemoveChapter(subject, serial)}
                onRenameChapter={(serial, name) => handleRenameChapter(subject, serial, name)}
                onReorderChapters={(chapters) => handleReorderChapters(subject, chapters)}
                onReorderMaterials={(materials) => handleReorderMaterials(subject, materials)}
              />
            }
          />
        ))}

        <Route path="/import" element={<ImportSyncPage onAddSession={handleAddStudySession} />} />

        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/invite/:inviteCode" element={<InviteHandler />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
