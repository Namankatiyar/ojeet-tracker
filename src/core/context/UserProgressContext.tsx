import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useLocalStorage } from '../../shared/hooks/useLocalStorage';
import { useProgress } from '../../shared/hooks/useProgress';
import { triggerSmallConfetti } from '../../shared/utils/confetti';
import { AppProgress, Subject, Priority, PlannerTask, StudySession, MockScore, ExamEntry, ProgressCardSettings } from '../../shared/types';
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
    primaryExamDate: string;
    disableAutoShift: boolean;
    setDisableAutoShift: (disable: boolean | ((prev: boolean) => boolean)) => void;
    progressCardSettings: ProgressCardSettings;
    setProgressCardSettings: (settings: ProgressCardSettings | ((prev: ProgressCardSettings) => ProgressCardSettings)) => void;

    // Derived Progress
    physicsProgress: number;
    chemistryProgress: number;
    mathsProgress: number;
    overallProgress: number;
    calculateSubjectProgress: (subject: Subject) => number;

    // Handlers
    handleToggleMaterial: (subject: Subject, chapterSerial: number, material: string) => void;
    handleSetPriority: (subject: Subject, chapterSerial: number, priority: Priority) => void;
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
}

const UserProgressContext = createContext<UserProgressContextType | undefined>(undefined);

const initialProgress: AppProgress = {
    physics: {},
    chemistry: {},
    maths: {},
};

export const UserProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { mergedSubjectData } = useSubjectData();
    const { accentColor } = useTheme();

    const [progress, setProgress] = useLocalStorage<AppProgress>('jee-tracker-progress', initialProgress);
    const [plannerTasks, setPlannerTasks] = useLocalStorage<PlannerTask[]>('jee-tracker-planner-tasks', []);
    const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>('jee-tracker-study-sessions', []);
    const [mockScores, setMockScores] = useLocalStorage<MockScore[]>('jee-tracker-mock-scores', []);
    const [examDates, setExamDates] = useLocalStorage<ExamEntry[]>('jee-exam-dates', []);

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
                        isPrimary: true
                    };
                    setExamDates(prev => prev.length === 0 ? [migrated] : prev);
                }
            } catch { /* ignore parse errors */ }
            localStorage.removeItem('jee-exam-date');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const primaryExamDate = examDates.find(e => e.isPrimary)?.date ?? examDates[0]?.date ?? '';
    const [disableAutoShift, setDisableAutoShift] = useLocalStorage<boolean>('jee-tracker-disable-auto-shift', false);
    const [progressCardSettings, setProgressCardSettings] = useLocalStorage<ProgressCardSettings>('jee-tracker-progress-card', {
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
        }
    });

    const { physicsProgress, chemistryProgress, mathsProgress, overallProgress, calculateSubjectProgress } = useProgress(progress, mergedSubjectData);

    const handleToggleMaterial = useCallback((subject: Subject, chapterSerial: number, material: string) => {
        setProgress(prev => {
            const subjectProgress = prev[subject];
            const chapterProgress = subjectProgress[chapterSerial] || { completed: {}, priority: 'none' as Priority };
            const isNowCompleted = !chapterProgress.completed[material];

            setPlannerTasks(tasks => tasks.map(t => {
                if (t.type === 'chapter' && t.subject === subject && t.chapterSerial === chapterSerial && t.material === material) {
                    return {
                        ...t,
                        completed: isNowCompleted,
                        completedAt: isNowCompleted ? new Date().toISOString() : undefined
                    };
                }
                return t;
            }));

            return {
                ...prev,
                [subject]: {
                    ...subjectProgress,
                    [chapterSerial]: {
                        ...chapterProgress,
                        completed: { ...chapterProgress.completed, [material]: isNowCompleted },
                    },
                },
            };
        });
    }, [setProgress, setPlannerTasks]);

    const handleSetPriority = useCallback((subject: Subject, chapterSerial: number, priority: Priority) => {
        setProgress(prev => {
            const subjectProgress = prev[subject];
            const chapterProgress = subjectProgress[chapterSerial] || { completed: {}, priority: 'none' as Priority };
            return {
                ...prev,
                [subject]: {
                    ...subjectProgress,
                    [chapterSerial]: { ...chapterProgress, priority },
                },
            };
        });
    }, [setProgress]);

    const handleAddPlannerTask = useCallback((task: PlannerTask) => {
        setPlannerTasks(prev => [...prev, task]);
    }, [setPlannerTasks]);

    const handleTogglePlannerTask = useCallback((taskId: string) => {
        setPlannerTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                const newStatus = !t.completed;
                if (newStatus) {
                    triggerSmallConfetti(accentColor);
                }

                if (t.type === 'chapter' && t.subject && t.chapterSerial && t.material) {
                    setProgress(prog => {
                        const subjectProgress = prog[t.subject!];
                        const chapterProgress = subjectProgress[t.chapterSerial!] || { completed: {}, priority: 'none' };
                        return {
                            ...prog,
                            [t.subject!]: {
                                ...subjectProgress,
                                [t.chapterSerial!]: {
                                    ...chapterProgress,
                                    completed: { ...chapterProgress.completed, [t.material!]: newStatus }
                                }
                            }
                        };
                    });
                }

                return {
                    ...t,
                    completed: newStatus,
                    wasShifted: newStatus ? false : t.wasShifted,
                    completedAt: newStatus ? new Date().toISOString() : undefined
                };
            }
            return t;
        }));
    }, [setPlannerTasks, setProgress]);

    const handleDeletePlannerTask = useCallback((taskId: string) => {
        setPlannerTasks(prev => prev.filter(t => t.id !== taskId));
    }, [setPlannerTasks]);

    const handleEditPlannerTask = useCallback((updatedTask: PlannerTask) => {
        setPlannerTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    }, [setPlannerTasks]);

    const handleAddStudySession = useCallback((session: StudySession) => {
        setStudySessions(prev => [...prev, session]);
    }, [setStudySessions]);

    const handleDeleteStudySession = useCallback((sessionId: string) => {
        setStudySessions(prev => prev.filter(s => s.id !== sessionId));
    }, [setStudySessions]);

    const handleEditStudySession = useCallback((session: StudySession) => {
        setStudySessions(prev => prev.map(s => s.id === session.id ? session : s));
    }, [setStudySessions]);

    const handleAddMockScore = useCallback((score: Omit<MockScore, 'id'>) => {
        const newScore: MockScore = {
            ...score,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        setMockScores(prev => [...prev, newScore]);
    }, [setMockScores]);

    const handleDeleteMockScore = useCallback((id: string) => {
        setMockScores(prev => prev.filter(s => s.id !== id));
    }, [setMockScores]);

    const handleAddExam = useCallback((exam: Omit<ExamEntry, 'id'>) => {
        const newExam: ExamEntry = {
            ...exam,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        setExamDates(prev => {
            // If this is the first exam or marked primary, ensure it's the only primary
            if (newExam.isPrimary || prev.length === 0) {
                return [...prev.map(e => ({ ...e, isPrimary: false })), { ...newExam, isPrimary: true }];
            }
            return [...prev, newExam];
        });
    }, [setExamDates]);

    const handleDeleteExam = useCallback((id: string) => {
        setExamDates(prev => {
            const filtered = prev.filter(e => e.id !== id);
            // If the deleted exam was primary, make the first remaining one primary
            if (filtered.length > 0 && !filtered.some(e => e.isPrimary)) {
                filtered[0].isPrimary = true;
            }
            return filtered;
        });
    }, [setExamDates]);

    const handleUpdateExam = useCallback((exam: ExamEntry) => {
        setExamDates(prev => prev.map(e => e.id === exam.id ? exam : e));
    }, [setExamDates]);

    const handleSetPrimaryExam = useCallback((id: string) => {
        setExamDates(prev => prev.map(e => ({ ...e, isPrimary: e.id === id })));
    }, [setExamDates]);

    return (
        <UserProgressContext.Provider value={{
            progress, setProgress, plannerTasks, setPlannerTasks, studySessions, setStudySessions,
            mockScores, setMockScores, examDates, setExamDates, primaryExamDate, disableAutoShift, setDisableAutoShift,
            progressCardSettings, setProgressCardSettings,
            physicsProgress, chemistryProgress, mathsProgress, overallProgress, calculateSubjectProgress,
            handleToggleMaterial, handleSetPriority, handleAddPlannerTask, handleTogglePlannerTask,
            handleDeletePlannerTask, handleEditPlannerTask, handleAddStudySession, handleDeleteStudySession,
            handleEditStudySession, handleAddMockScore, handleDeleteMockScore,
            handleAddExam, handleDeleteExam, handleUpdateExam, handleSetPrimaryExam
        }}>
            {children}
        </UserProgressContext.Provider>
    );
};

export const useUserProgress = () => {
    const context = useContext(UserProgressContext);
    if (context === undefined) {
        throw new Error('useUserProgress must be used within a UserProgressProvider');
    }
    return context;
};
