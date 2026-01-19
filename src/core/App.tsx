import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../shared/components/layout/Header';
import { useLocalStorage } from '../shared/hooks/useLocalStorage';
import { useProgress } from '../shared/hooks/useProgress';
import { parseSubjectCSV } from '../shared/utils/csvParser';
import { formatDateLocal } from '../shared/utils/date';
import { triggerSmallConfetti } from '../shared/utils/confetti';
import { AppProgress, Subject, SubjectData, Priority, PlannerTask, StudySession, MockScore } from '../shared/types';
import { PageLoader } from '../shared/components/ui/PageLoader';
import quotes from '../quotes.json';

// Lazy load feature components
const Dashboard = lazy(() => import('../features/dashboard/components/Dashboard').then(module => ({ default: module.Dashboard })));
const SubjectPage = lazy(() => import('../features/subjects/components/SubjectPage').then(module => ({ default: module.SubjectPage })));
const Planner = lazy(() => import('../features/planner/components/Planner').then(module => ({ default: module.Planner })));
const StudyClock = lazy(() => import('../features/study-clock/components/StudyClock').then(module => ({ default: module.StudyClock })));

type View = 'dashboard' | 'planner' | 'studyclock' | Subject;

const initialProgress: AppProgress = {
    physics: {},
    chemistry: {},
    maths: {},
};

function App() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determine current view from path
    const getCurrentView = (): View => {
        const path = location.pathname.substring(1);
        if (!path) return 'dashboard';
        return path as View;
    };
    
    const currentView = getCurrentView();

    const handleNavigate = (view: View) => {
        if (view === 'dashboard') navigate('/');
        else navigate(`/${view}`);
    };

    // Default theme based on device width (Light for mobile < 768px, Dark for desktop)
    const defaultTheme = typeof window !== 'undefined' && window.innerWidth < 768 ? 'light' : 'dark';
    
    const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('jee-tracker-theme', defaultTheme);
    // const [currentView, setCurrentView] = useLocalStorage<View>('jee-tracker-view', 'dashboard'); // Replaced by Router
    const [progress, setProgress] = useLocalStorage<AppProgress>('jee-tracker-progress', initialProgress);
    const [accentColor, setAccentColor] = useLocalStorage<string>('jee-tracker-accent', '#00F0FF');
    const [examDate, setExamDate] = useLocalStorage<string>('jee-exam-date', '');
    const [plannerTasks, setPlannerTasks] = useLocalStorage<PlannerTask[]>('jee-tracker-planner-tasks', []);
    const [customColumns, setCustomColumns] = useLocalStorage<Record<Subject, string[]>>('jee-tracker-custom-columns', {
        physics: [],
        chemistry: [],
        maths: []
    });
    const [excludedColumns, setExcludedColumns] = useLocalStorage<Record<Subject, string[]>>('jee-tracker-excluded-columns', {
        physics: [],
        chemistry: [],
        maths: []
    });
    const [materialOrder, setMaterialOrder] = useLocalStorage<Record<Subject, string[]>>('jee-tracker-material-order', {
        physics: [],
        chemistry: [],
        maths: []
    });
    const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>('jee-tracker-study-sessions', []);
    const [mockScores, setMockScores] = useLocalStorage<MockScore[]>('jee-tracker-mock-scores', []);

    const [plannerDateToOpen, setPlannerDateToOpen] = useState<string | null>(null);

    const [subjectData, setSubjectData] = useLocalStorage<Record<Subject, SubjectData | null>>('jee-tracker-subject-data', {
        physics: null,
        chemistry: null,
        maths: null,
    });

    const [dailyQuote, setDailyQuote] = useState<{ quote: string; author: string } | null>(null);

    // Load CSV data if not in local storage
    useEffect(() => {
        const loadSubjectData = async (subject: Subject) => {
            try {
                const data = await parseSubjectCSV(subject);
                setSubjectData(prev => {
                    // Only update if data doesn't already exist or is invalid
                    if (prev[subject] && prev[subject]?.chapters && prev[subject]!.chapters.length > 0) {
                        return prev;
                    }
                    return { ...prev, [subject]: data };
                });
            } catch (error) {
                console.error(`Failed to load ${subject} data:`, error);
            }
        };

        // Check current state before loading - robust validity check
        if (!subjectData.physics?.chapters?.length) loadSubjectData('physics');
        if (!subjectData.chemistry?.chapters?.length) loadSubjectData('chemistry');
        if (!subjectData.maths?.chapters?.length) loadSubjectData('maths');
    }, []); // Run once on mount. If subjectData is already there, it won't reload.

    // Load Quote Once per Session/Load
    useEffect(() => {
        const storedIndex = localStorage.getItem('jee-tracker-quote-index');
        let index = storedIndex ? parseInt(storedIndex, 10) : 0;

        if (isNaN(index) || index >= quotes.length) {
            index = 0;
        }

        setDailyQuote(quotes[index]);

        const nextIndex = (index + 1) % quotes.length;
        localStorage.setItem('jee-tracker-quote-index', nextIndex.toString());
    }, []);

    // Auto-shift incomplete tasks from past days to today
    useEffect(() => {
        const todayStr = formatDateLocal(new Date());
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        setPlannerTasks(currentTasks => {
            let shifted = false;
            const updatedTasks = currentTasks.map(task => {
                if (task.completed) return task;
                const taskDate = new Date(task.date);
                taskDate.setHours(0, 0, 0, 0);
                if (taskDate < today) {
                    shifted = true;
                    return { ...task, date: todayStr, wasShifted: true };
                }
                return task;
            });
            return shifted ? updatedTasks : currentTasks;
        });
    }, []); // Run once on mount

    // Alt+N keyboard shortcut to add new task
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.altKey && event.key === 'n') {
                event.preventDefault();
                handleQuickAddTask();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);


    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Apply accent color
    useEffect(() => {
        document.documentElement.style.setProperty('--accent', accentColor);
        document.documentElement.style.setProperty('--accent-light', `color-mix(in srgb, ${accentColor}, transparent 90%)`);
        document.documentElement.style.setProperty('--accent-hover', `color-mix(in srgb, ${accentColor}, black 10%)`);

        // Calculate contrast text color
        const hex = accentColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const textColor = brightness > 128 ? '#000000' : '#ffffff';
        const borderColor = brightness > 200 ? 'var(--border)' : accentColor;
        document.documentElement.style.setProperty('--accent-text', textColor);
        document.documentElement.style.setProperty('--accent-border', borderColor);

        // Update PWA theme color
        const metaThemeColor = document.querySelector("meta[name=theme-color]");
        if (metaThemeColor) {
            metaThemeColor.setAttribute("content", accentColor);
        }
    }, [accentColor]);

    // Merge CSV data with custom columns and filter excluded ones
    const mergedSubjectData = useMemo(() => {
        const merged: Record<Subject, SubjectData | null> = { physics: null, chemistry: null, maths: null };
        (['physics', 'chemistry', 'maths'] as Subject[]).forEach(subject => {
            const data = subjectData[subject];
            if (!data) return;

            const custom = customColumns[subject] || [];
            const excluded = excludedColumns[subject] || [];

            // Prevent duplicates and get all candidates
            const uniqueCustom = custom.filter(c => !data.materialNames.includes(c));
            let activeMaterials = [...data.materialNames, ...uniqueCustom].filter(m => !excluded.includes(m));

            const order = materialOrder[subject] || [];

            // Apply ordering if defined
            if (order.length > 0) {
                // Get ordered active items
                const orderedActive = order.filter(m => activeMaterials.includes(m));
                // Get any new items not in order list (append to end)
                const newItems = activeMaterials.filter(m => !orderedActive.includes(m));
                activeMaterials = [...orderedActive, ...newItems];
            }

            merged[subject] = {
                ...data,
                materialNames: activeMaterials,
                chapters: data.chapters.map(c => ({
                    ...c,
                    materials: activeMaterials
                }))
            };
        });
        return merged;
    }, [subjectData, customColumns, excludedColumns, materialOrder]);

    const { physicsProgress, chemistryProgress, mathsProgress, overallProgress, calculateSubjectProgress } = useProgress(progress, mergedSubjectData);

    const handleToggleMaterial = useCallback((subject: Subject, chapterSerial: number, material: string) => {
        setProgress(prev => {
            const subjectProgress = prev[subject];
            const chapterProgress = subjectProgress[chapterSerial] || { completed: {}, priority: 'none' as Priority };

            const isNowCompleted = !chapterProgress.completed[material];

            // Sync with Planner
            setPlannerTasks(tasks => tasks.map(t => {
                if (t.type === 'chapter' &&
                    t.subject === subject &&
                    t.chapterSerial === chapterSerial &&
                    t.material === material) {
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
                        completed: {
                            ...chapterProgress.completed,
                            [material]: isNowCompleted,
                        },
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
                    [chapterSerial]: {
                        ...chapterProgress,
                        priority,
                    },
                },
            };
        });
    }, [setProgress]);

    const handleAddColumn = useCallback((subject: Subject, columnName: string) => {
        if (!columnName.trim()) return;
        if (excludedColumns[subject]?.includes(columnName.trim())) {
            setExcludedColumns(prev => ({
                ...prev,
                [subject]: prev[subject].filter(c => c !== columnName.trim())
            }));
            return;
        }

        setCustomColumns(prev => ({
            ...prev,
            [subject]: [...(prev[subject] || []), columnName.trim()]
        }));
    }, [excludedColumns, setExcludedColumns, setCustomColumns]);

    const handleRemoveColumn = useCallback((subject: Subject, columnName: string) => {
        const isCustom = customColumns[subject]?.includes(columnName);

        if (isCustom) {
            setCustomColumns(prev => ({
                ...prev,
                [subject]: prev[subject].filter(c => c !== columnName)
            }));
        } else {
            setExcludedColumns(prev => ({
                ...prev,
                [subject]: [...(prev[subject] || []), columnName]
            }));
        }
    }, [customColumns, setCustomColumns, setExcludedColumns]);

    const handleReorderMaterials = useCallback((subject: Subject, materials: string[]) => {
        setMaterialOrder(prev => ({
            ...prev,
            [subject]: materials
        }));
    }, [setMaterialOrder]);

    // Chapter Management Handlers
    const handleAddChapter = useCallback((subject: Subject, name: string) => {
        setSubjectData(prev => {
            const data = prev[subject];
            if (!data) return prev;

            // Find max serial to ensure uniqueness
            const maxSerial = data.chapters.reduce((max, c) => Math.max(max, c.serial), 0);
            const newChapter = {
                serial: maxSerial + 1,
                name: name.trim(),
                materials: data.materialNames // Initially inherit current materials
            };

            return {
                ...prev,
                [subject]: {
                    ...data,
                    chapters: [...data.chapters, newChapter]
                }
            };
        });
    }, [setSubjectData]);

    const handleRemoveChapter = useCallback((subject: Subject, serial: number) => {
        setSubjectData(prev => {
            const data = prev[subject];
            if (!data) return prev;

            return {
                ...prev,
                [subject]: {
                    ...data,
                    chapters: data.chapters.filter(c => c.serial !== serial)
                }
            };
        });
    }, [setSubjectData]);

    const handleRenameChapter = useCallback((subject: Subject, serial: number, newName: string) => {
        setSubjectData(prev => {
            const data = prev[subject];
            if (!data) return prev;

            return {
                ...prev,
                [subject]: {
                    ...data,
                    chapters: data.chapters.map(c => c.serial === serial ? { ...c, name: newName.trim() } : c)
                }
            };
        });
    }, [setSubjectData]);

    const handleReorderChapters = useCallback((subject: Subject, newOrderChapters: any[]) => {
        setSubjectData(prev => {
            const data = prev[subject];
            if (!data) return prev;

            return {
                ...prev,
                [subject]: {
                    ...data,
                    chapters: newOrderChapters
                }
            };
        });
    }, [setSubjectData]);


    const handleThemeToggle = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleQuickAddTask = () => {
        setPlannerDateToOpen(formatDateLocal(new Date()));
        navigate('/planner');
    };

    // Planner Handlers
    const handleAddPlannerTask = (task: PlannerTask) => {
        setPlannerTasks(prev => [...prev, task]);
    };

    const handleTogglePlannerTask = (taskId: string) => {
        setPlannerTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                const newStatus = !t.completed;

                // Trigger small confetti when marking a task complete
                if (newStatus) {
                    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6366f1';
                    triggerSmallConfetti(accentColor);
                }

                // Sync with Chapter Progress if it's a chapter task
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
                                    completed: {
                                        ...chapterProgress.completed,
                                        [t.material!]: newStatus
                                    }
                                }
                            }
                        };
                    });
                }

                return {
                    ...t,
                    completed: newStatus,
                    wasShifted: newStatus ? false : t.wasShifted, // Clear shifted flag on completion
                    completedAt: newStatus ? new Date().toISOString() : undefined
                };
            }
            return t;
        }));
    };

    const handleDeletePlannerTask = (taskId: string) => {
        setPlannerTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const handleEditPlannerTask = (updatedTask: PlannerTask) => {
        setPlannerTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    };

    // Study Session Handlers
    const handleAddStudySession = (session: StudySession) => {
        setStudySessions(prev => [...prev, session]);
    };

    const handleDeleteStudySession = (sessionId: string) => {
        setStudySessions(prev => prev.filter(s => s.id !== sessionId));
    };

    const handleEditStudySession = (session: StudySession) => {
        setStudySessions(prev => prev.map(s => s.id === session.id ? session : s));
    };

    // Mock Score Handlers
    const handleAddMockScore = (score: Omit<MockScore, 'id'>) => {
        const newScore: MockScore = {
            ...score,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        setMockScores(prev => [...prev, newScore]);
    };

    const handleDeleteMockScore = (id: string) => {
        setMockScores(prev => prev.filter(s => s.id !== id));
    };

    return (
        <div className="app">
            <Header
                currentView={currentView}
                onNavigate={handleNavigate}
                theme={theme}
                onThemeToggle={handleThemeToggle}
                accentColor={accentColor}
                onAccentChange={setAccentColor}
            />
            <main className="main-content">
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/" element={
                            <Dashboard
                                physicsProgress={physicsProgress}
                                chemistryProgress={chemistryProgress}
                                mathsProgress={mathsProgress}
                                overallProgress={overallProgress}
                                subjectData={mergedSubjectData}
                                onNavigate={handleNavigate}
                                quote={dailyQuote}
                                plannerTasks={plannerTasks}
                                onToggleTask={handleTogglePlannerTask}
                                examDate={examDate}
                                onExamDateChange={setExamDate}
                                onQuickAdd={handleQuickAddTask}
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
                                onConsumeInitialDate={() => setPlannerDateToOpen(null)}
                                sessions={studySessions}
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
            </main>

        </div>
    );
}

export default App;
