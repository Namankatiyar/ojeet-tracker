import { useEffect, useRef } from 'react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { supabase } from '../../../shared/lib/supabase';
import { Subject } from '../../../shared/types';
import { calculateBackoffWithJitter, isOnline } from '../../../shared/utils/backoff';

const HEARTBEAT_BACKOFF_BASE_MS = 60_000; // 1 minute
const HEARTBEAT_BACKOFF_MAX_MS = 300_000; // 5 minutes

/**
 * PERF-008: Live activity heartbeat — extracted from useProfileSync so it only
 * runs while the CommunityPage is mounted, instead of globally at the app root.
 *
 * Sends an upsert to the `live_activity` table every 60 seconds with the
 * current study-clock state (running / paused / idle).
 */
export function useActivityHeartbeat() {
  const { user, isConfigured } = useRemoteAuth();
  const { subjectData } = useSubjectData();
  const { plannerTasks } = useUserProgress();

  const subjectDataRef = useRef(subjectData);
  const plannerTasksRef = useRef(plannerTasks);

  useEffect(() => {
    subjectDataRef.current = subjectData;
  }, [subjectData]);
  useEffect(() => {
    plannerTasksRef.current = plannerTasks;
  }, [plannerTasks]);

  const lastHeartbeatPayloadRef = useRef<string | null>(
    // Persist across Community page unmount/remount within the same browser session
    // so navigating back doesn't force a redundant is_active:false upsert.
    typeof window !== 'undefined' ? sessionStorage.getItem('ojee-last-heartbeat-payload') : null
  );
  const lastHeartbeatSentAtRef = useRef<number>(0);
  const heartbeatFailCountRef = useRef<number>(0);
  const heartbeatPausedUntilRef = useRef<number>(0);
  const hasSentInitialHeartbeatRef = useRef<boolean>(false);

  useEffect(() => {
    const client = supabase;
    if (!user || !isConfigured || !client) return;

    const sendHeartbeat = async (force: boolean = false) => {
      try {
        const now = Date.now();
        if (now < heartbeatPausedUntilRef.current) {
          return;
        }
        // Skip while the tab is backgrounded: a hidden Community tab shouldn't
        // keep broadcasting an "active" study state or spend upserts.
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }
        // Don't attempt writes while offline — avoids guaranteed failures that
        // would otherwise trip the failure backoff.
        if (!isOnline()) {
          return;
        }
        // Throttle check is deferred to after payload computation so state changes trigger immediate heartbeats

        let isActive = false;
        let subject: string | null = null;
        let chapterName: string | null = null;
        let chapterSerial: number | null = null;
        let material: string | null = null;
        let startedAt: string | null = null;

        const rawTimer = localStorage.getItem('jee-timer-engine');
        if (rawTimer) {
          const timerState = JSON.parse(rawTimer);
          const engineState = timerState.engineState;

          if (engineState === 'running' || engineState === 'paused') {
            if (engineState === 'running') {
              isActive = true;
            }

            const startMs = timerState.runStartedAtMs
              ? timerState.runStartedAtMs - (timerState.accumulatedActiveMs || 0)
              : timerState.startTimestamp || null;
            if (startMs) {
              // Round to nearest second to prevent JS timer drift from causing unnecessary heartbeat updates
              const roundedStartMs = Math.round(startMs / 1000) * 1000;
              startedAt = new Date(roundedStartMs).toISOString();
            }

            const rawType = localStorage.getItem('studyClock_taskType');
            const taskType = rawType ? JSON.parse(rawType) : 'chapter';

            if (taskType === 'chapter') {
              const rawSubj = localStorage.getItem('studyClock_selectedSubject');
              const rawChap = localStorage.getItem('studyClock_selectedChapter');
              const rawMat = localStorage.getItem('studyClock_selectedMaterial');

              const subjVal = rawSubj ? JSON.parse(rawSubj) : null;
              const chapVal = rawChap ? JSON.parse(rawChap) : null;
              const matVal = rawMat ? JSON.parse(rawMat) : null;

              subject = subjVal || null;
              chapterSerial = typeof chapVal === 'number' ? chapVal : null;
              material = matVal || null;

              if (subject && chapterSerial) {
                const typedSubject = subject as Subject;
                const subData = subjectDataRef.current[typedSubject];
                if (subData) {
                  const chapter = subData.chapters.find((c) => c.serial === chapterSerial);
                  if (chapter) {
                    chapterName = chapter.name;
                  }
                }
              }
            } else if (taskType === 'task') {
              const rawTaskId = localStorage.getItem('studyClock_selectedTaskId');
              const taskId = rawTaskId ? JSON.parse(rawTaskId) : null;
              if (taskId) {
                const task = plannerTasksRef.current.find((t) => t.id === taskId);
                if (task) {
                  subject = task.subject || null;
                  chapterName = task.title;
                  material = task.subtitle || null;
                }
              }
            } else if (taskType === 'custom') {
              const rawTitle = localStorage.getItem('studyClock_customTitle');
              chapterName = rawTitle ? JSON.parse(rawTitle) : 'Untitled Session';
            }
          }
        }

        const payload = {
          user_id: user.id,
          is_active: isActive,
          subject,
          chapter_name: chapterName,
          chapter_serial: chapterSerial,
          material,
          started_at: startedAt,
          updated_at: new Date().toISOString(),
        };

        const comparePayload = { ...payload, updated_at: null };
        const payloadStr = JSON.stringify(comparePayload);

        const stateChanged = payloadStr !== lastHeartbeatPayloadRef.current;

        // Skip if not forced, state hasn't changed, and less than 60s since last heartbeat sent
        if (!force && !stateChanged && now - lastHeartbeatSentAtRef.current < 60000) {
          return;
        }

        lastHeartbeatSentAtRef.current = now;
        lastHeartbeatPayloadRef.current = payloadStr;
        try {
          sessionStorage.setItem('ojee-last-heartbeat-payload', payloadStr);
        } catch { /* quota exceeded – non-fatal */ }

        await client.from('live_activity').upsert(payload, { onConflict: 'user_id' });
        heartbeatFailCountRef.current = 0;
      } catch (err) {
        console.warn('Failed to send heartbeat', err);
        heartbeatFailCountRef.current += 1;
        // Progressive jittered backoff instead of a fixed 5-minute pause, so
        // recovering clients don't all retry in a synchronized wave.
        if (heartbeatFailCountRef.current >= 2) {
          const pauseMs = calculateBackoffWithJitter(
            heartbeatFailCountRef.current - 2,
            HEARTBEAT_BACKOFF_BASE_MS,
            HEARTBEAT_BACKOFF_MAX_MS
          );
          console.warn(
            `Heartbeat failed ${heartbeatFailCountRef.current} times. Pausing heartbeats for ${Math.round(pauseMs / 1000)}s.`
          );
          heartbeatPausedUntilRef.current = Date.now() + pauseMs;
        }
      }
    };

    if (!hasSentInitialHeartbeatRef.current) {
      hasSentInitialHeartbeatRef.current = true;
      sendHeartbeat(true);
    } else {
      sendHeartbeat(false);
    }

    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      sendHeartbeat(false);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleFocusOrVisible);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusOrVisible);
      window.addEventListener('jee-timer-state-change', handleFocusOrVisible);
    }

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      sendHeartbeat(false);
    }, 60000);

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleFocusOrVisible);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocusOrVisible);
        window.removeEventListener('jee-timer-state-change', handleFocusOrVisible);
      }
    };
  }, [user, isConfigured]);
}
