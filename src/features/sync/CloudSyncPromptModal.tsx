import { Cloud, X } from 'lucide-react';

interface CloudSyncPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignIn: () => void;
    isBusy?: boolean;
}

export function CloudSyncPromptModal({
    isOpen,
    onClose,
    onSignIn,
    isBusy = false,
}: CloudSyncPromptModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content cloud-sync-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Sync Across Devices</h3>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="cloud-sync-modal-subtitle">
                        Sign in with Google to back up and sync your progress across multiple devices.
                    </p>
                    <p className="cloud-sync-modal-note">
                        You can continue using the app offline without signing in.
                    </p>
                </div>

                <div className="modal-footer cloud-sync-modal-actions">
                    <button className="modal-btn cancel" onClick={onClose}>
                        Continue Offline
                    </button>
                    <button className="modal-btn primary cloud-sync-google-btn" onClick={onSignIn} disabled={isBusy}>
                        <Cloud size={16} />
                        {isBusy ? 'Redirecting...' : 'Sign in with Google'}
                    </button>
                </div>
            </div>
        </div>
    );
}
