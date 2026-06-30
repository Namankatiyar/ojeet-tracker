import { createPortal } from 'react-dom';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface DisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  friendName: string;
  isSubmitting: boolean;
}

export function DisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  friendName,
  isSubmitting,
}: DisconnectModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="profile-edit-overlay" onClick={onClose}>
      <div className="invite-friend-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="profile-edit-header">
          <h2>Disconnect friend</h2>
          <button className="profile-edit-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        <div className="invite-modal-divider" />

        <div className="profile-edit-section">
          <div
            className="invite-error-container"
            style={{
              animation: 'none',
              background: 'var(--color-priority-high-bg)',
              borderColor: 'color-mix(in srgb, var(--color-priority-high), transparent 75%)',
            }}
          >
            <AlertTriangle size={18} className="error-icon" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
                textAlign: 'left',
              }}
            >
              <strong
                style={{
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                }}
              >
                Warning
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                }}
              >
                Are you sure you want to disconnect from <strong>{friendName}</strong>? You will no
                longer be able to track each other's study activity or compare progress.
              </p>
            </div>
          </div>

          <div className="invite-modal-actions" style={{ marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary-btn danger-confirm-btn"
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner-icon" />
                  <span>Disconnecting...</span>
                </>
              ) : (
                <span>Disconnect</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
