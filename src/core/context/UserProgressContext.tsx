import React, { createContext, useContext, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocalStorage } from '../../shared/hooks/useLocalStorage';
import { useProgress } from '../../shared/hooks/useProgress';
import { triggerSmallConfetti } from '../../shared/utils/confetti';
import {
  AppProgress,
  Subject,
  Priority,
  PlannerTask,
  StudySession,
  MockScore,
  ExamEntry,
  ProgressCardSettings,
  MockExamPreset,
  ChapterDetailProgress,
} from '../../shared/types';
import { useSubjectData } from './SubjectDataContext';
import { useTheme } from './ThemeContext';

interface UserProgressContextType {
  progress: AppProgress;
  setProgress: (progress: AppProgress | ((prev: AppProgress) => AppProgress)) => void;
  plannerTasks: PlannerTask[];
  setPlannerTasks: (tasks: PlannerTask[] | ((prev: PlannerTask[]) => PlannerTask[])) => void;
  studySessions: StudySession[];
  setStudySessions: (sessions: StudySession[] | ((prev: StudySession[]) => StudySession[])) => void;
  mockScores: MockScore[];
  setMockScores: (scores: MockScore[] | ((prev: MockScore[]) => MockScore[])) => void;
  examDates: ExamEntry[];
  setExamDates: (dates: ExamEntry[] | ((prev: ExamEntry[]) => ExamEntry[])) => void;
  mockExamPresets: MockExamPreset[];
  setMockExamPresets: (
    presets: MockExamPreset[] | ((prev: MockExamPreset[]) => MockExamPreset[])
  ) => void;
  primaryExamDate: string;
  disableAutoShift: boolean;
  setDisableAutoShift: (disable: boolean | ((prev: boolean) => boolean)) => void;
  enableAIAgent: boolean;
  setEnableAIAgent: (enable: boolean | ((prev: boolean) => boolean)) => void;
  enableMusicPlayer: boolean;
  setEnableMusicPlayer: (enable: boolean | ((prev: boolean) => boolean)) => void;
  dailyResetHour: number;
  setDailyResetHour: (hour: number | ((prev: number) => number)) => void;
  progressCardSettings: ProgressCardSettings;
  setProgressCardSettings: (
    settings: ProgressCardSettings | ((prev: ProgressCardSettings) => ProgressCardSettings)
  ) => void;
  dailyQuestionLogs: Record<string, number>;
  setDailyQuestionLogs: (
    logs: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;

  // Derived Progress
  physicsProgress: number;
  chemistryProgress: number;
  mathsProgress: number;
  overallProgress: number;
  calculateSubjectProgress: (subject: Subject) => number;

  // Handlers
  handleToggleMaterial: (subject: Subject, chapterSerial: number, material: string) => void;
  handleSetPriority: (subject: Subject, chapterSerial: number, priority: Priority) => void;
  handleUpdateChapterDetail: (
    subject: Subject,
    chapterSerial: number,
    patch: Partial<ChapterDetailProgress>
  ) => void;
  handleToggleSubtopicMaterial: (
    subject: Subject,
    chapterSerial: number,
    subtopicName: string,
    material: string
  ) => void;
  handleUpdateSubtopicAttempted: (
    subject: Subject,
    chapterSerial: number,
    subtopicName: string,
    material: string,
    count: number
  ) => void;
  handleSetSubtopicLastRevised: (
    subject: Subject,
    chapterSerial: number,
    subtopicName: string,
    date: string | undefined
  ) => void;
  handleAddPlannerTask: (task: PlannerTask) => void;
  handleTogglePlannerTask: (taskId: string) => void;
  handleDeletePlannerTask: (taskId: string) => void;
  handleEditPlannerTask: (updatedTask: PlannerTask) => void;
  handleAddStudySession: (session: StudySession) => void;
  handleDeleteStudySession: (sessionId: string) => void;
  handleEditStudySession: (session: StudySession) => void;
  handleAddExam: (exam: Omit<ExamEntry, 'id'>) => void;
  handleDeleteExam: (id: string) => void;
  handleUpdateExam: (exam: ExamEntry) => void;
  handleSetPrimaryExam: (id: string) => void;
  handleAddMockScore: (score: Omit<MockScore, 'id'>) => void;
  handleDeleteMockScore: (id: string) => void;
  handleAddMockExamPreset: (preset: MockExamPreset) => void;
  handleDeleteMockExamPreset: (id: string) => void;
  handleUpdateMockExamPreset: (preset: MockExamPreset) => void;
}

// PERF-006: Internal sub-contexts to avoid monolithic re-renders.
// Components that only need settings won't re-render when studySessions changes, etc.

interface ProgressDataContextType {
  progress: AppProgress;
  setProgress: (progress: AppProgress | ((prev: AppProgress) => AppProgress)) => void;
  plannerTasks: PlannerTask[];
  setPlannerTasks: (tasks: PlannerTask[] | ((prev: PlannerTask[]) => PlannerTask[])) => void;
  mockScores: MockScore[];
  setMockScores: (scores: MockScore[] | ((prev: MockScore[]) => MockScore[])) => void;
  examDates: ExamEntry[];
  setExamDates: (dates: ExamEntry[] | ((prev: ExamEntry[]) => ExamEntry[])) => void;
  mockExamPresets: MockExamPreset[];
  setMockExamPresets: (presets: MockExamPreset[] | ((prev: MockExamPreset[]) => MockExamPreset[])) => void;
  dailyQuestionLogs: Record<string, number>;
  setDailyQuestionLogs: (logs: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  primaryExamDate: string;
  physicsProgress: number;
  chemistryProgress: number;
  mathsProgress: number;
  overallProgress: number;
  calculateSubjectProgress: (subject: Subject) => number;
  handleToggleMaterial: (subject: Subject, chapterSerial: number, material: string) => void;
  handleSetPriority: (subject: Subject, chapterSerial: number, priority: Priority) => void;
  handleUpdateChapterDetail: (subject: Subject, chapterSerial: number, patch: Partial<ChapterDetailProgress>) => void;
  handleToggleSubtopicMaterial: (subject: Subject, chapterSerial: number, subtopicName: string, material: string) => void;
  handleUpdateSubtopicAttempted: (subject: Subject, chapterSerial: number, subtopicName: string, material: string, count: number) => void;
  handleSetSubtopicLastRevised: (subject: Subject, chapterSerial: number, subtopicName: string, date: string | undefined) => void;
  handleAddPlannerTask: (task: PlannerTask) => void;
  handleTogglePlannerTask: (taskId: string) => void;
  handleDeletePlannerTask: (taskId: string) => void;
  handleEditPlannerTask: (updatedTask: PlannerTask) => void;
  handleAddExam: (exam: Omit<ExamEntry, 'id'>) => void;
  handleDeleteExam: (id: string) => void;
  handleUpdateExam: (exam: ExamEntry) => void;
  handleSetPrimaryExam: (id: string) => void;
  handleAddMockScore: (score: Omit<MockScore, 'id'>) => void;
  handleDeleteMockScore: (id: string) => void;
  handleAddMockExamPreset: (preset: MockExamPreset) => void;
  handleDeleteMockExamPreset: (id: string) => void;
  handleUpdateMockExamPreset: (preset: MockExamPreset) => void;
}

interface StudySessionContextType {
  studySessions: StudySession[];
  setStudySessions: (sessions: StudySession[] | ((prev: StudySession[]) => StudySession[])) => void;
  handleAddStudySession: (session: StudySession) => void;
  handleDeleteStudySession: (sessionId: string) => void;
  handleEditStudySession: (session: StudySession) => void;
}

interface SettingsContextType {
  disableAutoShift: boolean;
  setDisableAutoShift: (disable: boolean | ((prev: boolean) => boolean)) => void;
  enableAIAgent: boolean;
  setEnableAIAgent: (enable: boolean | ((prev: boolean) => boolean)) => void;
  enableMusicPlayer: boolean;
  setEnableMusicPlayer: (enable: boolean | ((prev: boolean) => boolean)) => void;
  dailyResetHour: number;
  setDailyResetHour: (hour: number | ((prev: number) => number)) => void;
  progressCardSettings: ProgressCardSettings;
  setProgressCardSettings: (settings: ProgressCardSettings | ((prev: ProgressCardSettings) => ProgressCardSettings)) => void;
}

const ProgressDataContext = createContext<ProgressDataContextType | undefined>(undefined);
const StudySessionContext = createContext<StudySessionContextType | undefined>(undefined);
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const initialProgress: AppProgress = {
  physics: {},
  chemistry: {},
  maths: {},
};

export const defaultMockExamPresets: MockExamPreset[] = [
  {
    id: 'jm',
    name: 'JEE Main',
    shortName: 'JM',
    paperCount: 1,
    subjectMaxMarks: { physics: 100, chemistry: 100, maths: 100 },
  },
  {
    id: 'ja',
    name: 'JEE Advanced',
    shortName: 'JA',
    paperCount: 2,
    subjectMaxMarks: { physics: 60, chemistry: 60, maths: 60 },
  },
  {
    id: 'bt',
    name: 'BITSAT',
    shortName: 'BT',
    paperCount: 1,
    subjectMaxMarks: { physics: 130, chemistry: 130, maths: 130 },
  },
];

export const UserProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mergedSubjectData } = useSubjectData();
  const { accentColor } = useTheme();

  const [progress, setProgress] = useLocalStorage<AppProgress>(
    'jee-tracker-progress',
    initialProgress
  );
  const [plannerTasks, setPlannerTasks] = useLocalStorage<PlannerTask[]>(
    'jee-tracker-planner-tasks',
    []
  );
  const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>(
    'jee-tracker-study-sessions',
    []
  );
  const [mockScores, setMockScores] = useLocalStorage<MockScore[]>('jee-tracker-mock-scores', []);
  const [examDates, setExamDates] = useLocalStorage<ExamEntry[]>('jee-exam-dates', []);
  const [mockExamPresets, setMockExamPresets] = useLocalStorage<MockExamPreset[]>(
    'jee-tracker-mock-presets',
    defaultMockExamPresets
  );
  const [dailyQuestionLogs, setDailyQuestionLogs] = useLocalStorage<Record<string, number>>(
    'jee-tracker-daily-questions',
    {}
  );

  // Ensure mockExamPresets is never empty
  useEffect(() => {
    if (!mockExamPresets || mockExamPresets.length === 0) {
      setMockExamPresets(defaultMockExamPresets);
    }
  }, [mockExamPresets, setMockExamPresets]);

  // Migrate legacy single examDate to new examDates array
  useEffect(() => {
    const legacy = localStorage.getItem('jee-exam-date');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (typeof parsed === 'string' && parsed) {
          const migrated: ExamEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: 'JEE Exam',
            date: parsed,
            isPrimary: true,
          };
          setExamDates((prev) => (prev.length === 0 ? [migrated] : prev));
        }
      } catch {
        /* ignore parse errors */
      }
      localStorage.removeItem('jee-exam-date');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Migrate legacy chapter-level progress to new subtopics-level progress
  useEffect(() => {
    const needsMigration = localStorage.getItem('jee-needs-progress-migration') === 'true';
    if (!needsMigration) return;

    // Check if mergedSubjectData has actually loaded chapters
    const isDataLoaded = (['physics', 'chemistry', 'maths'] as Subject[]).every(
      (s) => mergedSubjectData[s] && mergedSubjectData[s]!.chapters.length > 0
    );
    if (!isDataLoaded) return;

    setProgress((prevProgress) => {
      const newProgress = JSON.parse(JSON.stringify(prevProgress)) as AppProgress;
      (['physics', 'chemistry', 'maths'] as Subject[]).forEach((subject) => {
        const subjectProgress = newProgress[subject];
        const subjectData = mergedSubjectData[subject];
        if (!subjectData) return;

        subjectData.chapters.forEach((chapter) => {
          const chapterProgress = subjectProgress[chapter.serial];
          if (!chapterProgress) return;

          const subtopics = chapter.subtopics || [];
          if (subtopics.length > 0 && chapterProgress.completed) {
            const hasLegacyCompletion = Object.keys(chapterProgress.completed).length > 0;
            const hasNoSubtopicTracking =
              !chapterProgress.subtopics || Object.keys(chapterProgress.subtopics).length === 0;

            if (hasLegacyCompletion && hasNoSubtopicTracking) {
              chapterProgress.subtopics = {};
              subtopics.forEach((sub) => {
                chapterProgress.subtopics![sub] = {
                  completed: { ...chapterProgress.completed },
                };
              });
            }
          }
        });
      });
      return newProgress;
    });

    // Once migrated, clear the flag
    localStorage.removeItem('jee-needs-progress-migration');
  }, [mergedSubjectData, setProgress]);

  const primaryExamDate = examDates.find((e) => e.isPrimary)?.date ?? examDates[0]?.date ?? '';
  const [disableAutoShift, setDisableAutoShift] = useLocalStorage<boolean>(
    'jee-tracker-disable-auto-shift',
    false
  );
  const [enableAIAgent, setEnableAIAgent] = useLocalStorage<boolean>(
    'jee-tracker-enable-ai-agent',
    true
  );
  const [enableMusicPlayer, setEnableMusicPlayer] = useLocalStorage<boolean>(
    'jee-tracker-enable-music-player',
    true
  );
  const [dailyResetHour, setDailyResetHour] = useLocalStorage<number>(
    'jee-tracker-daily-reset-hour',
    0
  );
  const [progressCardSettings, setProgressCardSettings] = useLocalStorage<ProgressCardSettings>(
    'jee-tracker-progress-card',
    {
      userName: '',
      customAvatarUrl: '',
      visibleStats: {
        totalStudyTime: true,
        highestMockScore: true,
        highestDailyHours: true,
        highestWeekAverage: true,
        physicsTime: true,
        chemistryTime: true,
        mathsTime: true,
        physicsProgress: true,
        chemistryProgress: true,
        mathsProgress: true,
        examCountdown: true,
      },
      bannerUrl: '',
      customStatus: '',
      gradeStatus: 'Class 12',
      targetExam: 'JEE 2026',
      discordSpecialTag: '',
      inviteCode: '',
      showTasks: true,
    }
  );

  const {
    physicsProgress,
    chemistryProgress,
    mathsProgress,
    overallProgress,
    calculateSubjectProgress,
  } = useProgress(progress, mergedSubjectData);

  const progressRef = useRef(progress);
  const pendingProgressRef = useRef(progress);
  const plannerTasksRef = useRef(plannerTasks);
  useEffect(() => {
    progressRef.current = progress;
    pendingProgressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    plannerTasksRef.current = plannerTasks;
  }, [plannerTasks]);

  const handleToggleMaterial = useCallback(
    (subject: Subject, chapterSerial: number, material: string) => {
      const currentProgress = progressRef.current;
      const subjectProgress = currentProgress[subject];
      const chapterProgress = subjectProgress[chapterSerial] || {
        completed: {},
        priority: 'none' as Priority,
      };

      const chapterObj = mergedSubjectData[subject]?.chapters.find(
        (ch) => ch.serial === chapterSerial
      );
      const subtopics = chapterObj?.subtopics || [];

      let isNowCompleted = false;
      if (subtopics.length > 0) {
        isNowCompleted = !subtopics.every(
          (sub) => !!chapterProgress.subtopics?.[sub]?.completed?.[material]
        );
      } else {
        isNowCompleted = !chapterProgress.completed[material];
      }

      const completedAt = isNowCompleted ? new Date().toISOString() : undefined;

      setProgress((prev) => {
        const prevSubjectProgress = prev[subject];
        const prevChapterProgress = prevSubjectProgress[chapterSerial] || {
          completed: {},
          priority: 'none' as Priority,
        };

        let nextSubtopicProgress = { ...(prevChapterProgress.subtopics || {}) };
        if (subtopics.length > 0) {
          subtopics.forEach((sub) => {
            const currentSubState = nextSubtopicProgress[sub] || { completed: {} };
            nextSubtopicProgress[sub] = {
              ...currentSubState,
              completed: {
                ...currentSubState.completed,
                [material]: isNowCompleted,
              },
            };
          });
        }

        return {
          ...prev,
          [subject]: {
            ...prevSubjectProgress,
            [chapterSerial]: {
              ...prevChapterProgress,
              completed: { ...prevChapterProgress.completed, [material]: isNowCompleted },
              subtopics: nextSubtopicProgress,
            },
          },
        };
      });

      setPlannerTasks((tasks) =>
        tasks.map((t) => {
          if (
            t.type === 'chapter' &&
            t.subject === subject &&
            t.chapterSerial === chapterSerial &&
            t.material === material
          ) {
            return {
              ...t,
              completed: isNowCompleted,
              completedAt,
            };
          }
          return t;
        })
      );
    },
    [setProgress, setPlannerTasks, mergedSubjectData]
  );

  const handleToggleSubtopicMaterial = useCallback(
    (subject: Subject, chapterSerial: number, subtopicName: string, material: string) => {
      const chapterObj = mergedSubjectData[subject]?.chapters.find(
        (ch) => ch.serial === chapterSerial
      );
      const chapterSubtopics = chapterObj?.subtopics || [];

      const currentProgress = progressRef.current;
      const currentChapterProgress = currentProgress[subject][chapterSerial] || {
        completed: {},
        priority: 'none' as Priority,
      };
      const currentSubtopics = currentChapterProgress.subtopics || {};
      const currentSubState = currentSubtopics[subtopicName] || { completed: {} };
      const isNowCompleted = !currentSubState.completed[material];

      const nextSubtopics = {
        ...currentSubtopics,
        [subtopicName]: {
          ...currentSubState,
          completed: {
            ...currentSubState.completed,
            [material]: isNowCompleted,
          },
        },
      };

      const allCompleted =
        chapterSubtopics.length > 0 &&
        chapterSubtopics.every((sub) => !!nextSubtopics[sub]?.completed?.[material]);
      const completedAt = allCompleted ? new Date().toISOString() : undefined;

      setProgress((prev) => {
        const subjectProgress = prev[subject];
        const chapterProgress = subjectProgress[chapterSerial] || {
          completed: {},
          priority: 'none' as Priority,
        };
        const subtopicStates = chapterProgress.subtopics || {};
        const subState = subtopicStates[subtopicName] || { completed: {} };
        const isNowComp = !subState.completed[material];

        const nextSubState = {
          ...subState,
          completed: {
            ...subState.completed,
            [material]: isNowComp,
          },
        };

        const updatedSubtopics = {
          ...subtopicStates,
          [subtopicName]: nextSubState,
        };

        const isAllCompleted =
          chapterSubtopics.length > 0 &&
          chapterSubtopics.every((sub) => !!updatedSubtopics[sub]?.completed?.[material]);

        return {
          ...prev,
          [subject]: {
            ...subjectProgress,
            [chapterSerial]: {
              ...chapterProgress,
              completed: {
                ...chapterProgress.completed,
                [material]: isAllCompleted,
              },
              subtopics: updatedSubtopics,
            },
          },
        };
      });

      setPlannerTasks((tasks) =>
        tasks.map((t) => {
          if (
            t.type === 'chapter' &&
            t.subject === subject &&
            t.chapterSerial === chapterSerial &&
            t.material === material
          ) {
            return {
              ...t,
              completed: allCompleted,
              completedAt,
            };
          }
          return t;
        })
      );
    },
    [mergedSubjectData, setProgress, setPlannerTasks]
  );

  const handleUpdateSubtopicAttempted = useCallback(
    (
      subject: Subject,
      chapterSerial: number,
      subtopicName: string,
      material: string,
      count: number
    ) => {
      const safeCount = Math.max(0, count);

      const currentProgress = pendingProgressRef.current;
      const subjectProgress = currentProgress[subject];
      const chapterProgress = subjectProgress[chapterSerial] || {
        completed: {},
        priority: 'none' as Priority,
      };
      const subtopicStates = chapterProgress.subtopics || {};
      const subState = subtopicStates[subtopicName] || { completed: {} };
      const currentSubAttempted = subState.attemptedByMaterial || {};
      const currentCount = currentSubAttempted[material] || 0;
      const diff = safeCount - currentCount;

      if (diff !== 0) {
        const todayStr = new Date().toLocaleDateString('en-CA');
        setDailyQuestionLogs((prevLogs) => ({
          ...prevLogs,
          [todayStr]: (prevLogs[todayStr] || 0) + diff,
        }));
      }

      // Update pendingProgressRef immediately so subsequent synchronous updates see it!
      const nextProgress = {
        ...currentProgress,
        [subject]: {
          ...subjectProgress,
          [chapterSerial]: {
            ...chapterProgress,
            subtopics: {
              ...subtopicStates,
              [subtopicName]: {
                ...subState,
                attemptedByMaterial: {
                  ...currentSubAttempted,
                  [material]: safeCount,
                },
              },
            },
          },
        },
      };
      pendingProgressRef.current = nextProgress;

      setProgress((prev) => {
        const prevSubjectProgress = prev[subject];
        const prevChapterProgress = prevSubjectProgress[chapterSerial] || {
          completed: {},
          priority: 'none' as Priority,
        };
        const prevSubtopicStates = prevChapterProgress.subtopics || {};
        const prevSubState = prevSubtopicStates[subtopicName] || { completed: {} };
        const prevSubAttempted = prevSubState.attemptedByMaterial || {};

        const nextSubState = {
          ...prevSubState,
          attemptedByMaterial: {
            ...prevSubAttempted,
            [material]: safeCount,
          },
        };

        const nextSubtopics = {
          ...prevSubtopicStates,
          [subtopicName]: nextSubState,
        };

        // Derive overall chapter attempted questions by summing up subtopic counts for each material
        const chapterObj = mergedSubjectData[subject]?.chapters.find(
          (ch) => ch.serial === chapterSerial
        );
        const chapterSubtopics = chapterObj?.subtopics || [];

        const totalAttemptedByMaterial: Record<string, number> = {};
        const activeMaterials = chapterObj?.materials || ['NCERT', 'PYQs', 'Modules'];

        activeMaterials.forEach((mat) => {
          let sum = 0;
          chapterSubtopics.forEach((sub) => {
            const c =
              sub === subtopicName && mat === material
                ? Math.max(0, count)
                : nextSubtopics[sub]?.attemptedByMaterial?.[mat];
            if (c !== undefined && Number.isFinite(c)) {
              sum += c;
            }
          });
          totalAttemptedByMaterial[mat] = sum;
        });

        const currentDetail = prevChapterProgress.detail || { attemptedByMaterial: {} };

        return {
          ...prev,
          [subject]: {
            ...prevSubjectProgress,
            [chapterSerial]: {
              ...prevChapterProgress,
              detail: {
                ...currentDetail,
                attemptedByMaterial: totalAttemptedByMaterial,
              },
              subtopics: nextSubtopics,
            },
          },
        };
      });
    },
    [mergedSubjectData, setProgress, setDailyQuestionLogs]
  );

  const handleSetSubtopicLastRevised = useCallback(
    (subject: Subject, chapterSerial: number, subtopicName: string, date: string | undefined) => {
      setProgress((prev) => {
        const subjectProgress = prev[subject];
        const chapterProgress = subjectProgress[chapterSerial] || {
          completed: {},
          priority: 'none' as Priority,
        };
        const subtopicStates = chapterProgress.subtopics || {};
        const subState = subtopicStates[subtopicName] || { completed: {} };

        const nextSubState = {
          ...subState,
          lastRevised: date,
        };

        const nextSubtopics = {
          ...subtopicStates,
          [subtopicName]: nextSubState,
        };

        // Derive overall chapter's lastRevised (latest revision date across subtopics)
        const chapterObj = mergedSubjectData[subject]?.chapters.find(
          (ch) => ch.serial === chapterSerial
        );
        const chapterSubtopics = chapterObj?.subtopics || [];

        let latestDate: string | undefined = undefined;
        chapterSubtopics.forEach((sub) => {
          const d = sub === subtopicName ? date : nextSubtopics[sub]?.lastRevised;
          if (d) {
            if (!latestDate || new Date(d) > new Date(latestDate)) {
              latestDate = d;
            }
          }
        });

        const currentDetail = chapterProgress.detail || { attemptedByMaterial: {} };

        return {
          ...prev,
          [subject]: {
            ...subjectProgress,
            [chapterSerial]: {
              ...chapterProgress,
              detail: {
                ...currentDetail,
                lastRevised: latestDate || undefined,
              },
              subtopics: nextSubtopics,
            },
          },
        };
      });
    },
    [mergedSubjectData, setProgress]
  );

  const handleSetPriority = useCallback(
    (subject: Subject, chapterSerial: number, priority: Priority) => {
      setProgress((prev) => {
        const subjectProgress = prev[subject];
        const chapterProgress = subjectProgress[chapterSerial] || {
          completed: {},
          priority: 'none' as Priority,
        };
        return {
          ...prev,
          [subject]: {
            ...subjectProgress,
            [chapterSerial]: { ...chapterProgress, priority },
          },
        };
      });
    },
    [setProgress]
  );

  const handleUpdateChapterDetail = useCallback(
    (subject: Subject, chapterSerial: number, patch: Partial<ChapterDetailProgress>) => {
      const currentProgress = pendingProgressRef.current;
      const subjectProgress = currentProgress[subject];
      const chapterProgress = subjectProgress[chapterSerial] || {
        completed: {},
        priority: 'none' as Priority,
      };
      const currentDetail = chapterProgress.detail || { attemptedByMaterial: {} };
      const currentAttempted = currentDetail.attemptedByMaterial || {};

      if (patch.attemptedByMaterial) {
        let diff = 0;
        Object.entries(patch.attemptedByMaterial).forEach(([material, count]) => {
          const safeCount = Math.max(0, count ?? 0);
          const currentCount = currentAttempted[material] || 0;
          diff += safeCount - currentCount;
        });

        if (diff !== 0) {
          const todayStr = new Date().toLocaleDateString('en-CA');
          setDailyQuestionLogs((prevLogs) => ({
            ...prevLogs,
            [todayStr]: (prevLogs[todayStr] || 0) + diff,
          }));
        }
      }

      // Update pendingProgressRef immediately so subsequent synchronous updates see it!
      const nextProgress = {
        ...currentProgress,
        [subject]: {
          ...subjectProgress,
          [chapterSerial]: {
            ...chapterProgress,
            detail: {
              ...currentDetail,
              ...patch,
              attemptedByMaterial: {
                ...currentDetail.attemptedByMaterial,
                ...patch.attemptedByMaterial,
              },
            },
          },
        },
      };
      pendingProgressRef.current = nextProgress;

      setProgress((prev) => {
        const prevSubjectProgress = prev[subject];
        const prevChapterProgress = prevSubjectProgress[chapterSerial] || {
          completed: {},
          priority: 'none' as Priority,
        };
        const prevDetail = prevChapterProgress.detail || { attemptedByMaterial: {} };

        return {
          ...prev,
          [subject]: {
            ...prevSubjectProgress,
            [chapterSerial]: {
              ...prevChapterProgress,
              detail: {
                ...prevDetail,
                ...patch,
                attemptedByMaterial: {
                  ...prevDetail.attemptedByMaterial,
                  ...patch.attemptedByMaterial,
                },
              },
            },
          },
        };
      });
    },
    [setProgress, setDailyQuestionLogs]
  );

  const handleAddPlannerTask = useCallback(
    (task: PlannerTask) => {
      setPlannerTasks((prev) => [...prev, task]);
    },
    [setPlannerTasks]
  );

  const handleTogglePlannerTask = useCallback(
    (taskId: string) => {
      const task = plannerTasksRef.current.find((t) => t.id === taskId);
      if (!task) return;

      const newStatus = !task.completed;
      if (newStatus) {
        triggerSmallConfetti(accentColor);
      }

      if (task.subject && task.chapterSerial) {
        const currentProgress = pendingProgressRef.current;
        const subjectProgress = currentProgress[task.subject];
        const chapterProgress = subjectProgress[task.chapterSerial] || {
          completed: {},
          priority: 'none',
        };

        let netChange = 0;
        let newCount = 0;
        const currentDetail = chapterProgress.detail || { attemptedByMaterial: {} };
        const currentAttempted = currentDetail.attemptedByMaterial || {};

        if (task.material && task.questions && task.questions > 0) {
          const currentCount = currentAttempted[task.material] || 0;
          const change = newStatus ? task.questions : -task.questions;
          newCount = Math.max(0, currentCount + change);
          netChange = newCount - currentCount;

          if (netChange !== 0) {
            const todayStr = new Date().toLocaleDateString('en-CA');
            setDailyQuestionLogs((prevLogs) => ({
              ...prevLogs,
              [todayStr]: Math.max(0, (prevLogs[todayStr] || 0) + netChange),
            }));
          }
        } else if (task.questions && task.questions > 0) {
          const change = newStatus ? task.questions : -task.questions;
          const todayStr = new Date().toLocaleDateString('en-CA');
          setDailyQuestionLogs((prevLogs) => ({
            ...prevLogs,
            [todayStr]: Math.max(0, (prevLogs[todayStr] || 0) + change),
          }));
        }

        const prevLectureCount = currentDetail.lectureCount || 0;
        const nextLectureCount = task.isLecture
          ? Math.max(0, prevLectureCount + (newStatus ? 1 : -1))
          : prevLectureCount;

        const updatedDetailForRef = {
          ...currentDetail,
          attemptedByMaterial: (task.material && task.questions && task.questions > 0)
            ? { ...currentAttempted, [task.material]: newCount }
            : currentAttempted,
          lectureCount: nextLectureCount,
        };

        const updatedCompleted = task.material
          ? { ...chapterProgress.completed, [task.material]: newStatus }
          : chapterProgress.completed;

        const nextProgress = {
          ...currentProgress,
          [task.subject]: {
            ...subjectProgress,
            [task.chapterSerial]: {
              ...chapterProgress,
              completed: updatedCompleted,
              detail: updatedDetailForRef,
            },
          },
        };
        pendingProgressRef.current = nextProgress;

        setProgress((prog) => {
          const prevSubjectProgress = prog[task.subject!];
          const prevChapterProgress = prevSubjectProgress[task.chapterSerial!] || {
            completed: {},
            priority: 'none',
          };
          const prevDetail = prevChapterProgress.detail || { attemptedByMaterial: {} };
          const prevAttempted = prevDetail.attemptedByMaterial || {};

          const prevLectures = prevDetail.lectureCount || 0;
          const nextLectures = task.isLecture
            ? Math.max(0, prevLectures + (newStatus ? 1 : -1))
            : prevLectures;

          const updatedDetail = {
            ...prevDetail,
            attemptedByMaterial: (task.material && task.questions && task.questions > 0)
              ? { ...prevAttempted, [task.material!]: newCount }
              : prevAttempted,
            lectureCount: nextLectures,
          };

          const updatedComp = task.material
            ? { ...prevChapterProgress.completed, [task.material!]: newStatus }
            : prevChapterProgress.completed;

          return {
            ...prog,
            [task.subject!]: {
              ...prevSubjectProgress,
              [task.chapterSerial!]: {
                ...prevChapterProgress,
                completed: updatedComp,
                detail: updatedDetail,
              },
            },
          };
        });
      } else if (task.questions && task.questions > 0) {
        const change = newStatus ? task.questions : -task.questions;
        const todayStr = new Date().toLocaleDateString('en-CA');
        setDailyQuestionLogs((prevLogs) => ({
          ...prevLogs,
          [todayStr]: Math.max(0, (prevLogs[todayStr] || 0) + change),
        }));
      }

      setPlannerTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              completed: newStatus,
              wasShifted: newStatus ? false : t.wasShifted,
              completedAt: newStatus ? new Date().toISOString() : undefined,
            };
          }
          return t;
        })
      );
    },
    [accentColor, setPlannerTasks, setProgress, setDailyQuestionLogs]
  );

  const handleDeletePlannerTask = useCallback(
    (taskId: string) => {
      const task = plannerTasksRef.current.find((t) => t.id === taskId);
      setPlannerTasks((prev) => prev.filter((t) => t.id !== taskId));

      if (task && task.completed && task.isLecture && task.subject && task.chapterSerial) {
        setProgress((prog) => {
          const subjectProgress = prog[task.subject!];
          const chapterProgress = subjectProgress[task.chapterSerial!] || { completed: {}, priority: 'none' };
          const detail = chapterProgress.detail || { attemptedByMaterial: {} };
          const currentLectures = detail.lectureCount || 0;
          const nextLectures = Math.max(0, currentLectures - 1);
          return {
            ...prog,
            [task.subject!]: {
              ...subjectProgress,
              [task.chapterSerial!]: {
                ...chapterProgress,
                detail: {
                  ...detail,
                  lectureCount: nextLectures,
                },
              },
            },
          };
        });

        const currentProgress = pendingProgressRef.current;
        const subjectProgress = currentProgress[task.subject!];
        const chapterProgress = subjectProgress[task.chapterSerial!] || { completed: {}, priority: 'none' };
        const detail = chapterProgress.detail || { attemptedByMaterial: {} };
        const currentLectures = detail.lectureCount || 0;
        const nextLectures = Math.max(0, currentLectures - 1);
        pendingProgressRef.current = {
          ...currentProgress,
          [task.subject!]: {
            ...subjectProgress,
            [task.chapterSerial!]: {
              ...chapterProgress,
              detail: {
                ...detail,
                lectureCount: nextLectures,
              },
            },
          },
        };
      }
    },
    [setPlannerTasks, setProgress]
  );

  const handleEditPlannerTask = useCallback(
    (updatedTask: PlannerTask) => {
      const oldTask = plannerTasksRef.current.find((t) => t.id === updatedTask.id);
      setPlannerTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));

      if (oldTask) {
        const oldLectureVal = (oldTask.isLecture && oldTask.completed) ? 1 : 0;
        const newLectureVal = (updatedTask.isLecture && updatedTask.completed) ? 1 : 0;

        if (oldTask.subject === updatedTask.subject && oldTask.chapterSerial === updatedTask.chapterSerial) {
          const diff = newLectureVal - oldLectureVal;
          if (diff !== 0 && updatedTask.subject && updatedTask.chapterSerial) {
            setProgress((prog) => {
              const subjectProgress = prog[updatedTask.subject!];
              const chapterProgress = subjectProgress[updatedTask.chapterSerial!] || { completed: {}, priority: 'none' };
              const detail = chapterProgress.detail || { attemptedByMaterial: {} };
              const currentLectures = detail.lectureCount || 0;
              const nextLectures = Math.max(0, currentLectures + diff);

              return {
                ...prog,
                [updatedTask.subject!]: {
                  ...subjectProgress,
                  [updatedTask.chapterSerial!]: {
                    ...chapterProgress,
                    detail: {
                      ...detail,
                      lectureCount: nextLectures,
                    },
                  },
                },
              };
            });

            const currentProgress = pendingProgressRef.current;
            const subjectProgress = currentProgress[updatedTask.subject!];
            const chapterProgress = subjectProgress[updatedTask.chapterSerial!] || { completed: {}, priority: 'none' };
            const detail = chapterProgress.detail || { attemptedByMaterial: {} };
            const currentLectures = detail.lectureCount || 0;
            const nextLectures = Math.max(0, currentLectures + diff);
            pendingProgressRef.current = {
              ...currentProgress,
              [updatedTask.subject!]: {
                ...subjectProgress,
                [updatedTask.chapterSerial!]: {
                  ...chapterProgress,
                  detail: {
                    ...detail,
                    lectureCount: nextLectures,
                  },
                },
              },
            };
          }
        } else {
          if (oldLectureVal > 0 && oldTask.subject && oldTask.chapterSerial) {
            setProgress((prog) => {
              const subjectProgress = prog[oldTask.subject!];
              const chapterProgress = subjectProgress[oldTask.chapterSerial!] || { completed: {}, priority: 'none' };
              const detail = chapterProgress.detail || { attemptedByMaterial: {} };
              const currentLectures = detail.lectureCount || 0;
              const nextLectures = Math.max(0, currentLectures - 1);

              return {
                ...prog,
                [oldTask.subject!]: {
                  ...subjectProgress,
                  [oldTask.chapterSerial!]: {
                    ...chapterProgress,
                    detail: {
                      ...detail,
                      lectureCount: nextLectures,
                    },
                  },
                },
              };
            });

            const currentProgress = pendingProgressRef.current;
            const subjectProgress = currentProgress[oldTask.subject!];
            const chapterProgress = subjectProgress[oldTask.chapterSerial!] || { completed: {}, priority: 'none' };
            const detail = chapterProgress.detail || { attemptedByMaterial: {} };
            const currentLectures = detail.lectureCount || 0;
            const nextLectures = Math.max(0, currentLectures - 1);
            pendingProgressRef.current = {
              ...currentProgress,
              [oldTask.subject!]: {
                ...subjectProgress,
                [oldTask.chapterSerial!]: {
                  ...chapterProgress,
                  detail: {
                    ...detail,
                    lectureCount: nextLectures,
                  },
                },
              },
            };
          }

          if (newLectureVal > 0 && updatedTask.subject && updatedTask.chapterSerial) {
            setProgress((prog) => {
              const subjectProgress = prog[updatedTask.subject!];
              const chapterProgress = subjectProgress[updatedTask.chapterSerial!] || { completed: {}, priority: 'none' };
              const detail = chapterProgress.detail || { attemptedByMaterial: {} };
              const currentLectures = detail.lectureCount || 0;
              const nextLectures = Math.max(0, currentLectures + 1);

              return {
                ...prog,
                [updatedTask.subject!]: {
                  ...subjectProgress,
                  [updatedTask.chapterSerial!]: {
                    ...chapterProgress,
                    detail: {
                      ...detail,
                      lectureCount: nextLectures,
                    },
                  },
                },
              };
            });

            const currentProgress = pendingProgressRef.current;
            const subjectProgress = currentProgress[updatedTask.subject!];
            const chapterProgress = subjectProgress[updatedTask.chapterSerial!] || { completed: {}, priority: 'none' };
            const detail = chapterProgress.detail || { attemptedByMaterial: {} };
            const currentLectures = detail.lectureCount || 0;
            const nextLectures = Math.max(0, currentLectures + 1);
            pendingProgressRef.current = {
              ...currentProgress,
              [updatedTask.subject!]: {
                ...subjectProgress,
                [updatedTask.chapterSerial!]: {
                  ...chapterProgress,
                  detail: {
                    ...detail,
                    lectureCount: nextLectures,
                  },
                },
              },
            };
          }
        }
      }
    },
    [setPlannerTasks, setProgress]
  );

  const handleAddStudySession = useCallback(
    (session: StudySession) => {
      setStudySessions((prev) => [...prev, session]);
    },
    [setStudySessions]
  );

  const handleDeleteStudySession = useCallback(
    (sessionId: string) => {
      setStudySessions((prev) => prev.filter((s) => s.id !== sessionId));
    },
    [setStudySessions]
  );

  const handleEditStudySession = useCallback(
    (session: StudySession) => {
      setStudySessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
    },
    [setStudySessions]
  );

  const handleAddMockScore = useCallback(
    (score: Omit<MockScore, 'id'>) => {
      const newScore: MockScore = {
        ...score,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      };
      setMockScores((prev) => [...prev, newScore]);
    },
    [setMockScores]
  );

  const handleDeleteMockScore = useCallback(
    (id: string) => {
      setMockScores((prev) => prev.filter((s) => s.id !== id));
    },
    [setMockScores]
  );

  const handleAddExam = useCallback(
    (exam: Omit<ExamEntry, 'id'>) => {
      const newExam: ExamEntry = {
        ...exam,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      };
      setExamDates((prev) => {
        // If this is the first exam or marked primary, ensure it's the only primary
        if (newExam.isPrimary || prev.length === 0) {
          return [
            ...prev.map((e) => ({ ...e, isPrimary: false })),
            { ...newExam, isPrimary: true },
          ];
        }
        return [...prev, newExam];
      });
    },
    [setExamDates]
  );

  const handleDeleteExam = useCallback(
    (id: string) => {
      setExamDates((prev) => {
        const filtered = prev.filter((e) => e.id !== id);
        // If the deleted exam was primary, make the first remaining one primary
        if (filtered.length > 0 && !filtered.some((e) => e.isPrimary)) {
          return [{ ...filtered[0], isPrimary: true }, ...filtered.slice(1)];
        }
        return filtered;
      });
    },
    [setExamDates]
  );

  const handleUpdateExam = useCallback(
    (exam: ExamEntry) => {
      setExamDates((prev) => prev.map((e) => (e.id === exam.id ? exam : e)));
    },
    [setExamDates]
  );

  const handleSetPrimaryExam = useCallback(
    (id: string) => {
      setExamDates((prev) => prev.map((e) => ({ ...e, isPrimary: e.id === id })));
    },
    [setExamDates]
  );

  const handleAddMockExamPreset = useCallback(
    (preset: MockExamPreset) => {
      setMockExamPresets((prev) => [...prev, preset]);
    },
    [setMockExamPresets]
  );

  const handleDeleteMockExamPreset = useCallback(
    (id: string) => {
      setMockExamPresets((prev) => prev.filter((p) => p.id !== id));
    },
    [setMockExamPresets]
  );

  const handleUpdateMockExamPreset = useCallback(
    (preset: MockExamPreset) => {
      setMockExamPresets((prev) => prev.map((p) => (p.id === preset.id ? preset : p)));
    },
    [setMockExamPresets]
  );

  // PERF-006: Split into 3 sub-context values so that e.g. studySessions changes
  // don't re-render components that only consume settings or progress.

  const progressDataValue = useMemo(
    () => ({
      progress,
      setProgress,
      plannerTasks,
      setPlannerTasks,
      mockScores,
      setMockScores,
      examDates,
      setExamDates,
      mockExamPresets,
      setMockExamPresets,
      dailyQuestionLogs,
      setDailyQuestionLogs,
      primaryExamDate,
      physicsProgress,
      chemistryProgress,
      mathsProgress,
      overallProgress,
      calculateSubjectProgress,
      handleToggleMaterial,
      handleSetPriority,
      handleUpdateChapterDetail,
      handleToggleSubtopicMaterial,
      handleUpdateSubtopicAttempted,
      handleSetSubtopicLastRevised,
      handleAddPlannerTask,
      handleTogglePlannerTask,
      handleDeletePlannerTask,
      handleEditPlannerTask,
      handleAddExam,
      handleDeleteExam,
      handleUpdateExam,
      handleSetPrimaryExam,
      handleAddMockScore,
      handleDeleteMockScore,
      handleAddMockExamPreset,
      handleDeleteMockExamPreset,
      handleUpdateMockExamPreset,
    }),
    [
      progress,
      setProgress,
      plannerTasks,
      setPlannerTasks,
      mockScores,
      setMockScores,
      examDates,
      setExamDates,
      mockExamPresets,
      setMockExamPresets,
      dailyQuestionLogs,
      setDailyQuestionLogs,
      primaryExamDate,
      physicsProgress,
      chemistryProgress,
      mathsProgress,
      overallProgress,
      calculateSubjectProgress,
      handleToggleMaterial,
      handleSetPriority,
      handleUpdateChapterDetail,
      handleToggleSubtopicMaterial,
      handleUpdateSubtopicAttempted,
      handleSetSubtopicLastRevised,
      handleAddPlannerTask,
      handleTogglePlannerTask,
      handleDeletePlannerTask,
      handleEditPlannerTask,
      handleAddExam,
      handleDeleteExam,
      handleUpdateExam,
      handleSetPrimaryExam,
      handleAddMockScore,
      handleDeleteMockScore,
      handleAddMockExamPreset,
      handleDeleteMockExamPreset,
      handleUpdateMockExamPreset,
    ]
  );

  const studySessionValue = useMemo(
    () => ({
      studySessions,
      setStudySessions,
      handleAddStudySession,
      handleDeleteStudySession,
      handleEditStudySession,
    }),
    [
      studySessions,
      setStudySessions,
      handleAddStudySession,
      handleDeleteStudySession,
      handleEditStudySession,
    ]
  );

  const settingsValue = useMemo(
    () => ({
      disableAutoShift,
      setDisableAutoShift,
      enableAIAgent,
      setEnableAIAgent,
      enableMusicPlayer,
      setEnableMusicPlayer,
      dailyResetHour,
      setDailyResetHour,
      progressCardSettings,
      setProgressCardSettings,
    }),
    [
      disableAutoShift,
      setDisableAutoShift,
      enableAIAgent,
      setEnableAIAgent,
      enableMusicPlayer,
      setEnableMusicPlayer,
      dailyResetHour,
      setDailyResetHour,
      progressCardSettings,
      setProgressCardSettings,
    ]
  );

  return (
    <ProgressDataContext.Provider value={progressDataValue}>
      <StudySessionContext.Provider value={studySessionValue}>
        <SettingsContext.Provider value={settingsValue}>
          {children}
        </SettingsContext.Provider>
      </StudySessionContext.Provider>
    </ProgressDataContext.Provider>
  );
};

/**
 * PERF-006: Merged facade hook — reads from all 3 sub-contexts and returns
 * the full UserProgressContextType. Zero consumer changes needed.
 */
export const useUserProgress = (): UserProgressContextType => {
  const progressData = useContext(ProgressDataContext);
  const studySessionData = useContext(StudySessionContext);
  const settingsData = useContext(SettingsContext);
  if (!progressData || !studySessionData || !settingsData) {
    throw new Error('useUserProgress must be used within a UserProgressProvider');
  }
  // Merge inline — this object is created per-call but is cheap since
  // the sub-context values are individually memoized.
  return {
    ...progressData,
    ...studySessionData,
    ...settingsData,
  };
};
