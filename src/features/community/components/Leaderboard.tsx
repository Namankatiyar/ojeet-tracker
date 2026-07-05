import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { RemoteProfile } from '../../../shared/types';
import { Trophy, Award, Flame, User, AlertCircle } from 'lucide-react';

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

// ponytail: Fetch top 10 users by weekly study hours once on mount when tab is opened
export function Leaderboard({ onSignInClick }: LeaderboardProps) {
  const { user } = useRemoteAuth();
  const [profiles, setProfiles] = useState<RemoteProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchLeaderboard = async () => {
      if (!supabase) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, weekly_hours, streak_count, target_exam, grade_status')
          .order('weekly_hours', { ascending: false })
          .limit(10);

        if (fetchErr) throw fetchErr;
        if (isMounted && data) {
          setProfiles(data as RemoteProfile[]);
        }
      } catch (err: any) {
        console.error('Failed to fetch leaderboard:', err);
        if (isMounted) setError(err.message || 'Failed to load leaderboard standings');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [user]);

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
          <p>Standings calculated from active study hours recorded over the last 7 days.</p>
        </div>
      </div>

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
      ) : profiles.length === 0 ? (
        <div className="leaderboard-empty glass-panel">
          <Trophy size={36} />
          <p>No study hours recorded this week yet. Be the first on the leaderboard!</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {profiles.map((profile, idx) => {
            const rank = idx + 1;
            const isMe = profile.id === user.id;
            const rankClass =
              rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'standard';
            const displayName = profile.display_name || profile.username || 'Student';
            const hours = Number(profile.weekly_hours || 0).toFixed(1);

            return (
              <div
                key={profile.id}
                className={`leaderboard-row ${rankClass} ${isMe ? 'current-user' : ''} glass-panel`}
              >
                <div className="leaderboard-rank">
                  {rank === 1 ? (
                    <Trophy size={20} className="rank-icon gold-icon" />
                  ) : rank === 2 ? (
                    <Award size={20} className="rank-icon silver-icon" />
                  ) : rank === 3 ? (
                    <Award size={20} className="rank-icon bronze-icon" />
                  ) : (
                    <span className="rank-num">{rank}</span>
                  )}
                </div>

                <div className="leaderboard-avatar-wrap">
                  {profile.avatar_url ? (
                    <AvatarWithFallback url={profile.avatar_url} name={displayName} />
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
                  <div className="leaderboard-meta">
                    {profile.target_exam && <span className="meta-tag">{profile.target_exam}</span>}
                    {profile.grade_status && <span className="meta-tag">{profile.grade_status}</span>}
                    {profile.streak_count > 0 && (
                      <span className="meta-streak">
                        <Flame size={14} className="streak-flame" />
                        {profile.streak_count}d
                      </span>
                    )}
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
