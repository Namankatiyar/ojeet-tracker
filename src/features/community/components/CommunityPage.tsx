import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserProfileCard } from './UserProfileCard';
import { SkeletonFriendCard } from './SkeletonFriendCard';
import { InviteSection } from './InviteSection';
import { ProfileEditModal } from './ProfileEditModal';
import { InviteFriendModal } from './InviteFriendModal';
import { DisconnectModal } from './DisconnectModal';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useFriends, FriendProfile } from '../hooks/useFriends';
import { useTheme } from '../../../core/context/ThemeContext';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { CloudSyncPromptModal } from '../../sync/CloudSyncPromptModal';
import { triggerSmallConfetti } from '../../../shared/utils/confetti';
import { Users, Trophy, CheckCircle, AlertCircle, X } from 'lucide-react';

type CommunityTab = 'friends' | 'leaderboard';

export function CommunityPage() {
  const [activeTab, setActiveTab] = useState<CommunityTab>('friends');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedFriendForDisconnect, setSelectedFriendForDisconnect] =
    useState<FriendProfile | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { progressCardSettings, setProgressCardSettings } = useUserProgress();
  const { friends, refresh: refreshFriends, disconnectFriend } = useFriends();
  const { signInWithGoogle, user } = useRemoteAuth();
  const [isSyncPromptOpen, setIsSyncPromptOpen] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsAuthBusy(true);
    const { error } = await signInWithGoogle();
    if (error) {
      console.error('Google sign in error:', error);
      setIsAuthBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedFriendForDisconnect) return;
    setIsDisconnecting(true);
    try {
      await disconnectFriend(selectedFriendForDisconnect.id);
      setSelectedFriendForDisconnect(null);
    } catch (err) {
      console.error('Failed to disconnect friend:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };
  const { accentColor } = useTheme();
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const celebrate = sessionStorage.getItem('invite_success_celebrate');
    const successMsg = sessionStorage.getItem('invite_success_message');
    const errorMsg = sessionStorage.getItem('invite_error_message');

    if (celebrate === '1') {
      triggerSmallConfetti(accentColor);
      sessionStorage.removeItem('invite_success_celebrate');
    }

    if (successMsg) {
      setBannerMessage({ type: 'success', text: successMsg });
      sessionStorage.removeItem('invite_success_message');
    } else if (errorMsg) {
      setBannerMessage({ type: 'error', text: errorMsg });
      sessionStorage.removeItem('invite_error_message');
    }
  }, [accentColor]);

  const tabs: { key: CommunityTab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { key: 'friends', label: 'Friends', icon: <Users size={14} /> },
    { key: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} />, disabled: true },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        duration: 0.6,
        bounce: 0,
      },
    },
  };

  return (
    <motion.div
      className="community-page"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div className="community-page-header" variants={itemVariants}>
        <div className="community-page-title-group">
          <div className="community-page-title-header">
            <Users className="community-title-icon" size={24} />
            <h1>Community</h1>
          </div>
          <p className="community-page-subtitle">
            Connect with friends, track rankings, and study together.
          </p>
        </div>
        <div className="community-header-actions">
          <InviteSection
            inviteCode={progressCardSettings.inviteCode || ''}
            onInviteFriendClick={() => setIsInviteOpen(true)}
            onSignInClick={() => setIsSyncPromptOpen(true)}
          />
        </div>
      </motion.div>

      {bannerMessage && (
        <motion.div
          variants={itemVariants}
          className={`community-banner ${bannerMessage.type}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            background:
              bannerMessage.type === 'success'
                ? 'var(--color-priority-low-bg)'
                : 'var(--priority-high-bg)',
            border: `1px solid ${bannerMessage.type === 'success' ? 'color-mix(in srgb, var(--color-priority-low), transparent 75%)' : 'color-mix(in srgb, var(--priority-high), transparent 75%)'}`,
            color:
              bannerMessage.type === 'success'
                ? 'var(--color-priority-low)'
                : 'var(--priority-high)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
            }}
          >
            {bannerMessage.type === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 'var(--space-1)',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.7,
            }}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}

      <motion.div className="community-tab-bar" variants={itemVariants}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`community-tab-btn ${activeTab === tab.key ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => !tab.disabled && setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </motion.div>

      {activeTab === 'friends' && (
        <motion.div className="community-profile-area" variants={itemVariants}>
          <UserProfileCard onEditClick={() => setIsEditOpen(true)} />

          {friends.map((friend) => (
            <UserProfileCard
              key={friend.id}
              remoteProfileData={friend}
              onDisconnectClick={() => setSelectedFriendForDisconnect(friend)}
            />
          ))}

          {user && <SkeletonFriendCard onAddFriendClick={() => setIsInviteOpen(true)} />}
        </motion.div>
      )}

      {activeTab === 'leaderboard' && (
        <motion.div className="community-coming-soon" variants={itemVariants}>
          <Trophy size={48} />
          <h2>Leaderboard</h2>
          <p>Compete with friends and track study rankings. Coming soon.</p>
        </motion.div>
      )}

      <ProfileEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        settings={progressCardSettings}
        onSave={setProgressCardSettings}
      />

      <InviteFriendModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={refreshFriends}
      />

      <DisconnectModal
        isOpen={selectedFriendForDisconnect !== null}
        onClose={() => setSelectedFriendForDisconnect(null)}
        onConfirm={handleDisconnect}
        friendName={
          selectedFriendForDisconnect?.display_name ||
          selectedFriendForDisconnect?.username ||
          'Friend'
        }
        isSubmitting={isDisconnecting}
      />

      <CloudSyncPromptModal
        isOpen={isSyncPromptOpen}
        onClose={() => setIsSyncPromptOpen(false)}
        onSignIn={handleGoogleSignIn}
        isBusy={isAuthBusy}
      />
    </motion.div>
  );
}
