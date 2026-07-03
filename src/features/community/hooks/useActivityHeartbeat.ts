import { useEffect, useRef } from 'react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { supabase } from '../../../shared/lib/supabase';
import { Subject } from '../../../shared/types';

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

  const lastHeartbeatPayloadRef = useRef<string | null>(null);
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
        // Throttle to 60 seconds unless forced by interval
        if (!force && now - lastHeartbeatSentAtRef.current < 60000) {
          return;
        }

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

        const isPeriodicActiveUpdate = isActive && (now - lastHeartbeatSentAtRef.current >= 120000);
        if (!force && !isPeriodicActiveUpdate && payloadStr === lastHeartbeatPayloadRef.current) {
          return;
        }

        lastHeartbeatSentAtRef.current = now;
        lastHeartbeatPayloadRef.current = payloadStr;

        await client.from('live_activity').upsert(payload, { onConflict: 'user_id' });
        heartbeatFailCountRef.current = 0;
      } catch (err) {
        console.warn('Failed to send heartbeat', err);
        heartbeatFailCountRef.current += 1;
        if (heartbeatFailCountRef.current >= 2) {
          console.warn('Heartbeat failed twice consecutively. Pausing heartbeats for 5 minutes.');
          heartbeatPausedUntilRef.current = Date.now() + 300_000;
        }
      }
    };

    if (!hasSentInitialHeartbeatRef.current) {
      hasSentInitialHeartbeatRef.current = true;
      sendHeartbeat(true);
    } else {
      sendHeartbeat(false);
    }

    const handleTimerChange = () => {
      sendHeartbeat(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('jee-timer-state-change', handleTimerChange);
    }

    const intervalId = setInterval(() => sendHeartbeat(false), 60000);
    return () => {
      clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('jee-timer-state-change', handleTimerChange);
      }
    };
  }, [user, isConfigured]);
}
