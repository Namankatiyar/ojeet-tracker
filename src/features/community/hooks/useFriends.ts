import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../shared/lib/supabase';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { RemoteProfile, LiveActivity } from '../../../shared/types';
import { calculateBackoffWithJitter, isOnline } from '../../../shared/utils/backoff';

const LIVE_POLL_INTERVAL_MS = 120_000; // 2 minutes (aligned with heartbeat cadence)
const LIVE_POLL_BACKOFF_BASE_MS = 30_000; // 30 seconds
const LIVE_POLL_BACKOFF_MAX_MS = 300_000; // 5 minutes
const PROFILE_FRIEND_COLUMNS =
  'id, display_name, username, avatar_url, banner_url, custom_status, streak_count, discord_tag, grade_status, target_exam, today_study_seconds, today_questions, momentum_heatmap, todays_tasks, updated_at';

const LAST_FULL_FETCH_STORAGE_KEY = 'jee-community-friends-last-fetch';

const readLastFullFetchTime = (uid: string | null): number => {
  if (!uid) return 0;
  try {
    const raw = localStorage.getItem(LAST_FULL_FETCH_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.userId === uid &&
      typeof parsed.fetchedAt === 'number' &&
      Number.isFinite(parsed.fetchedAt)
    ) {
      return parsed.fetchedAt;
    }
  } catch {
    /* ignore */
  }
  return 0;
};

const writeLastFullFetchTime = (uid: string | null, fetchedAt: number) => {
  try {
    if (!uid || fetchedAt === 0) {
      localStorage.removeItem(LAST_FULL_FETCH_STORAGE_KEY);
    } else {
      localStorage.setItem(LAST_FULL_FETCH_STORAGE_KEY, JSON.stringify({ userId: uid, fetchedAt }));
    }
  } catch {
    /* ignore */
  }
};

// Persist last full profile fetch across route navigations and page reloads
let globalLastFullFetchTime = 0;
// Backoff for full friend fetches while the backend is failing/overloaded.
const FRIENDS_FETCH_BACKOFF_BASE_MS = 30_000; // 30 seconds
const FRIENDS_FETCH_BACKOFF_MAX_MS = 600_000; // 10 minutes
let globalFetchFailCount = 0;
let globalFetchPausedUntil = 0;
let globalLastUserId: string | null = null;

export type FriendProfile = RemoteProfile & {
  live_activity?: LiveActivity | null;
  peer_visibility_settings?: { show_agenda: boolean } | null;
};

// ponytail: Sort online users first, then by last seen activity time (most recent first), respecting pinned friends
const sortFriends = (list: FriendProfile[], pinnedIds: string[]): FriendProfile[] => {
  const now = Date.now();
  const pinnedSet = new Set(pinnedIds);

  const enriched = list.map((f) => {
    const act = f.live_activity;
    const actTime = act?.updated_at ? new Date(act.updated_at).getTime() : 0;
    const isOnline = Boolean(act && !isNaN(actTime) && now - actTime < 300000);
    const t2 = f.updated_at ? new Date(f.updated_at).getTime() : 0;
    const lastSeenTime = Math.max(isNaN(actTime) ? 0 : actTime, isNaN(t2) ? 0 : t2);
    return { f, isPinned: pinnedSet.has(f.id), isOnline, lastSeenTime };
  });

  enriched.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return b.lastSeenTime - a.lastSeenTime;
  });

  return enriched.map((item) => item.f);
};

export interface UseFriendsOptions {
  enabled?: boolean;
}

export function useFriends(options?: UseFriendsOptions) {
  const enabled = options?.enabled ?? true;
  const location = useLocation();
  const { user, isConfigured, isLoading: isAuthLoading } = useRemoteAuth();
  // Key callbacks off the stable id: auth events produce new user objects.
  const userId = user?.id ?? null;
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

  // Keep friend IDs in a ref so the polling interval can access them without recreating
  const friendIdsRef = useRef<string[]>(
    (() => {
      try {
        const cached = localStorage.getItem('jee-community-friends-cache');
        const parsed = cached ? JSON.parse(cached) : [];
        return parsed.map((f: any) => f.id);
      } catch {
        return [];
      }
    })()
  );

  const lastPollTimeRef = useRef<number>(0);
  // Consecutive live-activity poll failures, used to back off the next attempt.
  const pollFailCountRef = useRef<number>(0);
  const pollPausedUntilRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);
  const isFetchingFriendsRef = useRef<boolean>(false);
  const enabledRef = useRef<boolean>(enabled);
  enabledRef.current = enabled;

  // Handle logout and userId-change cleanup, and hydrate persisted fetch timestamp on reload
  useEffect(() => {
    if (!isAuthLoading && !userId) {
      setFriends([]);
      friendIdsRef.current = [];
      localStorage.removeItem('jee-community-friends-cache');
      globalLastFullFetchTime = 0;
      writeLastFullFetchTime(null, 0);
      globalFetchFailCount = 0;
      globalFetchPausedUntil = 0;
      globalLastUserId = null;
      lastPollTimeRef.current = 0;
      pollFailCountRef.current = 0;
      pollPausedUntilRef.current = 0;
      return;
    }

    if (userId) {
      if (globalLastUserId !== null && globalLastUserId !== userId) {
        setFriends([]);
        friendIdsRef.current = [];
        localStorage.removeItem('jee-community-friends-cache');
        globalLastFullFetchTime = 0;
        writeLastFullFetchTime(null, 0);
        globalFetchFailCount = 0;
        globalFetchPausedUntil = 0;
        lastPollTimeRef.current = 0;
        pollFailCountRef.current = 0;
        pollPausedUntilRef.current = 0;
      } else if (globalLastFullFetchTime === 0) {
        globalLastFullFetchTime = readLastFullFetchTime(userId);
      }
      globalLastUserId = userId;
    }
  }, [userId, isAuthLoading]);

  const pollLiveActivity = useCallback(async () => {
    const friendIds = friendIdsRef.current;
    if (!enabledRef.current || !isConfigured || !supabase || friendIds.length === 0) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    // Skip while offline, inside a post-failure backoff window, or while another poll/fetch is in-flight.
    if (!isOnline() || Date.now() < pollPausedUntilRef.current) return;
    if (isPollingRef.current || isFetchingFriendsRef.current) return;

    isPollingRef.current = true;
    lastPollTimeRef.current = Date.now();
    try {
      const { data, error } = await supabase
        .from('live_activity')
        .select('*')
        .in('user_id', friendIds);

      if (error) throw error;

      setFriends((prev) => {
        const updated = prev.map((f) => {
          const updatedLive = data.find((l) => l.user_id === f.id);
          return updatedLive ? { ...f, live_activity: updatedLive } : f;
        });
        localStorage.setItem('jee-community-friends-cache', JSON.stringify(updated));
        return updated;
      });
      lastPollTimeRef.current = Date.now();
      pollFailCountRef.current = 0;
      pollPausedUntilRef.current = 0;
    } catch (err) {
      console.warn('Failed to poll live activity', err);
      // Widen the effective interval with jittered exponential backoff instead of
      // hammering a struggling backend every 30s.
      pollFailCountRef.current += 1;
      const backoff = calculateBackoffWithJitter(
        pollFailCountRef.current - 1,
        LIVE_POLL_BACKOFF_BASE_MS,
        LIVE_POLL_BACKOFF_MAX_MS
      );
      pollPausedUntilRef.current = Date.now() + backoff;
    } finally {
      isPollingRef.current = false;
    }
  }, [isConfigured]);

  const fetchFriends = useCallback(
    async (force = false) => {
      if (!userId || !isConfigured || !supabase) {
        setIsLoading(false);
        return;
      }
      if (!force && !enabledRef.current) {
        setIsLoading(false);
        return;
      }
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        setIsLoading(false);
        return;
      }
      // Backend recently failed: serve cached friends and wait out the backoff
      // instead of re-fetching on every focus/route change. Explicit (forced)
      // refreshes still go through.
      if (!force && Date.now() < globalFetchPausedUntil) {
        setIsLoading(false);
        return;
      }
      // Skip network work while offline; cached friends remain displayed.
      if (!isOnline()) {
        setIsLoading(false);
        return;
      }
      if (isFetchingFriendsRef.current) {
        return;
      }

      const now = Date.now();
      // If not forced and less than 5 minutes have passed, skip full fetch
      if (!force && globalLastFullFetchTime !== 0 && now - globalLastFullFetchTime < 300000) {
        // Still run live activity poll immediately to ensure live status is fresh on navigation
        if (now - lastPollTimeRef.current > 60000) {
          pollLiveActivity();
        }
        setIsLoading(false);
        return;
      }

      isFetchingFriendsRef.current = true;
      lastPollTimeRef.current = now;
      setError(null);

      try {
        // 1. Get friend IDs (handling single-row bidirectional relationships)
        const { data: rels, error: relsError } = await supabase
          .from('peer_relationships')
          .select('user_id_1, user_id_2')
          .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
          .eq('status', 'accepted');

        if (relsError) throw relsError;

        const friendIds = rels.map((r) => (r.user_id_1 === userId ? r.user_id_2 : r.user_id_1));
        friendIdsRef.current = friendIds;

        if (friendIds.length === 0) {
          setFriends([]);
          localStorage.removeItem('jee-community-friends-cache');
          const fetchedAt = Date.now();
          globalLastFullFetchTime = fetchedAt;
          writeLastFullFetchTime(userId, fetchedAt);
          globalFetchFailCount = 0;
          globalFetchPausedUntil = 0;
          lastPollTimeRef.current = fetchedAt;
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
        const filteredCache = cachedFriends.filter((f) => friendIds.includes(f.id));

        // 2. Fetch Lightweight Metadata & Timestamps in Parallel
        const [profilesTimestampsRes, liveRes] = await Promise.all([
          supabase.from('profiles').select('id, updated_at').in('id', friendIds),
          supabase.from('live_activity').select('*').in('user_id', friendIds),
        ]);

        if (profilesTimestampsRes.error) throw profilesTimestampsRes.error;
        if (liveRes.error) throw liveRes.error;

        // Determine which profile IDs we need to fetch fully
        const idsToFetch: string[] = [];
        for (const id of friendIds) {
          const cachedItem = filteredCache.find((f) => f.id === id);
          const remoteItem = profilesTimestampsRes.data.find((r) => r.id === id);

          if (!cachedItem || !remoteItem) {
            idsToFetch.push(id);
          } else {
            const cachedUpdated = cachedItem.updated_at
              ? new Date(cachedItem.updated_at).getTime()
              : 0;
            const remoteUpdated = remoteItem.updated_at
              ? new Date(remoteItem.updated_at).getTime()
              : 0;
            if (cachedUpdated !== remoteUpdated) {
              idsToFetch.push(id);
            }
          }
        }

        let freshProfiles: any[] = [];
        if (idsToFetch.length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .select(PROFILE_FRIEND_COLUMNS)
            .in('id', idsToFetch);

          if (error) throw error;
          freshProfiles = data;
        }

        // 3. Merge profiles
        const merged: FriendProfile[] = friendIds.map((id) => {
          let profile = freshProfiles.find((p) => p.id === id);
          if (!profile) {
            profile = filteredCache.find((f) => f.id === id);
          }

          // If somehow it's not in either (e.g. initial load failed), build a minimal stub
          if (!profile) {
            profile = {
              id,
              streak_count: 0,
              today_study_seconds: 0,
              today_questions: 0,
              momentum_heatmap: [],
              todays_tasks: [],
            };
          }

          const live = liveRes.data.find((l) => l.user_id === id);

          return {
            ...profile,
            live_activity: live || null,
          };
        });

        setFriends(merged);
        localStorage.setItem('jee-community-friends-cache', JSON.stringify(merged));
        const fetchedAt = Date.now();
        globalLastFullFetchTime = fetchedAt;
        writeLastFullFetchTime(userId, fetchedAt);
        globalFetchFailCount = 0;
        globalFetchPausedUntil = 0;
        // Stamp the poll time so the visibility effect's initial call is skipped
        // (fetchFriends already fetched live_activity inside Promise.all).
        lastPollTimeRef.current = fetchedAt;
      } catch (err: any) {
        console.error('Failed to fetch friends', err);
        setError(err.message || 'Failed to fetch friends');
        globalFetchFailCount += 1;
        globalFetchPausedUntil =
          Date.now() +
          calculateBackoffWithJitter(
            globalFetchFailCount - 1,
            FRIENDS_FETCH_BACKOFF_BASE_MS,
            FRIENDS_FETCH_BACKOFF_MAX_MS
          );
      } finally {
        isFetchingFriendsRef.current = false;
        setIsLoading(false);
      }
    },
    [userId, isConfigured, pollLiveActivity]
  );

  const hasFriends = friends.length > 0;

  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();
    if (globalLastFullFetchTime === 0 || now - globalLastFullFetchTime > 300000) {
      fetchFriends(false);
    }
  }, [location.pathname, fetchFriends, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      if (enabledRef.current && friendIdsRef.current.length > 0) {
        interval = setInterval(pollLiveActivity, LIVE_POLL_INTERVAL_MS);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleFocusOrVisible = () => {
      if (!enabledRef.current) {
        stopPolling();
        return;
      }
      const isVisible = document.visibilityState === 'visible';
      const isFocused = document.hasFocus();

      if (!isVisible) {
        stopPolling();
        return;
      }

      startPolling();

      if (isFocused || globalLastFullFetchTime === 0) {
        const now = Date.now();
        const isFullFetchStale =
          globalLastFullFetchTime === 0 || now - globalLastFullFetchTime >= 300000;

        if (isFullFetchStale && now >= globalFetchPausedUntil) {
          // fetchFriends fetches live_activity and stamps lastPollTimeRef
          fetchFriends(false);
        } else if (now - lastPollTimeRef.current > 60000) {
          pollLiveActivity();
        }
      }
    };

    // Initial setup
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      // Only fire an extra pollLiveActivity if fetchFriends hasn't already fetched
      // live_activity recently or isn't currently in-flight.
      if (Date.now() - lastPollTimeRef.current > 60000) {
        pollLiveActivity();
      }
      startPolling();
    } else if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, [pollLiveActivity, fetchFriends, enabled, hasFriends]);

  const disconnectFriend = useCallback(
    async (friendId: string) => {
      if (!user || !isConfigured || !supabase) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.rpc('disconnect_peer', { friend_id: friendId });
      if (error) {
        console.error('Failed to disconnect peer:', error);
        throw error;
      }

      // ponytail: force cache bypass to reflect disconnect immediately
      await fetchFriends(true);
    },
    [user, isConfigured, fetchFriends]
  );

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('jee-community-pinned-friends');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id];
      localStorage.setItem('jee-community-pinned-friends', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const sortedFriends = useMemo(() => {
    return sortFriends(friends, pinnedIds);
  }, [friends, pinnedIds]);

  return {
    friends: sortedFriends,
    isLoading,
    error,
    refresh: fetchFriends,
    disconnectFriend,
    pinnedIds,
    togglePin,
  };
}
