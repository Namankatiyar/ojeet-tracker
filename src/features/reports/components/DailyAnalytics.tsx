import React, { useState, useMemo, useCallback } from 'react';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { StudySession, Subject } from '../../../shared/types';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    BarChart2,
    BookOpen,
    Activity,
    Zap,
    MinusCircle
} from 'lucide-react';

/* ───────────────────────────────────────────── */
/* Date Helpers                                  */
/* ───────────────────────────────────────────── */
const getLocalDateString = (offsetDays = 0): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
};

const getSessionDate = (s: StudySession): string =>
    s.localDate ?? s.startTime.slice(0, 10);

/** Show minutes when < 60s total, hours+mins otherwise. Never shows "0.8 hrs". */
const formatSmartDuration = (seconds: number): string => {
    if (seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

/** Same as above but for hero stat card — always show the dominant unit clearly. */
const formatStatValue = (seconds: number): string => {
    if (seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    const frac = (seconds / 3600).toFixed(1);
    return `${frac}h`;
};

const formatHourLabel = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
};

/** Format a YYYY-MM-DD string for display */
const formatDateDisplay = (dateStr: string): string => {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

/* ───────────────────────────────────────────── */
/* Component                                     */
/* ───────────────────────────────────────────── */
export const DailyAnalytics: React.FC = () => {
    const {
        studySessions,
        plannerTasks
    } = useUserProgress();

    const todayStr = getLocalDateString(0);
    const yesterdayStr = getLocalDateString(-1);

    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    /* ── Filter sessions by selected date ── */
    const daySessions = useMemo(
        () => studySessions.filter(s => getSessionDate(s) === selectedDate),
        [studySessions, selectedDate]
    );

    /* ── Previous day sessions (for delta comparisons) ── */
    const prevDateStr = useMemo(() => {
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        return d.toLocaleDateString('en-CA');
    }, [selectedDate]);

    const prevDaySessions = useMemo(
        () => studySessions.filter(s => getSessionDate(s) === prevDateStr),
        [studySessions, prevDateStr]
    );

    /* ── Hero Stats Calculations ── */
    const totalDurationSec = useMemo(
        () => daySessions.reduce((acc, s) => acc + s.duration, 0),
        [daySessions]
    );

    const prevTotalSec = useMemo(
        () => prevDaySessions.reduce((acc, s) => acc + s.duration, 0),
        [prevDaySessions]
    );

    const diffSec = totalDurationSec - prevTotalSec;

    /* Streak count: consecutive active days ending on or before selected date */
    const streak = useMemo(() => {
        let count = 0;
        const checkDate = new Date(selectedDate + 'T00:00:00');
        while (true) {
            const dateStr = checkDate.toLocaleDateString('en-CA');
            const hasSession = studySessions.some(s => getSessionDate(s) === dateStr);
            if (hasSession) {
                count++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return count;
    }, [studySessions, selectedDate]);

    /* Momentum trend */
    const { momentumTrend, avg3Day } = useMemo(() => {
        const d = new Date(selectedDate + 'T00:00:00');
        let sum = 0;
        for (let i = 0; i < 3; i++) {
            const ds = d.toLocaleDateString('en-CA');
            sum += studySessions
                .filter(s => getSessionDate(s) === ds)
                .reduce((acc, s) => acc + s.duration, 0);
            d.setDate(d.getDate() - 1);
        }
        const avg3Day = sum / 3;
        const threshold = 0.15;

        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (totalDurationSec === 0 && prevTotalSec === 0) trend = 'stable';
        else if (totalDurationSec > prevTotalSec && totalDurationSec > avg3Day) trend = 'improving';
        else if (Math.abs(totalDurationSec - prevTotalSec) <= prevTotalSec * threshold && prevTotalSec > 0) trend = 'stable';
        else if (totalDurationSec < prevTotalSec) trend = 'declining';
        
        return { momentumTrend: trend, avg3Day };
    }, [studySessions, selectedDate, totalDurationSec, prevTotalSec]);

    /* Progress velocity: tasks completed + sessions on that day */
    const tasksCompleted = useMemo(
        () =>
            plannerTasks.filter(t => {
                if (!t.completedAt) return false;
                return t.completedAt.slice(0, 10) === selectedDate;
            }).length,
        [plannerTasks, selectedDate]
    );

    const progressVelocity = tasksCompleted + daySessions.length;

    /* ── Subject Distribution ── */
    const subjectTotals = useMemo(() => {
        const totals: Record<Subject, number> = { physics: 0, chemistry: 0, maths: 0 };
        let total = 0;
        daySessions.forEach(s => {
            if (s.subject && totals[s.subject] !== undefined) {
                totals[s.subject] += s.duration;
                total += s.duration;
            }
        });
        return { totals, total };
    }, [daySessions]);

    const progressSegments = useMemo(() => {
        if (subjectTotals.total === 0) return [];
        
        const segments: Array<{
            subject: Subject;
            chapterName: string;
            duration: number;
            percentage: number;
            opacity: number;
        }> = [];
        
        const activeSubjects: Subject[] = ['physics', 'chemistry', 'maths'];
        
        activeSubjects.forEach(sub => {
            if (subjectTotals.totals[sub] <= 0) return;
            
            const chapterMap: Record<string, number> = {};
            let uncategorizedDuration = 0;
            
            daySessions.forEach(s => {
                if (s.subject !== sub) return;
                if (s.chapterName) {
                    chapterMap[s.chapterName] = (chapterMap[s.chapterName] || 0) + s.duration;
                } else {
                    uncategorizedDuration += s.duration;
                }
            });
            
            const chaptersList = Object.entries(chapterMap).map(([name, duration]) => ({
                name,
                duration
            })).sort((a, b) => b.duration - a.duration);
            
            if (uncategorizedDuration > 0) {
                chaptersList.push({
                    name: 'General',
                    duration: uncategorizedDuration
                });
            }
            
            chaptersList.forEach((ch, index) => {
                const opacity = Math.max(0.4, 1 - index * 0.2);
                segments.push({
                    subject: sub,
                    chapterName: ch.name,
                    duration: ch.duration,
                    percentage: (ch.duration / subjectTotals.total) * 100,
                    opacity
                });
            });
        });
        
        return segments;
    }, [daySessions, subjectTotals]);

    /* ── Productivity Timeline (hourly buckets) ── */
    const hourlyBuckets = useMemo(() => {
        const slots: Array<{
            subjects: Set<Subject>;
            totalMin: number;
            titles: string[];
        }> = Array.from({ length: 24 }, () => ({
            subjects: new Set<Subject>(),
            totalMin: 0,
            titles: []
        }));

        daySessions.forEach(s => {
            const hour = new Date(s.startTime).getHours();
            if (hour >= 0 && hour < 24) {
                if (s.subject) slots[hour].subjects.add(s.subject);
                slots[hour].totalMin += Math.round(s.duration / 60);
                slots[hour].titles.push(s.title);
            }
        });
        return slots;
    }, [daySessions]);

    const peakHour = useMemo(() => {
        let peak = -1;
        let maxMin = 0;
        hourlyBuckets.forEach((slot, hr) => {
            if (slot.totalMin > maxMin) {
                maxMin = slot.totalMin;
                peak = hr;
            }
        });
        return peak;
    }, [hourlyBuckets]);

    /* ── Chapter Breakdown ── */
    const chapterBreakdown = useMemo(() => {
        const map: Record<string, {
            name: string;
            subject: Subject;
            duration: number;
            materials: Set<string>;
        }> = {};
        daySessions.forEach(s => {
            if (!s.chapterName || !s.subject) return;
            const key = `${s.subject}-${s.chapterName}`;
            if (!map[key]) {
                map[key] = {
                    name: s.chapterName,
                    subject: s.subject,
                    duration: 0,
                    materials: new Set()
                };
            }
            map[key].duration += s.duration;
            if (s.material) map[key].materials.add(s.material);
        });
        return Object.values(map);
    }, [daySessions]);

    /* ── AI Insights ── */
    const insights = useMemo(() => {
        const items: Array<{ text: React.ReactNode; type: 'default' | 'tip' | 'warn' }> = [];
        if (daySessions.length === 0) return items;

        const { totals } = subjectTotals;
        const subjects: Subject[] = ['physics', 'chemistry', 'maths'];
        const studied = subjects.filter(s => totals[s] > 0);
        const notStudied = subjects.filter(s => totals[s] === 0);

        if (studied.length > 0 && notStudied.length > 0) {
            const dominant = studied.reduce((a, b) => totals[a] > totals[b] ? a : b);
            const dominantLabel = dominant.charAt(0).toUpperCase() + dominant.slice(1);
            const missing = notStudied.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' or ');
            items.push({
                text: (
                    <p>
                        Heavy focus on <strong>{dominantLabel}</strong> today. Schedule a{' '}
                        <strong>{missing}</strong> session tomorrow to stay balanced.
                    </p>
                ),
                type: 'default'
            });
        }

        const hasLateNight = daySessions.some(s => new Date(s.startTime).getHours() >= 22);
        if (hasLateNight) {
            items.push({
                text: (
                    <p>
                        You studied past 10 PM. Get 7–8 hours of sleep for optimal memory consolidation.
                    </p>
                ),
                type: 'warn'
            });
        } else if (totalDurationSec > 7200) {
            items.push({
                text: (
                    <p>
                        Solid output today! Your peak window aligns with JEE exam timings — keep
                        reinforcing this biological rhythm.
                    </p>
                ),
                type: 'tip'
            });
        }

        if (streak >= 5) {
            items.push({
                text: (
                    <p>
                        <strong>{streak}-day streak</strong> — consistent daily practice is the strongest
                        predictor of JEE success. Keep it going!
                    </p>
                ),
                type: 'tip'
            });
        }

        return items;
    }, [daySessions, subjectTotals, streak, totalDurationSec]);

    /* ── Date Navigation ── */
    const adjustDate = useCallback((offset: number) => {
        setSelectedDate(prev => {
            const d = new Date(prev + 'T00:00:00');
            d.setDate(d.getDate() + offset);
            return d.toLocaleDateString('en-CA');
        });
    }, []);

    /* ── Derived booleans ── */
    const isToday = selectedDate === todayStr;
    const isYesterday = selectedDate === yesterdayStr;
    const hasSessions = daySessions.length > 0;

    /* ── Delta Badge ── */
    const renderDelta = () => {
        if (prevTotalSec === 0 && totalDurationSec === 0) return null;
        if (diffSec > 0) {
            const label = formatSmartDuration(diffSec);
            return <span className="dh-badge success">+{label}</span>;
        }
        if (diffSec < 0) {
            const label = formatSmartDuration(Math.abs(diffSec));
            return <span className="dh-badge danger">-{label}</span>;
        }
        return <span className="dh-badge stable">Same as prev</span>;
    };



    const trendLabel =
        momentumTrend === 'improving' ? 'Improving' :
            momentumTrend === 'declining' ? 'Declining' : 'Stable';

    /* ──────────────────── RENDER ──────────────────── */
    return (
        <div className="dh-section">
            {/* Section Title */}
            <div className="dh-section-title-row">
                <Activity className="dh-section-icon" size={20} />
                <div>
                    <h2 className="dh-section-title">Daily study analytics</h2>
                    <p className="dh-section-subtitle">Deep dive into your study patterns and productivity</p>
                </div>
            </div>

            {/* Date Navigation Bar */}
            <div className="dh-date-nav-bar glass-panel">
                <div className="dh-date-left-group">
                    <button
                        className="dh-nav-arrow"
                        onClick={() => adjustDate(-1)}
                        title="Previous day"
                        aria-label="Previous day"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {/* Pills: Yesterday → Today (chronological left-to-right) */}
                    <div className="dh-pill-group">
                        <button
                            className={`dh-pill-btn${isYesterday ? ' active' : ''}`}
                            onClick={() => setSelectedDate(yesterdayStr)}
                        >
                            Yesterday
                        </button>
                        <button
                            className={`dh-pill-btn${isToday ? ' active' : ''}`}
                            onClick={() => setSelectedDate(todayStr)}
                        >
                            Today
                        </button>
                    </div>

                    <button
                        className="dh-nav-arrow"
                        onClick={() => adjustDate(1)}
                        title="Next day"
                        aria-label="Next day"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* Right side: single calendar button — opens DatePickerModal */}
                <button
                    className="dh-calendar-trigger"
                    onClick={() => setIsDatePickerOpen(true)}
                    aria-label="Pick a date"
                    title="Pick a date"
                >
                    <Calendar size={14} />
                    <span>{formatDateDisplay(selectedDate)}</span>
                </button>
            </div>

            {/* Analytics Grid */}
            <div className="dh-analytics-grid">
                {hasSessions ? (
                    <>
                        {/* Subject Focus & Distribution */}
                        <div className="dh-card glass-panel">
                            <div className="dh-card-header">
                                <BarChart2 size={14} className="dh-card-header-icon" />
                                <h3>Subject focus & distribution</h3>
                                {subjectTotals.total > 0 && (
                                    <div className="dh-total-studied-badge">
                                        <Clock size={10} />
                                        <span>Total: <strong>{formatSmartDuration(subjectTotals.total)}</strong></span>
                                    </div>
                                )}
                            </div>
                            <div className="dh-subj-dist-container">
                                <div className="dh-stacked-bar-track">
                                    {progressSegments.map((seg, idx) => (
                                        <div
                                            key={`${seg.subject}-${seg.chapterName}-${idx}`}
                                            className={`dh-stacked-bar-fill ${seg.subject}`}
                                            style={{ 
                                                width: `${seg.percentage}%`,
                                                opacity: seg.opacity
                                            }}
                                            data-tooltip={`${seg.subject.charAt(0).toUpperCase() + seg.subject.slice(1)} · ${seg.chapterName} (${formatSmartDuration(seg.duration)})`}
                                        />
                                    ))}
                                </div>
                                <div className="dh-subj-legend">
                                    {(['physics', 'chemistry', 'maths'] as Subject[])
                                        .filter(sub => subjectTotals.totals[sub] > 0)
                                        .map(sub => {
                                        const pct = Math.round((subjectTotals.totals[sub] / subjectTotals.total) * 100);
                                        return (
                                            <div className="dh-legend-item" key={sub}>
                                                <span className={`dh-legend-dot ${sub}`} />
                                                <span>
                                                    {sub.charAt(0).toUpperCase() + sub.slice(1)}:{' '}
                                                    <span className="dh-legend-val">
                                                        {formatSmartDuration(subjectTotals.totals[sub])}
                                                    </span>
                                                    {pct > 0 && <span className="dh-legend-pct"> {pct}%</span>}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Productivity Timeline */}
                        <div className="dh-card glass-panel">
                            <div className="dh-card-header">
                                <Clock size={14} className="dh-card-header-icon" />
                                <h3>Productivity timeline</h3>
                                {peakHour >= 0 && (
                                    <div
                                        className="dh-peak-badge"
                                        data-tooltip="Calculated as the hourly block with the highest study duration."
                                    >
                                        <Zap size={10} />
                                        <span>Peak: <strong>{formatHourLabel(peakHour)}</strong></span>
                                    </div>
                                )}
                            </div>
                            <div className="dh-timeline-container">
                                <div className="dh-heatmap-grid">
                                    {hourlyBuckets.map((slot, hr) => {
                                        let cellClass = '';
                                        let tooltip = `${hr.toString().padStart(2, '0')}:00 — no study`;
                                        if (slot.totalMin > 0) {
                                            const subArr = Array.from(slot.subjects);
                                            cellClass = subArr.length === 1
                                                ? ` active-${subArr[0]}`
                                                : ' active-mixed';
                                            tooltip = `${formatHourLabel(hr)} · ${slot.titles.join(', ')} (${slot.totalMin}m)`;
                                        }
                                        return (
                                            <span
                                                key={hr}
                                                className={`dh-heatmap-cell${cellClass}`}
                                                data-tooltip={tooltip}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="dh-timeline-labels">
                                    <span>12 AM</span>
                                    <span>6 AM</span>
                                    <span>12 PM</span>
                                    <span>6 PM</span>
                                    <span>11 PM</span>
                                </div>
                            </div>
                        </div>

                        {/* Chapter Breakdown */}
                        <div className="dh-card glass-panel">
                            <div className="dh-card-header">
                                <BookOpen size={14} className="dh-card-header-icon" />
                                <h3>Chapters studied</h3>
                            </div>
                            <div className="dh-table-container">
                                <table className="dh-table">
                                    <thead>
                                        <tr>
                                            <th>Chapter</th>
                                            <th>Subject</th>
                                            <th>Time spent</th>
                                            <th>Materials</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chapterBreakdown.length > 0 ? chapterBreakdown.map(ch => (
                                            <tr key={`${ch.subject}-${ch.name}`}>
                                                <td>
                                                    <div className="dh-chapter-name">{ch.name}</div>
                                                </td>
                                                <td>
                                                    <span className={`dh-subject-badge ${ch.subject}`}>
                                                        {ch.subject}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="dh-time-mono">
                                                        {formatSmartDuration(ch.duration)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="dh-progress-dots" title={Array.from(ch.materials).join(', ')}>
                                                        {['NCERT', 'PYQs', 'Modules'].map(mat => (
                                                            <span
                                                                key={mat}
                                                                className={`dh-dot-tag${ch.materials.has(mat) ? ' completed' : ''}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-4)' }}>
                                                    Sessions have no chapter data
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Key Metrics Panel (Replaces Session History) */}
                        <div className="dh-card glass-panel dh-key-metrics-panel">
                            <div className="dh-card-header">
                                <BarChart2 size={14} className="dh-card-header-icon" />
                                <h3>Key performance metrics</h3>
                            </div>
                            
                            <div className="dh-metrics-grid">
                                {/* Study Time */}
                                <div className="dh-metric-card">
                                    <div className="dh-metric-bg-mask mask-clock subject-physics" />
                                    <div className="dh-metric-top">
                                        <span className="dh-metric-label">Study time</span>
                                    </div>
                                    <div className="dh-metric-value">{formatStatValue(totalDurationSec)}</div>
                                    <div className="dh-metric-compare">
                                        {renderDelta()}
                                        <span>vs yesterday</span>
                                    </div>
                                </div>

                                {/* Streak */}
                                <div className="dh-metric-card">
                                    <div className="dh-metric-bg-mask mask-arrowup subject-chemistry" />
                                    <div className="dh-metric-top">
                                        <span className="dh-metric-label">Current streak</span>
                                    </div>
                                    <div className="dh-metric-value">{streak} {streak === 1 ? 'day' : 'days'}</div>
                                    <div className="dh-metric-compare">
                                        {streak > 0
                                            ? <span className="dh-badge streak">🔥 Active</span>
                                            : <span className="dh-badge stable">No streak yet</span>
                                        }
                                    </div>
                                </div>

                                {/* Momentum */}
                                <div className="dh-metric-card">
                                    <div className="dh-metric-bg-mask mask-progressdown subject-maths" />
                                    <div className="dh-metric-top">
                                        <span className="dh-metric-label">Momentum</span>
                                    </div>
                                    <div className="dh-metric-value text-label">{trendLabel}</div>
                                    <div className="dh-metric-compare">
                                        <span>3-day avg: {formatSmartDuration(avg3Day)}</span>
                                    </div>
                                </div>

                                {/* Progress velocity */}
                                <div className="dh-metric-card">
                                    <div className="dh-metric-bg-mask mask-progress subject-physics" />
                                    <div className="dh-metric-top">
                                        <span className="dh-metric-label">Progress velocity</span>
                                    </div>
                                    <div className="dh-metric-value">{progressVelocity} items</div>
                                    <div className="dh-metric-compare">
                                        <span>{daySessions.length} sessions · {tasksCompleted} tasks</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key Insights */}
                        {insights.length > 0 && (
                            <div className="dh-card glass-panel dh-card-full-span">
                                <div className="dh-card-header">
                                    <Zap size={14} className="dh-card-header-icon" />
                                    <h3>Key study insights</h3>
                                </div>
                                <div className="dh-insights-list">
                                    {insights.map((insight, i) => (
                                        <div
                                            key={i}
                                            className={`dh-insight-item${insight.type === 'tip' ? ' tip' : insight.type === 'warn' ? ' warn' : ''}`}
                                        >
                                            <span>
                                                {insight.type === 'warn' ? '🌙' : insight.type === 'tip' ? '⚡' : '💡'}
                                            </span>
                                            {insight.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Empty State */
                    <div className="dh-empty-state glass-panel">
                        <MinusCircle size={36} />
                        <h4>No study logs on this date</h4>
                        <p>
                            Use the Study Clock or log tasks in the Planner to populate analytics for this day.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Date Picker Modal ── */}
            <DatePickerModal
                isOpen={isDatePickerOpen}
                selectedDate={selectedDate}
                onSelect={date => setSelectedDate(date)}
                onClose={() => setIsDatePickerOpen(false)}
            />

        </div>
    );
};
