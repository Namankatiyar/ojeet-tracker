import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useRemoteSync } from '../../../core/context/RemoteSyncContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface CloudSyncIndicatorProps {
  compact?: boolean;
  showLabel?: boolean;
  onOpenSignIn?: () => void;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never synced';
  try {
    const date = new Date(isoString);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 60) return 'Synced just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `Synced ${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Synced ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Synced ${diffDays}d ago`;
  } catch {
    return 'Synced recently';
  }
}

export const CloudSyncIndicator: React.FC<CloudSyncIndicatorProps> = ({
  compact = false,
  showLabel = false,
  onOpenSignIn,
}) => {
  const { user } = useRemoteAuth();
  const { status, lastSyncedAt, lastError, syncNow, hasPendingChanges } = useRemoteSync();
  const { isOnline } = useNetworkStatus();

  // Determine current display state
  type IndicatorState =
    | 'offline'
    | 'not-signed-in'
    | 'syncing'
    | 'queued'
    | 'synced'
    | 'error';

  let currentState: IndicatorState = 'synced';

  if (!isOnline) {
    currentState = 'offline';
  } else if (!user) {
    currentState = 'not-signed-in';
  } else if (status === 'error') {
    currentState = 'error';
  } else if (status === 'syncing') {
    currentState = 'syncing';
  } else if (hasPendingChanges()) {
    currentState = 'queued';
  } else {
    currentState = 'synced';
  }

  const handleClick = () => {
    if (currentState === 'not-signed-in') {
      if (onOpenSignIn) onOpenSignIn();
    } else if (
      currentState === 'synced' ||
      currentState === 'queued' ||
      currentState === 'error'
    ) {
      syncNow();
    }
  };

  const getIndicatorProps = () => {
    switch (currentState) {
      case 'offline':
        return {
          icon: <CloudOff size={compact ? 18 : 20} className="cloud-sync-icon offline" />,
          label: 'Offline',
          dotClass: 'dot-offline',
          title: 'You are currently offline. Changes are saved locally and will sync automatically when reconnected.',
        };
      case 'not-signed-in':
        return {
          icon: <CloudOff size={compact ? 18 : 20} className="cloud-sync-icon neutral" />,
          label: 'Local Only',
          dotClass: '',
          title: 'Not signed in. Click to sign in and sync across devices.',
        };
      case 'syncing':
        return {
          icon: <Cloud size={compact ? 18 : 20} className="cloud-sync-icon syncing" />,
          label: 'Syncing...',
          dotClass: 'dot-yellow-blinking',
          title: 'Syncing your study data across devices...',
        };
      case 'queued':
        return {
          icon: <Cloud size={compact ? 18 : 20} className="cloud-sync-icon queued" />,
          label: 'Sync Queued',
          dotClass: 'dot-yellow-static',
          title: 'Local edits are queued for cloud sync. Click to sync now.',
        };
      case 'error':
        return {
          icon: <Cloud size={compact ? 18 : 20} className="cloud-sync-icon error" />,
          label: 'Sync Error',
          dotClass: 'dot-red',
          title: `Sync failed: ${lastError || 'Unknown error'}. Click to retry immediately.`,
        };
      case 'synced':
      default:
        return {
          icon: <Cloud size={compact ? 18 : 20} className="cloud-sync-icon synced" />,
          label: 'Synced',
          dotClass: 'dot-green',
          title: `${formatRelativeTime(lastSyncedAt)}. Click to manually sync now.`,
        };
    }
  };

  const { icon, label, dotClass, title } = getIndicatorProps();

  const buttonElement = (
    <button
      type="button"
      className={`cloud-sync-indicator-btn ${compact ? 'compact' : ''} state-${currentState}`}
      onClick={handleClick}
      title={title}
      aria-label={`Cloud Sync Status: ${label}`}
    >
      <span className="cloud-sync-icon-wrapper">
        {icon}
        {dotClass && (
          <span className={`cloud-sync-status-dot ${dotClass}`}>
            {currentState === 'syncing' && <span className="syncing-ring" />}
          </span>
        )}
      </span>
    </button>
  );

  if (showLabel) {
    return (
      <div className="cloud-sync-labeled-wrapper" onClick={handleClick} title={title}>
        {buttonElement}
        <span className="cloud-sync-label-text">{label}</span>
      </div>
    );
  }

  return buttonElement;
};
