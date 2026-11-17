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

// Minimum gap between successful profile writes; changes inside it coalesce into one trailing write.
const MIN_WRITE_INTERVAL_MS = 2 * 60 * 1000;
const DEBOUNCE_MS = 5000;

// Last snapshot/show-agenda known to be on the server, per user, so a page reload
// doesn't resend an unchanged full snapshot. Storage may be unavailable: never throw.
const snapshotKey = (uid: string) => `ojeet-profile-sync:snapshot:${uid}`;
const agendaKey = (uid: string) => `ojeet-profile-sync:show-agenda:${uid}`;
const readStore = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStore = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const getSessionDate = (s: StudySession): string => s.localDate ?? s.startTime.slice(0, 10);

export function useProfileSync() {
  const { user, isConfigured, isLoading } = useRemoteAuth();
  // Key the snapshot effect off the stable id: auth events produce new user objects.
  const userId = user?.id ?? null;
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
  // True once we know the profiles row exists (fetched or written), so we can UPDATE
  // instead of upsert (an upsert fires BEFORE INSERT triggers even for existing rows).
  const profileExistsRef = useRef(false);
  const lastWriteAtRef = useRef(0);
  const hydratedForUserRef = useRef<string | null>(null);
  const [timerUpdateTrigger, setTimerUpdateTrigger] = useState(0);

  useEffect(() => {
    subjectDataRef.current = subjectData;
  }, [subjectData]);
  useEffect(() => {
    plannerTasksRef.current = plannerTasks;
  }, [plannerTasks]);
  useEffect(() => {
    progressCardSettingsRef.current = progressCardSettings;
  }, [progressCardSettings]);

  // Handle logout cleanup
  const prevUserRef = useRef<typeof user>(null);
  useEffect(() => {
    // If we transitioned from a logged-in user to null (logout)
    if (prevUserRef.current && !user && !isLoading) {
      setIsInitialFetchDone(false);
      lastSnapshotRef.current = null;
      lastShowAgendaRef.current = null;
      profileExistsRef.current = false;
      hydratedForUserRef.current = null;
      lastWriteAtRef.current = 0;
      setProgressCardSettings((prev) => ({
        ...prev,
        inviteCode: '',
        discordSpecialTag: '',
        userName: '',
        customAvatarUrl: '',
        bannerUrl: '',
        customStatus: '',
      }));
    }
    if (!isLoading) {
      prevUserRef.current = user;
    }
  }, [user, isLoading, setProgressCardSettings]);

  // Post-login check for pending invite code
  useEffect(() => {
    const client = supabase;
    if (!user || !isConfigured || !client) return;

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
  }, [user, isConfigured, navigate]);

  // 0. Fetch invite_code, discord_tag, display_name, and avatar_url from backend on authentication
  useEffect(() => {
    const client = supabase;
    if (!user || !isConfigured || !client) {
      setIsInitialFetchDone(false);
      return;
    }

    const fetchProfileDetails = async () => {
      isFetchingProfileRef.current = true;
      if (hydratedForUserRef.current !== user.id) {
        hydratedForUserRef.current = user.id;
        lastSnapshotRef.current = readStore(snapshotKey(user.id));
        const storedAgenda = readStore(agendaKey(user.id));
        lastShowAgendaRef.current = storedAgenda === null ? null : storedAgenda === 'true';
        profileExistsRef.current = false;
      }
      try {
        const { data, error } = await client
          .from('profiles')
          .select(
            'invite_code, discord_tag, display_name, avatar_url, banner_url, custom_status, grade_status, target_exam'
          )
          .eq('id', user.id)
          .maybeSingle();

        const resolvedName = getDisplayName(user);
        const resolvedAvatar = getAvatarUrl(user) || '';

        if (!error && data) {
          profileExistsRef.current = true;
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
          // Row is missing: any persisted snapshot is stale, resend everything.
          profileExistsRef.current = false;
          lastSnapshotRef.current = null;
          lastShowAgendaRef.current = null;
          writeStore(snapshotKey(user.id), null);
          writeStore(agendaKey(user.id), null);
          // Profile row is missing. Insert default profile row immediately to satisfy foreign key constraints
          const initialProfile = {
            id: user.id,
            display_name: progressCardSettingsRef.current.userName || resolvedName || 'Student',
            avatar_url: progressCardSettingsRef.current.customAvatarUrl || resolvedAvatar || null,
            grade_status: progressCardSettingsRef.current.gradeStatus || 'Class 12',
            target_exam: progressCardSettingsRef.current.targetExam || 'JEE 2026',
          };
          const { error: insertErr } = await client.from('profiles').insert(initialProfile);
          if (insertErr) {
            console.error('Failed to create initial profile row:', insertErr);
          } else {
            console.log('Successfully created initial profile row for user:', user.id);
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
        setIsInitialFetchDone(true);
      }
    };

    fetchProfileDetails();
  }, [user, isConfigured, setProgressCardSettings]);

  // PERF-008: The live activity heartbeat has been extracted into useActivityHeartbeat.ts
  // and is now mounted only inside CommunityPage, so it doesn't fire on every page.

  const studySessionsRef = useRef(studySessions);
  useEffect(() => {
    studySessionsRef.current = studySessions;
  }, [studySessions]);

  // Timer sync listener
  useEffect(() => {
    const handleTimerChange = () => setTimerUpdateTrigger((t) => t + 1);
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
  const debounceTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryAttemptRef = useRef<number>(0);
  // While the backend is failing, local edits must not bypass the retry backoff.
  const pausedUntilRef = useRef<number>(0);

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

    // Guard: never persist base64 data URIs to profiles.avatar_url/banner_url.
    // Only internet image URLs are allowed. A legacy data: URI left in
    // localStorage would otherwise re-sync a ~257 KB blob into every profile
    // row (and into the leaderboard snapshot + friend fetches). Drop it.
    const sanitizeImageUrl = (value?: string): string | null => {
      if (!value || /^data:/i.test(value)) return null;
      return value;
    };

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

    let lastSnapshot: any = null;
    try {
      lastSnapshot = lastSnapshotRef.current ? JSON.parse(lastSnapshotRef.current) : null;
    } catch {
      lastSnapshot = null;
    }
    let diff: any = snapshot;

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

    const hasProfileDiff = Object.keys(diff).length > 0;
    if (!hasProfileDiff && !agendaChanged) return;

    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }

    let pending = true;

    const executeSync = async () => {
      if (!isInitialFetchDone || isFetchingProfileRef.current || !userId || !client) return;
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
        if (hasProfileDiff) {
          if (profileExistsRef.current) {
            // UPDATE skips the BEFORE INSERT triggers an upsert would fire. No RETURNING:
            // the DB suppresses no-op updates (zz_profiles_suppress_redundant_updates), so
            // "0 rows" is expected and must not be mistaken for a missing row.
            const { error } = await client.from('profiles').update(diff).eq('id', userId);
            if (error) throw error;
          } else {
            // Row existence unknown: upsert.
            const { error } = await client
              .from('profiles')
              .upsert({ id: userId, ...diff }, { onConflict: 'id' });
            if (error) throw error;
          }
          profileExistsRef.current = true;
          lastSnapshotRef.current = snapshotStr;
          lastWriteAtRef.current = Date.now();
          writeStore(snapshotKey(userId), snapshotStr);
        }
        retryAttemptRef.current = 0;
        pausedUntilRef.current = 0;

        if (lastShowAgendaRef.current !== currentShowAgenda) {
          const { error: agendaErr } = await client.from('peer_visibility_settings').upsert(
            {
              user_id: userId,
              show_agenda: currentShowAgenda,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
          // Throw so the backoff below retries it (a retried profile UPDATE is a DB no-op).
          if (agendaErr) throw agendaErr;
          lastShowAgendaRef.current = currentShowAgenda;
          writeStore(agendaKey(userId), String(currentShowAgenda));
        }
      } catch (err) {
        console.warn('Failed to sync profile snapshot/privacy settings', err);
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

    // Debounce, but never write sooner than MIN_WRITE_INTERVAL_MS after the last
    // successful write. This effect re-runs on every change and clears the timer,
    // so exactly one trailing write exists and it always carries the latest snapshot.
    const delay = Math.max(
      DEBOUNCE_MS,
      lastWriteAtRef.current + MIN_WRITE_INTERVAL_MS - Date.now()
    );
    debounceTimeoutRef.current = window.setTimeout(() => {
      pending = false;
      executeSync();
    }, delay);

    // Best effort: push the pending write before the tab goes away (ignores the floor,
    // still respects failure backoff and offline state).
    const flushPending = () => {
      if (!pending || pausedUntilRef.current > Date.now()) return;
      pending = false;
      if (debounceTimeoutRef.current) window.clearTimeout(debounceTimeoutRef.current);
      executeSync();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flushPending);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flushPending);
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
  ]);
}
