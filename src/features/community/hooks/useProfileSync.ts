import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { supabase } from '../../../shared/lib/supabase';
import { StudySession } from '../../../shared/types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const getSessionDate = (s: StudySession): string => s.localDate ?? s.startTime.slice(0, 10);

export function useProfileSync() {
  const { user, isConfigured, isLoading } = useRemoteAuth();
  const navigate = useNavigate();
  const {
    progressCardSettings,
    setProgressCardSettings,
    studySessions,
    plannerTasks,
    dailyQuestionLogs,
  } = useUserProgress();
  const { subjectData } = useSubjectData();

  const subjectDataRef = useRef(subjectData);
  const plannerTasksRef = useRef(plannerTasks);
  const isFetchingProfileRef = useRef(false);
  const initialFetchDoneRef = useRef(false);

  useEffect(() => {
    subjectDataRef.current = subjectData;
  }, [subjectData]);
  useEffect(() => {
    plannerTasksRef.current = plannerTasks;
  }, [plannerTasks]);

  // Handle logout cleanup
  const prevUserRef = useRef<typeof user>(null);
  useEffect(() => {
    // If we transitioned from a logged-in user to null (logout)
    if (prevUserRef.current && !user && !isLoading) {
      initialFetchDoneRef.current = false;
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
      initialFetchDoneRef.current = false;
      return;
    }

    const fetchProfileDetails = async () => {
      isFetchingProfileRef.current = true;
      try {
        const { data, error } = await client
          .from('profiles')
          .select(
            'invite_code, discord_tag, display_name, avatar_url, banner_url, custom_status, grade_status, target_exam'
          )
          .eq('id', user.id)
          .single();

        const googleName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

        if (!error && data) {
          setProgressCardSettings((prev) => {
            const updates: Partial<typeof prev> = {};
            if (data.invite_code && prev.inviteCode !== data.invite_code) {
              updates.inviteCode = data.invite_code;
            }
            if (data.discord_tag && prev.discordSpecialTag !== data.discord_tag) {
              updates.discordSpecialTag = data.discord_tag;
            }

            // Database values take priority over localStorage
            if (data.display_name && prev.userName !== data.display_name) {
              updates.userName = data.display_name;
            } else if (!prev.userName && !data.display_name && googleName) {
              updates.userName = googleName;
            }

            if (data.avatar_url && prev.customAvatarUrl !== data.avatar_url) {
              updates.customAvatarUrl = data.avatar_url;
            } else if (!prev.customAvatarUrl && !data.avatar_url && googleAvatar) {
              updates.customAvatarUrl = googleAvatar;
            }

            if (data.banner_url && prev.bannerUrl !== data.banner_url) {
              updates.bannerUrl = data.banner_url;
            }
            if (data.custom_status && prev.customStatus !== data.custom_status) {
              updates.customStatus = data.custom_status;
            }
            // Prefill grade status and target exam if missing locally or if they are the default values
            if (
              data.grade_status &&
              (!prev.gradeStatus || prev.gradeStatus === 'Class 12') &&
              prev.gradeStatus !== data.grade_status
            ) {
              updates.gradeStatus = data.grade_status;
            }
            if (
              data.target_exam &&
              (!prev.targetExam || prev.targetExam === 'JEE 2026') &&
              prev.targetExam !== data.target_exam
            ) {
              updates.targetExam = data.target_exam;
            }

            return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
          });
        } else {
          // Fallback to Google metadata if profile row isn't found or error occurs
          setProgressCardSettings((prev) => {
            const updates: Partial<typeof prev> = {};
            if (!prev.userName && googleName) {
              updates.userName = googleName;
            }
            if (!prev.customAvatarUrl && googleAvatar) {
              updates.customAvatarUrl = googleAvatar;
            }
            return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
          });
        }
      } catch (err) {
        console.warn('Failed to fetch profile details', err);
      } finally {
        isFetchingProfileRef.current = false;
        initialFetchDoneRef.current = true;
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

  // 2. Debounced Profile Snapshot Sync
  const lastSnapshotRef = useRef<string | null>(null);
  const lastShowAgendaRef = useRef<boolean | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryAttemptRef = useRef<number>(0);

  useEffect(() => {
    const client = supabase;
    if (!user || !isConfigured || !client) return;
    if (!initialFetchDoneRef.current || isFetchingProfileRef.current) return;

    const todayStr = new Date().toLocaleDateString('en-CA');
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
    } catch {}

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
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
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

    const checkDate = new Date();
    const todayStrLocal = checkDate.toLocaleDateString('en-CA');
    const yesterday = new Date(checkDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    const hasToday = getDailyStudyTime(todayStrLocal) >= 60;
    const hasYesterday = getDailyStudyTime(yesterdayStr) >= 60;

    let calculatedStreak = 0;
    if (hasToday || hasYesterday) {
      const startCheckDate = hasToday ? checkDate : yesterday;
      while (true) {
        const dateStr = startCheckDate.toLocaleDateString('en-CA');
        if (getDailyStudyTime(dateStr) >= 60) {
          calculatedStreak++;
          startCheckDate.setDate(startCheckDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    const snapshot = {
      grade_status: progressCardSettings.gradeStatus || null,
      target_exam: progressCardSettings.targetExam || null,
      display_name: progressCardSettings.userName || null,
      avatar_url: progressCardSettings.customAvatarUrl || null,
      banner_url: progressCardSettings.bannerUrl || null,
      custom_status: progressCardSettings.customStatus || null,
      today_study_seconds: todayStudyTimeSec,
      today_questions: todayQuestions,
      momentum_heatmap: heatmapData,
      todays_tasks: todayTasks,
      streak_count: calculatedStreak,
    };

    const snapshotStr = JSON.stringify(snapshot);
    if (lastSnapshotRef.current === snapshotStr) return;

    const lastSnapshot = lastSnapshotRef.current ? JSON.parse(lastSnapshotRef.current) : null;
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

    if (Object.keys(diff).length === 0) return;

    const currentShowAgenda = progressCardSettings.showTasks !== false;

    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(async () => {
      const executeSync = async () => {
        if (!initialFetchDoneRef.current || isFetchingProfileRef.current) return;
        try {
          const { error } = await client.from('profiles').update(diff).eq('id', user.id);
          if (error) throw error;
          lastSnapshotRef.current = snapshotStr;
          retryAttemptRef.current = 0;

          if (lastShowAgendaRef.current !== currentShowAgenda) {
            await client.from('peer_visibility_settings').upsert(
              {
                user_id: user.id,
                show_agenda: currentShowAgenda,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
            lastShowAgendaRef.current = currentShowAgenda;
          }
        } catch (err) {
          console.warn('Failed to sync profile snapshot/privacy settings', err);
          retryAttemptRef.current += 1;
          if (retryAttemptRef.current <= 4) {
            const backoffDelay = Math.min(
              10000 * 2 ** (retryAttemptRef.current - 1),
              300000
            );
            retryTimeoutRef.current = window.setTimeout(() => {
              executeSync();
            }, backoffDelay);
          } else {
            console.warn('Max retry attempts reached for profile sync. Giving up until next change.');
          }
        }
      };
      executeSync();
    }, 5000); // 5-second debounce

    return () => {
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [
    user,
    isConfigured,
    progressCardSettings,
    plannerTasks,
    dailyQuestionLogs,
  ]);
}
