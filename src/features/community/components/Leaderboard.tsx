import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { LeaderboardEntry } from '../../../shared/types';
import { Trophy, Award, User, AlertCircle } from 'lucide-react';

interface LeaderboardProps {
  onSignInClick: () => void;
}

// Renders avatar image with automatic fallback to User icon on load error
function AvatarWithFallback({
  url,
  name,
  size = 40,
}: {
  url: string;
  name: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const handleError = useCallback(() => setBroken(true), []);

  if (broken) {
    return (
      <div className="lb-avatar placeholder">
        <User size={size * 0.45} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      className="lb-avatar"
      onError={handleError}
    />
  );
}

/** Podium slot for rank 1 / 2 / 3 */
function PodiumCard({
  entry,
  isMe,
  maxHours,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  maxHours: number;
}) {
  const hours = Number(entry.weekly_hours || 0);
  const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0;
  const displayName = entry.display_name || entry.username || 'Student';
  const rankClass = entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : 'bronze';

  return (
    <div className={`lb-podium-card ${rankClass} ${isMe ? 'current-user' : ''} glass-panel`}>
      <div className="lb-podium-medal">
        {entry.rank === 1 ? (
          <Trophy size={18} className="gold-icon" />
        ) : (
          <Award size={18} className={entry.rank === 2 ? 'silver-icon' : 'bronze-icon'} />
        )}
        <span className="lb-podium-rank-num">{entry.rank}</span>
      </div>

      <div className="lb-podium-avatar-wrap">
        {entry.avatar_url ? (
          <AvatarWithFallback url={entry.avatar_url} name={displayName} size={56} />
        ) : (
          <div className="lb-avatar placeholder">
            <User size={24} />
          </div>
        )}
        {isMe && <span className="lb-me-dot" title="You" />}
      </div>

      <div className="lb-podium-identity">
        <span className="lb-podium-name">{displayName}</span>
        {isMe && <span className="lb-me-badge">You</span>}
      </div>

      <div className="lb-podium-hours">
        <span className="lb-hours-num">{hours.toFixed(1)}</span>
        <span className="lb-hours-label">hrs / wk</span>
      </div>

      {/* Relative fill bar */}
      <div className="lb-podium-bar-track">
        <div className="lb-podium-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Compact row for rank 4+ */
function ListRow({
  entry,
  isMe,
  maxHours,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  maxHours: number;
}) {
  const hours = Number(entry.weekly_hours || 0);
  const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0;
  const displayName = entry.display_name || entry.username || 'Student';

  return (
    <div className={`lb-list-row ${isMe ? 'current-user' : ''} glass-panel`}>
      <span className="lb-list-rank">{entry.rank}</span>

      <div className="lb-list-avatar-wrap">
        {entry.avatar_url ? (
          <AvatarWithFallback url={entry.avatar_url} name={displayName} size={32} />
        ) : (
          <div className="lb-avatar placeholder">
            <User size={14} />
          </div>
        )}
      </div>

      <div className="lb-list-info">
        <div className="lb-list-name-row">
          <span className="lb-list-name">{displayName}</span>
          {isMe && <span className="lb-me-badge">You</span>}
        </div>
        {/* Progress bar inline */}
        <div className="lb-list-bar-track">
          <div className="lb-list-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="lb-list-stats">
        <span className="lb-hours-num">{hours.toFixed(1)}</span>
        <span className="lb-hours-label">hrs</span>
      </div>
    </div>
  );
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
            .maybeSingle();
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
        <h2>Leaderboard is authenticated-only</h2>
        <p>Sign in to sync your study hours, compete with top JEE/OJEE aspirants, and track standings.</p>
        <button className="primary-btn" onClick={onSignInClick}>
          Sign in with Google
        </button>
      </div>
    );
  }

  // Highest hours for relative bar scaling
  const maxHours = entries.length > 0 ? Number(entries[0].weekly_hours || 0) : 1;

  const podium = entries.filter(e => e.rank <= 3);
  const restList = entries.filter(e => e.rank > 3);

  // Podium display order: 2nd – 1st – 3rd
  const podiumOrder = [
    podium.find(e => e.rank === 2),
    podium.find(e => e.rank === 1),
    podium.find(e => e.rank === 3),
  ].filter(Boolean) as LeaderboardEntry[];

  return (
    <div className="leaderboard-container">
      {/* ── Header ── */}
      <div className="leaderboard-header glass-panel">
        <div className="leaderboard-header-icon">
          <Trophy size={24} />
        </div>
        <div className="leaderboard-header-text">
          <h2>Weekly study leaderboard</h2>
          <p>Ranked by study hours over the last 7 days. Refreshes daily.</p>
          {snapshotAt && (
            <span className="leaderboard-snapshot-ts">
              Updated {new Date(snapshotAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
        </div>
      </div>

      {/* ── Anti-cheat warning ── */}
      {isSelfInvalidated && (
        <div className="leaderboard-warning glass-panel">
          <AlertCircle size={20} className="warning-icon" />
          <div className="warning-text">
            <h3>Standings excluded</h3>
            <p>Your profile is temporarily excluded from public standings because study logs exceeding 18 hours in a single day were detected. Correct or delete invalid study sessions in your history to restore eligibility.</p>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="leaderboard-error glass-panel">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {isLoading ? (
        <div className="lb-skeleton-list">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="lb-skeleton-row glass-panel" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="leaderboard-empty glass-panel">
          <Trophy size={36} />
          <p>No study hours recorded this week yet. Be the first on the leaderboard!</p>
        </div>
      ) : (
        <>
          {/* ── Top-3 Podium ── */}
          {podiumOrder.length > 0 && (
            <div className="lb-podium">
              {podiumOrder.map(entry => (
                <PodiumCard
                  key={entry.user_id}
                  entry={entry}
                  isMe={entry.user_id === user.id}
                  maxHours={maxHours}
                />
              ))}
            </div>
          )}

          {/* ── Rank 4+ List ── */}
          {restList.length > 0 && (
            <div className="lb-list">
              {restList.map(entry => (
                <ListRow
                  key={entry.user_id}
                  entry={entry}
                  isMe={entry.user_id === user.id}
                  maxHours={maxHours}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
