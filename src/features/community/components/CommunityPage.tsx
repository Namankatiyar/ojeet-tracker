import { useState } from 'react';
import { UserProfileCard } from './UserProfileCard';
import { InviteSection } from './InviteSection';
import { ProfileEditModal } from './ProfileEditModal';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { User, Users, Trophy } from 'lucide-react';

type CommunityTab = 'profile' | 'friends' | 'leaderboard';

export function CommunityPage() {
    const [activeTab, setActiveTab] = useState<CommunityTab>('profile');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { progressCardSettings, setProgressCardSettings } = useUserProgress();

    const tabs: { key: CommunityTab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
        { key: 'profile', label: 'My Profile', icon: <User size={14} /> },
        { key: 'friends', label: 'Friends', icon: <Users size={14} />, disabled: true },
        { key: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} />, disabled: true },
    ];

    return (
        <div className="community-page">
            <div className="community-page-header">
                <h1>Community</h1>
            </div>

            <div className="community-tab-bar">
                <div className="community-tab-bar-left">
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
                <InviteSection inviteCode={progressCardSettings.inviteCode || ''} />
            </div>

            {activeTab === 'profile' && (
                <div className="community-profile-area">
                    <UserProfileCard onEditClick={() => setIsEditOpen(true)} />
                </div>
            )}

            {activeTab === 'friends' && (
                <div className="community-coming-soon">
                    <Users size={48} />
                    <h2>Friends</h2>
                    <p>Share your invite code to connect with study partners. Coming soon.</p>
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
        </div>
    );
}
