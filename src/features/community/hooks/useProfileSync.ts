import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { supabase } from '../../../shared/lib/supabase';
import { StudySession } from '../../../shared/types';
import { calculateBackoffWithJitter, isOnline } from '../../../shared/utils/backoff';
import { getLogicalTodayStr, getLogicalDate } from '../../../shared/utils/date';
import { getDisplayName, getAvatarUrl } from '../../../shared/utils/auth';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PROFILE_SNAPSHOT_KEY_PREFIX = 'ojeet-remote-sync-profile-snapshot-';
const PROFILE_AGENDA_KEY_PREFIX = 'ojeet-remote-sync-profile-agenda-';

const getProfileSnapshotKey = (userId: string) => `${PROFILE_SNAPSHOT_KEY_PREFIX}${userId}`;
const getProfileAgendaKey = (userId: string) => `${PROFILE_AGENDA_KEY_PREFIX}${userId}`;

const clearPersistedProfileSyncKeys = (userId: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getProfileSnapshotKey(userId));
    localStorage.removeItem(getProfileAgendaKey(userId));
  } catch {
    /* ignore */
  }
};

// Guard: never persist base64 data URIs to profiles.avatar_url/banner_url.
// Only internet image URLs are allowed.
const sanitizeImageUrl = (value?: string): string | null => {
  if (!value || /^data:/i.test(value)) return null;
  return value;
};

const isProfileAuthError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: unknown; code?: unknown; message?: unknown };
  if (e.status === 401) return true;
  const code = typeof e.code === 'string' ? e.code : '';
  if (code === 'PGRST301' || code === 'PGRST302' || code === 'PGRST303' || code === '42501') {
    return true;
  }
  const message = typeof e.message === 'string' ? e.message : '';
  return /jwt expired|invalid jwt|permission denied for table|unauthorized/i.test(message);
};

const getTimerStructuralSignature = (): string => {
  try {
    const rawTimer = localStorage.getItem('jee-timer-engine');
    let engineState = '';
    let phase = '';
    let mode = '';
    if (rawTimer) {
      const parsed = JSON.parse(rawTimer);
      engineState = parsed.engineState ?? '';
      phase = parsed.phase ?? '';
      mode = parsed.mode ?? '';
    }
    const taskType = localStorage.getItem('studyClock_taskType') ?? '';
    const selectedTaskId = localStorage.getItem('studyClock_selectedTaskId') ?? '';
    return `${engineState}|${phase}|${mode}|${taskType}|${selectedTaskId}`;
  } catch {
    return '';
  }
};

const getSessionDate = (s: StudySession): string => s.localDate ?? s.startTime.slice(0, 10);

export function useProfileSync() {
  const auth = useRemoteAuth() as ReturnType<typeof useRemoteAuth> & {
    authEventEpoch?: number;
  };
  const { user, isConfigured, isLoading } = auth;
  const authEventEpoch = auth.authEventEpoch ?? 0;
  // Key effects off the stable id: auth events produce new user objects.
  const userId = user?.id ?? null;
  const userRef = useRef(user);
  userRef.current = user;
  const navigate = useNavigate();
  const {
    progressCardSettings,
    setProgressCardSettings,
    studySessions,
    plannerTasks,
    dailyQuestionLogs,
    dailyResetHour,
  } = useUserProgress();
  const { subjectData } = useSubjectData();

  const subjectDataRef = useRef(subjectData);
  const plannerTasksRef = useRef(plannerTasks);
  const progressCardSettingsRef = useRef(progressCardSettings);
  const isFetchingProfileRef = useRef(false);
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);
  const lastSnapshotRef = useRef<string | null>(null);
  const lastShowAgendaRef = useRef<boolean | null>(null);
  const lastFailedSnapshotRef = useRef<string | null>(null);
  const lastFailedShowAgendaRef = useRef<boolean | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryAttemptRef = useRef<number>(0);
  // While the backend is failing, local edits must not bypass the retry backoff.
  const pausedUntilRef = useRef<number>(0);
  const authPausedRef = useRef<boolean>(false);
  const isDirtyWhileHiddenRef = useRef<boolean>(false);
  const pendingExecuteSyncRef = useRef<(() => void) | null>(null);
  const [timerUpdateTrigger, setTimerUpdateTrigger] = useState(0);
  const [authRecoveryTrigger, setAuthRecoveryTrigger] = useState(0);

  useEffect(() => {
    subjectDataRef.current = subjectData;
  }, [subjectData]);
  useEffect(() => {
    plannerTasksRef.current = plannerTasks;
  }, [plannerTasks]);
  useEffect(() => {
    progressCardSettingsRef.current = progressCardSettings;
  }, [progressCardSettings]);

  // Handle logout cleanup & userId hydration
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;

    // Logout transition: logged-in user -> null (once auth loading finishes)
    if (prevUserId && !userId && !isLoading) {
      setIsInitialFetchDone(false);
      lastSnapshotRef.current = null;
      lastShowAgendaRef.current = null;
      lastFailedSnapshotRef.current = null;
      lastFailedShowAgendaRef.current = null;
      retryAttemptRef.current = 0;
      pausedUntilRef.current = 0;
      authPausedRef.current = false;
      isDirtyWhileHiddenRef.current = false;
      pendingExecuteSyncRef.current = null;
      clearPersistedProfileSyncKeys(prevUserId);
      setProgressCardSettings((prev) => ({
        ...prev,
        inviteCode: '',
        discordSpecialTag: '',
        userName: '',
        customAvatarUrl: '',
        bannerUrl: '',
        customStatus: '',
      }));
      prevUserIdRef.current = null;
      return;
    }

    // Switched directly from one userId to another userId
    if (prevUserId && userId && prevUserId !== userId) {
      setIsInitialFetchDone(false);
      lastSnapshotRef.current = null;
      lastShowAgendaRef.current = null;
      lastFailedSnapshotRef.current = null;
      lastFailedShowAgendaRef.current = null;
      retryAttemptRef.current = 0;
      pausedUntilRef.current = 0;
      authPausedRef.current = false;
      isDirtyWhileHiddenRef.current = false;
      pendingExecuteSyncRef.current = null;
      clearPersistedProfileSyncKeys(prevUserId);
    }

    // Hydrate persisted snapshot & agenda flag when userId initializes
    if (userId && prevUserId !== userId) {
      retryAttemptRef.current = 0;
      pausedUntilRef.current = 0;
      authPausedRef.current = false;
      isDirtyWhileHiddenRef.current = false;
      lastFailedSnapshotRef.current = null;
      lastFailedShowAgendaRef.current = null;
      try {
        const rawSnapshot = localStorage.getItem(getProfileSnapshotKey(userId));
        if (rawSnapshot) {
          const parsed = JSON.parse(rawSnapshot);
          if (parsed && typeof parsed === 'object') {
            lastSnapshotRef.current = rawSnapshot;
          }
        }
        const rawAgenda = localStorage.getItem(getProfileAgendaKey(userId));
        if (rawAgenda === 'true') {
          lastShowAgendaRef.current = true;
        } else if (rawAgenda === 'false') {
          lastShowAgendaRef.current = false;
        }
      } catch {
        /* ignore corrupt storage */
      }
      prevUserIdRef.current = userId;
    }
  }, [userId, isLoading, setProgressCardSettings]);

  // Recover from auth pause when TOKEN_REFRESHED or SIGNED_IN increments authEventEpoch
  const prevAuthEventEpochRef = useRef<number>(authEventEpoch);
  useEffect(() => {
    if (authEventEpoch === prevAuthEventEpochRef.current) return;
    prevAuthEventEpochRef.current = authEventEpoch;
    if (!authPausedRef.current) return;
    authPausedRef.current = false;
    retryAttemptRef.current = 0;
    pausedUntilRef.current = 0;
    setAuthRecoveryTrigger((n) => n + 1);
  }, [authEventEpoch]);

  // Flush deferred hidden-tab sync when tab becomes visible
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isDirtyWhileHiddenRef.current) {
        isDirtyWhileHiddenRef.current = false;
        pendingExecuteSyncRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Post-login check for pending invite code
  useEffect(() => {
    const client = supabase;
    if (!userId || !isConfigured || !client) return;

    const handlePendingInvite = async () => {
      const pendingCode = localStorage.getItem('pending_invite_code');
      if (!pendingCode) return;

      try {
        const { error } = await client.rpc('add_friend_by_code', { friend_code: pendingCode });
        if (error) {
          console.warn('Could not auto-add friend from pending invite:', error.message);
          let msg = error.message || 'Failed to connect. Please check the code.';
          if (
            msg.toLowerCase().includes('cannot add yourself') ||
            msg.toLowerCase().includes('self')
          ) {
            msg = 'You cannot add yourself as a friend.';
          } else if (
            msg.toLowerCase().includes('not found') ||
            msg.toLowerCase().includes('invalid code') ||
            msg.toLowerCase().includes('no profile')
          ) {
            msg = 'Invalid invite code.';
          } else if (
            msg.toLowerCase().includes('already') ||
            msg.toLowerCase().includes('duplicate')
          ) {
            msg = 'You are already friends with this user.';
          }
          sessionStorage.setItem('invite_error_message', msg);
        } else {
          console.log('Successfully auto-added friend from pending invite code:', pendingCode);
          sessionStorage.setItem('invite_success_celebrate', '1');
          sessionStorage.setItem(
            'invite_success_message',
            'Successfully connected with your friend!'
          );
        }
      } catch (err: any) {
        console.error('Failed to process pending invite:', err);
        sessionStorage.setItem(
          'invite_error_message',
          'Failed to connect from pending invitation.'
        );
      } finally {
        localStorage.removeItem('pending_invite_code');
        navigate('/community');
      }
    };

    handlePendingInvite();
  }, [userId, isConfigured, navigate]);

  // 0. Fetch invite_code, discord_tag, display_name, and avatar_url from backend on authentication
  useEffect(() => {
    const client = supabase;
    const currentUser = userRef.current;
    if (!userId || !currentUser || !isConfigured || !client) {
      setIsInitialFetchDone(false);
      return;
    }

    let cancelled = false;

    const fetchProfileDetails = async () => {
      isFetchingProfileRef.current = true;
      try {
        const { data, error } = await client
          .from('profiles')
          .select(
            'invite_code, discord_tag, display_name, avatar_url, banner_url, custom_status, grade_status, target_exam'
          )
          .eq('id', currentUser.id)
          .maybeSingle();

        if (cancelled) return;

        const resolvedName = getDisplayName(currentUser);
        const resolvedAvatar = getAvatarUrl(currentUser) || '';

        if (!error && data) {
          // Update persisted static metadata fields so DB-fetched edits aren't echoed back as an upsert.
          if (lastSnapshotRef.current) {
            try {
              const parsedSnapshot = JSON.parse(lastSnapshotRef.current);
              if (parsedSnapshot && typeof parsedSnapshot === 'object') {
                if (data.display_name !== undefined) {
                  parsedSnapshot.display_name = data.display_name || null;
                }
                if (data.avatar_url !== undefined) {
                  parsedSnapshot.avatar_url = sanitizeImageUrl(data.avatar_url ?? undefined);
                }
                if (data.banner_url !== undefined) {
                  parsedSnapshot.banner_url = sanitizeImageUrl(data.banner_url ?? undefined);
                }
                if (data.custom_status !== undefined) {
                  parsedSnapshot.custom_status = data.custom_status || null;
                }
                if (data.grade_status !== undefined && data.grade_status !== null) {
                  parsedSnapshot.grade_status = data.grade_status || null;
                }
                if (data.target_exam !== undefined && data.target_exam !== null) {
                  parsedSnapshot.target_exam = data.target_exam || null;
                }
                const updatedSnapshotStr = JSON.stringify(parsedSnapshot);
                lastSnapshotRef.current = updatedSnapshotStr;
                try {
                  localStorage.setItem(getProfileSnapshotKey(currentUser.id), updatedSnapshotStr);
                } catch {
                  /* ignore quota errors */
                }
              }
            } catch {
              /* ignore corrupt snapshot */
            }
          }

          setProgressCardSettings((prev) => {
            const updates: Partial<typeof prev> = {};
            if (data.invite_code !== undefined && data.invite_code !== null && prev.inviteCode !== data.invite_code) {
              updates.inviteCode = data.invite_code;
            }
            if (data.discord_tag !== undefined && data.discord_tag !== null && prev.discordSpecialTag !== data.discord_tag) {
              updates.discordSpecialTag = data.discord_tag;
            }

            // Database values take priority over localStorage
            if (data.display_name !== undefined) {
              const nextName = data.display_name !== null ? data.display_name : '';
              if (prev.userName !== nextName) updates.userName = nextName;
            } else if (!prev.userName && resolvedName) {
              updates.userName = resolvedName;
            }

            if (data.avatar_url !== undefined) {
              const nextAvatar = data.avatar_url !== null ? data.avatar_url : '';
              if (prev.customAvatarUrl !== nextAvatar) updates.customAvatarUrl = nextAvatar;
            } else if (!prev.customAvatarUrl && resolvedAvatar) {
              updates.customAvatarUrl = resolvedAvatar;
            }

            if (data.banner_url !== undefined) {
              const nextBanner = data.banner_url !== null ? data.banner_url : '';
              if (prev.bannerUrl !== nextBanner) updates.bannerUrl = nextBanner;
            }
            if (data.custom_status !== undefined) {
              const nextStatus = data.custom_status !== null ? data.custom_status : '';
              if (prev.customStatus !== nextStatus) updates.customStatus = nextStatus;
            }
            // Prefill grade status and target exam if missing locally or if they are the default values
            if (data.grade_status !== undefined && data.grade_status !== null) {
              if (prev.gradeStatus !== data.grade_status) updates.gradeStatus = data.grade_status;
            }
            if (data.target_exam !== undefined && data.target_exam !== null) {
              if (prev.targetExam !== data.target_exam) updates.targetExam = data.target_exam;
            }

            return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
          });
        } else if (!error && !data) {
          // Profile row is missing. Insert default profile row immediately to satisfy foreign key constraints
          const initialProfile = {
            id: currentUser.id,
            display_name: progressCardSettingsRef.current.userName || resolvedName || 'Student',
            avatar_url: progressCardSettingsRef.current.customAvatarUrl || resolvedAvatar || null,
            grade_status: progressCardSettingsRef.current.gradeStatus || 'Class 12',
            target_exam: progressCardSettingsRef.current.targetExam || 'JEE 2026',
          };
          const { error: insertErr } = await client.from('profiles').insert(initialProfile);
          if (cancelled) return;
          if (insertErr) {
            console.error('Failed to create initial profile row:', insertErr);
          } else {
            console.log('Successfully created initial profile row for user:', currentUser.id);
            setProgressCardSettings((prev) => {
              const updates: Partial<typeof prev> = {};
              if (!prev.userName && resolvedName) {
                updates.userName = resolvedName;
              }
              if (!prev.customAvatarUrl && resolvedAvatar) {
                updates.customAvatarUrl = resolvedAvatar;
              }
              return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
            });
          }
        } else {
          // Fallback to auth metadata if error occurs
          setProgressCardSettings((prev) => {
            const updates: Partial<typeof prev> = {};
            if (!prev.userName && resolvedName) {
              updates.userName = resolvedName;
            }
            if (!prev.customAvatarUrl && resolvedAvatar) {
              updates.customAvatarUrl = resolvedAvatar;
            }
            return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
          });
        }
      } catch (err) {
        console.warn('Failed to fetch profile details', err);
      } finally {
        isFetchingProfileRef.current = false;
        if (!cancelled) {
          setIsInitialFetchDone(true);
        }
      }
    };

    fetchProfileDetails();
    return () => {
      cancelled = true;
    };
  }, [userId, isConfigured, setProgressCardSettings]);

  // PERF-008: The live activity heartbeat has been extracted into useActivityHeartbeat.ts
  // and is now mounted only inside CommunityPage, so it doesn't fire on every page.

  const studySessionsRef = useRef(studySessions);
  useEffect(() => {
    studySessionsRef.current = studySessions;
  }, [studySessions]);

  // Timer sync listener (compares lightweight structural signature so 1s ticks in other tabs don't starve debounce)
  useEffect(() => {
    let lastTimerSignature = getTimerStructuralSignature();
    const handleTimerChange = () => {
      const nextSignature = getTimerStructuralSignature();
      if (nextSignature !== lastTimerSignature) {
        lastTimerSignature = nextSignature;
        setTimerUpdateTrigger((t) => t + 1);
      }
    };
    window.addEventListener('jee-timer-state-change', handleTimerChange);
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'jee-timer-engine' ||
        e.key === 'studyClock_taskType' ||
        e.key === 'studyClock_selectedTaskId'
      ) {
        handleTimerChange();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('jee-timer-state-change', handleTimerChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // 2. Debounced Profile Snapshot Sync
  useEffect(() => {
    const client = supabase;
    if (!userId || !isConfigured || !client) return;
    if (!isInitialFetchDone || isFetchingProfileRef.current) return;

    const todayStr = getLogicalTodayStr(dailyResetHour);
    const currentStudySessions = studySessionsRef.current;

    const todayStudyTimeSec = currentStudySessions
      .filter((s) => getSessionDate(s) === todayStr)
      .reduce((acc, s) => acc + s.duration, 0);

    const todayQuestions = Math.max(0, dailyQuestionLogs[todayStr] || 0);

    let activeTaskId: string | null = null;
    try {
      const rawTimer = localStorage.getItem('jee-timer-engine');
      if (rawTimer) {
        const timerState = JSON.parse(rawTimer);
        if (timerState.engineState === 'running' || timerState.engineState === 'paused') {
          const rawType = localStorage.getItem('studyClock_taskType');
          const rawTaskId = localStorage.getItem('studyClock_selectedTaskId');
          if (rawType && rawTaskId) {
            const taskType = JSON.parse(rawType);
            const taskId = JSON.parse(rawTaskId);
            if (taskType === 'task') activeTaskId = taskId;
          }
        }
      }
    } catch {
      /* ignore */
    }

    const todayTasks =
      progressCardSettings.showTasks !== false
        ? plannerTasks
            .filter((t) => t.date === todayStr)
            .map((t) => ({
              id: t.id,
              title: t.title,
              time: t.time,
              completed: t.completed,
              subject: t.subject,
              isActive: t.id === activeTaskId,
            }))
        : [];

    const heatmapData = [];
    for (let i = 6; i >= 0; i--) {
      const d = getLogicalDate(dailyResetHour, new Date());
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();
      const seconds = currentStudySessions
        .filter((s) => getSessionDate(s) === dateStr)
        .reduce((acc, s) => acc + s.duration, 0);
      const hours = seconds / 3600;
      let level = 0;
      if (hours >= 5) level = 4;
      else if (hours >= 3) level = 3;
      else if (hours >= 1) level = 2;
      else if (hours > 0) level = 1;
      heatmapData.push({ dayLabel: DAY_LABELS[dayOfWeek], level, seconds });
    }

    // Compute daily study time to calculate the streak count
    const getDailyStudyTime = (dateStr: string) => {
      return currentStudySessions
        .filter((s) => getSessionDate(s) === dateStr)
        .reduce((acc, s) => acc + s.duration, 0);
    };

    const checkDate = getLogicalDate(dailyResetHour, new Date());
    const todayStrLocal = getLogicalTodayStr(dailyResetHour);
    const yesterday = new Date(checkDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const hasToday = getDailyStudyTime(todayStrLocal) >= 60;
    const hasYesterday = getDailyStudyTime(yesterdayStr) >= 60;

    let calculatedStreak = 0;
    if (hasToday || hasYesterday) {
      const startCheckDate = hasToday ? checkDate : yesterday;
      while (true) {
        const dateStr = `${startCheckDate.getFullYear()}-${String(startCheckDate.getMonth() + 1).padStart(2, '0')}-${String(startCheckDate.getDate()).padStart(2, '0')}`;
        if (getDailyStudyTime(dateStr) >= 60) {
          calculatedStreak++;
          startCheckDate.setDate(startCheckDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // NOTE: weekly_hours is intentionally NOT written here. It is owned solely by
    // the DB trigger `sync_weekly_hours_to_profile` (fires on user_study_aggregate
    // upsert) to avoid a dual-writer conflict where the client's rolling-7-day value
    // and the trigger's ISO-week value overwrite each other unpredictably.
    const snapshot = {
      grade_status: progressCardSettings.gradeStatus || null,
      target_exam: progressCardSettings.targetExam || null,
      display_name: progressCardSettings.userName || null,
      avatar_url: sanitizeImageUrl(progressCardSettings.customAvatarUrl),
      banner_url: sanitizeImageUrl(progressCardSettings.bannerUrl),
      custom_status: progressCardSettings.customStatus || null,
      today_study_seconds: todayStudyTimeSec,
      today_questions: todayQuestions,
      momentum_heatmap: heatmapData,
      todays_tasks: todayTasks,
      streak_count: calculatedStreak,
    };

    const snapshotStr = JSON.stringify(snapshot);
    const currentShowAgenda = progressCardSettings.showTasks !== false;
    const agendaChanged = lastShowAgendaRef.current !== currentShowAgenda;

    if (lastSnapshotRef.current === snapshotStr && !agendaChanged) return;

    let diff: any = {};
    if (lastSnapshotRef.current !== snapshotStr) {
      const lastSnapshot = lastSnapshotRef.current ? JSON.parse(lastSnapshotRef.current) : null;
      diff = snapshot;

      if (lastSnapshot) {
        diff = {};
        for (const key in snapshot) {
          if (
            JSON.stringify(snapshot[key as keyof typeof snapshot]) !==
            JSON.stringify(lastSnapshot[key])
          ) {
            diff[key] = snapshot[key as keyof typeof snapshot];
          }
        }
      }
    }

    if (Object.keys(diff).length === 0 && !agendaChanged) return;

    const hasGenuineContentChange =
      lastFailedSnapshotRef.current !== null &&
      (snapshotStr !== lastFailedSnapshotRef.current ||
        currentShowAgenda !== lastFailedShowAgendaRef.current);

    if (
      retryAttemptRef.current > 4 &&
      hasGenuineContentChange &&
      Date.now() >= pausedUntilRef.current
    ) {
      retryAttemptRef.current = 0;
      pausedUntilRef.current = 0;
      lastFailedSnapshotRef.current = null;
      lastFailedShowAgendaRef.current = null;
    }

    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }

    const executeSync = async () => {
      if (!isInitialFetchDone || isFetchingProfileRef.current || !userId || !client) return;
      if (authPausedRef.current) return;
      if (retryAttemptRef.current > 4) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        isDirtyWhileHiddenRef.current = true;
        return;
      }
      // Skip while offline; the next local change re-triggers the debounce.
      if (!isOnline()) return;
      // Still inside a failure backoff window: defer (latest diff wins) instead of
      // sending a request to a backend that just failed.
      const waitMs = pausedUntilRef.current - Date.now();
      if (waitMs > 0) {
        retryTimeoutRef.current = window.setTimeout(() => {
          executeSync();
        }, waitMs);
        return;
      }
      try {
        if (lastSnapshotRef.current !== snapshotStr && Object.keys(diff).length > 0) {
          const { error } = await client
            .from('profiles')
            .upsert({ id: userId, ...diff }, { onConflict: 'id' });
          if (error) throw error;
          lastSnapshotRef.current = snapshotStr;
          try {
            localStorage.setItem(getProfileSnapshotKey(userId), snapshotStr);
          } catch {
            /* ignore quota errors */
          }
        }

        if (lastShowAgendaRef.current !== currentShowAgenda) {
          const { error: visError } = await client.from('peer_visibility_settings').upsert(
            {
              user_id: userId,
              show_agenda: currentShowAgenda,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
          if (visError) throw visError;
          lastShowAgendaRef.current = currentShowAgenda;
          try {
            localStorage.setItem(getProfileAgendaKey(userId), JSON.stringify(currentShowAgenda));
          } catch {
            /* ignore quota errors */
          }
        }

        retryAttemptRef.current = 0;
        pausedUntilRef.current = 0;
        lastFailedSnapshotRef.current = null;
        lastFailedShowAgendaRef.current = null;
        isDirtyWhileHiddenRef.current = false;
      } catch (err) {
        if (isProfileAuthError(err)) {
          authPausedRef.current = true;
          if (retryTimeoutRef.current) {
            window.clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          console.warn('Profile sync paused due to auth error until session refreshes:', err);
          return;
        }
        console.warn('Failed to sync profile snapshot/privacy settings', err);
        lastFailedSnapshotRef.current = snapshotStr;
        lastFailedShowAgendaRef.current = currentShowAgenda;
        retryAttemptRef.current += 1;
        const backoffDelay = calculateBackoffWithJitter(
          retryAttemptRef.current - 1,
          10000,
          300000
        );
        pausedUntilRef.current = Date.now() + backoffDelay;
        if (retryAttemptRef.current <= 4) {
          retryTimeoutRef.current = window.setTimeout(() => {
            executeSync();
          }, backoffDelay);
        } else {
          console.warn('Max retry attempts reached for profile sync. Giving up until next change.');
        }
      }
    };

    pendingExecuteSyncRef.current = executeSync;

    debounceTimeoutRef.current = window.setTimeout(() => {
      executeSync();
    }, 5000); // 5-second debounce

    return () => {
      pendingExecuteSyncRef.current = null;
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [
    userId,
    isConfigured,
    progressCardSettings,
    plannerTasks,
    dailyQuestionLogs,
    studySessions,
    isInitialFetchDone,
    timerUpdateTrigger,
    authRecoveryTrigger,
    dailyResetHour,
  ]);
}
