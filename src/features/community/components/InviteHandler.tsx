import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useTheme } from '../../../core/context/ThemeContext';
import { supabase } from '../../../shared/lib/supabase';
import { triggerSmallConfetti } from '../../../shared/utils/confetti';
import { UserAvatar } from '../../../shared/components/ui/Avatar';
import { AuthModal } from '../../../shared/components/ui/AuthModal';
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export function InviteHandler() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useRemoteAuth();
  const { accentColor } = useTheme();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [senderProfile, setSenderProfile] = useState<{
    display_name: string;
    avatar_url: string | null;
  } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. Fetch sender profile if not logged in
  useEffect(() => {
    const client = supabase;
    if (user || !client || !inviteCode) {
      setLoadingProfile(false);
      return;
    }

    const fetchSenderProfile = async () => {
      setLoadingProfile(true);
      try {
        const { data, error } = await client.rpc('get_profile_by_invite_code', {
          friend_code: inviteCode,
        });
        if (!error && data && data.length > 0) {
          setSenderProfile(data[0]);
        }
      } catch (err) {
        console.warn('Failed to fetch sender profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchSenderProfile();
    // Save pending invite code
    localStorage.setItem('pending_invite_code', inviteCode);
  }, [user, inviteCode]);

  // 2. Establish connection automatically if already logged in
  useEffect(() => {
    const client = supabase;
    if (!user || !client || !inviteCode) return;

    const establishConnection = async () => {
      setConnectionStatus('connecting');
      setErrorMessage(null);
      try {
        const { error } = await client.rpc('add_friend_by_code', { friend_code: inviteCode });
        if (error) throw error;

        setConnectionStatus('success');
        triggerSmallConfetti(accentColor);
      } catch (err: any) {
        console.error('Failed to add friend via invite link:', err);
        let msg = err.message || 'Failed to connect. Please check the code.';
        if (
          msg.toLowerCase().includes('cannot add yourself') ||
          msg.toLowerCase().includes('self')
        ) {
          msg = 'You cannot add yourself as a friend.';
        } else if (
          msg.toLowerCase().includes('not found') ||
          msg.toLowerCase().includes('invalid code') ||
          msg.toLowerCase().includes('no profile')
        ) {
          msg = 'Invalid invite code. No user matches this code.';
        } else if (
          msg.toLowerCase().includes('already') ||
          msg.toLowerCase().includes('duplicate')
        ) {
          msg = 'You are already friends with this user.';
        }
        setErrorMessage(msg);
        setConnectionStatus('error');
      }
    };

    establishConnection();
  }, [user, inviteCode, accentColor]);

  const handleGoToCommunity = () => {
    navigate('/community');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (authLoading || (user && connectionStatus === 'connecting') || (!user && loadingProfile)) {
    return (
      <div className="invite-handler-page">
        <div className="invite-handler-card glass-panel loading">
          <Loader2 size={36} className="spinner-icon animate-spin" />
          <p style={{ marginTop: 'var(--space-3)', color: 'var(--text-secondary)' }}>
            {user ? 'Connecting you with your friend...' : 'Loading invitation details...'}
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="invite-handler-page">
        <div className="invite-handler-card glass-panel">
          {connectionStatus === 'success' ? (
            <div className="invite-status-view success">
              <CheckCircle size={48} className="invite-success-icon" />
              <h2>Successfully Connected!</h2>
              <p className="invite-status-desc">
                You and your friend are now connected as study peers. You can now view each other's
                streaks, daily agenda, and progress on the community page.
              </p>
              <button
                className="primary-btn"
                onClick={handleGoToCommunity}
                style={{ margin: 'var(--space-4) auto 0' }}
              >
                <span>Go to Community</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="invite-status-view error">
              <AlertCircle size={48} className="invite-error-icon" />
              <h2>Could Not Connect</h2>
              <p className="invite-error-desc" style={{ color: 'var(--priority-high)' }}>
                {errorMessage}
              </p>
              <div
                className="invite-modal-actions"
                style={{
                  width: '100%',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-4)',
                  display: 'flex',
                }}
              >
                <button className="secondary-btn" onClick={handleGoHome} style={{ flex: 1 }}>
                  Go Home
                </button>
                <button className="primary-btn" onClick={handleGoToCommunity} style={{ flex: 1 }}>
                  Go to Community
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Unauthenticated landing page
  return (
    <div className="invite-handler-page">
      <div className="invite-handler-card glass-panel">
        <div className="invite-landing-header">
          {senderProfile ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <UserAvatar
                name={senderProfile.display_name}
                customImageUrl={senderProfile.avatar_url || undefined}
                accentColor={accentColor}
                size={64}
                className="invite-sender-avatar"
              />
              <h2 style={{ marginTop: 'var(--space-3)' }}>
                Connect with {senderProfile.display_name}
              </h2>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2>Study Together</h2>
            </div>
          )}
        </div>

        <div className="invite-landing-body" style={{ marginTop: 'var(--space-4)' }}>
          <p
            className="invite-landing-desc"
            style={{
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginBottom: 'var(--space-4)',
            }}
          >
            Connect with friends to share your JEE & NEET syllabus progress, time study sessions, check
            daily agendas, and keep each other accountable.
          </p>

          {errorMessage && (
            <div className="invite-error-container" style={{ marginBottom: 'var(--space-4)' }}>
              <AlertCircle size={16} className="error-icon" />
              <span className="error-text">{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            className="primary-btn"
            onClick={() => setIsAuthModalOpen(true)}
            style={{
              width: '100%',
              justifyContent: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            Sign In to Connect
          </button>
        </div>
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Connect with Friends"
        subtitle="Sign in to accept the invite and connect as study peers."
      />
    </div>
  );
}
