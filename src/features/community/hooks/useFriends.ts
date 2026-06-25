import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { RemoteProfile, LiveActivity } from '../../../shared/types';

export type FriendProfile = RemoteProfile & {
    live_activity?: LiveActivity | null;
    peer_visibility_settings?: { show_agenda: boolean } | null;
};

export function useFriends() {
    const { user, isConfigured } = useRemoteAuth();
    const [friends, setFriends] = useState<FriendProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Keep friend IDs in a ref so the polling interval can access them without recreating
    const friendIdsRef = useRef<string[]>([]);

    const fetchFriends = useCallback(async () => {
        if (!user || !isConfigured || !supabase) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
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
                setIsLoading(false);
                return;
            }

            // 2. Fetch Base Profile Data & Privacy Settings (Heavy payloads)
            const [profilesRes, visibilityRes] = await Promise.all([
                supabase.from('profiles').select('*').in('id', friendIds),
                supabase.from('peer_visibility_settings').select('user_id, show_agenda').in('user_id', friendIds)
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (visibilityRes.error) throw visibilityRes.error;

            // 3. Fetch Live Activity (Lightweight)
            const liveRes = await supabase.from('live_activity').select('*').in('user_id', friendIds);
            if (liveRes.error) throw liveRes.error;

            // 4. Merge
            const merged: FriendProfile[] = profilesRes.data.map(profile => {
                const live = liveRes.data.find(l => l.user_id === profile.id);
                const vis = visibilityRes.data.find(v => v.user_id === profile.id);
                return {
                    ...profile,
                    live_activity: live || null,
                    peer_visibility_settings: vis ? { show_agenda: vis.show_agenda } : null
                };
            });

            setFriends(merged);
        } catch (err: any) {
            console.error('Failed to fetch friends', err);
            setError(err.message || 'Failed to fetch friends');
        } finally {
            setIsLoading(false);
        }
    }, [user, isConfigured]);

    const pollLiveActivity = useCallback(async () => {
        const friendIds = friendIdsRef.current;
        if (!isConfigured || !supabase || friendIds.length === 0) return;

        try {
            const { data, error } = await supabase
                .from('live_activity')
                .select('*')
                .in('user_id', friendIds);

            if (error) throw error;

            setFriends(prev => prev.map(f => {
                const updatedLive = data.find(l => l.user_id === f.id);
                // Return a new object so React detects the state change
                return updatedLive ? { ...f, live_activity: updatedLive } : f;
            }));
        } catch (err) {
            console.warn('Failed to poll live activity', err);
        }
    }, [isConfigured]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    useEffect(() => {
        // Poll every 30 seconds for live activity updates to save egress
        const interval = setInterval(pollLiveActivity, 30000);
        return () => clearInterval(interval);
    }, [pollLiveActivity]);

    return {
        friends,
        isLoading,
        error,
        refresh: fetchFriends
    };
}
