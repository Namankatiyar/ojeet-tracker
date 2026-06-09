import { useState, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { Subject, SubjectData, StudySession } from '../../../shared/types';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';

interface SessionStatisticsProps {
    sessions: StudySession[];
    subjectData: Record<Subject, SubjectData | null>;
}

function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

function getSessionDate(session: StudySession): Date {
    if (session.localDate) {
        const [y, m, d] = session.localDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    const parsed = new Date(session.startTime);
    if (Number.isNaN(parsed.getTime())) return new Date(0);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function SessionStatistics({ sessions, subjectData }: SessionStatisticsProps) {
    const [statsSubject, setStatsSubject] = useState<Subject | 'all'>('all');
    const [statsChapter, setStatsChapter] = useState<number | 'all'>('all');
    const [statsMaterial, setStatsMaterial] = useState<string | 'all'>('all');
    const [showDistribution, setShowDistribution] = useState(false);
    const [openChapterGraphs, setOpenChapterGraphs] = useState<Subject[]>([]);
    const [breakdownPeriod, setBreakdownPeriod] = useState<'overall' | 'daily' | 'weekly' | 'monthly'>(() => {
        const saved = localStorage.getItem('breakdownPeriod');
        return (saved as any) || 'overall';
    });

    const getFilteredSessions = useCallback(() => {
        return sessions.filter(s => {
            if (statsSubject !== 'all' && s.subject !== statsSubject) return false;
            if (statsChapter !== 'all' && s.chapterSerial !== statsChapter) return false;
            if (statsMaterial !== 'all' && s.material !== statsMaterial) return false;
            return true;
        });
    }, [sessions, statsSubject, statsChapter, statsMaterial]);

    const totalFilteredTime = getFilteredSessions().reduce((acc, s) => acc + s.duration, 0);

    const getSessionsForPeriod = useCallback((period: 'overall' | 'daily' | 'weekly' | 'monthly') => {
        const now = new Date();
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const currentDay = now.getDay();
        const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
        const startOfWeekDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
        
        const startOfMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);

        return sessions.filter(s => {
            const sDate = getSessionDate(s);
            if (period === 'daily') return sDate >= todayDate;
            if (period === 'weekly') return sDate >= startOfWeekDate;
            if (period === 'monthly') return sDate >= startOfMonthDate;
            return true;
        });
    }, [sessions]);

    const activeSessions = useMemo(() => {
        return getSessionsForPeriod(breakdownPeriod);
    }, [getSessionsForPeriod, breakdownPeriod]);

    const activeTotalTime = useMemo(() => {
        return activeSessions.reduce((acc, s) => acc + s.duration, 0);
    }, [activeSessions]);

    const getSubjectDistribution = useCallback((periodSessions: StudySession[]) => {
        const distribution = { physics: 0, chemistry: 0, maths: 0, custom: 0 };
        periodSessions.forEach(s => {
            if (s.subject && s.subject in distribution) {
                distribution[s.subject] += s.duration;
            } else {
                distribution.custom += s.duration;
            }
        });
        return distribution;
    }, []);

    const subjectDistribution = useMemo(() => {
        return getSubjectDistribution(activeSessions);
    }, [getSubjectDistribution, activeSessions]);

    const statsAvailableChapters = statsSubject !== 'all'
        ? subjectData[statsSubject]?.chapters.filter(ch =>
            sessions.some(s => s.subject === statsSubject && s.chapterSerial === ch.serial)
        ) || []
        : [];

    const statsAvailableMaterials: string[] = statsSubject !== 'all'
        ? Array.from(new Set(sessions.filter(s => s.subject === statsSubject && (statsChapter === 'all' || s.chapterSerial === statsChapter)).map(s => s.material))).filter((m): m is string => !!m)
        : Array.from(new Set(sessions.map(s => s.material))).filter((m): m is string => !!m);

    const getTopChaptersForSubject = (subject: Subject) => {
        const chapterTimes: Map<number, { name: string; time: number }> = new Map();
        activeSessions
            .filter(s => s.subject === subject && s.chapterSerial)
            .forEach(s => {
                const current = chapterTimes.get(s.chapterSerial!) || { name: s.chapterName || `Chapter ${s.chapterSerial}`, time: 0 };
                chapterTimes.set(s.chapterSerial!, { name: current.name, time: current.time + s.duration });
            });
        return Array.from(chapterTimes.entries())
            .map(([serial, data]) => ({ serial, ...data }))
            .sort((a, b) => b.time - a.time)
            .slice(0, 5);
    };

    const toggleChapterGraph = (subject: Subject) => {
        if (subject === 'custom' as any) return;
        setOpenChapterGraphs(prev =>
            prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
        );
    };

    const handleTogglePeriod = () => {
        setBreakdownPeriod(prev => {
            const next = prev === 'overall' ? 'daily' :
                         prev === 'daily' ? 'weekly' :
                         prev === 'weekly' ? 'monthly' : 'overall';
            localStorage.setItem('breakdownPeriod', next);
            return next;
        });
    };

    const periodLabels = {
        overall: 'Overall Study Time',
        daily: "Today's Study Time",
        weekly: "This Week's Study Time",
        monthly: "This Month's Study Time"
    };

    return (
        <>
            <div className="statistics-card">
                <h3>Statistics</h3>
                <div className="stats-total" onClick={() => setShowDistribution(true)}>
                    <div className="stats-total-label">{periodLabels[breakdownPeriod]}</div>
                    <div className="stats-total-value">{formatDuration(activeTotalTime)}</div>
                    <div className="stats-total-hint">Click to see breakdown</div>
                </div>
                <div className="stats-filters">
                    <div className="stats-filter-group">
                        <label>Subject</label>
                        <CustomSelect
                            value={statsSubject}
                            onChange={val => { setStatsSubject(val as Subject | 'all'); setStatsChapter('all'); setStatsMaterial('all'); }}
                            options={[
                                { value: 'all', label: 'All Subjects' },
                                { value: 'physics', label: 'Physics' },
                                { value: 'chemistry', label: 'Chemistry' },
                                { value: 'maths', label: 'Maths' },
                            ]}
                            placeholder="Select Subject"
                        />
                    </div>
                    {statsSubject !== 'all' && (
                        <div className="stats-filter-group">
                            <label>Chapter</label>
                            <CustomSelect
                                value={statsChapter}
                                onChange={val => { setStatsChapter(val === 'all' ? 'all' : Number(val)); setStatsMaterial('all'); }}
                                options={[
                                    { value: 'all', label: 'All Chapters' },
                                    ...statsAvailableChapters.map(ch => ({ value: ch.serial, label: ch.name })),
                                ]}
                                placeholder="Select Chapter"
                            />
                        </div>
                    )}
                    <div className="stats-filter-group">
                        <label>Material</label>
                        <CustomSelect
                            value={statsMaterial}
                            onChange={val => setStatsMaterial(val)}
                            options={[
                                { value: 'all', label: 'All Materials' },
                                ...statsAvailableMaterials.map(mat => ({ value: mat, label: mat })),
                            ]}
                            placeholder="Select Material"
                        />
                    </div>
                </div>
                <div className="stats-filtered-result">
                    <div className="stats-filtered-label">
                        {statsSubject === 'all' ? 'All Sessions' : (
                            <>
                                {statsSubject.charAt(0).toUpperCase() + statsSubject.slice(1)}
                                {statsChapter !== 'all' && ` > ${subjectData[statsSubject]?.chapters.find(c => c.serial === statsChapter)?.name || ''}`}
                                {statsMaterial !== 'all' && ` > ${statsMaterial}`}
                            </>
                        )}
                    </div>
                    <div className="stats-filtered-value">{formatDuration(totalFilteredTime)}</div>
                    <div className="stats-filtered-count">{getFilteredSessions().length} sessions</div>
                </div>
            </div>

            {/* Distribution Modal */}
            {showDistribution && (
                <div className="distribution-modal-overlay" onClick={() => setShowDistribution(false)}>
                    <div className="distribution-modal" onClick={e => e.stopPropagation()}>
                        <div className="distribution-modal-header">
                            <h3>Study Time Breakdown</h3>
                            <button className="distribution-modal-close" onClick={() => setShowDistribution(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="distribution-total-time" onClick={handleTogglePeriod}>
                            <div className="distribution-total-label">{periodLabels[breakdownPeriod]}</div>
                            <div className="distribution-total-value">{formatDuration(activeTotalTime)}</div>
                            <div className="distribution-total-hint">Click to toggle period</div>
                        </div>
                        <div className="distribution-section-title">Time by Subject</div>
                        <div className="distribution-chart">
                            {[
                                { key: 'physics', label: 'Physics', time: subjectDistribution.physics },
                                { key: 'chemistry', label: 'Chemistry', time: subjectDistribution.chemistry },
                                { key: 'maths', label: 'Maths', time: subjectDistribution.maths },
                                { key: 'custom', label: 'Custom', time: subjectDistribution.custom },
                            ].map(item => {
                                const isOpen = item.key !== 'custom' && openChapterGraphs.includes(item.key as Subject);
                                const topChapters = isOpen ? getTopChaptersForSubject(item.key as Subject) : [];
                                const maxTime = topChapters[0]?.time || 1;
                                return (
                                    <div key={item.key} className="distribution-subject-section">
                                        <div
                                            className="distribution-bar-item"
                                            onClick={() => item.key !== 'custom' && toggleChapterGraph(item.key as Subject)}
                                            title={item.key !== 'custom' ? 'Click to see chapter breakdown' : ''}
                                        >
                                            <div className="distribution-bar-header">
                                                <span className="distribution-bar-label">{item.label}</span>
                                                <span className="distribution-bar-value">
                                                    {formatDuration(item.time)} ({activeTotalTime > 0 ? Math.round((item.time / activeTotalTime) * 100) : 0}%)
                                                </span>
                                            </div>
                                            <div className="distribution-bar-track">
                                                <div
                                                    className={`distribution-bar-fill ${item.key}`}
                                                    style={{ width: `${activeTotalTime > 0 ? (item.time / activeTotalTime) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                        {isOpen && (
                                            <div className="chapter-graph-inline">
                                                <div className="chapter-graph-bars">
                                                    {topChapters.length === 0 ? (
                                                        <div className="empty-log empty-log-chapter">
                                                            <span>No chapter data yet</span>
                                                        </div>
                                                    ) : (
                                                        topChapters.map(chapter => (
                                                            <div key={chapter.serial} className="chapter-bar-item">
                                                                <div className="chapter-bar-header">
                                                                    <span className="chapter-bar-name">{chapter.name}</span>
                                                                    <span className="chapter-bar-time">{formatDuration(chapter.time)}</span>
                                                                </div>
                                                                <div className="chapter-bar-track">
                                                                    <div
                                                                        className={`chapter-bar-fill ${item.key}`}
                                                                        style={{ width: `${(chapter.time / maxTime) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
