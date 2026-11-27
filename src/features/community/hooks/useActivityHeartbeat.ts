import { useEffect, useRef } from 'react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { supabase } from '../../../shared/lib/supabase';
import { Subject } from '../../../shared/types';
import { calculateBackoffWithJitter, isOnline } from '../../../shared/utils/backoff';

const HEARTBEAT_BACKOFF_BASE_MS = 120_000; // 2 minutes
const HEARTBEAT_BACKOFF_MAX_MS = 300_000; // 5 minutes
// PERF (Issue #5): Active sessions beat every 2 minutes (halved from 1 min).
// Idle users — timer not running but Community page open — are throttled to one
// write per 5 minutes instead of paying the active cadence.
const HEARTBEAT_ACTIVE_INTERVAL_MS = 120_000;
const HEARTBEAT_IDLE_INTERVAL_MS = 300_000;
const HEARTBEAT_THROTTLE_SLACK_MS = 5_000;
const HEARTBEAT_PAYLOAD_STORAGE_KEY = 'ojee-last-heartbeat-payload';
const HEARTBEAT_AT_STORAGE_KEY = 'ojee-last-heartbeat-at';

function getSharedLastHeartbeatAt(userId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(HEARTBEAT_AT_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.userId === userId && typeof parsed.sentAt === 'number') {
      return parsed.sentAt;
    }
    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore storage read/parse errors
  }
  return 0;
}

function clearHeartbeatStorage(): void {
  try {
    localStorage.removeItem(HEARTBEAT_PAYLOAD_STORAGE_KEY);
  } catch {
    // non-fatal
  }
  try {
    localStorage.removeItem(HEARTBEAT_AT_STORAGE_KEY);
  } catch {
    // non-fatal
  }
}

/**
 * PERF-008: Live activity heartbeat — extracted from useProfileSync so it only
 * runs while the CommunityPage is mounted, instead of globally at the app root.
 *
 * Sends an upsert to the `live_activity` table every 2 minutes with the
 * current study-clock state (running / paused / idle), throttled to once per
 * 5 minutes while the timer is not running.
 */
export function useActivityHeartbeat() {
  const { user, isConfigured } = useRemoteAuth();
  // Key effects off the stable id: auth events produce new user objects.
  const userId = user?.id ?? null;
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
    // Persist across tabs and page reloads so opening /community in a new tab
    // doesn't reset the payload ref and bypass the 2m/5m throttle.
    typeof window !== 'undefined' ? localStorage.getItem(HEARTBEAT_PAYLOAD_STORAGE_KEY) : null
  );
  const lastHeartbeatSentAtRef = useRef<number>(
    userId ? getSharedLastHeartbeatAt(userId) : 0
  );
  const heartbeatFailCountRef = useRef<number>(0);
  const heartbeatPausedUntilRef = useRef<number>(0);
  const isSendingRef = useRef<boolean>(false);
  const prevUserIdRef = useRef<string | null>(userId);

  useEffect(() => {
    const client = supabase;
    if (!userId || !isConfigured || !client) {
      if (!userId) {
        lastHeartbeatPayloadRef.current = null;
        lastHeartbeatSentAtRef.current = 0;
        heartbeatFailCountRef.current = 0;
        heartbeatPausedUntilRef.current = 0;
        prevUserIdRef.current = null;
        clearHeartbeatStorage();
      }
      return;
    }

    if (prevUserIdRef.current !== null && prevUserIdRef.current !== userId) {
      lastHeartbeatPayloadRef.current = null;
      lastHeartbeatSentAtRef.current = 0;
      heartbeatFailCountRef.current = 0;
      heartbeatPausedUntilRef.current = 0;
      clearHeartbeatStorage();
    } else if (lastHeartbeatSentAtRef.current === 0) {
      lastHeartbeatSentAtRef.current = getSharedLastHeartbeatAt(userId);
    }
    prevUserIdRef.current = userId;

    const sendHeartbeat = async (force: boolean = false) => {
      if (isSendingRef.current) {
        return;
      }
      isSendingRef.current = true;
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
              // PERF (Issue #5): Floor to the minute, not round/second. started_at is
              // derived as runStartedAtMs - accumulatedActiveMs, which shifts every
              // second while the timer runs; flooring avoids 1ms jitter near :30.000
              // flipping started_at by 60s and defeating payload dedup.
              const flooredStartMs = Math.floor(startMs / 60_000) * 60_000;
              startedAt = new Date(flooredStartMs).toISOString();
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
          user_id: userId,
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

        // Skip if not forced, state hasn't changed, and we're inside the throttle window.
        // Subtract small slack so 120s/300s interval ticks don't skip 1ms early due to await latency.
        const throttleWindowMs = isActive
          ? HEARTBEAT_ACTIVE_INTERVAL_MS
          : HEARTBEAT_IDLE_INTERVAL_MS;
        const lastSentAt = Math.max(
          lastHeartbeatSentAtRef.current,
          getSharedLastHeartbeatAt(userId)
        );
        if (
          !force &&
          !stateChanged &&
          now - lastSentAt < throttleWindowMs - HEARTBEAT_THROTTLE_SLACK_MS
        ) {
          return;
        }

        // supabase-js reports HTTP failures (5xx/429) via `error`, not by throwing.
        const { error } = await client
          .from('live_activity')
          .upsert(payload, { onConflict: 'user_id' });
        if (error) throw error;

        const sentAt = Date.now();
        lastHeartbeatSentAtRef.current = sentAt;
        lastHeartbeatPayloadRef.current = payloadStr;
        heartbeatFailCountRef.current = 0;
        heartbeatPausedUntilRef.current = 0;
        try {
          localStorage.setItem(HEARTBEAT_PAYLOAD_STORAGE_KEY, payloadStr);
        } catch {
          /* quota exceeded – non-fatal */
        }
        try {
          localStorage.setItem(
            HEARTBEAT_AT_STORAGE_KEY,
            JSON.stringify({ userId, sentAt })
          );
        } catch {
          /* quota exceeded – non-fatal */
        }
      } catch (err) {
        console.warn('Failed to send heartbeat', err);
        const errObj = err as { status?: number; code?: string; message?: string } | null;
        const isAuthError =
          errObj?.status === 401 ||
          errObj?.status === 403 ||
          errObj?.code === 'PGRST301' ||
          /jwt|unauthorized|auth/i.test(errObj?.message || '');
        if (isAuthError) {
          lastHeartbeatPayloadRef.current = null;
          lastHeartbeatSentAtRef.current = 0;
          clearHeartbeatStorage();
        }
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
      } finally {
        isSendingRef.current = false;
      }
    };

    sendHeartbeat(false);

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
    }, HEARTBEAT_ACTIVE_INTERVAL_MS);

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
  }, [userId, isConfigured]);
}
