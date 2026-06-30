import { UserPlus } from 'lucide-react';

interface SkeletonFriendCardProps {
  onAddFriendClick: () => void;
}

export function SkeletonFriendCard({ onAddFriendClick }: SkeletonFriendCardProps) {
  return (
    <div className="profile-card friend-skeleton-card">
      {/* Banner placeholder */}
      <div className="profile-card-banner skeleton" />

      {/* Avatar placeholder */}
      <div className="profile-card-avatar-wrap skeleton">
        <div className="profile-card-avatar skeleton">
          <div className="avatar-placeholder-icon">
            <UserPlus size={32} />
          </div>
        </div>
      </div>

      {/* Content & CTA */}
      <div className="profile-card-identity skeleton-content">
        <h3 className="skeleton-title">Add study partner</h3>
        <p className="skeleton-description">
          Connect with friends to see their active study state, streaks, and daily progress.
        </p>
        <button type="button" className="primary-btn skeleton-cta-btn" onClick={onAddFriendClick}>
          <UserPlus size={14} />
          <span>Add friend</span>
        </button>
      </div>
    </div>
  );
}
