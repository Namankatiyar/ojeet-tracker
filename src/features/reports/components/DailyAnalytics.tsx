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
    MinusCircle,
    TrendingDown,
    TrendingUp,
    Flame
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

    const prevDayName = useMemo(() => {
        const parts = prevDateStr.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-IN', { weekday: 'short' });
    }, [prevDateStr]);

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
    const hasSessions = daySessions.length > 0;

    /* ── Delta Badge ── */
    const renderDelta = () => {
        if (prevTotalSec === 0 && totalDurationSec === 0) return null;
        if (isToday) {
            const label = diffSec > 0 ? `+${formatSmartDuration(diffSec)}` : `-${formatSmartDuration(Math.abs(diffSec))}`;
            return <span className="dh-badge stable" title="Day in progress">{label} (so far)</span>;
        }
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

    /* ── Weekly Data (7 days ending on selected date) ── */
    const weeklyData = useMemo(() => {
        const days: Array<{
            date: string;
            label: string;
            totals: Record<Subject, number>;
            total: number;
            isSelected: boolean;
        }> = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(selectedDate + 'T00:00:00');
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-CA');
            const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short' });
            const daySess = studySessions.filter(s => getSessionDate(s) === dateStr);
            const totals: Record<Subject, number> = { physics: 0, chemistry: 0, maths: 0 };
            let total = 0;
            daySess.forEach(s => {
                if (s.subject && totals[s.subject] !== undefined) {
                    totals[s.subject] += s.duration;
                    total += s.duration;
                }
            });
            days.push({ date: dateStr, label: dayLabel, totals, total, isSelected: dateStr === selectedDate });
        }
        return days;
    }, [studySessions, selectedDate]);

    const weeklyMax = useMemo(
        () => Math.max(...weeklyData.map(d => d.total), 1),
        [weeklyData]
    );

    /* ── Subject Chapters (grouped by subject) ── */
    const subjectChapters = useMemo(() => {
        const subjects: Subject[] = ['physics', 'chemistry', 'maths'];
        return subjects
            .filter(sub => subjectTotals.totals[sub] > 0)
            .map(sub => {
                const chapters = chapterBreakdown
                    .filter(ch => ch.subject === sub)
                    .sort((a, b) => b.duration - a.duration);
                const pct = Math.round((subjectTotals.totals[sub] / subjectTotals.total) * 100);
                return { subject: sub, duration: subjectTotals.totals[sub], pct, chapters };
            });
    }, [subjectTotals, chapterBreakdown]);

    /* ── Histogram Max ── */
    const histogramMax = useMemo(
        () => Math.max(...hourlyBuckets.map(s => s.totalMin), 1),
        [hourlyBuckets]
    );

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

            {/* ── Bento Analytics Grid ── */}
            <div className="dh-bento-grid">
                {hasSessions ? (
                    <>
                        {/* ── Hero: Study Time & Timeline ── */}
                        <div className="dh-bento-hero glass-panel">
                            <div className="dh-hero-left">
                                <div className="dh-card-header" style={{ position: 'relative', zIndex: 1, marginBottom: 'var(--space-1)' }}>
                                    <Clock size={14} className="dh-card-header-icon" />
                                    <h3>Study time</h3>
                                </div>
                                <div className="dh-hero-value">
                                    {formatStatValue(totalDurationSec)}
                                </div>
                                <div className="dh-hero-meta">
                                    {renderDelta()}
                                    <span className="dh-hero-vs">vs {prevDayName}</span>
                                </div>
                                <div className="dh-hero-velocity">
                                    <span>{daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'}</span>
                                    <span className="dh-hero-dot">·</span>
                                    <span>{tasksCompleted} {tasksCompleted === 1 ? 'task' : 'tasks'}</span>
                                </div>
                            </div>
                            
                            <div className="dh-hero-right">
                                <div className="dh-hero-timeline-header">
                                    <div className="dh-card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                        <Activity size={14} className="dh-card-header-icon" />
                                        <h3>Timeline</h3>
                                    </div>
                                    {peakHour >= 0 && (
                                        <div
                                            className="dh-peak-badge mini"
                                            data-tooltip="Hour block with highest study duration"
                                        >
                                            <Zap size={10} />
                                            <span>Peak: <strong>{formatHourLabel(peakHour)}</strong></span>
                                        </div>
                                    )}
                                </div>
                                <div className="dh-histogram-container compact">
                                    <div className="dh-histogram-grid">
                                        {hourlyBuckets.map((slot, hr) => {
                                            const heightPct = histogramMax > 0
                                                ? (slot.totalMin / histogramMax) * 100
                                                : 0;
                                            const subArr = Array.from(slot.subjects);
                                            const colorClass = slot.totalMin > 0
                                                ? (subArr.length === 1 ? subArr[0] : 'mixed')
                                                : 'empty';
                                            const tooltip = slot.totalMin > 0
                                                ? `${formatHourLabel(hr)} · ${slot.titles.join(', ')} (${slot.totalMin}m)`
                                                : `${formatHourLabel(hr)} — no study`;
                                            return (
                                                <div
                                                    key={hr}
                                                    className="dh-histogram-col"
                                                    data-tooltip={tooltip}
                                                >
                                                    <div className="dh-histogram-track">
                                                        <div
                                                            className={`dh-histogram-bar ${colorClass}`}
                                                            style={{ height: `${Math.max(heightPct, 0)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="dh-timeline-labels">
                                        <span>12a</span>
                                        <span>6a</span>
                                        <span>12p</span>
                                        <span>6p</span>
                                        <span>12a</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Weekly Overview ── */}
                        <div className="dh-bento-weekly glass-panel">
                            <div className="dh-card-header">
                                <BarChart2 size={14} className="dh-card-header-icon" />
                                <h3>Weekly overview</h3>
                            </div>
                            <div className="dh-weekly-chart">
                                {weeklyData.map((day) => (
                                    <div
                                        key={day.date}
                                        className={`dh-weekly-col${day.isSelected ? ' selected' : ''}`}
                                        data-tooltip={`${formatDateDisplay(day.date)}: ${formatSmartDuration(day.total)}`}
                                    >
                                        <div className="dh-weekly-bar-track">
                                            {(['physics', 'chemistry', 'maths'] as Subject[]).map(sub => {
                                                const heightPct = weeklyMax > 0
                                                    ? (day.totals[sub] / weeklyMax) * 100
                                                    : 0;
                                                return heightPct > 0 ? (
                                                    <div
                                                        key={sub}
                                                        className={`dh-weekly-bar-seg ${sub}`}
                                                        style={{ height: `${heightPct}%` }}
                                                    />
                                                ) : null;
                                            })}
                                        </div>
                                        <span className="dh-weekly-day-label">{day.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Streak + Momentum ── */}
                        <div className="dh-bento-stats">
                            <div className="dh-bento-unified-stats glass-panel">
                                {/* Streak Section */}
                                <div className="dh-stat-section">
                                    <div className="dh-card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                        <Flame size={14} className="dh-card-header-icon" />
                                        <h3>Current streak</h3>
                                    </div>
                                    <div className="dh-stat-value-row">
                                        <span className="dh-stat-value">{streak}</span>
                                        <span className="dh-stat-unit">{streak === 1 ? 'day' : 'days'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {streak > 0
                                            ? <span className="dh-badge streak">🔥 Active</span>
                                            : <span className="dh-badge stable">No streak</span>
                                        }
                                    </div>
                                </div>

                                <div className="dh-stat-divider" />

                                {/* Momentum Section */}
                                <div className="dh-stat-section">
                                    <div className="dh-card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                        {momentumTrend === 'improving' ? <TrendingUp size={14} className="dh-card-header-icon" /> : momentumTrend === 'declining' ? <TrendingDown size={14} className="dh-card-header-icon" /> : <Activity size={14} className="dh-card-header-icon" />}
                                        <h3>Momentum</h3>
                                    </div>
                                    <div className="dh-stat-value-row">
                                        <span className={`dh-stat-value text-label trend-${momentumTrend}`}>
                                            {trendLabel}
                                        </span>
                                    </div>
                                    <span className="dh-stat-sub">
                                        3-day avg: {formatSmartDuration(avg3Day)}
                                    </span>
                                </div>
                            </div>
                        </div>



                        {/* ── Subject Focus & Chapters ── */}
                        <div className="dh-bento-subjects glass-panel">
                            <div className="dh-card-header">
                                <BookOpen size={14} className="dh-card-header-icon" />
                                <h3>Integrated subject & chapter breakdown</h3>
                                {subjectTotals.total > 0 && (
                                    <div className="dh-total-studied-badge">
                                        <Clock size={10} />
                                        <span>Total: <strong>{formatSmartDuration(subjectTotals.total)}</strong></span>
                                    </div>
                                )}
                            </div>
                            <div className="dh-subject-cards-grid">
                                {subjectChapters.map(({ subject, duration, pct, chapters }) => (
                                    <div className="dh-subject-card" key={subject}>
                                        <div className="dh-subject-card-header">
                                            <div className="dh-subject-card-title">
                                                <span className={`dh-legend-dot ${subject}`} />
                                                <span className="dh-subject-card-name">
                                                    {subject.charAt(0).toUpperCase() + subject.slice(1)}
                                                </span>
                                            </div>
                                            <div className="dh-subject-card-stats">
                                                <span className="dh-subject-card-time">{formatSmartDuration(duration)}</span>
                                                <span className="dh-subject-card-pct">({pct}%)</span>
                                            </div>
                                        </div>
                                        
                                        <div className="dh-subject-progress-track">
                                            <div 
                                                className={`dh-subject-progress-fill ${subject}`} 
                                                style={{ width: `${pct}%` }} 
                                            />
                                        </div>

                                        {chapters.length > 0 && (
                                            <div className="dh-chapter-cards">
                                                {chapters.map(ch => (
                                                    <div className="dh-chapter-card" key={ch.name}>
                                                        <div className="dh-chapter-card-top">
                                                            <span className="dh-chapter-card-name">{ch.name}</span>
                                                            <span className="dh-chapter-card-time">{formatSmartDuration(ch.duration)}</span>
                                                        </div>
                                                        <div className="dh-chapter-card-tags" title={Array.from(ch.materials).join(', ')}>
                                                            {['NCERT', 'PYQs', 'Modules'].map(mat => (
                                                                <span
                                                                    key={mat}
                                                                    className={`dh-material-tag ${ch.materials.has(mat) ? `completed ${subject}` : ''}`}
                                                                >
                                                                    {mat.toUpperCase()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Key Insights ── */}
                        {insights.length > 0 && (
                            <div className="dh-bento-insights glass-panel">
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
