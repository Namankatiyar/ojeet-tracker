import { useState } from 'react';
import { UserProfileCard } from './UserProfileCard';
import { SkeletonFriendCard } from './SkeletonFriendCard';
import { InviteSection } from './InviteSection';
import { ProfileEditModal } from './ProfileEditModal';
import { InviteFriendModal } from './InviteFriendModal';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useFriends } from '../hooks/useFriends';
import { Users, Trophy } from 'lucide-react';

type CommunityTab = 'friends' | 'leaderboard';

export function CommunityPage() {
    const [activeTab, setActiveTab] = useState<CommunityTab>('friends');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const { progressCardSettings, setProgressCardSettings } = useUserProgress();
    const { friends, refresh: refreshFriends } = useFriends();

    const tabs: { key: CommunityTab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
        { key: 'friends', label: 'Friends', icon: <Users size={14} /> },
        { key: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} />, disabled: true },
    ];

    return (
        <div className="community-page">
            <div className="community-page-header">
                <div className="community-page-title-group">
                    <div className="community-page-title-header">
                        <Users className="community-title-icon" size={24} />
                        <h1>Community</h1>
                    </div>
                    <p className="community-page-subtitle">Connect with friends, track rankings, and study together.</p>
                </div>
                <div className="community-header-actions">
                    <InviteSection 
                        inviteCode={progressCardSettings.inviteCode || ''} 
                        onInviteFriendClick={() => setIsInviteOpen(true)}
                    />
                </div>
            </div>

            <div className="community-tab-bar">
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
            </div>

            {activeTab === 'friends' && (
                <div className="community-profile-area">
                    <UserProfileCard onEditClick={() => setIsEditOpen(true)} />
                    
                    {friends.map(friend => (
                        <UserProfileCard 
                            key={friend.id} 
                            remoteProfileData={friend} 
                            previewMode={true} 
                        />
                    ))}

                    <SkeletonFriendCard onAddFriendClick={() => setIsInviteOpen(true)} />
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <div className="community-coming-soon">
                    <Trophy size={48} />
                    <h2>Leaderboard</h2>
                    <p>Compete with friends and track study rankings. Coming soon.</p>
                </div>
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
        </div>
    );
}
