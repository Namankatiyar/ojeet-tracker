import { useEffect, useRef } from 'react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { supabase } from '../../../shared/lib/supabase';
import { StudySession } from '../../../shared/types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const getSessionDate = (s: StudySession): string => s.localDate ?? s.startTime.slice(0, 10);

export function useProfileSync() {
    const { user, isConfigured } = useRemoteAuth();
    const {
        progressCardSettings,
        setProgressCardSettings,
        studySessions,
        plannerTasks,
        dailyQuestionLogs,
    } = useUserProgress();

    // 0. Fetch invite_code and discord_tag from backend on authentication
    useEffect(() => {
        const client = supabase;
        if (!user || !isConfigured || !client) return;

        const fetchProfileDetails = async () => {
            try {
                const { data, error } = await client
                    .from('profiles')
                    .select('invite_code, discord_tag')
                    .eq('id', user.id)
                    .single();

                if (!error && data) {
                    setProgressCardSettings(prev => {
                        const updates: Partial<typeof prev> = {};
                        if (data.invite_code && prev.inviteCode !== data.invite_code) {
                            updates.inviteCode = data.invite_code;
                        }
                        if (data.discord_tag && prev.discordSpecialTag !== data.discord_tag) {
                            updates.discordSpecialTag = data.discord_tag;
                        }
                        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
                    });
                }
            } catch (err) {
                console.warn('Failed to fetch profile details', err);
            }
        };

        fetchProfileDetails();
    }, [user, isConfigured, setProgressCardSettings]);

    // 1. Live Activity Heartbeat
    useEffect(() => {
        const client = supabase;
        if (!user || !isConfigured || !client) return;

        const sendHeartbeat = async () => {
            try {
                let isActive = false;
                const raw = localStorage.getItem('jee-timer-engine');
                if (raw) {
                    const state = JSON.parse(raw);
                    if (state.engineState === 'running') isActive = true;
                }
                await client.from('live_activity').upsert({
                    user_id: user.id,
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            } catch (err) {
                console.warn('Failed to send heartbeat', err);
            }
        };

        sendHeartbeat();
        const intervalId = setInterval(sendHeartbeat, 30000);
        return () => clearInterval(intervalId);
    }, [user, isConfigured]);

    // 2. Debounced Profile Snapshot Sync
    const lastSnapshotRef = useRef<string | null>(null);
    const debounceTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const client = supabase;
        if (!user || !isConfigured || !client) return;

        const todayStr = new Date().toLocaleDateString('en-CA');
        
        const todayStudyTimeSec = studySessions
            .filter(s => getSessionDate(s) === todayStr)
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

        const todayTasks = (progressCardSettings.showTasks !== false)
            ? plannerTasks
                .filter(t => t.date === todayStr)
                .map(t => ({
                    id: t.id,
                    title: t.title,
                    time: t.time,
                    completed: t.completed,
                    subject: t.subject,
                    isActive: t.id === activeTaskId
                }))
            : [];

        const heatmapData = [];
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
            heatmapData.push({ dayLabel: DAY_LABELS[dayOfWeek], level, seconds });
        }

        const snapshot = {
            grade_status: progressCardSettings.gradeStatus || null,
            target_exam: progressCardSettings.targetExam || null,
            today_study_seconds: todayStudyTimeSec,
            today_questions: todayQuestions,
            momentum_heatmap: heatmapData,
            todays_tasks: todayTasks,
        };

        const snapshotStr = JSON.stringify(snapshot);
        if (lastSnapshotRef.current === snapshotStr) return;

        if (debounceTimeoutRef.current) {
            window.clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = window.setTimeout(async () => {
            try {
                const { error } = await client.from('profiles').update(snapshot).eq('id', user.id);
                if (!error) {
                    lastSnapshotRef.current = snapshotStr;
                }
                
                // Also upsert peer_visibility_settings.show_agenda to match
                await client.from('peer_visibility_settings').upsert({
                    user_id: user.id,
                    show_agenda: progressCardSettings.showTasks !== false,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            } catch (err) {
                console.warn('Failed to sync profile snapshot/privacy settings', err);
            }
        }, 5000); // 5-second debounce

        return () => {
            if (debounceTimeoutRef.current) {
                window.clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [user, isConfigured, progressCardSettings, studySessions, plannerTasks, dailyQuestionLogs]);
}
