import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { RemoteProfile, LiveActivity } from '../../../shared/types';

export type FriendProfile = RemoteProfile & {
    live_activity?: LiveActivity | null;
    peer_visibility_settings?: { show_agenda: boolean } | null;
};

export function useFriends() {
    const { user, isConfigured, isLoading: isAuthLoading } = useRemoteAuth();
    const [friends, setFriends] = useState<FriendProfile[]>(() => {
        try {
            const cached = localStorage.getItem('jee-community-friends-cache');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState(() => {
        try {
            const cached = localStorage.getItem('jee-community-friends-cache');
            return !cached || JSON.parse(cached).length === 0;
        } catch {
            return true;
        }
    });
    const [error, setError] = useState<string | null>(null);

    // Handle logout cleanup
    useEffect(() => {
        if (!isAuthLoading && !user) {
            setFriends([]);
            localStorage.removeItem('jee-community-friends-cache');
        }
    }, [user, isAuthLoading]);

    // Keep friend IDs in a ref so the polling interval can access them without recreating
    const friendIdsRef = useRef<string[]>([]);

    const fetchFriends = useCallback(async () => {
        if (!user || !isConfigured || !supabase) {
            setIsLoading(false);
            return;
        }

        setError(null);

        try {
            // 1. Get friend IDs (handling single-row bidirectional relationships)
            const { data: rels, error: relsError } = await supabase
                .from('peer_relationships')
                .select('user_id_1, user_id_2')
                .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
                .eq('status', 'accepted');

            if (relsError) throw relsError;

            const friendIds = rels.map(r => r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1);
            friendIdsRef.current = friendIds;

            if (friendIds.length === 0) {
                setFriends([]);
                localStorage.removeItem('jee-community-friends-cache');
                setIsLoading(false);
                return;
            }

            // Load existing cache
            let cachedFriends: FriendProfile[] = [];
            try {
                const cached = localStorage.getItem('jee-community-friends-cache');
                if (cached) {
                    cachedFriends = JSON.parse(cached);
                }
            } catch (e) {
                console.warn('Failed to parse cached friends', e);
            }

            // Filter cache to keep only actual accepted friends
            const filteredCache = cachedFriends.filter(f => friendIds.includes(f.id));

            // 2. Fetch Lightweight Metadata & Timestamps in Parallel
            const [profilesTimestampsRes, visibilityRes, liveRes] = await Promise.all([
                supabase.from('profiles').select('id, updated_at').in('id', friendIds),
                supabase.from('peer_visibility_settings').select('user_id, show_agenda').in('user_id', friendIds),
                supabase.from('live_activity').select('*').in('user_id', friendIds)
            ]);

            if (profilesTimestampsRes.error) throw profilesTimestampsRes.error;
            if (visibilityRes.error) throw visibilityRes.error;
            if (liveRes.error) throw liveRes.error;

            // Determine which profile IDs we need to fetch fully
            const idsToFetch: string[] = [];
            for (const id of friendIds) {
                const cachedItem = filteredCache.find(f => f.id === id);
                const remoteItem = profilesTimestampsRes.data.find(r => r.id === id);

                if (!cachedItem || !remoteItem) {
                    idsToFetch.push(id);
                } else {
                    const cachedUpdated = cachedItem.updated_at ? new Date(cachedItem.updated_at).getTime() : 0;
                    const remoteUpdated = remoteItem.updated_at ? new Date(remoteItem.updated_at).getTime() : 0;
                    if (cachedUpdated !== remoteUpdated) {
                        idsToFetch.push(id);
                    }
                }
            }

            let freshProfiles: any[] = [];
            if (idsToFetch.length > 0) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', idsToFetch);

                if (error) throw error;
                freshProfiles = data;
            }

            // 3. Merge profiles
            const merged: FriendProfile[] = friendIds.map(id => {
                let profile = freshProfiles.find(p => p.id === id);
                if (!profile) {
                    profile = filteredCache.find(f => f.id === id);
                }

                // If somehow it's not in either (e.g. initial load failed), build a minimal stub
                if (!profile) {
                    profile = { id, streak_count: 0, today_study_seconds: 0, today_questions: 0, momentum_heatmap: [], todays_tasks: [] };
                }

                const live = liveRes.data.find(l => l.user_id === id);
                const vis = visibilityRes.data.find(v => v.user_id === id);

                return {
                    ...profile,
                    live_activity: live || null,
                    peer_visibility_settings: vis ? { show_agenda: vis.show_agenda } : null
                };
            });

            setFriends(merged);
            localStorage.setItem('jee-community-friends-cache', JSON.stringify(merged));
        } catch (err: any) {
            console.error('Failed to fetch friends', err);
            setError(err.message || 'Failed to fetch friends');
        } finally {
            setIsLoading(false);
        }
    }, [user, isConfigured]);

    const lastPollTimeRef = useRef<number>(0);

    const pollLiveActivity = useCallback(async () => {
        const friendIds = friendIdsRef.current;
        if (!isConfigured || !supabase || friendIds.length === 0) return;

        try {
            const { data, error } = await supabase
                .from('live_activity')
                .select('*')
                .in('user_id', friendIds);

            if (error) throw error;

            setFriends(prev => {
                const updated = prev.map(f => {
                    const updatedLive = data.find(l => l.user_id === f.id);
                    return updatedLive ? { ...f, live_activity: updatedLive } : f;
                });
                
                localStorage.setItem('jee-community-friends-cache', JSON.stringify(updated));
                return updated;
            });
            lastPollTimeRef.current = Date.now();
        } catch (err) {
            console.warn('Failed to poll live activity', err);
        }
    }, [isConfigured]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (interval) clearInterval(interval);
            interval = setInterval(pollLiveActivity, 30000);
        };

        const stopPolling = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                // Throttle immediate re-fetch to once every 5 seconds
                if (now - lastPollTimeRef.current > 5000) {
                    pollLiveActivity();
                }
                startPolling();
            } else {
                stopPolling();
            }
        };

        // Initial setup
        if (document.visibilityState === 'visible') {
            startPolling();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [pollLiveActivity]);

    const disconnectFriend = useCallback(async (friendId: string) => {
        if (!user || !isConfigured || !supabase) {
            throw new Error('Not authenticated');
        }

        const { error } = await supabase.rpc('disconnect_peer', { friend_id: friendId });
        if (error) {
            console.error('Failed to disconnect peer:', error);
            throw error;
        }

        // Refresh list
        await fetchFriends();
    }, [user, isConfigured, fetchFriends]);

    return {
        friends,
        isLoading,
        error,
        refresh: fetchFriends,
        disconnectFriend
    };
}
