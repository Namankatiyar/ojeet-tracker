import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useTheme } from '../../../core/context/ThemeContext';
import { supabase } from '../../../shared/lib/supabase';
import { triggerSmallConfetti } from '../../../shared/utils/confetti';
import { UserAvatar } from '../../../shared/components/ui/Avatar';
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export function InviteHandler() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user, signInWithGoogle, isLoading: authLoading } = useRemoteAuth();
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
  const [isAuthBusy, setIsAuthBusy] = useState(false);

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

  const handleGoogleSignIn = async () => {
    setIsAuthBusy(true);
    setErrorMessage(null);
    // Ensure pending invite code is saved
    if (inviteCode) {
      localStorage.setItem('pending_invite_code', inviteCode);
    }
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMessage(error);
      setIsAuthBusy(false);
    }
  };

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
            className="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={isAuthBusy}
            style={{
              width: '100%',
              justifyContent: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            {isAuthBusy ? (
              <>
                <Loader2 size={18} className="spinner-icon animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg
                  className="google-signin-btn__logo"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9086c1.7027-1.5682 2.6837-3.8741 2.6837-6.6155z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1791l-2.9086-2.2582c-.8059.54-1.8368.8591-3.0477.8591-2.3468 0-4.3336-1.5845-5.0427-3.7118H.9505v2.3318C2.4314 15.9818 5.4818 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.9577 10.7091c-.18-.54-.2823-1.1168-.2823-1.7091 0-.5923.1023-1.1691.2823-1.7091V4.9591H.9505C.3477 6.16 0 7.5268 0 9s.3477 2.84.9505 4.0409l3.0072-2.3318z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.5782c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.4264 0 9 0 5.4818 0 2.4314 2.0182.9505 4.9591l3.0072 2.3318C4.6664 5.1627 6.6532 3.5782 9 3.5782z"
                  />
                </svg>
                <span>Sign in with Google to Connect</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
