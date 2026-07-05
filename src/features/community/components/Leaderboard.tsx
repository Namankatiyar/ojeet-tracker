import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { LeaderboardEntry } from '../../../shared/types';
import { Trophy, Award, User, AlertCircle } from 'lucide-react';

interface LeaderboardProps {
  onSignInClick: () => void;
}

// Renders avatar image with automatic fallback to User icon on load error
function AvatarWithFallback({ url, name }: { url: string; name: string }) {
  const [broken, setBroken] = useState(false);
  const handleError = useCallback(() => setBroken(true), []);

  if (broken) {
    return (
      <div className="leaderboard-avatar placeholder">
        <User size={18} />
      </div>
    );
  }
  return <img src={url} alt={name} className="leaderboard-avatar" onError={handleError} />;
}

// ponytail: single read from pre-computed leaderboard_snapshot table (~10 rows, index-only scan)
export function Leaderboard({ onSignInClick }: LeaderboardProps) {
  const { user } = useRemoteAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isSelfInvalidated, setIsSelfInvalidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  const userId = user?.id;

  useEffect(() => {
    if (!userId || !supabase) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      if (!supabase) return;
      setIsLoading(true);
      setError(null);
      try {
        // Single query: read pre-computed snapshot
        const { data: standings, error: fetchErr } = await supabase
          .from('leaderboard_snapshot')
          .select('rank, user_id, display_name, username, avatar_url, weekly_hours, snapshot_at')
          .order('rank', { ascending: true });

        if (fetchErr) throw fetchErr;

        // Check self-invalidation only if user is NOT in snapshot
        let selfFlagged = false;
        const inSnapshot = standings?.some(s => s.user_id === userId);
        if (!inSnapshot) {
          const { data: selfProfile } = await supabase
            .from('profiles')
            .select('leaderboard_invalidated')
            .eq('id', userId)
            .single();
          if (selfProfile) {
            selfFlagged = selfProfile.leaderboard_invalidated || false;
          }
        }

        if (!cancelled) {
          setEntries((standings ?? []) as LeaderboardEntry[]);
          setIsSelfInvalidated(selfFlagged);
          setSnapshotAt(standings?.[0]?.snapshot_at ?? null);
        }
      } catch (err: any) {
        console.error('Failed to fetch leaderboard:', err);
        if (!cancelled) setError(err.message || 'Failed to load leaderboard standings');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (!user) {
    return (
      <div className="leaderboard-signin-prompt glass-panel">
        <Trophy size={48} className="leaderboard-prompt-icon" />
        <h2>Leaderboard is Authenticated-Only</h2>
        <p>Sign in to sync your study hours, compete with top JEE/OJEE aspirants, and track standings.</p>
        <button className="primary-btn" onClick={onSignInClick}>
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header glass-panel">
        <div className="leaderboard-header-icon">
          <Trophy size={24} />
        </div>
        <div className="leaderboard-header-text">
          <h2>Weekly Study Leaderboard</h2>
          <p>Standings refresh daily at midnight. Ranked by study hours over the last 7 days.</p>
          {snapshotAt && (
            <span className="leaderboard-snapshot-ts">
              Updated {new Date(snapshotAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
        </div>
      </div>

      {isSelfInvalidated && (
        <div className="leaderboard-warning glass-panel">
          <AlertCircle size={20} className="warning-icon" />
          <div className="warning-text">
            <h3>Standings Excluded</h3>
            <p>Your profile is temporarily excluded from public standings because study logs exceeding 18 hours in a single day were detected. Correct or delete invalid study sessions in your history to restore eligibility.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="leaderboard-error glass-panel">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="leaderboard-list">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="leaderboard-row skeleton glass-panel">
              <div className="skeleton-rank" />
              <div className="skeleton-avatar" />
              <div className="skeleton-info" />
              <div className="skeleton-hours" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="leaderboard-empty glass-panel">
          <Trophy size={36} />
          <p>No study hours recorded this week yet. Be the first on the leaderboard!</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {entries.map((entry) => {
            const isMe = entry.user_id === user.id;
            const rankClass =
              entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : entry.rank === 3 ? 'bronze' : 'standard';
            const displayName = entry.display_name || entry.username || 'Student';
            const hours = Number(entry.weekly_hours || 0).toFixed(1);

            return (
              <div
                key={entry.user_id}
                className={`leaderboard-row ${rankClass} ${isMe ? 'current-user' : ''} glass-panel`}
              >
                <div className="leaderboard-rank">
                  {entry.rank === 1 ? (
                    <Trophy size={20} className="rank-icon gold-icon" />
                  ) : entry.rank === 2 ? (
                    <Award size={20} className="rank-icon silver-icon" />
                  ) : entry.rank === 3 ? (
                    <Award size={20} className="rank-icon bronze-icon" />
                  ) : (
                    <span className="rank-num">{entry.rank}</span>
                  )}
                </div>

                <div className="leaderboard-avatar-wrap">
                  {entry.avatar_url ? (
                    <AvatarWithFallback url={entry.avatar_url} name={displayName} />
                  ) : (
                    <div className="leaderboard-avatar placeholder">
                      <User size={18} />
                    </div>
                  )}
                </div>

                <div className="leaderboard-info">
                  <div className="leaderboard-name-row">
                    <span className="leaderboard-name">{displayName}</span>
                    {isMe && <span className="leaderboard-me-badge">You</span>}
                  </div>
                </div>

                <div className="leaderboard-stats">
                  <span className="leaderboard-hours-num">{hours}</span>
                  <span className="leaderboard-hours-label">hrs / wk</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
