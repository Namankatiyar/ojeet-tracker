import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useTheme } from '../../../core/context/ThemeContext';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { UserAvatar } from '../../../shared/components/ui/Avatar';
import { GoogleSignInButton } from '../../../shared/components/ui/GoogleSignInButton';
import {
  StudySession,
  PlannerTask,
  ProgressCardSettings,
  RemoteProfile,
  LiveActivity,
} from '../../../shared/types';
import { getLogicalTodayStr } from '../../../shared/utils/date';
import {
  Pencil,
  GraduationCap,
  Target,
  Clock,
  Flame,
  Wifi,
  Plus,
  EyeOff,
  UserMinus,
} from 'lucide-react';

interface UserProfileCardProps {
  onEditClick?: () => void;
  previewSettings?: ProgressCardSettings;
  previewMode?: boolean;
  remoteProfileData?: RemoteProfile & {
    live_activity?: LiveActivity | null;
    peer_visibility_settings?: { show_agenda: boolean } | null;
  };
  onDisconnectClick?: () => void;
}

/* ── Helpers ── */
const getSessionDate = (s: StudySession): string => s.localDate ?? s.startTime.slice(0, 10);

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

const formatLastSeen = (updatedAtStr?: string): string => {
  if (!updatedAtStr) return 'recently';
  try {
    const parsedDate = new Date(updatedAtStr);
    const timeMs = parsedDate.getTime();
    if (isNaN(timeMs)) return 'recently';

    const diffMs = Date.now() - timeMs;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'recently';
  }
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function UserProfileCard({
  onEditClick,
  previewSettings,
  previewMode = false,
  remoteProfileData,
  onDisconnectClick,
}: UserProfileCardProps) {
  const { progressCardSettings, studySessions, plannerTasks, dailyQuestionLogs, dailyResetHour } =
    useUserProgress();

  const { user, signInWithGoogle } = useRemoteAuth();
  const { accentColor } = useTheme();
  const navigate = useNavigate();
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  const isSignedOutCurrentUser = !remoteProfileData && !user && !previewMode;

  const handleGoogleSignIn = async () => {
    setIsAuthBusy(true);
    const { error } = await signInWithGoogle();
    if (error) {
      console.error('Google sign in error:', error);
      setIsAuthBusy(false);
    }
  };

  const todayStr = getLogicalTodayStr(dailyResetHour);

  // PERF-005: Read all timer-related localStorage keys in one place (initializer + event handler).
  // This eliminates synchronous localStorage.getItem calls from the useMemo render path.
  const readLocalTimerState = (): { engineState: string; taskType?: string; taskId?: string } | null => {
    try {
      const raw = localStorage.getItem('jee-timer-engine');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const rawType = localStorage.getItem('studyClock_taskType');
      const rawTaskId = localStorage.getItem('studyClock_selectedTaskId');
      return {
        engineState: parsed.engineState,
        taskType: rawType ? JSON.parse(rawType) : undefined,
        taskId: rawTaskId ? JSON.parse(rawTaskId) : undefined,
      };
    } catch {
      return null;
    }
  };

  const [localTimerState, setLocalTimerState] = useState(readLocalTimerState);

  useEffect(() => {
    if (remoteProfileData) return;

    const handleTimerChange = () => {
      setLocalTimerState(readLocalTimerState());
    };

    window.addEventListener('jee-timer-state-change', handleTimerChange);
    return () => window.removeEventListener('jee-timer-state-change', handleTimerChange);
  }, [remoteProfileData]);

  /* ── Live Indicator: Read timer engine state from localStorage ── */
  const timerState = useMemo<'running' | 'paused' | 'online' | 'offline'>(() => {
    if (isSignedOutCurrentUser) return 'offline';
    if (remoteProfileData) {
      const act = remoteProfileData.live_activity;
      if (!act) return 'offline';
      const actTime = new Date(act.updated_at).getTime();
      const isFresh = !isNaN(actTime) && Date.now() - actTime < 300000;
      if (act.is_active && isFresh) return 'running';
      if (isFresh) {
        // If they have an active task/subject, it means the timer is paused (Idle)
        const hasSession = act.subject || act.chapter_name || act.started_at;
        return hasSession ? 'paused' : 'online';
      }
      return 'offline';
    }

    if (!localTimerState) return 'online';
    if (localTimerState.engineState === 'running') return 'running';
    if (localTimerState.engineState === 'paused') return 'paused';
    return 'online';
  }, [remoteProfileData, localTimerState, isSignedOutCurrentUser]);

  /* ── Today's sessions → total study time ── */
  const todayStudyTimeSec = useMemo(() => {
    if (isSignedOutCurrentUser) return 0;
    if (remoteProfileData) return remoteProfileData.today_study_seconds || 0;
    return studySessions
      .filter((s) => getSessionDate(s) === todayStr)
      .reduce((acc, s) => acc + s.duration, 0);
  }, [remoteProfileData, studySessions, todayStr, isSignedOutCurrentUser]);

  /* ── Today's questions ── */
  const todayQuestions = isSignedOutCurrentUser
    ? 0
    : remoteProfileData
      ? remoteProfileData.today_questions || 0
      : Math.max(0, dailyQuestionLogs[todayStr] || 0);

  /* ── Study streak ── */
  const streak = useMemo(() => {
    if (isSignedOutCurrentUser) return 0;
    if (remoteProfileData) return remoteProfileData.streak_count || 0;

    const getDailyStudyTime = (dateStr: string) => {
      return studySessions
        .filter((s) => getSessionDate(s) === dateStr)
        .reduce((acc, s) => acc + s.duration, 0);
    };

    const checkDate = new Date();
    const todayStr = checkDate.toLocaleDateString('en-CA');
    const yesterday = new Date(checkDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    const hasToday = getDailyStudyTime(todayStr) >= 60;
    const hasYesterday = getDailyStudyTime(yesterdayStr) >= 60;

    if (!hasToday && !hasYesterday) {
      return 0;
    }

    const startCheckDate = hasToday ? checkDate : yesterday;
    let count = 0;
    while (true) {
      const dateStr = startCheckDate.toLocaleDateString('en-CA');
      if (getDailyStudyTime(dateStr) >= 60) {
        count++;
        startCheckDate.setDate(startCheckDate.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [remoteProfileData, studySessions, isSignedOutCurrentUser]);

  /* ── Active Task ID from Study Clock — pure derivation, zero IO ── */
  const activeTaskId = useMemo<string | null>(() => {
    if (remoteProfileData || !localTimerState) return null;
    const { engineState, taskType, taskId } = localTimerState;
    if (engineState !== 'running' && engineState !== 'paused') return null;
    return taskType === 'task' && taskId ? taskId : null;
  }, [remoteProfileData, localTimerState]);

  /* ── Today's tasks ── */
  const todayTasks = useMemo<PlannerTask[]>(() => {
    let tasks: PlannerTask[] = [];
    if (remoteProfileData) {
      if (remoteProfileData.peer_visibility_settings?.show_agenda === false) return [];
      tasks = remoteProfileData.todays_tasks || [];
    } else {
      tasks = plannerTasks.filter((t) => t.date === todayStr);
    }

    // Sort comparator:
    // 1. Move pulsing task to the top.
    // A task is pulsing if timerState === 'running' AND it is active.
    return [...tasks].sort((a, b) => {
      const aActive = remoteProfileData
        ? (timerState === 'running' || timerState === 'paused') &&
          remoteProfileData.live_activity?.chapter_name === a.title &&
          remoteProfileData.live_activity?.subject === a.subject
        : a.id === activeTaskId;
      const bActive = remoteProfileData
        ? (timerState === 'running' || timerState === 'paused') &&
          remoteProfileData.live_activity?.chapter_name === b.title &&
          remoteProfileData.live_activity?.subject === b.subject
        : b.id === activeTaskId;

      const aPulsing = aActive && timerState === 'running';
      const bPulsing = bActive && timerState === 'running';

      if (aPulsing && !bPulsing) return -1;
      if (!aPulsing && bPulsing) return 1;

      // Fallback to sorting by time
      return a.time.localeCompare(b.time);
    });
  }, [remoteProfileData, plannerTasks, todayStr, activeTaskId, timerState]);

  /* ── 7-day momentum heatmap ── */
  const heatmapData = useMemo(() => {
    if (isSignedOutCurrentUser) {
      return DAY_LABELS.map((dayLabel) => ({ dayLabel, seconds: 0, level: 0 }));
    }
    if (remoteProfileData) return remoteProfileData.momentum_heatmap || [];
    const result: { dayLabel: string; seconds: number; level: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const dayOfWeek = d.getDay();
      const seconds = studySessions
        .filter((s) => getSessionDate(s) === dateStr)
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
  }, [remoteProfileData, studySessions, isSignedOutCurrentUser]);

  const activeSettings = previewSettings || progressCardSettings;

  const googleName = !remoteProfileData
    ? user?.user_metadata?.full_name || user?.user_metadata?.name
    : undefined;
  const googleAvatar = !remoteProfileData
    ? user?.user_metadata?.avatar_url || user?.user_metadata?.picture
    : undefined;

  const userName = isSignedOutCurrentUser
    ? ''
    : remoteProfileData?.display_name ||
      remoteProfileData?.username ||
      activeSettings.userName ||
      googleName;
  const customAvatarUrl = isSignedOutCurrentUser
    ? ''
    : remoteProfileData
      ? remoteProfileData.avatar_url
      : activeSettings.customAvatarUrl || googleAvatar;
  const bannerUrl = isSignedOutCurrentUser
    ? ''
    : remoteProfileData
      ? remoteProfileData.banner_url
      : activeSettings.bannerUrl;
  const customStatus = isSignedOutCurrentUser
    ? ''
    : remoteProfileData
      ? remoteProfileData.custom_status
      : activeSettings.customStatus;
  const gradeStatus = isSignedOutCurrentUser
    ? ''
    : remoteProfileData
      ? remoteProfileData.grade_status
      : activeSettings.gradeStatus;
  const targetExam = isSignedOutCurrentUser
    ? ''
    : remoteProfileData
      ? remoteProfileData.target_exam
      : activeSettings.targetExam;
  const discordSpecialTag = isSignedOutCurrentUser
    ? ''
    : remoteProfileData
      ? remoteProfileData.discord_tag
      : activeSettings.discordSpecialTag;
  const displayName = userName || 'Student';

  const showTasksSection = isSignedOutCurrentUser
    ? false
    : remoteProfileData
      ? remoteProfileData.peer_visibility_settings?.show_agenda !== false
      : activeSettings.showTasks !== false;

  return (
    <div className="profile-card">
      {/* Banner */}
      <div
        className="profile-card-banner"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
      >
        {bannerUrl && <img src={bannerUrl} alt="" />}
        {onEditClick && !isSignedOutCurrentUser && (
          <button className="profile-card-edit-btn" onClick={onEditClick}>
            <Pencil size={12} />
            Edit
          </button>
        )}
        {remoteProfileData && onDisconnectClick && (
          <button
            className="profile-card-disconnect-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDisconnectClick();
            }}
            title="Disconnect Friend"
          >
            <UserMinus size={14} />
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
          ) : timerState === 'online' ? (
            <span className="profile-card-status-badge online">
              <Wifi size={12} className="profile-card-status-wifi" />
              Online
            </span>
          ) : (
            <span className="profile-card-status-badge offline">
              <span className="profile-card-status-dot" />
              Last seen{' '}
              {remoteProfileData?.live_activity?.updated_at || remoteProfileData?.updated_at
                ? formatLastSeen(
                    remoteProfileData?.live_activity?.updated_at || remoteProfileData?.updated_at
                  )
                : 'recently'}
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
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C2.85,32.22-1.72,55.79,1,79.08A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5A52.26,52.26,0,0,0,30.88,78,74.76,74.76,0,0,0,96,78a52.26,52.26,0,0,0,2.78,2.5,68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,30.9-17.28C129.56,50.7,124.57,27.35,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                </svg>
                <span>Join the Discord server to get a custom tag</span>
              </span>
            </span>
          )}
        </div>
        {customStatus && <p className="profile-card-status">{customStatus}</p>}
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

      {!previewMode &&
        (showTasksSection ? (
          <>
            <div className="profile-card-divider" />

            {/* Today's Tasks — the "bio" of the card */}
            <div className="profile-card-tasks-section">
              <p className="profile-card-section-label">Today's agenda</p>
              {todayTasks.length > 0 ? (
                <div className="profile-card-tasks-list">
                  {todayTasks.map((task) => {
                    const isTaskActive = remoteProfileData
                      ? (timerState === 'running' || timerState === 'paused') &&
                        remoteProfileData.live_activity?.chapter_name === task.title &&
                        remoteProfileData.live_activity?.subject === task.subject
                      : task.id === activeTaskId;
                    const shouldPulse = isTaskActive && timerState === 'running';

                    return (
                      <div
                        key={task.id}
                        className={`profile-card-task-item ${task.completed ? 'completed' : ''} ${isTaskActive ? 'linked-task' : ''}`}
                      >
                        <span
                          className={`profile-card-task-dot ${task.subject || 'custom'} ${shouldPulse ? 'pulsate' : ''}`}
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
                <div className="profile-card-tasks-empty">
                  <span>No tasks for today</span>
                  {!remoteProfileData && !previewMode && (
                    <button
                      className="profile-card-add-task-btn"
                      onClick={() => navigate('/jee-study-planner')}
                    >
                      <Plus size={12} />
                      Add task
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="profile-card-divider" />
            <div className="profile-card-tasks-section private-agenda">
              <p className="profile-card-section-label">Today's agenda</p>
              <div className="profile-card-private-notice">
                <EyeOff size={16} className="private-notice-icon" />
                <span>
                  {remoteProfileData
                    ? 'Agenda is hidden by user privacy settings'
                    : 'Agenda is hidden (change this in Edit profile)'}
                </span>
              </div>
            </div>
          </>
        ))}

      {isSignedOutCurrentUser && (
        <div className="profile-card-signedout-overlay">
          <div className="signedout-overlay-content">
            <span className="signedout-overlay-title">
              Sign in to customize your profile card & connect with friends
            </span>
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              disabled={isAuthBusy}
              className="signedout-overlay-btn"
            />
          </div>
        </div>
      )}
    </div>
  );
}
