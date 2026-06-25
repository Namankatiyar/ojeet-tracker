import { useMemo } from 'react';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useTheme } from '../../../core/context/ThemeContext';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { UserAvatar } from '../../../shared/components/ui/Avatar';
import { StudySession, PlannerTask, ProgressCardSettings, RemoteProfile, LiveActivity } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';
import { Pencil, GraduationCap, Target, Clock, Flame, Wifi } from 'lucide-react';

interface UserProfileCardProps {
    onEditClick?: () => void;
    previewSettings?: ProgressCardSettings;
    previewMode?: boolean;
    remoteProfileData?: RemoteProfile & { 
        live_activity?: LiveActivity | null;
        peer_visibility_settings?: { show_agenda: boolean } | null;
    };
}

/* ── Helpers ── */
const getSessionDate = (s: StudySession): string =>
    s.localDate ?? s.startTime.slice(0, 10);

const formatSmartDuration = (seconds: number): string => {
    if (seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatTime12Hour = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const amPm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes.toString().padStart(2, '0')} ${amPm}`;
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function UserProfileCard({ onEditClick, previewSettings, previewMode = false, remoteProfileData }: UserProfileCardProps) {
    const {
        progressCardSettings,
        studySessions,
        plannerTasks,
        dailyQuestionLogs,
    } = useUserProgress();

    const { user } = useRemoteAuth();
    const { accentColor } = useTheme();

    const todayStr = formatDateLocal(new Date());

    /* ── Live Indicator: Read timer engine state from localStorage ── */
    const timerState = useMemo<'running' | 'paused' | 'online' | 'other'>(() => {
        if (remoteProfileData) {
            const act = remoteProfileData.live_activity;
            if (!act) return 'other';
            const isFresh = (new Date().getTime() - new Date(act.updated_at).getTime()) < 60000;
            if (act.is_active && isFresh) return 'running';
            return isFresh ? 'online' : 'other';
        }

        try {
            const raw = localStorage.getItem('jee-timer-engine');
            if (!raw) return 'other';
            const state = JSON.parse(raw);
            if (state.engineState === 'running') return 'running';
            if (state.engineState === 'paused') return 'paused';
            return 'other';
        } catch {
            return 'other';
        }
    }, [remoteProfileData]);

    /* ── Today's sessions → total study time ── */
    const todayStudyTimeSec = useMemo(() => {
        if (remoteProfileData) return remoteProfileData.today_study_seconds || 0;
        return studySessions
            .filter(s => getSessionDate(s) === todayStr)
            .reduce((acc, s) => acc + s.duration, 0);
    }, [remoteProfileData, studySessions, todayStr]);

    /* ── Today's questions ── */
    const todayQuestions = remoteProfileData 
        ? (remoteProfileData.today_questions || 0) 
        : Math.max(0, dailyQuestionLogs[todayStr] || 0);

    /* ── Study streak ── */
    const streak = useMemo(() => {
        if (remoteProfileData) return remoteProfileData.streak_count || 0;
        let count = 0;
        const checkDate = new Date();
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
    }, [remoteProfileData, studySessions]);

    /* ── Active Task ID from Study Clock ── */
    const activeTaskId = useMemo<string | null>(() => {
        try {
            const rawTimer = localStorage.getItem('jee-timer-engine');
            if (!rawTimer) return null;
            const timerState = JSON.parse(rawTimer);
            if (timerState.engineState !== 'running' && timerState.engineState !== 'paused') {
                return null;
            }
            const rawType = localStorage.getItem('studyClock_taskType');
            const rawTaskId = localStorage.getItem('studyClock_selectedTaskId');
            if (!rawType || !rawTaskId) return null;

            const taskType = JSON.parse(rawType);
            const taskId = JSON.parse(rawTaskId);
            return taskType === 'task' && taskId ? taskId : null;
        } catch {
            return null;
        }
    }, []);

    /* ── Today's tasks ── */
    const todayTasks = useMemo<PlannerTask[]>(
        () => {
            if (remoteProfileData) {
                if (remoteProfileData.peer_visibility_settings?.show_agenda === false) return [];
                return remoteProfileData.todays_tasks || [];
            }
            const filtered = plannerTasks.filter(t => t.date === todayStr);
            return [...filtered].sort((a, b) => {
                const aIsActive = a.id === activeTaskId;
                const bIsActive = b.id === activeTaskId;
                if (aIsActive && !bIsActive) return -1;
                if (!aIsActive && bIsActive) return 1;

                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                return a.time.localeCompare(b.time);
            });
        },
        [remoteProfileData, plannerTasks, todayStr, activeTaskId]
    );

    /* ── 7-day momentum heatmap ── */
    const heatmapData = useMemo(() => {
        if (remoteProfileData) return remoteProfileData.momentum_heatmap || [];
        const result: { dayLabel: string; seconds: number; level: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-CA');
            const dayOfWeek = d.getDay();
            const seconds = studySessions
                .filter(s => getSessionDate(s) === dateStr)
                .reduce((acc, s) => acc + s.duration, 0);
            const hours = seconds / 3600;
            let level = 0;
            if (hours >= 5) level = 4;
            else if (hours >= 3) level = 3;
            else if (hours >= 1) level = 2;
            else if (hours > 0) level = 1;
            result.push({ dayLabel: DAY_LABELS[dayOfWeek], seconds, level });
        }
        return result;
    }, [remoteProfileData, studySessions]);

    const activeSettings = previewSettings || progressCardSettings;

    const googleName = !remoteProfileData ? (user?.user_metadata?.full_name || user?.user_metadata?.name) : undefined;
    const googleAvatar = !remoteProfileData ? (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) : undefined;

    const userName = remoteProfileData?.display_name || remoteProfileData?.username || activeSettings.userName || googleName;
    const customAvatarUrl = remoteProfileData ? remoteProfileData.avatar_url : (activeSettings.customAvatarUrl || googleAvatar);
    const bannerUrl = remoteProfileData ? remoteProfileData.banner_url : activeSettings.bannerUrl;
    const customStatus = remoteProfileData ? remoteProfileData.custom_status : activeSettings.customStatus;
    const gradeStatus = remoteProfileData ? remoteProfileData.grade_status : activeSettings.gradeStatus;
    const targetExam = remoteProfileData ? remoteProfileData.target_exam : activeSettings.targetExam;
    const discordSpecialTag = remoteProfileData ? remoteProfileData.discord_tag : activeSettings.discordSpecialTag;
    let isOnlineMock = activeSettings.mockIsOnline;
    if (timerState === 'online') isOnlineMock = true;

    const displayName = userName || 'Student';

    return (
        <div className="profile-card">
            {/* Banner */}
            <div
                className="profile-card-banner"
                style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
            >
                {bannerUrl && <img src={bannerUrl} alt="" />}
                {onEditClick && (
                    <button className="profile-card-edit-btn" onClick={onEditClick}>
                        <Pencil size={12} />
                        Edit
                    </button>
                )}
            </div>

            {/* Avatar */}
            <div className="profile-card-avatar-wrap">
                <div className="profile-card-avatar">
                    <UserAvatar
                        name={displayName}
                        size={78}
                        customImageUrl={customAvatarUrl || undefined}
                        accentColor={accentColor}
                    />
                </div>
                {/* Status Badge */}
                <div className="profile-card-status-badge-container">
                    {timerState === 'running' ? (
                        <span className="profile-card-status-badge studying">
                            <span className="profile-card-status-dot" />
                            Studying
                        </span>
                    ) : timerState === 'paused' ? (
                        <span className="profile-card-status-badge idle">
                            <span className="profile-card-status-dot" />
                            Idle
                        </span>
                    ) : timerState === 'online' || isOnlineMock ? (
                        <span className="profile-card-status-badge online">
                            <Wifi size={12} className="profile-card-status-wifi" />
                            Online
                        </span>
                    ) : (
                        <span className="profile-card-status-badge offline">
                            <span className="profile-card-status-dot" />
                            Last seen {activeSettings.mockLastSeenText || 'recently'}
                        </span>
                    )}
                </div>
            </div>

            {/* Identity */}
            <div className={`profile-card-identity ${previewMode ? 'preview-mode' : ''}`}>
                <div className="profile-card-name-row">
                    <h2 className="profile-card-name">{displayName}</h2>
                    {typeof discordSpecialTag === 'string' && discordSpecialTag.trim() !== '' && (
                        <span className="profile-card-special-tag">
                            <span className="profile-card-special-tag-inner">
                                <span className="tag-text">{discordSpecialTag}</span>
                            </span>
                            <span className="profile-card-special-tag-tooltip">
                                <svg
                                    viewBox="0 0 127.14 96.36"
                                    className="discord-icon"
                                    aria-hidden="true"
                                    fill="currentColor"
                                >
                                    <path 
                                        d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C2.85,32.22-1.72,55.79,1,79.08A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5A52.26,52.26,0,0,0,30.88,78,74.76,74.76,0,0,0,96,78a52.26,52.26,0,0,0,2.78,2.5,68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,30.9-17.28C129.56,50.7,124.57,27.35,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" 
                                    />
                                </svg>
                                <span>Join the Discord server to get a custom tag</span>
                            </span>
                        </span>
                    )}
                </div>
                {customStatus && (
                    <p className="profile-card-status">{customStatus}</p>
                )}
                <div className="profile-card-meta-row">
                    {gradeStatus && (
                        <span className="profile-card-meta-pill">
                            <GraduationCap size={14} />
                            {gradeStatus}
                        </span>
                    )}
                    {targetExam && (
                        <span className="profile-card-meta-pill">
                            <Target size={14} />
                            {targetExam}
                        </span>
                    )}
                </div>

                <div className="profile-card-compact-metrics">
                    <div className="compact-metric" data-tooltip="Studied Today">
                        <Clock size={10} />
                        <span>{formatSmartDuration(todayStudyTimeSec)}</span>
                    </div>
                    <div className="compact-metric" data-tooltip="Questions Today">
                        <span>{todayQuestions}</span>
                        <span className="compact-metric-lbl">Qs</span>
                    </div>
                    <div className="compact-metric" data-tooltip="Current Streak">
                        <Flame size={10} className="compact-metric-flame" />
                        <span>{streak}d</span>
                    </div>
                    <div className="compact-metric-divider" />
                    <div className="compact-heatmap">
                        {heatmapData.map((day, i) => (
                            <div key={i} className="compact-heatmap-col">
                                <div
                                    className={`compact-heatmap-box level-${day.level}`}
                                    data-tooltip={`${day.dayLabel}: ${formatSmartDuration(day.seconds)}`}
                                />
                                <span className="compact-heatmap-day-label">{day.dayLabel.charAt(0)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {activeSettings.showTasks !== false && (
                <>
                    <div className="profile-card-divider" />

                    {/* Today's Tasks — the "bio" of the card */}
                    <div className="profile-card-tasks-section">
                        <p className="profile-card-section-label">Today's agenda</p>
                        {todayTasks.length > 0 ? (
                            <div className="profile-card-tasks-list">
                                {todayTasks.map((task) => {
                                    const isLinked = task.id === activeTaskId;
                                    return (
                                        <div
                                            key={task.id}
                                            className={`profile-card-task-item ${task.completed ? 'completed' : ''} ${isLinked || (task as any).isActive ? 'linked-task' : ''}`}
                                        >
                                            <span
                                                className={`profile-card-task-dot ${task.subject || 'custom'} ${isLinked || (task as any).isActive ? 'pulsate' : ''}`}
                                            />
                                            <span className="profile-card-task-title">{task.title}</span>
                                            <span className="profile-card-task-time">
                                                {formatTime12Hour(task.time)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="profile-card-tasks-empty">No tasks for today</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
